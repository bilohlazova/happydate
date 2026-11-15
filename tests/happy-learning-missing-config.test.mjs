import assert from 'node:assert/strict';
import test from 'node:test';
import './server-test-loader.mjs';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://synthetic.invalid';
process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_synthetic';
delete process.env.HAPPY_LEARNING_TOKEN_SECRET;
const detect = await import('../src/app/api/memory-capture/detect/route.ts');
const confirm = await import('../src/app/api/memory-capture/confirm/route.ts');

for (const [name, handler, body] of [
  ['detect', detect.POST, { candidates: [] }],
  ['confirm', confirm.POST, { ok: false, error: 'save_failed' }],
]) {
  test(`missing signing configuration stops ${name} before any hosted dependency`, async () => {
    let networkCalls = 0;
    const original = globalThis.fetch;
    globalThis.fetch = async () => { networkCalls += 1; throw new Error('unexpected hosted call'); };
    try {
      const response = await handler(new Request('http://localhost/api/memory-capture/' + name, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }));
      assert.equal(response.status, 503);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert.deepEqual(await response.json(), body);
      assert.equal(networkCalls, 0);
    } finally { globalThis.fetch = original; }
  });
}

test('configured signing secret preserves normal request validation', async () => {
  process.env.HAPPY_LEARNING_TOKEN_SECRET = 'synthetic-local-only-signing-value';
  try {
    for (const handler of [detect.POST, confirm.POST]) {
      const response = await handler(new Request('http://localhost/probe', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}',
      }));
      assert.equal(response.status, 400);
    }
  } finally { delete process.env.HAPPY_LEARNING_TOKEN_SECRET; }
});
