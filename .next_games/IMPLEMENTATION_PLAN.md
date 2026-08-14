# IMPLEMENTATION_PLAN.md

**Project:** `study_tools` — chemistry games
**Target:** Compound Matrix (A2) + Charge Cascade (B2)
**Constraints:** single player · static GitHub Pages · no backend · mobile Safari first

---

## 0. Locked decisions

Flip any of these by editing this section — agents read it as the source of truth.

| # | Decision | Value | Rationale |
|---|---|---|---|
| D1 | Cascade layout | **Center lane + 2×4 bucket grid** | 7 columns = 55px targets on a 390px phone. Center lane keeps drag, buckets get ~120px. Speed then depends on knowing the answer, not finger precision. |
| D2 | Matrix input | **Tile assembly + live charge meter** | No keyboard on mobile. Reuses `drag.js`. Absorbs most of the Zero Sum teaching value for free. |
| D3 | Acetate notation | **Accept both, display `C₂H₃O₂⁻`** | Teacher's convention unknown. Accepting one and rejecting the other is worse than accepting both. |
| D4 | Matrix tier 1 size | **3 cations × 4 anions = 12 cells** | Minimum set covering every charge combination including parentheses. Pattern over repetition. |
| D5 | Subscripts | **Real `<sub>` elements, never Unicode** | Unicode subscripts break copy/paste and read wrong in VoiceOver. |
| D6 | Build order | **Cascade → Matrix** | Charges are a prerequisite for Matrix. Cascade is also the more fun of the two, which decides whether she opens the site twice. |

---

## 1. Repo layout

```
study_tools/
├── index.html
├── IMPLEMENTATION_PLAN.md
├── CLAUDE.md
├── .claude/
│   ├── commands/goal.md
│   └── agents/{chem-verifier,mobile-auditor,bank-author,engine-builder,test-writer}.md
├── shared/
│   ├── chem.js          ← the keystone
│   ├── progress.js
│   ├── bank.js
│   ├── drag.js          ← done
│   ├── drag.css         ← done
│   └── ui.css
├── engines/
│   ├── cascade/{index.html,cascade.js,cascade.css}
│   └── matrix/{index.html,matrix.js,matrix.css}
├── banks_src/           ← YAML, source of truth
├── banks/               ← generated JSON, committed
├── tests/
└── build_banks.py
```

---

## 2. The keystone: `shared/chem.js`

Both games depend on one function. Every future chemistry game — nomenclature, balancing, stoichiometry — depends on it too.

```js
formulaFor(
  { sym: 'Al', charge:  3 },
  { sym: 'SO4', charge: -2, poly: true }
)
// → { formula: 'Al2(SO4)3', parts: [...], ratio: [2,3], needsParens: true }
```

**Algorithm:** LCM of charge magnitudes → divide for subscripts → reduce to lowest whole-number ratio → parenthesize a polyatomic only when its subscript exceeds 1.

**Invariants** (property tests, not examples):
- Net charge of the result is always exactly 0
- Subscripts are always in lowest terms — `Ca²⁺ + SO₄²⁻` yields `CaSO4`, never `Ca2(SO4)2`
- Parentheses appear if and only if `poly && subscript > 1`
- A subscript of 1 is never written

Wrong chemistry taught to a kid is the worst failure mode in this project. This module gets the most verification.

---

## 3. Phases and gates

Each phase has a **gate**. No phase advances until its gate is green.

### Phase 0 — Foundations

| Task | Agent | Parallel? |
|---|---|---|
| `chem.js` + property tests | `engine-builder` → `test-writer` | — |
| `progress.js` (XP, badges, save code) | `engine-builder` | ∥ with chem.js |
| `bank.js` + JSON schemas | `engine-builder` | ∥ |
| `build_banks.py` | `engine-builder` | after schemas |
| Ion reference data → `banks_src/ions.yaml` | `bank-author` | ∥ from the start |

**Gate 0**
- [ ] All property tests pass
- [ ] **Exhaustive derivation check** — generate the full cation × anion cross-product (~200 formulas), dump to `tests/derived.txt`, `chem-verifier` audits every row. Zero errors required.
- [ ] `build_banks.py` rejects a deliberately malformed bank

### Phase 1 — Charge Cascade

| Task | Agent | Parallel? |
|---|---|---|
| `chem-ion-charges.yaml` | `bank-author` | ∥ |
| Falling-tile rAF loop | `engine-builder` | ∥ |
| Bucket grid + `drag.js` wiring | `engine-builder` | after loop |
| Lives, combo, level ramp, wild tiles | `engine-builder` | after wiring |
| Badges + XP into `progress.js` | `engine-builder` | last |

**Gate 1**
- [ ] `chem-verifier`: every element→bucket mapping correct, wilds justified
- [ ] `mobile-auditor`: full iOS checklist clean
- [ ] Playable 90-second run start to finish, no console errors
- [ ] `pointercancel` mid-drag leaves no orphaned ghost

### Phase 2 — Compound Matrix

| Task | Agent | Parallel? |
|---|---|---|
| `chem-matrix-tier{1,2,3}.yaml` | `bank-author` | ∥ |
| Grid renderer | `engine-builder` | ∥ |
| Cell assembly tray + charge meter | `engine-builder` | after renderer |
| Validation via `formulaFor()` | `engine-builder` | after tray |
| Timer, PB, daily seeded variant | `engine-builder` | last |

**Gate 2**
- [ ] All 12 tier-1 cells derive correctly and are independently verified
- [ ] Banks contain **no hardcoded answers** — everything derives at runtime
- [ ] `mobile-auditor` clean
- [ ] Full grid completable with keyboard only

### Phase 3 — Integration

- [ ] Hub tiles for both games
- [ ] Global level correctly weighted by `meta.difficulty`
- [ ] Save code round-trips through export → clear storage → import
- [ ] Real-iPhone pass (not desktop responsive mode)

---

## 4. Subagent roster

| Agent | Job | Tools |
|---|---|---|
| **`chem-verifier`** | Independently audits chemistry correctness. Never writes app code — it checks. Owns the exhaustive derivation check. | Read, Grep, Bash |
| **`mobile-auditor`** | Audits against the iOS Safari + a11y checklist. Reports findings; does not fix. | Read, Grep, Glob |
| **`bank-author`** | Writes YAML banks to schema. Content only, no logic. | Read, Write, Bash |
| **`engine-builder`** | Implements one engine or module to spec. | Read, Write, Edit, Bash, Glob, Grep |
| **`test-writer`** | Writes property and unit tests. Adversarial by design — tries to break the code. | Read, Write, Edit, Bash |

**Separation of concerns is the point.** The agent that writes `chem.js` must not be the agent that certifies it. `chem-verifier` and `mobile-auditor` are read-only auditors precisely so they have no stake in the code passing.

---

## 5. Loops

Three loops run automatically. Each has an iteration cap so a stuck loop surfaces instead of burning tokens.

**L1 — Build loop** (cap 5)
`implement → run tests → read failures → fix → re-run` until green. On cap, stop and report the failing test with a diagnosis.

**L2 — Chemistry verification loop** (cap 3)
`derive all formulas → chem-verifier audits → fix data or algorithm → re-derive`. Exits only at zero errors. Never suppressed, never partially accepted.

**L3 — Mobile audit loop** (cap 3)
`mobile-auditor scans → engine-builder fixes → re-scan` until clean.

**Fan-out pattern.** At each gate, dispatch every applicable auditor in a single parallel batch, collect all reports, then fix. Do not audit serially — the auditors are independent and the round-trip cost dominates.

---

## 6. Definition of done

A phase is done when:

1. Its gate checklist is fully green
2. No test is skipped, `.only`'d, or commented out
3. No `TODO` or `FIXME` remains in shipped code
4. `chem-verifier` has signed off on every chemistry-bearing file touched
5. It runs on a real iPhone, from the deployed Pages URL

## 7. Non-negotiables

- **No hardcoded answers in banks.** Anything derivable derives at runtime.
- **No `localStorage` writes outside `progress.js`.** One owner.
- **No dependencies.** No npm at runtime, no CDN scripts. Static files only.
- **No HTML5 Drag and Drop API.** `dragstart` never fires from a finger on iOS. Pointer Events only, via `drag.js`.
- **`touch-action: none` lives in CSS**, never set from JS. Setting it in `pointerdown` is too late.
- **A test that fails is information, not an obstacle.** Never weaken a test to make it pass.
