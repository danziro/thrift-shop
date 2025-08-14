#!/usr/bin/env node
// Usage:
//   ADMIN_PASSWORD=yourpass node scripts/seed-mock.mjs [baseUrl] [user] [pass] [limit]
// Defaults: baseUrl=http://localhost:3000, user=any, pass=process.env.ADMIN_PASSWORD, limit=undefined

const baseUrl = process.argv[2] || 'http://localhost:3000';
const user = process.argv[3] || 'any';
const pass = process.argv[4] || process.env.ADMIN_PASSWORD || '';
const limitArg = process.argv[5] ? Number(process.argv[5]) : undefined;

if (!pass) {
  console.error('Missing admin password. Provide as 4th arg or ADMIN_PASSWORD env');
  process.exit(1);
}

async function main() {
  const url = `${baseUrl.replace(/\/$/, '')}/api/admin/seed`;
  const payload = limitArg !== undefined ? { limit: limitArg } : {};
  const auth = Buffer.from(`${user}:${pass}`).toString('base64');
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${auth}`,
    },
    body: JSON.stringify(payload),
  });
  const text = await res.text();
  try {
    const json = JSON.parse(text);
    console.log(`[${res.status}]`, JSON.stringify(json, null, 2));
  } catch {
    console.log(`[${res.status}]`, text);
  }
  if (!res.ok) process.exit(1);
}

main().catch((e) => { console.error(e); process.exit(1); });
