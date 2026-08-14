/* ============================================================
   study_tools — test harness
   ------------------------------------------------------------
   Thin assert helpers over node's built-in `node:assert`. A
   built-in is not a dependency; nothing here is installed and
   nothing here ships.

   Every failure carries the INPUT that produced it alongside
   expected/actual. A property test walks ~200 pairs — "expected
   1 got 2" without the pair that broke is not information.
   ============================================================ */
"use strict";

var assert = require("node:assert");

function fmt(value) {
  if (value === undefined) return "undefined";
  if (typeof value === "string") return JSON.stringify(value);
  try {
    return JSON.stringify(value);
  } catch (e) {
    return String(value);
  }
}

/* Throws an AssertionError whose message is the failure report. */
function fail(detail) {
  var lines = [detail.what || "assertion failed"];
  if (detail.input !== undefined) lines.push("    input:    " + fmt(detail.input));
  lines.push("    expected: " + fmt(detail.expected));
  lines.push("    actual:   " + fmt(detail.actual));
  if (detail.note) lines.push("    note:     " + detail.note);
  throw new assert.AssertionError({
    message: lines.join("\n"),
    actual: detail.actual,
    expected: detail.expected,
    operator: detail.operator || "strictEqual",
    stackStartFn: fail
  });
}

function eq(actual, expected, detail) {
  if (Object.is(actual, expected)) return;
  var d = detail || {};
  fail({ what: d.what, input: d.input, note: d.note, expected: expected, actual: actual });
}

function deepEq(actual, expected, detail) {
  try {
    assert.deepStrictEqual(actual, expected);
    return;
  } catch (e) {
    var d = detail || {};
    fail({
      what: d.what,
      input: d.input,
      note: d.note,
      expected: expected,
      actual: actual,
      operator: "deepStrictEqual"
    });
  }
}

function ok(condition, detail) {
  if (condition) return;
  var d = detail || {};
  fail({
    what: d.what,
    input: d.input,
    note: d.note,
    expected: d.expected !== undefined ? d.expected : true,
    actual: d.actual !== undefined ? d.actual : condition,
    operator: "ok"
  });
}

/* The contract says TypeError specifically — a bare Error is a failure. */
function throwsTypeError(fn, detail) {
  var d = detail || {};
  var caught = null;
  var threw = false;
  try {
    fn();
  } catch (e) {
    threw = true;
    caught = e;
  }
  if (!threw) {
    fail({
      what: d.what,
      input: d.input,
      expected: "TypeError thrown",
      actual: "no error thrown",
      operator: "throws"
    });
  }
  if (!(caught instanceof TypeError)) {
    fail({
      what: d.what,
      input: d.input,
      expected: "TypeError",
      actual: (caught && caught.constructor ? caught.constructor.name : typeof caught) +
        ": " + (caught && caught.message),
      operator: "throws"
    });
  }
}

module.exports = { fail: fail, eq: eq, deepEq: deepEq, ok: ok, throwsTypeError: throwsTypeError, fmt: fmt };
