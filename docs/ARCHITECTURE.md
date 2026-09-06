# How this profile is built

The README on the profile is assembled from SVG files that this repository
generates. Nothing on the page depends on a third-party image service or
action; even the contribution snake is rendered here from the calendar data.

## Why SVG, and why generated

GitHub renders README images through an `<img>` element. Inside that element
an SVG may animate with CSS keyframes, but it cannot run scripts, load web
fonts, or fetch anything. So:

- Display text is outlined to paths at build time (`src/core/text.ts`) using
  the bundled Inter and JetBrains Mono fonts, which makes every viewer see the
  same glyphs.
- All motion is CSS inside each SVG's `<style>` block (`src/core/animation.ts`).
  A single `prefers-reduced-motion` rule collapses every animation to its end
  state.
- Every asset exists twice, once per theme. The README uses `<picture>` with a
  `prefers-color-scheme` source so GitHub picks the right one.

## Layers

| Layer      | Directory        | Responsibility                                                                                                                                            |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Core       | `src/core`       | Types, SVG element builder, easing constants, animation classes, text outlining, validation, fragments. No knowledge of any asset.                        |
| Theme      | `src/theme`      | Dark and light tokens; the registry of themes to render.                                                                                                  |
| Primitives | `src/primitives` | Reusable visual parts: aurora frame, glow, icons, glyphs, pills, rings, app tiles, typewriter, odometer. Each returns a `Fragment` (markup + defs + css). |
| Data       | `src/data`       | GitHub GraphQL client, pure streak and language maths, the `StatsSource` abstraction (live or cached), and loading of the authored JSON.                  |
| Renderers  | `src/renderers`  | One module per asset. Each is a pure `(RenderContext) => svg` and is registered in `src/renderers/index.ts`.                                              |
| Pipeline   | `src/pipeline`   | Renders every registered asset in every theme, validates it, writes through a `FileSink`.                                                                 |
| README     | `src/readme`     | Generates `README.md` from the registry so paths and sizes never drift.                                                                                   |
| CLI        | `src/cli`        | Thin entry points: `fetch`, `build`, `readme`, `preview`.                                                                                                 |

Dependencies point downward only: renderers use primitives and core, never the
pipeline; the pipeline knows nothing about specific assets.

## Adding an asset

1. Write a renderer in `src/renderers/<name>.ts` that returns an `AssetRenderer`.
   Build it from primitives; put animation on wrapper groups via `animated()`
   so CSS transforms never fight a positioning `transform` attribute.
2. Register it in `src/renderers/index.ts`.
3. Reference it in `src/readme/template.ts` with `picture()`.
4. Run `npm run build && npm run readme && npm run preview`, then open
   `preview/index.html`. Run `npm run test:update` to record the new snapshots.

## Data flow

```
GitHub GraphQL ──(npm run fetch, CI daily)──▶ data/stats.json
data/profile.json + stack.json + projects.json + stats.json
        └──(npm run build)──▶ assets/*-dark.svg, assets/*-light.svg
        └──(npm run readme)─▶ README.md
```

## Workflows

- `ci.yml` runs typecheck, lint, format check, tests and a build on every push
  and pull request.
- `refresh.yml` runs daily (04:17 UTC) and on demand: fetch → build → readme →
  amend the single commit and force-push, only when something changed. The
  repository deliberately has one commit; treat `main` as generated. Set the optional `PROFILE_TOKEN` secret
  (classic PAT with `read:user` and `repo`) so private contributions count.

## Palette

`data/profile.json` → `palette` selects the colour variant for every asset:
`ocean` (active), `aurora`, `sunset` or `graphite`, all defined in
`src/theme/tokens.ts`. Change the field, run `npm run build && npm run readme`,
commit. `npm run palettes` renders a side-by-side comparison page, and
`PALETTE=<id> npm run build` previews one without touching the config.

## The contribution snake

`src/renderers/contributions.ts` lays the last year out in GitHub's week
columns and moves a snake along a serpentine path with SMIL `animateMotion`
(supported in every browser for SVGs inside `<img>`). Contribution cells use
CSS keyframes timed to the same cycle so they pop and dim as the head passes.
Private contributions are included whenever the fetch ran with `PROFILE_TOKEN`.

## Local commands

```
npm run fetch      # needs PROFILE_TOKEN or GITHUB_TOKEN in the environment
npm run build      # renders assets/
npm run readme     # regenerates README.md
npm run preview    # writes preview/index.html (add ?theme=dark to the URL)
npm run check      # typecheck + lint + format check + tests
npm run test:update
```
