# aurb orbs

The list of orbs for [aurb](https://github.com/chalktalkhq/aurb): what shows on the site and in `npx aurb`. There are no videos here. Every orb is an npm package that [jsDelivr](https://www.jsdelivr.com) serves, so there is one copy of each, and nothing to host.

```bash
npx aurb            # pick one and get its code
npx aurb list       # see them all
```

- **Our orbs** are the `@aurb/<name>` packages: `orb="aurora"`. A name follows the latest 1.x; pin one with `orb="aurora@1.0.2"`.
- **Community orbs** stay in their maker's own package: `orb="npm:aurb-orb-nebula@1.0.2"`. Nobody types that, since `npx aurb` and the site copy it, always at the version we reviewed.

## Add your orb

Make it however you like: Blender, After Effects, a shader, code. aurb only needs the loops.

1. **Make the loops.** One per state and theme, 16 in all:
   - states: `idle`, `listening`, `thinking`, `working`, `speaking`, `success`, `error`, `asleep`
   - `dark` on pure black and `light` on pure white. The player blends them onto the page, so the background disappears.
   - square, at least 320px (640px with `--xl`), seamless, and every one the same length. Ten seconds works well.
   - named `<state>-<theme>`, in any format ffmpeg reads: `idle-dark.mp4`, `idle-light.mov`, and so on.
   - every state is the same object, centred and the same size, so a change of state reads as one thing changing.
2. **Pack them** (needs ffmpeg). This makes the package `aurb-orb-nebula`; add a licence to its `package.json`.
   ```bash
   npx aurb pack ./loops --name nebula --note "A slow violet cloud with a bright core."
   ```
3. **Watch every state** in light and dark, at every size:
   ```bash
   npx aurb preview orbs/nebula
   ```
4. **Publish it** to npm, as your own package. It checks the orb first.
   ```bash
   npx aurb publish orbs/nebula
   ```
   Anyone can use it from now on, as `orb="npm:aurb-orb-nebula@1.0.0"`.
5. **[Submit it](../../issues/new?template=submit-orb.yml)** to be listed. A check runs on your package and replies with a preview. Once we approve it, it's added to [`orbs.json`](orbs.json) and appears on the site and in `npx aurb` within minutes.

What gets listed: an orb with its own material and its own motion in every state, not a recolour of one already listed. The name must be one lowercase word nobody has taken. Keep each file under 2 MB.

**Updates:** run `npx aurb publish` again, which publishes the next patch version, and submit that version. Until it's approved, everyone keeps the version that was listed.

Your package is yours: your name on it, your download counts, your licence. We never copy or republish it. Deleting it later doesn't break sites using it, because jsDelivr keeps every file it has served, and the check fetches all of them.

## Licence

Our `@aurb` orbs are under the [aurb Orb Licence](LICENSE): use them in anything, commercial products included, without attribution; don't sell or redistribute them as orbs. A community orb is under the licence in its own package. The player is MIT, in [its own repo](https://github.com/chalktalkhq/aurb).

## Maintainers

- **Approve** a submission by adding its entry to `orbs.json`, with `package` and the exact `version`. For an update, change `version`. To remove an orb, delete its entry: it stops being offered, though sites already using that version keep it.
- **Our own orbs** are published from the studio with `npx aurb publish <folder>`, then listed by name. Their folder needs this `LICENSE`.
- `.github/workflows/publish.yml` publishes `@aurb/index` from `orbs.json` on every merge to main. It needs an npm automation token for the `@aurb` org as the `NPM_TOKEN` secret, and that token only ever publishes the list. `node scripts/index.mjs --dry-run` shows what it would publish.
