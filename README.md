# aurb orbs

Every orb for [aurb](https://github.com/chalktalkhq/aurb), free to use in any product. Each folder in `orbs/` is published to npm as `@aurb/<name>` and served by [jsDelivr](https://www.jsdelivr.com), so there is nothing to host.

```bash
npx aurb            # pick one and get its code
npx aurb list       # see them all
```

```jsx
<Aurb orb="aurora" state="thinking" />
```

`orb="aurora"` follows the latest 1.x, so an improved render reaches your site within a week. Pin one with `orb="aurora@1.0.2"`.

## Add an orb

Make it however you like: Blender, After Effects, a shader, code. aurb only needs the loops.

1. **Make the loops.** One per state and theme, 16 in all:
   - states: `idle`, `listening`, `thinking`, `working`, `speaking`, `success`, `error`, `asleep`
   - `dark` on pure black and `light` on pure white. The player blends them onto the page, so the background disappears.
   - square, at least 320px (640px with `--xl`), seamless, and every one the same length. Ten seconds works well.
   - named `<state>-<theme>`, in any format ffmpeg reads: `idle-dark.mp4`, `idle-light.mov`, and so on.
   - every state is the same object, centred and the same size, so a change of state reads as one thing changing.
2. **Pack them** (needs ffmpeg):
   ```bash
   npx aurb pack ./loops --name nebula --note "A slow violet cloud with a bright core." --out orbs
   ```
3. **Watch every state** in light and dark, at every size:
   ```bash
   npx aurb preview orbs/nebula
   ```
4. **Check it**, the same check a pull request runs:
   ```bash
   npx aurb check orbs/nebula
   ```
5. **Open a pull request** that adds only `orbs/nebula`. Once it is merged, it is published as `@aurb/nebula`, and it appears on the site and in `npx aurb` within minutes.

What gets merged: an orb with its own material and its own motion in every state, not a recolour of one already here. The name must be one lowercase word nobody has taken. Keep each file under 2 MB.

To improve an orb that's already here, change its files and open a pull request. Merging publishes the next patch version.

## Licence

The orbs are under the [aurb Orb Licence](LICENSE): use them in anything, commercial products included, without attribution; don't sell or redistribute them as orbs. By opening a pull request you confirm the work is yours to share, and you license it under the same terms. The player is MIT, in [its own repo](https://github.com/chalktalkhq/aurb).

## Maintainers

`.github/workflows/publish.yml` publishes on every merge to main. It needs an npm automation token for the `@aurb` org as the `NPM_TOKEN` secret. `node scripts/publish.mjs --dry-run` shows what it would publish.
