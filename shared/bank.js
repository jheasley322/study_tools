/* ============================================================
   study_tools — content bank loader
   ------------------------------------------------------------
   Bank.load("ions").then(function (bank) { ... });

   Fetches banks/<id>.json — the output of build_banks.py — and
   shape-checks it before handing it to a game. The compiler
   already validated the source YAML; this is the runtime half,
   because the JSON on the server can be stale, truncated, or
   simply missing after a rename.

   Errors are readable on purpose. A game that fails to load a
   bank should say which bank and why, not "undefined is not an
   object" three frames later.

   No localStorage here — shared/store.js is the sole owner of
   storage in this repo. No caching either, beyond whatever the
   browser does with the HTTP response.

   Needs a real server: fetch() cannot read file:// URLs.
       python -m http.server 8000
   ============================================================ */
(function (global) {
  "use strict";

  /* Bank ids become a URL path segment, so they are restricted to
     characters that cannot climb out of banks/. */
  var ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]*$/;

  /* Resolve the repo root from this script's own URL. A game at
     /cascade/index.html and the hub at /index.html both load this file, and a
     bare relative "banks/..." would resolve differently for each. GitHub Pages
     also serves the whole site under /<repo>/, so a leading "/" is wrong too.
     document.currentScript is only meaningful while the script is executing,
     which is why this runs at load time rather than inside load(). */
  var base = "";
  if (typeof document !== "undefined" && document.currentScript) {
    var m = /^(.*\/)shared\/bank\.js(?:[?#].*)?$/.exec(document.currentScript.src || "");
    if (m) base = m[1];
  }

  function urlFor(id) {
    if (typeof id !== "string" || !ID_RE.test(id)) {
      throw new Error("Bank.load: invalid bank id " + JSON.stringify(id));
    }
    return base + "banks/" + id + ".json";
  }

  /**
   * Shape-check a parsed bank. Returns a problem description, or null when the
   * bank is well formed. Pure — no fetch, no DOM — so it is testable on its own.
   */
  function validate(bank, id) {
    if (!bank || typeof bank !== "object" || Array.isArray(bank)) {
      return "top level is not an object";
    }
    if (!bank.meta || typeof bank.meta !== "object" || Array.isArray(bank.meta)) {
      return "missing a `meta` object";
    }
    if (typeof bank.meta.id !== "string" || bank.meta.id === "") {
      return "`meta.id` is missing or not a string";
    }
    if (id !== undefined && bank.meta.id !== id) {
      /* Means banks/ is out of step with its source — a rename that only
         half happened. Loading it anyway would attribute progress to the
         wrong app id. */
      return 'declares meta.id "' + bank.meta.id + '" but was loaded as "' + id + '"';
    }
    if (typeof bank.meta.engine !== "string" || bank.meta.engine === "") {
      return "`meta.engine` is missing or not a string";
    }
    if (!bank.config || typeof bank.config !== "object" || Array.isArray(bank.config)) {
      return "missing a `config` object";
    }
    return null;
  }

  /** Resolves with the parsed bank; rejects with a readable Error. */
  function load(id) {
    var url;
    try {
      url = urlFor(id);
    } catch (e) {
      return Promise.reject(e);
    }

    return fetch(url).then(function (res) {
      if (!res.ok) {
        throw new Error(
          'Bank "' + id + '" failed to load: HTTP ' + res.status +
          (res.statusText ? " " + res.statusText : "") + " at " + url
        );
      }
      return res.text();
    }).then(function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        throw new Error('Bank "' + id + '" is not valid JSON (' + e.message + ") at " + url);
      }
      var problem = validate(data, id);
      if (problem) {
        throw new Error('Bank "' + id + '" is malformed: ' + problem + " — at " + url);
      }
      return data;
    });
  }

  var Bank = {
    load: load,
    validate: validate,
    url: urlFor,

    /** Override the resolved repo root, for a page served from an odd path. */
    setBase: function (b) {
      base = b === undefined || b === null ? "" : String(b);
      if (base && base.charAt(base.length - 1) !== "/") base += "/";
      return base;
    },
    getBase: function () { return base; }
  };

  global.Bank = Bank;

  /* Browser global is the shipping path; the export exists only so node can
     require this file to exercise validate() in tests. */
  if (typeof module !== "undefined" && module.exports) module.exports = Bank;
})(typeof window !== "undefined" ? window : globalThis);
