// The list of orbs, orbs.json, and the @aurb/index package built from it, which the site and `npx aurb` read.
//
//   node scripts/index.mjs                  check orbs.json, then publish @aurb/index if the list changed
//   node scripts/index.mjs --dry-run        the same, publishing nothing
//   node scripts/index.mjs --changed main   print the community packages added or moved to a new version since main
//
// Our own orbs are listed by name and are the @aurb/<name> packages. A community orb stays in its maker's package and
// is listed at the exact version that was reviewed, so an update reaches nobody until its new version is listed.
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const NPM = "https://cdn.jsdelivr.net/npm";
const args = process.argv.slice(2);
const dry = args.includes("--dry-run");
// npm, with arguments that survive a Windows shell. A publish talks to you directly, so npm can open its sign-in page
// or ask for a 2FA code.
const win = process.platform === "win32";
const quote = (a) => (win ? a.map((x) => (/[\s"&|<>^]/.test(x) ? `"${x.replace(/"/g, '\\"')}"` : x)) : a);
const npm = (...a) => execFileSync("npm", quote(a), { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: win }).trim();
const npmTalk = (...a) => spawnSync("npm", quote(a), { stdio: "inherit", shell: win }).status;
const die = (msg) => { console.error(`✕ ${msg}`); process.exit(1); };

function validate(list) {
  const problems = [], seen = new Set();
  if (!Array.isArray(list)) die("orbs.json must be a list");
  for (const o of list) {
    const at = `"${o.name}"`;
    if (!/^[a-z][a-z0-9-]{1,30}$/.test(o.name ?? "")) problems.push(`${at}: a name is lowercase letters, digits and -`);
    if (seen.has(o.name)) problems.push(`${at} is listed twice`);
    seen.add(o.name);
    if (!o.description || o.description.length > 160) problems.push(`${at}: needs a description of one short sentence`);
    if (/[–—]/.test(o.description ?? "")) problems.push(`${at}: the description has a long dash; use a comma or a colon`);
    if ("package" in o || "version" in o) {
      if (!/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/.test(o.package ?? "") || o.package.startsWith("@aurb/")) problems.push(`${at}: package must be the maker's own npm package`);
      if (!/^\d+\.\d+\.\d+$/.test(o.version ?? "")) problems.push(`${at}: version must be exact, such as 1.0.2, so updates are reviewed`);
      if (!o.author) problems.push(`${at}: a community orb needs its author`);
    }
    if (o.fade !== undefined && o.fade !== "rest") problems.push(`${at}: fade is "rest" or left out`);
  }
  if (problems.length) die(`orbs.json:\n  ${problems.join("\n  ")}`);
  return list;
}

const ref = (o) => `npm:${o.package}@${o.version}`;
const list = validate(JSON.parse(fs.readFileSync("orbs.json", "utf8")));

if (args.includes("--changed")) {
  const base = args[args.indexOf("--changed") + 1];
  let before = [];
  try { before = JSON.parse(execFileSync("git", ["show", `${base}:orbs.json`], { encoding: "utf8" })); } catch {}
  const old = new Set(before.filter((o) => o.package).map(ref));
  for (const o of list) if (o.package && !old.has(ref(o))) console.log(ref(o));
  process.exit(0);
}

// Each entry carries what the site and the CLI need without fetching every orb: its sizes, and its themes, so an orb
// made in one theme is labelled and its copied code says so. Read from the manifest on jsDelivr, which also fails the
// publish if a listed orb can't be reached, or isn't the orb it's listed as.
async function manifest(url) {
  for (let i = 0; i < 3; i++) {
    const r = await fetch(url).catch(() => null);
    if (r?.ok) return r.json().catch(() => null);
    if (r?.status === 404) return null;
    await new Promise((res) => setTimeout(res, 2000 * (i + 1)));
  }
  return null;
}
const index = [];
for (const o of list) {
  const url = o.package ? `${NPM}/${o.package}@${o.version}/manifest.json` : `${NPM}/@aurb/${o.name}@1/manifest.json`;
  const m = await manifest(url);
  if (!m) die(`${o.name}: couldn't load ${url}${o.package ? "" : ". Publish it first: npx aurb publish <its folder>"}`);
  if (m.name !== o.name) die(`${o.name}: the package's manifest says it's "${m.name}"`);
  const themes = m.themes ?? ["dark", "light"];
  if (!Array.isArray(m.sizes) || !themes.length) die(`${o.name}: its manifest has no sizes or themes`);
  index.push({ ...o, sizes: m.sizes, themes });
}

const body = JSON.stringify(index, null, 2) + "\n";
const hash = createHash("sha1").update(body).digest("hex").slice(0, 12);
let now = null;
try { now = JSON.parse(npm("view", "@aurb/index", "version", "aurb.hash", "--json") || "null"); }
catch (e) { if (!/E404|404 Not Found/.test(String(e.stderr ?? e.message))) die(`couldn't ask npm about @aurb/index: ${String(e.stderr ?? e.message).trim().split("\n")[0]}`); } // a 404 is the first publish
if (now?.["aurb.hash"] === hash) { console.log(`@aurb/index@${now.version} already lists these ${index.length} orbs.`); process.exit(0); }

const version = now?.version ? now.version.replace(/\d+$/, (n) => +n + 1) : "1.0.0";
const dir = fs.mkdtempSync(path.join(os.tmpdir(), "aurb-index-"));
fs.writeFileSync(path.join(dir, "index.json"), body);
fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify({ name: "@aurb/index", version, description: "Every listed aurb orb: name, description, author, and where it lives.", license: "MIT", aurb: { hash } }, null, 2));
console.log(`${dry ? "Would publish" : "Publishing"} @aurb/index@${version}: ${index.length} orbs`);
if (!dry) {
  if (npmTalk("publish", dir, "--access", "public") !== 0) die("npm couldn't publish @aurb/index: see its message above. Not logged in? Run npm login");
  // The 1.x range is cached for up to 7 days; ask jsDelivr to drop it so the new list shows at once. Best effort.
  await fetch(`https://purge.jsdelivr.net/npm/@aurb/index@1/index.json`).catch(() => {});
}
