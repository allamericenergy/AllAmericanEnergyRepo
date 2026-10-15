import { test } from 'node:test';
import assert from 'node:assert/strict';
import { billDate, extractBillDetails } from '../../src/pdf/bill-details.js';
const rows = (...texts) => texts.map(text => ({ pageNumber: 1, text }));

test('meter values skip intervening content from the adjacent bill column', () => {
  const positioned = (text, y, xs) => ({ pageNumber: 2, text, y, cells: text.split('\t').map((text, i) => ({ text, x: xs[i], endX: xs[i] + 27 })) });
  const header = positioned('Meter\tCurrent\tPrevious\tCurrent\tReading', 211, [40, 87, 135, 187, 234]);
  const lower = positioned('Number\tRead\tRead\tUsage\tType', 220, [37, 91, 140, 189, 240]);
  const otherColumn = positioned('Total Charges for Electricity', 226, [286]);
  const data = positioned('886100562\t44458\t44300\t158\tActual', 240, [29, 87, 137, 193, 235]);
  const { fields } = extractBillDetails([header, lower, otherColumn, data]);
  assert.equal(fields.meterNumber, '886100562');
  assert.equal(fields.readingType, 'Actual');
  assert.equal(fields.currentUsage, 158);
  assert.equal(extractBillDetails([header, lower, otherColumn, { ...data, pageNumber: 3 }]).fields.meterNumber, null);
  assert.equal(extractBillDetails([header, lower, otherColumn, { ...data, y: 400 }]).fields.meterNumber, null);
});

test('normalizes US dates, handles leap years, and rejects invalid dates', () => {
  assert.equal(billDate('12/06/23'), '2023-12-06');
  assert.equal(billDate('Jan 08, 2024'), '2024-01-08');
  assert.equal(billDate('02/29/24'), '2024-02-29');
  assert.equal(billDate('02/29/23'), null);
  assert.equal(billDate('13/01/23'), null);
});
test('matches aliases and preserves leading zeros in reference, cycle and rate', () => {
  const { fields } = extractBillDetails(rows('name key: ABC', 'Serv Ref: 00123\tBill Cycle: 05', 'Service Reference: 00123', '(DISTRIBUTION RATE: 030)', 'Statement Date: 12/06/23', 'Service from 11/03/23 - 12/06/23\t33 Days', 'Next read date on or about: Jan 08, 2024'));
  assert.equal(fields.serviceReference, '00123');
  assert.equal(fields.billCycle, '05');
  assert.equal(fields.rate, '030');
  assert.equal(fields.nameKey, 'ABC');
  assert.equal(fields.days, 33);
  assert.deepEqual(fields.servicePeriod, { from: '2023-11-03', to: '2023-12-06' });
  assert.equal(fields.nextReadDate, '2024-01-08');
});
test('due heading and nearby date are distinguished from old payment history', () => {
  const { fields } = extractBillDetails(rows('Eversource', 'Total Amount Due', '$5,340.99', 'by 01/03/24', 'Amount Due On 12/08/23\t$4,913.53'));
  assert.deepEqual(fields.totalAmountDue, { value: 5340.99, currency: 'USD' });
  assert.equal(fields.totalAmountDueDate, '2024-01-03');
});
test('balance credits retain their sign', () => {
  for (const amount of ['-$25.40', '$-25.40', '($25.40)']) {
    assert.deepEqual(extractBillDetails(rows('Eversource', `Balance Forward ${amount}`)).fields.balanceForward, { value: -25.4, currency: 'USD' });
  }
});
test('supply unit price is independent of total supply charges', () => {
  const { fields } = extractBillDetails(rows('Eversource', 'Supply\t14080.00kWh X $0.10000\t$1,408.00'));
  assert.deepEqual(fields.supplyPrice, { value: 0.1, currency: 'USD', unit: 'kWh' });
});
test('meter table yields meter, raw usage and reading type', () => {
  const { fields } = extractBillDetails(rows('Meter\tCurrent\tPrevious\tCurrent\tReading', 'Number\tRead\tRead\tUsage\tType', '0012345\t300\t275\t25\tEstimated\tOther column'));
  assert.equal(fields.meterNumber, '0012345');
  assert.equal(fields.currentUsage, 25);
  assert.equal(fields.readingType, 'Estimated');
});
test('Supply Chrg aliases support calculation rows and explicit unit prices', () => {
  for (const line of ['Supply Chrg 14080 kWh X $0.10000 $1,408.00', 'Supply Charge: 14080 kWh X $0.10000 $1,408.00', 'Supply Chrg(price): $0.10000/kWh', 'Supply Chrg: USD 0.10000 per kWh']) {
    assert.deepEqual(extractBillDetails(rows('Eversource', line)).fields.supplyPrice,
      { value: 0.1, currency: 'USD', unit: 'kWh' }, line);
  }
  assert.deepEqual(extractBillDetails(rows('Eversource', 'Supply Chrg 100 CCF X $0.55 $55.00')).fields.supplyPrice,
    { value: 0.55, currency: 'USD', unit: 'CCF' });
});
test('bare supply charges are not prices and conflicting prices require review', () => {
  assert.equal(extractBillDetails(rows('Supply Chrg: $1,408.00')).fields.supplyPrice, null);
  const result = extractBillDetails(rows('Supply Chrg: USD 0.10/kWh', 'Supply Chrg: USD 0.20/kWh'));
  assert.equal(result.fields.supplyPrice, null);
  assert.ok(result.issues.some(issue => issue.field === 'supplyPrice' && issue.code === 'AMBIGUOUS'));
});
test('requested fields also match explicit labels', () => {
  const { fields } = extractBillDetails(rows('Meter Number: 0012345', 'Reading Type: Actual', 'Current Usage: 176', 'Billed Demand: 41.8 kW', 'Rate: 030'));
  assert.equal(fields.meterNumber, '0012345');
  assert.equal(fields.readingType, 'Actual');
  assert.equal(fields.currentUsage, 176);
  assert.equal(fields.rate, '030');
  assert.deepEqual(fields.billedDemand, { value: 41.8, unit: 'kW' });
});
test('explicit demand takes priority over calculated demand and different demand quantities need review', () => {
  const lines = rows('Total Demand Use = 43.80 kW', 'Transmission Demand Chrg 41.80KW X $10.46000 $437.23', 'Local Delivery Demand Chrg 40.80KW X $14.22000 $580.00');
  assert.equal(extractBillDetails(lines).fields.billedDemand, null);
  const result = extractBillDetails([...lines, ...rows('Billed Demand: 42 kW')]);
  assert.deepEqual(result.fields.billedDemand, { value: 42, unit: 'kW' });
  assert.deepEqual(result.fields.totalDemandUse, { value: 43.8, unit: 'kW' });
  assert.equal(result.sources.billedDemand.derived, undefined);
});
test('the current supplier heading takes priority over truncated billing name and future provider notice', () => {
  const { fields } = extractBillDetails(rows('Your electric supplier is', 'CATALYST POWER & GAS LLC', 'Supplier', 'CATALYST POWER AND GAS, L', 'Effective on or about 12/06/2023, your Energy provider will be: NEXTERA'));
  assert.equal(fields.supplier, 'CATALYST POWER & GAS LLC');
});
test('absent, conflicting and invalid fields return null with review issues', () => {
  const { fields, issues } = extractBillDetails(rows('Serv Ref: 123', 'Service Reference: 456', 'Statement Date: 02/30/23'));
  assert.equal(fields.serviceReference, null);
  assert.equal(fields.statementDate, null);
  assert.equal(fields.supplyPrice, null);
  assert.ok(issues.some(issue => issue.field === 'serviceReference' && issue.code === 'AMBIGUOUS'));
});
test('block extraction does not follow a heading onto the next page', () => {
  const { fields } = extractBillDetails([{ pageNumber: 1, text: 'Service Provided To:' }, { pageNumber: 2, text: 'Unrelated name' }]);
  assert.equal(fields.serviceProvidedTo, null);
});
test('gas tariff without colon is extracted without matching explanatory prose or supply price', () => {
  const { fields } = extractBillDetails(rows('Emergency: 877-944-5325\t(Rate R20-MEDIUM GENL FIRM)', 'The rate for the supply portion of your gas bill changes monthly', 'Supply Rate: 0.9778'));
  assert.equal(fields.rate, 'R20-MEDIUM GENL FIRM');
});
test('gas read demand and billed demand retain their distinct values and CCF units', () => {
  const { fields } = extractBillDetails(rows('Read Demand: 66.0 ccf\tTotal Charges for Gas', 'Billed Demand: 76.0 ccf'));
  assert.deepEqual(fields.readDemand, { value: 66, unit: 'CCF' });
  assert.deepEqual(fields.billedDemand, { value: 76, unit: 'CCF' });
  assert.equal(fields.totalDemandUse, null);
});
test('meter header accepts adjacent-column text without including it in meter values', () => {
  const { fields } = extractBillDetails(rows('Meter\tCurrent\tPrevious\tCurrent\tReading', 'Number\tRead\tRead\tUsage\tType\tTotal Amount Due\t$4,098.82', '0493280\t8479\t7348\t1131\tActual'));
  assert.equal(fields.meterNumber, '0493280');
  assert.equal(fields.currentUsage, 1131);
  assert.equal(fields.readingType, 'Actual');
});
