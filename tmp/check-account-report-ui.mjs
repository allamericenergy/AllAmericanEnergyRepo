import { chromium } from 'file:///C:/Users/HP/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
const server = createServer(async (req, res) => {
  const path = req.url.split('?')[0];
  const asset = path.startsWith('/assets/') && !path.includes('..') ? path : '/index.html';
  try { const data = await readFile(`apps/frontend/dist${asset}`); res.setHeader('Content-Type', asset.endsWith('.js') ? 'text/javascript' : asset.endsWith('.css') ? 'text/css' : 'text/html'); res.end(data); }
  catch { res.statusCode = 404; res.end(); }
});
await new Promise(resolve => server.listen(4175, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
page.on('pageerror', error => console.log('PAGE ERROR', error.message));
await page.addInitScript(() => {
  localStorage.setItem('aae_access_token', 'test-only');
  localStorage.setItem('aae_user', JSON.stringify({ firstName: 'Report', lastName: 'Test', role: 'superadmin', mustChangePassword: false }));
});
await page.route('**/api/**', route => route.fulfill({ json: { total: 0, byCompany: {} } }));
try {
  await page.goto('http://127.0.0.1:4175/organizations?section=account-report');
  await page.getByLabel('Choose spreadsheet').setInputFiles({ name: 'test.csv', mimeType: 'text/csv', buffer: Buffer.from('Statement Date,Utility,Utility Type,Product,Total New Charges,Account Number\n09-14-2026,Eversource,Ignored,Ignored,1878.49,00123\n09-02-2026,United Illuminating,Ignored,Ignored,1192.80,00456') });
  await page.getByRole('button', { name: 'Submit', exact: true }).click();
  await page.getByRole('heading', { name: 'Total New Charges: $3,071.29', exact: true }).waitFor();
  await page.getByRole('combobox', { name: 'Utility type', exact: true }).click();
  await page.getByRole('option', { name: 'Eversource', exact: true }).click();
  await page.getByRole('heading', { name: 'Total New Charges: $1,878.49', exact: true }).waitFor();
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Download PDF', exact: true }).click();
  const download = await downloadPromise;
  if (await download.failure()) throw new Error(await download.failure());
  const bytes = await readFile(await download.path());
  const pdf = bytes.toString('latin1');
  if (!pdf.startsWith('%PDF-') || !pdf.includes('Eversource') || !pdf.includes('$1,878.49') || pdf.includes('United Illuminating')) throw new Error('Downloaded PDF contents did not match filtered rows');
  const fallbackPromise = page.waitForEvent('download');
  await page.getByRole('link', { name: 'save the PDF', exact: true }).click();
  if (await (await fallbackPromise).failure()) throw new Error('Fallback download failed');
  await page.screenshot({ path: 'tmp/account-report-ui.png', fullPage: true });
  console.log('Upload, Submit, total, and PDF download passed:', download.suggestedFilename());
} catch (error) { console.log('PAGE', await page.title(), await page.locator('body').innerText()); throw error; } finally { await browser.close(); server.close(); }
