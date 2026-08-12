/* ============================================================
   Spectra — table explorer. Read-only reference view with an
   optional heat map of the elements this browser keeps missing.
   ============================================================ */
(function (DATA, CFG, Store) {
  "use strict";

  var scope = Store.app(CFG.appId);
  var $ = function (s) { return document.querySelector(s); };
  function el(tag, cls, html) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (html !== undefined) n.innerHTML = html;
    return n;
  }

  var view = { layout: "grid", zoom: "fit", heat: false, query: "" };

  /* ---------- miss statistics ---------- */
  function stats() { return scope.get("stats", {}); }

  function heatFor(z, st) {
    var r = st[String(z)];
    if (!r || !r.seen) return 0;
    return r.miss / r.seen;
  }

  /* ---------- grid ---------- */
  function buildGrid() {
    var host = $("#ptable");
    host.innerHTML = "";
    host.className = "ptable " + view.zoom;
    var st = view.heat ? stats() : {};

    // f-block pointers sitting in the group-3 slots of periods 6 and 7
    var markers = [
      { row: 6, col: 3, label: "57\u201371" },
      { row: 7, col: 3, label: "89\u2013103" }
    ];

    var cells = {};
    DATA.forEach(function (e) { cells[e.row + ":" + e.col] = e; });

    var ROWS = [1, 2, 3, 4, 5, 6, 7, 9, 10];
    for (var ri = 0; ri < ROWS.length; ri++) {
      var row = ROWS[ri];
      for (var col = 1; col <= 18; col++) {
        var key = row + ":" + col;
        var marker = markers.filter(function (m) { return m.row === row && m.col === col; })[0];
        var e = cells[key];

        if (marker) {
          host.appendChild(el("div", "cell marker", "<span>" + marker.label + "</span>"));
          continue;
        }
        if (!e) {
          host.appendChild(el("div", "cell blank"));
          continue;
        }

        var c = el("button", "cell live");
        c.style.setProperty("--cat", CFG.categoryColors[e.cat]);
        if (view.heat) {
          var h = heatFor(e.z, st);
          if (h > 0) {
            c.classList.add("hot");
            c.style.setProperty("--heat", (0.15 + h * 0.75).toFixed(2));
          } else if (st[String(e.z)]) {
            c.classList.add("clean");
          }
        }
        c.innerHTML = '<i>' + e.z + '</i><b>' + e.sym + '</b>';
        c.onclick = (function (elm) { return function () { openSheet(elm); }; })(e);
        host.appendChild(c);
      }
      if (row === 7) {
        // blank separator row between the main block and the f-block strips
        for (var s = 0; s < 18; s++) host.appendChild(el("div", "cell blank spacer"));
      }
    }
  }

  /* ---------- list ---------- */
  var CAT_ORDER = ["am", "ae", "tm", "pt", "mt", "nm", "hl", "ng", "ln", "ac", "uk"];

  function buildList() {
    var host = $("#plist");
    host.innerHTML = "";
    var q = view.query.trim().toLowerCase();
    var st = view.heat ? stats() : {};

    var matches = DATA.filter(function (e) {
      if (!q) return true;
      return e.name.toLowerCase().indexOf(q) === 0 ||
             e.sym.toLowerCase() === q ||
             String(e.z) === q ||
             e.name.toLowerCase().indexOf(q) > -1;
    });

    if (!matches.length) {
      host.appendChild(el("div", "nores", "No element matches that. Try a name, symbol, or number."));
      return;
    }

    CAT_ORDER.forEach(function (cat) {
      var group = matches.filter(function (e) { return e.cat === cat; });
      if (!group.length) return;
      var head = el("div", "lhead", CFG.categoryNames[cat] + " <span>" + group.length + "</span>");
      head.style.setProperty("--cat", CFG.categoryColors[cat]);
      host.appendChild(head);
      group.forEach(function (e) {
        var r = el("button", "lrow");
        r.style.setProperty("--cat", CFG.categoryColors[e.cat]);
        var heat = "";
        if (view.heat) {
          var h = heatFor(e.z, st);
          if (h > 0) heat = '<u>' + Math.round(h * 100) + '% missed</u>';
        }
        r.innerHTML =
          '<i>' + e.z + '</i>' +
          '<b>' + e.sym + '</b>' +
          '<span>' + e.name + heat + '</span>' +
          '<em>' + e.mass + '</em>';
        r.onclick = (function (elm) { return function () { openSheet(elm); }; })(e);
        host.appendChild(r);
      });
    });
  }

  /* ---------- detail sheet ---------- */
  function row(label, value) {
    return '<div class="drow"><span>' + label + '</span><b>' + value + '</b></div>';
  }

  function openSheet(e) {
    var st = stats()[String(e.z)];
    var sheet = $("#sheet");
    var predicted = e.z >= 104;

    var practice = "";
    if (st && st.seen) {
      practice = row("YOUR RECORD", st.seen - st.miss + " right / " + st.seen + " asked");
    }

    sheet.innerHTML =
      '<div class="shead" style="--cat:' + CFG.categoryColors[e.cat] + '">' +
        '<div class="stile"><i>' + e.z + '</i><b>' + e.sym + '</b><u>' + e.mass + '</u></div>' +
        '<div class="stitle"><h2>' + e.name + '</h2><p>' + CFG.categoryNames[e.cat] + '</p></div>' +
      '</div>' +
      '<p class="suse">' + e.use + '</p>' +
      '<div class="dtable">' +
        row("GROUP", e.group === null ? "f-block" : e.group) +
        row("PERIOD", e.period) +
        row("STATE AT 20\u00b0C", e.state === "unknown" ? "Unknown" : e.state.charAt(0).toUpperCase() + e.state.slice(1)) +
        row("CONFIGURATION", e.config) +
        practice +
      '</div>' +
      (predicted ? '<p class="snote">State and configuration for elements past 103 are predicted, not measured.</p>' : '') +
      '<button class="btn ghost" id="sheetClose">Close</button>';

    $("#scrim").classList.add("on");
    sheet.classList.add("on");
    $("#sheetClose").onclick = closeSheet;
  }

  function closeSheet() {
    $("#sheet").classList.remove("on");
    $("#scrim").classList.remove("on");
  }

  /* ---------- legend ---------- */
  function buildLegend() {
    var host = $("#legend");
    host.innerHTML = "";
    CAT_ORDER.forEach(function (cat) {
      var k = el("span", "key", '<i style="background:' + CFG.categoryColors[cat] + '"></i>' + CFG.categoryNames[cat]);
      host.appendChild(k);
    });
  }

  /* ---------- render ---------- */
  function render() {
    $("#gridWrap").style.display = view.layout === "grid" ? "" : "none";
    $("#listWrap").style.display = view.layout === "list" ? "" : "none";
    $("#zoomRow").style.display = view.layout === "grid" ? "" : "none";
    if (view.layout === "grid") buildGrid(); else buildList();
    document.querySelectorAll("[data-layout]").forEach(function (b) {
      b.classList.toggle("sel", b.dataset.layout === view.layout);
    });
    document.querySelectorAll("[data-zoom]").forEach(function (b) {
      b.classList.toggle("sel", b.dataset.zoom === view.zoom);
    });
    $("#btnHeat").classList.toggle("sel", view.heat);
  }

  /* ---------- wiring ---------- */
  document.querySelectorAll("[data-layout]").forEach(function (b) {
    b.onclick = function () { view.layout = b.dataset.layout; render(); };
  });
  document.querySelectorAll("[data-zoom]").forEach(function (b) {
    b.onclick = function () { view.zoom = b.dataset.zoom; render(); };
  });
  $("#btnHeat").onclick = function () { view.heat = !view.heat; render(); };
  $("#psearch").addEventListener("input", function (ev) {
    view.query = ev.target.value;
    if (view.layout !== "list") { view.layout = "list"; }
    render();
  });
  $("#scrim").onclick = closeSheet;

  buildLegend();

  window.SpectraTable = {
    open: function () {
      document.querySelectorAll(".screen").forEach(function (s) { s.classList.remove("on"); });
      $("#s-table").classList.add("on");
      render();
    }
  };
})(window.PERIODIC_ELEMENTS, window.SPECTRA_CONFIG, window.Store);
