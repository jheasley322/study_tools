# PROGRESS.md — run log and resume point

**Session:** 2026-08-13 · **Scope requested:** Phases 0 → 3 · **Reached:** end of Phase 0
**Authority:** `IMPLEMENTATION_PLAN.md` (what/why) + `CONTRACT.md` (pinned interfaces)

---

## Stopping point

**Phase 0 (Foundations) is complete. Phase 1 (Charge Cascade) has not started — no
`cascade/` directory exists.** This is a clean boundary: every shared module is built
and independently verified, and nothing is half-written.

One item is in flight at the moment of writing: `chem-verifier`'s **L2 iteration 2**
confirming re-audit. See "First thing to do on resume".

---

## Gate 0 — status

| Item | Status | Evidence (run by the orchestrator, not reported by an agent) |
|---|---|---|
| All property tests pass | ✅ | `npm test` → **55 passed, 0 failed** |
| Exhaustive derivation check, zero errors | ⏳ | `chem-verifier` PASS on iteration 1: **1326/1326 rows re-derived independently in Python**, zero mismatches. Iteration 2 confirming the delta to 1292 rows was in flight at session end. |
| `build_banks.py` rejects a malformed bank | ✅ | `python3 build_banks.py tests/fixtures/bad_bank.yaml` → **exit 1, 12 findings, nothing written**; `ions.json` sha1 unchanged |

Iteration 1 audited a 1326-row dump and a bank that have both since changed (H3O
excluded, `Hg2` note added). The confirming pass exists so the PASS carries forward to
the artifacts that actually ship. **Do not declare Gate 0 green without it.**

---

## What exists now

```
build_banks.py          bank compiler + validator (answer-leak check, poly stamping,
                        derivable/derive_charges validation, --check, --strict)
package.json            dev only, ZERO dependencies, "test": "node tests/run.js"
banks_src/ions.yaml     63 ions — 26 monatomic, 10 multivalent, 27 polyatomic
banks/ions.json         generated, committed
shared/chem.js          the keystone — formulaFor + render helpers
shared/drag.js          Pointer Events drag + tap-to-place + keyboard
shared/drag.css         touch-action etc. — CSS only, never set from JS
shared/bank.js          runtime bank loader, GitHub Pages base-path aware
tests/run.js            zero-dep runner
tests/harness.js        assert helpers over node:assert
tests/chem.test.js      55 property + edge tests
tests/derive.js         generates the audit artifact from the SHIPPED bank
tests/derived.txt       1292 rows, 38 cations × 34 anions, 36 structural classes
tests/fixtures/bad_bank.yaml   deliberately malformed, must always be rejected
```

Untouched and still working: `index.html`, `apps.json`, `shared/store.js`,
`shared/tokens.css`, `periodic/`.

**Nothing is committed.** All of the above is uncommitted working-tree state.

---

## Decisions made this session

Pinned in `CONTRACT.md`; recorded here so they are not relitigated.

**Framework reconciliation (§0).** The plan assumed ES modules, `shared/progress.js`,
and `engines/`. The live site uses classic `<script>` globals, `shared/store.js`, and
top-level app folders. Per the user's directive to fit the existing framework, **the
shipped repo wins**. No §0 locked decision (D1–D6) was touched.

**User decisions.**
- XP weighting: `xp = floor(score / xpDivisor * (difficulty / 3))`. Difficulty 3 is
  neutral, so a difficulty-3 bank pays exactly what `periodic/` pays today.
- WILD near miss: dropping iron into a charge it genuinely forms costs **no life** but
  **breaks the combo**. It must not end a run, but it must cost real points.

**Orchestrator decisions.**
- Level ramp: advance every **8 correct**, clamp at the last level.
- Freeze-on-lift is **global** (whole rAF loop), which makes tap/keyboard paths fair
  and means no tile can hit the floor while another is in hand.
- Bucket ids stay ASCII in the bank; every visible label comes from
  `Chem.chargeLabel()` so the student sees U+2212.
- D1's arithmetic corrected: buckets are **~82px** on a 390px phone, not the ~120px
  D1 claims. The decision stands (82px is 1.9× the 44px HIG minimum); only the number
  attached to it was wrong.

**Chemistry constraints (§10), from the Gate 0 audit.**
- `H` is excluded from the **Matrix cation pool** — `H⁺ + HSO4⁻ → HHSO4` where a
  teacher expects `H2SO4`, and `H⁺` compounds are acids under acid-naming rules.
  `H` stays in `ions.yaml` and stays in Cascade.
- `H3O` excluded everywhere via `derivable: false`.
- `Hg` carries `derive_charges: [2]`; mercury(I) ships as the polyatomic dimer `Hg2²⁺`.

---

## The four bugs Phase 0 caught, and why they matter

All four are the same species: **arithmetically correct, chemically wrong**. Every one
passes net-charge, lowest-terms, and parens-iff-poly — the invariants the plan lists.
None was caught by a test; each was caught by an agent doubting its own output.

1. `HgCl` — mercury(I) is the dimer `Hg2²⁺`. Wrong against 1− anions, *right* against
   2− anions, so a spot check passes.
2. `H3OCl` — hydronium forms no isolable salt.
3. `Hg23(PO4)2` — a narrowed `poly` regex silently un-parenthesizing. Identical output
   to the correct version against chloride; diverges only against multi-charge anions.
4. `derivable: "false"` — a quoted YAML string is truthy to `derivable !== false`, so
   the exclusion silently evaporates.

**The lesson for whoever resumes:** the plan's invariants are necessary and none is
sufficient. Mechanical checks catch arithmetic errors; every real defect here was
semantic. That is the argument for `chem-verifier` being a separate read-only agent.

---

## Open items

**Required before Gate 0 closes**
- `chem-verifier` L2 iteration 2 verdict (in flight at session end).

**Landed and verified at session end** (both re-run by the orchestrator)
- Task #17 — `no_ion` cross-bank check. Verified: a bank listing `Na` in `no_ion` is
  rejected, exit 1, naming the colliding section — *"NOBLE is the bucket for elements
  that form no monatomic ion; a sym in both gives the same tile two correct answers."*
  Also verified: the check still fires on an explicit single-file compile (the silent
  no-op failure mode), and an unreadable/unparseable `ions.yaml` is an **error, not a
  skip** — an empty index would make every collision invisible while printing `ok`.
  **Gate 1 boundary:** this rule proves a `no_ion` sym is *not* in the ion reference.
  It cannot prove the list *is* exactly the noble gases — a fictional `Zz`, or a
  missing `Rn`, both pass. Confirming the list is chemically right belongs to
  `chem-verifier` at Gate 1. Same shape as the `derivable` boundary in §10: the
  compiler proves the two files do not contradict each other, never that the content
  is correct.
- `drag.js` prune fix — `prune()` filters `owned`/`marks` by `isConnected`, keeping the
  parallel arrays aligned. Fixes an unbounded detached-node leak **and** O(n²)
  `indexOf` cost that would have presented as "the game gets choppy near the end of a
  run" — Cascade spawns a tile every ~2s.
  **Caveat: `engine-drag` never sent its task #4 report.** The code is present and
  reads correctly, but the requested before/after array-length measurement was never
  produced, and no one has exercised `drag.js` in a browser. Treat it as unproven.

**Deferred deliberately**
- Absent polyatomics flagged advisory by the auditor: thiosulfate, bromate, iodate,
  cyanate, silicate, hydrogen sulfite; plus In³⁺, Te²⁻. Cheap to add; worth revisiting
  once both games run. The auditor was asked to escalate any of these to *required* if
  omitting it risks her grade — check that answer in the iteration-2 report.
- `shared/bank.js` silently falls back to `base = ""` if the `document.currentScript`
  regex does not match — reintroducing exactly the `/cascade/banks/` 404 the resolution
  prevents, and only on the deployed Pages URL. A `console.warn` on non-match was
  deferred to the mobile audit.
- Nothing has run on a real iPhone. `CLAUDE.md` is explicit that desktop responsive
  mode does not count. Phase 3 gate item.

---

## First thing to do on resume

1. Check `chem-verifier`'s iteration-2 verdict. If PASS with zero required fixes,
   **Gate 0 closes**. If not, run L2 iteration 3 — and if a required fix survives
   iteration 3, stop and report rather than shipping.
2. `drag.js` has **never run in a browser.** Before or alongside the Cascade build,
   exercise it on a served page at 390px: all three commit paths (drag, tap, keyboard),
   `pointercancel` mid-drag leaving no orphan ghost, and the prune actually bounding
   `owned`/`marks` across ~500 spawn/remove cycles. It is the least-verified file in
   the repo and the whole game sits on it.
3. Then dispatch Phase 1 as one parallel batch: `chem-ion-charges.yaml` (bank-author)
   and the Cascade engine (engine-builder), per `CONTRACT.md` §9.

---

## RESUME PROMPT

Paste this to pick the run back up:

```
/goal Resume study_tools at Phase 1 (Charge Cascade). Phase 0 is complete —
read .next_games/PROGRESS.md first for state, then .next_games/CONTRACT.md
(the pinned interfaces, especially §9 Cascade and §10 Matrix pool constraints)
and .next_games/IMPLEMENTATION_PLAN.md (authority; §0 locked decisions).

Before dispatching anything: confirm Gate 0 is actually green. Check
chem-verifier's L2 iteration-2 verdict, run `npm test` and
`python3 build_banks.py tests/fixtures/bad_bank.yaml` yourself, and verify the
two in-flight fixes landed (task #17 no_ion cross-check; the drag.js
owned/marks prune). Do not take an agent report on trust — every green in
PROGRESS.md was re-run by the orchestrator, and that standard holds.

Then build Charge Cascade to CONTRACT §9, gate it against Gate 1, and continue
through Phases 2 and 3. Same rules: auditors are read-only and never patch
their own findings, L2 exits only at zero chemistry errors, no HTML5 Drag and
Drop, no new dependencies, banks carry no derivable answers.
```
