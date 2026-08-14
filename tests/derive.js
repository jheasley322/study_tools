/* ============================================================
   study_tools — exhaustive derivation dump (Gate 0)
   ------------------------------------------------------------
   node tests/derive.js   ->   writes tests/derived.txt

   This is a GENERATOR, not a test. tests/run.js only picks up
   *.test.js, so `npm test` neither runs this nor depends on it.

   The ions come from the SHIPPED bank, banks/ions.json — the
   same data the real games hand to the real algorithm. Test
   fixtures would audit a parallel universe, so there is no
   fallback: if the bank cannot be read, this exits non-zero.

   Output is grouped by STRUCTURAL CLASS — (|cation charge|,
   |anion charge|, cation polyatomic?, anion polyatomic?). Every
   row inside a class is structurally identical and must share
   one ratio, so a human auditor can check a class by hand and
   trust the rest of it by construction. Nobody can meaningfully
   eyeball ~1300 unsorted rows.
   ============================================================ */
"use strict";

var fs = require("node:fs");
var path = require("node:path");
var Chem = require("../shared/chem.js");

var TESTS_DIR = __dirname;
var REPO = path.join(TESTS_DIR, "..");
var BANK_PATH = path.join(REPO, "banks", "ions.json");
var OUT_PATH = path.join(TESTS_DIR, "derived.txt");

/* Entries chem-verifier listed as uncertain. Rows touching these
   need hand attention no matter how clean their class looks. */
var FLAGGED = {
  Ni: "Ni",
  Mn: "Mn",
  Cr: "Cr",
  PO3: "PO3",
  Hg: "Hg",
  Hg2: "Hg2"
};

function die(msg) {
  process.stderr.write("derive.js: " + msg + "\n");
  process.exit(1);
}

/* ---------- the bank ---------- */

function loadBank() {
  var raw;
  try {
    raw = fs.readFileSync(BANK_PATH, "utf8");
  } catch (e) {
    die(
      "cannot read " + BANK_PATH + "\n" +
      "  run `python3 build_banks.py` to generate it, then re-run.\n" +
      "  refusing to fall back to test fixtures — this audit is only meaningful\n" +
      "  against the shipped bank.\n  " + e.message
    );
  }
  var bank;
  try {
    bank = JSON.parse(raw);
  } catch (e) {
    die("banks/ions.json is not valid JSON: " + e.message);
  }
  ["monatomic", "multivalent", "polyatomic"].forEach(function (section) {
    if (!Array.isArray(bank[section])) {
      die("banks/ions.json is missing the `" + section + "` section (or it is not an array)");
    }
  });
  if (!bank.meta || bank.meta.id !== "ions") {
    die("banks/ions.json has meta.id=" + (bank.meta && bank.meta.id) + ", expected \"ions\"");
  }
  return bank;
}

/* Which charges of a multivalent metal may be handed to formulaFor.
   `derive_charges` narrows `charges` and MUST be honored: mercury
   lists 1 and 2, but mercury(I) is really the dimer Hg2(2+), and
   deriving from a lone Hg(+) yields HgCl where the real compound
   is Hg2Cl2. The 1+ case lives in polyatomic as Hg2 instead. */
function derivableCharges(entry) {
  if (!Array.isArray(entry.charges) || entry.charges.length === 0) {
    die("multivalent entry " + entry.sym + " has no `charges` array");
  }
  if (entry.derive_charges === undefined) return entry.charges.slice();
  if (!Array.isArray(entry.derive_charges) || entry.derive_charges.length === 0) {
    die("multivalent entry " + entry.sym + " has a malformed `derive_charges`");
  }
  entry.derive_charges.forEach(function (c) {
    if (entry.charges.indexOf(c) === -1) {
      die(
        "multivalent entry " + entry.sym + " lists derive_charges " +
        JSON.stringify(entry.derive_charges) + " which is not a subset of charges " +
        JSON.stringify(entry.charges)
      );
    }
  });
  return entry.derive_charges.slice();
}

/* The Stock name for a given charge, e.g. Fe at 3 -> "iron(III)". */
function stockName(entry, charge) {
  var i = entry.charges.indexOf(charge);
  if (Array.isArray(entry.stock) && entry.stock[i]) return entry.stock[i];
  return entry.name;
}

/* build_banks.py stamps an explicit `poly` on every ion, derived from
   the section it sits in. This audit must use the SHIPPED flag — that
   is what the games will hand to formulaFor — but it also recomputes
   the value from the section and dies on any disagreement. Two
   derivations agreeing is the only reason to trust either, and a
   stamp that drifts from its section would silently change every
   parenthesis in this file. An entry with no flag at all falls
   through to chem.js's inference, which is locked by chem.test.js. */
function ion(sym, name, charge, sectionPoly, source, rec) {
  var poly = sectionPoly;
  if (rec && typeof rec.poly === "boolean") {
    if (rec.poly !== sectionPoly) {
      die(
        "bank entry " + sym + " in section `" + source + "` is stamped poly:" + rec.poly +
        " but the section implies poly:" + sectionPoly + ".\n" +
        "  refusing to derive from contradictory data — fix banks_src/ions.yaml or build_banks.py."
      );
    }
    poly = rec.poly;
  }
  return { sym: sym, name: name, charge: charge, poly: poly, source: source, stamped: !!(rec && typeof rec.poly === "boolean") };
}

/* CONTRACT §5: `derivable: false` means reference and recognition
   only, never fed to formulaFor by a game. H3O+ is a real ion, but
   H3O(1+) + Cl(1-) -> H3OCl is arithmetically perfect and chemically
   nonsense — the same failure mode as HgCl, reached by a different
   route. The test is `!== false`, so only an explicit false excludes.

   The boundary is the ION, never the formula: Al(3+) + O2(2-) ->
   Al2(O2)3 stays, because "given these two ions, write the neutral
   formula" is a question a teacher would pose and Al2(O2)3 is the
   answer they would mark correct. The H3O pair is never posed at all. */
function isDerivable(entry) {
  if (entry.derivable === undefined) return true;
  if (typeof entry.derivable !== "boolean") {
    die("bank entry " + entry.sym + " has a non-boolean `derivable`: " + JSON.stringify(entry.derivable));
  }
  return entry.derivable !== false;
}

function buildIons(bank) {
  var cations = [];
  var anions = [];
  var skipped = [];

  /* Excluded loudly, never silently dropped — the whole point of the
     EXCLUDED block is that a reader can see what is NOT in the dump. */
  function excludeIfNotDerivable(e, section) {
    if (isDerivable(e)) return false;
    skipped.push(
      e.sym + "(" + chargeText(e.charge) + ") " + e.name +
      " — excluded by derivable: false [" + section + ", reference-only]"
    );
    return true;
  }

  bank.monatomic.forEach(function (e) {
    if (excludeIfNotDerivable(e, "monatomic")) return;
    if (e.charge > 0) cations.push(ion(e.sym, e.name, e.charge, false, "monatomic", e));
    else if (e.charge < 0) anions.push(ion(e.sym, e.name, e.charge, false, "monatomic", e));
    else skipped.push(e.sym + " (monatomic, charge 0)");
  });

  bank.multivalent.forEach(function (e) {
    if (isDerivable(e) === false) {
      skipped.push(
        e.sym + " " + e.name + " (all charges) — excluded by derivable: false [multivalent, reference-only]"
      );
      return;
    }
    var usable = derivableCharges(e);
    e.charges.forEach(function (c) {
      if (usable.indexOf(c) === -1) {
        skipped.push(e.sym + "(" + c + "+) — excluded by derive_charges");
      }
    });
    usable.forEach(function (c) {
      if (c > 0) cations.push(ion(e.sym, stockName(e, c), c, false, "multivalent", e));
      else if (c < 0) anions.push(ion(e.sym, stockName(e, c), c, false, "multivalent", e));
    });
  });

  bank.polyatomic.forEach(function (e) {
    if (excludeIfNotDerivable(e, "polyatomic")) return;
    if (e.charge > 0) cations.push(ion(e.sym, e.name, e.charge, true, "polyatomic", e));
    else if (e.charge < 0) anions.push(ion(e.sym, e.name, e.charge, true, "polyatomic", e));
    else skipped.push(e.sym + " (polyatomic, charge 0)");
  });

  return { cations: cations, anions: anions, skipped: skipped };
}

/* ---------- ordering: deterministic, so diffs are meaningful ---------- */

function byIon(a, b) {
  var am = Math.abs(a.charge);
  var bm = Math.abs(b.charge);
  if (am !== bm) return am - bm;
  if (a.poly !== b.poly) return a.poly ? 1 : -1;
  if (a.sym !== b.sym) return a.sym < b.sym ? -1 : 1;
  return a.charge - b.charge;
}

/* ---------- rendering ---------- */

/* Plain ASCII "+"/"-" with an always-explicit magnitude: Na(1+),
   not Na(+). This is a grep-able audit artifact, not UI — D5's
   real <sub>/<sup> rule governs the browser, and an unambiguous
   magnitude matters more than typography in a diff. */
function chargeText(n) {
  return Math.abs(n) + (n > 0 ? "+" : "-");
}

function flagsFor(cation, anion) {
  var hits = [];
  [cation, anion].forEach(function (i) {
    if (FLAGGED[i.sym] && hits.indexOf(FLAGGED[i.sym]) === -1) hits.push(FLAGGED[i.sym]);
  });
  return hits.length ? "   [FLAGGED: " + hits.join(", ") + "]" : "";
}

/* The bank section already says "polyatomic", so only note the
   poly flag when it does not follow from the section. */
function legendLine(i) {
  var note = i.source;
  if (i.poly && i.source !== "polyatomic") note += ", polyatomic";
  return (
    "  " + i.sym + "(" + chargeText(i.charge) + ")  " + i.name +
    "  [" + note + "]" + (FLAGGED[i.sym] ? "  [FLAGGED]" : "")
  );
}

function classKey(c, a) {
  return [Math.abs(c.charge), Math.abs(a.charge), c.poly ? "poly" : "mono", a.poly ? "poly" : "mono"].join("|");
}

function classHeading(c, a, ratio, count) {
  return (
    "=== CLASS  cation " + Math.abs(c.charge) + "+ " + (c.poly ? "polyatomic" : "monatomic") +
    "   anion " + Math.abs(a.charge) + "- " + (a.poly ? "polyatomic" : "monatomic") +
    "   ratio " + ratio[0] + ":" + ratio[1] +
    "   " + count + " rows ==="
  );
}

/* ---------- main ---------- */

function main() {
  var bank = loadBank();
  var built = buildIons(bank);
  var cations = built.cations.slice().sort(byIon);
  var anions = built.anions.slice().sort(byIon);

  if (!cations.length || !anions.length) {
    die("bank yielded " + cations.length + " cations and " + anions.length + " anions — nothing to derive");
  }

  var classes = {};
  var order = [];
  var errors = [];
  var anomalies = [];
  var rowCount = 0;

  cations.forEach(function (c) {
    anions.forEach(function (a) {
      var key = classKey(c, a);
      if (!classes[key]) {
        classes[key] = { cation: c, anion: a, rows: [], ratio: null };
        order.push(key);
      }
      var bucket = classes[key];

      var r;
      try {
        r = Chem.formulaFor(c, a);
      } catch (e) {
        var failed =
          c.sym + "(" + chargeText(c.charge) + ") + " + a.sym + "(" + chargeText(a.charge) + ")" +
          "  ->  THREW " + (e && e.constructor ? e.constructor.name : typeof e) + ": " + (e && e.message);
        errors.push(failed);
        bucket.rows.push("!! " + failed + flagsFor(c, a));
        rowCount += 1;
        return;
      }

      var net = Chem.netCharge(r);
      if (net !== 0) {
        anomalies.push(r.formula + " from " + c.sym + "/" + a.sym + " has net charge " + net);
      }
      if (bucket.ratio === null) {
        bucket.ratio = r.ratio;
      } else if (bucket.ratio[0] !== r.ratio[0] || bucket.ratio[1] !== r.ratio[1]) {
        /* Ratio is a function of the two charge magnitudes alone,
           so it cannot vary inside a class. If it does, the class
           grouping is a lie and the auditor must not trust it. */
        anomalies.push(
          "class " + key + " is not structurally uniform: " + r.formula + " has ratio " +
          r.ratio.join(":") + " but the class ratio is " + bucket.ratio.join(":")
        );
      }

      bucket.rows.push(
        c.sym + "(" + chargeText(c.charge) + ") + " + a.sym + "(" + chargeText(a.charge) + ")" +
        "  ->  " + r.formula +
        "   ratio " + r.ratio[0] + ":" + r.ratio[1] +
        "   net " + net +
        flagsFor(c, a)
      );
      rowCount += 1;
    });
  });

  /* ---------- assemble the file ---------- */

  var out = [];
  out.push("# tests/derived.txt — GENERATED by tests/derive.js. Do not hand-edit.");
  out.push("# Regenerate with:  node tests/derive.js");
  out.push("#");
  out.push("# Source: banks/ions.json (the shipped bank, meta.id=" + bank.meta.id + "), NOT test fixtures.");
  out.push("# Formulas come from shared/chem.js formulaFor(); nothing here is hand-written.");
  out.push("#");
  out.push("# Row format:  Cation(charge) + Anion(charge)  ->  formula   ratio c:a   net 0");
  out.push("# Charge magnitude is always explicit: Na(1+), never Na(+).");
  out.push("# [FLAGGED: X] marks an ion chem-verifier listed as uncertain: " +
    Object.keys(FLAGGED).join(", ") + ".");
  out.push("# A row starting with !! threw instead of deriving.");
  out.push("#");
  out.push("# Classes group rows by (|cation charge|, |anion charge|, cation poly?, anion poly?).");
  out.push("# Every row in a class is structurally identical and shares one ratio, so checking");
  out.push("# one row by hand plus the class ratio certifies the whole class.");
  out.push("");
  out.push("TOTAL ROWS:  " + rowCount);
  out.push("CATIONS:     " + cations.length);
  out.push("ANIONS:      " + anions.length);
  out.push("CLASSES:     " + order.length);
  out.push("ERRORS:      " + errors.length);
  out.push("ANOMALIES:   " + anomalies.length);
  /* Two different populations, deliberately labelled. A derived
     INSTANCE is one (sym, charge) pair in this dump — a multivalent
     metal contributes several. A bank RECORD is one entry in
     banks/ions.json. Reported separately so nobody reading Gate 0
     evidence sees these two counts disagree and assumes a bug. */
  var instances = cations.concat(anions);
  var stamped = instances.filter(function (i) {
    return i.stamped;
  }).length;
  var records = bank.monatomic.length + bank.multivalent.length + bank.polyatomic.length;
  out.push(
    "POLY FLAG:   " + stamped + " of " + instances.length +
    " derived ion INSTANCES (" + cations.length + " cations + " + anions.length +
    " anions) carry an explicit poly stamped by build_banks.py" +
    (stamped === instances.length ? "; none rely on chem.js inference" : "; the rest rely on chem.js inference")
  );
  out.push(
    "BANK RECORDS: " + records + " entries in banks/ions.json (" +
    bank.monatomic.length + " monatomic + " + bank.multivalent.length + " multivalent + " +
    bank.polyatomic.length + " polyatomic). Instances exceed records because a" +
    " multivalent metal yields one ion per derivable charge."
  );
  out.push("");

  if (built.skipped.length) {
    out.push("EXCLUDED FROM DERIVATION");
    built.skipped.forEach(function (s) {
      out.push("  " + s);
    });
    out.push("");
  }

  if (errors.length) {
    out.push("ERRORS");
    errors.forEach(function (e) {
      out.push("  " + e);
    });
    out.push("");
  }

  if (anomalies.length) {
    out.push("ANOMALIES");
    anomalies.forEach(function (a) {
      out.push("  " + a);
    });
    out.push("");
  }

  out.push("CLASS COUNTS");
  order.forEach(function (key) {
    var b = classes[key];
    out.push(
      "  cation " + Math.abs(b.cation.charge) + "+ " + (b.cation.poly ? "poly" : "mono") +
      "   anion " + Math.abs(b.anion.charge) + "- " + (b.anion.poly ? "poly" : "mono") +
      "   ratio " + (b.ratio ? b.ratio.join(":") : "?") +
      "   " + b.rows.length + " rows"
    );
  });
  out.push("");

  out.push("CATION LEGEND (" + cations.length + ")");
  cations.forEach(function (c) {
    out.push(legendLine(c));
  });
  out.push("");

  out.push("ANION LEGEND (" + anions.length + ")");
  anions.forEach(function (a) {
    out.push(legendLine(a));
  });
  out.push("");

  order.forEach(function (key) {
    var b = classes[key];
    out.push(classHeading(b.cation, b.anion, b.ratio || ["?", "?"], b.rows.length));
    b.rows.forEach(function (row) {
      out.push(row);
    });
    out.push("");
  });

  fs.writeFileSync(OUT_PATH, out.join("\n"));

  /* ---------- console summary ---------- */

  process.stdout.write("wrote " + OUT_PATH + "\n");
  process.stdout.write(
    "  " + rowCount + " rows  (" + cations.length + " cations x " + anions.length + " anions)" +
    "  across " + order.length + " classes\n"
  );
  if (built.skipped.length) {
    process.stdout.write("  excluded: " + built.skipped.join("; ") + "\n");
  }
  process.stdout.write("  errors: " + errors.length + "   anomalies: " + anomalies.length + "\n");
  errors.forEach(function (e) {
    process.stdout.write("  !! " + e + "\n");
  });
  anomalies.forEach(function (a) {
    process.stdout.write("  ?? " + a + "\n");
  });

  if (rowCount !== cations.length * anions.length) {
    die("row count " + rowCount + " != " + cations.length + " x " + anions.length + " — the cross-product is incomplete");
  }
  if (errors.length || anomalies.length) process.exit(1);
}

main();
