/* ============================================================================
   Umpty — the question bank.

   Every answer here is DERIVED from two cited figures rather than asserted, so
   the reveal can show its working: "8,849 m / 828 m = 10.7x". If a figure is
   wrong, it is wrong visibly, in one place, next to its source.

   Shape:
     type   'ratio'   -> answer = a.value / b.value, phrased "how many times"
            'percent' -> answer = a.value / b.value * 100, phrased "what percent"
     a, b   { label, value, unit, note? }  -- the two cited figures
     src    where the figures come from
     cat    category, for future packs

   Figures were chosen for being stable and well documented. Anything that
   moves week to week (prices, populations to the person, user counts) is
   deliberately excluded.
   ========================================================================== */
window.UMPTY_BANK = [

  /* ---------------------------------------------------------------- earth */
  { id:'everest-burj', type:'ratio', cat:'Earth',
    q:'How many times taller is Mount Everest than the Burj Khalifa?',
    a:{ label:'Mount Everest', value:8849, unit:'m' },
    b:{ label:'Burj Khalifa', value:828, unit:'m' },
    src:'Everest: 2020 China–Nepal joint survey. Burj Khalifa: architectural height.' },

  { id:'everest-fuji', type:'ratio', cat:'Earth',
    q:'How many times taller is Mount Everest than Mount Fuji?',
    a:{ label:'Mount Everest', value:8849, unit:'m' },
    b:{ label:'Mount Fuji', value:3776, unit:'m' },
    src:'Everest: 2020 joint survey. Fuji: Geospatial Information Authority of Japan.' },

  { id:'mariana-everest', type:'ratio', cat:'Earth',
    q:'How many times deeper is the Mariana Trench than Mount Everest is tall?',
    a:{ label:'Challenger Deep', value:10935, unit:'m deep' },
    b:{ label:'Mount Everest', value:8849, unit:'m tall' },
    src:'Challenger Deep: 2010 NOAA sonar survey. Everest: 2020 joint survey.' },

  { id:'pacific-atlantic', type:'ratio', cat:'Earth',
    q:'How many times larger is the Pacific Ocean than the Atlantic?',
    a:{ label:'Pacific Ocean', value:165250000, unit:'km²' },
    b:{ label:'Atlantic Ocean', value:106460000, unit:'km²' },
    src:'NOAA / International Hydrographic Organization areas.' },

  { id:'russia-canada', type:'ratio', cat:'Earth',
    q:'How many times bigger is Russia than Canada?',
    a:{ label:'Russia', value:17098246, unit:'km²' },
    b:{ label:'Canada', value:9984670, unit:'km²' },
    src:'Total area including inland water, CIA World Factbook.' },

  { id:'greenland-iceland', type:'ratio', cat:'Earth',
    q:'How many times bigger is Greenland than Iceland?',
    a:{ label:'Greenland', value:2166086, unit:'km²' },
    b:{ label:'Iceland', value:103000, unit:'km²' },
    src:'Statistics Greenland; Statistics Iceland.' },

  { id:'nile-thames', type:'ratio', cat:'Earth',
    q:'How many times longer is the Nile than the River Thames?',
    a:{ label:'Nile', value:6650, unit:'km' },
    b:{ label:'River Thames', value:346, unit:'km' },
    src:'Nile length is disputed; 6,650 km is the figure most commonly cited.' },

  { id:'earth-moon-circ', type:'ratio', cat:'Earth',
    q:'How many times bigger is Earth’s circumference than the Moon’s?',
    a:{ label:'Earth, equatorial', value:40075, unit:'km' },
    b:{ label:'Moon, equatorial', value:10921, unit:'km' },
    src:'NASA planetary fact sheets.' },

  { id:'water-surface', type:'percent', cat:'Earth',
    q:'What percent of Earth’s surface is covered by water?',
    a:{ label:'Ocean and surface water', value:361.1, unit:'million km²' },
    b:{ label:'Total surface', value:510.1, unit:'million km²' },
    src:'NOAA; total surface area of Earth.' },

  { id:'fresh-water', type:'percent', cat:'Earth',
    q:'What percent of all the water on Earth is fresh water?',
    a:{ label:'Fresh water', value:35, unit:'million km³' },
    b:{ label:'All water', value:1386, unit:'million km³' },
    src:'USGS water distribution estimates.' },

  { id:'nitrogen', type:'percent', cat:'Earth',
    q:'What percent of dry air is nitrogen?',
    a:{ label:'Nitrogen', value:78.08, unit:'% by volume' },
    b:{ label:'All dry air', value:100, unit:'%' },
    src:'NASA / NOAA standard atmosphere composition.' },

  /* ---------------------------------------------------------------- space */
  { id:'sun-earth-dia', type:'ratio', cat:'Space',
    q:'How many times wider is the Sun than Earth?',
    a:{ label:'Sun', value:1392700, unit:'km across' },
    b:{ label:'Earth', value:12742, unit:'km across' },
    src:'NASA Sun and Earth fact sheets, mean diameters.' },

  { id:'jupiter-earth-dia', type:'ratio', cat:'Space',
    q:'How many times wider is Jupiter than Earth?',
    a:{ label:'Jupiter', value:139820, unit:'km across' },
    b:{ label:'Earth', value:12742, unit:'km across' },
    src:'NASA planetary fact sheets, equatorial diameters.' },

  { id:'jupiter-earth-mass', type:'ratio', cat:'Space',
    q:'How many times heavier is Jupiter than Earth?',
    a:{ label:'Jupiter', value:1.898e27, unit:'kg' },
    b:{ label:'Earth', value:5.972e24, unit:'kg' },
    src:'NASA planetary fact sheets.' },

  { id:'sun-moon-dist', type:'ratio', cat:'Space',
    q:'How many times further away is the Sun than the Moon?',
    a:{ label:'Earth to Sun', value:149600000, unit:'km, mean' },
    b:{ label:'Earth to Moon', value:384400, unit:'km, mean' },
    src:'NASA; both are mean distances.' },

  { id:'saturn-earth', type:'ratio', cat:'Space',
    q:'How many times wider is Saturn than Earth?',
    a:{ label:'Saturn', value:116460, unit:'km across' },
    b:{ label:'Earth', value:12742, unit:'km across' },
    src:'NASA planetary fact sheets, equatorial diameters.' },

  { id:'mars-moon', type:'ratio', cat:'Space',
    q:'How many times wider is Mars than the Moon?',
    a:{ label:'Mars', value:6779, unit:'km across' },
    b:{ label:'the Moon', value:3475, unit:'km across' },
    src:'NASA planetary fact sheets.' },

  { id:'neptune-earth-dist', type:'ratio', cat:'Space',
    q:'How many times further from the Sun is Neptune than Earth?',
    a:{ label:'Neptune’s orbit', value:4495, unit:'million km' },
    b:{ label:'Earth’s orbit', value:149.6, unit:'million km' },
    src:'NASA planetary fact sheets, mean orbital distance.' },

  { id:'sun-mass-share', type:'percent', cat:'Space',
    q:'What percent of the Solar System’s mass is the Sun?',
    a:{ label:'Sun', value:1.9885e30, unit:'kg' },
    b:{ label:'Solar System total', value:1.9912e30, unit:'kg' },
    src:'Sun mass NASA; planets contribute ~2.7e27 kg, Jupiter most of it.' },

  { id:'light-sun-moon', type:'ratio', cat:'Space',
    q:'Sunlight takes about 8 minutes to reach us. How many times longer is that than light from the Moon?',
    a:{ label:'Light from the Sun', value:499, unit:'seconds' },
    b:{ label:'Light from the Moon', value:1.28, unit:'seconds' },
    src:'Derived from mean distances at the speed of light.' },

  { id:'venus-day-year', type:'ratio', cat:'Space',
    q:'How many times longer is a day on Venus than a year on Venus?',
    a:{ label:'Venus day, one rotation', value:243, unit:'Earth days' },
    b:{ label:'Venus year, one orbit', value:224.7, unit:'Earth days' },
    src:'NASA Venus fact sheet. Venus really does rotate slower than it orbits.' },

  /* --------------------------------------------------------------- nature */
  { id:'whale-elephant', type:'ratio', cat:'Nature',
    q:'How many times heavier is a blue whale than an African elephant?',
    a:{ label:'Blue whale', value:150000, unit:'kg' },
    b:{ label:'African bush elephant', value:6000, unit:'kg' },
    src:'Typical adult masses; both species vary widely. NOAA; WWF.' },

  { id:'falcon-cheetah', type:'ratio', cat:'Nature',
    q:'How many times faster is a diving peregrine falcon than a sprinting cheetah?',
    a:{ label:'Peregrine falcon, stoop', value:320, unit:'km/h' },
    b:{ label:'Cheetah, sprint', value:120, unit:'km/h' },
    src:'Falcon dive speeds are measured in stoops, not level flight.' },

  { id:'cheetah-bolt', type:'ratio', cat:'Nature',
    q:'How many times faster is a cheetah than Usain Bolt at his fastest?',
    a:{ label:'Cheetah, sprint', value:120, unit:'km/h' },
    b:{ label:'Usain Bolt, peak', value:44.72, unit:'km/h' },
    src:'Bolt’s peak was measured over 60–80 m of the 2009 world-record 100 m.' },

  { id:'giraffe-human', type:'ratio', cat:'Nature',
    q:'How many times taller is a giraffe than an average adult man?',
    a:{ label:'Giraffe', value:5.5, unit:'m' },
    b:{ label:'Adult man, global mean', value:1.71, unit:'m' },
    src:'Giraffe heights vary 4.3–5.9 m; 5.5 m is a typical adult bull.' },

  { id:'ostrich-chicken-egg', type:'ratio', cat:'Nature',
    q:'How many times heavier is an ostrich egg than a chicken egg?',
    a:{ label:'Ostrich egg', value:1400, unit:'g' },
    b:{ label:'Chicken egg, large', value:50, unit:'g' },
    src:'Typical masses; a large hen egg is graded at about 50 g of contents.' },

  { id:'hyperion-human', type:'ratio', cat:'Nature',
    q:'How many times taller is the tallest tree on Earth than an average adult man?',
    a:{ label:'Hyperion, coast redwood', value:115.9, unit:'m' },
    b:{ label:'Adult man, global mean', value:1.71, unit:'m' },
    src:'Hyperion measured at 115.92 m in 2019; its location is undisclosed.' },

  { id:'bee-wingbeat', type:'ratio', cat:'Nature',
    q:'How many times faster does a honeybee beat its wings than a hummingbird?',
    a:{ label:'Honeybee', value:230, unit:'beats/sec' },
    b:{ label:'Ruby-throated hummingbird', value:53, unit:'beats/sec' },
    src:'Typical hovering wingbeat frequencies.' },

  /* ----------------------------------------------------------------- body */
  { id:'newborn-adult-bones', type:'ratio', cat:'Body',
    q:'How many times more bones does a newborn have than an adult?',
    a:{ label:'Newborn', value:300, unit:'bones' },
    b:{ label:'Adult', value:206, unit:'bones' },
    src:'Newborn count is approximate; many bones later fuse.' },

  { id:'body-water', type:'percent', cat:'Body',
    q:'What percent of an adult human body is water, by mass?',
    a:{ label:'Water', value:60, unit:'kg per 100 kg' },
    b:{ label:'Body mass', value:100, unit:'kg' },
    src:'USGS / Mayo Clinic; adult men average ~60%, women ~55%.' },

  { id:'brain-body-energy', type:'percent', cat:'Body',
    q:'The brain is about 2% of body mass. What percent of the body’s energy does it use at rest?',
    a:{ label:'Brain, at rest', value:20, unit:'% of energy' },
    b:{ label:'Whole body', value:100, unit:'%' },
    src:'Widely cited physiological estimate, roughly one fifth.' },

  { id:'heart-beats', type:'ratio', cat:'Body',
    q:'How many times faster does a resting mouse heart beat than a resting human heart?',
    a:{ label:'Mouse, resting', value:600, unit:'bpm' },
    b:{ label:'Human, resting', value:70, unit:'bpm' },
    src:'Typical resting rates; mouse rates range roughly 500–700 bpm.' },

  /* ------------------------------------------------------------- building */
  { id:'burj-empire', type:'ratio', cat:'Built',
    q:'How many times taller is the Burj Khalifa than the Empire State Building?',
    a:{ label:'Burj Khalifa', value:828, unit:'m' },
    b:{ label:'Empire State Building', value:443.2, unit:'m' },
    src:'Architectural height including spire, CTBUH.' },

  { id:'eiffel-liberty', type:'ratio', cat:'Built',
    q:'How many times taller is the Eiffel Tower than the Statue of Liberty?',
    a:{ label:'Eiffel Tower', value:330, unit:'m' },
    b:{ label:'Statue of Liberty', value:93, unit:'m' },
    src:'Eiffel to tip incl. antennas. Liberty from ground to torch.' },

  { id:'pyramid-liberty', type:'ratio', cat:'Built',
    q:'How many times taller is the Great Pyramid of Giza than the Statue of Liberty?',
    a:{ label:'Great Pyramid, original', value:146.6, unit:'m' },
    b:{ label:'Statue of Liberty', value:93, unit:'m' },
    src:'Pyramid original height; it now stands about 138.5 m.' },

  { id:'wall-nile', type:'ratio', cat:'Built',
    q:'How many times longer is the Great Wall of China than the Nile?',
    a:{ label:'Great Wall, all branches', value:21196, unit:'km' },
    b:{ label:'Nile', value:6650, unit:'km' },
    src:'2012 Chinese state survey of all walls and branches.' },

  /* ------------------------------------------------------------ transport */
  { id:'747-wright', type:'ratio', cat:'Transport',
    q:'How many times wider is a Boeing 747’s wingspan than the Wright Flyer’s?',
    a:{ label:'Boeing 747-400', value:64.4, unit:'m' },
    b:{ label:'Wright Flyer, 1903', value:12.3, unit:'m' },
    src:'Boeing specifications; Smithsonian National Air and Space Museum.' },

  { id:'icon-titanic', type:'ratio', cat:'Transport',
    q:'How many times longer is the cruise ship Icon of the Seas than the Titanic?',
    a:{ label:'Icon of the Seas', value:364.75, unit:'m' },
    b:{ label:'Titanic', value:269.1, unit:'m' },
    src:'Royal Caribbean specifications; Titanic length overall.' },

  { id:'concorde-747', type:'ratio', cat:'Transport',
    q:'How many times faster did Concorde cruise than a Boeing 747?',
    a:{ label:'Concorde', value:2180, unit:'km/h' },
    b:{ label:'Boeing 747', value:917, unit:'km/h' },
    src:'Concorde cruised at Mach 2.04; 747 typical cruise Mach 0.85.' },

  { id:'tgv-car', type:'ratio', cat:'Transport',
    q:'How many times faster is the TGV world rail record than a motorway speed limit of 110 km/h?',
    a:{ label:'TGV record, 2007', value:574.8, unit:'km/h' },
    b:{ label:'Motorway limit', value:110, unit:'km/h' },
    src:'SNCF TGV POS set 574.8 km/h on 3 April 2007.' },

  /* ---------------------------------------------------------------- sport */
  { id:'marathon-100m', type:'ratio', cat:'Sport',
    q:'How many times longer is a marathon than a 100 m sprint?',
    a:{ label:'Marathon', value:42195, unit:'m' },
    b:{ label:'Sprint', value:100, unit:'m' },
    src:'World Athletics standard marathon distance.' },

  { id:'pool-court', type:'ratio', cat:'Sport',
    q:'How many times longer is an Olympic pool than an NBA basketball court?',
    a:{ label:'Olympic pool', value:50, unit:'m' },
    b:{ label:'NBA court', value:28.65, unit:'m' },
    src:'World Aquatics; NBA court is 94 ft long.' },

  { id:'pitch-tennis', type:'ratio', cat:'Sport',
    q:'How many times longer is a football pitch than a tennis court?',
    a:{ label:'Football pitch, typical', value:105, unit:'m' },
    b:{ label:'Tennis court', value:23.77, unit:'m' },
    src:'FIFA recommends 105 m; ITF court length is fixed.' },

  { id:'golf-hole', type:'ratio', cat:'Sport',
    q:'How many times wider is a golf hole than a golf ball?',
    a:{ label:'Golf hole', value:108, unit:'mm' },
    b:{ label:'Golf ball', value:42.67, unit:'mm' },
    src:'R&A and USGA rules: hole 4.25 in, ball minimum 1.68 in.' },

  /* ------------------------------------------------------------- distance */
  { id:'ny-la-london', type:'ratio', cat:'Distance',
    q:'How many times further is New York to Los Angeles than London to Paris?',
    a:{ label:'New York to Los Angeles', value:3936, unit:'km' },
    b:{ label:'London to Paris', value:344, unit:'km' },
    src:'Great-circle distances between city centres.' },

  { id:'sydney-newyork', type:'ratio', cat:'Distance',
    q:'How many times further is London to Sydney than London to New York?',
    a:{ label:'London to Sydney', value:16994, unit:'km' },
    b:{ label:'London to New York', value:5570, unit:'km' },
    src:'Great-circle distances between city centres.' },

  /* ----------------------------------------------------------------- time */
  { id:'rome-usa', type:'ratio', cat:'Time',
    q:'How many times longer did the Western Roman Empire last than the United States has existed so far?',
    a:{ label:'Western Roman Empire, 27 BC – AD 476', value:503, unit:'years' },
    b:{ label:'United States, 1776 – 2026', value:250, unit:'years' },
    src:'Conventional dates; the empire’s end date is a scholarly convention.' },

  { id:'pyramid-cleopatra', type:'ratio', cat:'Time',
    q:'Cleopatra lived closer to the Moon landing than to the building of the Great Pyramid. How many times further back was the pyramid?',
    a:{ label:'Pyramid to Cleopatra', value:2530, unit:'years' },
    b:{ label:'Cleopatra to Moon landing', value:1999, unit:'years' },
    src:'Pyramid c. 2560 BC, Cleopatra died 30 BC, Apollo 11 in 1969.' },

  { id:'dino-tyrannosaurus', type:'ratio', cat:'Time',
    q:'How many times longer ago did Stegosaurus live than Tyrannosaurus?',
    a:{ label:'Stegosaurus', value:150, unit:'million years ago' },
    b:{ label:'Tyrannosaurus', value:67, unit:'million years ago' },
    src:'Stegosaurus late Jurassic; T. rex late Cretaceous.' },

  { id:'shark-tree', type:'ratio', cat:'Time',
    q:'Sharks are older than trees. How many times longer have sharks been around?',
    a:{ label:'Earliest sharks', value:450, unit:'million years' },
    b:{ label:'Earliest trees', value:385, unit:'million years' },
    src:'Shark-like fossils from the Ordovician; Archaeopteris from the Devonian.' },

  /* ------------------------------------------------------------ materials */
  { id:'steel-aluminium', type:'ratio', cat:'Scale',
    q:'How many times denser is steel than aluminium?',
    a:{ label:'Steel', value:7850, unit:'kg/m³' },
    b:{ label:'Aluminium', value:2700, unit:'kg/m³' },
    src:'Typical carbon steel and pure aluminium densities.' },

  { id:'gold-water', type:'ratio', cat:'Scale',
    q:'How many times denser is gold than water?',
    a:{ label:'Gold', value:19320, unit:'kg/m³' },
    b:{ label:'Water at 4 °C', value:1000, unit:'kg/m³' },
    src:'Standard densities.' },

  { id:'diamond-steel', type:'ratio', cat:'Scale',
    q:'How many times harder is diamond than quartz on the absolute hardness scale?',
    a:{ label:'Diamond', value:1600, unit:'absolute hardness' },
    b:{ label:'Quartz', value:100, unit:'absolute hardness' },
    src:'Absolute hardness values behind the Mohs scale.' },

  { id:'hair-paper', type:'ratio', cat:'Scale',
    q:'How many times thicker is a sheet of printer paper than a human hair?',
    a:{ label:'Printer paper, 80 gsm', value:100, unit:'µm' },
    b:{ label:'Human hair', value:70, unit:'µm' },
    src:'Hair diameter ranges roughly 17–180 µm; 70 µm is a mid estimate.' },

  /* ------------------------------------------------------------- everyday */
  { id:'coffee-tea-caffeine', type:'ratio', cat:'Everyday',
    q:'How many times more caffeine is in a cup of brewed coffee than a cup of black tea?',
    a:{ label:'Brewed coffee, 240 ml', value:95, unit:'mg' },
    b:{ label:'Black tea, 240 ml', value:47, unit:'mg' },
    src:'USDA / Mayo Clinic typical values; brewing changes both a lot.' },

  { id:'banana-apple-sugar', type:'ratio', cat:'Everyday',
    q:'How many times more potassium is in a banana than in an apple, gram for gram?',
    a:{ label:'Banana', value:358, unit:'mg per 100 g' },
    b:{ label:'Apple', value:107, unit:'mg per 100 g' },
    src:'USDA FoodData Central, raw fruit.' },

  { id:'a4-a3', type:'ratio', cat:'Everyday',
    q:'How many times bigger is A0 paper than A4?',
    a:{ label:'A0', value:999949, unit:'mm², about 1 m²' },
    b:{ label:'A4', value:62370, unit:'mm²' },
    src:'ISO 216: each step halves the area, A0 to A4 is four halvings.' },

  { id:'marathon-everest', type:'ratio', cat:'Everyday',
    q:'How many times further is a marathon than the height of Mount Everest?',
    a:{ label:'Marathon', value:42195, unit:'m' },
    b:{ label:'Mount Everest', value:8849, unit:'m' },
    src:'World Athletics; 2020 Everest joint survey.' },

  { id:'football-pool-area', type:'ratio', cat:'Everyday',
    q:'How many times more area does a football pitch cover than a tennis court?',
    a:{ label:'Football pitch, 105 × 68 m', value:7140, unit:'m²' },
    b:{ label:'Tennis court, 23.77 × 10.97 m', value:260.76, unit:'m²' },
    src:'FIFA recommended pitch; ITF doubles court.' },

  /* --------------------------------------------------------------- energy */
  { id:'sun-earth-energy', type:'percent', cat:'Space',
    q:'What percent of the Sun’s radius is its core, where fusion happens?',
    a:{ label:'Core radius', value:0.25, unit:'× solar radius' },
    b:{ label:'Solar radius', value:1, unit:'× solar radius' },
    src:'The core extends to roughly 20–25% of the Sun’s radius.' },

  { id:'atmosphere-mass', type:'percent', cat:'Earth',
    q:'What percent of the atmosphere’s mass sits below the cruising altitude of an airliner, 11 km?',
    a:{ label:'Below 11 km', value:75, unit:'% of mass' },
    b:{ label:'Whole atmosphere', value:100, unit:'%' },
    src:'About three quarters of atmospheric mass is in the troposphere.' },

  { id:'desert-land', type:'percent', cat:'Earth',
    q:'What percent of Earth’s land surface is desert?',
    a:{ label:'Desert', value:49, unit:'million km²' },
    b:{ label:'Total land', value:149, unit:'million km²' },
    src:'Includes cold deserts such as Antarctica; definitions vary.' },

  { id:'amazon-brazil', type:'percent', cat:'Earth',
    q:'What percent of the Amazon rainforest is in Brazil?',
    a:{ label:'In Brazil', value:3.6, unit:'million km²' },
    b:{ label:'Whole rainforest', value:6.0, unit:'million km²' },
    src:'Amazon Conservation Association; the rest spans eight other countries.' },

  { id:'antarctica-ice', type:'percent', cat:'Earth',
    q:'What percent of the world’s fresh water is locked in the Antarctic ice sheet?',
    a:{ label:'Antarctic ice sheet', value:24.4, unit:'million km³' },
    b:{ label:'All fresh water', value:35, unit:'million km³' },
    src:'British Antarctic Survey; USGS fresh water total.' },

  { id:'pacific-earth-surface', type:'percent', cat:'Earth',
    q:'What percent of Earth’s entire surface is the Pacific Ocean?',
    a:{ label:'Pacific Ocean', value:165.25, unit:'million km²' },
    b:{ label:'Earth’s surface', value:510.1, unit:'million km²' },
    src:'NOAA ocean areas; total surface area of Earth.' },

];
