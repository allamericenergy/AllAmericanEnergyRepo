import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { createApp } from '../../dist/app.js';
import { signAccessToken } from '../../dist/security/auth.js';

let server;
let base;
const token = signAccessToken({ id: 'pdf-integration-test', email: 'test@example.com', role: 'member', orgId: null });
before(async () => {
  server = createApp().listen(0, '127.0.0.1');
  await once(server, 'listening');
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => new Promise(resolve => server.close(resolve)));

test('CRM PDF endpoint requires login before processing uploads', async () => {
  const response = await fetch(`${base}/api/pdf/extract`, { method: 'POST' });
  assert.equal(response.status, 401);
});
test('authenticated CRM endpoint reaches the extraction API', async () => {
  const form = new FormData();
  form.append('pdf', new Blob(['not a PDF']), 'invalid.pdf');
  const response = await fetch(`${base}/api/pdf/extract`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form
  });
  assert.equal(response.status, 415);
  assert.equal((await response.json()).error.code, 'INVALID_FILE_TYPE');
});
test('existing CRM health endpoint still works', async () => {
  assert.deepEqual(await (await fetch(`${base}/api/health`)).json(), { ok: true });
});
