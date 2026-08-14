# CLAUDE.md — study_tools

Static site of single-player study games, served from GitHub Pages. Built for two
kids: 7th grade and 10th grade. The 10th grader is in South Carolina high school
chemistry.

**Read `IMPLEMENTATION_PLAN.md` before any work.** Section 0 holds locked decisions;
Section 7 holds non-negotiables.

## Architecture

- Static files only. No backend, no database, no server-side anything.
- Zero runtime dependencies. No npm at runtime, no CDN scripts.
- ES modules. Only build step is `build_banks.py` (YAML → JSON).
- One engine per mechanic, many swappable content banks. Adding a subject means adding a YAML file, not writing code.
- `banks_src/*.yaml` is the source of truth; `banks/*.json` is generated and committed.

## Non-negotiables

- **Banks carry no derivable answers.** If `formulaFor()` can compute it, the bank carries inputs only.
- **`localStorage` is written from `shared/progress.js` and nowhere else.**
- **Never the HTML5 Drag and Drop API.** `dragstart` does not fire from a finger on iOS Safari. Use `shared/drag.js` (Pointer Events).
- **`touch-action: none` lives in CSS.** Setting it from JS in `pointerdown` is too late.
- **Real `<sub>` for subscripts.** Unicode subscripts break copy/paste and read wrong in VoiceOver.
- **Never weaken a test to make it pass.** A failing test is information.

## Correctness bar

This is used by an actual student for an actual graded course. A wrong ion charge
teaches a wrong answer. Chemistry content is verified by `chem-verifier` before any
gate — never asserted from memory, never sampled when it can be checked exhaustively.

## Target device

iPhone, portrait, ~390px, mobile Safari. Desktop responsive mode does not reproduce
Safari's scroll-versus-gesture arbitration, so it does not count as testing.

## Testing

```bash
python -m http.server 8000     # file:// blocks ES modules
npm test                       # property tests for shared/
python build_banks.py          # compile + validate banks
```

## Commands

`/goal <statement>` — plan and execute with subagents, gates, and verification loops.
