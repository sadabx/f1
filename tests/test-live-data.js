const fs = require("fs");
const assert = require("assert");

const src = fs.readFileSync("extension/popup.js", "utf8");
const normalizeResultsRace = eval(`(${src.match(/function normalizeResultsRace\(race\) \{[\s\S]*?\n\}/)[0]})`);
const gateSrc = src.match(/const OPENF1_RESULT_WINDOW_MS[\s\S]*?const withinDateWindow = [\s\S]*?;\n/)[0];
const shouldInject = new Function("now", "latestCompletedScheduled", "openF1Session", `${gateSrc}\nreturn String(openF1Session?.session_type || "").toLowerCase() === "race" && withinDateWindow;`);

async function json(url) { const res = await fetch(url); if (!res.ok) return null; return res.json().catch(() => null); }

(async () => {
  const [results, current] = await Promise.all([json("https://f1.trionine.com/api/results.json"), json("https://f1.trionine.com/api/current.json")]);
  const races = results?.MRData?.RaceTable?.Races || [];
  const allRaces = current?.MRData?.RaceTable?.Races || [];
  const now = Date.now();
  const completedRaces = allRaces.filter((rc) => new Date(`${rc.date}T${rc.time || "12:00:00Z"}`).getTime() + 2 * 3600 * 1000 < now);
  const latestCompletedScheduled = completedRaces.at(-1) || null;
  const missingFromResults = latestCompletedScheduled && !races.some((r) => String(r.round) === String(latestCompletedScheduled.round));
  const sessionsRaw = await json("https://api.openf1.org/v1/sessions?session_key=latest");
  const openF1Session = Array.isArray(sessionsRaw) && sessionsRaw.length ? sessionsRaw[0] : null;
  const inject = Boolean(missingFromResults && shouldInject(now, latestCompletedScheduled, openF1Session));
  const latest = races.at(-1);
  console.log("Latest completed scheduled:", latestCompletedScheduled?.round, latestCompletedScheduled?.raceName);
  console.log("Results.json has that round:", !missingFromResults);
  console.log("OpenF1 latest session:", openF1Session ? `${openF1Session.session_type} ${openF1Session.date_start}` : "restricted/unavailable");
  console.log("OpenF1 injection allowed:", inject);
  console.log("Displayed latest:", latest ? `Round ${latest.round} ${latest.raceName}` : "none");
  console.log("Displayed podium:", latest?.Results?.slice(0, 3).map((r) => r.Driver?.code).join("/"));
  assert(!inject, "gate must not inject while OpenF1 metadata is restricted");
  assert(latest && Array.isArray(latest.Results) && latest.Results.length >= 3, "latest race must be a real result");
  console.log("\nLive-data end-to-end check passed: no phantom podium injected.");
})().catch((err) => { console.error(err); process.exit(1); });