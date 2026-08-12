/* ============================================================
   Periodic table dataset — reference data only, no logic.
   Fields: z;symbol;name;category;mass;group;period;state;configuration;use
   - group is blank for f-block elements (lanthanides, actinides)
   - masses in parentheses are the most stable isotope
   - state and configuration for z >= 104 are predicted, not measured
   ============================================================ */
window.PERIODIC_ELEMENTS = (function () {
  "use strict";

  var ROWS = `1;H;Hydrogen;nm;1.008;1;1;gas;1s1;Rocket fuel, ammonia production, and the fuel of every star
2;He;Helium;ng;4.003;18;1;gas;1s2;Cooling MRI magnets and lifting balloons
3;Li;Lithium;am;6.94;1;2;solid;[He]2s1;Rechargeable batteries in phones and cars
4;Be;Beryllium;ae;9.012;2;2;solid;[He]2s2;Lightweight, stiff parts for aerospace and X-ray windows
5;B;Boron;mt;10.81;13;2;solid;[He]2s2 2p1;Borosilicate glass and fiberglass insulation
6;C;Carbon;nm;12.011;14;2;solid;[He]2s2 2p2;The backbone of every organic molecule; also steel and diamonds
7;N;Nitrogen;nm;14.007;15;2;gas;[He]2s2 2p3;78% of the air; fertilizer and food packaging
8;O;Oxygen;nm;15.999;16;2;gas;[He]2s2 2p4;Breathing, combustion, and steelmaking
9;F;Fluorine;hl;18.998;17;2;gas;[He]2s2 2p5;Toothpaste additives and non-stick coatings
10;Ne;Neon;ng;20.180;18;2;gas;[He]2s2 2p6;Glowing orange-red signage
11;Na;Sodium;am;22.990;1;3;solid;[Ne]3s1;Table salt and street lamps
12;Mg;Magnesium;ae;24.305;2;3;solid;[Ne]3s2;Lightweight alloys and the center of chlorophyll
13;Al;Aluminum;pt;26.982;13;3;solid;[Ne]3s2 3p1;Cans, foil, aircraft frames
14;Si;Silicon;mt;28.085;14;3;solid;[Ne]3s2 3p2;Computer chips, solar cells, glass
15;P;Phosphorus;nm;30.974;15;3;solid;[Ne]3s2 3p3;Fertilizer, matches, and your DNA backbone
16;S;Sulfur;nm;32.06;16;3;solid;[Ne]3s2 3p4;Sulfuric acid and vulcanized rubber
17;Cl;Chlorine;hl;35.45;17;3;gas;[Ne]3s2 3p5;Water disinfection and PVC plastic
18;Ar;Argon;ng;39.95;18;3;gas;[Ne]3s2 3p6;Shielding gas for welding; fills light bulbs
19;K;Potassium;am;39.098;1;4;solid;[Ar]4s1;Fertilizer and nerve signaling in your body
20;Ca;Calcium;ae;40.078;2;4;solid;[Ar]4s2;Bones, teeth, cement, and chalk
21;Sc;Scandium;tm;44.956;3;4;solid;[Ar]3d1 4s2;Strong aluminum alloys for bike frames
22;Ti;Titanium;tm;47.867;4;4;solid;[Ar]3d2 4s2;Jet engines and medical implants
23;V;Vanadium;tm;50.942;5;4;solid;[Ar]3d3 4s2;Tough tool steel and grid-scale batteries
24;Cr;Chromium;tm;51.996;6;4;solid;[Ar]3d5 4s1;Stainless steel and shiny plating
25;Mn;Manganese;tm;54.938;7;4;solid;[Ar]3d5 4s2;Hardens steel; also in dry-cell batteries
26;Fe;Iron;tm;55.845;8;4;solid;[Ar]3d6 4s2;Steel, and the oxygen carrier in your blood
27;Co;Cobalt;tm;58.933;9;4;solid;[Ar]3d7 4s2;Battery cathodes and blue pigments
28;Ni;Nickel;tm;58.693;10;4;solid;[Ar]3d8 4s2;Stainless steel and coins
29;Cu;Copper;tm;63.546;11;4;solid;[Ar]3d10 4s1;Electrical wiring and plumbing
30;Zn;Zinc;tm;65.38;12;4;solid;[Ar]3d10 4s2;Galvanizing steel against rust
31;Ga;Gallium;pt;69.723;13;4;solid;[Ar]3d10 4s2 4p1;LEDs and fast semiconductors; melts in your hand
32;Ge;Germanium;mt;72.630;14;4;solid;[Ar]3d10 4s2 4p2;Fiber optics and infrared lenses
33;As;Arsenic;mt;74.922;15;4;solid;[Ar]3d10 4s2 4p3;Semiconductor doping; historically a poison
34;Se;Selenium;nm;78.971;16;4;solid;[Ar]3d10 4s2 4p4;Photocopier drums and anti-dandruff shampoo
35;Br;Bromine;hl;79.904;17;4;liquid;[Ar]3d10 4s2 4p5;Flame retardants; one of two liquid elements
36;Kr;Krypton;ng;83.798;18;4;gas;[Ar]3d10 4s2 4p6;High-performance lighting and photo flashes
37;Rb;Rubidium;am;85.468;1;5;solid;[Kr]5s1;Atomic clocks and specialty glass
38;Sr;Strontium;ae;87.62;2;5;solid;[Kr]5s2;Brilliant red fireworks
39;Y;Yttrium;tm;88.906;3;5;solid;[Kr]4d1 5s2;LED phosphors and superconductors
40;Zr;Zirconium;tm;91.224;4;5;solid;[Kr]4d2 5s2;Nuclear fuel cladding and fake diamonds
41;Nb;Niobium;tm;92.906;5;5;solid;[Kr]4d4 5s1;Superconducting magnets and pipeline steel
42;Mo;Molybdenum;tm;95.95;6;5;solid;[Kr]4d5 5s1;High-temperature alloys and lubricants
43;Tc;Technetium;tm;(98);7;5;solid;[Kr]4d5 5s2;Medical imaging tracers; first synthetic element
44;Ru;Ruthenium;tm;101.07;8;5;solid;[Kr]4d7 5s1;Wear-resistant electrical contacts
45;Rh;Rhodium;tm;102.91;9;5;solid;[Kr]4d8 5s1;Catalytic converters; rarer than gold
46;Pd;Palladium;tm;106.42;10;5;solid;[Kr]4d10;Catalytic converters and electronics
47;Ag;Silver;tm;107.87;11;5;solid;[Kr]4d10 5s1;Best electrical conductor; jewelry and solar cells
48;Cd;Cadmium;tm;112.41;12;5;solid;[Kr]4d10 5s2;Rechargeable batteries and pigments; quite toxic
49;In;Indium;pt;114.82;13;5;solid;[Kr]4d10 5s2 5p1;Touchscreen coatings
50;Sn;Tin;pt;118.71;14;5;solid;[Kr]4d10 5s2 5p2;Solder and food-can plating
51;Sb;Antimony;mt;121.76;15;5;solid;[Kr]4d10 5s2 5p3;Flame retardants and lead-acid batteries
52;Te;Tellurium;mt;127.60;16;5;solid;[Kr]4d10 5s2 5p4;Thin-film solar panels
53;I;Iodine;hl;126.90;17;5;solid;[Kr]4d10 5s2 5p5;Antiseptics and thyroid function
54;Xe;Xenon;ng;131.29;18;5;gas;[Kr]4d10 5s2 5p6;Car headlights and ion thrusters
55;Cs;Cesium;am;132.91;1;6;solid;[Xe]6s1;Defines the second in atomic clocks
56;Ba;Barium;ae;137.33;2;6;solid;[Xe]6s2;Contrast agent for medical X-rays
57;La;Lanthanum;ln;138.91;;6;solid;[Xe]5d1 6s2;Camera lenses and hybrid car batteries
58;Ce;Cerium;ln;140.12;;6;solid;[Xe]4f1 5d1 6s2;Lighter flints and glass polishing
59;Pr;Praseodymium;ln;140.91;;6;solid;[Xe]4f3 6s2;Strong magnets and welding goggles
60;Nd;Neodymium;ln;144.24;;6;solid;[Xe]4f4 6s2;The strongest permanent magnets made
61;Pm;Promethium;ln;(145);;6;solid;[Xe]4f5 6s2;Glow-in-the-dark paint and nuclear batteries
62;Sm;Samarium;ln;150.36;;6;solid;[Xe]4f6 6s2;Magnets that survive high heat
63;Eu;Europium;ln;151.96;;6;solid;[Xe]4f7 6s2;Red and blue phosphors; anti-counterfeit euro ink
64;Gd;Gadolinium;ln;157.25;;6;solid;[Xe]4f7 5d1 6s2;MRI contrast agents
65;Tb;Terbium;ln;158.93;;6;solid;[Xe]4f9 6s2;Green phosphors in displays
66;Dy;Dysprosium;ln;162.50;;6;solid;[Xe]4f10 6s2;Keeps EV motor magnets working when hot
67;Ho;Holmium;ln;164.93;;6;solid;[Xe]4f11 6s2;Surgical lasers; strongest magnetic element
68;Er;Erbium;ln;167.26;;6;solid;[Xe]4f12 6s2;Amplifies signals in fiber optic cables
69;Tm;Thulium;ln;168.93;;6;solid;[Xe]4f13 6s2;Portable X-ray sources
70;Yb;Ytterbium;ln;173.05;;6;solid;[Xe]4f14 6s2;Ultra-precise optical clocks
71;Lu;Lutetium;ln;174.97;;6;solid;[Xe]4f14 5d1 6s2;PET scan detectors and oil refining catalysts
72;Hf;Hafnium;tm;178.49;4;6;solid;[Xe]4f14 5d2 6s2;Nuclear reactor control rods and chip insulation
73;Ta;Tantalum;tm;180.95;5;6;solid;[Xe]4f14 5d3 6s2;Capacitors in nearly every phone
74;W;Tungsten;tm;183.84;6;6;solid;[Xe]4f14 5d4 6s2;Highest melting point; drill bits and filaments
75;Re;Rhenium;tm;186.21;7;6;solid;[Xe]4f14 5d5 6s2;Jet engine turbine blades
76;Os;Osmium;tm;190.23;8;6;solid;[Xe]4f14 5d6 6s2;Densest natural element; pen nibs and pivots
77;Ir;Iridium;tm;192.22;9;6;solid;[Xe]4f14 5d7 6s2;Spark plugs; the layer marking the dinosaur extinction
78;Pt;Platinum;tm;195.08;10;6;solid;[Xe]4f14 5d9 6s1;Catalysts, lab equipment, jewelry
79;Au;Gold;tm;196.97;11;6;solid;[Xe]4f14 5d10 6s1;Currency, jewelry, and corrosion-proof contacts
80;Hg;Mercury;tm;200.59;12;6;liquid;[Xe]4f14 5d10 6s2;The only liquid metal at room temperature
81;Tl;Thallium;pt;204.38;13;6;solid;[Xe]4f14 5d10 6s2 6p1;Infrared detectors; notoriously poisonous
82;Pb;Lead;pt;207.2;14;6;solid;[Xe]4f14 5d10 6s2 6p2;Car batteries and radiation shielding
83;Bi;Bismuth;pt;208.98;15;6;solid;[Xe]4f14 5d10 6s2 6p3;Stomach medicine and non-toxic lead substitutes
84;Po;Polonium;pt;(209);16;6;solid;[Xe]4f14 5d10 6s2 6p4;Anti-static brushes; intensely radioactive
85;At;Astatine;hl;(210);17;6;solid;[Xe]4f14 5d10 6s2 6p5;Rarest natural element; studied for cancer therapy
86;Rn;Radon;ng;(222);18;6;gas;[Xe]4f14 5d10 6s2 6p6;Radioactive gas that seeps into basements
87;Fr;Francium;am;(223);1;7;solid;[Rn]7s1;Pure research only; decays within minutes
88;Ra;Radium;ae;(226);2;7;solid;[Rn]7s2;Once used in glowing watch dials
89;Ac;Actinium;ac;(227);;7;solid;[Rn]6d1 7s2;Targeted alpha therapy for cancer
90;Th;Thorium;ac;232.04;;7;solid;[Rn]6d2 7s2;Potential alternative nuclear fuel
91;Pa;Protactinium;ac;231.04;;7;solid;[Rn]5f2 6d1 7s2;Dating ocean sediments; little practical use
92;U;Uranium;ac;238.03;;7;solid;[Rn]5f3 6d1 7s2;Nuclear reactor fuel and weapons
93;Np;Neptunium;ac;(237);;7;solid;[Rn]5f4 6d1 7s2;Neutron detectors; first element past uranium
94;Pu;Plutonium;ac;(244);;7;solid;[Rn]5f6 7s2;Reactor fuel and deep-space power supplies
95;Am;Americium;ac;(243);;7;solid;[Rn]5f7 7s2;Smoke detectors
96;Cm;Curium;ac;(247);;7;solid;[Rn]5f7 6d1 7s2;Powers instruments on Mars rovers
97;Bk;Berkelium;ac;(247);;7;solid;[Rn]5f9 7s2;Used to synthesize heavier elements
98;Cf;Californium;ac;(251);;7;solid;[Rn]5f10 7s2;Neutron source for scanning cargo and reactors
99;Es;Einsteinium;ac;(252);;7;solid;[Rn]5f11 7s2;Research only; found in H-bomb debris
100;Fm;Fermium;ac;(257);;7;solid;[Rn]5f12 7s2;Research only; too short-lived to use
101;Md;Mendelevium;ac;(258);;7;solid;[Rn]5f13 7s2;Named for the table's inventor
102;No;Nobelium;ac;(259);;7;solid;[Rn]5f14 7s2;Research only; made a few atoms at a time
103;Lr;Lawrencium;ac;(266);;7;solid;[Rn]5f14 7s2 7p1;Research only; closes the actinide row
104;Rf;Rutherfordium;tm;(267);4;7;unknown;[Rn]5f14 6d2 7s2;Research only; half-life measured in hours
105;Db;Dubnium;tm;(268);5;7;unknown;[Rn]5f14 6d3 7s2;Research only
106;Sg;Seaborgium;tm;(269);6;7;unknown;[Rn]5f14 6d4 7s2;Research only; named for Glenn Seaborg
107;Bh;Bohrium;tm;(270);7;7;unknown;[Rn]5f14 6d5 7s2;Research only
108;Hs;Hassium;tm;(269);8;7;unknown;[Rn]5f14 6d6 7s2;Research only
109;Mt;Meitnerium;uk;(278);9;7;unknown;[Rn]5f14 6d7 7s2;Research only; named for Lise Meitner
110;Ds;Darmstadtium;uk;(281);10;7;unknown;[Rn]5f14 6d8 7s2;Research only
111;Rg;Roentgenium;uk;(282);11;7;unknown;[Rn]5f14 6d9 7s2;Research only; named for the X-ray discoverer
112;Cn;Copernicium;tm;(285);12;7;unknown;[Rn]5f14 6d10 7s2;Research only; may behave like a gas
113;Nh;Nihonium;uk;(286);13;7;unknown;[Rn]5f14 6d10 7s2 7p1;Research only; first element named in Japan
114;Fl;Flerovium;uk;(289);14;7;unknown;[Rn]5f14 6d10 7s2 7p2;Research only
115;Mc;Moscovium;uk;(290);15;7;unknown;[Rn]5f14 6d10 7s2 7p3;Research only
116;Lv;Livermorium;uk;(293);16;7;unknown;[Rn]5f14 6d10 7s2 7p4;Research only
117;Ts;Tennessine;uk;(294);17;7;unknown;[Rn]5f14 6d10 7s2 7p5;Research only; named for Tennessee
118;Og;Oganesson;uk;(294);18;7;unknown;[Rn]5f14 6d10 7s2 7p6;Research only; heaviest element yet made`;

  return ROWS.split("\n").map(function (line) {
    var f = line.split(";");
    var z = +f[0];
    var row, col;
    if (z >= 57 && z <= 71) { row = 9; col = 3 + (z - 57); }
    else if (z >= 89 && z <= 103) { row = 10; col = 3 + (z - 89); }
    else { row = +f[6]; col = +f[5]; }
    return {
      z: z,
      sym: f[1],
      name: f[2],
      cat: f[3],
      mass: f[4],
      group: f[5] === "" ? null : +f[5],
      period: +f[6],
      state: f[7],
      config: f[8],
      use: f[9],
      row: row,
      col: col
    };
  });
})();
