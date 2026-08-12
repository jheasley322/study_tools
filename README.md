# study_tools

A static hub of study drills, served from GitHub Pages. No backend, no build step, no dependencies.

**Live:** https://jheasley322.github.io/study_tools/

## Layout

```
index.html          Hub. Renders one tile per entry in apps.json.
apps.json           App registry. The only file the hub reads.
manifest.json       Add to Home Screen metadata.
shared/
  tokens.css        Design system. Colors, type, buttons, level meter.
  store.js          Namespaced persistence + global XP wallet.
periodic/
  index.html        Markup and app-specific styles.
  config.js         All tunable values. No logic.
  game.js           Logic only. Reads config, writes through store.
```

## Persistence

GitHub Pages serves every repo on your account from a single origin
(`jheasley322.github.io`), so `localStorage` is shared across **all** of your
Pages sites. Every key here is namespaced under `st.` for that reason. Use the
same prefix in anything new.

The profile object:

```javascript
{
  xp: 0,                    // drives the global level
  runs: 0,
  earned: { periodic: [] }, // badge ids, per app
  best:   { periodic: 0 }   // high score, per app
}
```

Levels use `level = floor(sqrt(xp / 50)) + 1`, so each one costs progressively
more. Apps bank XP at the end of a run via `scope.finishRun(xp)`.

Storage caveats worth knowing:

- Per browser, per device. No sync between phone and laptop.
- iOS Safari can evict script-writable storage after ~7 days without a visit.
  Adding the site to the Home Screen and using it regularly counts as
  engagement and keeps data alive.
- Private browsing and "Clear History and Website Data" both wipe it.
- If storage is blocked entirely, `store.js` falls back to memory so nothing
  throws — progress just does not survive the session.

## Adding a new app

1. Create a folder, e.g. `verbs/`, with `index.html`, `config.js`, `game.js`.
2. Link `../shared/tokens.css` and `../shared/store.js`.
3. Scope your storage: `var scope = Store.app("verbs");`
4. Add an entry to `apps.json`:

```json
{
  "id": "verbs",
  "name": "Conjugate",
  "subject": "Spanish verbs",
  "tagline": "One line describing the drill.",
  "path": "verbs/",
  "glyph": "\u00d1",
  "accent": "#7FD4FF",
  "badges": 6,
  "live": true
}
```

Set `"live": false` to show a tile as a dimmed placeholder.

## Store API

| Call | Purpose |
| --- | --- |
| `Store.app(id)` | Scoped handle for one app |
| `scope.get(k, default)` / `scope.set(k, v)` | App-private settings |
| `scope.award(badgeId)` | Returns `true` only the first time |
| `scope.earned()` | Badge ids earned in this app |
| `scope.best(score)` | Records a high score; `true` when beaten |
| `scope.finishRun(xp)` | Banks XP, increments run count |
| `Store.levelProgress()` | `{ xp, level, into, need, pct }` |
| `Store.paintLevel(root)` | Fills any `.level` block on the page |
| `Store.reset()` | Wipes everything on this browser |

## Apps

### Spectra (`periodic/`)

Periodic table drill. Pick a ceiling from 10 to 118, choose number to name,
name to number, or a mix, and answer by typing or picking from four. Typed
names accept close spellings, international variants (aluminium, sulphur,
caesium), and the element symbol. Three lives per run; the multiplier climbs
one step every three correct and caps at 5x. Six badges.
