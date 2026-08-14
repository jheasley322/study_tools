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
| Exhaustive derivation check, zero errors | ✅ | `chem-verifier` **PASS, L2 iteration 2, zero required fixes.** All 1292 rows re-derived independently in Python (twice — 1326 at iteration 1, 1292 at iteration 2), zero mismatches |
| `build_banks.py` rejects a malformed bank | ✅ | `python3 build_banks.py tests/fixtures/bad_bank.yaml` → **exit 1, 12 findings, nothing written**; `ions.json` sha1 unchanged |

**GATE 0 IS CLOSED.** L2 exited at iteration 2 of 3, at zero errors, never suppressed.

The auditor proved the 1326→1292 delta rather than inferring it: `derived.txt` is
untracked so there is no git history to diff, so it reconstructed both inventories from
the bank (ignoring `derivable` → 1326; honoring it → 1292; suppressed entries exactly
`[H3O]`). The 1326 reconstruction reproduced its iteration-1 inventory bit for bit,
which is what makes the carry-forward airtight.

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

**Required at Gate 2 — recorded before the Matrix banks exist**
- **Formula-string collisions.** `MnO2`, `PbO2`, `SnO2` are each produced by two
  different ion pairs (metal 4+ + oxide, and metal 2+ + peroxide). A validator
  comparing output *strings* will mark the wrong tiles correct. Either keep peroxide
  out of any tier offering a 4+ metal, or compare the **ion pair**. See `CONTRACT.md`
  §10 — and note `PbO2` is externally corroborated ("lead peroxide" is a real PubChem
  synonym for lead(IV) oxide), so a student who searches it gets confirmation of the
  wrong answer.

**Required at Gate 1 or 3**
- The reference view must actually **render `note`**. A note that compiles but is never
  displayed does not help her — the `Hg2` fix is only half-delivered until something
  shows it.

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
- `drag.js` prune fix — **measured, not asserted.** 500 spawn/retire cycles with 10
  tiles live: `owned.length` 501 → 11, detached nodes retained 490 → 0. At n=5000 the
  old code costs ~18× the time for 10× the cycles (superlinear, as predicted) and the
  new code ~5.7×. Honest wrinkle reported by its author: at n=500 the fix is *slower*
  (3.1ms → 5.7ms) because the O(n²) has not bitten yet — the leak, not the CPU, is why
  it ships.
- `drag.js` **has now run in a browser** (desktop Chrome): a 44-assertion harness,
  44/44 passing with 0 leftover ghosts, plus an interactive board driven with real
  browser-generated input. Verified there: capture lands on `rootEl` not the tile, all
  three commit paths (`drag`/`tap`/`key`), `pointercancel` mid-drag leaving
  `ghostsAfterCancel=0`, a *throwing* `onCancel` still not stranding a ghost,
  `lostpointercapture`, `destroy()` mid-drag, second finger ignored, the post-drag
  click swallowed exactly once without over-swallowing.
  Its author reached green through three wrong expectations **of its own harness**,
  corrected in the harness and never in `drag.js` — which is the right direction.

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
  mode does not count. Phase 3 gate item. Specifically untested on glass, per
  `drag.js`'s author: Safari's scroll-versus-gesture arbitration (the entire reason
  `touch-action` lives in CSS), `-webkit-touch-callout` suppressing the long-press
  callout (Chrome does not implement the property at all), a real `pointercancel` from
  a notification banner, whether iOS emits the post-drag synthetic click at all (the
  400ms un-swallow timer exists for the case where it does not), `prefers-reduced-
  motion` as rendered, and VoiceOver on `aria-grabbed`.
- **Known limitation, inherent to the prune fix:** a pooled node re-inserted *without*
  being reset keeps its attributes, so the second `stamp()` records "not mine to
  remove" and `destroy()` leaves `tabindex`/`data-drag`/`role` on it. Closing this
  would require retaining the pruned node — which is the leak. Cosmetic, post-teardown,
  on a node the game already owns.
- Test infrastructure note for whoever runs a browser next: the Bash sandbox isolates
  localhost, so Chrome gets `ERR_CONNECTION_REFUSED` on `localhost:PORT`. Serve and
  load via the LAN IP instead. Headless `--dump-dom` hangs under the sandbox.

---

## First thing to do on resume

1. **Gate 0 is already closed** — re-run `npm test` (expect 55/55) and
   `python3 build_banks.py tests/fixtures/bad_bank.yaml` (expect exit 1) to confirm
   nothing rotted, then go straight to Phase 1. No further chemistry audit is owed at
   this gate.
2. Reconcile `[data-drag]` vs `[data-draggable]` before the Gate 1 mobile audit, or
   the audit reads as a false FAIL. `CONTRACT.md` §4 is authoritative and the code is
   built to it; `mobile-auditor.md`'s checklist has the other spelling.
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

Gate 0 is CLOSED (chem-verifier PASS, L2 iteration 2, zero required fixes).
Re-run `npm test` (55/55) and `python3 build_banks.py
tests/fixtures/bad_bank.yaml` (exit 1) to confirm nothing rotted, then
proceed. Do not take an agent report on trust — every green in PROGRESS.md
was re-run by the orchestrator, and that standard holds.

Note shared/drag.js has never run in a browser; exercise it before or
alongside the Cascade build. It is the least-verified file in the repo.

Then build Charge Cascade to CONTRACT §9, gate it against Gate 1, and continue
through Phases 2 and 3. Same rules: auditors are read-only and never patch
their own findings, L2 exits only at zero chemistry errors, no HTML5 Drag and
Drop, no new dependencies, banks carry no derivable answers.
```
