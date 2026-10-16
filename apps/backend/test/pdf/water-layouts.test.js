import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractBillFields } from '../../src/pdf/bill-fields.js';

// Synthetic identifiers; values and layout variations reproduce the supplied bills.
const rows = (...texts) => texts.map(text => ({ pageNumber: 1, text }));
for (const [usage, charges, balance, days, from, to] of [
  [555.2, 5317.7, 0, 29, '08/25/2026', '09/22/2026'],
  [112.8, 1059.68, 743.63, 28, '08/05/2026', '09/01/2026'],
  [164.8, 1522.71, 1391.47, 30, '09/01/2026', '09/30/2026'],
]) {
  test(`MDC water layout: ${usage} CCF`, () => {
    const result = extractBillFields(rows('The Metropolitan District', 'Account No.: 00123456',
      'Invoice Date: 09/29/2026', 'Customer Name: EXAMPLE COMPANY', 'Billing Period',
      '1% INTEREST ADDED IF NOT PAID BY DUE DATE.', `${from} - ${to} (${days} Days)`,
      `Remaining Balance $${balance.toFixed(2)}`, `Total Current Charges $${charges.toFixed(2)}`,
      'Water Service $100.00\tMeter Number\t00112233', `Water Usage (CCF)\t${usage}`,
      'Sewer Service $12.50\tType of Meter Reading\tActual Reading',
      'Notice: return a certificate within 13 days.'));
    assert.deepEqual(result.bill.usage, { value: usage, unit: 'CCF' });
    assert.deepEqual(result.bill.currentCharges, { value: charges, currency: 'USD' });
    assert.deepEqual(result.bill.balanceForward, { value: balance, currency: 'USD' });
    assert.equal(result.bill.days, days);
    assert.equal(result.bill.statementDate, '2026-09-29');
    assert.equal(result.bill.meterNumber, '00112233');
    assert.equal(result.bill.serviceProvidedTo, 'EXAMPLE COMPANY');
    assert.equal(result.bill.readingType, 'Actual');
    assert.equal(result.bill.readDemand, null);
    assert.equal(result.extraction.status, 'complete');
  });
}

const positioned = (text, y, xs) => ({ pageNumber: 2, y, text,
  cells: text.split('\t').map((text, i) => ({ text, x: xs[i], endX: xs[i] + 30 })) });
for (const [usage, charges, unmetered] of [[313, 1614.92, false], [429, 2008.88, false], [0, 119.15, true]]) {
  test(`Aquarion layout: ${usage} CCF, including unmetered accounts`, () => {
    const input = [ ...rows('aquarionwater.com', 'Account Number: 00123456',
      `Total Current Charges ${charges.toFixed(2)}`, 'Balance Forward 0.00'),
      positioned('Meter\tMeter\tCurrent\tReading\tNext\tOutstanding Balance\t0.00', 94, [31,85,134,187,251,306,558]),
      positioned('Number Reading\tUsage\tType\tReading', 104, [25,138,196,241]),
      positioned('Total Charges', 115, [306]),
      positioned(unmetered ? 'Unmetered' : '00112233\tFrom / To', 117, [26,82]),
      positioned(`${usage} CCF\tOn or about`, 120, [138,238]),
      ...(unmetered ? [] : [positioned('Actual', 121, [196])]),
      positioned('10/17/26\tWater Service Charge\t101.72', 125, [245,318,548]),
      positioned('Service from 08/19/26 to 09/17/26 (30 days)', 139, [19]),
      ...rows(unmetered ? '0 CCF' : `Water Usage Charge ${usage} ccf @ $4.149000`),
    ];
    const { bill } = extractBillFields(input);
    assert.deepEqual(bill.usage, { value: usage, unit: 'CCF' });
    assert.deepEqual(bill.currentCharges, { value: charges, currency: 'USD' });
    assert.equal(bill.currentUsage, usage);
    assert.equal(bill.nextReadDate, '2026-10-17');
    assert.equal(bill.meterNumber, unmetered ? null : '00112233');
    assert.equal(bill.readingType, unmetered ? null : 'Actual');
    assert.equal(bill.readDemand, null);
  });
}

test('Eversource daily average does not override zero monthly usage or demand', () => {
  const { bill } = extractBillFields(rows('Eversource', 'average daily', 'use was less than',
    '0.1 CCF', 'Monthly CCF Use', 'Jul\tAug', '12\t0',
    'Read Demand: 0.0 ccf', 'Billed Demand: 376.0 ccf'));
  assert.deepEqual(bill.usage, { value: 0, unit: 'CCF' });
  assert.deepEqual(bill.readDemand, { value: 0, unit: 'CCF' });
  assert.deepEqual(bill.billedDemand, { value: 376, unit: 'CCF' });
});

test('electric demand is distinct from metered and billed usage', () => {
  const { bill } = extractBillFields(rows('Eversource', 'Total Demand Use = 30.70 kW',
    '107 X Meter Constant of 80 = 8,560 Billed Usage', 'Supply 8560.00kWh X $0.10522 $900.68',
    'Transmission Demand Chrg 28.70KW X $11.27000 $323.45'));
  assert.deepEqual(bill.usage, { value: 8560, unit: 'kWh' });
  assert.deepEqual(bill.totalDemandUse, { value: 30.7, unit: 'kW' });
  assert.deepEqual(bill.billedDemand, { value: 28.7, unit: 'kW' });
  assert.equal(bill.readDemand, null);
});

test('conflicting water usage remains flagged for review', () => {
  const { bill, extraction } = extractBillFields(rows('The Metropolitan District',
    'Water Usage (CCF) 100', 'Water Usage (CCF) 200'));
  assert.equal(bill.usage, null);
  assert.ok(extraction.issues.some(issue => issue.field === 'usage' && issue.code === 'AMBIGUOUS'));
});
