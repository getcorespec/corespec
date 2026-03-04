import { describe, it, expect } from 'vitest';
import { createApp } from './app.js';

const TEST_APP_ID = '12345';
const TEST_PRIVATE_KEY = `-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA0Z3VS5JJcds3xfn/ygWyF8PbnGy0AHBbPJEunPMHJBEjnmAj
K+JjgnMSH3f/PEBDx0R3gJJMnpK9r0fBOHzV5FHx6WAToVPeOeLP8kl+vHAjX+mq
JcQxWHsq1PCO/HCi8xnRsohcMEEGdSAa0Jfn7e6qT0xQ5kiVdLtCZlKkHMACFDP
NkjGXqENnqgpHF1HYYqSgB0bprV6ChPgpM7CeeV7ItMD21Fn3uuBb1BwMeSt8n/z
d5jGR0OE/k7eFYSS45C7bC+I8FyLgPOqkepMrSMnTkaXiaflNlm0J/2kYIj5iid4
k0cFGCejHbCKwBOq/0Bj3HRMgfExPFVT6UMPXQIDAQABAoIBAC5RgZ+hBx7xHNaM
pPgwGMnCd0RCiPfD4yFR6MgL1Q2+Abn0rld9/GYOKzCNLq30VPgy8HadEd3XJbp/
h6bRKpnFmeUhj9b1o1wbPmnq3/VLZYI5OfYCUspnS+bXvCb3dMCCH5EbNifLOnAV
hE0FeP7N0gVTSQFvcXMaijRdEwOlsBB0MFSpR6iMsB7NN4P/e2RhA8g8i3Hgl5vI
R6BqDy1JV/Mtybee3HFB1GO3kGZOOrmZIIYXUbMypjJi2L5D/tqVVRhCqCAB7FSh
sNPHYQO5Tu8Y1MBVHU2UKcaqvj7+tQQmHjI25Y3pHIqXP0BbsFCJq0+lsFb11h+G
UfXzPgECgYEA5nYRxv3QDBbqQzQnGjltyS1p7h2jUpLtarfXQgBzBN8D9mZiPTMB
VHk6rGbHh9TI/tS0Yyi/nqOJO3M/uPr3FNZsQ2d3I4vR+xEn3e2SMXY+1bNMhV
0FMXrLMTcb3J0tFkdMfJv3KFLiBzMGYqp5dJMB0OZIOG3DSKI0oG1sECgYEA5+Ld
x2x/VaUwJYZwEm5NLvC1F/aVOp7M7gfhmYItaKG3RBfBx2BjEGt07JDMCH+FnB8a
z0rA7h2RpKMwdy4pT7B9fmHKGzaKHbx5NyqKwT/f7tTZ+c0+GKNkv3P8SfCh7Nf2
lXd3XPsM2yzQ6u15LL7e5FNJk27XwKB0sXeTW0CgYBJvU05jVLjBmSKFNBP+zqfl
wN/JfE/UiGj2gDQcJ4PDml0f0Dd3RkCHJv5PPq0p7pfvQzFqJEbMB0/b6Y7IhIe/
JDl86h/f2J0V2cpB8/HWKeoRSq9a+7GVKDM0E2bmwYFOMlK8P0gWCNRizP+lNPFJ
xbSYfx5r5dZoKVB8sgQYAQKBgBBD67vv+uxIGPK4cBcJjBqtaHNDC/H0N0Xqvmz7
g+b+4ABl0HL5BFGLZ1bPDJFE7MKgF0b6WmKuBY5+SxiA6JFR4VjCkZ8yJrLAe0n+
BHZPX3KQFjKcXPOL7RdVc5JZeM7qNAS8n3NNP7MOfH1h6Z0MiVZeek/FHGB/MQz7
gfNAoGBAOK9Mf1TdTVi3TA3c2+T7ViY0jk4BQqg0FxeO7sBvRJRzCXsbsJF/0pT+
xMNKN1/fhvQdE+JmQ/QA1O4J+MJ6kv1x9fn1BynOb3K6HCgY3tT1uh6u5VFJ5cI
Wl+VNhIm/Cw0PCg3SVipxWO4bVmB/1FPzxPfEQ7HM+m8x7eB
-----END RSA PRIVATE KEY-----`;
const TEST_SECRET = 'test-webhook-secret';

function makeApp() {
  return createApp({
    appId: TEST_APP_ID,
    privateKey: TEST_PRIVATE_KEY,
    webhookSecret: TEST_SECRET,
  });
}

describe('bot app', () => {
  it('GET /health returns ok', async () => {
    const { app } = makeApp();
    const res = await app.request('/health');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ status: 'ok' });
  });

  it('POST /api/github/webhooks rejects unsigned payload', async () => {
    const { app } = makeApp();
    const res = await app.request('/api/github/webhooks', {
      method: 'POST',
      headers: {
        'x-github-delivery': 'test-id',
        'x-github-event': 'ping',
        'x-hub-signature-256': 'sha256=bad',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ zen: 'test' }),
    });
    expect(res.status).toBe(400);
  });
});
