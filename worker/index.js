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
  americanu: 'American University', appstate: 'Appalachian State University',
  asu: 'Arizona State University', auburn: 'Auburn University', ballstate: 'Ball State University',
  baylor: 'Baylor University', binghamton: 'Binghamton University', boisestate: 'Boise State University',
  bc: 'Boston College', bu: 'Boston University', bgsu: 'Bowling Green State University',
  bradley: 'Bradley University', byu: 'Brigham Young University', brown: 'Brown University',
  bucknell: 'Bucknell University', butler: 'Butler University', calpoly: 'Cal Poly San Luis Obispo',
  csuf: 'Cal State Fullerton', csulb: 'Cal State Long Beach', cmu: 'Carnegie Mellon University',
  cwru: 'Case Western Reserve University', centralmich: 'Central Michigan University', chico: 'Chico State',
  clarkson: 'Clarkson University', clemson: 'Clemson University', coastal: 'Coastal Carolina University',
  charleston: 'College of Charleston', colostate: 'Colorado State University',
  csupueblo: 'Colorado State University Pueblo', columbia: 'Columbia University',
  cornell: 'Cornell University', creighton: 'Creighton University', dartmouth: 'Dartmouth College',
  depaul: 'DePaul University', drake: 'Drake University', drexel: 'Drexel University',
  duke: 'Duke University', duquesne: 'Duquesne University', ecu: 'East Carolina University',
  etsu: 'East Tennessee State University', emu: 'Eastern Michigan University', elon: 'Elon University',
  emory: 'Emory University', fairfield: 'Fairfield University', fau: 'Florida Atlantic University',
  fgcu: 'Florida Gulf Coast University', fiu: 'Florida International University',
  fsu: 'Florida State University', fresnostate: 'Fresno State', furman: 'Furman University',
  gmu: 'George Mason University', gwu: 'George Washington University', georgetown: 'Georgetown University',
  gsu: 'Georgia Southern University', georgiastate: 'Georgia State University', gt: 'Georgia Tech',
  gvsu: 'Grand Valley State University', harvard: 'Harvard University', highpoint: 'High Point University',
  hofstra: 'Hofstra University', illinoisstate: 'Illinois State University',
  indianastate: 'Indiana State University', iu: 'Indiana University', iowastate: 'Iowa State University',
  jsu: 'Jacksonville State University', jmu: 'James Madison University', kstate: 'Kansas State University',
  kennesaw: 'Kennesaw State University', kent: 'Kent State University', lafayette: 'Lafayette College',
  lamar: 'Lamar University', lemoyne: 'Le Moyne College', lehigh: 'Lehigh University',
  lsu: 'Louisiana State University', latech: 'Louisiana Tech University', lmu: 'Loyola Marymount University',
  loyolachicago: 'Loyola University Chicago', marist: 'Marist College', marquette: 'Marquette University',
  mercer: 'Mercer University', metrostate: 'Metropolitan State University of Denver',
  miamiohio: 'Miami University (Ohio)', msu: 'Michigan State University',
  mtsu: 'Middle Tennessee State University', msstate: 'Mississippi State University',
  missouristate: 'Missouri State University', monmouth: 'Monmouth University',
  ncstate: 'NC State University', nmsu: 'New Mexico State University', nyu: 'New York University',
  ndsu: 'North Dakota State University', northeastern: 'Northeastern University',
  arizonanorthern: 'Northern Arizona University', niu: 'Northern Illinois University',
  northwestern: 'Northwestern University', oakland: 'Oakland University', osu: 'Ohio State University',
  ohiou: 'Ohio University', okstate: 'Oklahoma State University', odu: 'Old Dominion University',
  oregonstate: 'Oregon State University', pennstate: 'Penn State University',
  pepperdine: 'Pepperdine University', portlandstate: 'Portland State University',
  princeton: 'Princeton University', providence: 'Providence College', purdue: 'Purdue University',
  quinnipiac: 'Quinnipiac University', radford: 'Radford University', rice: 'Rice University',
  rider: 'Rider University', rit: 'Rochester Institute of Technology', rollins: 'Rollins College',
  rowan: 'Rowan University', rutgers: 'Rutgers University', stlouis: 'Saint Louis University',
  salisbury: 'Salisbury University', sdsu: 'San Diego State University', sjsu: 'San Jose State University',
  santaclara: 'Santa Clara University', seton: 'Seton Hall University', siena: 'Siena College',
  sdstate: 'South Dakota State University', siu: 'Southern Illinois University',
  smu: 'Southern Methodist University', stjohns: "St. John's University", stanford: 'Stanford University',
  stetson: 'Stetson University', stonybrook: 'Stony Brook University', syracuse: 'Syracuse University',
  temple: 'Temple University', tamu: 'Texas A&M University', tamucc: 'Texas A&M–Corpus Christi',
  tcu: 'Texas Christian University', texasstate: 'Texas State University',
  techtexas: 'Texas Tech University', tcnj: 'The College of New Jersey', towson: 'Towson University',
  troy: 'Troy University', tulane: 'Tulane University', cal: 'UC Berkeley', ucdavis: 'UC Davis',
  uci: 'UC Irvine', ucr: 'UC Riverside', ucsd: 'UC San Diego', ucsb: 'UC Santa Barbara',
  ucsc: 'UC Santa Cruz', ucla: 'UCLA', unc: 'UNC Chapel Hill', uncc: 'UNC Charlotte', uncw: 'UNC Wilmington',
  utc: 'UT Chattanooga', utd: 'UT Dallas', utsa: 'UT San Antonio', albany: 'University at Albany',
  buffalo: 'University at Buffalo', akron: 'University of Akron', ala: 'University of Alabama',
  uab: 'University of Alabama at Birmingham', ua: 'University of Arizona',
  arkansas: 'University of Arkansas', ucf: 'University of Central Florida',
  uchicago: 'University of Chicago', cincinnati: 'University of Cincinnati',
  cu: 'University of Colorado Boulder', uccs: 'University of Colorado Colorado Springs',
  uconn: 'University of Connecticut', daytonoh: 'University of Dayton', delaware: 'University of Delaware',
  denver: 'University of Denver', uf: 'University of Florida', uga: 'University of Georgia',
  hawaii: 'University of Hawaii', houston: 'University of Houston', idaho: 'University of Idaho',
  illinois: 'University of Illinois', iowa: 'University of Iowa', kansas: 'University of Kansas',
  uk: 'University of Kentucky', ull: 'University of Louisiana at Lafayette',
  louisville: 'University of Louisville', maine: 'University of Maine', maryland: 'University of Maryland',
  umass: 'University of Massachusetts Amherst', memphis: 'University of Memphis',
  miami: 'University of Miami', michigan: 'University of Michigan', minnesota: 'University of Minnesota',
  olemiss: 'University of Mississippi', mizzou: 'University of Missouri',
  kansascity: 'University of Missouri–Kansas City', montana: 'University of Montana',
  nebraska: 'University of Nebraska', unlv: 'University of Nevada, Las Vegas',
  nevada: 'University of Nevada, Reno', unh: 'University of New Hampshire',
  newmexico: 'University of New Mexico', northdakota: 'University of North Dakota',
  unt: 'University of North Texas', uni: 'University of Northern Iowa',
  notredame: 'University of Notre Dame', ou: 'University of Oklahoma', oregon: 'University of Oregon',
  penn: 'University of Pennsylvania', pitt: 'University of Pittsburgh', urhode: 'University of Rhode Island',
  usfca: 'University of San Francisco', scranton: 'University of Scranton',
  southalabama: 'University of South Alabama', sc: 'University of South Carolina',
  usouthdakota: 'University of South Dakota', usf: 'University of South Florida',
  usc: 'University of Southern California', southernmiss: 'University of Southern Mississippi',
  tampa: 'University of Tampa', tennessee: 'University of Tennessee',
  utaustin: 'University of Texas at Austin', toledo: 'University of Toledo', utah: 'University of Utah',
  uvm: 'University of Vermont', uva: 'University of Virginia', uw: 'University of Washington',
  wisconsin: 'University of Wisconsin–Madison', wyoming: 'University of Wyoming',
  utahstate: 'Utah State University', uvu: 'Utah Valley University', valpo: 'Valparaiso University',
  vanderbilt: 'Vanderbilt University', villanova: 'Villanova University',
  vcu: 'Virginia Commonwealth University', vt: 'Virginia Tech', wakeforest: 'Wake Forest University',
  wsu: 'Washington State University', wustl: 'Washington University in St. Louis',
  wayne: 'Wayne State University', weber: 'Weber State University', westchester: 'West Chester University',
  wvu: 'West Virginia University', wku: 'Western Kentucky University', wmu: 'Western Michigan University',
  winthrop: 'Winthrop University', xavier: 'Xavier University', yale: 'Yale University',
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
  const role = clean(body.role);
  const instagram = clean(body.instagram).replace(/^@/, '').toLowerCase();
  const nameRe = /^[\p{L}][\p{L} .'-]{0,39}$/u;

  if (!nameRe.test(firstName)) return { error: 'Enter your first name' };
  if (!nameRe.test(lastName)) return { error: 'Enter your last name' };
  if (email.length > 120 || !EMAIL_RE.test(email)) return { error: 'Enter a valid email' };
  const digits = phoneRaw.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) return { error: 'Enter a valid phone number' };
  if (!/^[\p{L}][\p{L} /&.'-]{1,39}$/u.test(role)) return { error: 'Enter your role in the chapter' };
  if (!/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return { error: 'Enter a valid Instagram handle' };

  return { contact: { firstName, lastName, email, phone: phoneRaw.slice(0, 24), role, instagram } };
}

// Clan artwork. Kept in its own KV entry per clan so the leaderboard read
// (one JSON blob of every clan) stays small and fast.
const MEDIA_KEY = (id) => `clanmedia:${id}`;
// Outreach log per chapter, kept out of the main clans blob so the public
// leaderboard read stays small. The clan record only carries lastContact.
const NOTES_KEY = (id) => `clannotes:${id}`;
const MAX_NOTES = 200;
const MAX_IMAGE_BYTES = 400 * 1024;
function parseDataUrl(value) {
  const v = String(value || '');
  if (!v) return null;
  const m = v.match(/^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/);
  if (!m) return { error: 'Unsupported image' };
  if (m[2].length > MAX_IMAGE_BYTES) return { error: 'Image is too large' };
  return { mime: m[1], data: m[2] };
}

// Optional: the chapter that referred this one. All three parts are required
// together — a half-filled referral is rejected rather than silently dropped.
function parseReferral(body) {
  const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
  const school = clean(body.refSchool).toLowerCase();
  const chapterRaw = clean(body.refChapter);
  const instagram = clean(body.refInstagram).replace(/^@/, '').toLowerCase();

  if (!school && !chapterRaw && !instagram) return { referredBy: null };

  if (!SCHOOL_LABELS[school]) return { error: 'Pick the school of the chapter that referred you' };
  const canonical = ORG_LOOKUP[normOrg(chapterRaw)];
  if (!canonical) return { error: 'Pick the chapter that referred you from the list' };
  if (!/^[A-Za-z0-9._]{1,30}$/.test(instagram)) return { error: 'Enter the Instagram of who referred you' };

  return { referredBy: { school, schoolLabel: SCHOOL_LABELS[school], chapterName: canonical, instagram } };
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
  // Self-reported, free text, optional — "N/A" is a perfectly fine answer.
  const trader = (v) => String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, 60);
  const bestTrader = trader(body.bestTrader);
  const worstTrader = trader(body.worstTrader);

  const name = `${chapterName} — ${SCHOOL_LABELS[school]}`;
  return { clan: { school, schoolLabel: SCHOOL_LABELS[school], chapterName, name, chapterSize, bestTrader, worstTrader } };
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
  hasAvatar: !!(c.media && c.media.avatar),
  hasBanner: !!(c.media && c.media.banner),
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
      if (text.length > 900 * 1024) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const person = parseContact(body || {});
      if (person.error) return json({ error: person.error }, 400);
      const ref = parseReferral(body || {});
      if (ref.error) return json({ error: ref.error }, 400);
      const parsed = parseClan(body || {});
      if (parsed.error) return json({ error: parsed.error }, 400);
      if (await tooMany(env, 'clan', ipOf(request), 5)) return json({ error: 'Too many clans created — try again in a minute' }, 429);

      const clans = await readList(env, CLANS_KEY);
      if (clans.length >= MAX_CLANS) return json({ error: 'Clan limit reached' }, 409);
      if (clans.some((c) => c.school === parsed.clan.school && c.chapterName.toLowerCase() === parsed.clan.chapterName.toLowerCase())) {
        return json({ error: 'That chapter is already registered' }, 409);
      }

      const avatar = parseDataUrl(body.avatar);
      if (avatar && avatar.error) return json({ error: avatar.error }, 400);
      const banner = parseDataUrl(body.banner);
      if (banner && banner.error) return json({ error: banner.error }, 400);

      let code;
      do { code = randomCode(); } while (clans.some((c) => c.code === code));

      const id = crypto.randomUUID();
      const clan = {
        id, code,
        school: parsed.clan.school, schoolLabel: parsed.clan.schoolLabel, chapterName: parsed.clan.chapterName,
        name: parsed.clan.name, chapterSize: parsed.clan.chapterSize,
        bestTrader: parsed.clan.bestTrader, worstTrader: parsed.clan.worstTrader,
        contact: person.contact,
        referredBy: ref.referredBy,
        media: { avatar: !!avatar, banner: !!banner },
        members: [], createdAt: new Date().toISOString(),
      };
      if (avatar || banner) {
        await env.FLIGHTS.put(MEDIA_KEY(id), JSON.stringify({ avatar: avatar || null, banner: banner || null }));
      }
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
            // Whether the fomo username and email actually match an account can only
            // be answered by the fomo app. Until that check exists, everyone reads as
            // verified — flip this once there's a real lookup to call.
            verified: m.verified !== false,
          });
        });
      });
      rows.sort((a, b) => (a.joinedAt < b.joinedAt ? 1 : -1));

      // Who registered each chapter. Only ever served here, behind the passcode.
      const chapters = clans
        .filter((c) => c.contact)
        .map((c) => ({
          id: c.id, code: c.code, chapterName: c.chapterName, school: c.schoolLabel,
          firstName: c.contact.firstName, lastName: c.contact.lastName,
          email: c.contact.email, phone: c.contact.phone,
          role: c.contact.role || '', instagram: c.contact.instagram || '',
          bestTrader: c.bestTrader || '', worstTrader: c.worstTrader || '',
          referredBy: c.referredBy || null,
          paidOut: c.paidOut || null,
          lastContact: c.lastContact || null, noteCount: c.noteCount || 0,
          referralUrl: `${url.origin}/fomo/referral/${c.code}`,
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

    // Marks a chapter as paid out. Admin-only bookkeeping — it never reaches the
    // public board, it's just so the roster remembers who's already been paid.
    if (path === '/api/clans/internal/payout' && request.method === 'POST') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const text = await request.text();
      if (text.length > 1024) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const id = String((body && body.id) || '');
      const paid = body && body.paid === true;
      const clans = await readList(env, CLANS_KEY);
      const clan = clans.find((c) => c.id === id);
      if (!clan) return json({ error: 'Not found' }, 404);
      clan.paidOut = paid ? new Date().toISOString() : null;
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({ id, paidOut: clan.paidOut });
    }

    // Outreach log for a chapter. Admin-only — it holds what was said to whom.
    const notesReq = path.match(/^\/api\/clans\/internal\/notes\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/);
    if (notesReq) {
      const denied = await guard(request, env);
      if (denied) return denied;
      const id = notesReq[1];

      if (request.method === 'GET') {
        const notes = (await env.FLIGHTS.get(NOTES_KEY(id), 'json')) || [];
        return json({ notes });
      }

      if (request.method === 'POST' || request.method === 'DELETE') {
        const text = await request.text();
        if (text.length > 4096) return json({ error: 'Request too large' }, 413);
        let body;
        try { body = JSON.parse(text || '{}'); } catch { return json({ error: 'Invalid JSON' }, 400); }

        const clans = await readList(env, CLANS_KEY);
        const clan = clans.find((c) => c.id === id);
        if (!clan) return json({ error: 'Not found' }, 404);

        let notes = (await env.FLIGHTS.get(NOTES_KEY(id), 'json')) || [];

        if (request.method === 'POST') {
          const note = String(body.text || '').trim().slice(0, 1000);
          if (!note) return json({ error: 'Write something first' }, 400);
          const channel = ['call', 'text', 'email', 'dm', 'note'].includes(body.channel) ? body.channel : 'note';
          notes.unshift({ at: new Date().toISOString(), text: note, channel });
          notes = notes.slice(0, MAX_NOTES);
        } else {
          const at = String(body.at || '');
          notes = notes.filter((n) => n.at !== at);
        }

        await env.FLIGHTS.put(NOTES_KEY(id), JSON.stringify(notes));
        clan.lastContact = notes.length ? notes[0].at : null;
        clan.noteCount = notes.length;
        await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
        return json({ notes, lastContact: clan.lastContact });
      }
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

      // replace: wipe every clan and its artwork first, so an import is a clean slate.
      let cleared = 0;
      if (body.replace === true) {
        const existing = await readList(env, CLANS_KEY);
        cleared = existing.length;
        const media = await env.FLIGHTS.list({ prefix: 'clanmedia:' });
        for (const k of media.keys) await env.FLIGHTS.delete(k.name);
        await env.FLIGHTS.put(CLANS_KEY, JSON.stringify([]));
      }

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
        // Contact is optional on import; when present it lands in the admin roster only.
        let contact = null;
        if (raw.firstName || raw.email) {
          const person = parseContact(raw);
          if (person.error) { errors.push({ input: raw.chapterName, error: person.error }); continue; }
          contact = person.contact;
        }

        const existing = clans.find((c) => c.school === parsed.clan.school && c.chapterName.toLowerCase() === parsed.clan.chapterName.toLowerCase());
        if (existing) {
          existing.chapterSize = parsed.clan.chapterSize;
          existing.seedApproved = seedApproved;
          existing.bestTrader = parsed.clan.bestTrader;
          existing.worstTrader = parsed.clan.worstTrader;
          if (contact) existing.contact = contact;
          updated++;
        } else {
          if (clans.length >= MAX_CLANS) { errors.push({ input: raw, error: 'Clan limit reached' }); continue; }
          let code;
          do { code = randomCode(); } while (clans.some((c) => c.code === code));
          clans.push({
            id: crypto.randomUUID(), code,
            school: parsed.clan.school, schoolLabel: parsed.clan.schoolLabel, chapterName: parsed.clan.chapterName,
            name: parsed.clan.name, chapterSize: parsed.clan.chapterSize, seedApproved,
            bestTrader: parsed.clan.bestTrader, worstTrader: parsed.clan.worstTrader,
            contact, media: { avatar: false, banner: false },
            members: [], createdAt: raw.registeredAt || new Date().toISOString(),
          });
          created++;
        }
      }
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({ cleared, created, updated, errors });
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

    // Clan artwork, served from its own KV entry. Public: it's the picture the
    // chapter chose to show on the board.
    const mediaReq = path.match(/^\/api\/clans\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\/(avatar|banner)$/);
    if (mediaReq && request.method === 'GET') {
      const stored = await env.FLIGHTS.get(MEDIA_KEY(mediaReq[1]), 'json');
      const pic = stored && stored[mediaReq[2]];
      if (!pic) return json({ error: 'Not found' }, 404);
      const bytes = Uint8Array.from(atob(pic.data), (ch) => ch.charCodeAt(0));
      return new Response(bytes, {
        headers: { 'content-type': pic.mime, 'cache-control': 'public, max-age=86400' },
      });
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
      await env.FLIGHTS.delete(MEDIA_KEY(clanId[1]));
      await env.FLIGHTS.delete(NOTES_KEY(clanId[1]));
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

    if (path === '/api/flights' || path === '/api/auth' || path === '/api/clans' || path === '/api/clans/internal' || path === '/api/clans/internal/approve' || path === '/api/clans/internal/payout' || path === '/api/clans/seed' || lookup || join || clanId || mediaReq || notesReq || del) {
      return json({ error: 'Method not allowed' }, 405);
    }
    return json({ error: 'Not found' }, 404);
  },
};
