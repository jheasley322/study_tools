/* ============================================================
   study_tools — shared persistence layer
   ------------------------------------------------------------
   GitHub Pages serves every repo from ONE origin
   (jheasley322.github.io), so localStorage is shared across all
   of your Pages sites. Everything here is namespaced under
   "st." to keep future projects from colliding.

   Degrades silently to in-memory when storage is blocked
   (iOS private browsing), so nothing ever throws.
   ============================================================ */
(function (global) {
  "use strict";

  var PREFIX = "st.";
  var mem = {};

  function read(key, fallback) {
    try {
      var v = localStorage.getItem(PREFIX + key);
      return v === null ? fallback : JSON.parse(v);
    } catch (e) {
      return key in mem ? mem[key] : fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch (e) {
      mem[key] = value;
    }
    return value;
  }

  /* ---------- global profile ----------
     { xp, runs, earned:{appId:[badgeId]}, best:{appId:score} } */
  var LEVEL_BASE = 50;

  function profile() {
    var p = read("profile", null);
    if (!p) p = { xp: 0, runs: 0, earned: {}, best: {} };
    if (!p.earned) p.earned = {};
    if (!p.best) p.best = {};
    return p;
  }

  function save(p) { return write("profile", p); }

  function levelFor(xp) { return Math.floor(Math.sqrt(xp / LEVEL_BASE)) + 1; }
  function xpAtLevel(level) { return LEVEL_BASE * Math.pow(level - 1, 2); }

  /** Progress toward the next level, for meters. */
  function levelProgress() {
    var p = profile();
    var lv = levelFor(p.xp);
    var floorXp = xpAtLevel(lv);
    var ceilXp = xpAtLevel(lv + 1);
    return {
      xp: p.xp,
      level: lv,
      into: p.xp - floorXp,
      need: ceilXp - floorXp,
      pct: Math.min(100, ((p.xp - floorXp) / (ceilXp - floorXp)) * 100)
    };
  }

  function addXp(amount) {
    var p = profile();
    var before = levelFor(p.xp);
    p.xp += Math.max(0, Math.round(amount));
    save(p);
    return { gained: amount, leveledTo: levelFor(p.xp) > before ? levelFor(p.xp) : null };
  }

  /* ---------- per-app scope ---------- */
  function app(appId) {
    return {
      id: appId,

      /** App-private key/value, e.g. saved settings. */
      get: function (k, d) { return read(appId + "." + k, d); },
      set: function (k, v) { return write(appId + "." + k, v); },

      /** Badges earned in this app. */
      earned: function () { return profile().earned[appId] || []; },

      /** Returns true only the first time a badge is awarded. */
      award: function (badgeId) {
        var p = profile();
        var list = p.earned[appId] || [];
        if (list.indexOf(badgeId) !== -1) return false;
        list.push(badgeId);
        p.earned[appId] = list;
        save(p);
        return true;
      },

      /** Records a high score. Returns true when it beats the old one. */
      best: function (score) {
        var p = profile();
        var prev = p.best[appId] || 0;
        if (score <= prev) return false;
        p.best[appId] = score;
        save(p);
        return true;
      },

      bestScore: function () { return profile().best[appId] || 0; },

      /** Ends a run: banks XP and bumps the run counter. */
      finishRun: function (xp) {
        var p = profile();
        p.runs += 1;
        save(p);
        return addXp(xp);
      }
    };
  }

  /** Paints any .level block on the page. */
  function paintLevel(root) {
    var host = (root || document).querySelector(".level");
    if (!host) return;
    var prog = levelProgress();
    var lv = host.querySelector(".lv");
    var bar = host.querySelector(".meter i");
    if (lv) lv.innerHTML = prog.level + "<small>LEVEL</small>";
    if (bar) bar.style.width = prog.pct + "%";
    var note = (root || document).querySelector(".xpnote");
    if (note) note.textContent = prog.into + " / " + prog.need + " XP TO LEVEL " + (prog.level + 1);
  }

  global.Store = {
    app: app,
    profile: profile,
    levelProgress: levelProgress,
    addXp: addXp,
    paintLevel: paintLevel,
    reset: function () { write("profile", { xp: 0, runs: 0, earned: {}, best: {} }); }
  };
})(window);
