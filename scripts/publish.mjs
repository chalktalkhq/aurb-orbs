// Publishes every orb whose files changed as @aurb/<name> on npm, then the list of all orbs as @aurb/index.
// jsDelivr serves both from npm for free. Run by .github/workflows/publish.yml on every merge to main.
// A version is never edited by hand: a changed orb goes up one patch from what npm has, so orb="aurora" (which
// follows 1.x) picks it up, while a pinned orb="aurora@1.0.0" never changes.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const dry = process.argv.includes("--dry-run");
const npm = (...a) => execFileSync("npm", a, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], shell: process.platform === "win32" }).trim();
const published = (name) => {
  try { return JSON.parse(npm("view", name, "version", "aurb.hash", "--json")); } catch { return null; } // a 404 is a new orb
};
const bump = (v) => v.replace(/\d+$/, (n) => +n + 1);
const hashOf = (dir) => {
  const h = createHash("sha1");
  for (const f of fs.readdirSync(dir).filter((f) => f !== "package.json").sort()) h.update(f).update(fs.readFileSync(path.join(dir, f)));
  return h.digest("hex").slice(0, 12);
};

// Copies a package to a scratch folder with its version, hash and the licence, and publishes that, so the repo
// itself never changes during a publish.
function publish(dir, pkg) {
  const hash = hashOf(dir), now = published(pkg.name);
  if (now?.["aurb.hash"] === hash) return { ...pkg, version: now.version, fresh: false };
  const version = now ? bump(now.version) : pkg.version;
  const tmp = path.join(".tmp", pkg.name.replace("/", "-"));
  fs.rmSync(tmp, { recursive: true, force: true });
  fs.cpSync(dir, tmp, { recursive: true });
  fs.copyFileSync("LICENSE", path.join(tmp, "LICENSE"));
  fs.writeFileSync(path.join(tmp, "package.json"), JSON.stringify({ ...pkg, version, aurb: { ...pkg.aurb, hash } }, null, 2));
  console.log(`${dry ? "Would publish" : "Publishing"} ${pkg.name}@${version}`);
  if (!dry) npm("publish", tmp, "--access", "public", ...(process.env.CI ? ["--provenance"] : []));
  return { ...pkg, version, fresh: true };
}

const orbs = fs.readdirSync("orbs").filter((d) => fs.existsSync(path.join("orbs", d, "package.json"))).sort().map((d) => {
  const pkg = JSON.parse(fs.readFileSync(path.join("orbs", d, "package.json"), "utf8"));
  const manifest = JSON.parse(fs.readFileSync(path.join("orbs", d, "manifest.json"), "utf8"));
  const p = publish(path.join("orbs", d), pkg);
  return { name: d, description: p.description, author: p.author, version: p.version, sizes: manifest.sizes, ...p.aurb };
});

// The index is a package of its own, so the site and `npx aurb` can list orbs without knowing them in advance.
const dir = path.join(".tmp", "index-src");
fs.rmSync(dir, { recursive: true, force: true });
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(path.join(dir, "index.json"), JSON.stringify(orbs.map(({ version, ...o }) => o), null, 2));
const index = publish(dir, { name: "@aurb/index", version: "1.0.0", description: "Every aurb orb: name, description, author.", license: "MIT", aurb: {} });

// A version range is cached for up to 7 days; ask jsDelivr to drop it so a new orb lists at once. Best effort.
if (index.fresh && !dry) await fetch("https://purge.jsdelivr.net/npm/@aurb/index@1/index.json").catch(() => {});
console.log(`${orbs.length} orbs listed.`);
