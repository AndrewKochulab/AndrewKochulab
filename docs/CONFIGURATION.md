# Configuring the profile

Everything a viewer sees lives in **`data/config.json`**. Fork the repository,
edit that one file, run `npm run build && npm run readme`, and the profile is
yours. No TypeScript is involved, and nothing else in `data/` is authored by
hand (`stats.json` is fetched from GitHub).

Only `profile.login` and `profile.name` are required. Every other field has a
default, and an unknown or malformed field fails the build with the JSON path
that is wrong — for example
`data/config.json: stats.tiles[0] must be one of: stars, repos, …`.

```
npm run build     # renders assets/ for both themes and both screen widths
npm run readme    # regenerates README.md from the config
npm run preview   # preview/index.html, with light/dark and phone/desktop switches
```

## `profile`

| Field      | Default | Meaning                                                                                               |
| ---------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `login`    | —       | GitHub account. Stats are fetched for it, and it owns the featured repos unless one says otherwise.   |
| `name`     | —       | Shown large in the hero. Long names shrink to fit rather than clipping.                               |
| `title`    | `""`    | Line under the name. Empty hides it.                                                                  |
| `location` | `""`    | Small line above the name. Empty hides it and its pin.                                                |
| `taglines` | `[]`    | Typed out one after another under the title. One line does not cycle; an empty list hides the prompt. |

## `appearance`

| Field               | Default    | Meaning                                                                                                                                                                                                  |
| ------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `palette`           | `"aurora"` | Colour variant: `aurora`, `ocean`, `sunset` or `graphite` (see `src/theme/tokens.ts`). `npm run palettes` renders them side by side; `PALETTE=<id> npm run build` previews one without editing the file. |
| `radius`            | `22`       | Corner radius of every card.                                                                                                                                                                             |
| `mobile.enabled`    | `true`     | Build and reference the phone-sized variant of every asset.                                                                                                                                              |
| `mobile.breakpoint` | `600`      | Viewport width, in CSS pixels, below which those variants are used.                                                                                                                                      |
| `mobile.hide`       | `[]`       | Section ids left off the page on a phone, e.g. `["contributions"]`. Their phone variants are never built, and below the breakpoint the block resolves to a blank image instead.                          |

## `sections`

The order of the page, and what appears on it:

```json
"sections": ["hero", "activity", "projects", "contributions", "contact"]
```

Drop an id to remove that block entirely — nothing is rendered for it, so the
build gets faster too. `activity` is the pair of stats and languages cards.

## `hero`

```json
"hero": {
  "stack": [{ "slug": "swift", "label": "Swift", "color": "#f05138" }],
  "stackOnMobile": false,
  "tiles": [{ "slug": "swift", "gradient": ["#ff9f43", "#f0433a"], "scale": 1 }],
  "sparkles": 9
}
```

- `stack` — the chips under the tagline. `slug` is a [simple-icons] slug;
  `label` defaults to the slug and `color` to the brand colour. They wrap onto
  more rows automatically.
- `stackOnMobile` — off by default. On a phone the chips wrap to two rows and
  crowd a card whose tiles already name the same stack, so they are left out
  and the card shortens to suit. Set it to `true` to keep them.
- `tiles` — the floating app icons. Up to six; positions and sizes come from
  the layout, so adding one never means hand-placing it. `gradient` defaults
  to the flat brand colour, `scale` (0.5–1.6) nudges one tile's size.
- `sparkles` — how many drifting sparkles sit behind the tiles. `0` removes
  them.

## `stats`

```json
"stats": { "tiles": ["stars", "repos", "followers", "streak"] }
```

Up to four figures, drawn in a 2×2 grid beside the contribution ring. Choose
from `stars`, `repos`, `followers`, `streak`, `commits`, `pullRequests`,
`activeDays` and `contributions`.

## `languages`

```json
"languages": { "count": 5 }
```

How many languages the donut and legend show (1–6). Both cards grow to fit.

## `projects`

```json
"projects": {
  "layout": "grid",
  "items": [
    { "repo": "RealmStorage", "blurb": "Modern Realm wrapper.", "owner": "someone", "url": "https://…" }
  ]
}
```

- `layout` — `grid` puts two cards on a row wherever the column is wide enough
  for both, and one per row otherwise. `row` gives every project the full
  width, with the numbers on the title line.
- `owner` defaults to `profile.login`, and `url` to the repository page.
- Stars, forks and the language dot come from the fetched snapshot, so a
  repository with no data simply shows zeroes.

## `contributions`

```json
"contributions": { "snake": true }
```

`snake: false` keeps the calendar and drops the snake that hunts across it.

## `links`

```json
"links": [
  { "id": "instagram", "label": "Instagram", "url": "https://instagram.com/…" },
  { "id": "website", "label": "Site", "url": "https://…", "icon": "safari", "gradient": ["#333", "#000"], "angle": 45 }
]
```

`id` names the button and, by default, its icon and brand colours. Instagram,
LinkedIn, X, GitHub, Mastodon, YouTube, Telegram, Bluesky, Dribbble and Medium
are known; anything else needs an `icon` ([simple-icons] slug) and, if the
default blue-to-purple is not wanted, a `gradient`.

## `text`

Every string a viewer reads, so the profile can be reworded or translated.
Supply only the keys you want to change; the rest keep their defaults. Values
in braces are substituted.

| Key                                            | Default                                       | Placeholders             |
| ---------------------------------------------- | --------------------------------------------- | ------------------------ |
| `statsTitle`                                   | `GitHub activity`                             |                          |
| `statsCaption`                                 | `synced {date} · {scope}`                     | `date`, `scope`          |
| `scopePrivate` / `scopePublic`                 | `incl. private` / `public only`               |                          |
| `contributionsUnit`                            | `contributions`                               |                          |
| `activeDays`                                   | `{days} active days · {percent}% of the year` | `days`, `percent`        |
| `statStars`                                    | `Stars earned`                                |                          |
| `statRepos`                                    | `Public repos`                                |                          |
| `statFollowers`                                | `Followers`                                   |                          |
| `statStreak`                                   | `Day streak · best {best}`                    | `best`                   |
| `statCommits`                                  | `Commits this year`                           |                          |
| `statPullRequests`                             | `Pull requests`                               |                          |
| `statActiveDays`                               | `Active days`                                 |                          |
| `statContributions`                            | `Contributions`                               |                          |
| `languagesTitle`                               | `Languages`                                   |                          |
| `languagesCaption`                             | `by bytes · own source repos`                 |                          |
| `contributionsTitle`                           | `Contributions · last 12 months`              |                          |
| `contributionsCaption`                         | `{contributions} contributions · {scope}`     | `contributions`, `scope` |
| `calendarScopePrivate` / `calendarScopePublic` | `public + private` / `public only`            |                          |
| `legendLess` / `legendMore`                    | `Less` / `More`                               |                          |
| `heroAlt`                                      | `{name} — {title}`                            | `name`, `title`          |

Labels that would overrun their column are trimmed with an ellipsis rather
than colliding with the next one, so a longer translation degrades quietly.

[simple-icons]: https://simpleicons.org
