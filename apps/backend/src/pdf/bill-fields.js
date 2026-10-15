import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { extractLatestMonthlyUsage } from './monthly-usage.js';
import { extractBillDetails } from './bill-details.js';

const NUMBER = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const UNIT = '(?:kWh|MWh|therms?|CCF|MCF|m³|m3|gallons?)';
const asNumber = text => Number(text.replaceAll(',', ''));
const normalizeUnit = unit => ({ kwh: 'kWh', mwh: 'MWh', therm: 'therms', therms: 'therms', ccf: 'CCF', mcf: 'MCF', m3: 'm³', gallon: 'gallons' }[unit.toLowerCase()] ?? unit);

export function extractBillFields(rows) {
  const accountCandidates = [];
  const chargeCandidates = [];
  const usageCandidates = [];
  const issues = [];
  const sources = {};
  const isEversource = rows.some(row => /\beversource\b/i.test(row.text));
  const isWaterUtility = rows.some(row => /aquarionwater\.com|themdc\.org|The Metropolitan District/i.test(row.text));
  for (const originalRow of rows) {
    const row = { ...originalRow, text: originalRow.text.replace(/[\uE000-\uF8FF]/g, '$') };
    const billedWithUnit = row.text.match(new RegExp(`=\\s*(${NUMBER})\\s+Billed\\s+(${UNIT})\\s+Usage\\b`, 'i'));
    if (billedWithUnit) usageCandidates.push({ value: { value: asNumber(billedWithUnit[1]), unit: normalizeUnit(billedWithUnit[2]) }, source: row });
    const account = row.text.match(/\b(?:account\s*(?:number|no\.?|#)|acct\.?\s*(?:number|no\.?|#))\s*:?\s*([0-9][0-9 -]{3,30}[0-9])(?=\t|$)/i);
    if (account) accountCandidates.push({ value: account[1].replace(/[ -]/g, ''), source: row });

    const label = /\b(?:total\s+current\s+charges|current\s+charges|charges\s+this\s+period)\b/i.exec(row.text);
    if (label) {
      // Only a directly adjacent monetary value qualifies; headers and totals due do not.
      const after = row.text.slice(label.index + label[0].length);
      const before = row.text.slice(0, label.index);
      const money = '(?:USD\\s*|\\$\\s*)?(-?(?:\\d{1,3}(?:,\\d{3})+|\\d+)\\.\\d{2})';
      const match = after.match(new RegExp(`^\\s*:?\\s*${money}(?=\\s|$)`, 'i'))
        ?? before.match(new RegExp(`${money}\\s*$`, 'i'));
      if (match) {
        const currency = /USD/i.test(match[0]) || isWaterUtility || (isEversource && match[0].includes('$')) ? 'USD' : null;
        chargeCandidates.push({ value: { value: asNumber(match[1]), currency }, source: row,
          priority: /^total/i.test(label[0]) ? 2 : 1 });
      }
    }

    // Require a billing/usage label and unit, excluding daily averages and history.
    if (!/average|daily|per day|history|last (?:year|month)|previous/i.test(row.text)) {
      const label = '(?:billed\\s+usage|total\\s+(?:electric(?:ity)?\\s+)?(?:usage|consumption)|energy\\s+used|usage|consumption)';
      const match = row.text.match(new RegExp(`\\b${label}\\s*:?\\s*(${NUMBER})\\s*(${UNIT})\\b`, 'i'))
        ?? row.text.match(new RegExp(`\\b(${NUMBER})\\s*(${UNIT})\\s+${label}\\b`, 'i'));
      if (match) usageCandidates.push({ value: { value: asNumber(match[1]), unit: normalizeUnit(match[2]) }, source: row });
    }
    const cngUsage = row.text.match(/\b(\d+(?:\.\d+)?)\s*(CCF|therms?)\b/i);
    if (cngUsage && !isEversource && (/this\s+month|natural\s+gas\s+use/i.test(row.text) || /^\d+(?:\.\d+)?\s*CCF\b/i.test(row.text))) {
      usageCandidates.push({ value: { value: asNumber(cngUsage[1]), unit: normalizeUnit(cngUsage[2]) }, source: row, priority: 2 });
    }
    if (isWaterUtility) {
      const waterUsage = row.text.match(new RegExp(`\\bWater\\s+Usage\\s*\\(CCF\\)\\s*:?\\s*(${NUMBER})(?=\\s|$)`, 'i'))
        ?? row.text.match(new RegExp(`\\bWater\\s+Usage\\s+Charge\\s+(${NUMBER})\\s*CCF\\b`, 'i'));
      if (waterUsage) usageCandidates.push({ value: { value: asNumber(waterUsage[1]), unit: 'CCF' }, source: row });
    }

    // Eversource states billed usage without a unit. Confirm it against a priced energy quantity.
    if (isEversource) {
      const billed = row.text.match(new RegExp(`=\\s*(${NUMBER})\\s+Billed Usage\\b`, 'i'));
      if (billed) {
        const value = asNumber(billed[1]);
        for (const reference of rows.filter(other => other.pageNumber === row.pageNumber)) {
          const quantity = reference.text.match(new RegExp(`\\b(${NUMBER})\\s*(kWh)\\s*[x×]\\s*\\$`, 'i'));
          if (quantity && asNumber(quantity[1]) === value) {
            usageCandidates.push({ value: { value, unit: 'kWh' }, source: row, unitSource: reference });
            break;
          }
        }
      }
    }
  }
  function resolve(field, candidates) {
    const unique = new Map(candidates.map(candidate => [JSON.stringify(candidate.value), candidate]));
    if (unique.size !== 1) {
      issues.push({ field, code: unique.size ? 'AMBIGUOUS' : 'NOT_FOUND',
        message: unique.size ? 'Multiple different values found; review the bill.' : 'No supported label/value match found.' });
      return null;
    }
    const candidate = unique.values().next().value;
    sources[field] = { ...candidate.source, ...(candidate.unitSource ? { unitSource: candidate.unitSource } : {}) };
    return candidate.value;
  }
  const priority = Math.max(0, ...chargeCandidates.map(candidate => candidate.priority));
  const monthly = extractLatestMonthlyUsage(rows);
  if (monthly.issue) issues.push(monthly.issue);
  if (monthly.source) sources.latestMonthlyUsage = monthly.source;
  if (!usageCandidates.length && monthly.value) {
    usageCandidates.push({ value: { value: monthly.value.value, unit: monthly.value.unit }, source: monthly.source });
  }
  const bill = {
    accountNumber: resolve('accountNumber', accountCandidates),
    usage: resolve('usage', usageCandidates),
    currentCharges: resolve('currentCharges', chargeCandidates.filter(candidate => candidate.priority === priority)),
    latestMonthlyUsage: monthly.value,
  };
  if (bill.usage && monthly.value && (bill.usage.unit !== monthly.value.unit || bill.usage.value !== monthly.value.value)) {
    issues.push({ field: 'latestMonthlyUsage', code: 'MISMATCH', message: 'Latest monthly usage differs from labeled billed usage; review the bill.' });
  }
  if (bill.currentCharges && !bill.currentCharges.currency) {
    issues.push({ field: 'currentCharges.currency', code: 'NOT_FOUND', message: 'Currency could not be established; a dollar symbol alone is ambiguous.' });
  }
  const details = extractBillDetails(rows);
  Object.assign(bill, details.fields);
  Object.assign(sources, details.sources);
  issues.push(...details.issues);
  return { bill, extraction: { status: issues.length ? 'needs_review' : 'complete', method: 'label-and-position-rules', sources, issues } };
}

// PDF content streams need not follow visual order. Rebuild rows from coordinates.
export async function readBillRows(buffer) {
  const task = getDocument({ data: new Uint8Array(buffer), verbosity: 0 });
  try {
    const document = await task.promise;
    const rows = [];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
      const page = await document.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items.filter(item => item.str?.trim()).map(item => {
        const [x, y] = viewport.convertToViewportPoint(item.transform[4], item.transform[5]);
        return { text: item.str, x, y, width: item.width };
      }).sort((a, b) => a.y - b.y || a.x - b.x);
      const groups = [];
      for (const item of items) {
        let row = groups.at(-1);
        if (!row || Math.abs(row.y - item.y) > 2) {
          row = { y: item.y, items: [] };
          groups.push(row);
        }
        row.items.push(item);
      }
      for (const row of groups) {
        row.items.sort((a, b) => a.x - b.x);
        const text = row.items.map((item, index) => {
          if (!index) return item.text;
          const previous = row.items[index - 1];
          const gap = item.x - previous.x - previous.width;
          return (gap > 12 ? '\t' : gap > 0.5 ? ' ' : '') + item.text;
        }).join('');
        const cells = [];
        for (const item of row.items) {
          const previous = cells.at(-1);
          const gap = previous ? item.x - previous.endX : Infinity;
          if (!previous || gap > 12) cells.push({ x: item.x, endX: item.x + item.width, text: item.text });
          else {
            previous.text += (gap > 0.5 ? ' ' : '') + item.text;
            previous.endX = item.x + item.width;
          }
        }
        rows.push({ pageNumber, text, y: row.y, cells });
      }
      page.cleanup();
    }
    return rows;
  } finally {
    await task.destroy();
  }
}
