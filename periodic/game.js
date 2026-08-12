/* ============================================================
   Spectra — game logic. Reads everything tunable from config.js
   and persists through the shared Store.
   ============================================================ */
(function (CFG, Store) {
  "use strict";

  var scope = Store.app(CFG.appId);
  var S = CFG.scoring;

  var $ = function (s) { return document.querySelector(s); };
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }
  function show(id) {
    document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("on"); });
    $(id).classList.add("on");
  }

  /* ---------- settings, remembered per browser ---------- */
  var cfg = scope.get("settings", null) || Object.assign({}, CFG.defaults);
  function saveSettings() { scope.set("settings", cfg); }

  function chips(host, items, key, after) {
    host.innerHTML = "";
    items.forEach(function (it) {
      var b = el("button", "chip" + (cfg[key] === it.v ? " sel" : ""), it.l);
      b.onclick = function () {
        cfg[key] = it.v; saveSettings();
        chips(host, items, key, after);
        if (after) after();
      };
      host.appendChild(b);
    });
  }

  function syncRange() {
    $("#maxZ").value = cfg.max;
    $("#maxOut").textContent = cfg.max;
  }
  function paintPresets() {
    chips($("#presets"), CFG.presets, "max", syncRange);
  }

  paintPresets();
  chips($("#dirs"), CFG.directions, "dir");
  chips($("#modes"), CFG.modes, "mode");
  syncRange();
  $("#maxZ").addEventListener("input", function (e) {
    cfg.max = +e.target.value; saveSettings();
    $("#maxOut").textContent = cfg.max;
    paintPresets();
  });

  /* ---------- spectral streak bar ---------- */
  function paintBar(node, lit) {
    if (!node.dataset.built) {
      CFG.spectrumColors.forEach(function (c, i) {
        var l = el("div", "line");
        l.style.background = c;
        l.style.left = (4 + i * (92 / (CFG.spectrumColors.length - 1))) + "%";
        l.style.boxShadow = "0 0 7px " + c;
        node.appendChild(l);
      });
      node.dataset.built = "1";
    }
    Array.prototype.forEach.call(node.children, function (l, i) {
      l.classList.toggle("lit", i < lit);
    });
    node.classList.toggle("hot", lit >= CFG.spectrumColors.length);
  }
  paintBar($("#sp-setup"), CFG.spectrumColors.length);

  /* ---------- fuzzy name matching ---------- */
  function norm(s) { return (s || "").toLowerCase().replace(/[^a-z]/g, ""); }

  function lev(a, b) {
    var m = a.length, n = b.length;
    if (!m) return n;
    if (!n) return m;
    var prev = [], cur = [], i, j, tmp;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (i = 1; i <= m; i++) {
      cur[0] = i;
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
      tmp = prev; prev = cur; cur = tmp;
    }
    return prev[n];
  }

  function toleranceFor(len) {
    for (var i = 0; i < CFG.spelling.length; i++) {
      if (len <= CFG.spelling[i].upTo) return CFG.spelling[i].tolerance;
    }
    return 1;
  }

  function nameMatches(input, e) {
    var g = norm(input);
    if (!g) return false;
    if (g === norm(e.sym)) return true;               // symbol always counts
    var targets = [norm(e.name)].concat(CFG.altNames[e.z] || []);
    return targets.some(function (t) {
      return g === t || lev(g, t) <= toleranceFor(t.length);
    });
  }

  /* ---------- run state ---------- */
  var G = null;
  var multiplier = function (streak) {
    return Math.min(S.maxMultiplier, 1 + Math.floor(streak / S.streakPerStep));
  };

  function startGame() {
    G = {
      score: 0, lives: S.lives, streak: 0, bestStreak: 0,
      correct: 0, cleanCorrect: 0, fresh: [], locked: false, cur: null, dir: null,
      pool: CFG.elements.filter(function (e) { return e.z <= cfg.max; })
    };
    show("#s-play");
    nextQ();
  }

  function hud() {
    $("#scoreOut").textContent = G.score;
    $("#multOut").textContent = multiplier(G.streak) + "\u00d7";
    $("#streakOut").textContent = G.streak;
    var lv = $("#lives");
    lv.innerHTML = "";
    for (var i = 0; i < S.lives; i++) lv.appendChild(el("div", "e" + (i < G.lives ? "" : " gone")));
    paintBar($("#sp-play"), Math.min(CFG.spectrumColors.length, G.streak));
  }

  function pickDir() {
    return cfg.dir === "mix" ? (Math.random() < 0.5 ? "z2n" : "n2z") : cfg.dir;
  }

  function buildChoices(e) {
    var near = G.pool.filter(function (x) { return x.z !== e.z; })
      .sort(function (a, b) { return Math.abs(a.z - e.z) - Math.abs(b.z - e.z); });
    var set = [e];
    var bag = near.slice(0, 8).sort(function () { return Math.random() - 0.5; });
    while (set.length < 4 && bag.length) set.push(bag.pop());
    while (set.length < 4) set.push(G.pool[Math.floor(Math.random() * G.pool.length)]);
    return set.sort(function () { return Math.random() - 0.5; });
  }

  function nextQ() {
    G.locked = false;
    var e;
    do { e = G.pool[Math.floor(Math.random() * G.pool.length)]; }
    while (G.pool.length > 1 && G.cur && e.z === G.cur.z);
    G.cur = e;
    G.dir = pickDir();
    hud();

    var c = $("#card");
    c.className = "card";
    c.innerHTML = "";
    if (G.dir === "z2n") {
      c.appendChild(el("div", "ask", "Which element is this?"));
      c.appendChild(el("div", "znum", e.z));
    } else {
      c.appendChild(el("div", "ask", "What is its atomic number?"));
      var s = el("div", "sym", e.sym);
      s.style.color = CFG.categoryColors[e.cat];
      c.appendChild(s);
      c.appendChild(el("div", "nm", e.name));
    }
    c.appendChild(el("div", "gain", ""));

    var a = $("#answer");
    a.innerHTML = "";
    if (cfg.mode === "type") {
      var row = el("div", "typerow");
      var inp = el("input");
      inp.type = "text";
      inp.placeholder = G.dir === "z2n" ? "Element name\u2026" : "Atomic number\u2026";
      inp.autocomplete = "off";
      inp.autocapitalize = "off";
      inp.spellcheck = false;
      if (G.dir === "n2z") { inp.inputMode = "numeric"; inp.pattern = "[0-9]*"; }
      inp.addEventListener("keydown", function (ev) { if (ev.key === "Enter") judge(inp.value); });
      var go = el("button", "go", "\u2192");
      go.onclick = function () { judge(inp.value); };
      row.appendChild(inp); row.appendChild(go);
      a.appendChild(row);
    } else {
      var grid = el("div", "choices");
      buildChoices(e).forEach(function (opt) {
        var b = el("button", "choice");
        b.innerHTML = G.dir === "z2n" ? opt.name + "<small>" + opt.sym + "</small>" : opt.z;
        b.onclick = function () { judge(G.dir === "z2n" ? opt.name : String(opt.z)); };
        grid.appendChild(b);
      });
      a.appendChild(grid);
    }
  }

  function judge(val) {
    if (G.locked) return;
    var e = G.cur;
    var ok = G.dir === "z2n"
      ? nameMatches(val, e)
      : parseInt(String(val).replace(/\D/g, ""), 10) === e.z;
    G.locked = true;
    reveal(ok, e);
  }

  function win(id) { if (scope.award(id)) G.fresh.push(id); }

  function reveal(ok, e) {
    var c = $("#card");
    c.className = "card " + (ok ? "right" : "wrong");
    c.innerHTML = "";
    c.appendChild(el("div", "verdict " + (ok ? "right" : "wrong"), ok ? "Correct" : "Missed"));
    c.appendChild(el("div", "znum", e.z));
    var s = el("div", "sym", e.sym);
    s.style.color = CFG.categoryColors[e.cat];
    s.style.fontSize = "52px";
    s.style.marginTop = "6px";
    c.appendChild(s);
    c.appendChild(el("div", "nm", e.name));
    c.appendChild(el("div", "cat", CFG.categoryNames[e.cat]));

    if (ok) {
      var m = multiplier(G.streak), pts = S.basePoints * m;
      G.score += pts; G.streak++; G.correct++; G.cleanCorrect++;
      G.bestStreak = Math.max(G.bestStreak, G.streak);
      c.appendChild(el("div", "gain", "+" + pts + "  \u00b7  " + m + "\u00d7 multiplier"));
      if (G.correct >= 10) win("ignite");
      if (G.streak >= 10) win("chain");
      if (multiplier(G.streak) >= S.maxMultiplier) win("maxed");
      if (e.z > 92) win("deep");
      if (G.score >= 500) win("mass");
      hud();
      $("#answer").innerHTML = "";
      setTimeout(function () { if (G) nextQ(); }, S.revealMs);
    } else {
      G.lives--; G.streak = 0; G.cleanCorrect = 0;
      hud();
      var a = $("#answer");
      a.innerHTML = "";
      var btn = el("button", "btn ghost", G.lives > 0 ? "Next element" : "See the damage");
      btn.onclick = function () { G.lives > 0 ? nextQ() : gameOver("Out of electrons"); };
      a.appendChild(btn);
    }
  }

  function gameOver(why) {
    if (G.cleanCorrect >= 20) win("clean");
    scope.best(G.score);
    var xp = Math.floor(G.score / S.xpDivisor);
    var result = scope.finishRun(xp);

    $("#overWhy").textContent = why;
    $("#finalOut").textContent = G.score;
    $("#corrOut").textContent = G.correct;
    $("#bstrOut").textContent = G.bestStreak;
    $("#xpOut").textContent = "+" + xp + " XP" + (result.leveledTo ? "  \u00b7  LEVEL " + result.leveledTo : "");
    paintBar($("#sp-over"), Math.min(CFG.spectrumColors.length, G.bestStreak));

    var mine = scope.earned(), fresh = G.fresh;
    var list = $("#badgeList");
    list.innerHTML = "";
    CFG.badges.forEach(function (b) {
      var got = mine.indexOf(b.id) !== -1;
      var isNew = fresh.indexOf(b.id) !== -1;
      var n = el("div", "badge" + (got ? "" : " locked") + (isNew ? " fresh" : ""));
      n.appendChild(el("div", "dot"));
      n.appendChild(el("div", "txt", b.name + "<small>" + (isNew ? "JUST EARNED \u00b7 " : "") + b.hint + "</small>"));
      list.appendChild(n);
    });

    G = null;
    refreshSetup();
    show("#s-over");
  }

  function refreshSetup() {
    $("#bestOut").textContent = scope.bestScore();
    $("#badgeOut").textContent = scope.earned().length + "/" + CFG.badges.length;
    Store.paintLevel(document);
  }
  refreshSetup();

  $("#btnStart").onclick = startGame;
  $("#btnAgain").onclick = startGame;
  $("#btnBack").onclick = function () { show("#s-setup"); };
  $("#btnQuit").onclick = function () { if (G) gameOver("Run banked"); };
})(window.SPECTRA_CONFIG, window.Store);
