/* ============================================================
   Spectra — configuration only. No game logic lives here.
   Edit ranges, scoring, badges, and tolerances in this file.
   ============================================================ */
window.SPECTRA_CONFIG = (function () {
  "use strict";

  return {
    appId: "periodic",

    /* Single source of truth lives in elements.js — the drill and the
       table explorer both read the same records. */
    elements: window.PERIODIC_ELEMENTS,

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
