# R2 ledger: the Claude Design "design system" skill output (Indus Foods export)

Export root: `C:\Users\Bean\Projects\small-giants-wp\.claude\Indus-Foods-Claude-Design-Files\` (paths below are relative to it).
Comparison baseline: `design_handoff_indus_foods_website/README.md` (12,782 bytes, 100 lines), called "handoff README" below. Ground truth for contradictions: `design_handoff_indus_foods_website/Indus Foods Website v2.dc.html` ("the draft"; byte-identical size, 223,543, to the root copy).

## Slice inventory (20 files, 18,686 bytes in total)

| Path | Bytes |
|---|---|
| SKILL.md | 881 |
| readme.md (the only README at the root; `README.md` resolves to the same file on this case-insensitive disk) | 3,025 |
| styles.css | 92 |
| tokens/colors.css | 1,067 |
| tokens/spacing.css | 588 |
| tokens/typography.css | 816 |
| components/core/Button.jsx | 601 |
| components/core/Button.d.ts | 204 |
| components/core/Button.prompt.md | 300 |
| components/core/Chip.jsx | 361 |
| components/core/Chip.d.ts | 121 |
| components/core/Chip.prompt.md | 122 |
| components/core/core.card.html | 1,989 |
| guidelines/colors-brand.html | 2,047 |
| guidelines/colors-gradients.html | 818 |
| guidelines/colors-neutrals.html | 2,052 |
| guidelines/radius-shadow.html | 974 |
| guidelines/spacing.html | 1,484 |
| guidelines/type-body.html | 549 |
| guidelines/type-heading.html | 595 |

No SVG or raster image sits in the slice (the logos and WhatsApp glyph it names live in `assets/`, outside it). The `guidelines/*.html` and `core.card.html` files are specimen cards (`<!-- @dsCard group=... viewport=... -->`), read here as source.

Every file was read in full. Commands used: `cat` of each file; `grep -oF`/Python counts over the draft; `declared_sources.read_readme_tokens` and a Pass A dry run (below).

## Two facts that frame every verdict

1. **The draft declares no `:root` tokens.** `grep ":root"` over the draft returns nothing; the only `var(--` uses are prototype locals (`--acc` x11, `--ic`, `--gy`, `--gx`). `shared_utils.py::extract_css` reads only inline `<style>` blocks, so Pass A (`token_map.py::build_draft_root_token_map`) finds nothing in the draft. **`tokens/*.css` is the only place in the export where the design system exists as declared CSS custom properties.**
2. **Neither README feeds the extractor today.** `declared_sources.py::read_readme_tokens` on both folders returns `{"found": true, "colours": [], "fonts": [], "layout": {}}` (run 2026-10-10). It parses colour *tables* and `Label: **Family**` font bullets; both READMEs write tokens as prose bullets (handoff README: "Brand blue `#0A7EA8` (hover `#075E80` ...)"; slice readme.md: "**Colour:** brand blue `#0A7EA8`..."), so nothing is read. Separately: if `--draft` ever points at the root copy of the draft, `read_readme_tokens` picks the root `readme.md` (it matches `name.lower() == "readme.md"`), not the handoff README.

---

## Per-file ledger

### tokens/colors.css

| Field | Finding |
|---|---|
| Contents | One `:root{}` block, 41 custom properties. Brand: `--brand-blue:#0A7EA8; --brand-blue-hover:#075E80; --brand-blue-light:#2EADE2; --brand-gold:#D8CA50; --brand-gold-light:#E7D768; --brand-gold-mid:#E3D35F; --brand-gold-pale:#EBDD78`. Neutrals: `--ink:#1E2A3C; --slate:#2C3E50; --grey-body:#4A5563; --grey-muted:#68727C`. Surfaces: `--surface-white:#FFFFFF; --surface-warm:#FAFAF8; --surface-cool:#F2F5F7; --tint-on-blue:#E3EFF4`. Third-party: `--social-linkedin:#0A66C2; --social-facebook:#1877F2; --social-google:#EA4335; --whatsapp-green:#25D366`. Gradients: `--gradient-hero:linear-gradient(135deg,#EBDD78,#E3D35F,#D8CA50)`, `--gradient-brand:linear-gradient(120deg,#E7D768 0%,#2EADE2 55%,#0A7EA8 100%)`, `--gradient-progress:linear-gradient(90deg,#D8CA50,#2EADE2)`. **Semantic aliases** (the valuable part): `--text-heading:var(--slate); --text-body:var(--grey-body); --text-muted:var(--grey-muted); --text-link:var(--brand-blue); --text-link-hover:var(--brand-blue-hover); --surface-header; --surface-topbar:var(--brand-blue); --surface-section-blue; --surface-section-gold; --border-accent:var(--brand-gold); --selection-bg:var(--brand-gold); --selection-fg:var(--ink)`. |
| Machine-readable? | Yes: plain CSS custom properties, parsable by `token_map.py` today (71 tokens resolved across the three token files, `var()` chains resolved). |
| vs handoff README | **Duplicate values** for every brand, neutral, surface and social hex and the brand gradient (README §Design Tokens lines 68-75). **Extra**: names and roles for each value; `--gradient-hero` (README gives it only in the Home hero prose, line 39); `--gradient-progress` (README line 23 prose); `--whatsapp-green:#25D366` (README never states the hex); `--surface-topbar`, `--surface-section-gold`, `--border-accent`. **Missing vs README**: `#0A6E93` ("text-on-gold alt"), `#5E6873` (second muted), `#DCEBF1` (second tint on blue); the draft uses each (4, 4 and 2 times). **Missing vs the draft, in both**: `#EAF4F7` (6 uses, photo-frame fill), `#C9D4DE` (contact sub-text on blue), `#6F8193`/`#AEBBC7` (footer separators), `#0B2B17` (WhatsApp pill ink), the Instagram radial gradient `#FDF497,#FD5949,#D6249F,#285AEB`. **Contradiction**: none on values. |
| Unique value | The only declared, named, role-tagged colour set in the export. The alias layer states roles outright (`--text-heading` = slate, `--text-body` = grey-body, `--text-link` = blue, `--border-accent` = gold) that Pass A otherwise has to infer from usage. |
| Consumers | **Theme extractor Pass A**, but not as-is. Dry run (`palette.build_palette` on the three token files, empty facts): 19 entries, **no `primary`, no `accent`**; slugs come out as raw names (`brand-blue`, `slate`, `ink`, `brand-gold-light`, `social-google`...), gold lands as `border-accent` (alias cluster's alphabetically first name), `text` = `#4a5563` (via `--text-body`), white = `surface-header`. Trace: "brand-blue link-colour raw draft-token slug (usage role link-colour conf 0.80, no baseline match)". So it needs a name-to-slug map (see Vocabulary gaps) before it beats the current result: today's `sites/indus-foods/theme-snapshot.json` has `primary #0a7ea8` but `accent #F59E0B`, `footer-bg #0F172A`, `text #1A202C` (framework defaults; the gold and slate are absent). Also the **walker/Fill** colour-to-slug lookup and **gradients** (no SGS slot today, see gaps). |
| Verdict | **Essential** (once mapped). The single machine-readable token source; the names carry role intent the extractor lacks. Not complete: three README colours and ~6 draft colours are absent, so it supplements, never replaces, measurement. |

### tokens/typography.css

| Field | Finding |
|---|---|
| Contents | `@import` of Google Fonts CSS2 (`Montserrat:wght@500;600;700;800`, `Source+Sans+3:wght@400;500;600;700`, `Geist+Mono:wght@400;500`). `:root`: `--font-heading:"Montserrat",sans-serif; --font-body:"Source Sans 3",sans-serif; --font-mono:"Geist Mono",monospace; --fs-body:19px; --lh-body:1.55; --fs-h1:clamp(36px,5vw,62px); --fs-h2:clamp(28px,3.4vw,40px); --fs-card-title:22px; --fs-eyebrow:13px; --fs-nav:17px; --fs-mono:12px; --tracking-eyebrow:.14em; --tracking-mono:.14em`. Base rules: `body{...color:var(--text-body)}`, `h1,h2,h3{font-family:var(--font-heading);color:var(--text-heading)}`, `::selection`, `a`/`a:hover`. |
| Machine-readable? | Yes (CSS variables and rules). |
| vs handoff README | **Duplicate**: families and weights (README line 77), 19px/1.55, H1 clamp (line 39), H2 clamp (line 78), card title 22, eyebrow 13/.14em, mono 12/.14em. **Extra**: `--fs-nav:17px` (README line 24 prose only) as a named token. **Missing vs README**: H1 line-height 1.08, H2 line-height 1.15 and `-0.01em` tracking, hero sub `clamp(18px,1.7vw,22px)/600`, eyebrow colour `#0A7EA8`, the Source Sans 3 italic 400 the draft's `<link>` loads. **Contradiction**: `body{color:var(--text-body)}` = `#4A5563`, but the draft's root wrapper paints `color:#1E2A3C` (`<div style="background:#FFFFFF;color:#1E2A3C;...font-size:19px;line-height:1.55">`) and its `<style>` sets `::selection{color:#1E2A3C}`; `#4A5563` is the paragraph colour (22 uses). The slice readme.md says "slate `#2C3E50` text". Three files, three "body text" answers. |
| Unique value | A named type scale with clamps verbatim (Spec 32 §14.2 wants authored `clamp()` emitted verbatim). Small over the README, which has the same numbers. |
| Consumers | Extractor `fontSizes` and `fontFamilies` (UNVERIFIED that any current code path reads `--fs-*` from `:root`; FR-33-3 reads base typography from computed nodes, which already gets 19px/1.55). The `@import` URL is a CSS import, not the draft `<link>` that `extract.py::_self_host_google_font` reads, so it adds nothing to font self-hosting. |
| Verdict | **Useful**: names the scale; values duplicate the README and the computed pass; its body colour rule is wrong against the draft, so it must not override measurement. |

### tokens/spacing.css

| Field | Finding |
|---|---|
| Contents | Radius `--radius-tag:3px; --radius-tile:12px; --radius-card:22px; --radius-panel:12px; --radius-pill:999px`. Shadows `--shadow-button:0 8px 18px -8px rgba(0,0,0,.45); --shadow-card:0 20px 34px -20px rgba(44,62,80,.55); --shadow-panel:0 30px 80px -30px rgba(20,25,35,.28); --shadow-header:0 10px 30px -18px rgba(20,40,60,.35)`. Gap scale `--gap-1..8: 8,10,14,18,22,28,40,64px`. `--gutter-mobile/tablet/desktop: 20/32/40px`; `--section-mobile/tablet/desktop: 64/88/108px`. `--ease-out:cubic-bezier(.16,.84,.32,1)`. |
| Machine-readable? | Yes. |
| vs handoff README | **Duplicate**: all three shadow values (README line 80), header shadow (line 24), gap scale (line 81), gutters and section padding (line 19), easing (line 25). **Extra**: names (tag/tile/card/panel). **Less precise on radius**: README gives ranges, "9-12 (tiles/inputs), 16-22 (cards)"; tokens pick 12 and 22. The draft uses `border-radius:10px` x9, `16px` x2, `18px` x1, `28px` (map), `11px` (nav) — none tokenised. **Missing vs README**: tight section padding 40/52/64, header height 72/72/84, max widths 1320 and 1040-1120. **Missing vs draft**: the second easing `cubic-bezier(.2,.8,.2,1)` (19 uses, every button transition) and the CTA's blue-tinted shadow `0 8px 18px -8px rgba(10,126,168,.65)`. |
| Unique value | A named, ordered radius/shadow set ready to map to `settings.custom.borderRadius` and `settings.shadow.presets`. Values themselves are in the README. |
| Consumers | Extractor shadow presets, `borderRadius`, `easing`; Fill when snapping a measured radius/shadow to a token (UNVERIFIED that Fill snaps to custom tokens today). |
| Verdict | **Useful**: correct values, convenient names; incomplete (one easing of two, one button shadow of two), so measurement still decides. |

### styles.css

| Field | Finding |
|---|---|
| Contents | Three `@import`s: `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`. |
| Machine-readable? | Yes; an entry point only. |
| vs handoff README | Nothing to compare. |
| Unique value | One path that loads the whole token set (the specimen cards link it). |
| Consumers | Any tool that wants "the design system CSS" in one fetch; would need `@import` resolution (`extract_css` does not resolve imports). |
| Verdict | **Redundant** on its own (92 bytes of glue), harmless. |

### components/core/Button.jsx, Button.d.ts, Button.prompt.md

| Field | Finding |
|---|---|
| Contents | `Button({variant='primary'})`, variants `primary|dark|gold|light` (`.d.ts`). Shared style: `font:'600 17px var(--font-heading)', padding:'12px 22px', borderRadius:'var(--radius-pill)', boxShadow:'var(--shadow-button)'`. Variant colours: primary blue/white, dark `#000`/gold, gold gold/slate, light white/blue. Prompt: "Pill call-to-action button used in header, hero and cards ... dark (black with gold text, hero) ... light (white with blue text, top bar)". |
| Machine-readable? | Partly: a JS object literal of variant colours; no hover, focus, border or size props. |
| vs handoff README | **Duplicates** the header CTA (README line 24: blue, white, radius 999, `12px 22px`, 17px/600). **Contradicts the draft for two of four variants**: hero dark pill in the draft is `font-size:16px; padding:15px 26px; border:2px solid #000000; box-shadow:0 8px 18px -8px rgba(0,0,0,.55)` with hover `scale(1.05) translateY(-2px)`, `font-weight:700; color:#E7D768` (component: 17px, 12px 22px, no border, alpha .45, no hover). Top-bar light pill in the draft (and README line 22) is `padding:6px 14px; font-size:15px; font-weight:700; box-shadow:0 2px 6px rgba(0,0,0,.15)`, hover gold bg/slate text (component: 17px/600, 12px 22px, `--shadow-button`). Header CTA in the draft has `border:2px solid #0A7EA8` and a blue shadow `rgba(10,126,168,.65)` (component: none and black .45). The hero "Request Our Catalogue" blue pill with white 2px border (README line 39) has no variant. |
| Unique value | A four-name variant list (primary, dark, gold, light) that an SGS `buttonPresets` map could key on. The values are a normalised simplification, not the draft. |
| Consumers | Button presets (Spec 32 §10, §14.3: framework presets are `primary`, `secondary`, `outline` + optional `default`); the skeleton writer as a variant hint. Not an answer key: its geometry disagrees with the draft. |
| Verdict | **Useful as a variant inventory only; noise as a value source.** Using its padding/size/shadow would write wrong settings where Fill measures the right ones. |

### components/core/Chip.jsx, Chip.d.ts, Chip.prompt.md

| Field | Finding |
|---|---|
| Contents | `Chip({active})`: `font:'700 13px var(--font-heading)', letterSpacing:'.14em', textTransform:'uppercase', padding:'7px 14px', borderRadius pill`, bg `active ? brand-blue : rgba(255,255,255,.6)`. Prompt: "Uppercase pill for trust badges and blog category filters". |
| Machine-readable? | Partly (inline style object). |
| vs handoff README | Duplicates README line 39 (trust chips 13px/700 uppercase, `rgba(255,255,255,.6)`) and line 52 (active chip `#0A7EA8`/white). **Contradicts the draft**: trust chip is `letter-spacing:.04em; padding:7px 13px` with a 7px blue dot (`<span style="width:7px;height:7px;border-radius:50%;background:#0A7EA8">`); blog chips' inactive bg is `#FFFFFF` (`bg: c === cat ? '#0A7EA8' : '#FFFFFF'`), not `.6` white. Contradicts its own specimen too: `core.card.html` paints inactive chips `background:rgba(44,62,80,.1)`. |
| Unique value | Names one reusable pattern (chip/badge) shared by two sections. |
| Consumers | Skeleton writer (a hint that trust badges and blog filters are one component). |
| Verdict | **Redundant/noise**: three different inactive backgrounds across chip, card and draft; wrong tracking. |

### components/core/core.card.html

| Field | Finding |
|---|---|
| Contents | Specimen: four buttons (blue, black/gold, gold/slate, white/blue on a blue tile) all `600 17px`, `12px 22px`; four chips (`BRC certified`, `Halal certified`, active `All`, `News`). Literal hexes, no `var()` for colours. |
| Machine-readable? | HTML with inline styles; parseable but a rendering, not data. |
| vs handoff README | Same contradictions as Button/Chip; adds a third inactive chip colour `rgba(44,62,80,.1)` found nowhere in the draft (0 matches). |
| Unique value | None beyond Button/Chip. |
| Consumers | None credible; a walker answer key would be wrong (geometry differs from the draft). |
| Verdict | **Noise.** |

### guidelines/colors-brand.html, colors-neutrals.html, colors-gradients.html

| Field | Finding |
|---|---|
| Contents | Swatch cards. Brand: blue `#0A7EA8`, blue-hover `#075E80`, blue-light `#2EADE2`, gold `#D8CA50`, gold-light `#E7D768`, gold-pale `#EBDD78` (omits `--brand-gold-mid #E3D35F`). Neutrals: ink, slate, grey-body, grey-muted, warm `#FAFAF8`, cool `#F2F5F7` (omits white and `#E3EFF4`). Gradients: bars for `--gradient-hero` "hero", `--gradient-brand` "brand (sectors panel)", `--gradient-progress` "progress bar". |
| Machine-readable? | Weakly (hexes in inline styles); a visual of `tokens/colors.css`. |
| vs handoff README | Duplicate values; the gradient card adds one fact the README states differently: README line 92 still lists "Confirm the Sectors panel gradient" as open, while the card presents it as settled. |
| Unique value | A human glance at the palette; nothing a machine needs that `colors.css` lacks. |
| Consumers | Bean's eye (QC), not the pipeline. |
| Verdict | **Redundant** for the pipeline (strict subset of `colors.css`). |

### guidelines/radius-shadow.html, spacing.html

| Field | Finding |
|---|---|
| Contents | Radius/shadow tiles: "tile 12" (uses `--shadow-button`), "card 22" (`--shadow-card`), "panel 12" (`--shadow-panel`), "pill". Gap scale squares 8, 10, 14, 18, 22, 28, 40, 64. |
| Machine-readable? | Weakly; visual of `spacing.css`. |
| vs handoff README | Duplicate. |
| Unique value | None for machines. |
| Consumers | Bean's eye. |
| Verdict | **Redundant.** |

### guidelines/type-heading.html, type-body.html

| Field | Finding |
|---|---|
| Contents | Heading: "Leading Indian Food & Drinks Wholesaler" at `800 52px/1.08` Montserrat slate; card title `700 22px`; eyebrow `700 13px`, `.14em`, uppercase, `--brand-blue`. Body: Source Sans 3 `19px/1.55` `--grey-body`; mono label 12px `.14em` uppercase `--grey-muted`. |
| Machine-readable? | Weakly. |
| vs handoff README | Duplicate (README lines 39, 77-78). The specimen's fixed 52px H1 is one point on the README's `clamp(36px,5vw,62px)`, not a token. It does carry H1 line-height 1.08 and eyebrow colour, which `typography.css` lacks but the README has. |
| Unique value | None for machines. |
| Consumers | Bean's eye. |
| Verdict | **Redundant.** |

### readme.md (root, slice)

| Field | Finding |
|---|---|
| Contents | Brand brief: company ("family-run ... since 1962"), purpose (trade-account sign-ups, four sectors). **Content fundamentals**: "Plain, warm, trade-focused. Second person ... Buttons and nav use Title Case; headings are Title Case or sentence case ... Friendly exclamation is used sparingly ... No emoji." Visual foundations (colour, type, shape, shadows, backgrounds, **motion**: "easing `cubic-bezier(.16,.84,.32,1)`; staggered translate-and-blur reveal on load and scroll; magnetic buttons with shine and ripple; pointer-tilt cards; marquee of brand logos. Hover: lift 2 to 6px, scale 1.05, buttons turn gold with slate text. Cards invert to slate with gold text. Reduced-motion respected."), layout, blur/transparency, iconography ("No icon font ... 34px circular brand-colour buttons"), logos, index, caveats ("Only Button and Chip are componentised ... No UI-kit folder was built."). |
| Machine-readable? | No; prose bullets. `read_readme_tokens` reads nothing from it (see framing fact 2). |
| vs handoff README | Mostly a **condensed duplicate** of the handoff README. **Extra**: the content/tone rules (Title Case buttons and nav, second person, sparing exclamation, no emoji) and the iconography rule; the handoff README has neither. **Contradicts the draft and handoff README**: "Mega menus on dark blue with white text" (draft panel: `background:#FFFFFF;border:1px solid rgba(30,42,60,.1);border-radius:12px`; handoff README line 25 "radius 12, white"; only the feature cards are dark blue). "buttons turn gold with slate text" is true of the top-bar pills only; the header CTA and hero dark pill hover keep their fill (`style-hover="...background:#0A7EA8;color:#FFFFFF"`; `color:#E7D768`). "slate `#2C3E50` text" conflicts with the draft root ink `#1E2A3C`. Less precise than the handoff README on motion (no durations, thresholds or stagger maths). |
| Unique value | Copy-tone rules (useful if an agent writes or rewrites copy, e.g. Site Info or placeholder text) and a one-paragraph hover/motion summary. |
| Consumers | Walker: the hover summary is too lossy and partly wrong to serve as expected behaviour; the handoff README line 22-58 and the draft's `style-hover` attributes are the real answer key. Copywriting agents: tone rules. Hazard: the extractor's README reader would pick this file if `--draft` pointed at the root draft copy. |
| Verdict | **Useful (narrowly)** for tone and iconography rules; **noise** as a token or behaviour source (three contradictions). |

### SKILL.md

| Field | Finding |
|---|---|
| Contents | Frontmatter `name: indus-foods-design`, `user-invocable: true`; body: "Read the README.md file within this skill, and explore the other available files. If creating visual artifacts ... copy assets out and create static HTML files ... If working on production code, you can copy assets and read the rules here ..." |
| Machine-readable? | YAML frontmatter + prose instructions. |
| vs handoff README | No overlap. |
| Unique value | None for the cloning route: it is an agent-skill wrapper telling a design agent to read readme.md and produce HTML. It names no token, rule or component. |
| Consumers | A design agent using this folder as a skill. Not Claude Code building the WordPress site. |
| Verdict | **Noise** for cloning. |

---

## Token value comparison (design-system slice vs handoff README)

Draft column = occurrences in the draft (`grep -oF`, case-sensitive uppercase hex form).

| Token | Design system (file :: name) | Handoff README | Draft | Verdict |
|---|---|---|---|---|
| Brand blue | colors.css `--brand-blue:#0A7EA8` | `#0A7EA8` (l.69) | 90 | Same |
| Blue hover | `--brand-blue-hover:#075E80` | `#075E80` (l.69) | 5 | Same |
| Text on gold alt | absent | `#0A6E93` (l.69) | 4 | README only |
| Light blue | `--brand-blue-light:#2EADE2` | `#2EADE2` (l.69) | 11 | Same |
| Gold | `--brand-gold:#D8CA50` | `#D8CA50` (l.70) | 115 | Same |
| Gold light / mid / pale | `#E7D768` / `#E3D35F` / `#EBDD78`, named | same three hexes, unnamed (l.70) | 8 / 4 / 2 | Same values; slice adds names |
| Ink | `--ink:#1E2A3C` | `#1E2A3C` (l.71) | 41 | Same |
| Slate | `--slate:#2C3E50` | `#2C3E50` (l.71) | 53 | Same |
| Body grey | `--grey-body:#4A5563` | `#4A5563` (l.71) | 22 | Same |
| Muted | `--grey-muted:#68727C` | `#68727C` / `#5E6873` (l.71) | 2 / 4 | README has both; slice drops the more-used `#5E6873` |
| Surfaces | `#FFFFFF`, `#FAFAF8`, `#F2F5F7` | same (l.72) | 150 / 2 / 2 | Same |
| Tint on blue | `--tint-on-blue:#E3EFF4` | `#E3EFF4`, `#DCEBF1` (l.72) | 4 / 2 | README has both |
| Photo frame fill | absent | absent | `#EAF4F7` x6 | Neither |
| Social | LinkedIn `#0A66C2`, Facebook `#1877F2`, Google `#EA4335` | same (l.74) | 3 each | Same |
| WhatsApp | `--whatsapp-green:#25D366` | "green pill", no hex (l.33) | 1 | Slice only |
| Hero gradient | `--gradient-hero` 135deg EBDD78, E3D35F, D8CA50 | same (l.39, prose) | yes | Same; slice names it |
| Brand gradient | `--gradient-brand` 120deg E7D768 0%, 2EADE2 55%, 0A7EA8 100% | same (l.27, l.73) | yes | Same; README flags it unconfirmed (l.92) |
| Progress gradient | `--gradient-progress` 90deg D8CA50, 2EADE2 | same (l.23) | yes | Same |
| Why-choose gradient | absent | `#E3D35F to #D8CA50` (l.42) | yes | README only |
| Selection | `--selection-bg` gold, `--selection-fg` ink | same (l.75) | `<style>` | Same |
| Body text colour | `body{color:var(--text-body)}` = `#4A5563`; readme.md "slate `#2C3E50` text" | not stated as one value | root wrapper `#1E2A3C` | **Slice contradicts the draft (two different wrong answers)** |
| Fonts | Montserrat 500-800, Source Sans 3 400-700, Geist Mono 400-500 | same (l.77) | `<link>` adds Source Sans 3 italic 400 | Same; both miss the italic |
| Body size | `--fs-body:19px; --lh-body:1.55` | 19px/1.55 (l.77) | root 19px/1.55 | Same |
| H1 | `--fs-h1:clamp(36px,5vw,62px)` | same + line-height 1.08 (l.39) | | README more complete |
| H2 | `--fs-h2:clamp(28px,3.4vw,40px)` | same + /1.15, -0.01em (l.78) | `line-height:1.15;letter-spacing:-.01em` | README more complete |
| Card title / eyebrow / mono | 22, 13 + .14em, 12 + .14em | same (l.77-78) + eyebrow colour `#0A7EA8` | | Same; README adds colour |
| Nav size | `--fs-nav:17px` | 17px/600 (l.24) | | Same |
| Radius | tag 3, tile 12, card 22, panel 12, pill 999 | 3, 9-12, 16-22, 999 (l.79) | 3px x8, 10px x9, 12px x5, 16px x2, 18px x1, 22px x19, 28px | Slice picks single values; README ranges match the draft better |
| Shadow button | `0 8px 18px -8px rgba(0,0,0,.45)` | same (l.80) | x9, but CTAs use `rgba(10,126,168,.65)` and hero `.55` | Same; both miss the variants |
| Shadow card / panel | match | match (l.80) | 1 / 1 | Same |
| Shadow header | `--shadow-header` | same (l.24) | 1 | Same |
| Gap scale | 8-64 (8 steps) | same (l.81) | | Same |
| Gutter / section | 20/32/40, 64/88/108 | same (l.19) | | Same |
| Tight section / header height / max widths | absent | 40/52/64; 72/72/84; 1320, 1040-1120 (l.19) | | README only |
| Breakpoints | absent | <768, 768-1023, >=1024, 1200, 1260 (l.15-17) | | README only |
| Easing | `--ease-out:cubic-bezier(.16,.84,.32,1)` | same (l.25, l.57) | x16 | Same |
| Button easing | absent | absent | `cubic-bezier(.2,.8,.2,1)` x19 | Neither |
| Motion durations, stagger, thresholds | absent | full set (l.25, 31, 40, 44, 57-61) | | README only |

**Net**: zero value-level contradictions between `tokens/*.css` and the handoff README; the tokens add names and roles, the README adds coverage (more colours, line-heights, layout, breakpoints, all motion). Contradictions sit in `Button.jsx`, `Chip.jsx`, `core.card.html`, `typography.css`'s body colour and `readme.md`'s prose, each against the draft.

---

## Vocabulary gaps for the framework (what this design system has that SGS cannot hold today)

1. **No token-name to slug mapping.** Pass A's `BASELINE_SLUGS` (`palette.py`) match only exact names (`_NAME_ALIASES = {"border": "border-subtle"}`). Design-system names such as `brand-blue`, `brand-gold`, `slate`, `text-heading`, `surface-section-blue`, `border-accent` fall to raw-name slugs, so the dry run produced no `primary` and no `accent`. A data table in `palette_vocab.py` (`brand-*`/`*-primary` main brand to `primary`, its `-hover` to `primary-dark`, second brand hue to `accent`, `text-heading`/`ink` to `text`, `text-body`/`text-muted` to `text-muted`, `whatsapp-*` to `whatsapp`, `surface-white`/`surface-header` to `surface`, `surface-warm`/`surface-cool` to `surface-alt`) would make the slice's `tokens/` a direct Pass A input. Also needed: Pass A must read a sibling `tokens/*.css` or `styles.css` (it reads inline `<style>` only, `shared_utils.py::extract_css`).
2. **Gradients.** `theme/sgs-theme/theme.json` `settings.color.gradients` is `[]` and Spec 32 §14.2 lists no gradient slot the extractor fills; the snapshot keeps gradients but nothing extracts them (`colour.parse_colour` skips non-colours). This draft has four named gradients (hero, brand, progress, why-choose) plus the Instagram radial.
3. **Text tiers.** The draft uses ink `#1E2A3C` (root), slate `#2C3E50` (headings), body grey `#4A5563` (paragraphs), muted `#68727C`/`#5E6873`. Spec 32 §12.2 has `text` and `text-muted` and forbids `text-secondary`; a separate heading colour has no slot (heading colour lives in `styles.elements.heading`, which carries it, so this is covered by element styles rather than palette; flag only, not a gap to fill).
4. **Brand-hue tint ramp.** Gold has three tints (`gold-light`, `gold-mid`, `gold-pale`) and blue has a light and a tint-on-blue. SGS has one `accent-light` and no `primary-light`; the extras fall to raw-name slugs (allowed: "a client palette may legitimately be longer", §12.2).
5. **Social brand colours.** LinkedIn/Facebook/Google have no slot; `palette_vocab.SKIP_TABLE` keeps "google" literal. Consistent with the memory ruling that brand logos follow the brand; no gap to fill.
6. **Radius scale names.** SGS `settings.custom.borderRadius` is `small 4px, medium 8px, large 16px, pill 9999px`; this system's tag 3 / tile 12 / card 22 / pill 999 needs a client overlay (values, not new keys).
7. **Shadows.** Framework has 12 shadow presets (`whisper` ... `diffuse`); the four draft shadows are client values to overlay or add, not a missing mechanism. The CTA's brand-tinted shadow (`rgba(10,126,168,.65)`) relates to `settings.custom.shadowColour`.
8. **Button presets.** SGS `buttonPresets` has `primary`, `secondary`, `outline` (+ `default` hover). The design has four filled pills (blue, black/gold, gold/slate, white/blue) and one outlined-on-blue hero pill; the slice's variant names (`dark`, `gold`, `light`) have no preset slot. Hover behaviour differs by variant in the draft (top bar: to gold/slate; header CTA: weight 700 + scale; hero dark: text to `#E7D768`), which the preset `hover-*` roles can hold.
9. **Easings.** Framework `easing.ease-out` is `cubic-bezier(0.16, 1, 0.3, 1)`; the draft's are `(.16,.84,.32,1)` and `(.2,.8,.2,1)`. Overlay values; no new mechanism.
10. **Motion (Spec 38).** Present in SGS: magnetic pull (FR-38-30), 3D tilt (`hover-effects/attributes.js::sgsHoverTilt3D`), marquee, scroll-progress, stagger, path-draw, parallax, blur-in. **Not found**: a button "shine sweep on enter" (no `shine`/`sheen` match in `plugins/sgs-blocks/src` JS or CSS) and a press ripple as a button effect (Spec 38's `ripple` is a particle-trail preset, FR-38-32, not a click ripple). Both are named in the slice readme.md and in the handoff README line 59, so the gap is real regardless of this slice.
11. **Copy tone.** No framework surface holds "Title Case buttons and nav, second person, no emoji". Only relevant if an agent generates copy; the clone copies the draft's text.

## Bottom line per consumer

| Consumer | What the slice gives that the handoff folder does not |
|---|---|
| Theme extractor | `tokens/colors.css` (+ `spacing.css`, `typography.css`): the only declared `:root` tokens in the export, with role-bearing aliases. Needs (a) a sibling-token-file read and (b) a name-to-slug table to beat today's snapshot (accent and footer-bg still framework defaults). |
| Skeleton writer | Nothing reliable. Button/Chip specimens disagree with the draft; the variant list is a weak hint. |
| Fill | Nothing; Fill measures the draft, which is more accurate than every component file here. |
| Walker | Nothing beyond the handoff README; the slice's hover/motion prose is lossy and in places wrong. |
| Spec 32 / 38 | Confirms gradient and button-variant gaps; shine and click-ripple are motion gaps (also visible from the handoff README). |
| Bean (visual QC) | `guidelines/*.html` swatch cards for a quick eye check. |
