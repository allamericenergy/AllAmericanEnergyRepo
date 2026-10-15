const NUM = '(?:\\d{1,3}(?:,\\d{3})+|\\d+)(?:\\.\\d+)?';
const DATE = '(?:\\d{1,2}/\\d{1,2}/(?:\\d{4}|\\d{2})|[A-Za-z]{3,9}\\s+\\d{1,2},?\\s+\\d{4})';
const numeric = text => Number(text.replaceAll(',', ''));
const evidence = row => ({ pageNumber: row.pageNumber, text: row.text });
const cellsOf = row => row.cells ?? row.text.split('\t').map((text, index) => ({ text, x: index * 300 }));

// Numeric dates on the supported US bills use month/day/year.
export function billDate(text) {
  let year, month, day;
  const numericDate = /^(\d{1,2})\/(\d{1,2})\/(\d{4}|\d{2})$/.exec(text);
  if (numericDate) {
    [, month, day, year] = numericDate.map(Number);
    if (year < 100) year += year < 70 ? 2000 : 1900;
  } else {
    const named = /^([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})$/.exec(text);
    if (!named) return null;
    month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(named[1].slice(0, 3).toLowerCase()) + 1;
    day = Number(named[2]); year = Number(named[3]);
  }
  const date = new Date(Date.UTC(year, month - 1, day));
  return month > 0 && date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
    ? date.toISOString().slice(0, 10) : null;
}

export function extractBillDetails(rows) {
  const candidates = new Map();
  const fields = {}, sources = {}, issues = [];
  const eversource = rows.some(row => /\beversource\b/i.test(row.text));
  const aquarion = rows.some(row => /aquarionwater\.com/i.test(row.text));
  const mdc = rows.some(row => /themdc\.org|The Metropolitan District/i.test(row.text));
  const add = (field, value, row, extra = {}, priority = 1) => {
    if (value === null || value === undefined || value === '') return;
    if (!candidates.has(field)) candidates.set(field, []);
    candidates.get(field).push({ value, source: { ...evidence(row), ...extra }, priority });
  };
  const money = text => {
    text = text.replace(/[\uE000-\uF8FF]/g, '$');
    const match = text.match(/(\()?(-)?\s*(?:USD\s*|\$\s*)?(-?(?:\d{1,3}(?:,\d{3})+|\d+)\.\d{2})(?!\d)(\))?/i);
    if (!match || Boolean(match[1]) !== Boolean(match[4])) return null;
    return { value: (match[1] || match[2] ? -1 : 1) * numeric(match[3]),
      currency: /USD/i.test(match[0]) || match[0].includes('$') ? 'USD' : null };
  };
  function nearby(index, anchor, maxRows = 5) {
    return rows.slice(index + 1, index + 1 + maxRows).filter(row => row.pageNumber === rows[index].pageNumber
      && (row.y === undefined || row.y - rows[index].y <= 65))
      .flatMap(row => cellsOf(row).filter(cell => cell.x >= anchor.x - 12 && cell.x <= anchor.x + 100).map(cell => ({ row, cell })));
  }

  for (let index = 0; index < rows.length; index++) {
    const row = rows[index];
    const text = row.text.replace(/[\uE000-\uF8FF]/g, '$');
    let match;
    if (mdc || aquarion) {
      const provider = text.match(mdc ? /The Metropolitan District/i : /Aquarion Water Company(?: of CT)?/i);
      if (provider) add('supplier', mdc ? 'The Metropolitan District' : 'Aquarion Water Company', row);
      match = text.match(new RegExp(`\\bWater\\s+Usage\\s*\\(CCF\\)\\s*:?\\s*(${NUM})(?=\\s|$)`, 'i'))
        ?? text.match(new RegExp(`\\bWater\\s+Usage\\s+Charge\\s+(${NUM})\\s*CCF\\b`, 'i'));
      if (match) add('currentUsage', numeric(match[1]), row);
    }
    if (mdc) {
      match = text.match(new RegExp(`\\bInvoice Date:\\s*(${DATE})`, 'i'));
      if (match) add('statementDate', billDate(match[1]), row);
      match = text.match(/\bCustomer Name:\s*([^\t]+)/i);
      if (match) add('serviceProvidedTo', match[1].trim(), row);
      match = text.match(/\bMeter Number\s*:?\s+(\d+)\b/i);
      if (match) add('meterNumber', match[1], row);
      match = text.match(/\bType of Meter Reading\s*:?\s*(Actual|Estimated|Estimate|Remote|Customer)\b/i);
      if (match) add('readingType', match[1], row);
      match = text.match(/\bRemaining Balance\s+(.+)/i);
      if (match) add('balanceForward', money(match[1]), row);
      if (/^Billing Period\s*$/i.test(text.trim())) {
        for (const next of rows.slice(index + 1, index + 4)) {
          if (next.pageNumber !== row.pageNumber || (next.y != null && next.y - row.y > 50)) break;
          const period = next.text.match(new RegExp(`^(${DATE})\\s*-\\s*(${DATE})\\s*\\((\\d+) Days\\)`, 'i'));
          if (period) {
            const from = billDate(period[1]), to = billDate(period[2]);
            if (from && to && from <= to) {
              add('servicePeriod', { from, to }, next);
              add('days', Number(period[3]), next);
            }
            break;
          }
        }
      }
    }
    if (aquarion) {
      // Meter registers share an ID; keep it as text and use the labeled bill total for usage.
      match = text.match(/^(\d+)\s+(?:\(\d+\)\s+)?From\s*\/\s*To\b/i);
      if (match) add('meterNumber', match[1], row);
      if (/^Meter\s+Meter\s+Current\s+Reading\s+Next$/i.test(text.trim())) {
        const nextColumn = row.cells?.at(-1)?.x;
        for (const next of rows.slice(index + 2, index + 9)) {
          if (next.pageNumber !== row.pageNumber || /^Service from|^Meter\s+Meter/i.test(next.text)) break;
          if (next.y != null && next.y - row.y > 80) break;
          const reading = next.text.match(/^(Actual|Estimated|Estimate)\s*$/i);
          if (reading) add('readingType', reading[1], next);
          for (const cell of cellsOf(next)) {
            if (nextColumn == null || Math.abs(cell.x - nextColumn) > 30) continue;
            const date = cell.text.match(new RegExp(`^(${DATE})$`, 'i'));
            if (date) add('nextReadDate', billDate(date[1]), next);
          }
        }
      }
    }
    for (const [field, pattern] of [
      ['nameKey', /\b(?:Customer\s+)?name key\s*:\s*([^\t]+)/i],
      ['serviceReference', /\b(?:Serv\s+Ref|Service\s+Reference)\s*:\s*([\w-]+)/i],
      ['billCycle', /\bBill\s+Cycle\s*:\s*([\w-]+)/i],
      ['meterNumber', /\bMeter\s+(?:Number|No\.?)\s*:\s*([\w-]+)/i],
      ['readingType', /\bReading\s+Type\s*:\s*(Actual|Estimated|Estimate|Customer|Remote)\b/i],
    ]) {
      match = text.match(pattern);
      if (match) add(field, match[1].trim(), row);
    }
    // Match a tariff label within its own column; do not consume prose about rates.
    for (const cell of cellsOf(row)) {
      const tariff = cell.text.trim().match(/^\(?(?:DISTRIBUTION\s+)?RATE(?:\s*:\s*|\s+)([\w][\w .\/-]*?)\)?$/i);
      if (tariff && /\d/.test(tariff[1])) add('rate', tariff[1].trim(), row);
    }
    for (const [field, label] of [
      ['statementDate', 'Statement\\s+Date'],
      ['nextReadDate', 'Next\\s+read\\s+date(?:\\s+on\\s+or\\s+about)?'],
      ['totalAmountDueDate', '(?:Payment\\s+Due\\s+Date|Due\\s+Date)'],
    ]) {
      match = text.match(new RegExp(`\\b${label}\\s*:?\\s*(${DATE})`, 'i'));
      if (match) add(field, billDate(match[1]), row);
    }
    match = text.match(new RegExp(`\\b(?:Service\\s+from|Bill\\s+Period)\\s*:?\\s*(${DATE})\\s*(?:-|–|to)\\s*(${DATE})`, 'i'));
    if (match) {
      const from = billDate(match[1]), to = billDate(match[2]);
      if (from && to && from <= to) add('servicePeriod', { from, to }, row);
    }
    match = text.match(/\b(\d+)\s+Days\b|\bDays\s*:\s*(\d+)/i);
    if (match) add('days', Number(match[1] ?? match[2]), row);
    match = text.match(new RegExp(`\\bCurrent\\s+Usage\\s*[:=]\\s*(${NUM})(?=\\s|$)`, 'i'));
    if (match) add('currentUsage', numeric(match[1]), row);
    match = text.match(new RegExp(`\\b(?:This\\s+month\\s+you\\s+used|Billed\\s+Usage)\\s*[:=]?\\s*(${NUM})\\s*(CCF|kWh|therms?)\\b`, 'i'));
    if (match) add('currentUsage', { value: numeric(match[1]), unit: /^ccf$/i.test(match[2]) ? 'CCF' : /^kwh$/i.test(match[2]) ? 'kWh' : 'therms' }, row, {}, 2);
    for (const [field, label] of [['totalDemandUse', 'Total\\s+Demand\\s+Use'], ['billedDemand', 'Billed\\s+Demand'], ['readDemand', 'Read\\s+Demand']]) {
      match = text.match(new RegExp(`\\b${label}\\s*[:=]?\\s*(${NUM})\\s*(kW|kVA|CCF|MCF|therms?)\\b`, 'i'));
      if (match) add(field, { value: numeric(match[1]), unit: ({ kw: 'kW', kva: 'kVA', ccf: 'CCF', mcf: 'MCF', therm: 'therms', therms: 'therms' })[match[2].toLowerCase()] }, row, {}, 2);
    }
    if (/\bDemand\s+(?:Chrg|Charge)\b/i.test(text)) {
      match = text.match(new RegExp(`(${NUM})\\s*kW\\s*[x×]\\s*\\$`, 'i'));
      if (match) add('billedDemand', { value: numeric(match[1]), unit: 'kW' }, row,
        { derived: true, explanation: 'Demand quantity used in a demand-charge calculation.' });
    }
    match = text.match(new RegExp(`\\bSupply(?:\\s+(?:Chrg\\.?|Charge))?\\s*:?\\s+(${NUM})\\s*(kWh|CCF|therms?)\\s*[x×]\\s*(USD\\s*|\\$)(-?${NUM})`, 'i'));
    if (match) add('supplyPrice', { value: numeric(match[4]), currency: /USD/i.test(match[3]) || eversource ? 'USD' : null,
      unit: /^kwh$/i.test(match[2]) ? 'kWh' : /^ccf$/i.test(match[2]) ? 'CCF' : 'therms' }, row);
    // Require a per-unit marker so a total charge cannot become a unit price.
    match = text.match(new RegExp(`\\bSupply(?:\\s+(?:Chrg\\.?|Charge))?(?:\\s*\\(price\\)|\\s+price)?\\s*:?\\s*(USD\\s*|\\$)(-?${NUM})\\s*(?:/|per\\s+)\\s*(kWh|CCF|therms?)\\b`, 'i'));
    if (match) add('supplyPrice', { value: numeric(match[2]), currency: /USD/i.test(match[1]) || eversource ? 'USD' : null,
      unit: /^kwh$/i.test(match[3]) ? 'kWh' : /^ccf$/i.test(match[3]) ? 'CCF' : 'therms' }, row);

    match = /\bBalance Forward\b/i.exec(text);
    if (match) {
      const balance = money(text.slice(match.index + match[0].length)) ?? money(text.slice(0, match.index));
      if (balance && (aquarion || mdc)) balance.currency = 'USD';
      add('balanceForward', balance, row);
    }

    // Only follow the total-due heading, never "Amount Due On" in payment history.
    const dueCell = cellsOf(row).find(cell => /^Total Amount Due\b/i.test(cell.text));
    const amountNowDue = cellsOf(row).find(cell => /^Amount now due\b/i.test(cell.text));
    if (amountNowDue) {
      for (const cell of cellsOf(row)) {
        const due = money(cell.text);
        if (due) add('totalAmountDue', due, row);
        const date = cell.text.match(new RegExp(`\\bby\\s+(${DATE})`, 'i'));
        if (date) add('totalAmountDueDate', billDate(date[1]), row);
      }
      for (const next of rows.slice(index + 1, index + 3)) {
        const date = next.text.match(new RegExp(`\\bby\\s+(${DATE})`, 'i'));
        if (date) add('totalAmountDueDate', billDate(date[1]), next);
        const due = money(next.text);
        if (due) add('totalAmountDue', due, next);
      }
    }
    const amountNowDueText = text.match(/\bAmount\s+Now\s+Due\s+by\s+([0-9/]+)\s+([$\d,().-]+)/i);
    if (amountNowDueText) {
      add('totalAmountDue', money(amountNowDueText[2]), row, {}, 2);
      add('totalAmountDueDate', billDate(amountNowDueText[1]), row, {}, 2);
    }
    if (dueCell) {
      const tail = text.slice(text.indexOf(dueCell.text) + 'Total Amount Due'.length);
      add('totalAmountDue', money(tail), row);
      const date = tail.match(new RegExp(`\\b(?:by|on)\\s+(${DATE})`, 'i'));
      if (date) add('totalAmountDueDate', billDate(date[1]), row);
      for (const next of rows.slice(index + 1, index + 4)) {
        if (next.pageNumber !== row.pageNumber || (next.y !== undefined && next.y - row.y > 35)) break;
        if (/\b(?:Amount Due On|Last Payment|Balance Forward|Current Charges)\b/i.test(next.text)) break;
        for (const cell of cellsOf(next)) {
          if (next.cells && cell.x < dueCell.x - 15) continue;
          if (/^(?:by\s+\S+\s*)?(?:USD\s*|\$)/i.test(cell.text)) add('totalAmountDue', money(cell.text), next);
          const date = cell.text.match(new RegExp(`^by\\s+(${DATE})`, 'i'));
          if (date) add('totalAmountDueDate', billDate(date[1]), next);
        }
      }
    }

    const address = cellsOf(row).find(cell => /^(?:Svc Addr|Service Address)\s*:/i.test(cell.text));
    if (aquarion) {
      const serviceFor = cellsOf(row).find(cell => /^Service For:/i.test(cell.text));
      if (serviceFor) {
        const cells = cellsOf(row);
        const start = cells.indexOf(serviceFor);
        const inline = serviceFor.text.replace(/^Service For:\s*/i, '');
        const addressCell = inline ? { ...serviceFor, text: inline } : cells[start + 1];
        if (addressCell && /^\d+\s/.test(addressCell.text)) {
          const locality = nearby(index, addressCell, 2).find(next => /\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(next.cell.text));
          add('serviceAddress', [addressCell.text, locality?.cell.text].filter(Boolean).join(', '), row);
        }
      }
    }
    if (address) {
      const parts = [address.text.replace(/^(?:Svc Addr|Service Address)\s*:\s*/i, '')];
      const matchedRows = [evidence(row)];
      for (const next of nearby(index, address, 8)) {
        if (/\b(?:Serv Ref|Service Reference|Bill Cycle|Service from|Next read|Meter)\b/i.test(next.cell.text)) break;
        parts.push(next.cell.text);
        matchedRows.push(evidence(next.row));
        if (/\b[A-Z]{2}\s+\d{5}(?:-\d{4})?\b/.test(next.cell.text)) break;
      }
      add('serviceAddress', parts.filter(Boolean).join(', '), row, { rows: matchedRows });
    }
    for (const [field, label, priority] of [
      ['serviceProvidedTo', /^Service Provided To\s*:\s*/i, 1],
      ['supplier', /^Your (?:electric|gas) supplier is\s*/i, 2],
      ['supplier', /^Supplier\s*:?\s*$/i, 1],
      ['supplier', /^Your Supplier Information\s*$/i, 2],
      ['supplier', /^Your Natural Gas Supplier Information\s*$/i, 2],
    ]) {
      const anchor = cellsOf(row).find(cell => label.test(cell.text));
      if (!anchor) continue;
      const inline = anchor.text.replace(label, '').trim();
      if (inline) add(field, inline, row, {}, priority);
      else {
        const next = nearby(index, anchor, 3).find(next => Math.abs(next.cell.x - anchor.x) <= 15);
        if (next && !/[:$]|^(?:Service |Account |Statement |Total |Monthly |Continued)/i.test(next.cell.text)) {
          add(field, next.cell.text, next.row, { label: anchor.text }, priority);
        }
      }
    }
    const supplierLine = text.match(/^\d+\s+(.+?(?:Corporation|Company|LLC|Inc\.?))\s*$/i);
    if (supplierLine) add('supplier', supplierLine[1].trim(), row, {}, 2);

    // The supported meter table has a two-row header and five columns.
    const header = text.trim().split(/\s+/).join(' ').toLowerCase();
    if (/^meter current previous current reading(?:\s|$)/.test(header)) {
      const lower = rows[index + 1];
      if (lower?.pageNumber !== row.pageNumber) continue;
      if (!/^number read read usage type(?:\s|$)/.test(lower.text.trim().split(/\s+/).join(' ').toLowerCase())) continue;
      // Rows from the neighboring bill column can occur between the header
      // and its values. Only consider cells within the five meter columns.
      const headerCells = row.cells?.slice(0, 5);
      const left = headerCells?.[0]?.x;
      const right = headerCells?.[4]?.endX;
      let meterNumber = null;
      for (const candidate of rows.slice(index + 2, index + 8)) {
        if (candidate.pageNumber !== row.pageNumber || (row.y != null && candidate.y - row.y > 70)) break;
        const tableCells = left != null && right != null && candidate.cells
          ? candidate.cells.filter(cell => cell.x >= left - 20 && cell.x <= right + 10)
          : null;
        if (tableCells && !tableCells.length) continue;
        const data = tableCells ? { ...candidate, text: tableCells.map(cell => cell.text).join('\t') } : candidate;
        const compactValues = /^(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)\s+(Actual|Estimated|Estimate|Customer|Remote)\b/i.exec(data.text);
        const values = data.text.match(new RegExp(`^([\\w-]+)\\s+(${NUM})\\s+(${NUM})\\s+(${NUM})\\s+(Actual|Estimated|Estimate|Customer|Remote)\\b`, 'i'))
          ?? (meterNumber && data.text.match(new RegExp(`^(${NUM})\\s+(${NUM})\\s+(${NUM})\\s+(Actual|Estimated|Estimate|Customer|Remote)\\b`, 'i'))
            ? [data.text, meterNumber, compactValues[1], compactValues[1], compactValues[2], compactValues[3]] : null);
        if (meterNumber && compactValues) {
          add('meterNumber', meterNumber, data, { header: `${row.text} / ${lower.text}` });
          add('currentUsage', numeric(compactValues[3]), data);
          add('readingType', compactValues[4], data);
          break;
        }
      if (values) {
        add('meterNumber', values[1], data, { header: `${row.text} / ${lower.text}` });
        add('currentUsage', numeric(values[4]), data);
        add('readingType', values[5], data);
        break;
      }
        if (!values && /^[0-9A-Za-z-]+$/.test(data.text.trim())) meterNumber = data.text.trim();
        // Keep looking when the number and readings are split across rows.
      }
    }
    if (/^meter current prior correction total read(?:\s|$)/.test(header)) {
      const lower = rows[index + 2];
      const data = rows[index + 4] ?? rows[index + 3];
      if (lower?.pageNumber === row.pageNumber && data?.pageNumber === row.pageNumber) {
        const values = data.text.match(/^([\w-]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+([\d,.]+)\s+(Actual|Estimated|Estimate|Customer|Remote)\b/i);
        if (values) {
          add('meterNumber', values[1], data, { header: `${row.text} / ${lower.text}` });
          add('currentUsage', numeric(values[5]), data);
          add('readingType', values[6], data);
        }
      }
    }
  }
  for (const field of ['totalDemandUse', 'serviceAddress', 'nameKey', 'statementDate', 'serviceReference', 'servicePeriod', 'billCycle', 'nextReadDate', 'balanceForward', 'supplier', 'rate', 'totalAmountDueDate', 'totalAmountDue', 'serviceProvidedTo', 'meterNumber', 'readingType', 'days', 'supplyPrice', 'currentUsage', 'billedDemand', 'readDemand']) {
    const matches = candidates.get(field) ?? [];
    const priority = Math.max(0, ...matches.map(match => match.priority));
    const unique = new Map(matches.filter(match => match.priority === priority).map(match => [JSON.stringify(match.value), match]));
    if (unique.size === 1) {
      const match = unique.values().next().value;
      fields[field] = match.value; sources[field] = match.source;
      if (match.value && typeof match.value === 'object' && 'currency' in match.value && !match.value.currency) {
        issues.push({ field: `${field}.currency`, code: 'NOT_FOUND', message: 'Currency could not be established.' });
      }
    } else {
      fields[field] = null;
      if (unique.size) issues.push({ field, code: 'AMBIGUOUS', message: 'Different values found; review the bill.' });
    }
  }
  return { fields, sources, issues };
}
