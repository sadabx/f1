const fs = require("fs");
const assert = require("assert");

const src = fs.readFileSync("extension/popup.js", "utf8");

// Pull the real normalizer out of popup.js so the test cannot drift from source.
const normalizeSrc = src.match(/function normalizeResultsRace\(race\) \{[\s\S]*?\n\}/);
assert(normalizeSrc, "normalizeResultsRace helper not found in popup.js");
const normalizeResultsRace = eval(`(${normalizeSrc[0]})`);

// Pull the real date/session gate out of loadResults().
const gateSrc = src.match(/const OPENF1_RESULT_WINDOW_MS[\s\S]*?const withinDateWindow = [\s\S]*?;\n/);
assert(gateSrc, "OpenF1 gate not found in popup.js");
const shouldInject = new Function(
  "now",
  "latestCompletedScheduled",
  "openF1Session",
  `${gateSrc[0]}
  return String(openF1Session?.session_type || "").toLowerCase() === "race" && withinDateWindow;`
);

const brazilRace = { date: "2026-11-08", time: "17:00:00Z" };

const cases = [
  { name: "Brazil FP2 must NOT become a race podium (phantom)", now: new Date("2026-11-07T18:00:00Z").getTime(), session: { session_type: "Practice", date_start: "2026-11-06T18:00:00Z", date_end: "2026-11-06T19:00:00Z" }, expected: false },
  { name: "Qualifying must NOT become a race podium", now: new Date("2026-11-08T00:00:00Z").getTime(), session: { session_type: "Qualifying", date_start: "2026-11-07T20:00:00Z", date_end: "2026-11-07T21:00:00Z" }, expected: false },
  { name: "Completed same-weekend Race IS eligible", now: new Date("2026-11-08T20:00:00Z").getTime(), session: { session_type: "Race", date_start: "2026-11-08T17:00:00Z", date_end: "2026-11-08T19:00:00Z" }, expected: true },
  { name: "Race still in progress is NOT eligible", now: new Date("2026-11-08T18:00:00Z").getTime(), session: { session_type: "Race", date_start: "2026-11-08T17:00:00Z", date_end: "2026-11-08T19:00:00Z" }, expected: false },
  { name: "Stale race outside 48h window is NOT eligible", now: new Date("2026-11-12T20:00:00Z").getTime(), session: { session_type: "Race", date_start: "2026-11-08T17:00:00Z", date_end: "2026-11-08T19:00:00Z" }, expected: false },
  { name: "Race from a different weekend is NOT eligible", now: new Date("2026-11-08T20:00:00Z").getTime(), session: { session_type: "Race", date_start: "2026-10-25T20:00:00Z", date_end: "2026-10-25T22:00:00Z" }, expected: false },
  { name: "Restricted/empty OpenF1 metadata is NOT eligible", now: new Date("2026-11-08T20:00:00Z").getTime(), session: null, expected: false }
];

for (const c of cases) {
  const actual = shouldInject(c.now, brazilRace, c.session);
  assert.strictEqual(actual, c.expected, `${c.name}: expected ${c.expected}, got ${actual}`);
  console.log(`PASS  ${c.name}`);
}

// Podium must render from Results[0..2], regardless of input order or position type.
const race = { round: "19", raceName: "Mexico Grand Prix", Results: [{ position: 3, Driver: { code: "ANT" } }, { position: "1", Driver: { code: "VER" } }, { position: "2", Driver: { code: "HAM" } }] };
const normalized = normalizeResultsRace(race);
assert.deepStrictEqual(normalized.Results.map((r) => r.Driver.code), ["VER", "HAM", "ANT"], "normalizer must order Results by position");
assert.deepStrictEqual(normalized.Results.map((r) => r.position), ["1", "2", "3"], "normalizer must coerce positions to strings");
console.log("PASS  Mexico podium renders VER/HAM/ANT from Results[0..2]");

assert.match(src, /const p1 = results\[0\];\n\s*const p2 = results\[1\];\n\s*const p3 = results\[2\];/);
assert.match(src, /session_type \|\| ""\)\.toLowerCase\(\) === "race"/);
assert.match(src, /normalizeResultsRace\(\{/);
console.log("PASS  popup.js wires Results[0..2], session_type race gate, and normalizer");

console.log("\nAll phantom-podium tests passed.");