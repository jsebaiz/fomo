const KEY = 'flights';
const MAX_FLIGHTS = 5000;
const MAX_ADDS_PER_MINUTE = 20; // per visitor; the form is open to anyone, so keep spam in check
const NA = 'N/A';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
const empty = (status) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

// Returns true, false, or 'unconfigured' (fail closed when the secret isn't set).
async function check(request, env, header, secretName) {
  const secret = env[secretName];
  if (!secret) return 'unconfigured';
  const given = request.headers.get(header) || '';
  const [a, b] = await Promise.all([sha256(given), sha256(secret)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

// Removing flights and seeing private details needs the admin passcode.
async function guard(request, env) {
  const ok = await check(request, env, 'x-passcode', 'ADMIN_PASSCODE');
  if (ok === 'unconfigured') return json({ error: 'Passcode is not configured on the server' }, 503);
  if (!ok) return json({ error: 'Wrong passcode' }, 401);
  return null;
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2020 && y <= 2100;
}

function cleanHandle(value, label, max) {
  const v = String(value ?? '').trim();
  if (/^n\/?a$/i.test(v)) return { value: NA };
  const h = v.replace(/^@/, '');
  if (!new RegExp('^[A-Za-z0-9._]{1,' + max + '}$').test(h)) return { error: `Invalid ${label} handle (or choose N/A)` };
  return { value: h };
}

function parseFlight(body) {
  const date = String(body.date || '');
  const name = String(body.name || '').trim().replace(/\s+/g, ' ');
  const from = String(body.from || '').toLowerCase();
  const to = String(body.to || '').toLowerCase();
  const cost = Number(body.cost);
  if (!validDate(date)) return { error: 'Invalid date' };
  if (!/^[\p{L}][\p{L}\p{M} .'’-]{1,59}$/u.test(name) || name.split(' ').length < 2) return { error: 'Enter the full name (first and last)' };
  const ig = cleanHandle(body.instagram, 'Instagram', 30);
  if (ig.error) return { error: ig.error };
  const tt = cleanHandle(body.tiktok, 'TikTok', 24);
  if (tt.error) return { error: tt.error };
  if (!/^[a-z0-9-]{2,24}$/.test(from) || !/^[a-z0-9-]{2,24}$/.test(to) || from === to) return { error: 'Choose two different schools' };
  if (!Number.isFinite(cost) || cost < 0 || cost > 100000) return { error: 'Invalid cost' };
  return { flight: { date, name, instagram: ig.value, tiktok: tt.value, from, to, cost: Math.round(cost * 100) / 100 } };
}

// What the public sees: initials only. Full name and handles never leave the server without the admin passcode.
function initials(name) {
  const parts = String(name || '').split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  const first = (p) => Array.from(p)[0].toUpperCase();
  const letters = parts.length > 1 ? [first(parts[0]), first(parts[parts.length - 1])] : [first(parts[0])];
  return letters.join('.') + '.';
}
const publicView = (f) => ({ id: f.id, date: f.date, from: f.from, to: f.to, cost: f.cost, creator: initials(f.name || f.creator) });

async function tooManyAdds(request, env) {
  const ip = request.headers.get('cf-connecting-ip') || 'unknown';
  const key = `rl:${ip}:${Math.floor(Date.now() / 60000)}`;
  const n = parseInt((await env.FLIGHTS.get(key)) || '0', 10);
  if (n >= MAX_ADDS_PER_MINUTE) return true;
  await env.FLIGHTS.put(key, String(n + 1), { expirationTtl: 120 });
  return false;
}

async function readFlights(env) {
  return (await env.FLIGHTS.get(KEY, 'json')) || [];
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);

    // Anyone can read the tracker. Admins also get the private details.
    if (path === '/api/flights' && request.method === 'GET') {
      const admin = (await check(request, env, 'x-passcode', 'ADMIN_PASSCODE')) === true;
      const flights = await readFlights(env);
      flights.sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
      return json({ admin, flights: admin ? flights : flights.map(publicView) });
    }

    if (path === '/api/auth' && request.method === 'POST') {
      const denied = await guard(request, env);
      return denied || empty(204);
    }

    // Anyone can log a flight.
    if (path === '/api/flights' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const parsed = parseFlight(body || {});
      if (parsed.error) return json({ error: parsed.error }, 400);

      if (await tooManyAdds(request, env)) return json({ error: 'Too many entries — try again in a minute' }, 429);

      const flights = await readFlights(env);
      if (flights.length >= MAX_FLIGHTS) return json({ error: 'Flight limit reached' }, 409);

      const flight = { id: crypto.randomUUID(), ...parsed.flight, createdAt: new Date().toISOString() };
      flights.push(flight);
      await env.FLIGHTS.put(KEY, JSON.stringify(flights));
      return json({ flight: publicView(flight) }, 201);
    }

    const del = path.match(/^\/api\/flights\/([A-Za-z0-9-]{1,64})$/);
    if (del && request.method === 'DELETE') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const flights = await readFlights(env);
      const next = flights.filter((f) => f.id !== del[1]);
      if (next.length === flights.length) return json({ error: 'Not found' }, 404);
      await env.FLIGHTS.put(KEY, JSON.stringify(next));
      return empty(204);
    }

    if (path === '/api/flights' || path === '/api/auth' || del) return json({ error: 'Method not allowed' }, 405);
    return json({ error: 'Not found' }, 404);
  },
};
