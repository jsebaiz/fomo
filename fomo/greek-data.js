/* Shared reference data for the clans pages.
   Loaded by /fomo/clans/, /fomo/clans/create/ and anything else that needs to
   render a chapter icon. The worker keeps its own copy of the *names* for
   validation — this file owns the colors and letters used for display. */
(function (g) {
  // School code -> [display name, primary color, secondary color (null = auto-shade)]
  // Colors are each school's real, commonly recognized colors.
  const SCHOOLS = {
    americanu: ['American University', '#C41E3A', '#0033A0'],
    appstate: ['Appalachian State University', '#000000', '#FFCC00'],
    asu: ['Arizona State University', '#8C1D40', '#FFC627'],
    auburn: ['Auburn University', '#0C2340', '#E87722'],
    ballstate: ['Ball State University', '#BA0C2F', null],
    baylor: ['Baylor University', '#154734', '#FFB81C'],
    binghamton: ['Binghamton University', '#005A43', null],
    boisestate: ['Boise State University', '#0033A0', '#D64309'],
    bc: ['Boston College', '#98002E', '#BC9B6A'],
    bu: ['Boston University', '#CC0000', null],
    bgsu: ['Bowling Green State University', '#FE5000', '#4F2C1D'],
    bradley: ['Bradley University', '#C8102E', '#000000'],
    byu: ['Brigham Young University', '#002E5D', null],
    brown: ['Brown University', '#4E3629', '#C00404'],
    bucknell: ['Bucknell University', '#E87722', '#003865'],
    butler: ['Butler University', '#13294B', '#FFFFFF'],
    calpoly: ['Cal Poly San Luis Obispo', '#154734', '#BD8B13'],
    csuf: ['Cal State Fullerton', '#00274C', '#FF7900'],
    csulb: ['Cal State Long Beach', '#000000', '#FFC72C'],
    cmu: ['Carnegie Mellon University', '#C41230', null],
    cwru: ['Case Western Reserve University', '#0A304E', '#A0AEC0'],
    centralmich: ['Central Michigan University', '#6A0032', '#FFC82E'],
    chico: ['Chico State', '#BC0C2F', null],
    clarkson: ['Clarkson University', '#136A3A', '#B3A369'],
    clemson: ['Clemson University', '#F56600', '#522D80'],
    coastal: ['Coastal Carolina University', '#006F71', '#A27752'],
    charleston: ['College of Charleston', '#7B0043', '#FFFFFF'],
    colostate: ['Colorado State University', '#1E4D2B', '#C8C372'],
    csupueblo: ['Colorado State University Pueblo', '#AB0635', '#002554'],
    columbia: ['Columbia University', '#003D74', '#B9D9EB'],
    cornell: ['Cornell University', '#B31B1B', null],
    creighton: ['Creighton University', '#00519B', '#003087'],
    dartmouth: ['Dartmouth College', '#00693E', null],
    depaul: ['DePaul University', '#0057B8', '#C8102E'],
    drake: ['Drake University', '#004477', '#CFD2D3'],
    drexel: ['Drexel University', '#07294D', '#FFC600'],
    duke: ['Duke University', '#001A57', null],
    duquesne: ['Duquesne University', '#041E42', '#B10202'],
    ecu: ['East Carolina University', '#592A8A', '#FDC82F'],
    etsu: ['East Tennessee State University', '#041E42', '#FFC72C'],
    emu: ['Eastern Michigan University', '#00694E', '#FFFFFF'],
    elon: ['Elon University', '#860038', '#C8A96E'],
    emory: ['Emory University', '#012169', '#F2A900'],
    fairfield: ['Fairfield University', '#CC0000', null],
    fau: ['Florida Atlantic University', '#003366', '#CC0000'],
    fgcu: ['Florida Gulf Coast University', '#00573F', '#0E6F49'],
    fiu: ['Florida International University', '#081E3F', '#B6862C'],
    fsu: ['Florida State University', '#782F40', '#CEB888'],
    fresnostate: ['Fresno State', '#DB0032', '#00274C'],
    furman: ['Furman University', '#582C83', '#CBA052'],
    gmu: ['George Mason University', '#006633', '#FFCC33'],
    gwu: ['George Washington University', '#033C5A', '#A69362'],
    georgetown: ['Georgetown University', '#041E42', null],
    gsu: ['Georgia Southern University', '#011E41', '#00457C'],
    georgiastate: ['Georgia State University', '#0039A6', '#C60C30'],
    gt: ['Georgia Tech', '#B3A369', '#003057'],
    gvsu: ['Grand Valley State University', '#0065A4', '#000000'],
    harvard: ['Harvard University', '#A51C30', null],
    highpoint: ['High Point University', '#5B2B82', null],
    hofstra: ['Hofstra University', '#003591', '#FFB300'],
    illinoisstate: ['Illinois State University', '#CE1141', null],
    indianastate: ['Indiana State University', '#0A2240', '#FFFFFF'],
    iu: ['Indiana University', '#990000', null],
    iowastate: ['Iowa State University', '#C8102E', '#F1BE48'],
    jsu: ['Jacksonville State University', '#CC0000', null],
    jmu: ['James Madison University', '#450084', '#CBB677'],
    kstate: ['Kansas State University', '#512888', null],
    kennesaw: ['Kennesaw State University', '#000000', '#FDBB30'],
    kent: ['Kent State University', '#002664', '#EFAB00'],
    lafayette: ['Lafayette College', '#910029', '#01426A'],
    lamar: ['Lamar University', '#DC143C', '#FFFFFF'],
    lemoyne: ['Le Moyne College', '#00573F', null],
    lehigh: ['Lehigh University', '#623412', '#F0F0F0'],
    lsu: ['Louisiana State University', '#461D7C', '#FDD023'],
    latech: ['Louisiana Tech University', '#002F8B', '#E31B23'],
    lmu: ['Loyola Marymount University', '#8A1538', '#00558C'],
    loyolachicago: ['Loyola University Chicago', '#7A0019', '#FFB81C'],
    marist: ['Marist College', '#C8102E', '#000000'],
    marquette: ['Marquette University', '#003366', '#FFCC00'],
    mercer: ['Mercer University', '#F76900', '#000000'],
    metrostate: ['Metropolitan State University of Denver', '#CC0000', '#002F56'],
    miamiohio: ['Miami University (Ohio)', '#C3142D', null],
    msu: ['Michigan State University', '#18453B', null],
    mtsu: ['Middle Tennessee State University', '#0066CC', null],
    msstate: ['Mississippi State University', '#660000', null],
    missouristate: ['Missouri State University', '#5E0009', '#FFFFFF'],
    monmouth: ['Monmouth University', '#0072CE', '#FFFFFF'],
    ncstate: ['NC State University', '#CC0000', null],
    nmsu: ['New Mexico State University', '#8C0B42', null],
    nyu: ['New York University', '#57068C', null],
    ndsu: ['North Dakota State University', '#005643', '#FFC72C'],
    northeastern: ['Northeastern University', '#C8102E', null],
    arizonanorthern: ['Northern Arizona University', '#003466', '#FFC627'],
    niu: ['Northern Illinois University', '#BA0C2F', '#000000'],
    northwestern: ['Northwestern University', '#4E2A84', null],
    oakland: ['Oakland University', '#000000', '#B4975A'],
    osu: ['Ohio State University', '#BB0000', null],
    ohiou: ['Ohio University', '#00694E', null],
    okstate: ['Oklahoma State University', '#FF7300', '#000000'],
    odu: ['Old Dominion University', '#003057', '#7C878E'],
    oregonstate: ['Oregon State University', '#DC4405', '#000000'],
    pennstate: ['Penn State University', '#041E42', null],
    pepperdine: ['Pepperdine University', '#00205B', '#F47B20'],
    portlandstate: ['Portland State University', '#154734', '#6D6E71'],
    princeton: ['Princeton University', '#EE7F2D', '#000000'],
    providence: ['Providence College', '#000000', '#8E9089'],
    purdue: ['Purdue University', '#B1810B', '#000000'],
    quinnipiac: ['Quinnipiac University', '#00205B', '#B58500'],
    radford: ['Radford University', '#004B8D', '#CC0000'],
    rice: ['Rice University', '#00205B', null],
    rider: ['Rider University', '#5D1725', '#B5A36A'],
    rit: ['Rochester Institute of Technology', '#F76902', '#513127'],
    rollins: ['Rollins College', '#0B3B60', '#F2A900'],
    rowan: ['Rowan University', '#733635', '#B99C6B'],
    rutgers: ['Rutgers University', '#CC0033', '#000000'],
    stlouis: ['Saint Louis University', '#003DA5', '#FFFFFF'],
    salisbury: ['Salisbury University', '#862633', '#C9A227'],
    sdsu: ['San Diego State University', '#A6192E', null],
    sjsu: ['San Jose State University', '#0055A2', '#E5A823'],
    santaclara: ['Santa Clara University', '#862633', null],
    seton: ['Seton Hall University', '#004488', null],
    siena: ['Siena College', '#006747', '#FFB81C'],
    sdstate: ['South Dakota State University', '#0033A0', '#FFD100'],
    siu: ['Southern Illinois University', '#720000', '#8A8D8F'],
    smu: ['Southern Methodist University', '#C8102E', '#0033A0'],
    stjohns: ['St. John\'s University', '#BA0C2F', '#FFFFFF'],
    stanford: ['Stanford University', '#8C1515', null],
    stetson: ['Stetson University', '#006747', null],
    stonybrook: ['Stony Brook University', '#900028', '#000000'],
    syracuse: ['Syracuse University', '#F76900', '#000E54'],
    temple: ['Temple University', '#9D2235', null],
    tamu: ['Texas A&M University', '#500000', null],
    tamucc: ['Texas A&M–Corpus Christi', '#0067C5', '#00843D'],
    tcu: ['Texas Christian University', '#4D1979', null],
    texasstate: ['Texas State University', '#501214', '#63666A'],
    techtexas: ['Texas Tech University', '#CC0000', '#000000'],
    tcnj: ['The College of New Jersey', '#00539B', '#FFC72C'],
    towson: ['Towson University', '#FFB300', '#000000'],
    troy: ['Troy University', '#8A2432', '#A2AAAD'],
    tulane: ['Tulane University', '#006747', '#418FDE'],
    cal: ['UC Berkeley', '#003262', '#FDB515'],
    ucdavis: ['UC Davis', '#022851', '#FFBF00'],
    uci: ['UC Irvine', '#0064A4', '#FFD200'],
    ucr: ['UC Riverside', '#003DA5', '#FFB81C'],
    ucsd: ['UC San Diego', '#182B49', '#C69214'],
    ucsb: ['UC Santa Barbara', '#003660', '#FEBC11'],
    ucsc: ['UC Santa Cruz', '#003C6C', '#FDC700'],
    ucla: ['UCLA', '#2774AE', '#FFD100'],
    unc: ['UNC Chapel Hill', '#7BAFD4', '#13294B'],
    uncc: ['UNC Charlotte', '#046A38', '#B9975B'],
    uncw: ['UNC Wilmington', '#006666', '#B3A369'],
    utc: ['UT Chattanooga', '#00386B', '#E0AA0F'],
    utd: ['UT Dallas', '#E87500', '#154734'],
    utsa: ['UT San Antonio', '#0C2340', '#F15A22'],
    albany: ['University at Albany', '#46166B', '#EEB211'],
    buffalo: ['University at Buffalo', '#005BBB', null],
    akron: ['University of Akron', '#041E42', '#A89968'],
    ala: ['University of Alabama', '#9E1B32', null],
    uab: ['University of Alabama at Birmingham', '#1E6B52', '#F4C300'],
    ua: ['University of Arizona', '#AB0520', '#0C234B'],
    arkansas: ['University of Arkansas', '#9D2235', null],
    ucf: ['University of Central Florida', '#BA9B37', '#000000'],
    uchicago: ['University of Chicago', '#800000', null],
    cincinnati: ['University of Cincinnati', '#E00122', '#000000'],
    cu: ['University of Colorado Boulder', '#CFB87C', '#000000'],
    uccs: ['University of Colorado Colorado Springs', '#CFB87C', '#000000'],
    uconn: ['University of Connecticut', '#000E2F', null],
    daytonoh: ['University of Dayton', '#C8102E', '#004B8D'],
    delaware: ['University of Delaware', '#00539F', '#FFD200'],
    denver: ['University of Denver', '#8B2332', '#C8102E'],
    uf: ['University of Florida', '#0021A5', '#FA4616'],
    uga: ['University of Georgia', '#BA0C2F', '#000000'],
    hawaii: ['University of Hawaii', '#024731', null],
    houston: ['University of Houston', '#C8102E', null],
    idaho: ['University of Idaho', '#B3A369', '#000000'],
    illinois: ['University of Illinois', '#E84A27', '#13294B'],
    iowa: ['University of Iowa', '#FFCD00', '#000000'],
    kansas: ['University of Kansas', '#0051BA', '#E8000D'],
    uk: ['University of Kentucky', '#0033A0', null],
    ull: ['University of Louisiana at Lafayette', '#CE181E', '#FFFFFF'],
    louisville: ['University of Louisville', '#AD0000', '#000000'],
    maine: ['University of Maine', '#003263', '#B0D7FF'],
    maryland: ['University of Maryland', '#E21833', '#FFD520'],
    umass: ['University of Massachusetts Amherst', '#881C1C', '#000000'],
    memphis: ['University of Memphis', '#003087', '#898D8D'],
    miami: ['University of Miami', '#F47321', '#005030'],
    michigan: ['University of Michigan', '#00274C', '#FFCB05'],
    minnesota: ['University of Minnesota', '#7A0019', '#FFCC33'],
    olemiss: ['University of Mississippi', '#CE1126', '#14213D'],
    mizzou: ['University of Missouri', '#F1B82D', '#000000'],
    kansascity: ['University of Missouri–Kansas City', '#005696', '#FFC82E'],
    montana: ['University of Montana', '#75052B', null],
    nebraska: ['University of Nebraska', '#E41C38', null],
    unlv: ['University of Nevada, Las Vegas', '#CF0A2C', '#666666'],
    nevada: ['University of Nevada, Reno', '#003366', '#807F84'],
    unh: ['University of New Hampshire', '#003591', null],
    newmexico: ['University of New Mexico', '#BA0C2F', '#63666A'],
    northdakota: ['University of North Dakota', '#009A44', '#000000'],
    unt: ['University of North Texas', '#00853E', null],
    uni: ['University of Northern Iowa', '#4B116F', '#FFCC00'],
    notredame: ['University of Notre Dame', '#0C2340', '#C99700'],
    ou: ['University of Oklahoma', '#841617', null],
    oregon: ['University of Oregon', '#154733', '#FEE123'],
    penn: ['University of Pennsylvania', '#011F5B', '#990000'],
    pitt: ['University of Pittsburgh', '#003594', '#FFB81C'],
    urhode: ['University of Rhode Island', '#002147', '#7DB1DC'],
    usfca: ['University of San Francisco', '#00543C', '#FDBB30'],
    scranton: ['University of Scranton', '#5D1725', null],
    southalabama: ['University of South Alabama', '#00205B', '#BF0D3E'],
    sc: ['University of South Carolina', '#73000A', '#000000'],
    usouthdakota: ['University of South Dakota', '#D40000', '#000000'],
    usf: ['University of South Florida', '#006747', '#CFC493'],
    usc: ['University of Southern California', '#990000', '#FFC72C'],
    southernmiss: ['University of Southern Mississippi', '#000000', '#FFAA3C'],
    tampa: ['University of Tampa', '#CE1126', '#000000'],
    tennessee: ['University of Tennessee', '#FF8200', null],
    utaustin: ['University of Texas at Austin', '#BF5700', null],
    toledo: ['University of Toledo', '#15397F', '#FFB20F'],
    utah: ['University of Utah', '#CC0000', null],
    uvm: ['University of Vermont', '#007155', '#FFC72C'],
    uva: ['University of Virginia', '#232D4B', '#E57200'],
    uw: ['University of Washington', '#4B2E83', '#B7A57A'],
    wisconsin: ['University of Wisconsin–Madison', '#C5050C', null],
    wyoming: ['University of Wyoming', '#492F24', '#FFC425'],
    utahstate: ['Utah State University', '#00263A', '#8A8D8F'],
    uvu: ['Utah Valley University', '#275D38', '#FFFFFF'],
    valpo: ['Valparaiso University', '#613318', '#F1B434'],
    vanderbilt: ['Vanderbilt University', '#866D4B', '#000000'],
    villanova: ['Villanova University', '#00205B', '#13B5EA'],
    vcu: ['Virginia Commonwealth University', '#000000', '#F8B300'],
    vt: ['Virginia Tech', '#630031', '#CF4420'],
    wakeforest: ['Wake Forest University', '#9E7E38', '#000000'],
    wsu: ['Washington State University', '#981E32', null],
    wustl: ['Washington University in St. Louis', '#A51417', null],
    wayne: ['Wayne State University', '#0C5449', '#F5C400'],
    weber: ['Weber State University', '#492365', '#FFFFFF'],
    westchester: ['West Chester University', '#4F2D7F', '#B5A36A'],
    wvu: ['West Virginia University', '#002855', '#EAAA00'],
    wku: ['Western Kentucky University', '#B01E24', '#FFFFFF'],
    wmu: ['Western Michigan University', '#6C4023', '#B5A167'],
    winthrop: ['Winthrop University', '#8B0000', '#DAA520'],
    xavier: ['Xavier University', '#0C2340', '#9EA2A2'],
    yale: ['Yale University', '#00356B', null],
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


  // Common chapter roles — offered as suggestions, but anything can be typed.
  const ROLES = [
    'President', 'Vice President', 'Treasurer', 'Secretary', 'Rush Chair',
    'Recruitment Chair', 'Social Chair', 'Philanthropy Chair', 'Risk Manager',
    'New Member Educator', 'House Manager', 'Alumni Chair', 'Scholarship Chair',
    'Pledge Class President', 'Member',
  ];

  // ---------------------------------------------------------------------
  // Typeahead. Wraps a plain text input: filters a list as you type, arrow
  // keys + enter to pick, click to pick. In strict mode the input only counts
  // as filled once a real item is chosen (input.dataset.value holds it).
  // ---------------------------------------------------------------------
  function attachCombobox(input, items, options) {
    const opts = options || {};
    const strict = opts.strict !== false;
    const limit = opts.limit || 8;
    const box = document.createElement('div');
    box.className = 'cb-menu';
    box.hidden = true;
    const wrap = input.parentNode;
    if (getComputedStyle(wrap).position === 'static') wrap.style.position = 'relative';
    wrap.appendChild(box);

    let matches = [];
    let active = -1;

    input.setAttribute('autocomplete', 'off');
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');

    const list = () => (typeof items === 'function' ? items() : items);

    function filter(q) {
      const needle = norm(q);
      const all = list();
      if (!needle) return all.slice(0, limit);
      const starts = [], contains = [];
      all.forEach((it) => {
        const hay = norm(it.label + ' ' + (it.keywords || ''));
        const at = hay.indexOf(needle);
        if (at === 0) starts.push(it);
        else if (at > 0) contains.push(it);
      });
      return starts.concat(contains).slice(0, limit);
    }

    function close() { box.hidden = true; active = -1; input.setAttribute('aria-expanded', 'false'); }

    function open(q) {
      matches = filter(q);
      if (!matches.length) { close(); return; }
      box.innerHTML = matches.map((m, i) =>
        `<button type="button" class="cb-item${i === active ? ' active' : ''}" data-i="${i}">` +
        `<span class="cb-label">${m.label}</span>` +
        (m.sub ? `<span class="cb-sub">${m.sub}</span>` : '') +
        '</button>').join('');
      box.hidden = false;
      input.setAttribute('aria-expanded', 'true');
    }

    function choose(i) {
      const m = matches[i];
      if (!m) return;
      input.value = m.label;
      input.dataset.value = m.value;
      close();
      input.dispatchEvent(new CustomEvent('cb:change', { detail: m, bubbles: true }));
    }

    input.addEventListener('input', () => {
      if (strict) input.dataset.value = '';
      else input.dataset.value = input.value.trim();
      active = -1;
      open(input.value);
      if (!strict) input.dispatchEvent(new CustomEvent('cb:change', { detail: null, bubbles: true }));
    });
    input.addEventListener('focus', () => open(input.value));
    input.addEventListener('keydown', (e) => {
      if (box.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { open(input.value); return; }
      if (box.hidden) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); active = Math.min(active + 1, matches.length - 1); open(input.value); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); active = Math.max(active - 1, 0); open(input.value); }
      else if (e.key === 'Enter') {
        if (active >= 0) { e.preventDefault(); e.stopPropagation(); choose(active); }
        else if (matches.length === 1) { e.preventDefault(); e.stopPropagation(); choose(0); }
        else close();
      } else if (e.key === 'Escape') { close(); }
    });
    box.addEventListener('mousedown', (e) => {
      const btn = e.target.closest('.cb-item');
      if (!btn) return;
      e.preventDefault();
      choose(Number(btn.dataset.i));
    });
    document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) close(); });
    input.addEventListener('blur', () => {
      setTimeout(() => {
        close();
        if (!strict) { input.dataset.value = input.value.trim(); return; }
        // strict: snap to an exact match if they typed one, otherwise clear
        const exact = list().find((it) => norm(it.label) === norm(input.value));
        if (exact) { input.value = exact.label; input.dataset.value = exact.value; }
        else if (!input.dataset.value) { input.value = ''; }
      }, 120);
    });

    return { close };
  }

  // Downscale + re-encode a picked image so it fits comfortably in storage.
  function resizeImage(file, maxW, maxH, quality) {
    return new Promise((resolve, reject) => {
      if (!file || !/^image\//.test(file.type)) { reject(new Error('not an image')); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error('read failed'));
      reader.onload = () => {
        const img = new Image();
        img.onerror = () => reject(new Error('decode failed'));
        img.onload = () => {
          const scale = Math.min(maxW / img.width, maxH / img.height, 1);
          const tw = Math.max(1, Math.round(img.width * scale));
          const th = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = tw; canvas.height = th;
          const ctx = canvas.getContext('2d');
          ctx.fillStyle = '#0F0F17';
          ctx.fillRect(0, 0, tw, th);
          ctx.drawImage(img, 0, 0, tw, th);
          resolve(canvas.toDataURL('image/jpeg', quality || 0.82));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  g.GreekData = { SCHOOLS, FRATERNITIES, SORORITIES, ROLES, ORGS, norm, shade, schoolColors, orgFor, lettersFor, glyphFor, attachCombobox, resizeImage };
})(window);
