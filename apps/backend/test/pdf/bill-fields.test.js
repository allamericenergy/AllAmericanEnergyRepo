import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { extractBillFields } from '../../src/pdf/bill-fields.js';
import { createApp } from '../../src/pdf/app.js';
import { once } from 'node:events';

const rows = (...texts) => texts.map(text => ({ pageNumber: 1, text }));
const core = bill => Object.fromEntries(['accountNumber', 'usage', 'currentCharges', 'latestMonthlyUsage'].map(key => [key, bill[key]]));
test('explicit billed CCF usage is extracted without a monthly history table', () => {
  const result = extractBillFields(rows('1131 X Fixed Factor of 1.1357 = 1,284 Billed CCF Usage'));
  assert.deepEqual(result.bill.usage, { value: 1284, unit: 'CCF' });
});
test('matches aliases, retains leading zeros, and does not confuse amount due with charges', () => {
  const result = extractBillFields(rows('Account #: 00123-45678', 'Usage: 850 kWh', 'Current Charges: USD 125.50', 'Total Amount Due: $400.00'));
  assert.deepEqual(core(result.bill), { accountNumber: '0012345678', usage: { value: 850, unit: 'kWh' }, currentCharges: { value: 125.5, currency: 'USD' }, latestMonthlyUsage: null });
  assert.equal(result.extraction.status, 'complete');
  assert.equal(result.extraction.issues.some(issue => issue.field === 'meterNumber'), false);
});
test('missing and conflicting values are null, daily usage is excluded', () => {
  const result = extractBillFields(rows('Account Number: 123456', 'Account Number: 987654', 'Average daily usage: 20 kWh', 'Total Amount Due: $50.00'));
  assert.deepEqual(core(result.bill), { accountNumber: null, usage: null, currentCharges: null, latestMonthlyUsage: null });
  assert.equal(result.extraction.issues[0].code, 'AMBIGUOUS');
});
test('total current charges take precedence over component charges; repeated values agree', () => {
  const result = extractBillFields(rows('Eversource', 'Current Charges: $10.00', 'Total Current Charges: $15.23', '$15.23\tTotal Current Charges'));
  assert.deepEqual(result.bill.currentCharges, { value: 15.23, currency: 'USD' });
});
test('billed meter usage requires a matching energy quantity to determine the unit', () => {
  const result = extractBillFields(rows('Eversource', '5 X Meter Constant of 20 = 100 Billed Usage', 'Supply\t100.00kWh X $0.20\t$20.00', 'Daily usage: 3 kWh'));
  assert.deepEqual(result.bill.usage, { value: 100, unit: 'kWh' });
  assert.equal(extractBillFields(rows('Eversource', '5 X Meter Constant of 20 = 100 Billed Usage')).bill.usage, null);
});
test('conflicting usage totals are not silently summed and dollar currency is not guessed', () => {
  const result = extractBillFields(rows('Usage: 100 kWh', 'Usage: 200 kWh', 'Current Charges: $12.00'));
  assert.equal(result.bill.usage, null);
  assert.deepEqual(result.bill.currentCharges, { value: 12, currency: null });
  assert.equal(result.extraction.status, 'needs_review');
});

test('uploaded Eversource sample returns the visually verified fields through HTTP', async t => {
  const path = new URL('../EB-E & J Parts Cleaning-51547293084-12-06-2023.pdf', import.meta.url);
  try { await access(path); } catch { t.skip('Private sample PDF is not included in the repository.'); return; }
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const form = new FormData();
    form.append('pdf', new Blob([await readFile(path)], { type: 'application/pdf' }), 'bill.pdf');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/pdf/extract`, { method: 'POST', body: form });
    const body = await response.json();
    assert.equal(response.status, 200, JSON.stringify(body));
    assert.deepEqual(body.bill, {
      accountNumber: '51547293084', usage: { value: 14080, unit: 'kWh' }, currentCharges: { value: 2732.14, currency: 'USD' }, latestMonthlyUsage: { month: 'Dec', value: 14080, unit: 'kWh' },
      totalDemandUse: { value: 43.8, unit: 'kW' },
      serviceAddress: '1669 THOMASTON AVE, STR CTR/RR, WATERBURY CT 06704',
      nameKey: 'E. &', statementDate: '2023-12-06', serviceReference: '788162005',
      servicePeriod: { from: '2023-11-03', to: '2023-12-06' }, billCycle: '05', nextReadDate: '2024-01-08',
      balanceForward: { value: 2608.85, currency: 'USD' }, supplier: 'CATALYST POWER & GAS LLC', rate: '030',
      totalAmountDueDate: '2024-01-03', totalAmountDue: { value: 5340.99, currency: 'USD' },
      serviceProvidedTo: 'E. & J. PARTS CLEANING, INC.', meterNumber: '886100562', readingType: 'Actual', days: 33,
      supplyPrice: { value: 0.1, currency: 'USD', unit: 'kWh' }, currentUsage: 176, billedDemand: { value: 41.8, unit: 'kW' },
      readDemand: null,
    });
    assert.equal(body.extraction.status, 'complete');
    assert.equal(body.extraction.sources.usage.pageNumber, 2);
    assert.equal(body.extraction.sources.latestMonthlyUsage.column, 6);
    assert.equal(body.extraction.sources.billedDemand.derived, true);
    assert.match(body.extraction.sources.supplyPrice.text, /0\.10000/);
  } finally {
    await new Promise(resolve => server.close(resolve));
  }
});
test('gas sample extracts tariff, meter columns, demand and supply unit price through HTTP', async t => {
  const path = new URL('../GB-E & J Parts Cleaning-57471220095-03-02-2023.pdf', import.meta.url);
  try { await access(path); } catch { t.skip('Private gas sample is not included in the repository.'); return; }
  const server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const form = new FormData();
    form.append('pdf', new Blob([await readFile(path)], { type: 'application/pdf' }), 'gas.pdf');
    const response = await fetch(`http://127.0.0.1:${server.address().port}/api/pdf/extract`, { method: 'POST', body: form });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.deepEqual(body.bill, {
      accountNumber: '57471220095', usage: { value: 1284, unit: 'CCF' },
      currentCharges: { value: 2002.83, currency: 'USD' }, latestMonthlyUsage: { month: 'Feb', value: 1284, unit: 'CCF' },
      totalDemandUse: null, serviceAddress: '1669 THOMASTON AVE, WATERBURY CT 06704', nameKey: 'E &',
      statementDate: '2023-03-02', serviceReference: '602340005', servicePeriod: { from: '2023-01-31', to: '2023-02-28' },
      billCycle: '22', nextReadDate: '2023-03-31', balanceForward: { value: 2095.99, currency: 'USD' },
      supplier: 'Eversource', rate: 'R20-MEDIUM GENL FIRM', totalAmountDueDate: '2023-03-30', totalAmountDue: { value: 4098.82, currency: 'USD' },
      serviceProvidedTo: 'E & J PARTS CLEANING', meterNumber: '0493280', readingType: 'Actual', days: 28,
      supplyPrice: { value: 0.9778, currency: 'USD', unit: 'CCF' }, currentUsage: 1131,
      billedDemand: { value: 76, unit: 'CCF' }, readDemand: { value: 66, unit: 'CCF' },
    });
    assert.deepEqual(body.extraction.issues.map(issue => issue.field), ['totalDemandUse']);
    assert.match(body.extraction.sources.usage.text, /Billed CCF Usage/);
    assert.equal(body.extraction.sources.billedDemand.derived, undefined);
  } finally { await new Promise(resolve => server.close(resolve)); }
});
