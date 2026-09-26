/* Shared reference data for the clans pages.
   Loaded by /fomo/clans/, /fomo/clans/create/ and anything else that needs to
   render a chapter icon. The worker keeps its own copy of the *names* for
   validation — this file owns the colors and letters used for display. */
(function (g) {
  // School code -> [display name, primary color, secondary color (null = auto-shade)]
  // Colors are each school's real, commonly recognized colors.
  const SCHOOLS = {
    asu: ['Arizona State University', '#8C1D40', '#FFC627'],
    ua: ['University of Arizona', '#AB0520', '#0C234B'],
    ucla: ['UCLA', '#2774AE', '#FFD100'],
    usc: ['University of Southern California', '#990000', '#FFC72C'],
    cal: ['UC Berkeley', '#003262', '#FDB515'],
    stanford: ['Stanford University', '#8C1515', null],
    ucsd: ['UC San Diego', '#182B49', '#C69214'],
    sdsu: ['San Diego State University', '#A6192E', null],
    uw: ['University of Washington', '#4B2E83', '#B7A57A'],
    uo: ['University of Oregon', '#154733', '#FEE123'],
    utah: ['University of Utah', '#CC0000', null],
    cu: ['CU Boulder', '#CFB87C', '#000000'],
    utaustin: ['UT Austin', '#BF5700', null],
    tamu: ['Texas A&M University', '#500000', null],
    rice: ['Rice University', '#00205B', null],
    smu: ['Southern Methodist University', '#C8102E', '#0033A0'],
    ou: ['University of Oklahoma', '#841617', null],
    mizzou: ['University of Missouri', '#F1B82D', '#000000'],
    wustl: ['Washington University in St. Louis', '#A51417', null],
    wisconsin: ['University of Wisconsin–Madison', '#C5050C', null],
    minnesota: ['University of Minnesota', '#7A0019', '#FFCC33'],
    northwestern: ['Northwestern University', '#4E2A84', null],
    uchicago: ['University of Chicago', '#800000', null],
    illinois: ['University of Illinois', '#E84A27', '#13294B'],
    purdue: ['Purdue University', '#B1810B', '#000000'],
    iu: ['Indiana University', '#990000', null],
    michigan: ['University of Michigan', '#00274C', '#FFCB05'],
    osu: ['Ohio State University', '#BB0000', null],
    penn: ['University of Pennsylvania', '#011F5B', '#990000'],
    pennstate: ['Penn State University', '#041E42', null],
    pitt: ['University of Pittsburgh', '#003594', '#FFB81C'],
    cmu: ['Carnegie Mellon University', '#C41230', null],
    nyu: ['New York University', '#57068C', null],
    columbia: ['Columbia University', '#003D74', '#B9D9EB'],
    cornell: ['Cornell University', '#B31B1B', null],
    yale: ['Yale University', '#00356B', null],
    harvard: ['Harvard University', '#A51C30', null],
    bu: ['Boston University', '#CC0000', null],
    georgetown: ['Georgetown University', '#041E42', null],
    umd: ['University of Maryland', '#E21833', '#FFD520'],
    uva: ['University of Virginia', '#232D4B', '#E57200'],
    duke: ['Duke University', '#001A57', null],
    unc: ['UNC Chapel Hill', '#7BAFD4', '#13294B'],
    gt: ['Georgia Tech', '#B3A369', '#003057'],
    uga: ['University of Georgia', '#BA0C2F', '#000000'],
    vanderbilt: ['Vanderbilt University', '#866D4B', '#000000'],
    ala: ['University of Alabama', '#9E1B32', null],
    uf: ['University of Florida', '#0021A5', '#FA4616'],
    fsu: ['Florida State University', '#782F40', '#CEB888'],
    miami: ['University of Miami', '#F47321', '#005030'],
    elon: ['Elon University', '#860038', '#C8A96E'],
    sc: ['University of South Carolina', '#73000A', '#000000'],
    clemson: ['Clemson University', '#F56600', '#522D80'],
    ohiou: ['Ohio University', '#00694E', null],
    emory: ['Emory University', '#012169', '#F2A900'],
    fiu: ['Florida International University', '#081E3F', '#B6862C'],
    tampa: ['University of Tampa', '#CE1126', '#000000'],
    vt: ['Virginia Tech', '#630031', '#CF4420'],
    coastal: ['Coastal Carolina University', '#006F71', '#A27752'],
    rutgers: ['Rutgers University', '#CC0033', '#000000'],
    tcu: ['Texas Christian University', '#4D1979', null],
    salisbury: ['Salisbury University', '#862633', '#C9A227'],
  };

  // Recognized national fraternities and sororities (NIC / NPC / NPHC and other
  // established nationals), with the letters each one actually uses. A chapter
  // name has to match one of these — see the note in the create page about what
  // this does and doesn't verify.
  const FRATERNITIES = [
    ['Acacia', 'AC'], ['Alpha Chi Rho', 'ΑΧΡ'], ['Alpha Delta Gamma', 'ΑΔΓ'],
    ['Alpha Delta Phi', 'ΑΔΦ'], ['Alpha Epsilon Pi', 'ΑΕΠ'], ['Alpha Gamma Rho', 'ΑΓΡ'],
    ['Alpha Gamma Sigma', 'ΑΓΣ'], ['Alpha Kappa Lambda', 'ΑΚΛ'], ['Alpha Phi Alpha', 'ΑΦΑ'],
    ['Alpha Phi Delta', 'ΑΦΔ'], ['Alpha Sigma Phi', 'ΑΣΦ'], ['Alpha Tau Omega', 'ΑΤΩ'],
    ['Beta Chi Theta', 'ΒΧΘ'], ['Beta Sigma Psi', 'ΒΣΨ'], ['Beta Theta Pi', 'ΒΘΠ'],
    ['Chi Phi', 'ΧΦ'], ['Chi Psi', 'ΧΨ'], ['Delta Chi', 'ΔΧ'],
    ['Delta Kappa Epsilon', 'ΔΚΕ'], ['Delta Lambda Phi', 'ΔΛΦ'], ['Delta Phi', 'ΔΦ'],
    ['Delta Sigma Phi', 'ΔΣΦ'], ['Delta Tau Delta', 'ΔΤΔ'], ['Delta Upsilon', 'ΔΥ'],
    ['FarmHouse', 'FH'], ['Iota Phi Theta', 'ΙΦΘ'], ['Kappa Alpha Order', 'ΚΑ'],
    ['Kappa Alpha Psi', 'ΚΑΨ'], ['Kappa Delta Rho', 'ΚΔΡ'], ['Kappa Sigma', 'ΚΣ'],
    ['Lambda Chi Alpha', 'ΛΧΑ'], ['Lambda Theta Phi', 'ΛΘΦ'], ['Omega Psi Phi', 'ΩΨΦ'],
    ['Phi Beta Sigma', 'ΦΒΣ'], ['Phi Delta Theta', 'ΦΔΘ'], ['Phi Gamma Delta', 'ΦΓΔ'],
    ['Phi Iota Alpha', 'ΦΙΑ'], ['Phi Kappa Psi', 'ΦΚΨ'], ['Phi Kappa Sigma', 'ΦΚΣ'],
    ['Phi Kappa Tau', 'ΦΚΤ'], ['Phi Kappa Theta', 'ΦΚΘ'], ['Phi Mu Delta', 'ΦΜΔ'],
    ['Phi Sigma Kappa', 'ΦΣΚ'], ['Pi Kappa Alpha', 'ΠΚΑ'], ['Pi Kappa Phi', 'ΠΚΦ'],
    ['Pi Lambda Phi', 'ΠΛΦ'], ['Psi Upsilon', 'ΨΥ'], ['Sigma Alpha Epsilon', 'ΣΑΕ'],
    ['Sigma Alpha Mu', 'ΣΑΜ'], ['Sigma Chi', 'ΣΧ'], ['Sigma Lambda Beta', 'ΣΛΒ'],
    ['Sigma Nu', 'ΣΝ'], ['Sigma Phi Delta', 'ΣΦΔ'], ['Sigma Phi Epsilon', 'ΣΦΕ'],
    ['Sigma Pi', 'ΣΠ'], ['Sigma Tau Gamma', 'ΣΤΓ'], ['Tau Delta Phi', 'ΤΔΦ'],
    ['Tau Epsilon Phi', 'ΤΕΦ'], ['Tau Kappa Epsilon', 'ΤΚΕ'], ['Theta Chi', 'ΘΧ'],
    ['Theta Delta Chi', 'ΘΔΧ'], ['Theta Xi', 'ΘΞ'], ['Triangle', 'TRI'],
    ['Zeta Beta Tau', 'ΖΒΤ'], ['Zeta Psi', 'ΖΨ'],
  ];

  const SORORITIES = [
    ['Alpha Chi Omega', 'ΑΧΩ'], ['Alpha Delta Pi', 'ΑΔΠ'], ['Alpha Epsilon Phi', 'ΑΕΦ'],
    ['Alpha Gamma Delta', 'ΑΓΔ'], ['Alpha Kappa Alpha', 'ΑΚΑ'], ['Alpha Omicron Pi', 'ΑΟΠ'],
    ['Alpha Phi', 'ΑΦ'], ['Alpha Sigma Alpha', 'ΑΣΑ'], ['Alpha Sigma Tau', 'ΑΣΤ'],
    ['Alpha Xi Delta', 'ΑΞΔ'], ['Chi Omega', 'ΧΩ'], ['Delta Delta Delta', 'ΔΔΔ'],
    ['Delta Gamma', 'ΔΓ'], ['Delta Phi Epsilon', 'ΔΦΕ'], ['Delta Sigma Theta', 'ΔΣΘ'],
    ['Delta Zeta', 'ΔΖ'], ['Gamma Phi Beta', 'ΓΦΒ'], ['Kappa Alpha Theta', 'ΚΑΘ'],
    ['Kappa Delta', 'ΚΔ'], ['Kappa Kappa Gamma', 'ΚΚΓ'], ['Phi Mu', 'ΦΜ'],
    ['Phi Sigma Sigma', 'ΦΣΣ'], ['Pi Beta Phi', 'ΠΒΦ'], ['Sigma Delta Tau', 'ΣΔΤ'],
    ['Sigma Gamma Rho', 'ΣΓΡ'], ['Sigma Kappa', 'ΣΚ'], ['Sigma Sigma Sigma', 'ΣΣΣ'],
    ['Theta Phi Alpha', 'ΘΦΑ'], ['Zeta Phi Beta', 'ΖΦΒ'], ['Zeta Tau Alpha', 'ΖΤΑ'],
  ];

  // Common nicknames people actually type -> the canonical name above.
  const ALIASES = {
    'sae': 'Sigma Alpha Epsilon', 'pike': 'Pi Kappa Alpha', 'fiji': 'Phi Gamma Delta',
    'tke': 'Tau Kappa Epsilon', 'zbt': 'Zeta Beta Tau', 'aepi': 'Alpha Epsilon Pi',
    'sammy': 'Sigma Alpha Mu', 'sig ep': 'Sigma Phi Epsilon', 'sigep': 'Sigma Phi Epsilon',
    'phi delt': 'Phi Delta Theta', 'phi psi': 'Phi Kappa Psi', 'delt': 'Delta Tau Delta',
    'dke': 'Delta Kappa Epsilon', 'deke': 'Delta Kappa Epsilon', 'ato': 'Alpha Tau Omega',
    'psi u': 'Psi Upsilon', 'ka': 'Kappa Alpha Order', 'kappa alpha': 'Kappa Alpha Order',
    'kappa sig': 'Kappa Sigma', 'lambda chi': 'Lambda Chi Alpha', 'pike phi': 'Pi Kappa Phi',
    'theta xi': 'Theta Xi', 'tep': 'Tau Epsilon Phi', 'axo': 'Alpha Chi Omega',
    'adpi': 'Alpha Delta Pi', 'aoii': 'Alpha Omicron Pi', 'tri delta': 'Delta Delta Delta',
    'tridelta': 'Delta Delta Delta', 'tri delt': 'Delta Delta Delta', 'zta': 'Zeta Tau Alpha',
    'theta': 'Kappa Alpha Theta', 'kkg': 'Kappa Kappa Gamma', 'dg': 'Delta Gamma',
    'dphie': 'Delta Phi Epsilon', 'sdt': 'Sigma Delta Tau', 'tri sigma': 'Sigma Sigma Sigma',
    'aka': 'Alpha Kappa Alpha', 'dst': 'Delta Sigma Theta',
  };

  const norm = (s) => String(s).toLowerCase().replace(/[.'’]/g, '').replace(/\s+/g, ' ').trim();

  // normalized name -> [canonical name, letters, type]
  const ORGS = {};
  FRATERNITIES.forEach(([name, letters]) => { ORGS[norm(name)] = [name, letters, 'fraternity']; });
  SORORITIES.forEach(([name, letters]) => { ORGS[norm(name)] = [name, letters, 'sorority']; });
  Object.keys(ALIASES).forEach((alias) => {
    const target = ORGS[norm(ALIASES[alias])];
    if (target) ORGS[norm(alias)] = target;
  });

  function shade(hex, pct) {
    const n = parseInt(hex.slice(1), 16);
    const clamp = (v) => Math.max(0, Math.min(255, v));
    const r = clamp(((n >> 16) & 255) * (1 + pct));
    const g2 = clamp(((n >> 8) & 255) * (1 + pct));
    const b = clamp((n & 255) * (1 + pct));
    return '#' + [r, g2, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
  }
  function schoolColors(code) {
    const s = SCHOOLS[code];
    if (!s) return ['#516AF6', '#2E3A8C'];
    return [s[1], s[2] || shade(s[1], -0.42)];
  }
  function orgFor(chapterName) { return ORGS[norm(chapterName)] || null; }
  function lettersFor(chapterName) {
    const o = orgFor(chapterName);
    return o ? o[1] : null;
  }
  function initialsOf(name) {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    return ((parts[0] || '?')[0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }
  function glyphFor(chapterName) {
    if (!chapterName) return '?';
    return lettersFor(chapterName) || initialsOf(chapterName);
  }

  g.GreekData = { SCHOOLS, FRATERNITIES, SORORITIES, ORGS, norm, shade, schoolColors, orgFor, lettersFor, glyphFor };
})(window);
