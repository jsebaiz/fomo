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

// ---------------------------------------------------------------------------
// ACCOUNTS
//
// Chapter contacts and campus ambassadors get a login so they can watch their
// own progress. Everything here is written defensively because these records
// sit next to real students' names, emails and phone numbers.
//
//  · Passwords are PBKDF2-SHA256 over a per-account 16-byte random salt.
//    Workers has no bcrypt/argon2, and PBKDF2 is the WebCrypto primitive
//    Cloudflare supports. The iteration count is a deliberate trade: high
//    enough to be worth something, low enough to stay inside a Worker's CPU
//    budget. Raise it if the plan allows.
//  · Sessions are server-side. The cookie carries nothing but a random token;
//    revoking is a KV delete, so logout is real rather than cosmetic.
//  · Nothing in this file ever returns a hash, a salt or a claim code to a
//    caller who didn't already have it.
// ---------------------------------------------------------------------------
const SUBS_KEY = 'bountysubs';
const MAX_SUBS = 5000;
const MAX_UPLOAD_BYTES = 420 * 1024;   // KV holds the small stuff; video goes by link
const MAX_UPLOADS = 6;

// The pipeline a submission walks. "notsubmitted" is a browser-side state, so
// it never reaches here; everything stored has at least been sent.
const SUB_STATUSES = ['submitted', 'review', 'approved', 'awaiting_payout', 'paid', 'rejected'];

// A submitter is identified by their fomo handle plus their rewards code. The
// pair is the key for reading their own submissions back, so both are required
// and the code is compared in full.
function parsePayee(body) {
  const h = cleanHandle(body.fomoHandle, 'fomo', 30);
  if (h.error || h.value === NA) return { error: 'Add your fomo @ so the payout has somewhere to go' };
  const code = String(body.rewardsCode || '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{4,24}$/.test(code)) return { error: 'Rewards code looks wrong — letters, numbers and dashes, 4 to 24 characters' };
  return { payee: { fomoHandle: h.value, rewardsCode: code } };
}

function parseUploads(list) {
  if (!Array.isArray(list)) return { uploads: [] };
  if (list.length > MAX_UPLOADS) return { error: `Attach at most ${MAX_UPLOADS} files` };
  const out = [];
  for (const item of list) {
    const name = String((item && item.name) || 'file').slice(0, 120);
    const v = String((item && item.data) || '');
    const m = v.match(/^data:(image\/(?:jpeg|png|webp|heic)|video\/(?:mp4|quicktime|webm));base64,([A-Za-z0-9+/=]+)$/);
    if (!m) return { error: 'Only JPEG, PNG, WebP, HEIC, MP4, MOV or WebM files' };
    if (m[2].length > MAX_UPLOAD_BYTES) return { error: `"${name}" is too big to attach — paste a link to it instead` };
    out.push({ name, mime: m[1], data: m[2] });
  }
  return { uploads: out };
}

// The answers themselves. Every bounty hands back a list of short strings, an
// optional note and optional small files; we cap all three rather than trust
// whatever the form posted.
function parseSubmission(body) {
  const bountyId = String(body.bountyId || '').trim();
  if (!/^b[0-9]{2}$/.test(bountyId)) return { error: 'Unknown bounty' };
  const school = String(body.school || '').toLowerCase().trim();
  if (school && !SCHOOL_LABELS[school]) return { error: 'Unknown school' };

  const payee = parsePayee(body);
  if (payee.error) return { error: payee.error };

  const answers = Array.isArray(body.answers)
    ? body.answers.map((a) => String(a ?? '').trim().slice(0, 400)).filter(Boolean).slice(0, 40)
    : [];
  const note = String(body.note || '').trim().slice(0, 1200);
  const up = parseUploads(body.uploads);
  if (up.error) return { error: up.error };
  if (!answers.length && !note && !up.uploads.length) {
    return { error: 'Nothing to submit yet — fill the form in first' };
  }
  const amount = Number(body.amount);
  return {
    submission: {
      bountyId,
      bountyTitle: String(body.bountyTitle || '').slice(0, 120),
      school,
      schoolLabel: school ? SCHOOL_LABELS[school] : '',
      ...payee.payee,
      answers,
      note,
      uploads: up.uploads,
      amount: Number.isFinite(amount) && amount >= 0 && amount <= 100000 ? Math.round(amount) : 0,
    },
  };
}

// What the submitter is allowed to see of their own row: everything they sent,
// minus the file blobs, plus where it has got to.
const publicSub = (s) => ({
  id: s.id, bountyId: s.bountyId, bountyTitle: s.bountyTitle,
  school: s.school, schoolLabel: s.schoolLabel,
  amount: s.amount, status: s.status, answers: s.answers, note: s.note,
  files: (s.uploads || []).map((u) => u.name),
  createdAt: s.createdAt, updatedAt: s.updatedAt, history: s.history || [],
});

const PITCHES_KEY = 'bountypitches';
const MAX_PITCHES = 2000;
const EVENTS_KEY = 'bountyevents';
const MAX_EVENTS = 1000;
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

// A pitch is three free-text answers. We keep it short, strip the @ people type
// out of habit, and store nothing we were not handed.
function parsePitch(body) {
  const idea = String(body.idea || '').trim();
  if (idea.length < 15) return { error: 'Tell us a bit more about the bounty — 15 characters minimum' };
  if (idea.length > 1200) return { error: 'Keep the pitch under 1200 characters' };
  const handle = cleanHandle(body.instagram, 'Instagram', 30);
  if (handle.error) return { error: handle.error };
  if (!handle.value) return { error: 'Add your Instagram handle so we can reach you' };
  const schoolRaw = String(body.school || '').trim();
  if (!schoolRaw) return { error: 'Add your school' };
  if (schoolRaw.length > 80) return { error: 'School name is too long' };
  const code = SCHOOL_LABELS[schoolRaw.toLowerCase()] ? schoolRaw.toLowerCase() : '';
  return {
    pitch: {
      idea,
      instagram: handle.value,
      school: code,
      schoolLabel: code ? SCHOOL_LABELS[code] : schoolRaw,
    },
  };
}

// An event is a window on one campus plus the jobs it should light up.
function parseEvent(body) {
  const school = String(body.school || '').toLowerCase().trim();
  if (!SCHOOL_LABELS[school]) return { error: 'Unknown school code' };
  const name = String(body.name || '').trim();
  if (!name || name.length > 80) return { error: 'Event needs a name under 80 characters' };
  const starts = String(body.starts || '').trim();
  const ends = String(body.ends || '').trim();
  if (!ISO_DATE_RE.test(starts) || !ISO_DATE_RE.test(ends)) return { error: 'Dates must be YYYY-MM-DD' };
  if (ends < starts) return { error: 'Event ends before it starts' };
  const jobs = Array.isArray(body.jobs) ? body.jobs.map((j) => String(j).trim()).filter(Boolean).slice(0, 12) : [];
  if (!jobs.length) return { error: 'List at least one job id this event lights up' };
  const boost = Number(body.boost);
  if (!Number.isFinite(boost) || boost < 1 || boost > 2) return { error: 'Boost must be between 1 and 2' };
  const note = String(body.note || '').trim().slice(0, 160);
  return { event: { school, schoolLabel: SCHOOL_LABELS[school], name, starts, ends, jobs, boost: Math.round(boost * 100) / 100, note } };
}

const ACCOUNTS_KEY = 'accounts';
const MAX_ACCOUNTS = 5000;
const SESS_KEY = (t) => `sess:${t}`;
const SESSION_DAYS = 30;
const PBKDF2_ITER = 100000;
const CLAIM_DAYS = 14;

const b64 = (bytes) => btoa(String.fromCharCode(...bytes));
const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

async function derive(password, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITER, hash: 'SHA-256' }, key, 256);
  return new Uint8Array(bits);
}
async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return { salt: b64(salt), hash: b64(await derive(password, salt)) };
}
async function verifyPassword(password, saltB64, hashB64) {
  let want;
  try { want = unb64(hashB64); } catch { return false; }
  const got = await derive(password, unb64(saltB64));
  if (got.length !== want.length) return false;
  return crypto.subtle.timingSafeEqual(got, want);
}

// Passwords here protect a dashboard, not a bank, but these are adults being
// sent money — a four-character password shouldn't be allowed.
function checkPassword(pw) {
  const p = String(pw ?? '');
  if (p.length < 10) return 'Password must be at least 10 characters';
  if (p.length > 200) return 'Password is too long';
  if (!/[a-zA-Z]/.test(p) || !/[0-9]/.test(p)) return 'Password needs at least one letter and one number';
  return null;
}

function newToken() {
  const b = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...b)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
const sessionCookie = (token) =>
  `fomo_sess=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_DAYS * 86400}`;
const clearedCookie = 'fomo_sess=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0';

function readCookie(request, name) {
  const raw = request.headers.get('cookie') || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]*)'));
  return m ? m[1] : '';
}
async function currentSession(request, env) {
  const token = readCookie(request, 'fomo_sess');
  if (!token || !/^[A-Za-z0-9_-]{16,64}$/.test(token)) return null;
  const sess = await env.FLIGHTS.get(SESS_KEY(token), 'json');
  if (!sess) return null;
  const accounts = await readList(env, ACCOUNTS_KEY);
  const account = accounts.find((a) => a.id === sess.accountId);
  return account ? { account, token, accounts } : null;
}
// What an account is ever allowed to see about itself. Salt and hash are not
// in this list and must never be.
const publicAccount = (a) => ({
  id: a.id, kind: a.kind, email: a.email,
  firstName: a.firstName, lastName: a.lastName,
  school: a.school || null, schoolLabel: a.schoolLabel || null,
  chapterId: a.chapterId || null, refCode: a.refCode,
  status: a.status || 'active', createdAt: a.createdAt,
});
const jsonCookie = (data, cookie, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'set-cookie': cookie },
  });

async function makeAccount(env, accounts, fields) {
  const { salt, hash } = await hashPassword(fields.password);
  let refCode;
  do { refCode = randomCode(8); }
  while (accounts.some((a) => a.refCode === refCode));
  const account = {
    id: crypto.randomUUID(), kind: fields.kind, email: fields.email,
    firstName: fields.firstName, lastName: fields.lastName,
    chapterId: fields.chapterId || null,
    school: fields.school || null, schoolLabel: fields.schoolLabel || null,
    refCode, salt, hash, status: fields.status || 'active',
    createdAt: new Date().toISOString(), lastLogin: null,
  };
  accounts.push(account);
  return account;
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
    if (ref) return redirect(`/registration/?ref=${ref[1]}`);

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

      // A password on the form means "make me a login". It stays optional so a
      // registration can still succeed if the account step fails validation.
      const wantsAccount = typeof body.password === 'string' && body.password.length > 0;
      const accounts = await readList(env, ACCOUNTS_KEY);
      if (wantsAccount) {
        const pwErr = checkPassword(body.password);
        if (pwErr) return json({ error: pwErr }, 400);
        if (accounts.length >= MAX_ACCOUNTS) return json({ error: 'Account limit reached' }, 409);
        if (accounts.some((a) => a.email === person.contact.email)) {
          return json({ error: 'An account already uses that email — sign in instead' }, 409);
        }
      }
      // Credit the ambassador whose link this registration came through.
      const ambRaw = String(body.ambCode || '').trim().toLowerCase();
      const ambCode = /^[a-z0-9]{8}$/.test(ambRaw) && accounts.some((a) => a.kind === 'ambassador' && a.refCode === ambRaw)
        ? ambRaw : null;

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
        ambCode,
        media: { avatar: !!avatar, banner: !!banner },
        members: [], createdAt: new Date().toISOString(),
      };
      if (avatar || banner) {
        await env.FLIGHTS.put(MEDIA_KEY(id), JSON.stringify({ avatar: avatar || null, banner: banner || null }));
      }
      clans.push(clan);
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));

      let cookie = null;
      if (wantsAccount) {
        const account = await makeAccount(env, accounts, {
          kind: 'chapter', email: person.contact.email,
          firstName: person.contact.firstName, lastName: person.contact.lastName,
          chapterId: id, school: parsed.clan.school, schoolLabel: parsed.clan.schoolLabel,
          password: body.password,
        });
        await env.FLIGHTS.put(ACCOUNTS_KEY, JSON.stringify(accounts));
        const token = newToken();
        await env.FLIGHTS.put(SESS_KEY(token), JSON.stringify({ accountId: account.id, at: Date.now() }),
          { expirationTtl: SESSION_DAYS * 86400 });
        cookie = sessionCookie(token);
      }
      const payload = { clan: { ...publicClan(clan, 0), code, referralUrl: `${url.origin}/fomo/referral/${code}` }, account: wantsAccount };
      return cookie ? jsonCookie(payload, cookie, 201) : json(payload, 201);
    }

    // Flat roster of every join across every clan, for manually crediting people who
    // already have fomo and submitted a username without going through a specific
    // referral link. Admin-passcode gated — usernames never appear anywhere public.
    if (path === '/api/clans/internal' && request.method === 'GET') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const clans = await readList(env, CLANS_KEY);

      // First time we observe a chapter at/over its goal, stamp it. Approximate
      // (it's first-seen-at-goal, not the exact crossing) but it's what makes
      // "contacted since hitting goal" answerable at all.
      let stamped = false;
      clans.forEach((c) => {
        const atGoal = c.chapterSize && totalApproved(c) >= 0.8 * c.chapterSize;
        if (atGoal && !c.goalHitAt) { c.goalHitAt = new Date().toISOString(); stamped = true; }
        if (!atGoal && c.goalHitAt) { c.goalHitAt = null; stamped = true; }
      });
      if (stamped) await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));

      const rows = [];
      clans.forEach((c) => {
        (c.members || []).forEach((m) => {
          rows.push({
            code: c.code, username: m.username, email: m.email || '', joinedAt: m.joinedAt,
            school: c.schoolLabel, chapterName: c.chapterName,
            name: [m.firstName, m.lastName].filter(Boolean).join(' '),
            instagram: m.instagram || '',
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
          goalHitAt: c.goalHitAt || null, continuation: c.continuation || null,
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

    // Whether a chapter is continuing the program. Set by a human — the portal
    // only ever *suggests* a read of the log, it never decides this on its own.
    if (path === '/api/clans/internal/continuation' && request.method === 'POST') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const text = await request.text();
      if (text.length > 1024) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const allowed = ['continuing', 'at-risk', 'dropped'];
      const value = allowed.includes(body.continuation) ? body.continuation : null;
      const clans = await readList(env, CLANS_KEY);
      const clan = clans.find((c) => c.id === String(body.id || ''));
      if (!clan) return json({ error: 'Not found' }, 404);
      clan.continuation = value;
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({ id: clan.id, continuation: value });
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
      const members = totalApproved(clan);
      const size = clan.chapterSize || null;
      return json({
        ...publicClan(clan, members),
        goal: size ? Math.ceil(0.8 * size) : null,
        pending: (clan.members || []).filter((m) => m.status !== 'approved').length,
        referralUrl: `${url.origin}/fomo/referral/${clan.code}`,
      });
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
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body;
      try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const username = cleanUsername(body && body.username);
      if (!username) return json({ error: 'Enter a valid fomo username' }, 400);
      const email = String((body && body.email) || '').trim().toLowerCase();
      if (email.length > 120 || !EMAIL_RE.test(email)) return json({ error: 'Enter a valid email' }, 400);
      if (await tooMany(env, 'join', ipOf(request), MAX_ADDS_PER_MINUTE)) return json({ error: 'Too many attempts — try again in a minute' }, 429);

      const clans = await readList(env, CLANS_KEY);
      const clan = clans.find((c) => c.code === join[1]);
      if (!clan) return json({ error: 'That chapter link is no longer valid' }, 404);

      clan.members = clan.members || [];
      if (clan.members.some((m) => m.username.toLowerCase() === username.toLowerCase())) {
        return json({ error: 'That username already joined this chapter' }, 409);
      }
      const opt = (v, re, max) => {
        const x = String(v ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
        return x && re.test(x) ? x : '';
      };
      const member = {
        username, email, joinedAt: new Date().toISOString(), status: 'pending',
        firstName: opt(body.firstName, /^[\p{L}][\p{L} .'-]{0,39}$/u, 40),
        lastName: opt(body.lastName, /^[\p{L}][\p{L} .'-]{0,39}$/u, 40),
        instagram: opt(String(body.instagram ?? '').replace(/^@/, ''), /^[A-Za-z0-9._]{1,30}$/, 30).toLowerCase(),
      };
      Object.keys(member).forEach((k) => { if (member[k] === '') delete member[k]; });
      clan.members.push(member);
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({
        name: clan.name, chapterName: clan.chapterName, schoolLabel: clan.schoolLabel,
        members: totalApproved(clan), chapterSize: clan.chapterSize || null,
        referralUrl: `${url.origin}/fomo/referral/${clan.code}`,
      }, 201);
    }

    // ---------------- Accounts ----------------
    // Sign in. The error text is identical whether the email is unknown or the
    // password is wrong — a different message for each would turn this into an
    // endpoint for checking which chapter contacts have registered.
    if (path === '/api/account/login' && request.method === 'POST') {
      if (await tooMany(env, 'login', ipOf(request), 10)) return json({ error: 'Too many attempts — try again in a minute' }, 429);
      const text = await request.text();
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const email = String((body && body.email) || '').trim().toLowerCase();
      const password = String((body && body.password) || '');
      const accounts = await readList(env, ACCOUNTS_KEY);
      const account = accounts.find((a) => a.email === email);
      const ok = account ? await verifyPassword(password, account.salt, account.hash) : false;
      if (!ok) return json({ error: 'Wrong email or password' }, 401);

      account.lastLogin = new Date().toISOString();
      await env.FLIGHTS.put(ACCOUNTS_KEY, JSON.stringify(accounts));
      const token = newToken();
      await env.FLIGHTS.put(SESS_KEY(token), JSON.stringify({ accountId: account.id, at: Date.now() }),
        { expirationTtl: SESSION_DAYS * 86400 });
      return jsonCookie({ account: publicAccount(account) }, sessionCookie(token));
    }

    if (path === '/api/account/logout' && request.method === 'POST') {
      const token = readCookie(request, 'fomo_sess');
      if (token && /^[A-Za-z0-9_-]{16,64}$/.test(token)) await env.FLIGHTS.delete(SESS_KEY(token));
      return jsonCookie({ ok: true }, clearedCookie);
    }

    // A chapter contact who registered before logins existed claims their
    // account with a one-time code the fomo team hands them directly. There is
    // no email delivery here, so a self-serve reset would just be an open door.
    if (path === '/api/account/claim' && request.method === 'POST') {
      if (await tooMany(env, 'claim', ipOf(request), 5)) return json({ error: 'Too many attempts — try again in a minute' }, 429);
      const text = await request.text();
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const code = String((body && body.code) || '').trim().toLowerCase();
      const password = String((body && body.password) || '');
      const pwErr = checkPassword(password);
      if (pwErr) return json({ error: pwErr }, 400);
      if (!/^[a-z0-9]{10}$/.test(code)) return json({ error: 'That code is not valid' }, 400);

      const clans = await readList(env, CLANS_KEY);
      const clan = clans.find((c) => c.claimCode === code);
      if (!clan || !clan.contact) return json({ error: 'That code is not valid' }, 400);
      if (clan.claimExpires && Date.parse(clan.claimExpires) < Date.now()) return json({ error: 'That code has expired — ask for a new one' }, 400);

      const accounts = await readList(env, ACCOUNTS_KEY);
      if (accounts.length >= MAX_ACCOUNTS) return json({ error: 'Account limit reached' }, 409);
      if (accounts.some((a) => a.chapterId === clan.id)) return json({ error: 'This chapter already has an account' }, 409);
      if (accounts.some((a) => a.email === clan.contact.email)) return json({ error: 'An account already uses that email' }, 409);

      const account = await makeAccount(env, accounts, {
        kind: 'chapter', email: clan.contact.email,
        firstName: clan.contact.firstName, lastName: clan.contact.lastName,
        chapterId: clan.id, school: clan.school, schoolLabel: clan.schoolLabel, password,
      });
      // One-time: burn the code so a screenshot of it is worthless afterwards.
      clan.claimCode = null; clan.claimExpires = null;
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      await env.FLIGHTS.put(ACCOUNTS_KEY, JSON.stringify(accounts));

      const token = newToken();
      await env.FLIGHTS.put(SESS_KEY(token), JSON.stringify({ accountId: account.id, at: Date.now() }),
        { expirationTtl: SESSION_DAYS * 86400 });
      return jsonCookie({ account: publicAccount(account) }, sessionCookie(token), 201);
    }

    // Ambassador applications create an account immediately but land as
    // `pending` — the dashboard says so, and approval is a human step.
    if (path === '/api/account/ambassador' && request.method === 'POST') {
      if (await tooMany(env, 'ambapply', ipOf(request), 5)) return json({ error: 'Too many attempts — try again in a minute' }, 429);
      const text = await request.text();
      if (text.length > 4096) return json({ error: 'Request too large' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }

      const clean = (v) => String(v ?? '').trim().replace(/\s+/g, ' ');
      const firstName = clean(body.firstName), lastName = clean(body.lastName);
      const email = clean(body.email).toLowerCase();
      const school = clean(body.school).toLowerCase();
      const password = String(body.password || '');
      const nameRe = /^[\p{L}][\p{L} .'-]{0,39}$/u;
      if (!nameRe.test(firstName)) return json({ error: 'Enter your first name' }, 400);
      if (!nameRe.test(lastName)) return json({ error: 'Enter your last name' }, 400);
      if (email.length > 120 || !EMAIL_RE.test(email)) return json({ error: 'Enter a valid email' }, 400);
      if (!SCHOOL_LABELS[school]) return json({ error: 'Pick your school from the list' }, 400);
      const pwErr = checkPassword(password);
      if (pwErr) return json({ error: pwErr }, 400);

      const accounts = await readList(env, ACCOUNTS_KEY);
      if (accounts.length >= MAX_ACCOUNTS) return json({ error: 'Account limit reached' }, 409);
      if (accounts.some((a) => a.email === email)) return json({ error: 'An account already uses that email' }, 409);

      const account = await makeAccount(env, accounts, {
        kind: 'ambassador', email, firstName, lastName,
        school, schoolLabel: SCHOOL_LABELS[school], password, status: 'pending',
      });
      await env.FLIGHTS.put(ACCOUNTS_KEY, JSON.stringify(accounts));
      const token = newToken();
      await env.FLIGHTS.put(SESS_KEY(token), JSON.stringify({ accountId: account.id, at: Date.now() }),
        { expirationTtl: SESSION_DAYS * 86400 });
      return jsonCookie({ account: publicAccount(account) }, sessionCookie(token), 201);
    }

    // The dashboard payload. Scoped hard to the signed-in account: a chapter
    // sees its own clan and nothing else, an ambassador sees only the chapters
    // carrying their referral code.
    if (path === '/api/account/me' && request.method === 'GET') {
      const sess = await currentSession(request, env);
      if (!sess) return json({ error: 'Not signed in' }, 401);
      const a = sess.account;
      const out = { account: publicAccount(a), referralUrl: '', chapter: null, ambassador: null };

      if (a.kind === 'chapter') {
        const clans = await readList(env, CLANS_KEY);
        const clan = clans.find((c) => c.id === a.chapterId);
        if (!clan) return json({ error: 'Chapter not found' }, 404);
        const approved = approvedMembers(clan);
        out.referralUrl = `${url.origin}/fomo/referral/${clan.code}`;
        out.chapter = {
          chapterName: clan.chapterName, schoolLabel: clan.schoolLabel, school: clan.school,
          members: totalApproved(clan), chapterSize: clan.chapterSize || null,
          pending: (clan.members || []).filter((m) => m.status !== 'approved').length,
          recent: approved.slice(-8).reverse().map((m) => ({ username: m.username, joinedAt: m.joinedAt })),
          paidOut: clan.paidOut || null, createdAt: clan.createdAt,
        };
      } else {
        const clans = await readList(env, CLANS_KEY);
        const mine = clans.filter((c) => c.ambCode === a.refCode);
        out.referralUrl = `${url.origin}/fomo/clans/create/?amb=${a.refCode}`;
        out.ambassador = {
          school: a.school, schoolLabel: a.schoolLabel, status: a.status,
          signups: mine.reduce((s, c) => s + totalApproved(c), 0),
          chaptersBrought: mine.length,
          chapters: mine.map((c) => ({
            chapterName: c.chapterName, schoolLabel: c.schoolLabel, school: c.school,
            members: totalApproved(c), chapterSize: c.chapterSize || null,
          })).sort((x, y) => y.members - x.members),
        };
      }
      return json(out);
    }

    // Admin: mint a one-time claim code for a chapter that registered before
    // logins existed. Returned once, to the admin, over the passcode-gated API.
    if (path === '/api/clans/internal/claimcode' && request.method === 'POST') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const text = await request.text();
      if (text.length > 1024) return json({ error: 'Request too large' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const id = String((body && body.id) || '');
      const clans = await readList(env, CLANS_KEY);
      const clan = clans.find((c) => c.id === id);
      if (!clan) return json({ error: 'Not found' }, 404);
      const accounts = await readList(env, ACCOUNTS_KEY);
      if (accounts.some((x) => x.chapterId === clan.id)) return json({ error: 'This chapter already has an account' }, 409);
      clan.claimCode = randomCode(10);
      clan.claimExpires = new Date(Date.now() + CLAIM_DAYS * 86400000).toISOString();
      await env.FLIGHTS.put(CLANS_KEY, JSON.stringify(clans));
      return json({ code: clan.claimCode, expires: clan.claimExpires });
    }

    // A chapter sends work in. Open, rate-limited, and the row starts its life
    // at "submitted" — every later move is an admin decision.
    if (path === '/api/bounty/submit' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > 3 * 1024 * 1024) return json({ error: 'Submission too large — paste links to big files instead' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const parsed = parseSubmission(body || {});
      if (parsed.error) return json({ error: parsed.error }, 400);
      if (await tooMany(env, 'bsub', ipOf(request), 10)) {
        return json({ error: 'Too many submissions — try again in a minute' }, 429);
      }
      const subs = await readList(env, SUBS_KEY);
      if (subs.length >= MAX_SUBS) return json({ error: 'Submission limit reached' }, 409);
      const now = new Date().toISOString();
      const row = {
        id: randomCode(10), ...parsed.submission,
        status: 'submitted', createdAt: now, updatedAt: now,
        history: [{ status: 'submitted', at: now }],
      };
      subs.unshift(row);
      await env.FLIGHTS.put(SUBS_KEY, JSON.stringify(subs));
      return json({ ok: true, submission: publicSub(row) }, 201);
    }

    // The tracker. Handle plus rewards code, posted rather than in the query so
    // the code stays out of logs and referrers.
    if (path === '/api/bounty/track' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const payee = parsePayee(body || {});
      if (payee.error) return json({ error: payee.error }, 400);
      if (await tooMany(env, 'btrack', ipOf(request), 30)) return json({ error: 'Too many lookups — try again in a minute' }, 429);
      const subs = await readList(env, SUBS_KEY);
      const mine = subs.filter((s) =>
        s.fomoHandle.toLowerCase() === payee.payee.fomoHandle.toLowerCase() &&
        s.rewardsCode === payee.payee.rewardsCode);
      const paid = mine.filter((s) => s.status === 'paid').reduce((a, s) => a + (s.amount || 0), 0);
      const due = mine.filter((s) => s.status === 'approved' || s.status === 'awaiting_payout').reduce((a, s) => a + (s.amount || 0), 0);
      return json({ submissions: mine.map(publicSub), totals: { paid, due, count: mine.length } });
    }

    if (path === '/api/bounty/submissions' && request.method === 'GET') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const subs = await readList(env, SUBS_KEY);
      const status = String(url.searchParams.get('status') || '');
      const rows = status ? subs.filter((s) => s.status === status) : subs;
      const counts = {};
      SUB_STATUSES.forEach((k) => { counts[k] = subs.filter((s) => s.status === k).length; });
      return json({
        counts,
        submissions: rows.map((s) => ({ ...publicSub(s), fomoHandle: s.fomoHandle, rewardsCode: s.rewardsCode })),
      });
    }

    if (path === '/api/bounty/submissions/status' && request.method === 'POST') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const text = await request.text();
      if (text.length > 2048) return json({ error: 'Request too large' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const id = String((body && body.id) || '');
      const status = String((body && body.status) || '');
      if (!SUB_STATUSES.includes(status)) return json({ error: 'Unknown status' }, 400);
      const subs = await readList(env, SUBS_KEY);
      const row = subs.find((s) => s.id === id);
      if (!row) return json({ error: 'Not found' }, 404);
      const now = new Date().toISOString();
      row.status = status;
      row.updatedAt = now;
      if (Number.isFinite(Number(body.amount))) row.amount = Math.max(0, Math.round(Number(body.amount)));
      row.history = (row.history || []).concat([{ status, at: now }]);
      await env.FLIGHTS.put(SUBS_KEY, JSON.stringify(subs));
      return json({ ok: true, submission: publicSub(row) });
    }

    // One attached file, for the admin reviewing a submission.
    if (path === '/api/bounty/file' && request.method === 'GET') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const subs = await readList(env, SUBS_KEY);
      const row = subs.find((s) => s.id === String(url.searchParams.get('id') || ''));
      if (!row) return json({ error: 'Not found' }, 404);
      const file = (row.uploads || [])[Number(url.searchParams.get('n') || 0)];
      if (!file) return json({ error: 'Not found' }, 404);
      const bin = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
      return new Response(bin, { headers: { 'content-type': file.mime, 'cache-control': 'no-store' } });
    }

    // ---- /bounty ------------------------------------------------------------
    // Anyone can pitch a bounty. Only the admin reads the pile back.
    if (path === '/api/bounty/pitch' && request.method === 'POST') {
      const text = await request.text();
      if (text.length > 8 * 1024) return json({ error: 'Request too large' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const parsed = parsePitch(body || {});
      if (parsed.error) return json({ error: parsed.error }, 400);
      if (await tooMany(env, 'pitch', ipOf(request), 4)) {
        return json({ error: 'Too many pitches — try again in a minute' }, 429);
      }
      const pitches = await readList(env, PITCHES_KEY);
      if (pitches.length >= MAX_PITCHES) return json({ error: 'Pitch box is full' }, 409);
      const pitch = { id: randomCode(10), ...parsed.pitch, createdAt: new Date().toISOString() };
      pitches.unshift(pitch);
      await env.FLIGHTS.put(PITCHES_KEY, JSON.stringify(pitches));
      return json({ ok: true, id: pitch.id }, 201);
    }

    if (path === '/api/bounty/pitch' && request.method === 'GET') {
      const denied = await guard(request, env);
      if (denied) return denied;
      return json({ pitches: await readList(env, PITCHES_KEY) });
    }

    // Live events drive the auto-launched bounties. A chapter's schedule lands
    // here, and anything inside its window shows on /bounty for that school.
    if (path === '/api/bounty/events' && request.method === 'GET') {
      const school = String(url.searchParams.get('school') || '').toLowerCase();
      const all = await readList(env, EVENTS_KEY);
      const now = Date.now();
      const live = all
        .filter((e) => !school || e.school === school)
        .filter((e) => Date.parse(e.ends + 'T23:59:59Z') >= now && Date.parse(e.starts + 'T00:00:00Z') <= now + 14 * 86400000)
        .sort((a, b) => a.starts.localeCompare(b.starts));
      return json({ events: live });
    }

    if (path === '/api/bounty/events' && request.method === 'POST') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const text = await request.text();
      if (text.length > 16 * 1024) return json({ error: 'Request too large' }, 413);
      let body; try { body = JSON.parse(text); } catch { return json({ error: 'Invalid JSON' }, 400); }
      const parsed = parseEvent(body || {});
      if (parsed.error) return json({ error: parsed.error }, 400);
      const events = await readList(env, EVENTS_KEY);
      if (events.length >= MAX_EVENTS) return json({ error: 'Event limit reached' }, 409);
      const ev = { id: randomCode(8), ...parsed.event, createdAt: new Date().toISOString() };
      events.push(ev);
      await env.FLIGHTS.put(EVENTS_KEY, JSON.stringify(events));
      return json({ ok: true, event: ev }, 201);
    }

    if (path === '/api/bounty/events' && request.method === 'DELETE') {
      const denied = await guard(request, env);
      if (denied) return denied;
      const id = String(url.searchParams.get('id') || '');
      const events = await readList(env, EVENTS_KEY);
      const next = events.filter((e) => e.id !== id);
      if (next.length === events.length) return json({ error: 'Not found' }, 404);
      await env.FLIGHTS.put(EVENTS_KEY, JSON.stringify(next));
      return json({ ok: true });
    }

    if (path === '/api/flights' || path === '/api/auth' || path === '/api/clans' || path === '/api/clans/internal' || path === '/api/clans/internal/approve' || path === '/api/clans/internal/payout' || path === '/api/clans/internal/continuation' || path === '/api/clans/seed' || path === '/api/clans/internal/claimcode' || path === '/api/account/login' || path === '/api/account/logout' || path === '/api/account/claim' || path === '/api/account/ambassador' || path === '/api/account/me' || path === '/api/bounty/pitch' || path === '/api/bounty/events' || path === '/api/bounty/submit' || path === '/api/bounty/track' || path === '/api/bounty/submissions' || path === '/api/bounty/submissions/status' || path === '/api/bounty/file' || lookup || join || clanId || mediaReq || notesReq || del) {
      return json({ error: 'Method not allowed' }, 405);
    }
    return json({ error: 'Not found' }, 404);
  },
};
