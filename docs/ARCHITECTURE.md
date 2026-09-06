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
- Every asset exists four times: once per theme, once per screen width. The
  README uses `<picture>` with `prefers-color-scheme` **and** `max-width`
  sources, so a phone gets a layout drawn for a phone. See "Responsive layout"
  below.

## Layers

| Layer      | Directory        | Responsibility                                                                                                                                            |
| ---------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Config     | `src/config`     | The shape of `data/config.json`, its defaults, its validator and the `{placeholder}` formatter. Everything a viewer sees is declared here.                |
| Core       | `src/core`       | Types, SVG element builder, easing constants, animation classes, text outlining, validation, fragments. No knowledge of any asset.                        |
| Theme      | `src/theme`      | Dark and light tokens; the registry of themes to render.                                                                                                  |
| Primitives | `src/primitives` | Reusable visual parts: aurora frame, glow, icons, glyphs, pills, rings, app tiles, typewriter, odometer. Each returns a `Fragment` (markup + defs + css). |
| Data       | `src/data`       | GitHub GraphQL client, pure streak and language maths, the `StatsSource` abstraction (live or cached), and loading of `data/config.json`.                 |
| Renderers  | `src/renderers`  | One module per asset. Each is a pure `(RenderContext) => svg` and is built from the config in `src/renderers/index.ts`.                                   |
| Pipeline   | `src/pipeline`   | Renders every registered asset in every theme and viewport, validates it, writes through a `FileSink`.                                                    |
| README     | `src/readme`     | Generates `README.md` from the config and the registry so paths, links and section order never drift.                                                     |
| CLI        | `src/cli`        | Thin entry points: `fetch`, `build`, `readme`, `preview`.                                                                                                 |

Dependencies point downward only: renderers use primitives and core, never the
pipeline; the pipeline knows nothing about specific assets.

## Configuration

`data/config.json` is the only authored file. It holds the profile, the stack,
the featured repositories, the links, which sections exist and in what order,
and every visible string. `src/config/parse.ts` validates it, fills in the
defaults and reports errors by JSON path. `docs/CONFIGURATION.md` documents
every field.

Nothing below the config layer reads a hard-coded fact about a person, so
forking the repository is a matter of editing that one file.

## Responsive layout

GitHub renders a README at whatever width the reader's screen gives it, and
markdown has no place to put a media query — except on `<source media>`, which
GitHub keeps verbatim. Two things follow.

1. **Each asset is drawn twice.** A renderer's `size(viewport)` returns the
   geometry for the wide column and for a phone, and `render` reads
   `ctx.viewport`. The phone variants are written as `<id>-mobile-<theme>.svg`
   and referenced first in the `<picture>`, because the first matching source
   wins. An asset that needs only one layout (a contact button) declares
   `viewports: ['wide']` and is simply not built twice.

2. **A section can be left off a phone.** `appearance.mobile.hide` lists
   sections phones never see. Markdown cannot drop an element at a
   breakpoint — the `<img>` is always in the page — so the narrow source
   points at `assets/blank.svg`, a 1×1 transparent document, and the block
   collapses to the paragraph's own margin. Such a section is also built for
   the wide viewport only.

3. **Sizing is left to the images.** Every `<svg>` carries an intrinsic
   `width`, and GitHub's stylesheet adds `img{max-width:100%}`. A card that
   asks for 430px therefore shares a row with its neighbour on a laptop and
   takes the whole column on a phone — no width attribute in the markup, which
   is the one place a media query could not reach. Only genuinely full-width
   blocks carry `width="100%"`.

## Adding an asset

1. Write a renderer in `src/renderers/<name>.ts` that returns an
   `AssetRenderer` with a `wide` and (usually) a `compact` layout. Build it
   from primitives; put animation on wrapper groups via `animated()` so CSS
   transforms never fight a positioning `transform` attribute.
2. Register it in `src/renderers/index.ts`, under the section it belongs to.
3. Reference it in `src/readme/template.ts` with `picture()`.
4. Run `npm run build && npm run readme && npm run preview`, then open
   `preview/index.html` and use its theme and width switches. Run
   `npm run test:update` to record the new snapshots.

## Data flow

```
GitHub GraphQL ──(npm run fetch, CI daily)──▶ data/stats.json
data/config.json + data/stats.json
        └──(npm run build)──▶ assets/*-{dark,light}.svg
                              assets/*-mobile-{dark,light}.svg
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

`data/config.json` → `appearance.palette` selects the colour variant for every
asset: `ocean` (active), `aurora`, `sunset` or `graphite`, all defined in
`src/theme/tokens.ts`. Change the field, run `npm run build && npm run readme`,
commit. `npm run palettes` renders a side-by-side comparison page, and
`PALETTE=<id> npm run build` previews one without touching the config.

## The contribution snake

`src/renderers/contributions.ts` lays the last year out in GitHub's week
columns and moves a snake along a serpentine path with SMIL `animateMotion`
(supported in every browser for SVGs inside `<img>`). Contribution cells use
CSS keyframes timed to the same cycle so they pop and dim as the head passes.
Private contributions are included whenever the fetch ran with `PROFILE_TOKEN`.
On a phone the same calendar is drawn on a smaller pitch, without the weekday
labels and with every other month named. `contributions.snake: false` in the
config keeps the calendar and drops the snake.

## Local commands

```
npm run fetch      # needs PROFILE_TOKEN or GITHUB_TOKEN in the environment
npm run build      # renders assets/
npm run readme     # regenerates README.md
npm run preview    # writes preview/index.html (?theme=dark&width=phone works too)
npm run check      # typecheck + lint + format check + tests
npm run test:update
```
