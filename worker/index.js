const KEY = 'flights';
const MAX_FLIGHTS = 5000;

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
const empty = (status) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });

async function sha256(text) {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));
}

// Returns true, false, or 'unconfigured' (fail closed when no passcode secret is set).
async function checkPasscode(request, env) {
  if (!env.ADMIN_PASSCODE) return 'unconfigured';
  const given = request.headers.get('x-passcode') || '';
  const [a, b] = await Promise.all([sha256(given), sha256(env.ADMIN_PASSCODE)]);
  return crypto.subtle.timingSafeEqual(a, b);
}

function validDate(s) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d && y >= 2020 && y <= 2100;
}

function parseFlight(body) {
  const date = String(body.date || '');
  const from = String(body.from || '').toUpperCase();
  const to = String(body.to || '').toUpperCase();
  const creator = String(body.creator || '').trim();
  const cost = Number(body.cost);
  if (!validDate(date)) return { error: 'Invalid date' };
  if (!/^[A-Z]{3}$/.test(from) || !/^[A-Z]{3}$/.test(to) || from === to) return { error: 'Invalid route' };
  if (!/^[A-Za-z0-9 ._-]{1,10}$/.test(creator)) return { error: 'Creator must be 1–10 letters or numbers (initials or an ID)' };
  if (!Number.isFinite(cost) || cost < 0 || cost > 100000) return { error: 'Invalid cost' };
  return { flight: { date, from, to, creator, cost: Math.round(cost * 100) / 100 } };
}

async function readFlights(env) {
  return (await env.FLIGHTS.get(KEY, 'json')) || [];
}

async function guard(request, env) {
  const ok = await checkPasscode(request, env);
  if (ok === 'unconfigured') return json({ error: 'Passcode is not configured on the server' }, 503);
  if (!ok) return json({ error: 'Wrong passcode' }, 401);
  return null;
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);

    if (path === '/api/flights' && request.method === 'GET') {
      const flights = await readFlights(env);
      flights.sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
      return json({ flights });
    }

    if (path === '/api/auth' && request.method === 'POST') {
      const denied = await guard(request, env);
      return denied || empty(204);
    }

    if (path === '/api/flights' && request.method === 'POST') {
      const denied = await guard(request, env);
      if (denied) return denied;

      const text = await request.text();
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const parsed = parseFlight(body || {});
      if (parsed.error) return json({ error: parsed.error }, 400);

      const flights = await readFlights(env);
      if (flights.length >= MAX_FLIGHTS) return json({ error: 'Flight limit reached' }, 409);

      const flight = { id: crypto.randomUUID(), ...parsed.flight, createdAt: new Date().toISOString() };
      flights.push(flight);
      await env.FLIGHTS.put(KEY, JSON.stringify(flights));
      return json({ flight }, 201);
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
