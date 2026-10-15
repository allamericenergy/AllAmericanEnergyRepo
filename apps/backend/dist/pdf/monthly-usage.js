const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const numeric = /^(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?$/;
const monthIndex = text => MONTHS.findIndex(month => month.toLowerCase() === text.replace(/\.$/, '').toLowerCase());
// Tables are read left to right, then top to bottom, including a repeated month
// at the end of a 13-month history. Never sort by the month name alone.
export function extractLatestMonthlyUsage(rows) {
    const candidates = [];
    let found = false;
    let invalid = false;
    for (let start = 0; start < rows.length; start++) {
        const heading = rows[start];
        const title = heading.text.match(/\bMonthly\s+(CCF|kWh)\s+Use\b/i);
        if (!title)
            continue;
        found = true;
        const unit = title[1].toLowerCase() === 'ccf' ? 'CCF' : 'kWh';
        const entries = [];
        let pending = null;
        let lastMatch = start;
        for (let index = start + 1; index < rows.length; index++) {
            const row = rows[index];
            if (row.pageNumber !== heading.pageNumber || index - lastMatch > 5 || /Monthly\s+(?:CCF|kWh)\s+Use/i.test(row.text))
                break;
            const tokens = row.text.trim().split(/\s+/);
            const months = tokens.map(monthIndex);
            if (months.length >= 2 && months.every(month => month >= 0)) {
                if (pending) {
                    invalid = true;
                    break;
                }
                pending = { months, row };
                lastMatch = index;
                continue;
            }
            if (!pending)
                continue;
            // Ignore text in the adjacent bill column, including supply rates/amounts.
            const numericTokens = [];
            for (const token of tokens) {
                if (!numeric.test(token))
                    break;
                numericTokens.push(token);
            }
            if (numericTokens.length < pending.months.length)
                continue;
            pending.months.forEach((month, column) => entries.push({
                month, value: Number(numericTokens[column].replaceAll(',', '')),
                source: { pageNumber: row.pageNumber, text: heading.text, monthRow: pending.row.text, valueRow: row.text, column: column + 1 },
            }));
            pending = null;
            lastMatch = index;
        }
        if (pending || entries.length < 2) {
            invalid = true;
            continue;
        }
        const forward = entries.slice(1).every((entry, index) => entry.month === (entries[index].month + 1) % 12);
        const backward = entries.slice(1).every((entry, index) => entry.month === (entries[index].month + 11) % 12);
        if (!forward && !backward) {
            invalid = true;
            continue;
        }
        const latest = forward ? entries.at(-1) : entries[0];
        candidates.push({ value: { month: MONTHS[latest.month], value: latest.value, unit }, source: latest.source });
    }
    const unique = new Map(candidates.map(candidate => [JSON.stringify(candidate.value), candidate]));
    if (invalid || unique.size > 1)
        return { value: null, issue: {
                field: 'latestMonthlyUsage', code: 'AMBIGUOUS', message: 'Monthly usage table is incomplete, has unclear month order, or contains conflicting totals; review the bill.',
            } };
    if (!unique.size)
        return { value: null, ...(found ? { issue: { field: 'latestMonthlyUsage', code: 'NOT_FOUND', message: 'Monthly usage table could not be read.' } } : {}) };
    return unique.values().next().value;
}
