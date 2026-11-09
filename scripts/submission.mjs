// Checks the package named in a submission issue and writes the reply, to comment.md. Run by check.yml. The issue body
// is untrusted, so it arrives in an environment variable and only a valid package name and exact version are used.
import { spawnSync } from "node:child_process";
import fs from "node:fs";

const body = process.env.ISSUE_BODY ?? "";
const field = (label) => new RegExp(`### ${label}\\s+([^\\n]+)`).exec(body)?.[1].trim().replace(/^npm:/, "") ?? "";
let pkg = field("npm package"), version = field("Version");
const at = /^(.+)@(\d+\.\d+\.\d+)$/.exec(pkg); // aurb-orb-nebula@1.0.0 in the package field
if (at) { pkg = at[1]; version ||= at[2]; }

let reply;
if (!/^(@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*$/.test(pkg)) reply = "The npm package isn't a valid package name. Edit the issue to fix it, and the check runs again.";
else if (pkg.startsWith("@aurb/")) reply = "`@aurb` packages are aurb's own. Publish your orb as your own package with `npx @aurb/player publish`, then edit the issue.";
else if (!/^\d+\.\d+\.\d+$/.test(version)) reply = "The version needs to be exact, such as `1.0.0`. Edit the issue to fix it, and the check runs again.";
else {
  const ref = `npm:${pkg}@${version}`;
  const r = spawnSync("npx", ["-y", "@aurb/player@latest", "check", ref], { encoding: "utf8", timeout: 8 * 60_000, env: { ...process.env, NO_COLOR: "1" } });
  if (r.error) { console.error(r.error); process.exit(1); } // our failure, not the package's: no reply
  // The check's own words, kept short and unable to close the code block they're quoted in.
  const out = `${r.stdout ?? ""}${r.stderr ?? ""}`.trim().split("\n").slice(-40).join("\n").replace(/`{3,}/g, "` ` `");
  reply = r.status === 0
    ? `✓ \`${ref}\` passes the check. Every file is now cached on jsDelivr, so this version keeps working whatever happens to the package.\n\nPreview it in every state:\n\n\`\`\`bash\nnpx @aurb/player preview ${ref}\n\`\`\`\n\nA maintainer will review it. Once it's approved, it's added to \`orbs.json\` and appears on the site and in \`npx @aurb/player\` within minutes.`
    : `✕ \`${ref}\` isn't ready yet:\n\n\`\`\`\n${out}\n\`\`\`\n\nPublish a fixed version with \`npx @aurb/player publish\`, then edit the version here, and the check runs again.`;
}
fs.writeFileSync("comment.md", `${reply}\n`);
console.log(reply);
