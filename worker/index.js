const FLIGHTS_KEY = 'flights';
const CLANS_KEY = 'clans';
const MAX_FLIGHTS = 5000;
const MAX_CLANS = 2000;
const MAX_ADDS_PER_MINUTE = 20; // per visitor; these forms are open to anyone, so keep spam in check
const NA = 'N/A';

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });
const empty = (status) => new Response(null, { status, headers: { 'cache-control': 'no-store' } });
const redirect = (location, status = 302) => new Response(null, { status, headers: { location, 'cache-control': 'no-store' } });

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
const publicFlight = (f) => ({ id: f.id, date: f.date, from: f.from, to: f.to, cost: f.cost, creator: initials(f.name || f.creator) });

async function tooMany(env, bucket, ip, limit) {
  const key = `rl:${bucket}:${ip}:${Math.floor(Date.now() / 60000)}`;
  const n = parseInt((await env.FLIGHTS.get(key)) || '0', 10);
  if (n >= limit) return true;
  await env.FLIGHTS.put(key, String(n + 1), { expirationTtl: 120 });
  return false;
}
const ipOf = (request) => request.headers.get('cf-connecting-ip') || 'unknown';

async function readList(env, key) {
  return (await env.FLIGHTS.get(key, 'json')) || [];
}

function randomCode(len = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
}

// Server-side twin of the school list the pages use for colors — here only the
// code and label matter, since validation and the display name are computed here.
const SCHOOL_LABELS = {
  asu: 'Arizona State University', ua: 'University of Arizona', ucla: 'UCLA',
  usc: 'University of Southern California', cal: 'UC Berkeley', stanford: 'Stanford University',
  ucsd: 'UC San Diego', sdsu: 'San Diego State University', uw: 'University of Washington',
  uo: 'University of Oregon', utah: 'University of Utah', cu: 'CU Boulder',
  utaustin: 'UT Austin', tamu: 'Texas A&M University', rice: 'Rice University',
  smu: 'Southern Methodist University', ou: 'University of Oklahoma', mizzou: 'University of Missouri',
  wustl: 'Washington University in St. Louis', wisconsin: 'University of Wisconsin–Madison',
  minnesota: 'University of Minnesota', northwestern: 'Northwestern University',
  uchicago: 'University of Chicago', illinois: 'University of Illinois', purdue: 'Purdue University',
  iu: 'Indiana University', michigan: 'University of Michigan', osu: 'Ohio State University',
  penn: 'University of Pennsylvania', pennstate: 'Penn State University', pitt: 'University of Pittsburgh',
  cmu: 'Carnegie Mellon University', nyu: 'New York University', columbia: 'Columbia University',
  cornell: 'Cornell University', yale: 'Yale University', harvard: 'Harvard University',
  bu: 'Boston University', georgetown: 'Georgetown University', umd: 'University of Maryland',
  uva: 'University of Virginia', duke: 'Duke University', unc: 'UNC Chapel Hill',
  gt: 'Georgia Tech', uga: 'University of Georgia', vanderbilt: 'Vanderbilt University',
  ala: 'University of Alabama', uf: 'University of Florida', fsu: 'Florida State University',
  miami: 'University of Miami',
  elon: 'Elon University', sc: 'University of South Carolina', clemson: 'Clemson University',
  ohiou: 'Ohio University', emory: 'Emory University', fiu: 'Florida International University',
  tampa: 'University of Tampa', vt: 'Virginia Tech', coastal: 'Coastal Carolina University',
  rutgers: 'Rutgers University', tcu: 'Texas Christian University', salisbury: 'Salisbury University',
};

// Recognized national fraternities and sororities. A chapter name has to match
// one of these (or a common nickname) — the server is the authority here, so a
// tampered request can't register "Whiskey Barrel Club" as a chapter. Kept in
// sync by hand with /fomo/greek-data.js, which owns the letters and colors.
const ORG_NAMES = [
  'Acacia', 'Alpha Chi Rho', 'Alpha Delta Gamma', 'Alpha Delta Phi', 'Alpha Epsilon Pi',
  'Alpha Gamma Rho', 'Alpha Gamma Sigma', 'Alpha Kappa Lambda', 'Alpha Phi Alpha',
  'Alpha Phi Delta', 'Alpha Sigma Phi', 'Alpha Tau Omega', 'Beta Chi Theta',
  'Beta Sigma Psi', 'Beta Theta Pi', 'Chi Phi', 'Chi Psi', 'Delta Chi',
  'Delta Kappa Epsilon', 'Delta Lambda Phi', 'Delta Phi', 'Delta Sigma Phi',
  'Delta Tau Delta', 'Delta Upsilon', 'FarmHouse', 'Iota Phi Theta', 'Kappa Alpha Order',
  'Kappa Alpha Psi', 'Kappa Delta Rho', 'Kappa Sigma', 'Lambda Chi Alpha',
  'Lambda Theta Phi', 'Omega Psi Phi', 'Phi Beta Sigma', 'Phi Delta Theta',
  'Phi Gamma Delta', 'Phi Iota Alpha', 'Phi Kappa Psi', 'Phi Kappa Sigma',
  'Phi Kappa Tau', 'Phi Kappa Theta', 'Phi Mu Delta', 'Phi Sigma Kappa',
  'Pi Kappa Alpha', 'Pi Kappa Phi', 'Pi Lambda Phi', 'Psi Upsilon',
  'Sigma Alpha Epsilon', 'Sigma Alpha Mu', 'Sigma Chi', 'Sigma Lambda Beta', 'Sigma Nu',
  'Sigma Phi Delta', 'Sigma Phi Epsilon', 'Sigma Pi', 'Sigma Tau Gamma', 'Tau Delta Phi',
  'Tau Epsilon Phi', 'Tau Kappa Epsilon', 'Theta Chi', 'Theta Delta Chi', 'Theta Xi',
  'Triangle', 'Zeta Beta Tau', 'Zeta Psi',
  'Alpha Chi Omega', 'Alpha Delta Pi', 'Alpha Epsilon Phi', 'Alpha Gamma Delta',
  'Alpha Kappa Alpha', 'Alpha Omicron Pi', 'Alpha Phi', 'Alpha Sigma Alpha',
  'Alpha Sigma Tau', 'Alpha Xi Delta', 'Chi Omega', 'Delta Delta Delta', 'Delta Gamma',
  'Delta Phi Epsilon', 'Delta Sigma Theta', 'Delta Zeta', 'Gamma Phi Beta',
  'Kappa Alpha Theta', 'Kappa Delta', 'Kappa Kappa Gamma', 'Phi Mu', 'Phi Sigma Sigma',
  'Pi Beta Phi', 'Sigma Delta Tau', 'Sigma Gamma Rho', 'Sigma Kappa', 'Sigma Sigma Sigma',
  'Theta Phi Alpha', 'Zeta Phi Beta', 'Zeta Tau Alpha',
];
const ORG_ALIASES = {
  'sae': 'Sigma Alpha Epsilon', 'pike': 'Pi Kappa Alpha', 'fiji': 'Phi Gamma Delta',
  'tke': 'Tau Kappa Epsilon', 'zbt': 'Zeta Beta Tau', 'aepi': 'Alpha Epsilon Pi',
  'sammy': 'Sigma Alpha Mu', 'sig ep': 'Sigma Phi Epsilon', 'sigep': 'Sigma Phi Epsilon',
  'phi delt': 'Phi Delta Theta', 'phi psi': 'Phi Kappa Psi', 'delt': 'Delta Tau Delta',
  'dke': 'Delta Kappa Epsilon', 'deke': 'Delta Kappa Epsilon', 'ato': 'Alpha Tau Omega',
  'psi u': 'Psi Upsilon', 'ka': 'Kappa Alpha Order', 'kappa alpha': 'Kappa Alpha Order',
  'kappa sig': 'Kappa Sigma', 'lambda chi': 'Lambda Chi Alpha', 'tep': 'Tau Epsilon Phi',
  'axo': 'Alpha Chi Omega', 'adpi': 'Alpha Delta Pi', 'aoii': 'Alpha Omicron Pi',
  'tri delta': 'Delta Delta Delta', 'tridelta': 'Delta Delta Delta',
  'tri delt': 'Delta Delta Delta', 'zta': 'Zeta Tau Alpha', 'theta': 'Kappa Alpha Theta',
  'kkg': 'Kappa Kappa Gamma', 'dg': 'Delta Gamma', 'dphie': 'Delta Phi Epsilon',
  'sdt': 'Sigma Delta Tau', 'tri sigma': 'Sigma Sigma Sigma', 'aka': 'Alpha Kappa Alpha',
  'dst': 'Delta Sigma Theta',
};
const normOrg = (s) => String(s).toLowerCase().replace(/[.'’]/g, '').replace(/\s+/g, ' ').trim();
const ORG_LOOKUP = {};
ORG_NAMES.forEach((n) => { ORG_LOOKUP[normOrg(n)] = n; });
Object.keys(ORG_ALIASES).forEach((a) => { ORG_LOOKUP[normOrg(a)] = ORG_ALIASES[a]; });

// The officer who registers the chapter. Stored so the roster has someone to
// contact — never returned by any public endpoint, only the admin roster.
const EMAIL_RE = /^[^\s@]{1,64}@[^\s@.]+(\.[^\s@.]+)+$/;
function parseContact(body) {
  const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const email = clean(body.email).toLowerCase();
  const phoneRaw = clean(body.phone);
  const nameRe = /^[\p{L}][\p{L} .'-]{0,39}$/u;

  if (!nameRe.test(firstName)) return { error: 'Enter your first name' };
  if (!nameRe.test(lastName)) return { error: 'Enter your last name' };
  if (email.length > 120 || !EMAIL_RE.test(email)) return { error: 'Enter a valid email' };
  const digits = phoneRaw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return { error: 'Enter a valid phone number' };

  return { contact: { firstName, lastName, email, phone: phoneRaw.slice(0, 24) } };
}

function parseClan(body) {
  const school = String(body.school || '').trim().toLowerCase();
  if (!SCHOOL_LABELS[school]) return { error: 'Choose a school from the list' };

  const canonical = ORG_LOOKUP[normOrg(body.chapterName)];
  if (!canonical) return { error: 'Choose a recognized fraternity or sorority from the list' };
  const chapterName = canonical;

  // Chapter size is optional context, self-reported and never used for ranking.
  let chapterSize = null;
  const raw = body.chapterSize;
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    const n = Number(raw);
    if (!Number.isInteger(n) || n < 1 || n > 2000) return { error: 'Chapter size should be a number between 1 and 2000' };
    chapterSize = n;
  }
  const name = `${chapterName} — ${SCHOOL_LABELS[school]}`;
  return { clan: { school, schoolLabel: SCHOOL_LABELS[school], chapterName, name, chapterSize } };
}

function cleanUsername(value) {
  const v = String(value || '').trim().replace(/^@/, '');
  if (!/^[A-Za-z0-9._]{2,24}$/.test(v)) return null;
  return v;
}

// What the public clan list shows. The referral code and member usernames are
// never included here — usernames are only exposed via the admin-gated
// /api/clans/internal roster below. Only approved members count toward the
// public member count and leaderboard — a submitted username is a pending
// claim until an admin approves it on the internal roster.
const approvedMembers = (c) => (c.members || []).filter((m) => m.status === 'approved');
// A clan's total also includes `seedApproved` — a baseline count set once via the
// admin-only /api/clans/seed import (e.g. registrations already confirmed on an
// external roster before this chapter had a fomo clan page). It's a plain number,
// never tied to any named person, so it carries no identity to expose.
const totalApproved = (c) => (c.seedApproved || 0) + approvedMembers(c).length;
const publicClan = (c, joins) => ({
  id: c.id,
  name: c.name,
  school: c.school,
  schoolLabel: c.schoolLabel,
  chapterName: c.chapterName,
  chapterSize: c.chapterSize || null,
  members: totalApproved(c),
  joined: joins,
  createdAt: c.createdAt,
});

function joinsWithin(clan, ms) {
  // "All time" includes the seeded baseline; a specific recent window (24h/7d/30d)
  // only reflects real, timestamped joins — seed data has no join date to place in one.
  if (ms == null) return totalApproved(clan);
  const cutoff = Date.now() - ms;
  return approvedMembers(clan).filter((m) => new Date(m.joinedAt).getTime() >= cutoff).length;
}

const WINDOWS = { '24h': 86400000, '7d': 7 * 86400000, '30d': 30 * 86400000, all: null };

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, '');

    // A referral link redirects straight to the join page; it carries no page of its own.
    const ref = path.match(/^\/fomo\/referral\/([a-z0-9]{4,16})$/);
    if (ref) return redirect(`/fomo/join?ref=${ref[1]}`);

    if (!path.startsWith('/api/')) return env.ASSETS.fetch(request);

    // ---------------- Flights ----------------
    if (path === '/api/flights' && request.method === 'GET') {
      const admin = (await check(request, env, 'x-passcode', 'ADMIN_PASSCODE')) === true;
      const flights = await readList(env, FLIGHTS_KEY);
      flights.sort((a, b) => (a.date === b.date ? (a.createdAt < b.createdAt ? 1 : -1) : a.date < b.date ? 1 : -1));
      return json({ admin, flights: admin ? flights : flights.map(publicFlight) });
    }

    if (path === '/api/auth' && request.method === 'POST') {
      const denied = await guard(request, env);
      return denied || empty(204);
    }

    if (path === '/api/flights' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const parsed = parseFlight(body || {});
      if (parsed.error) return json({ error: parsed.error }, 400);
      if (await tooMany(env, 'flight', ipOf(request), MAX_ADDS_PER_MINUTE)) return json({ error: 'Too many entries — try again in a minute' }, 429);

      const flights = await readList(env, FLIGHTS_KEY);
      if (flights.length >= MAX_FLIGHTS) return json({ error: 'Flight limit reached' }, 409);

      const flight = { id: crypto.randomUUID(), ...parsed.flight, createdAt: new Date().toISOString() };
      flights.push(flight);
      await env.FLIGHTS.put(FLIGHTS_KEY, JSON.stringify(flights));
      return json({ flight: publicFlight(flight) }, 201);
    }

    const del = path.match(/^\/api\/flights\/([A-Za-z0-9-]{1,64})$/);
    if (del && request.method === 'DELETE') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const flights = await readList(env, FLIGHTS_KEY);
      const next = flights.filter((f) => f.id !== del[1]);
      if (next.length === flights.length) return json({ error: 'Not found' }, 404);
      await env.FLIGHTS.put(FLIGHTS_KEY, JSON.stringify(next));
      return empty(204);
    }

    // ---------------- Clans ----------------
    // List, ranked by joins in the selected window (24h / 7d / 30d / all). Total member
    // count is always shown too. No trading PnL here — there's no real trading data behind
    // this page, so nothing here pretends to be a dollar figure.
    if (path === '/api/clans' && request.method === 'GET') {
      const windowKey = url.searchParams.get('window') || 'all';
      const ms = Object.prototype.hasOwnProperty.call(WINDOWS, windowKey) ? WINDOWS[windowKey] : null;
      const clans = await readList(env, CLANS_KEY);
      const withCounts = clans.map((c) => ({ clan: c, joined: joinsWithin(c, ms) }));
      withCounts.sort((a, b) => b.joined - a.joined || totalApproved(b.clan) - totalApproved(a.clan));
      return json({ clans: withCounts.map(({ clan, joined }) => publicClan(clan, joined)) });
    }

    if (path === '/api/clans' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const person = parseContact(body || {});
      if (person.error) return json({ error: person.error }, 400);
      const parsed = parseClan(body || {});
      if (parsed.error) return json({ error: parsed.error }, 400);
      if (await tooMany(env, 'clan', ipOf(request), 5)) return json({ error: 'Too many clans created — try again in a minute' }, 429);

      const clans = await readList(env, CLANS_KEY);
      if (clans.length >= MAX_CLANS) return json({ error: 'Clan limit reached' }, 409);
      if (clans.some((c) => c.school === parsed.clan.school && c.chapterName.toLowerCase() === parsed.clan.chapterName.toLowerCase())) {
        return json({ error: 'That chapter is already registered' }, 409);
      }

      let code;
      do { code = randomCode(); } while (clans.some((c) => c.code === code));

      const clan = {
        id: crypto.randomUUID(), code,
        school: parsed.clan.school, schoolLabel: parsed.clan.schoolLabel, chapterName: parsed.clan.chapterName,
        name: parsed.clan.name, chapterSize: parsed.clan.chapterSize,
        contact: person.contact, members: [], createdAt: new Date().toISOString(),
      };
      clans.push(clan);
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({ clan: { ...publicClan(clan, 0), code, referralUrl: `${url.origin}/fomo/referral/${code}` } }, 201);
    }

    // Flat roster of every join across every clan, for manually crediting people who
    // already have fomo and submitted a username without going through a specific
    // referral link. Admin-passcode gated — usernames never appear anywhere public.
    if (path === '/api/clans/internal' && request.method === 'GET') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const clans = await readList(env, CLANS_KEY);
      const rows = [];
      clans.forEach((c) => {
        (c.members || []).forEach((m) => {
          rows.push({
            code: c.code, username: m.username, email: m.email || '', joinedAt: m.joinedAt,
            school: c.schoolLabel, chapterName: c.chapterName,
            status: m.status === 'approved' ? 'approved' : 'pending',
          });
        });
      });
      rows.sort((a, b) => (a.joinedAt < b.joinedAt ? 1 : -1));

      // Who registered each chapter. Only ever served here, behind the passcode.
      const chapters = clans
        .filter((c) => c.contact)
        .map((c) => ({
          code: c.code, chapterName: c.chapterName, school: c.schoolLabel,
          firstName: c.contact.firstName, lastName: c.contact.lastName,
          email: c.contact.email, phone: c.contact.phone,
          members: totalApproved(c), chapterSize: c.chapterSize || null,
          createdAt: c.createdAt,
        }))
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

      return json({ rows, chapters });
    }

    // Approving a submission is what actually counts someone toward their clan's
    // public member count and leaderboard rank — a raw submission alone doesn't.
    // Admin-passcode gated, same as the roster it's driven from.
    if (path === '/api/clans/internal/approve' && request.method === 'POST') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const text = await request.text();
      if (text.length > 8192) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const approvals = Array.isArray(body && body.approvals) ? body.approvals : [];
      if (!approvals.length || approvals.length > 200) return json({ error: 'Send 1–200 approvals' }, 400);

      const clans = await readList(env, CLANS_KEY);
      let approved = 0;
      for (const a of approvals) {
        const code = String((a && a.code) || '');
        const username = String((a && a.username) || '');
        const clan = clans.find((c) => c.code === code);
        if (!clan) continue;
        const member = (clan.members || []).find((m) => m.username.toLowerCase() === username.toLowerCase());
        if (!member || member.status === 'approved') continue;
        member.status = 'approved';
        approved++;
      }
      if (approved > 0) await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({ approved });
    }

    // One-time admin import for chapter-level totals from an external roster (e.g. an
    // existing registration system) — school, chapter, chapter size, and how many are
    // already confirmed. Deliberately carries no names — that data never touches this
    // endpoint. Upserts by (school, chapterName) so re-running it is safe.
    if (path === '/api/clans/seed' && request.method === 'POST') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const text = await request.text();
      if (text.length > 32768) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const chapters = Array.isArray(body && body.chapters) ? body.chapters : [];
      if (!chapters.length || chapters.length > 300) return json({ error: 'Send 1–300 chapters' }, 400);

      const clans = await readList(env, CLANS_KEY);
      let created = 0, updated = 0;
      const errors = [];
      for (const raw of chapters) {
        const parsed = parseClan(raw || {});
        if (parsed.error) { errors.push({ input: raw, error: parsed.error }); continue; }
        const seedApproved = Number(raw.seedApproved);
        if (!Number.isInteger(seedApproved) || seedApproved < 0 || seedApproved > 5000) {
          errors.push({ input: raw, error: 'seedApproved must be an integer 0–5000' });
          continue;
        }
        const existing = clans.find((c) => c.school === parsed.clan.school && c.chapterName.toLowerCase() === parsed.clan.chapterName.toLowerCase());
        if (existing) {
          existing.chapterSize = parsed.clan.chapterSize;
          existing.seedApproved = seedApproved;
          updated++;
        } else {
          if (clans.length >= MAX_CLANS) { errors.push({ input: raw, error: 'Clan limit reached' }); continue; }
          let code;
          do { code = randomCode(); } while (clans.some((c) => c.code === code));
          clans.push({
            id: crypto.randomUUID(), code,
            school: parsed.clan.school, schoolLabel: parsed.clan.schoolLabel, chapterName: parsed.clan.chapterName,
            name: parsed.clan.name, chapterSize: parsed.clan.chapterSize, seedApproved,
            members: [], createdAt: new Date().toISOString(),
          });
          created++;
        }
      }
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({ created, updated, errors });
    }

    // Resolve a referral code to the clan it names, for the join page to greet by name.
    // Deliberately narrow: name only, never the member list or the code itself.
    const lookup = path.match(/^\/api\/clans\/([a-z0-9]{4,16})$/);
    if (lookup && request.method === 'GET') {
      const clans = await readList(env, CLANS_KEY);
      const clan = clans.find((c) => c.code === lookup[1]);
      if (!clan) return json({ error: 'Not found' }, 404);
      return json({ name: clan.name });
    }

    // Deleting a clan, from the public leaderboard's hover action. Keyed by the clan's
    // UUID id (already public in every list response) rather than its referral code, so
    // this never has to expose the code. Admin-passcode gated like every other delete.
    const clanId = path.match(/^\/api\/clans\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
    if (clanId && request.method === 'DELETE') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const clans = await readList(env, CLANS_KEY);
      const next = clans.filter((c) => c.id !== clanId[1]);
      if (next.length === clans.length) return json({ error: 'Not found' }, 404);
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(next));
      return empty(204);
    }

    // Joining with an existing fomo username. Open to anyone; the only gate is the rate limit.
    const join = path.match(/^\/api\/clans\/([a-z0-9]{4,16})\/join$/);
    if (join && request.method === 'POST') {
      const text = await request.text();
      if (text.length > 512) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const username = cleanUsername(body && body.username);
      if (!username) return json({ error: 'Enter a valid fomo username' }, 400);
      const email = String((body && body.email) || '').trim().toLowerCase();
      if (email.length > 120 || !EMAIL_RE.test(email)) return json({ error: 'Enter a valid email' }, 400);
      if (await tooMany(env, 'join', ipOf(request), MAX_ADDS_PER_MINUTE)) return json({ error: 'Too many attempts — try again in a minute' }, 429);

      const clans = await readList(env, CLANS_KEY);
      const clan = clans.find((c) => c.code === join[1]);
      if (!clan) return json({ error: 'That invite link is no longer valid' }, 404);

      clan.members = clan.members || [];
      if (clan.members.some((m) => m.username.toLowerCase() === username.toLowerCase())) {
        return json({ error: 'That username already joined this clan' }, 409);
      }
      clan.members.push({ username, email, joinedAt: new Date().toISOString(), status: 'pending' });
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({ name: clan.name, members: clan.members.length }, 201);
    }

    if (path === '/api/flights' || path === '/api/auth' || path === '/api/clans' || path === '/api/clans/internal' || path === '/api/clans/internal/approve' || path === '/api/clans/seed' || lookup || join || clanId || del) {
      return json({ error: 'Method not allowed' }, 405);
    }
    return json({ error: 'Not found' }, 404);
  },
};
