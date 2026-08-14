#!/usr/bin/env python3
"""
build_banks.py -- compile and validate content banks.

    banks_src/<id>.yaml  ->  banks/<id>.json

Build time only. Nothing here ships to the browser; the games read the
generated JSON through shared/bank.js.

The validator exists because IMPLEMENTATION_PLAN.md Section 7 says banks carry
no derivable answers, and a rule enforced by discipline is a rule that breaks
the first time someone is in a hurry. The answer-leak check turns that rule
into a machine check: any key named formula/answer/solution/result anywhere in
a bank is a hard failure, because Chem.formulaFor() computes those at runtime
and a bank that also states them can silently disagree with the chemistry.

All-or-nothing: every bank is validated before any file is written. One bad
bank means nothing at all is written. A half-compiled banks/ directory is
worse than an empty one -- the games would load a stale mix and no one would
know which files were current.

Usage:
    python3 build_banks.py                        compile banks_src/*.yaml
    python3 build_banks.py path/to/one.yaml ...   compile just these files
    python3 build_banks.py --check                validate only, write nothing
    python3 build_banks.py --strict               treat warnings as failures

Exit codes: 0 ok, 1 validation failure, 2 usage or I/O error.
"""

import json
import os
import re
import sys

try:
    import yaml
except ImportError:
    sys.stderr.write(
        "build_banks.py needs PyYAML (build time only, nothing ships):\n"
        "    python3 -m pip install pyyaml\n"
    )
    sys.exit(2)


ROOT = os.path.dirname(os.path.abspath(__file__))
SRC_DIR = os.path.join(ROOT, "banks_src")
OUT_DIR = os.path.join(ROOT, "banks")

META_KEYS = ("id", "title", "subject", "grade", "standard", "engine", "difficulty")
ENGINES = ("cascade", "matrix", "reference")

# Keys that would mean a bank is stating an answer the engine can derive.
# The singular set is the pinned contract (CONTRACT.md Section 6). The plural
# set is included because "formulas:" is the obvious way to walk around a
# blocklist of "formula:", and Section 7 is about the intent, not the spelling.
BANNED_KEYS = ("formula", "answer", "solution", "result")
BANNED_PLURAL = ("formulas", "answers", "solutions", "results")

SYM_RE = re.compile(r"^[A-Z][A-Za-z0-9]*$")

# The YAML section an ion sits in is the ground truth for whether it is
# polyatomic. chem.js can infer it from the symbol (/^[A-Z][a-z]?$/ = monatomic),
# but that regex is load-bearing for entries like Hg2 -- the diatomic mercury(I)
# dimer -- and if anyone ever narrows it, Hg2 silently becomes monatomic and
# derives a wrong formula. Nothing throws, no test fails, a student just learns
# the wrong thing. Stamping an explicit flag from the section removes the
# inference from every shipped record; a section cannot drift the way a regex can.
SECTION_POLY = {"monatomic": False, "multivalent": False, "polyatomic": True}

# A placeholder standard code is allowed through so bank authors are not
# blocked on standards verification, but it is never allowed to ship quietly.
TBD_STANDARD = "TBD-VERIFY"

# The ion reference every other bank is checked against. Cascade's NOBLE bucket
# is "forms no monatomic ion", and the engine decides that by NOT finding a sym
# in ions.json -- so a sym present in both a no_ion list and the reference gives
# one tile two correct answers, and the bank disagrees with itself in silence.
IONS_REFERENCE = "ions"


def is_int(v):
    """True for a real integer. bool is an int subclass in Python; it is not one here."""
    return isinstance(v, int) and not isinstance(v, bool)


def is_text(v):
    return isinstance(v, str) and v.strip() != ""


def walk_dicts(node, path=""):
    """Yield (path, dict) for every mapping in the tree, including the root."""
    if isinstance(node, dict):
        yield path, node
        for key, value in node.items():
            child = "{}.{}".format(path, key) if path else str(key)
            for found in walk_dicts(value, child):
                yield found
    elif isinstance(node, list):
        for i, value in enumerate(node):
            for found in walk_dicts(value, "{}[{}]".format(path, i)):
                yield found


_ion_index = None   # cache: (index_or_None, error_or_None)


def ion_symbol_index():
    """
    {sym: [path, ...]} for every ion record in banks_src/ions.yaml.

    Read from disk rather than from whatever set of files this run happens to
    be compiling. That is the whole point: a cross-file rule that quietly
    no-ops when someone compiles one bank by explicit path is worse than no
    rule at all, because it prints "ok" and the author believes it.

    Returns (index, error). A read or parse failure is returned as an error
    string for the caller to report against the bank that needed it -- never
    swallowed into an empty index, which would make every collision invisible.
    """
    global _ion_index
    if _ion_index is not None:
        return _ion_index

    path = os.path.join(SRC_DIR, IONS_REFERENCE + ".yaml")
    try:
        with open(path, "r", encoding="utf-8") as fh:
            doc = yaml.safe_load(fh)
    except OSError as exc:
        _ion_index = (None, "cannot read {}: {}".format(os.path.relpath(path, ROOT), exc))
        return _ion_index
    except yaml.YAMLError as exc:
        _ion_index = (None, "{} will not parse: {}".format(
            os.path.relpath(path, ROOT), str(exc).replace("\n", " ")))
        return _ion_index

    if not isinstance(doc, dict):
        _ion_index = (None, "{} is not a mapping".format(os.path.relpath(path, ROOT)))
        return _ion_index

    index = {}
    for where, rec in walk_dicts(doc):
        sym = rec.get("sym")
        if isinstance(sym, str) and sym:
            index.setdefault(sym, []).append(where)
    _ion_index = (index, None)
    return _ion_index


def check_no_ion(doc, rep):
    """
    Cascade's NOBLE bucket is "forms no monatomic ion", and the engine decides
    that by failing to find a sym in ions.json. So a sym listed in `no_ion`
    that is ALSO in the ion reference gives one tile two correct answers, and
    the bank silently disagrees with itself. The reverse error is worse: a
    genuine ion-forming element parked in no_ion marks a student wrong for the
    right answer.

    Found by key anywhere in the tree, not just at the top level -- a `no_ion`
    nested under `config` must not escape the check by being in the wrong place.
    """
    for prefix, mapping in walk_dicts(doc):
        if "no_ion" not in mapping:
            continue
        base = "{}.no_ion".format(prefix) if prefix else "no_ion"
        pool = mapping.get("no_ion")

        if not isinstance(pool, list) or not pool:
            rep.error(base, "must be a non-empty list of element symbols")
            continue

        seen = {}
        for i, sym in enumerate(pool):
            at = "{}[{}]".format(base, i)
            if not isinstance(sym, str) or not SYM_RE.match(sym):
                rep.error(at, "{!r} is not a valid element symbol (^[A-Z][A-Za-z0-9]*$)".format(sym))
            elif sym in seen:
                rep.error(at, '"{}" is already listed at {}[{}]'.format(sym, base, seen[sym]))
            else:
                seen[sym] = i

        index, err = ion_symbol_index()
        if err:
            # Unverifiable is a failure, not a pass. NOBLE membership is decided
            # against this reference; without it the list cannot be trusted.
            rep.error(
                base,
                "cannot be checked -- {}. Membership of NOBLE is decided against "
                "the ion reference, so an unverifiable no_ion list is a failure, "
                "not a skip.".format(err),
            )
            continue

        for sym, i in sorted(seen.items(), key=lambda kv: kv[1]):
            hits = index.get(sym)
            if hits:
                rep.error(
                    "{}[{}]".format(base, i),
                    '"{}" is also an ion in {}.yaml ({}). NOBLE is the bucket for '
                    "elements that form no monatomic ion; a sym in both gives the "
                    "same tile two correct answers.".format(
                        sym, IONS_REFERENCE, ", ".join(hits)
                    ),
                )


class Report(object):
    """Findings for one source file. Every finding is collected, never the first only."""

    def __init__(self, label):
        self.label = label
        self.errors = []
        self.warnings = []
        self.stamped = {}

    def error(self, where, message):
        self.errors.append("{}: {}".format(where, message) if where else message)

    def warn(self, where, message):
        self.warnings.append("{}: {}".format(where, message) if where else message)

    @property
    def ok(self):
        return not self.errors


def check_meta(doc, stem, rep):
    meta = doc.get("meta")
    if not isinstance(meta, dict):
        rep.error("meta", "missing, or not a mapping")
        return

    for key in META_KEYS:
        if key not in meta:
            rep.error("meta." + key, "missing required key")

    bank_id = meta.get("id")
    if "id" in meta:
        if not is_text(bank_id):
            rep.error("meta.id", "must be a non-empty string")
        elif bank_id != stem:
            rep.error(
                "meta.id",
                '"{}" does not match the filename stem "{}"'.format(bank_id, stem),
            )

    for key in ("title", "subject", "standard"):
        if key in meta and not is_text(meta.get(key)):
            rep.error("meta." + key, "must be a non-empty string")

    if "grade" in meta:
        grade = meta.get("grade")
        if not (is_int(grade) or is_text(grade)):
            rep.error("meta.grade", "must be a number or a non-empty string")

    if "engine" in meta:
        engine = meta.get("engine")
        if engine not in ENGINES:
            rep.error(
                "meta.engine",
                "{!r} is not one of {}".format(engine, ", ".join(ENGINES)),
            )

    if "difficulty" in meta:
        diff = meta.get("difficulty")
        if not is_int(diff):
            rep.error("meta.difficulty", "must be an integer, got {!r}".format(diff))
        elif not 1 <= diff <= 5:
            rep.error("meta.difficulty", "must be 1-5, got {}".format(diff))

    if meta.get("standard") == TBD_STANDARD:
        rep.warn(
            "meta.standard",
            "still {} -- a real South Carolina standard code must replace this "
            "before ship".format(TBD_STANDARD),
        )

    if "config" not in doc:
        rep.error("config", "missing -- every bank needs a config section, even if empty")
    elif not isinstance(doc.get("config"), dict):
        rep.error("config", "must be a mapping")


def check_answer_leak(doc, rep):
    """No bank may state something Chem.formulaFor() can derive."""
    for path, mapping in walk_dicts(doc):
        for key in mapping.keys():
            if not isinstance(key, str):
                continue
            low = key.strip().lower()
            where = "{}.{}".format(path, key) if path else key
            if low in BANNED_KEYS:
                rep.error(
                    where,
                    "answer leak -- banks carry inputs only, this is derived at "
                    "runtime (IMPLEMENTATION_PLAN.md Section 7)",
                )
            elif low in BANNED_PLURAL:
                rep.error(
                    where,
                    "answer leak -- plural form of a banned key, same rule "
                    "(IMPLEMENTATION_PLAN.md Section 7)",
                )


def check_ions(doc, rep):
    """
    Any mapping carrying a `sym` is an ion record. Validating on the presence of
    `sym` rather than on its section name means an ion embedded in an engine
    config is checked exactly like one in the reference bank.
    """
    for path, rec in walk_dicts(doc):
        if "sym" not in rec:
            continue

        sym = rec.get("sym")
        if not isinstance(sym, str) or not SYM_RE.match(sym):
            rep.error(
                path + ".sym",
                "{!r} does not match ^[A-Z][A-Za-z0-9]*$".format(sym),
            )

        if not is_text(rec.get("name")):
            rep.error(path + ".name", "missing or empty")

        has_charge = "charge" in rec
        has_charges = "charges" in rec

        if has_charge and has_charges:
            rep.error(
                path,
                "has both `charge` and `charges` -- ambiguous, pick one",
            )

        if has_charge:
            charge = rec.get("charge")
            if not is_int(charge):
                rep.error(path + ".charge", "must be an integer, got {!r}".format(charge))
            elif charge == 0:
                rep.error(path + ".charge", "must be non-zero -- a 0 charge is not an ion")

        if has_charges:
            charges = rec.get("charges")
            if not isinstance(charges, list) or not charges:
                rep.error(path + ".charges", "must be a non-empty list of integers")
            else:
                for i, c in enumerate(charges):
                    at = "{}.charges[{}]".format(path, i)
                    if not is_int(c):
                        rep.error(at, "must be an integer, got {!r}".format(c))
                    elif c == 0:
                        rep.error(at, "must be non-zero -- a 0 charge is not an ion")

                # CONTRACT.md Section 5 pins `stock` as index-aligned with
                # `charges`. A length mismatch silently mislabels an ion, e.g.
                # calling iron(III) "iron(II)" on a tile.
                stock = rec.get("stock")
                if stock is not None:
                    if not isinstance(stock, list):
                        rep.error(path + ".stock", "must be a list aligned with `charges`")
                    elif len(stock) != len(charges):
                        rep.error(
                            path + ".stock",
                            "has {} entries but `charges` has {} -- they are "
                            "index-aligned".format(len(stock), len(charges)),
                        )

        # derive_charges: the subset of `charges` that may be handed to
        # formulaFor() as a MONATOMIC ion. Mercury carries [2] because
        # mercury(I) is really the Hg2(2+) dimer -- Hg(+) + Cl(-) would derive
        # HgCl when the real compound is Hg2Cl2. Wrong against only some anions
        # is the worst kind of wrong: it survives a spot check.
        if "derive_charges" in rec:
            dc = rec.get("derive_charges")
            at = path + ".derive_charges"
            if not has_charges:
                rep.error(at, "only meaningful next to `charges`")
            elif not isinstance(dc, list) or not dc:
                rep.error(at, "must be a non-empty list")
            else:
                pool = rec.get("charges") if isinstance(rec.get("charges"), list) else []
                for i, c in enumerate(dc):
                    if not is_int(c):
                        rep.error("{}[{}]".format(at, i), "must be an integer, got {!r}".format(c))
                    elif pool and c not in pool:
                        rep.error(
                            "{}[{}]".format(at, i),
                            "{} is not in `charges` {} -- it must be a subset".format(c, pool),
                        )

        # Optional keys pinned by CONTRACT.md Section 5. They are never rejected;
        # they are only type-checked when present, so a typo shows up here rather
        # than as an empty label on a tile.
        for key in ("z", "group"):
            if key in rec and not is_int(rec.get(key)):
                rep.error("{}.{}".format(path, key), "must be an integer, got {!r}".format(rec.get(key)))

        for key in ("aliases", "alt_names", "stock"):
            if key in rec:
                val = rec.get(key)
                if not isinstance(val, list) or not val:
                    rep.error("{}.{}".format(path, key), "must be a non-empty list")
                elif not all(is_text(v) for v in val):
                    rep.error("{}.{}".format(path, key), "must contain only non-empty strings")

        if "note" in rec and not is_text(rec.get("note")):
            rep.error(path + ".note", "must be a non-empty string")

        if "poly" in rec and not isinstance(rec.get("poly"), bool):
            rep.error(path + ".poly", "must be true or false, got {!r}".format(rec.get("poly")))

        # `derivable: false` marks an ion as reference/recognition only -- real
        # enough to show, never fed to formulaFor(). H3O carries it because
        # H3O(1+) + Cl(1-) derives H3OCl: arithmetically perfect, chemically
        # nonsense. The type has to be exact. Every consumer tests
        # `derivable !== false`, so a quoted "false" out of YAML is a truthy
        # string, the ion becomes derivable again, and the exclusion evaporates
        # with no error anywhere. `derivable: true` is allowed -- it only
        # restates the default, and an author being explicit is being clear.
        if "derivable" in rec and not isinstance(rec.get("derivable"), bool):
            rep.error(
                path + ".derivable",
                "must be the boolean true or false, got {!r}. A quoted \"false\" or a "
                "0/1 is truthy to the games, which test `derivable !== false` -- the "
                "ion would silently go back to being derivable.".format(rec.get("derivable")),
            )

        if not has_charge and not has_charges:
            rep.error(path, "has neither `charge` nor `charges`")


def stamp_poly(doc, rep):
    """
    Write an explicit `poly` onto every ion in a known section, taking the
    SECTION as ground truth. Returns {section: count} of records stamped.

    An entry whose own `poly` contradicts its section is a hard error rather
    than a silent overwrite -- the disagreement means one of the two is wrong
    and the compiler cannot know which.
    """
    counts = {}
    for section, value in SECTION_POLY.items():
        records = doc.get(section)
        if records is None:
            continue
        if not isinstance(records, list):
            rep.error(section, "must be a list of ion records")
            continue

        counts[section] = 0
        for i, rec in enumerate(records):
            path = "{}[{}]".format(section, i)
            if not isinstance(rec, dict):
                rep.error(path, "is not a mapping")
                continue
            if "sym" not in rec:
                rep.error(path, "has no `sym` -- every entry in an ion section is an ion")
                continue

            if "poly" in rec and isinstance(rec["poly"], bool) and rec["poly"] != value:
                rep.error(
                    path + ".poly",
                    "declares {} but sits in the `{}` section, which is authoritative "
                    "({}). Fix one of them -- the compiler will not guess.".format(
                        str(rec["poly"]).lower(), section, "poly: " + str(value).lower()
                    ),
                )
                continue

            records[i] = with_poly(rec, value)
            counts[section] += 1
    return counts


def with_poly(rec, value):
    """Copy of rec with `poly` set, placed just after `name` so it reads well."""
    out = {}
    for key, val in rec.items():
        if key == "poly":
            continue
        out[key] = val
        if key == "name":
            out["poly"] = value
    if "poly" not in out:
        out["poly"] = value
    return out


def validate_file(src_path):
    """Returns (Report, doc_or_None, stem)."""
    stem = os.path.splitext(os.path.basename(src_path))[0]
    rep = Report(os.path.relpath(src_path, ROOT))

    try:
        with open(src_path, "r", encoding="utf-8") as fh:
            doc = yaml.safe_load(fh)
    except yaml.YAMLError as exc:
        rep.error("", "YAML will not parse: {}".format(str(exc).replace("\n", " ")))
        return rep, None, stem
    except OSError as exc:
        rep.error("", "cannot read: {}".format(exc))
        return rep, None, stem

    if doc is None:
        rep.error("", "file is empty")
        return rep, None, stem
    if not isinstance(doc, dict):
        rep.error("", "top level must be a mapping, got {}".format(type(doc).__name__))
        return rep, None, stem

    check_meta(doc, stem, rep)
    check_answer_leak(doc, rep)
    check_ions(doc, rep)
    check_no_ion(doc, rep)
    # Last, so every check above sees the author's data as written.
    rep.stamped = stamp_poly(doc, rep)
    return rep, doc, stem


def main(argv):
    args = argv[1:]
    if "-h" in args or "--help" in args:
        sys.stdout.write(__doc__)
        return 0

    check_only = "--check" in args
    strict = "--strict" in args
    paths = [a for a in args if not a.startswith("-")]
    unknown = [a for a in args if a.startswith("-") and a not in ("--check", "--strict")]
    if unknown:
        sys.stderr.write("unknown option(s): {}\n".format(" ".join(unknown)))
        return 2

    if paths:
        # Explicit paths only. The default run never reaches outside banks_src/,
        # which is what keeps tests/fixtures/bad_bank.yaml out of a normal build.
        sources = [os.path.abspath(p) for p in paths]
        missing = [p for p in sources if not os.path.isfile(p)]
        if missing:
            for p in missing:
                sys.stderr.write("no such file: {}\n".format(p))
            return 2
    else:
        if not os.path.isdir(SRC_DIR):
            sys.stderr.write("no banks_src/ directory at {}\n".format(SRC_DIR))
            return 2
        sources = sorted(
            os.path.join(SRC_DIR, n)
            for n in os.listdir(SRC_DIR)
            if n.endswith((".yaml", ".yml")) and not n.startswith(".")
        )
        if not sources:
            sys.stderr.write("no .yaml files in {}\n".format(SRC_DIR))
            return 2

    reports = []
    compiled = []
    seen_ids = {}

    for src in sources:
        rep, doc, stem = validate_file(src)

        # Two banks compiling to one filename means one silently overwrites the
        # other, so it is a failure of the run, not of either file alone.
        if stem in seen_ids:
            rep.error("", 'duplicate bank id "{}" (also {})'.format(stem, seen_ids[stem]))
        else:
            seen_ids[stem] = rep.label

        reports.append(rep)
        if rep.ok and doc is not None:
            compiled.append((stem, doc))

    n_err = sum(len(r.errors) for r in reports)
    n_warn = sum(len(r.warnings) for r in reports)

    for rep in reports:
        if rep.errors:
            print("FAIL  {}".format(rep.label))
            for line in rep.errors:
                print("        {}".format(line))
        for line in rep.warnings:
            print("WARN  {}: {}".format(rep.label, line))
        if rep.ok and not rep.warnings:
            print("ok    {}".format(rep.label))
        elif rep.ok:
            print("ok    {} (with warnings)".format(rep.label))
        if rep.ok and rep.stamped:
            print("        stamped poly: {}".format(
                ", ".join(
                    "{} {}={}".format(n, s, str(SECTION_POLY[s]).lower())
                    for s, n in sorted(rep.stamped.items())
                )
            ))

    if n_err:
        print(
            "\n{} error(s) across {} file(s). Nothing written -- a partially "
            "compiled banks/ is worse than an empty one.".format(n_err, len(sources))
        )
        return 1

    if strict and n_warn:
        print("\n{} warning(s) and --strict is set. Nothing written.".format(n_warn))
        return 1

    if check_only:
        print("\n{} file(s) valid. --check set, nothing written.".format(len(sources)))
        return 0

    try:
        os.makedirs(OUT_DIR, exist_ok=True)
        for stem, doc in compiled:
            out = os.path.join(OUT_DIR, stem + ".json")
            with open(out, "w", encoding="utf-8") as fh:
                json.dump(doc, fh, indent=2, ensure_ascii=False)
                fh.write("\n")
            print("wrote {}".format(os.path.relpath(out, ROOT)))
    except OSError as exc:
        sys.stderr.write("write failed: {}\n".format(exc))
        return 2

    print(
        "\n{} bank(s) compiled, {} warning(s).".format(len(compiled), n_warn)
    )
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
