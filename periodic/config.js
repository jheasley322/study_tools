/* ============================================================
   Spectra — configuration only. No game logic lives here.
   Edit ranges, scoring, badges, and tolerances in this file.
   ============================================================ */
window.SPECTRA_CONFIG = (function () {
  "use strict";

  var RAW = "1 H Hydrogen nm|2 He Helium ng|3 Li Lithium am|4 Be Beryllium ae|5 B Boron mt|6 C Carbon nm|7 N Nitrogen nm|8 O Oxygen nm|9 F Fluorine hl|10 Ne Neon ng|11 Na Sodium am|12 Mg Magnesium ae|13 Al Aluminum pt|14 Si Silicon mt|15 P Phosphorus nm|16 S Sulfur nm|17 Cl Chlorine hl|18 Ar Argon ng|19 K Potassium am|20 Ca Calcium ae|21 Sc Scandium tm|22 Ti Titanium tm|23 V Vanadium tm|24 Cr Chromium tm|25 Mn Manganese tm|26 Fe Iron tm|27 Co Cobalt tm|28 Ni Nickel tm|29 Cu Copper tm|30 Zn Zinc tm|31 Ga Gallium pt|32 Ge Germanium mt|33 As Arsenic mt|34 Se Selenium nm|35 Br Bromine hl|36 Kr Krypton ng|37 Rb Rubidium am|38 Sr Strontium ae|39 Y Yttrium tm|40 Zr Zirconium tm|41 Nb Niobium tm|42 Mo Molybdenum tm|43 Tc Technetium tm|44 Ru Ruthenium tm|45 Rh Rhodium tm|46 Pd Palladium tm|47 Ag Silver tm|48 Cd Cadmium tm|49 In Indium pt|50 Sn Tin pt|51 Sb Antimony mt|52 Te Tellurium mt|53 I Iodine hl|54 Xe Xenon ng|55 Cs Cesium am|56 Ba Barium ae|57 La Lanthanum ln|58 Ce Cerium ln|59 Pr Praseodymium ln|60 Nd Neodymium ln|61 Pm Promethium ln|62 Sm Samarium ln|63 Eu Europium ln|64 Gd Gadolinium ln|65 Tb Terbium ln|66 Dy Dysprosium ln|67 Ho Holmium ln|68 Er Erbium ln|69 Tm Thulium ln|70 Yb Ytterbium ln|71 Lu Lutetium ln|72 Hf Hafnium tm|73 Ta Tantalum tm|74 W Tungsten tm|75 Re Rhenium tm|76 Os Osmium tm|77 Ir Iridium tm|78 Pt Platinum tm|79 Au Gold tm|80 Hg Mercury tm|81 Tl Thallium pt|82 Pb Lead pt|83 Bi Bismuth pt|84 Po Polonium pt|85 At Astatine hl|86 Rn Radon ng|87 Fr Francium am|88 Ra Radium ae|89 Ac Actinium ac|90 Th Thorium ac|91 Pa Protactinium ac|92 U Uranium ac|93 Np Neptunium ac|94 Pu Plutonium ac|95 Am Americium ac|96 Cm Curium ac|97 Bk Berkelium ac|98 Cf Californium ac|99 Es Einsteinium ac|100 Fm Fermium ac|101 Md Mendelevium ac|102 No Nobelium ac|103 Lr Lawrencium ac|104 Rf Rutherfordium tm|105 Db Dubnium tm|106 Sg Seaborgium tm|107 Bh Bohrium tm|108 Hs Hassium tm|109 Mt Meitnerium uk|110 Ds Darmstadtium uk|111 Rg Roentgenium uk|112 Cn Copernicium tm|113 Nh Nihonium uk|114 Fl Flerovium uk|115 Mc Moscovium uk|116 Lv Livermorium uk|117 Ts Tennessine uk|118 Og Oganesson uk";

  return {
    appId: "periodic",

    elements: RAW.split("|").map(function (row) {
      var p = row.split(" ");
      return { z: +p[0], sym: p[1], name: p[2], cat: p[3] };
    }),

    categoryNames: {
      nm: "Reactive nonmetal", ng: "Noble gas", am: "Alkali metal",
      ae: "Alkaline earth", mt: "Metalloid", hl: "Halogen",
      pt: "Post-transition metal", tm: "Transition metal",
      ln: "Lanthanide", ac: "Actinide", uk: "Unknown properties"
    },

    categoryColors: {
      nm: "#7FD4FF", ng: "#C39BFF", am: "#FF9E7A", ae: "#FFC24B",
      mt: "#8FE3C4", hl: "#6FE0FF", pt: "#B9C3DA", tm: "#FFD98A",
      ln: "#FF9ECF", ac: "#FF8FA3", uk: "#828CA6"
    },

    /* Accepted alternates by atomic number — international and archaic spellings. */
    altNames: {
      13: ["aluminium"],
      16: ["sulphur"],
      55: ["caesium"],
      41: ["columbium"],
      104: ["kurchatovium"]
    },

    /* Typo tolerance: max edit distance by target word length. */
    spelling: [
      { upTo: 6, tolerance: 1 },
      { upTo: 10, tolerance: 2 },
      { upTo: 99, tolerance: 3 }
    ],

    scoring: {
      basePoints: 10,
      streakPerStep: 3,     // multiplier climbs one step every N correct
      maxMultiplier: 5,
      lives: 3,
      xpDivisor: 10,        // run score / this = XP banked to the global level
      revealMs: 850         // pause on a correct answer before the next card
    },

    presets: [
      { v: 20, l: "1\u201320" }, { v: 36, l: "1\u201336" }, { v: 54, l: "1\u201354" },
      { v: 86, l: "1\u201386" }, { v: 118, l: "All 118" }
    ],
    directions: [
      { v: "z2n", l: "Number \u2192 name" },
      { v: "n2z", l: "Name \u2192 number" },
      { v: "mix", l: "Mix both" }
    ],
    modes: [
      { v: "type", l: "Type it" },
      { v: "pick", l: "Pick from 4" }
    ],

    defaults: { max: 36, dir: "mix", mode: "type" },

    badges: [
      { id: "ignite", name: "Ignition",       hint: "10 correct in one run" },
      { id: "chain",  name: "Chain reaction", hint: "Hit a 10 streak" },
      { id: "maxed",  name: "Full spectrum",  hint: "Reach the 5\u00d7 multiplier" },
      { id: "deep",   name: "Deep field",     hint: "Nail an element past 92" },
      { id: "mass",   name: "Critical mass",  hint: "Score 500 in one run" },
      { id: "clean",  name: "Noble run",      hint: "Bank 20 correct without a miss" }
    ],

    spectrumColors: ["#8A5CFF", "#5C7BFF", "#4FC3FF", "#4FE0A6", "#9BE85C", "#FFE14B",
                     "#FFC24B", "#FF9E4B", "#FF6B6B", "#FF4B7D", "#FF4BC6", "#D14BFF"]
  };
})();
