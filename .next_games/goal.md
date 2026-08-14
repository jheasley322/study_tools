---
description: Plan and execute a goal against study_tools using subagents, verification gates, and self-correcting loops
argument-hint: <goal statement, e.g. "ship Charge Cascade through Gate 1">
allowed-tools: Read, Write, Edit, Bash, Glob, Grep, Task, TodoWrite, WebFetch
---

# GOAL: $ARGUMENTS

/goal You are executing against `study_tools`, a static GitHub Pages site of single-player
study games for two kids in 7th and 10th grade. The 10th grader is in SC high school
chemistry. Correctness is not negotiable here — a wrong ion charge is worse than no
game at all.  all design docs are in .next_games/  and make sure you fit yourself to the existing github page framework and themes!

## Current state

- Branch / status: !`git status --short --branch 2>/dev/null | head -20`
- Recent work: !`git log --oneline -8 2>/dev/null`
- Test result: !`npm test 2>&1 | tail -15 || echo "(no test runner yet)"`
- Tree: !`find . -type f \( -name '*.js' -o -name '*.yaml' -o -name '*.html' \) -not -path './node_modules/*' 2>/dev/null | head -40`

## Authority

@IMPLEMENTATION_PLAN.md is the source of truth. Section 0 holds locked decisions —
**do not relitigate them.** If the goal genuinely conflicts with a locked decision,
stop and say so rather than silently choosing.

---

## Execution protocol

### Step 1 — Orient

Read `IMPLEMENTATION_PLAN.md` and identify:
- which phase this goal belongs to
- which gate must be green before the goal counts as met
- what already exists versus what must be built

State this back in three lines before touching anything. If the goal is ambiguous
about scope, ask **one** question and stop. Do not guess and proceed.

### Step 2 — Plan

Enter plan mode. Produce a task decomposition where every task is:
- independently verifiable (there is an observable way to know it's done)
- assigned to a specific agent from the Section 4 roster
- marked **parallel** or **sequential**, with the blocking dependency named

Write it to `TodoWrite`. This is the working contract for the rest of the run.

### Step 3 — Dispatch

Fan out. Launch every parallel task in a **single batch** of `Task` calls — one
message, many agents. Serial dispatch of independent work is the most common way
to waste a run.

Each subagent prompt must contain:
- the exact deliverable (file path and what "correct" means)
- the relevant excerpt from `IMPLEMENTATION_PLAN.md` — agents do not share your context
- explicit non-goals, so nobody wanders outside its lane

Auditors (`chem-verifier`, `mobile-auditor`) are **read-only**. If one proposes a
fix, route the fix to `engine-builder`. Never let a reviewer patch its own finding.

### Step 4 — Loop until green

Run the loops from Section 5 with their caps:

- **L1 build** (≤5): implement → test → read failures → fix → re-run
- **L2 chemistry** (≤3): derive every formula → `chem-verifier` audits → fix → re-derive. Exits **only** at zero errors.
- **L3 mobile** (≤3): `mobile-auditor` scans → fix → re-scan

Each iteration, state in one line: what failed, why, what you changed. If a loop
hits its cap, **stop and report** with a diagnosis. Do not weaken a test, loosen an
assertion, or narrow a check to escape a loop. A failing test is information.

### Step 5 — Gate

Walk the gate checklist item by item and produce evidence for each — a passing test
name, a file path, a command output. "Looks right" is not evidence.

Any red item means the gate fails. Say so plainly. Do not partially pass a gate.

### Step 6 — Self-critique

Before declaring done, re-read your own diff as a hostile reviewer and answer:

1. What did I hardcode that should derive? (Section 7: banks carry no answers.)
2. What breaks on a 390px iPhone that I only tested at desktop width?
3. Which chemistry claim did I assert from memory instead of verifying?
4. What did I mark complete that I never actually ran?
5. Where does this violate a Section 7 non-negotiable?

Fix anything this surfaces. Then report.

### Step 7 — Report

- Gate status with per-item evidence
- Files created and modified
- Anything deferred, and why
- The single next action

---

## Rules

- **Never mark a todo complete without running the check.** Not "should work" — ran it.
- **Never skip a gate**, even if the next phase seems unblocked.
- **Never suppress a chemistry error.** L2 exits at zero, or the run stops.
- **No new dependencies.** No npm at runtime, no CDN scripts, static files only.
- **No HTML5 Drag and Drop API.** `dragstart` does not fire from a finger on iOS. Pointer Events, via `shared/drag.js`.
- **Uncertain about chemistry? Verify it.** `WebFetch` an authoritative source or dispatch `chem-verifier`. Do not assert from memory.
- **Prefer deleting to adding.** If a feature isn't in the plan, it isn't in scope.

