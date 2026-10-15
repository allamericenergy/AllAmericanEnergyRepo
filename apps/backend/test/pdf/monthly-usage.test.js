import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractLatestMonthlyUsage } from '../../src/pdf/monthly-usage.js';
import { extractBillFields } from '../../src/pdf/bill-fields.js';
const rows = (...texts) => texts.map(text => ({ pageNumber: 1, text }));

test('last repeated month wins across two table blocks and unrelated rows', () => {
  const result = extractLatestMonthlyUsage(rows('Monthly kWh Use', 'Dec Jan Feb Mar Apr May Jun', 'Supply 14080.00kWh X $0.10 $1,408.00', '13040 12640 12320 14000 14320 13840 14720', 'Subtotal $1,408.00', 'Jul Aug Sep Oct Nov Dec', '15360 17360 15760 10720 12960 14080'));
  assert.deepEqual(result.value, { month: 'Dec', value: 14080, unit: 'kWh' });
});
test('CCF latest value supports year rollover, decimals and comma grouping', () => {
  assert.deepEqual(extractLatestMonthlyUsage(rows('Monthly CCF Use', 'Nov Dec Jan', '900 1,050 1,234.5')).value, { month: 'Jan', value: 1234.5, unit: 'CCF' });
});
test('descending month order selects the first month', () => {
  assert.deepEqual(extractLatestMonthlyUsage(rows('Monthly CCF Use', 'Mar Feb Jan Dec', '75 80 95 100')).value, { month: 'Mar', value: 75, unit: 'CCF' });
});
test('zero is a valid latest value and can supply the usage field', () => {
  const result = extractBillFields(rows('Monthly CCF Use', 'Nov Dec', '12 0'));
  assert.deepEqual(result.bill.usage, { value: 0, unit: 'CCF' });
});
test('missing cells and nonconsecutive month order require review', () => {
  for (const data of [rows('Monthly kWh Use', 'Jan Feb Mar', '1 2'), rows('Monthly kWh Use', 'Jan Apr Feb', '1 2 3')]) {
    const result = extractLatestMonthlyUsage(data);
    assert.equal(result.value, null);
    assert.equal(result.issue.code, 'AMBIGUOUS');
  }
});
test('table values cannot be taken from a different page', () => {
  const result = extractLatestMonthlyUsage([...rows('Monthly kWh Use', 'Nov Dec'), { pageNumber: 2, text: '10 20' }]);
  assert.equal(result.value, null);
});
test('conflicting monthly tables and billed usage differences are flagged', () => {
  assert.equal(extractLatestMonthlyUsage(rows('Monthly CCF Use', 'Jan Feb', '1 2', 'Monthly CCF Use', 'Jan Feb', '1 3')).value, null);
  const result = extractBillFields(rows('Usage: 5 kWh', 'Monthly kWh Use', 'Jan Feb', '1 2'));
  assert.ok(result.extraction.issues.some(issue => issue.code === 'MISMATCH'));
});
