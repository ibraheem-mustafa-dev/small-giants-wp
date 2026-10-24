# Intake review: eye-care-ward-end

Taken on 2026-10-24T03:53:43.984Z; manifest ?, files hash 44136fa355b3678a.

How to mark: put x in a section's `Accept all: [ ]` box to give every row the section's first mark; to mark one row differently, write its mark in that row's Mark cell (a row's own mark always beats Accept all). Flag rows left blank are accepted as flagged and not-a-defect rows left blank stay not defects; every other row needs Accept all or its own mark. Rows marked **changed** differ from the last export, lost their old mark and come first. Then run `node scripts/computed-route/intake.mjs --apply-review eye-care-ward-end`.

Rows: 33; 33 need reading, 0 are confident proposals that Accept all covers (skeleton block choices 0, missing features 0).

Not defects counted, not listed: none.

Marks per section (first value = Accept all):
- Page map: `accept`, `edit:<field>=<value>`, `drop`
- Palette roles: `accept`, `role:<slug>[,<slug>...]`, `one-off`
- Site Info: `accept`, `edit:<value>`, `drop`
- Flags: `accept-flagged`, `not-flagged`
- Draft defects: `accept`, `render-wins`
- Not defects: unwired code: `not-a-defect`, `defect`
- Missing features: `map:<block>`, `difference`, `build`, `gap:<wave>`
- Script effects: `accept`, `block:<slug>`, `difference`
- Skeleton block choices: `accept`, `block:<slug>`, `remove`
- Inventory diffs: `ours`, `theirs`
- Notices: `noted`

## Palette roles (palette-role)

Accept all: [ ]

| Row | Shows | Proposed | Confidence or reason | Mark |
|---|---|---|---|---|
| `palette:--acc` | --acc #9C8B78 | role:custom-acc | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) |  |
| `palette:--acc-ink` | --acc-ink #6F6152 | role:text-muted | 0.85: the most used text colour after the text and heading colours, lighter than the text (17 elements) |  |
| `palette:--acc-soft` | --acc-soft #EFEAE2 | role:custom-acc-soft | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) |  |
| `palette:--border-default` | --border-default #E6E1DA | role:border-light | 0.85: the next divider line colour, lighter than the border (66 lines) |  |
| `palette:--border-strong` | --border-strong #D8D2C8 | role:border | 0.95: the most used divider line colour (108 lines; a link's underline and a line in the page ground's colour are not dividers); the name --border-strong agrees |  |
| `palette:--border-warm` | --border-warm #D5CCBD | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--button-primary-bg` | --button-primary-bg #141414 | role:text,heading,link,primary,section-text | 0.95: the page text: the body colour on 1 page(s); the name --text-body agrees |  |
| `palette:--button-primary-fg` | --button-primary-fg #FAF8F5 | role:surface,footer-bg,primary-text,text-inverse | 0.95: the page ground: the body background on 1 page(s); the name --surface-page agrees |  |
| `palette:--control-off` | --control-off #C9C2B8 | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--focus-ring` | --focus-ring #9C8B78 | role:custom-focus-ring | 0.3: no rendered fact or name gives it a slug; stays a custom colour (FR-33-2) |  |
| `palette:--hairline` | --hairline #E6E1DA | role:border-light | 0.85: the next divider line colour, lighter than the border (66 lines) |  |
| `palette:--ink` | --ink #141414 | role:text,heading,link,primary,section-text | 0.95: the page text: the body colour on 1 page(s); the name --text-body agrees |  |
| `palette:--ink-hover` | --ink-hover #2A2A2A | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--paper` | --paper #FAF8F5 | role:surface,footer-bg,primary-text,text-inverse | 0.95: the page ground: the body background on 1 page(s); the name --surface-page agrees |  |
| `palette:--success` | --success #1B7F43 | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--surface-alt` | --surface-alt #F3F0EB | role:section | 0.85: the most used ground after the page, raised and primary grounds (12 elements) |  |
| `palette:--surface-card` | --surface-card #FFFFFF | role:surface-alt | 0.95: the most used light ground after the page ground (29 elements); the name --surface-card agrees |  |
| `palette:--surface-page` | --surface-page #FAF8F5 | role:surface,footer-bg,primary-text,text-inverse | 0.95: the page ground: the body background on 1 page(s); the name --surface-page agrees |  |
| `palette:--surface-soft` | --surface-soft #F0EBE3 | role:custom-surface-soft | 0.3: name says surface, but surface-alt is read from usage on --white (#FFFFFF) |  |
| `palette:--text-2` | --text-2 #5E584F | role:custom-text-2 | 0.3: name says body text, but text is read from usage on --ink (#141414) |  |
| `palette:--text-3` | --text-3 #77716A | role:custom-text-3 | 0.3: name says body text, but text is read from usage on --ink (#141414) |  |
| `palette:--text-4` | --text-4 #8B8478 | role:custom-text-4 | 0.3: name says body text, but text is read from usage on --ink (#141414) |  |
| `palette:--text-body` | --text-body #141414 | role:text,heading,link,primary,section-text | 0.95: the page text: the body colour on 1 page(s); the name --text-body agrees |  |
| `palette:--text-faint` | --text-faint #A39C90 | role:custom-text-faint | 0.3: name says body text, but text is read from usage on --ink (#141414) |  |
| `palette:--text-muted` | --text-muted #6B655E | role:custom-text-muted | 0.3: name says muted text, but text-muted is read from usage on --acc-ink (#6F6152) |  |
| `palette:--text-strong` | --text-strong #4A453E | role:custom-text-strong | 0.3: name says body text, but text is read from usage on --ink (#141414) |  |
| `palette:--wa` | --wa #25D366 | role:accent | 0.85: the next most used strong ground (2 links) |  |
| `palette:--wa-border` | --wa-border #B7E5C7 | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--wa-hover` | --wa-hover #1EBE5A | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--wa-ink` | --wa-ink #0B2B17 | role:accent-text | 0.85: the most used text colour on the accent ground (weight 7) |  |
| `palette:--wa-ink-deep` | --wa-ink-deep #12301E | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--wa-soft` | --wa-soft #E9F9EF | no slug (one-off) | unused: no element in the draft uses this value |  |
| `palette:--white` | --white #FFFFFF | role:surface-alt | 0.95: the most used light ground after the page ground (29 elements); the name --surface-card agrees |  |
