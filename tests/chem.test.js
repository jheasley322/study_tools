/* ============================================================
   study_tools — shared/chem.js property + edge-case suite
   ------------------------------------------------------------
   Written against CONTRACT.md §3, NOT against the implementation.
   If a test here disagrees with shared/chem.js, the contract is
   right until the contract is edited.

   Strategy: an independent oracle. The reduced ratio, the plain
   formula and the html are all recomputed here from the spec
   (lcm -> counts -> reduce by gcd; parens iff poly && count > 1)
   and compared against chem.js across the FULL cation x anion
   cross-product. Two independent derivations agreeing is
   evidence; one derivation checked against itself is not.
   ============================================================ */
"use strict";

var h = require("./harness.js");
var Chem = require("../shared/chem.js");

/* ---------- ion sets: 13 cations x 15 anions = 195 pairs ---------- */

var CATIONS = [
  { sym: "Na", name: "sodium", charge: 1, poly: false },
  { sym: "K", name: "potassium", charge: 1, poly: false },
  { sym: "Li", name: "lithium", charge: 1, poly: false },
  { sym: "Ag", name: "silver", charge: 1, poly: false },
  { sym: "NH4", name: "ammonium", charge: 1, poly: true },
  { sym: "Mg", name: "magnesium", charge: 2, poly: false },
  { sym: "Ca", name: "calcium", charge: 2, poly: false },
  { sym: "Ba", name: "barium", charge: 2, poly: false },
  { sym: "Zn", name: "zinc", charge: 2, poly: false },
  { sym: "Fe", name: "iron(II)", charge: 2, poly: false },
  { sym: "Al", name: "aluminum", charge: 3, poly: false },
  { sym: "Cr", name: "chromium(III)", charge: 3, poly: false },
  { sym: "Fe", name: "iron(III)", charge: 3, poly: false }
];

var ANIONS = [
  { sym: "Cl", name: "chloride", charge: -1, poly: false },
  { sym: "Br", name: "bromide", charge: -1, poly: false },
  { sym: "F", name: "fluoride", charge: -1, poly: false },
  { sym: "I", name: "iodide", charge: -1, poly: false },
  { sym: "OH", name: "hydroxide", charge: -1, poly: true },
  { sym: "NO3", name: "nitrate", charge: -1, poly: true },
  { sym: "C2H3O2", name: "acetate", charge: -1, poly: true },
  { sym: "O", name: "oxide", charge: -2, poly: false },
  { sym: "S", name: "sulfide", charge: -2, poly: false },
  { sym: "SO4", name: "sulfate", charge: -2, poly: true },
  { sym: "CO3", name: "carbonate", charge: -2, poly: true },
  { sym: "CrO4", name: "chromate", charge: -2, poly: true },
  { sym: "N", name: "nitride", charge: -3, poly: false },
  { sym: "P", name: "phosphide", charge: -3, poly: false },
  { sym: "PO4", name: "phosphate", charge: -3, poly: true }
];

/* No symbol in either set contains the digit 1, so a literal "1"
   in a rendered formula can only be a subscript that should not
   have been written. */
(function assertNoDigitOneInSymbols() {
  CATIONS.concat(ANIONS).forEach(function (ion) {
    if (ion.sym.indexOf("1") !== -1) {
      throw new Error("fixture invariant broken: symbol contains a literal 1 -> " + ion.sym);
    }
  });
})();

function eachPair(visit) {
  CATIONS.forEach(function (c) {
    ANIONS.forEach(function (a) {
      visit(c, a, { cation: c, anion: a });
    });
  });
}

/* ---------- the oracle: spec restated, independent of chem.js ---------- */

function gcdRef(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) {
    var t = a % b;
    a = b;
    b = t;
  }
  return a;
}

/* lcm(|c+|,|c-|) / |charge| for each side, which is the same as
   dividing the opposite magnitude by the gcd. Already lowest terms. */
function ratioRef(cation, anion) {
  var cc = Math.abs(cation.charge);
  var ca = Math.abs(anion.charge);
  var g = gcdRef(cc, ca);
  return [ca / g, cc / g];
}

/* Digit runs become real <sub> elements (D5). */
function symHtmlRef(sym) {
  return sym.replace(/(\d+)/g, "<sub>$1</sub>");
}

function partFormulaRef(sym, poly, count) {
  var body = poly && count > 1 ? "(" + sym + ")" : sym;
  return body + (count > 1 ? String(count) : "");
}

function partHtmlRef(sym, poly, count) {
  var body = poly && count > 1 ? "(" + symHtmlRef(sym) + ")" : symHtmlRef(sym);
  return body + (count > 1 ? "<sub>" + count + "</sub>" : "");
}

function formulaRef(cation, anion) {
  var r = ratioRef(cation, anion);
  return partFormulaRef(cation.sym, !!cation.poly, r[0]) + partFormulaRef(anion.sym, !!anion.poly, r[1]);
}

function htmlRef(cation, anion) {
  var r = ratioRef(cation, anion);
  return partHtmlRef(cation.sym, !!cation.poly, r[0]) + partHtmlRef(anion.sym, !!anion.poly, r[1]);
}

function label(cation, anion) {
  return cation.sym + "(" + cation.charge + ") + " + anion.sym + "(" + anion.charge + ")";
}

/* U+2080-U+209F subscripts, U+2070-U+207F superscripts, plus the
   Latin-1 strays U+00B2/U+00B3/U+00B9. None may appear in html. */
var UNICODE_SUBSUP = /[⁰-₟²³¹]/;

var tests = [];
function test(name, fn) {
  tests.push({ name: name, fn: fn });
}

/* ================= properties over the cross-product ================= */

test("net charge is exactly zero for every cation-anion pair", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.ok(Array.isArray(r.parts) && r.parts.length === 2, {
      what: "result must expose two parts",
      input: input,
      expected: "parts.length === 2",
      actual: r.parts
    });
    var net = r.parts[0].count * r.parts[0].charge + r.parts[1].count * r.parts[1].charge;
    h.eq(net, 0, {
      what: "count_c * charge_c + count_a * charge_a must be 0 for " + label(c, a) + " -> " + r.formula,
      input: input
    });
  });
});

test("ratio times charge sums to zero for every pair", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    var net = r.ratio[0] * c.charge + r.ratio[1] * a.charge;
    h.eq(net, 0, {
      what: "ratio must balance the input charges for " + label(c, a) + " ratio " + r.ratio.join(":"),
      input: input
    });
  });
});

test("every ratio is in lowest whole-number terms", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.eq(gcdRef(r.ratio[0], r.ratio[1]), 1, {
      what: "gcd(ratio[0], ratio[1]) must be 1 for " + label(c, a) + " ratio " + r.ratio.join(":"),
      input: input
    });
  });
});

test("every count is a positive integer", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    r.ratio.concat([r.parts[0].count, r.parts[1].count]).forEach(function (n) {
      h.ok(Number.isInteger(n) && n > 0, {
        what: "counts must be positive integers for " + label(c, a),
        input: input,
        expected: "a positive integer",
        actual: n
      });
    });
  });
});

test("counts follow from the lcm of the charge magnitudes", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.deepEq(r.ratio, ratioRef(c, a), {
      what: "ratio must equal lcm(|c+|,|c-|)/|charge| reduced, for " + label(c, a),
      input: input
    });
  });
});

test("ratio matches the counts reported in parts", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.deepEq([r.parts[0].count, r.parts[1].count], [r.ratio[0], r.ratio[1]], {
      what: "parts counts must agree with ratio for " + label(c, a),
      input: input
    });
  });
});

test("parts preserve the input symbol, charge and poly flag, cation first", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.eq(r.parts[0].sym, c.sym, { what: "parts[0] must be the cation for " + label(c, a), input: input });
    h.eq(r.parts[1].sym, a.sym, { what: "parts[1] must be the anion for " + label(c, a), input: input });
    h.eq(r.parts[0].charge, c.charge, { what: "cation charge must survive for " + label(c, a), input: input });
    h.eq(r.parts[1].charge, a.charge, { what: "anion charge must survive for " + label(c, a), input: input });
    h.eq(r.parts[0].poly, !!c.poly, { what: "cation poly flag must survive for " + label(c, a), input: input });
    h.eq(r.parts[1].poly, !!a.poly, { what: "anion poly flag must survive for " + label(c, a), input: input });
  });
});

test("parentheses appear iff the ion is polyatomic and its count exceeds 1", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    [
      { part: r.parts[0], ion: c, which: "cation" },
      { part: r.parts[1], ion: a, which: "anion" }
    ].forEach(function (p) {
      var shouldParen = !!p.ion.poly && p.part.count > 1;
      h.eq(p.part.parens, shouldParen, {
        what:
          "parens on the " + p.which + " " + p.ion.sym + " (poly=" + !!p.ion.poly + ", count=" +
          p.part.count + ") for " + label(c, a) + " -> " + r.formula,
        input: input
      });
      var bracketed = "(" + symHtmlRef(p.ion.sym) + ")";
      h.eq(r.html.indexOf(bracketed) !== -1, shouldParen, {
        what:
          "html must bracket " + p.ion.sym + " iff poly && count > 1, for " + label(c, a) +
          " -> " + r.html,
        input: input,
        expected: shouldParen ? "html contains " + bracketed : "html does not contain " + bracketed,
        actual: r.html
      });
    });
  });
});

test("needsParens is true iff some part is parenthesized", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    var any = r.parts.some(function (p) {
      return p.parens === true;
    });
    h.eq(r.needsParens, any, {
      what: "needsParens must mirror the parts for " + label(c, a) + " -> " + r.formula,
      input: input
    });
  });
});

test("a count of 1 is never rendered", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.eq(r.html.indexOf("<sub>1</sub>"), -1, {
      what: "html must never carry a subscript of 1 for " + label(c, a),
      input: input,
      expected: "no <sub>1</sub> in " + r.html,
      actual: r.html
    });
    r.parts.forEach(function (p) {
      if (p.count !== 1) return;
      h.eq(r.formula.indexOf(p.sym + "1"), -1, {
        what: "formula must never write a subscript of 1 (no Na1Cl) for " + label(c, a),
        input: input,
        expected: "no \"" + p.sym + "1\" in " + r.formula,
        actual: r.formula
      });
      h.eq(r.formula.indexOf("(" + p.sym + ")"), -1, {
        what: "a count of 1 must not be parenthesized (no (OH)1) for " + label(c, a),
        input: input,
        expected: "no \"(" + p.sym + ")\" in " + r.formula,
        actual: r.formula
      });
    });
  });
});

test("plain formula equals the independently derived formula", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.eq(r.formula, formulaRef(c, a), {
      what: "formula string for " + label(c, a),
      input: input
    });
  });
});

test("html equals the independently derived markup", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.eq(r.html, htmlRef(c, a), {
      what: "html markup for " + label(c, a),
      input: input
    });
  });
});

test("html carries no Unicode subscript or superscript characters", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    var hit = r.html.match(UNICODE_SUBSUP);
    h.eq(hit, null, {
      what: "html must use real <sub>/<sup>, never Unicode digits (D5, VoiceOver), for " + label(c, a),
      input: input,
      expected: "no character in U+2070-U+209F / U+00B2 / U+00B3 / U+00B9",
      actual: hit ? "U+" + hit[0].charCodeAt(0).toString(16).toUpperCase() + " in " + r.html : r.html
    });
  });
});

test("html tags are balanced and use only sub elements", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    var opens = (r.html.match(/<sub>/g) || []).length;
    var closes = (r.html.match(/<\/sub>/g) || []).length;
    h.eq(opens, closes, {
      what: "unbalanced <sub> tags for " + label(c, a),
      input: input,
      expected: "equal open and close tags in " + r.html,
      actual: opens + " open, " + closes + " close"
    });
    var stripped = r.html.replace(/<\/?sub>/g, "");
    h.eq(stripped.indexOf("<"), -1, {
      what: "formula html must contain no element other than <sub>, for " + label(c, a),
      input: input,
      expected: "no stray markup",
      actual: r.html
    });
  });
});

test("stripping the markup from html reproduces the plain formula", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.eq(r.html.replace(/<\/?sub>/g, ""), r.formula, {
      what: "html and formula must describe the same compound for " + label(c, a),
      input: input
    });
  });
});

test("formulaFor is deterministic for identical inputs", function () {
  eachPair(function (c, a, input) {
    var first = Chem.formulaFor(c, a);
    var second = Chem.formulaFor(c, a);
    h.eq(second.formula, first.formula, {
      what: "same input must yield the same formula every call, for " + label(c, a),
      input: input
    });
    h.eq(second.html, first.html, {
      what: "same input must yield the same html every call, for " + label(c, a),
      input: input
    });
    h.deepEq(second.ratio, first.ratio, {
      what: "same input must yield the same ratio every call, for " + label(c, a),
      input: input
    });
    h.deepEq(second.parts, first.parts, {
      what: "same input must yield the same parts every call, for " + label(c, a),
      input: input
    });
  });
});

test("formulaFor does not mutate the ion objects it is given", function () {
  eachPair(function (c, a, input) {
    var beforeC = JSON.stringify(c);
    var beforeA = JSON.stringify(a);
    Chem.formulaFor(c, a);
    h.eq(JSON.stringify(c), beforeC, {
      what: "cation must not be mutated by formulaFor, for " + label(c, a),
      input: input
    });
    h.eq(JSON.stringify(a), beforeA, {
      what: "anion must not be mutated by formulaFor, for " + label(c, a),
      input: input
    });
  });
});

test("Chem.netCharge returns 0 for every valid result", function () {
  eachPair(function (c, a, input) {
    var r = Chem.formulaFor(c, a);
    h.eq(Chem.netCharge(r), 0, {
      what: "netCharge of " + r.formula + " (" + label(c, a) + ")",
      input: input
    });
  });
});

/* ========================= targeted edge cases ========================= */

test("a 2+ cation with a 2- anion reduces to 1:1 (CaSO4, not Ca2(SO4)2)", function () {
  var input = { cation: { sym: "Ca", charge: 2 }, anion: { sym: "SO4", charge: -2, poly: true } };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "CaSO4", { what: "equal and opposite charges must cancel", input: input });
  h.deepEq(r.ratio, [1, 1], { what: "ratio must reduce to 1:1", input: input });
  h.eq(r.needsParens, false, { what: "nothing is parenthesized at a count of 1", input: input });
  h.eq(r.html, "CaSO<sub>4</sub>", { what: "html for CaSO4", input: input });
});

test("a 3+ cation with a 2- anion gives 2:3 and parenthesizes the polyatomic", function () {
  var input = { cation: { sym: "Al", charge: 3 }, anion: { sym: "SO4", charge: -2, poly: true } };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "Al2(SO4)3", { what: "the lcm path", input: input });
  h.deepEq(r.ratio, [2, 3], { what: "ratio must be 2:3", input: input });
  h.eq(r.needsParens, true, { what: "sulfate carries a subscript of 3", input: input });
  h.eq(r.html, "Al<sub>2</sub>(SO<sub>4</sub>)<sub>3</sub>", { what: "html for Al2(SO4)3", input: input });
});

test("a 3+ cation with a 3- anion reduces to 1:1 and renders no count subscripts", function () {
  var input = { cation: { sym: "Al", charge: 3 }, anion: { sym: "N", charge: -3, poly: false } };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "AlN", { what: "3+ with 3- is 1:1", input: input });
  h.deepEq(r.ratio, [1, 1], { what: "ratio must reduce to 1:1", input: input });
  h.eq(r.html, "AlN", {
    what: "no subscript markup at all when both counts are 1",
    input: input
  });
  h.eq(r.needsParens, false, { what: "no parentheses at a count of 1", input: input });
});

test("a 3+ cation with a 3- polyatomic is 1:1 with no parentheses (AlPO4)", function () {
  var input = { cation: { sym: "Al", charge: 3 }, anion: { sym: "PO4", charge: -3, poly: true } };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "AlPO4", { what: "a polyatomic at count 1 is bare", input: input });
  h.eq(r.needsParens, false, { what: "count of 1 means no parentheses", input: input });
  h.eq(r.html, "AlPO<sub>4</sub>", {
    what: "only the symbol's own digit is subscripted",
    input: input
  });
});

test("a monatomic anion is never parenthesized (Al2O3)", function () {
  var input = { cation: { sym: "Al", charge: 3 }, anion: { sym: "O", charge: -2, poly: false } };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "Al2O3", { what: "monatomic anion at count 3 stays bare", input: input });
  h.deepEq(r.ratio, [2, 3], { what: "ratio must be 2:3", input: input });
  h.eq(r.parts[1].parens, false, { what: "oxide is monatomic, so never bracketed", input: input });
  h.eq(r.needsParens, false, { what: "no polyatomic carries a subscript here", input: input });
  h.eq(r.html, "Al<sub>2</sub>O<sub>3</sub>", { what: "html for Al2O3", input: input });
});

test("a polyatomic cation is parenthesized when its count exceeds 1 ((NH4)2SO4)", function () {
  var input = {
    cation: { sym: "NH4", charge: 1, poly: true },
    anion: { sym: "SO4", charge: -2, poly: true }
  };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "(NH4)2SO4", { what: "ammonium in the cation slot", input: input });
  h.deepEq(r.ratio, [2, 1], { what: "ratio must be 2:1", input: input });
  h.eq(r.parts[0].parens, true, { what: "ammonium carries a subscript of 2", input: input });
  h.eq(r.parts[1].parens, false, { what: "sulfate is at count 1", input: input });
  h.eq(r.html, "(NH<sub>4</sub>)<sub>2</sub>SO<sub>4</sub>", { what: "html for (NH4)2SO4", input: input });
});

test("a polyatomic cation is not parenthesized when its count is 1 (NH4Cl)", function () {
  var input = {
    cation: { sym: "NH4", charge: 1, poly: true },
    anion: { sym: "Cl", charge: -1, poly: false }
  };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "NH4Cl", { what: "ammonium at count 1 is bare", input: input });
  h.eq(r.needsParens, false, { what: "no subscript, so no parentheses", input: input });
  h.eq(r.html, "NH<sub>4</sub>Cl", { what: "html for NH4Cl", input: input });
});

test("a polyatomic cation with a polyatomic anion brackets only the one with a count above 1", function () {
  var input = {
    cation: { sym: "NH4", charge: 1, poly: true },
    anion: { sym: "PO4", charge: -3, poly: true }
  };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "(NH4)3PO4", { what: "3:1 with only the cation bracketed", input: input });
  h.eq(r.html, "(NH<sub>4</sub>)<sub>3</sub>PO<sub>4</sub>", { what: "html for (NH4)3PO4", input: input });
});

test("1+ with 1- renders no subscripts anywhere (NaCl)", function () {
  var input = {
    cation: { sym: "Na", charge: 1, poly: false },
    anion: { sym: "Cl", charge: -1, poly: false }
  };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "NaCl", { what: "1:1 with no digits", input: input });
  h.eq(r.html, "NaCl", { what: "no <sub> at all", input: input });
  h.deepEq(r.ratio, [1, 1], { what: "ratio must be 1:1", input: input });
  h.eq(r.needsParens, false, { what: "no parentheses", input: input });
});

test("a 2+ cation with a 1- polyatomic brackets the anion (Ca(OH)2)", function () {
  var input = {
    cation: { sym: "Ca", charge: 2, poly: false },
    anion: { sym: "OH", charge: -1, poly: true }
  };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "Ca(OH)2", { what: "hydroxide at count 2 is bracketed", input: input });
  h.eq(r.html, "Ca(OH)<sub>2</sub>", { what: "html for Ca(OH)2 — OH has no digit of its own", input: input });
});

test("poly omitted on an ion is treated as monatomic", function () {
  var input = { cation: { sym: "Al", charge: 3 }, anion: { sym: "O", charge: -2 } };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "Al2O3", { what: "a missing poly flag must default to false", input: input });
  h.eq(r.parts[0].poly, false, { what: "cation poly defaults to false", input: input });
  h.eq(r.parts[1].poly, false, { what: "anion poly defaults to false", input: input });
  h.eq(r.needsParens, false, { what: "nothing polyatomic, so no parentheses", input: input });
});

/* ==================== the poly inference fallback ====================
   banks_src/ions.yaml sets no explicit `poly` on any entry, so every
   shipped ion currently reaches formulaFor without the flag and leans
   on CONTRACT §3's inference rule (/^[A-Z][a-z]?$/ is monatomic,
   anything else polyatomic) to decide parenthesization.

   This is load-bearing and silent. Narrow that regex and Hg2 reverts
   to a wrong formula with nothing thrown and nothing failing — a
   student just learns the wrong thing. These tests pass NO poly flag,
   so they fail the moment the rule drifts.
   ==================================================================== */

test("a symbol that is not a bare element infers polyatomic when the flag is absent", function () {
  /* CN/OH/SCN carry no digit at all — the case a naive /\d/ test misses. */
  ["Hg2", "NH4", "H3O", "CN", "OH", "SCN", "O2", "C2H3O2", "MnO4", "Cr2O7", "HCO3"].forEach(function (sym) {
    var r = Chem.formulaFor({ sym: "Ca", charge: 2 }, { sym: sym, charge: -2 });
    h.eq(r.parts[1].poly, true, {
      what: sym + " must infer polyatomic with no poly flag passed",
      input: { sym: sym, charge: -2 },
      note: "inference rule: /^[A-Z][a-z]?$/ is monatomic, anything else polyatomic"
    });
  });
});

test("a bare element symbol infers monatomic when the flag is absent", function () {
  ["H", "He", "Fe", "Cl", "Na", "Al", "O", "S", "Zn", "Br", "I"].forEach(function (sym) {
    var r = Chem.formulaFor({ sym: "Ca", charge: 2 }, { sym: sym, charge: -2 });
    h.eq(r.parts[1].poly, false, {
      what: sym + " must infer monatomic with no poly flag passed",
      input: { sym: sym, charge: -2 }
    });
  });
});

test("the mercury(I) dimer Hg2 infers polyatomic and brackets only when its count exceeds 1", function () {
  var phosphate = { cation: { sym: "Hg2", charge: 2 }, anion: { sym: "PO4", charge: -3 } };
  var r = Chem.formulaFor(phosphate.cation, phosphate.anion);
  h.eq(r.formula, "(Hg2)3(PO4)2", {
    what: "mercury(I) phosphate — the dimer must be bracketed, not flattened to Hg23(PO4)2",
    input: phosphate,
    note: "no poly flag passed; this rides entirely on inference"
  });
  h.eq(r.parts[0].poly, true, { what: "Hg2 must infer polyatomic", input: phosphate });
  h.eq(r.needsParens, true, { what: "both ions carry a count above 1", input: phosphate });

  var chloride = { cation: { sym: "Hg2", charge: 2 }, anion: { sym: "Cl", charge: -1 } };
  var c = Chem.formulaFor(chloride.cation, chloride.anion);
  h.eq(c.formula, "Hg2Cl2", {
    what: "mercury(I) chloride — the real compound, and the reason Hg(+) is not derivable",
    input: chloride
  });
  h.eq(c.needsParens, false, {
    what: "the dimer is at count 1, so nothing is bracketed",
    input: chloride
  });
  h.eq(c.html, "Hg<sub>2</sub>Cl<sub>2</sub>", { what: "html for Hg2Cl2", input: chloride });
});

test("ammonium infers polyatomic with no flag and yields (NH4)2SO4, never NH42SO4", function () {
  var input = { cation: { sym: "NH4", charge: 1 }, anion: { sym: "SO4", charge: -2 } };
  var r = Chem.formulaFor(input.cation, input.anion);
  h.eq(r.formula, "(NH4)2SO4", {
    what: "the failure this inference exists to prevent",
    input: input,
    note: "NH42SO4 would read as 42 ammonium atoms"
  });
  h.eq(r.parts[0].poly, true, { what: "NH4 must infer polyatomic", input: input });
});

test("a digitless two-capital polyatomic still infers polyatomic (CN, OH, SCN)", function () {
  [
    ["CN", "Ca(CN)2"],
    ["OH", "Ca(OH)2"],
    ["SCN", "Ca(SCN)2"]
  ].forEach(function (row) {
    var input = { cation: { sym: "Ca", charge: 2 }, anion: { sym: row[0], charge: -1 } };
    var r = Chem.formulaFor(input.cation, input.anion);
    h.eq(r.formula, row[1], {
      what: row[0] + " has no digit, so only the second capital marks it polyatomic",
      input: input
    });
    h.eq(r.parts[1].parens, true, { what: row[0] + " must be bracketed at count 2", input: input });
  });
});

test("an inferred monatomic ion is never parenthesized at any count", function () {
  var cations = [
    { sym: "Na", charge: 1 },
    { sym: "Ca", charge: 2 },
    { sym: "Fe", charge: 3 },
    { sym: "Sn", charge: 4 }
  ];
  var anions = [
    { sym: "Cl", charge: -1 },
    { sym: "O", charge: -2 },
    { sym: "N", charge: -3 }
  ];
  cations.forEach(function (c) {
    anions.forEach(function (a) {
      var input = { cation: c, anion: a };
      var r = Chem.formulaFor(c, a);
      h.eq(r.formula.indexOf("("), -1, {
        what: "no bare element may be bracketed at any count, for " + c.sym + " + " + a.sym,
        input: input,
        expected: "no parenthesis in the formula",
        actual: r.formula
      });
      h.eq(r.needsParens, false, {
        what: "needsParens must stay false for two monatomic ions, " + c.sym + " + " + a.sym,
        input: input
      });
      r.parts.forEach(function (p) {
        h.eq(p.poly, false, { what: p.sym + " must infer monatomic", input: input });
        h.eq(p.parens, false, { what: p.sym + " must not be bracketed", input: input });
      });
    });
  });
});

test("an explicit poly flag overrides inference in both directions", function () {
  /* Suppressing brackets on NH4 produces wrong chemistry on purpose —
     the point is to prove the flag WINS, which is what makes it safe
     for build_banks.py to stamp the value the section already implies. */
  var suppressed = { cation: { sym: "NH4", charge: 1, poly: false }, anion: { sym: "SO4", charge: -2, poly: true } };
  var s = Chem.formulaFor(suppressed.cation, suppressed.anion);
  h.eq(s.parts[0].poly, false, { what: "poly:false must override the polyatomic inference", input: suppressed });
  h.eq(s.parts[0].parens, false, { what: "an ion declared monatomic is never bracketed", input: suppressed });
  h.eq(s.formula, "NH42SO4", {
    what: "explicit poly:false wins over inference, wrong chemistry and all",
    input: suppressed,
    note: "this is why a bank must never set poly:false on a polyatomic"
  });

  var forced = { cation: { sym: "Fe", charge: 3, poly: true }, anion: { sym: "O", charge: -2, poly: false } };
  var f = Chem.formulaFor(forced.cation, forced.anion);
  h.eq(f.parts[0].poly, true, { what: "poly:true must override the monatomic inference", input: forced });
  h.eq(f.formula, "(Fe)2O3", {
    what: "explicit poly:true wins over inference",
    input: forced
  });
  h.eq(f.needsParens, true, { what: "a forced polyatomic at count 2 is bracketed", input: forced });
});

test("inference depends on the symbol alone, not on the charge or the slot", function () {
  /* The same symbol must infer the same way as a cation and as an
     anion, at every charge — otherwise parenthesization would depend
     on which side of the compound an ion landed on. */
  [1, 2, 3].forEach(function (mag) {
    var asCation = Chem.formulaFor({ sym: "NH4", charge: mag }, { sym: "Cl", charge: -1 });
    h.eq(asCation.parts[0].poly, true, {
      what: "NH4 must infer polyatomic at charge " + mag + "+",
      input: { sym: "NH4", charge: mag }
    });
    var asAnion = Chem.formulaFor({ sym: "Na", charge: 1 }, { sym: "NO3", charge: -mag });
    h.eq(asAnion.parts[1].poly, true, {
      what: "NO3 must infer polyatomic at charge " + mag + "-",
      input: { sym: "NO3", charge: -mag }
    });
  });
});

/* ============================ rejections ============================ */

test("a cation charge of 0 is rejected with TypeError", function () {
  var input = { cation: { sym: "Na", charge: 0 }, anion: { sym: "Cl", charge: -1 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "a zero cation charge is not an ion", input: input });
});

test("an anion charge of 0 is rejected with TypeError", function () {
  var input = { cation: { sym: "Na", charge: 1 }, anion: { sym: "Cl", charge: 0 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "a zero anion charge is not an ion", input: input });
});

test("a positive anion charge is rejected with TypeError", function () {
  var input = { cation: { sym: "Na", charge: 1 }, anion: { sym: "Cl", charge: 1 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "anion.charge >= 0 must throw", input: input });
});

test("a negative cation charge is rejected with TypeError", function () {
  var input = { cation: { sym: "Na", charge: -1 }, anion: { sym: "Cl", charge: -1 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "cation.charge <= 0 must throw", input: input });
});

test("a non-integer cation charge is rejected with TypeError", function () {
  var input = { cation: { sym: "Na", charge: 1.5 }, anion: { sym: "Cl", charge: -1 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "a fractional charge must throw", input: input });
});

test("a non-integer anion charge is rejected with TypeError", function () {
  var input = { cation: { sym: "Ca", charge: 2 }, anion: { sym: "SO4", charge: -2.5, poly: true } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "a fractional charge must throw", input: input });
});

test("a non-numeric charge is rejected with TypeError", function () {
  var input = { cation: { sym: "Na", charge: "1" }, anion: { sym: "Cl", charge: -1 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "a string charge is not an integer charge", input: input });
});

test("NaN and Infinity charges are rejected with TypeError", function () {
  [NaN, Infinity, -Infinity].forEach(function (bad) {
    var input = { cation: { sym: "Na", charge: bad }, anion: { sym: "Cl", charge: -1 } };
    h.throwsTypeError(function () {
      Chem.formulaFor(input.cation, input.anion);
    }, { what: "a non-finite charge must throw", input: { charge: String(bad) } });
  });
});

test("a missing cation sym is rejected with TypeError", function () {
  var input = { cation: { charge: 1 }, anion: { sym: "Cl", charge: -1 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "an ion without a symbol cannot be rendered", input: input });
});

test("a missing anion sym is rejected with TypeError", function () {
  var input = { cation: { sym: "Na", charge: 1 }, anion: { charge: -1 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "an ion without a symbol cannot be rendered", input: input });
});

test("an empty-string sym is rejected with TypeError", function () {
  var input = { cation: { sym: "", charge: 1 }, anion: { sym: "Cl", charge: -1 } };
  h.throwsTypeError(function () {
    Chem.formulaFor(input.cation, input.anion);
  }, { what: "an empty symbol is a missing symbol", input: input });
});

test("a missing ion argument is rejected with TypeError", function () {
  h.throwsTypeError(function () {
    Chem.formulaFor(undefined, { sym: "Cl", charge: -1 });
  }, { what: "no cation at all must throw", input: { cation: "undefined" } });
  h.throwsTypeError(function () {
    Chem.formulaFor({ sym: "Na", charge: 1 }, null);
  }, { what: "no anion at all must throw", input: { anion: "null" } });
});

/* An invalid ion must be rejected by the guard clause, not by
   arithmetic downstream. Both throw TypeError, so the type alone
   cannot tell them apart: a charge of 0 sails past a weakened
   guard and only blows up later when a NaN count reaches gcd().
   That is luck, not validation — a refactor that made gcd()
   tolerant would turn it into a silently wrong formula. Requiring
   the message to name the offending field pins the rejection to
   the guard. This is a bar above the literal contract, which
   pins the error TYPE only. */
test("invalid ions are rejected by validation, not by downstream arithmetic", function () {
  var cases = [
    { what: "cation charge 0", cation: { sym: "Na", charge: 0 }, anion: { sym: "Cl", charge: -1 }, mentions: /charge/i },
    { what: "anion charge 0", cation: { sym: "Na", charge: 1 }, anion: { sym: "Cl", charge: 0 }, mentions: /charge/i },
    { what: "positive anion charge", cation: { sym: "Na", charge: 1 }, anion: { sym: "Cl", charge: 2 }, mentions: /charge/i },
    { what: "negative cation charge", cation: { sym: "Na", charge: -2 }, anion: { sym: "Cl", charge: -1 }, mentions: /charge/i },
    { what: "fractional cation charge", cation: { sym: "Na", charge: 1.5 }, anion: { sym: "Cl", charge: -1 }, mentions: /charge/i },
    { what: "fractional anion charge", cation: { sym: "Ca", charge: 2 }, anion: { sym: "S", charge: -1.5 }, mentions: /charge/i },
    { what: "NaN cation charge", cation: { sym: "Na", charge: NaN }, anion: { sym: "Cl", charge: -1 }, mentions: /charge/i },
    { what: "missing cation sym", cation: { charge: 1 }, anion: { sym: "Cl", charge: -1 }, mentions: /sym/i },
    { what: "missing anion sym", cation: { sym: "Na", charge: 1 }, anion: { charge: -1 }, mentions: /sym/i }
  ];
  cases.forEach(function (c) {
    var input = { cation: c.cation, anion: c.anion };
    var caught = null;
    try {
      Chem.formulaFor(c.cation, c.anion);
    } catch (e) {
      caught = e;
    }
    h.ok(caught instanceof TypeError, {
      what: c.what + " must throw a TypeError",
      input: input,
      expected: "TypeError",
      actual: caught ? String(caught) : "no error thrown"
    });
    h.ok(c.mentions.test(caught.message), {
      what: c.what + " must be reported by the guard clause, naming the bad field",
      input: input,
      expected: "message matching " + c.mentions,
      actual: caught.message,
      note: "a message from gcd()/lcm() means the guard let the bad ion through"
    });
  });
});

/* ========================= rendering helpers ========================= */

test("Chem.gcd returns a positive common divisor of both inputs", function () {
  for (var a = 1; a <= 24; a++) {
    for (var b = 1; b <= 24; b++) {
      var g = Chem.gcd(a, b);
      h.eq(g, gcdRef(a, b), { what: "gcd(" + a + "," + b + ")", input: { a: a, b: b } });
      h.ok(Number.isInteger(g) && g > 0, {
        what: "gcd must be a positive integer",
        input: { a: a, b: b },
        expected: "a positive integer",
        actual: g
      });
    }
  }
});

test("Chem.lcm is divisible by both inputs and equals a*b/gcd", function () {
  for (var a = 1; a <= 24; a++) {
    for (var b = 1; b <= 24; b++) {
      var l = Chem.lcm(a, b);
      h.ok(Number.isInteger(l) && l > 0, {
        what: "lcm must be a positive integer",
        input: { a: a, b: b },
        expected: "a positive integer",
        actual: l
      });
      h.eq(l % a, 0, { what: "lcm(" + a + "," + b + ") must be divisible by " + a, input: { a: a, b: b } });
      h.eq(l % b, 0, { what: "lcm(" + a + "," + b + ") must be divisible by " + b, input: { a: a, b: b } });
      h.eq(l, (a * b) / gcdRef(a, b), { what: "lcm(" + a + "," + b + ")", input: { a: a, b: b } });
    }
  }
});

test("Chem.symHtml wraps digit runs in real sub elements", function () {
  [
    ["SO4", "SO<sub>4</sub>"],
    ["NH4", "NH<sub>4</sub>"],
    ["C2H3O2", "C<sub>2</sub>H<sub>3</sub>O<sub>2</sub>"],
    ["OH", "OH"],
    ["Na", "Na"],
    ["Cr2O7", "Cr<sub>2</sub>O<sub>7</sub>"]
  ].forEach(function (row) {
    h.eq(Chem.symHtml(row[0]), row[1], { what: "symHtml(" + row[0] + ")", input: row[0] });
    h.eq(UNICODE_SUBSUP.test(Chem.symHtml(row[0])), false, {
      what: "symHtml must never emit Unicode subscripts (D5)",
      input: row[0],
      expected: "no Unicode subscript characters",
      actual: Chem.symHtml(row[0])
    });
  });
});

test("Chem.chargeLabel drops the digit at +/-1 and uses U+2212 for negatives", function () {
  var MINUS = "−";
  [
    [1, "+"],
    [2, "2+"],
    [3, "3+"],
    [-1, MINUS],
    [-2, "2" + MINUS],
    [-3, "3" + MINUS]
  ].forEach(function (row) {
    h.eq(Chem.chargeLabel(row[0]), row[1], {
      what: "chargeLabel(" + row[0] + ")",
      input: row[0],
      note: "negatives use U+2212 MINUS, never the hyphen U+002D"
    });
  });
  [-1, -2, -3].forEach(function (n) {
    h.eq(Chem.chargeLabel(n).indexOf("-"), -1, {
      what: "chargeLabel(" + n + ") must not contain a hyphen",
      input: n,
      expected: "U+2212 MINUS",
      actual: Chem.chargeLabel(n)
    });
  });
});

test("Chem.ionHtml pairs the subscripted symbol with a superscripted charge", function () {
  var MINUS = "−";
  [
    [{ sym: "Na", charge: 1 }, "Na<sup>+</sup>"],
    [{ sym: "Al", charge: 3 }, "Al<sup>3+</sup>"],
    [{ sym: "Cl", charge: -1 }, "Cl<sup>" + MINUS + "</sup>"],
    [{ sym: "SO4", charge: -2, poly: true }, "SO<sub>4</sub><sup>2" + MINUS + "</sup>"],
    [{ sym: "NH4", charge: 1, poly: true }, "NH<sub>4</sub><sup>+</sup>"],
    [{ sym: "PO4", charge: -3, poly: true }, "PO<sub>4</sub><sup>3" + MINUS + "</sup>"]
  ].forEach(function (row) {
    h.eq(Chem.ionHtml(row[0]), row[1], { what: "ionHtml(" + row[0].sym + ")", input: row[0] });
    h.eq(UNICODE_SUBSUP.test(Chem.ionHtml(row[0])), false, {
      what: "ionHtml must use real <sub>/<sup>, never Unicode digits (D5)",
      input: row[0],
      expected: "no Unicode sub/sup characters",
      actual: Chem.ionHtml(row[0])
    });
  });
});

module.exports = tests;
