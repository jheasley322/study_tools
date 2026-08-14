/* ============================================================
   study_tools — test runner
   ------------------------------------------------------------
   Zero dependencies. `npm test` -> `node tests/run.js`.

   Discovers tests/*.test.js. Each file exports an array of
   { name, fn }. A file that fails to load is itself reported as
   a failure rather than crashing the run — a missing module is
   information too.

   Exits non-zero if anything fails.
   ============================================================ */
"use strict";

var fs = require("node:fs");
var path = require("node:path");

var DIR = __dirname;
var PASS = "  pass  ";
var FAIL = "  FAIL  ";

function indent(text) {
  return String(text)
    .split("\n")
    .map(function (line) {
      return "        " + line;
    })
    .join("\n");
}

function describeError(err) {
  if (err && err.name === "AssertionError") return err.message;
  if (err && err.stack) return err.stack;
  return String(err);
}

function main() {
  var files = fs
    .readdirSync(DIR)
    .filter(function (f) {
      return /\.test\.js$/.test(f);
    })
    .sort();

  if (files.length === 0) {
    process.stdout.write("no test files found in " + DIR + "\n");
    process.exit(1);
  }

  var passed = 0;
  var failures = [];

  files.forEach(function (file) {
    process.stdout.write("\n" + file + "\n");

    var suite;
    try {
      suite = require(path.join(DIR, file));
    } catch (e) {
      process.stdout.write(FAIL + "<could not load " + file + ">\n");
      process.stdout.write(indent(describeError(e)) + "\n");
      failures.push(file + " :: <load>");
      return;
    }

    if (!Array.isArray(suite)) {
      process.stdout.write(FAIL + "<" + file + " must export an array of {name, fn}>\n");
      failures.push(file + " :: <export shape>");
      return;
    }

    suite.forEach(function (test, i) {
      var name = test && test.name ? test.name : "<unnamed test #" + i + ">";
      if (!test || typeof test.fn !== "function") {
        process.stdout.write(FAIL + name + "\n");
        process.stdout.write(indent("test has no fn() to run") + "\n");
        failures.push(file + " :: " + name);
        return;
      }
      try {
        test.fn();
        passed += 1;
        process.stdout.write(PASS + name + "\n");
      } catch (e) {
        process.stdout.write(FAIL + name + "\n");
        process.stdout.write(indent(describeError(e)) + "\n");
        failures.push(file + " :: " + name);
      }
    });
  });

  var total = passed + failures.length;
  process.stdout.write("\n" + passed + " passed, " + failures.length + " failed, " + total + " total\n");

  if (failures.length) {
    process.stdout.write("\nfailing:\n");
    failures.forEach(function (f) {
      process.stdout.write("  - " + f + "\n");
    });
    process.exit(1);
  }
}

main();
