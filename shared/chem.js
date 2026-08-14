/* ============================================================
   study_tools — ionic formula engine (the keystone)
   ------------------------------------------------------------
   Every chemistry game here derives its answers from this file.
   Banks carry the inputs (which cation, which anion); the
   formula, the subscripts, and the parentheses are computed at
   runtime so a bank can never disagree with the chemistry.

   An ion is a plain object:
     { sym: "SO4", name: "sulfate",  charge: -2, poly: true  }
     { sym: "Al",  name: "aluminum", charge:  3, poly: false }

   Rendering rule (D5): subscripts and superscripts are REAL
   <sub>/<sup> elements, never the Unicode subscript block.
   Unicode subscripts break copy/paste and VoiceOver reads them
   as separate, wrong characters.

   Charge signs use U+2212 MINUS SIGN (−), not a hyphen — a
   hyphen at that size is visually a dash, not a negative.
   ============================================================ */
(function (global) {
  "use strict";

  var MINUS = "−"; /* U+2212 MINUS SIGN — never "-" */

  /* An element symbol is one capital plus an optional lowercase:
     H, He, Fe. Anything else (digits, a second capital) is a
     polyatomic group. Used only when an ion omits `poly`, so a
     bank that forgets the flag still parenthesizes correctly —
     getting this wrong silently produces NH42SO4. */
  var MONATOMIC = /^[A-Z][a-z]?$/;

  function isInt(n) {
    return typeof n === "number" && isFinite(n) && Math.floor(n) === n;
  }

  /* Symbols come from hand-edited YAML. Escaping costs nothing and
     keeps a stray character in a bank from becoming markup. */
  function esc(s) {
    return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  /* ---------- integer helpers ---------- */

  /** Greatest common divisor. Always >= 0; gcd(0, n) === |n|. */
  function gcd(a, b) {
    if (!isInt(a) || !isInt(b)) throw new TypeError("gcd expects integers, got " + a + ", " + b);
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) {
      var t = b;
      b = a % b;
      a = t;
    }
    return a;
  }

  /** Least common multiple. Always >= 0; 0 if either argument is 0. */
  function lcm(a, b) {
    if (!isInt(a) || !isInt(b)) throw new TypeError("lcm expects integers, got " + a + ", " + b);
    var g = gcd(a, b);
    if (g === 0) return 0;
    return Math.abs(a / g * b);
  }

  /* ---------- rendering ---------- */

  /**
   * "SO4" -> "SO<sub>4</sub>", "C2H3O2" -> "C<sub>2</sub>H<sub>3</sub>O<sub>2</sub>".
   * Runs of digits are grouped so "C10" is one subscript, not two.
   */
  function symHtml(sym) {
    if (typeof sym !== "string" || sym === "") {
      throw new TypeError("symHtml expects a non-empty symbol string");
    }
    return sym.replace(/(\d+)|([^\d]+)/g, function (m, digits, rest) {
      return digits ? "<sub>" + digits + "</sub>" : esc(rest);
    });
  }

  /**
   * "+", "3+", "−", "2−". A magnitude of 1 is a bare sign with no
   * digit — Na+ is never written Na1+.
   */
  function chargeLabel(n) {
    if (!isInt(n)) throw new TypeError("chargeLabel expects an integer charge, got " + n);
    if (n === 0) return "0";
    var mag = Math.abs(n);
    return (mag === 1 ? "" : String(mag)) + (n > 0 ? "+" : MINUS);
  }

  /** "Na<sup>+</sup>", "Al<sup>3+</sup>", "SO<sub>4</sub><sup>2−</sup>" */
  function ionHtml(ion) {
    if (!ion || typeof ion !== "object") throw new TypeError("ionHtml expects an ion object");
    return symHtml(ion.sym) + "<sup>" + chargeLabel(ion.charge) + "</sup>";
  }

  /* ---------- the formula ---------- */

  function checkIon(ion, role) {
    if (!ion || typeof ion !== "object") {
      throw new TypeError(role + " must be an ion object");
    }
    if (typeof ion.sym !== "string" || ion.sym === "") {
      throw new TypeError(role + " is missing a sym");
    }
    if (!isInt(ion.charge)) {
      throw new TypeError(role + " " + ion.sym + " has a non-integer charge: " + ion.charge);
    }
  }

  function isPoly(ion) {
    /* An explicit flag always wins; inference is the fallback. */
    if (typeof ion.poly === "boolean") return ion.poly;
    return !MONATOMIC.test(ion.sym);
  }

  /**
   * formulaFor({sym:"Al",charge:3}, {sym:"SO4",charge:-2,poly:true})
   *   -> { formula:"Al2(SO4)3", html:"...", ratio:[2,3], needsParens:true, parts:[...] }
   *
   * LCM of the charge magnitudes gives the counts; the gcd reduce
   * keeps them in lowest terms so Ca2+ + SO4 2− is CaSO4, not
   * Ca2(SO4)2. A polyatomic is parenthesized iff its count > 1.
   */
  function formulaFor(cation, anion) {
    checkIon(cation, "cation");
    checkIon(anion, "anion");
    if (cation.charge <= 0) {
      throw new TypeError("cation " + cation.sym + " must have a positive charge, got " + cation.charge);
    }
    if (anion.charge >= 0) {
      throw new TypeError("anion " + anion.sym + " must have a negative charge, got " + anion.charge);
    }

    var cMag = Math.abs(cation.charge);
    var aMag = Math.abs(anion.charge);
    var total = lcm(cMag, aMag);
    var cCount = total / cMag;
    var aCount = total / aMag;

    /* LCM already yields lowest terms; the reduce is belt and
       braces so the gcd(ratio) === 1 invariant cannot drift. */
    var g = gcd(cCount, aCount);
    cCount /= g;
    aCount /= g;

    var parts = [
      buildPart(cation, cCount),
      buildPart(anion, aCount)
    ];

    var needsParens = parts[0].parens || parts[1].parens;

    return {
      formula: parts.map(partText).join(""),
      html: parts.map(partHtml).join(""),
      ratio: [cCount, aCount],
      needsParens: needsParens,
      parts: parts
    };
  }

  function buildPart(ion, count) {
    var poly = isPoly(ion);
    return {
      sym: ion.sym,
      charge: ion.charge,
      poly: poly,
      count: count,
      parens: poly && count > 1
    };
  }

  /* A count of 1 is never written: NaCl, not Na1Cl1. */
  function partText(p) {
    var body = p.parens ? "(" + p.sym + ")" : p.sym;
    return body + (p.count > 1 ? String(p.count) : "");
  }

  function partHtml(p) {
    var body = symHtml(p.sym);
    if (p.parens) body = "(" + body + ")";
    return body + (p.count > 1 ? "<sub>" + p.count + "</sub>" : "");
  }

  /** Sum of count * charge over the parts. 0 for every valid result. */
  function netCharge(result) {
    if (!result || typeof result !== "object" || !Array.isArray(result.parts)) {
      throw new TypeError("netCharge expects a formulaFor() result");
    }
    return result.parts.reduce(function (sum, p) {
      if (!isInt(p.count) || !isInt(p.charge)) {
        throw new TypeError("netCharge found a non-integer part: " + p.sym);
      }
      return sum + p.count * p.charge;
    }, 0);
  }

  var Chem = {
    formulaFor: formulaFor,
    symHtml: symHtml,
    ionHtml: ionHtml,
    chargeLabel: chargeLabel,
    netCharge: netCharge,
    gcd: gcd,
    lcm: lcm,
    MINUS: MINUS
  };

  global.Chem = Chem;

  /* Browser global is the shipping path; the export exists only so
     node can require this file for the property tests. */
  if (typeof module !== "undefined" && module.exports) module.exports = Chem;
})(typeof window !== "undefined" ? window : globalThis);
