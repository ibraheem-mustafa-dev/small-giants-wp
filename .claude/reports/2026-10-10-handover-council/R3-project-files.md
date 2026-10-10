# R3: Indus Foods full-project export, everything outside the handoff folder and the design-system files

Export root: `C:\Users\Bean\Projects\small-giants-wp\.claude\Indus-Foods-Claude-Design-Files\` (shortened to `EXP\` below).
Handoff folder: `EXP\design_handoff_indus_foods_website\` (shortened to `HO\`).

**Method.** I listed every file with `find . -type f -printf '%TY-%Tm-%Td %TH:%TM %s %p'`, hashed each root file and its `HO\` namesake with `sha256sum`, and grepped each `.dc.html` for `<script src>`, `<dc-import>`, fonts, colours and `#/` routes. I opened every distinct image kind directly, and built labelled contact sheets of all 77 screenshots with Pillow (scratch: `scratchpad\council\r3img\sheet-*.jpg`). I also compared hashes with the repo's existing copy at `sites\indus-foods\`.

**Timestamps carry no evidence.** Every file has the mtime `2026-10-10 14:46` (the extraction time), and the original zip could not be found (`B:\`, `~\Downloads`). The only real dates come from the epoch IDs in the `uploads\` filenames, decoded with `date -u -d @<s>`.

**Outside this slice** (covered by the other reviewers): `HO\*`, `components\`, `guidelines\`, `tokens\`, `styles.css`, `SKILL.md`, `readme.md`. They are cited below only as evidence.

---

## 1. Root runtime and script files

| path | size | what it is | relation to handoff copy (sha256, first 16 chars) | referenced by | unique value | verdict |
|---|---|---|---|---|---|---|
| `EXP\support.js` | 66,404 | The Claude Design prototype runtime (`// GENERATED from dc-runtime/src/*.ts`). It loads React 18.3.1, react-dom and Babel standalone from unpkg.com. | **Identical**: `c60c49083997f51a` = `HO\support.js` | Every `.dc.html` (`<script src="./support.js">`) | None beyond `HO\` | **redundant**: byte-copy of `HO\support.js` |
| `EXP\image-slot.js` | 64,449 | `<image-slot>` user-fillable image placeholder ("omelette starter scaffold") | **Identical**: `d797f41b7d66c445` | v2, v1 and `Indus Foods Mega Menu.dc.html` | None | **redundant** |
| `EXP\indus-logo.js` | 4,373 | `<indus-logo>` custom element. It fetches `./assets/logo-{horizontal,square}-anim.svg`, re-IDs the SVG and animates it with WAAPI (Web Animations API) on enter and hover. | **Identical**: `266c7e488d8e161e` | v2 only (`<script src="./indus-logo.js">`; v1 has no reference) | None | **redundant** |
| `EXP\.thumbnail` | 28,562 | WebP image, 640x404: Claude Design's project card thumbnail. It shows the v2 **About** page (Montserrat hero "A family business feeding the UK since 1962.", mountain SVG, stats 1962 / 5,000+ / 6,000+ / 150+). | No `HO\` counterpart. The repo already holds an identical copy: `687a7b4aa14f6c2b` = `sites\indus-foods\.thumbnail` | Nothing | None. It is one 640px crop of a page that renders anyway. | **noise** |

## 2. Root `.dc.html` pages

| path | size | what it is | relation to handoff copy | referenced by | unique value | verdict |
|---|---|---|---|---|---|---|
| `EXP\Indus Foods Website v2.dc.html` | 223,543 (2,143 lines) | **The current full site.** Header with mega menu, every page's data, animations and hash routes (`#/about`, `#/brand-sanam`, `#/brand-shan`, `#/brand-green-leaf`, `#/brand-lemon-tree`, `#/post-…` and 17 more). Montserrat headings (57 uses) and Source Sans 3 body; contact `amir@indusfoodsltd.com`. | **Identical**: `dc3af6250eaa8510` = `HO\…v2.dc.html` | It is the entry point. `HO\README.md:97` ("the full site"), `EXP\readme.md:4,29` ("Source: … v2"), and `sites\indus-foods\CLAUDE.md:22` ("The home page (the entry)") all name it. | None beyond `HO\` | **redundant** (the `HO\` copy is the same bytes) |
| `EXP\EnquiryForm.dc.html` | 13,099 | The contact or enquiry form component (Montserrat + Source Sans 3, `$preview` 1100x900) | **Identical**: `d80b33c1580a89b6` | v2: `<dc-import name="EnquiryForm">` | None | **redundant** |
| `EXP\TradeApplication.dc.html` | 34,189 | The 5-step trade-account application form ("Have these ready", Business / Premises / Contact / Ordering / Review) | **Identical**: `55bf8a4178a8bb5b` | v2: `<dc-import name="TradeApplication">` | None | **redundant** |
| `EXP\Indus Foods Website.dc.html` | 139,692 (1,499 lines) | **The superseded v1 of the whole site.** Plus Jakarta Sans (no Montserrat, 0 hits) and `mailto:info@indusfoodsltd.com` where v2 uses amir@. It uses a static `<img src="./assets/logo-horizontal.svg">` (3 times) instead of `<indus-logo>`. It has no `dc-import` of the two forms, no `#/about`, no `#/brand-*` or `#/post-` routes, no "Back to top" and no "Website by" footer (0 hits each against 1 each in v2), and no "Six decades in five chapters" (0 against 1). | No `HO\` counterpart (`16d0b74140728633`). The repo copy `sites\indus-foods\` is identical. | Nothing references it. `sites\indus-foods\CLAUDE.md:23` calls it "the earlier home page, kept for reference". | **Negative, a hazard.** `sites\indus-foods\CLAUDE.md:30-32` records that v2 currently fails at runtime (React `removeChild`) while v1 "renders fully (336 stamps)". A pipeline or agent that picks whichever page renders would clone the **wrong typography, the wrong email and missing pages**. I did not re-run the runtime test (UNVERIFIED by R3). | **noise, remove** |
| `EXP\Indus Foods Mega Menu.dc.html` | 35,085 (486 lines) | A standalone **Indus-adapted mega-menu prototype**: Plus Jakarta Sans, a placeholder rotated-square "logo" plus the text "Indus Foods", and an `accent` colour prop defaulting to `#D8CA50` (options `#D8CA50`/`#0A7EA8`/`#075E80`). Its menu labels (Home, About > Our Story/Certifications/Community & Charity/Sustainability/Careers, Sectors > …) match v2's IA. | No `HO\` counterpart (`6a20f5f0d3b2116c`) | Nothing imports it (grep for `dc-import` across the export: v2 imports only EnquiryForm and TradeApplication) | None. v2 carries its own built-in mega menu, which `HO\README.md:25,28` specifies in full (timings, panels, Brands grid, Own Brands side block). This file is the pre-merge exploration. | **noise, remove** |
| `EXP\Mega Menu.dc.html` | 30,220 (435 lines) | **A generic, non-Indus mega-menu template.** It is branded "Halcyon", uses Bricolage Grotesque and Instrument Sans, defaults the accent to `#5b6ef5`, and has SaaS menu items ("Analytics Cloud", "Data Pipelines", "Model Registry", "SDKs & APIs") plus a `preset` enum Columns/Cards/Minimal. | No `HO\` counterpart (`f6a1bbeb15ca8434`) | Nothing references it. It imports `_feature` (`<dc-import name="_feature">` ×2). | **Negative.** Foreign fonts, colours and copy would pollute a theme extractor or a "which file is the header" guess. | **noise, remove** |
| `EXP\_feature.dc.html` | 2,682 (41 lines) | The feature card subcomponent of `Mega Menu.dc.html` (Bricolage Grotesque title, Geist Mono tag, pointer-follow radial highlight) | No `HO\` counterpart (`14a6e192e621042a`) | Only `Mega Menu.dc.html` (the Halcyon template), **not** v2 or any Indus page | None | **noise, remove** with its parent. `sites\indus-foods\CLAUDE.md:25` wrongly lists it as an "imported part" of the Indus pages. |

## 3. `EXP\assets\` (8 SVGs)

| path | size | what it is | relation to handoff copy | referenced by | unique value | verdict |
|---|---|---|---|---|---|---|
| `assets\logo-horizontal-anim.svg` | 52,648 | Static Indus horizontal logo SVG, viewBox `0 0 3741.59 847.97`, no `<animate>` or `@keyframes`. `indus-logo.js` adds the animation in script. | Identical to `HO\assets\` (`657e941c14adf091`) | `indus-logo.js` (`SRC.horizontal`), so v2 uses it | None | **redundant** |
| `assets\logo-horizontal.svg` | 52,648 | **Byte-identical to `logo-horizontal-anim.svg`** (same hash `657e941c14adf091`) | Identical to `HO\` | v1 only (`<img src="./assets/logo-horizontal.svg">`). `HO\README.md:84` and `EXP\readme.md:23` name it. | None. It is a duplicate under a second name. | **redundant** |
| `assets\logo-square-anim.svg` / `logo-square.svg` | 29,580 each | Square or stacked logo, viewBox `0 0 1998.57 1302.71`. The two files are **byte-identical** to each other (`bfd601cfa34eb53d`). | Identical to `HO\` | `indus-logo.js` (`SRC.square`, the `-anim` name). Nothing loads the plain name. | None | **redundant** |
| `assets\about-hero-{desktop,tablet,mobile}.svg` | 21,572 each | About-hero mountain artwork, one per breakpoint (viewBox 2100×1000 / 1400×1000 / 1000×1000). The three differ only in the root width and viewBox (`cmp` differs at char 65). | Identical to `HO\` (`fa7ad8…` / `536cef…` / `7bd1a8…`) | v2: `animSrc: 'assets/about-hero-' + (d?'desktop':t?'tablet':'mobile') + '.svg'` | None | **redundant** |
| `assets\whatsapp-ink.svg` | 8,309 | WhatsApp glyph, viewBox 24×24 | Identical to `HO\` (`1d98c1896e1bca40`) | v2 line 952 (`src="assets/whatsapp-ink.svg"`) | None (it is not in `uploads\`, but `HO\` has it) | **redundant** |

**No `assets\` file is missing from `HO\assets\`.** All 8 hashes match one for one. Nothing in `assets\` is orphaned from the export as a whole: v2 uses the `-anim` logos, the about-hero set and the WhatsApp glyph, and the two plain logo names are used only by v1 and the docs. v2 also has a comment referring to an `assets/food/` folder ("Add cut-out filenames here once they're uploaded"), and that folder does not exist in either copy. The food cut-outs are unfilled `image-slot`s in the current design, not missing files.

## 4. `EXP\uploads\` (11 files, 8.6 MB): the designer's inputs to Claude Design

| path | size | what it is | relation to handoff | referenced by | unique value | verdict |
|---|---|---|---|---|---|---|
| `uploads\IndusFoods_Animated_Logo_Horizontalsvg.svg` | 52,648 | The original upload of the horizontal logo | Identical to `HO\assets\logo-horizontal*.svg` (`657e941c14adf091`); renamed copy | Nothing (the pages use `assets\`) | None | **redundant** |
| `uploads\IndusFoods_Animated_Logo_Square (1).svg` | 29,580 | The original upload of the square logo | Identical to `HO\assets\logo-square*.svg` (`bfd601cfa34eb53d`) | Nothing | None | **redundant** |
| `uploads\Indus_Foods_Hero_Background_Animation_{Desktop,Tablet,Mobile}.svg` | 21,572 each | The original uploads of the about-hero artwork | Identical to `HO\assets\about-hero-*.svg` (same three hashes) | Nothing | None | **redundant** |
| `uploads\pasted-1784627911573-0.png` | 79,383 (1586×457) | A screenshot pasted 2026-07-21 09:58 UTC of the **previous Indus website's** Brands mega menu: real Sanam, The Lemon Tree, Green Leaf, Shan and Indus logos, then "logoipsum" placeholders, and an "Own Brands / View All Brands" side block | None in `HO\` | Nothing | Shows what the real brand logos look like, for the brand tiles that the draft leaves as empty `image-slot`s (`HO\README.md:12`: "brand logos are empty image-slot placeholders awaiting real artwork"). It is only a reference picture, not usable artwork. | **useful only as an asset-sourcing reference; not a cloning input** |
| `uploads\pasted-1784627921651-0.png` | 496,549 (1687×648) | Pasted 2026-07-21: the previous site's Sectors mega menu ("We serve" with four coloured cards: Food Service, Manufacturing, Retail, Wholesale) | None | Nothing | Design-brief context only. v2 redesigned this panel. | **noise for cloning** |
| `uploads\pasted-1784632063020-0.png` | 30,096 (424×729) | Pasted 2026-07-21 11:07 UTC: the previous site's mobile drawer (blue, "Become A Trade Customer", accordions, social icons) | None | Nothing | Brief context only | **noise for cloning** |
| `uploads\screens-1790192367783-q3gg.html` | 443,021 (547 lines) | A browser "Save page as" capture (2026-09-23 19:39 UTC; `<!-- saved from url=(0053)https://lightsalmon-tarsier-683012.hostingersite.com/ -->`) of the **previous Indus Foods WordPress site** (Astra theme, local Montserrat and Source Sans Pro). It references 21 `wp-content/uploads/2025/…` images, including `Sanam-Logo.jpg`, `Shan-Foods.jpg`, `Green-Leaf-Logo.jpg`, `Lemontree-Logo.jpg`, `Indus-Foods-Ltd-Square-Logo.webp`, `logo-01..07-150x136-1.webp` (accreditation and partner logos) and the favicon. | None | Nothing | **The only pointer in the export to real brand and accreditation artwork.** A `curl` on 2026-10-10 returned `200 image/jpeg 24193` for `…/2025/11/Sanam-Logo.jpg` and `200 image/webp 792` for `…/logo-01-150x136-1.webp`, so the files can still be fetched today. However, that host is now `mamas-test`: a fresh WordPress for a different client since 2026-10-10 (`.claude/dev-setup.md`, mamas-test row). The URLs can disappear at any time. | **useful once, for content and asset harvesting: download the real logos now, then drop the file.** It is not a draft. |
| `uploads\screens-1790192445111-b029.jpg` | 2,920,577 (1920×4069) | A full-page desktop screenshot of the same previous site (2026-09-23 19:40): hero "Leading Indian Food & Drinks Wholesaler", a brands strip with Shan and logoipsum, services, and "Why Choose" with Astra's "Click here to change this text" filler | None | Nothing | Brief context only. It shows the **old** site, not the draft. | **noise for cloning** |
| `uploads\screens-1790192695232-ytqf.png` | 4,817,876 (1080×14870) | A full-page mobile screenshot of the same previous site (2026-09-23 19:44) | None | Nothing | Brief context only | **noise for cloning** |

**Provenance of `uploads\`.** The 2026-07-21 pastes and the 2026-09-23 captures are older inputs that Bean gave Claude Design to brief the redesign. None of them is the redesign.

## 5. `EXP\screenshots\` (77 JPEGs, 2.1 MB)

Every file is **909×540**, except `resp1.jpg`, which is 909×525. The naming follows `NN-<run>.jpg`, where `NN` (01–06) is the capture number within a run. These are fixed-size viewport grabs, the shape of Claude Design's own in-chat verification screenshots (inferred from the uniform 909px frame and the names `probe` and `resp1`; the tool itself is UNVERIFIED).

| group (files) | what it shows (verified on contact sheets and full-size opens) | breakpoint (verified) | of the current draft? | verdict |
|---|---|---|---|---|
| `0N-m1…m4`, `05-m3`, `06-m3` (18) | Apply-for-trade-account hero, TradeApplication steps, EnquiryForm, contact cards, opening hours, About cards, story timeline | **Mobile:** an approximately 375px iframe with its own scrollbar, inside the 909px frame. `01-m1` opened full size shows content to x≈375 and white beyond. `02-m1`, `03-m1` and `04-m1` are almost blank (mid-load). | v2 lineage: Montserrat, amir@, "Have these ready" exists only in `TradeApplication.dc.html` | **noise** |
| `0N-t1`, `0N-t2` (12) | Trade form step 1, "Why Choose", contact and map, story chapters, sector cards, "How to open a trade account" | **Mixed:** some fill the full 909px (`01-t1`, `02-t1`), others are about 390px (`05-t2` opened full size), and `05-t1` is blank. "t" is therefore **not** a reliable tablet marker. | v2 lineage ("How to open a trade account": v1=0, v2=1) | **noise** |
| `0N-inner`, `inner2`, `inner3` (11) | Our Story, Apply and Sanam inner pages in three styling passes. `inner` has a pale-blue hero with mono eyebrows; `inner2` and `inner3` have the gold hero. Timeline variants: dated list, then card stack. | 909px (hamburger header, so the tablet layout) | **Iterations.** Only one styling is current, and the screenshot does not say which. | **noise** |
| `0N-v2-home`, `v2b`, `v3`, `v3b`, `v3c`, `v4`, `v4b`, `v5`, `v6`, `v6b` (34) | Successive revisions of the home page and the apply page. `01-v3` shows text-link CTAs and the placeholder "This photo needs attribution". That string has **0 hits in both v1 and v2**, so this state no longer exists. `01-v4` shows a broken logo (sun only). The `v2`/`v3` series show empty "Cut-out: ras malai / browse files" slots. | 909px only | **Mostly superseded states.** The v-numbers are Claude Design iteration rounds, **not** the `v2.dc.html` filename. | **noise** |
| `probe.jpg` | Home hero at 909px (the current-looking hero with trust chips) | 909px | Plausibly current | **noise** (the live draft renders it anyway) |
| `resp1.jpg` | Solid grey: a failed capture | — | — | **noise** |

**Can they serve cloning?**
- **Desktop evidence:** no. Nothing is at 1440 (the parity walker's desktop width); the widest frame is 909px.
- **Breakpoint evidence:** weak. The "mobile" grabs are a roughly 375px iframe, but the mobile, tablet and desktop CSS live in v2 and can be measured directly at 375/768/1440.
- **Missing-page evidence:** none. Every page shown exists as a route in v2.
- **QA reference:** harmful. Several frames show states that were later removed (attribution placeholders, broken logo, text-link CTAs, three inner-page stylings), so they would contradict the ground truth that R-31-11 says to compare against.

They are design-iteration leftovers.

---

## Current vs superseded pages

| page | status | evidence |
|---|---|---|
| `Indus Foods Website v2.dc.html` | **Current, the entry point** | Named as the source by `HO\README.md:97`, `EXP\readme.md:4,29` and `sites\indus-foods\CLAUDE.md:22`. It is the only page that `dc-import`s the two forms and loads `indus-logo.js`. Its typography (Montserrat/Source Sans 3) matches the forms and the design-system readme (`readme.md:11`). It has more routes (`#/about`, 4 brand pages, posts). Every screenshot shows v2-lineage content (Montserrat, amir@). Byte-identical to the `HO\` copy. |
| `EnquiryForm.dc.html`, `TradeApplication.dc.html` | **Current, imported parts** | `<dc-import>` in v2; byte-identical to `HO\` |
| `Indus Foods Website.dc.html` | **Superseded v1** | Plus Jakarta Sans, info@ email, static logo img, no forms or about/brand/post routes. Not in `HO\`; referenced by nothing. |
| `Indus Foods Mega Menu.dc.html` | **Superseded exploration** | A standalone Indus mega menu with a placeholder logo, folded into v2's header (`HO\README.md:25-28` specifies the v2 mega menu). Not imported anywhere. |
| `Mega Menu.dc.html` + `_feature.dc.html` | **Unrelated starter template** ("Halcyon") | SaaS copy and foreign fonts and accent; nothing Indus imports them |

**Doc defect found (read-only, not fixed).** `sites\indus-foods\CLAUDE.md:24-25` describes both mega-menu files as "the mega menu panels" and `_feature.dc.html` as an "imported part". The evidence above shows they are a superseded exploration and an unrelated template. The brief's "known draft defect" (v2 fails at runtime, v1 renders) makes v1 the obvious wrong fallback. The table should say v1 and the mega-menu files must never be measured.

---

## Full-zip verdict

**Should Bean ever export the full project zip in addition to the handoff? No, not as a cloning input.**

1. **Everything the clone needs is already in the handoff, byte for byte.** That covers the current page, both form imports, all three runtime scripts and all eight SVG assets: 14 of 14 hashes match. The full zip adds no page, asset or script that the current design uses.
2. **What the zip adds is noise or a hazard.**
   - A superseded full-site v1 that renders when v2 does not.
   - Two mega-menu prototypes, one belonging to another brand's template, plus its subcomponent.
   - 77 iteration screenshots, none at desktop width and several showing states that were later removed.
   - Five duplicate SVGs in `uploads\`, plus two same-bytes duplicate logo names in `assets\`.
   - Screenshots and a saved page of the **old** live site.
   - A thumbnail.
3. **The one item of genuine value** is the asset-sourcing pointer in `uploads\screens-1790192367783-q3gg.html`: the URLs of the real Sanam, Shan, Green Leaf and Lemon Tree logos, the accreditation logos and the square logo, which the draft leaves as placeholders. `pasted-1784627911573-0.png` shows the same logos. This belongs to content and asset harvesting, not to the draft. Download those files into `sites\indus-foods\` (for example `assets\brands\`) while the old host still serves them; it now runs `mamas-test`. After that, drop the capture.

**If a full zip is ever exported anyway, remove all of the following before handing the folder to Claude Code** so that it matches the handoff:
- `Indus Foods Website.dc.html`, `Indus Foods Mega Menu.dc.html`, `Mega Menu.dc.html`, `_feature.dc.html`
- `screenshots\` (the whole folder)
- `uploads\` (the whole folder), after harvesting the real logo URLs from the saved HTML as above
- `.thumbnail`
- The root duplicates of `support.js`, `image-slot.js`, `indus-logo.js`, `EnquiryForm.dc.html`, `TradeApplication.dc.html`, `Indus Foods Website v2.dc.html` and `assets\`. Keep only the `HO\` copies, so there is one copy of each file.
- The design-system files (`components\`, `guidelines\`, `tokens\`, `styles.css`, `SKILL.md`, `readme.md`) are for the other reviewers to judge.

**Note on the repo.** The repo's `sites\indus-foods\` already contains every one of the four noise pages and all of `uploads\`, verified by matching hashes. The same cleanup applies there, and that brief's file table needs the correction described above.
