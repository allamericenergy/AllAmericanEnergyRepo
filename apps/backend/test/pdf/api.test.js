import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../../src/pdf/app.js';

let server;
let base;
before(async () => {
  server = createApp({ maxFileSizeMB: 0.01 }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

function samplePdf(stream = 'BT /F1 12 Tf 72 720 Td (Hello PDF API) Tj ET') {
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(pdf)); pdf += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(n => `${String(n).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return pdf;
}
async function upload(content, field = 'pdf') {
  const form = new FormData();
  if (content !== undefined) form.append(field, new Blob([content], { type: 'application/pdf' }), 'test.pdf');
  return fetch(`${base}/api/pdf/extract`, { method: 'POST', body: form });
}
test('health endpoint', async () => {
  assert.deepEqual(await (await fetch(`${base}/health`)).json(), { status: 'ok' });
});
test('extracts real PDF text and page details', async () => {
  const response = await upload(samplePdf());
  const body = await response.json();
  assert.equal(response.status, 200, JSON.stringify(body));
  assert.equal(body.pageCount, 1);
  assert.match(body.text, /Hello PDF API/);
  assert.equal(body.pages[0].pageNumber, 1);
  assert.deepEqual(body.warnings, []);
});
test('rejects missing file', async () => assert.equal((await upload()).status, 400));
test('returns separate PDF lines and keeps horizontally separated values on the same line', async () => {
  const stream = 'BT /F1 12 Tf 1 0 0 1 72 720 Tm (Invoice) Tj 1 0 0 1 72 700 Tm (Item) Tj 1 0 0 1 250 700 Tm (Amount) Tj 1 0 0 1 72 680 Tm (Total: 100) Tj ET';
  const response = await upload(samplePdf(stream));
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.lines.length, 3);
  assert.deepEqual(body.lines.map(line => [line.pageNumber, line.lineNumber]), [[1, 1], [1, 2], [1, 3]]);
  assert.equal(body.lines[0].text, 'Invoice');
  assert.match(body.lines[1].text, /^Item\s+Amount$/);
  assert.equal(body.lines[2].text, 'Total: 100');
  assert.deepEqual(body.pages[0].lines, body.lines.map(({ pageNumber, ...line }) => line));
  assert.equal(body.text.includes('-- 1 of 1 --'), false);
});
test('rejects non-PDF content', async () => assert.equal((await upload('not a pdf')).status, 415));
test('rejects damaged PDF', async () => assert.equal((await upload('%PDF-1.4\nbroken')).status, 422));
test('rejects oversized upload', async () => assert.equal((await upload('x'.repeat(11000))).status, 413));
test('rejects wrong field', async () => assert.equal((await upload(samplePdf(), 'file')).status, 400));
test('rejects JSON request', async () => {
  const response = await fetch(`${base}/api/pdf/extract`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(response.status, 415);
});
