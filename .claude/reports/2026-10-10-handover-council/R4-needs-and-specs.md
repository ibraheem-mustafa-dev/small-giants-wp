# R4: what cloning needs from a draft, Spec 32's split, and the vocabulary a handover maps into

Reviewer R4, 2026-10-10. Read-only on the repo. Every claim cites a file::symbol, a spec section or a command; anything not
checked is marked UNVERIFIED. Companion data files in this folder: `r4-cites-byfile.txt` (every file outside Spec 32 that
cites it, with the IDs it cites) and `r4-cites-raw.txt` (the raw `git grep` lines).

## Headline findings (proven in this review)

1. **The extractor reads nothing from the Indus handoff README.** `declared_sources.py::read_readme_tokens` run on
   `design_handoff_indus_foods_website/` returns `found: true, colours: [], fonts: [], layout: {}`; the same on the
   design-system `readme.md`. Cause: colours are parsed only from Markdown **tables** (`_parse_tables`), fonts only from
   bullets shaped `label: **Family**` (`_FONT_BULLET_RE`), layout only from bullets (`_parse_bullets`). The handoff README
   writes colours and type as prose bullets ("Brand blue `#0A7EA8` (hover …)", "Headings: Montserrat 500/600/700/800").
   Command: `python -I -c "import sys;sys.path.insert(0,'plugins/sgs-blocks/scripts/theme-extractor');import declared_sources as d;print(d.read_readme_tokens('<folder>'))"`.
2. **The design-system `tokens/*.css` is never read by the extractor.** `extract.py::main` calls
   `shared_utils.py::extract_css`, which concatenates inline `<style>` blocks only ("SGS drafts are single-file inline
   CSS"). `styles.css` and `tokens/colors.css` are linked/imported files; the v2 draft has 1 `<style>` and 0 `:root`
   (grep counts in this review). So Pass A finds nothing and Pass B's advisory guess is what lands.
3. **The current Indus snapshot shows exactly that.** `sites/indus-foods/theme-snapshot.json`: `primary #0a7ea8` and
   `surface #ffffff` are `_source: derived, advisory: true`; every other slug is the framework default (accent
   `#F59E0B`, not gold `#D8CA50`; text `#1A202C`, not ink/slate). `push-theme-snapshot.py::apply_advisory_policy`
   strips advisory entries (Spec 32 FR-33-5), so the live site would paint the framework palette, as Mama's did
   (plan stage 5, "Advisory snapshot").
4. **Nothing in the route reads the README's Breakpoints, State, Animations, Screens, Assets or contact sections.** The
   only README reader in the repo is the extractor's (`git grep -l read_readme` hits only `theme-extractor/`,
   `shared_utils.py` and the spec; under `scripts/computed-route` and `scripts/parity` the only "readme" hits are
   `lint.mjs` and its tests, which check the route's own `README.md` for R-47-1). Spec 47 §2 names the README's
   contents but no Spec 47 tool consumes them.
5. **Six of nine `sites/*/theme-snapshot.json` files carry no `_sgsExtractor` block** (helping-doctors, mamas-munches,
   sgs-construction, sgs-healthcare, sgs-mosque, sgs-professional), so the snapshot format (Spec 32 Part C) serves
   hand-built and starter clients, not only cloned ones. It must stay outside the cloning spec.

---

# PART 1. What the cloning process needs from a draft today

Tools: skeleton writer `scripts/computed-route/skeleton.mjs` (+ `lib/skeleton-*.mjs`), Fill `fill.mjs` (+ `lib/fill-*.mjs`),
draft server `lib/draft.mjs::serveDraft`, draft reader `lib/fill-read.mjs`, walker `scripts/parity/draft-live-walk.mjs`,
generated walker config `lib/fill-config.mjs::baseConfigText`, theme extractor `plugins/sgs-blocks/scripts/theme-extractor/extract.py`,
Site Info `plugins/sgs-blocks/scripts/sync-business-info.py` and `provision-site-info-from-draft.py`.

| # | Need | Tool / step that reads it | Where it comes from today | Layout assumption | Known failure or gap |
|---|---|---|---|---|---|
| 1 | The draft itself, rendered | `fill.mjs` (`--draft-url` or `--draft-dir` + `--draft-index`); `lib/draft.mjs::serveDraft`; `fill.mjs --serve` | Hand flags; `.claude/dev-setup.md` "Client drafts" table names folder + entry per client | A folder of `.dc.html` pages with relative assets; one **entry file** named by flag (`serveDraft`'s `index` option for a folder with no `index.html`) | A Claude Design draft loads React/Babel from unpkg.com (`support.js`), so Fill needs `--allow-external` or reads 0 targets (plan stage 5, "Draft runtime"; `fill-read.mjs::requestAllowed`). The served port changes every run (`fill-config.mjs::baseConfigText` comment), so `surfaces.json` `draftUrl` goes stale (Mama's holds `http://127.0.0.1:52502/SiteFooter.dc.html`). Indus v2 throws a React `removeChild` error at runtime (`sites/indus-foods/CLAUDE.md`, "Known draft defect"). |
| 2 | Which surfaces exist, and each one's WordPress target | Every route tool via `sites/<client>/build/surfaces.json` (Spec 47 §2; `skeleton.mjs::skeletonPaths`) | **Hand-written** manifest: `tree`, `envFile`, `envKey`, `site`, `target` (`postId` / `templatePart` / `template`), `canvas`, `walker`, `walkerFull`, `draftUrl`, `states`, `provides` | One entry per surface; a surface = one page, header, footer, drawer, modal or CPT post | Targets are created by hand; Spec 47 §7 Deferred "Creating a client's targets". R-47-11 refuses any target not listed. Header/footer active pointers are set by hand (Mama's footer post 19 made active by `sgs_active_footer_cpt_id`, plan stage 5). |
| 3 | The surface's root element on the draft page | `skeleton.mjs inventory --root <selector>` (`lib/skeleton-inventory.mjs::collect`) | Hand flag per surface | The surface is one DOM subtree of one served page | A hash-routed single-file draft (Indus: routes `#/about` … all in `Indus Foods Website v2.dc.html`, README "Screens / Views") needs a URL per route; that hash URLs land on the right screen at load is UNVERIFIED. Extractor side: Spec 32 FR-33-19 Known limit, only the on-load screen is measured. |
| 4 | Element identity (which draft element each block copies) | `lib/skeleton-inventory.mjs` (page bridges `window.__dcAnnotatedTemplate`, `__dcRootName`; `data-dc-tpl`, `sc-for`, `dc-import` membership); `scripts/parity/lib/collect.mjs::resolveFinder` (`tpl` finder); `check-refs.mjs` | The Claude Design runtime stamps at render time (R-47-4) | **Requires the Claude Design runtime** (`support.js`). Keys are `<importPath>/<n>#<copy>` (Spec 47 §3.4) | A non-Claude-Design draft has no stamps; its skeleton needs hand finders (Spec 47 §3.4 last paragraph). R2: a link-list node's `draftRef` is its first link, so Fill misses the list's own gap/width. The 2026-10-09 footer skeleton's raw `data-dc-tpl` selectors are stale (plan R3, "Open"). |
| 5 | Which block each element becomes | `lib/skeleton-propose.mjs` from DB tables (`html_tag_to_core_block`, `block_composition`, `block_capabilities`, `block_attributes`) + `scripts/computed-route/data/skeleton-decisions.json` + `sites/<client>/build/skeleton/decisions.json`; finaliser prompt `scripts/computed-route/prompts/skeleton-finaliser.md`; Bean review table (`<surface>.review.html`) | DB + saved decisions; low-confidence picks by an AI finaliser and Bean | Generic; rules for column labels, link lists, typed brand names, brief-only lines, Site Info patterns | Finaliser never run as a subagent (plan R2 "Not built"). No marquee rule (marquee becomes `sgs/text`); a pill CTA proposed as a container holding its arrow; nav proposed as three buttons not `sgs/nav-bar-menu`; trust bar, rating badge and cart get no node (Spec 47 §5 Residual; plan R2/R4). No form rule: `skeleton-propose.mjs` has no `input`/`form` handling (grep in this review). |
| 6 | The site name (to recognise a typed wordmark) | `skeleton-propose.mjs` (`facts.siteName`) | `sites/<client>/build/skeleton/decisions.json` `siteName`, set by `skeleton.mjs decide --site-name` (hand) | None | Not read from Site Info or the README (plan R2 "Not built"). |
| 7 | Computed styles of every mapped element | `lib/fill-read.mjs::readDraft` through the walker's collectors | Rendered draft in Playwright | None beyond a renderable page | `READ_WIDTHS` 375/768/1440; fluid samples 375/768/1024/1440/1920; sweep 320 to 1920 every 16px (Spec 47 §3.4 "Values that need care"). No calibration `forms` list contains `clamp`, so fluid sizes are written per tier (Spec 47 §5 Residual, Fill's UNMAPPED). |
| 8 | Breakpoints | Fill's sweep logs each step width with the nearest SGS boundary (768, 1024) for `divergences.json` (Spec 47 §3.4) | Measured | Device tiers fixed at 768/1024 (Spec 32 FR-32-13; `.claude/rules/cloning-pipeline.md`) | The README's declared breakpoints are not read. A sub-tier rule (Indus: CTA at >= 1260, nav padding change at 1200) belongs in `sgsCustomCss` (FR-32-13); no tool writes it (UNVERIFIED that any route code emits `sgsCustomCss`). |
| 9 | States to walk (hover, open menus, tabs, filters, submitted forms) | Walker config `states` (actions such as `h.clickText`, `region`); `surfaces.json` `states` (walker state to setting state) and `walkStates` | **Hand-authored** per surface (Eye Care `qa/parity/*.mjs`); Fill's generated config has one `opening` state only (`fill-config.mjs::baseConfigText`) | A single-page draft is navigated by clicking text (`draft.open` in the generated config) | README `## State` (Indus: `page`, `active`, `mobileOpen`, `acc`, `faqOpen`, `sent`, `blogCat`, `tIdx`) is not read. 323 rows sat in unmapped states before C0.7 (plan); 7 rows carry conflicts the state map cannot express (`scripts/parity/flows/state-map-reasons.json`). Line samples follow click/tap/hover only, not scroll (Spec 47 §3.6 item 5). |
| 10 | Animations and motion | Fill entrance step (`lib/fill-entrance.mjs::sampleEntrances`, `entranceWrites`) writes duration, delay, distance to `sgs-fx` settings; walker motion-timing rows and `devtools.mjs::settleAnimations` (Spec 47 §3.6 items 10, 12) | Measured from the rendered draft | Entrance = an element that moves at load | Motion-library and WebGL detection not built (Spec 47 §3.6 item 18). No surface reads `data-sgs-fx-*` from a draft (Spec 38 §11.3). README "Animations & Behaviour" is not read, so scroll-driven, pointer, marquee and SVG-sequence effects are invisible unless a state triggers them. Scroll-driven header shrink is not sampled (§3.6 item 5). |
| 11 | Content and copy | Skeleton carries the words in each block's content settings; Fill sets presence/visibility from calibration (Spec 47 §3.4 "Presence and content") | Rendered draft text | Text present in the DOM of the walked screen | Brief-only lines removed by `skeleton-decisions.json::briefOnlyLines`. Copy for screens not walked (Indus `pages` getter, README "Screens / Views") never reaches a tree. Content "beyond what the draft shows" is out of scope (Spec 47 §2). |
| 12 | Images and media | Nothing in the route; Spec 47 §2 "asset upload (existing asset steps handle it)" | Per-client scripts only: `sites/eye-care-ward-end/build/upload_sizing_diagrams.py`, `apply_brand_logos.py`, `apply_site_icon.py` (SSH or REST) | Eye Care's scripts read its own `assets/` and its draft's `LOGOS` map | No generic media upload (git grep `wp media import`/`wp/v2/media` hits only Eye Care files). Eager load before the resting read not built, so lazy images can read absent (Spec 47 §3.6 item 15). Indus photos are Unsplash placeholders and logos are empty `image-slot` placeholders (handoff README "Assets"). |
| 13 | Logo | `skeleton-propose.mjs` (`logoImage` pattern in `skeleton-decisions.json`; typed brand name rule) makes `sgs/responsive-logo` with a handover "choose the site logo in the editor" (`skeleton-propose.mjs::logoHandover`) | Hand step in the editor | Logo is an `<img>` whose name/alt/class says logo, or typed text equal to `siteName` | Indus renders logos through a custom element `<indus-logo>` (`indus-logo.js`); whether the inventory sees it as an image is UNVERIFIED. Mama's had no logo on the fresh site (plan stage 5). |
| 14 | Business info (phone, email, address, hours, socials, copyright) | (a) `sync-business-info.py` (Spec 32 FR-33-14): one draft HTML, script data object > labelled text > literal links, push to `POST /wp-json/sgs/v1/site-info`. (b) `provision-site-info-from-draft.py` (FR-47-9): reads Fill's `handover.json` `site-info` rows. (c) Skeleton `siteInfoPatterns` (copyright, hours, UK postcode, attribution) route lines to Site Info blocks | Draft HTML / handover files; push by hand | (a) reads one HTML file and `<script type="text/x-dc">` data objects (`placeholder_map.py`) | Spec 47 §7 Deferred "First real Site Info fill": run only on test data. Mama's footer rendered empty contact rows (plan stage 5). README contact block (Indus "Contact details", opening hours) is not read. `wa.me` (Indus WhatsApp link) is not recognised as a brand address (Spec 47 §3.9, §7). Indus social links point to `#/` (README "Open items"), which Tier 1 skips. |
| 15 | Social row | Skeleton `sgs/social-icons` with `siteInfoRow`, `childRefs` (`lib/fill-skeleton.mjs::expandSiteInfoRows`; registry `plugins/sgs-blocks/includes/data/brand-registry.json`) | Skeleton author marks the row | Each icon is a link with a recognisable host | Bluesky/Threads wait for Site Info keys (Spec 47 §7). |
| 16 | Product data (WooCommerce) | Nothing generic. Eye Care: `sites/eye-care-ward-end/woo-seed/extract_data.py` parses the draft's `PRODUCTS`, `BRANDS`, `COLS` … JS literals; `seed.php` creates products over `wp eval-file` | Per-client script parsing the draft's script data | Assumes named JS arrays in a `data-dc-script` class body | Out of Spec 47 scope (§2 "products"). Framework fixture `plugins/sgs-blocks/scripts/seed-48-sku-fixture*.php` is a test fixture, not a seeder from drafts. |
| 17 | Forms | `sgs/form` + `form-field-*` blocks; a linked form is its own surface (`provides: "sgs/form:contact"`, `lib/references.mjs`, Spec 47 §2) | Hand surface entry; functional flows hand-written per client (`scripts/parity/flows/`, FR-47-7, Eye Care only) | The form lives in its own post | Skeleton writer has no form rule (row 5). Indus forms are `dc-import` components (`TradeApplication`, `EnquiryForm`) with a client-side thank-you state and no backend (README "Forms"); submission must go through `Sgs_Mailer` (root CLAUDE.md). |
| 18 | Navigation menus | `sgs/nav-bar-menu`, `sgs/nav-drawer-menu` render a native WP menu (Spec 36 FR-36-1, `class-sgs-nav-menu-source.php::get_menu_blocks`) | **Nothing creates the menu**: git grep for `wp menu create`/`wp_create_nav_menu` finds no tool | Menu items = WP classic menu or `wp_navigation` | Skeleton proposes nav as buttons (row 5). Mega panels are `sgs_mega_menu` CPT posts and canvas surfaces (Spec 47 §3.8), each needing a hand-made target and a menu-item attachment (FR-36-5). |
| 19 | Header / footer / drawer structure | Skeleton root rule picks `sgs/site-header` / `sgs/site-footer` from `block_composition` section roots (plan R2) | Rendered draft | Three named rows each (Spec 37 §3.1/§3.2) | A footer row built outside the starters must write `layout` itself (Spec 37 §3.3); Fill carries no grid column count (`grid-template-columns` no-setting) and no two-child flex row (Spec 47 §5 Residual). |
| 20 | Fonts | Extractor: base families (FR-33-3), every loaded-and-rendered family (FR-33-18, `font-usage.js`), self-host (FR-33-17, `extract.py::_self_host_google_font`). Route: `lib/normalise.mjs::snapFontFamily` (R-47-7) | Draft `<link>` to Google Fonts or `@font-face`; README font bullets | README fonts parsed only as `label: **Family**` bullets | A font loaded by `@import` inside an external stylesheet (`tokens/typography.css`) is not seen by Pass A (inline `<style>` only; finding 2). Walker loaded-font check not built (Spec 47 §3.6 item 17). Fill without `--allow-external` blocks web fonts (`fill-read.mjs::requestAllowed` comment). |
| 21 | Tokens: palette, type scale, spacing, radius, shadow, buttons, layout widths | `extract.py` → `sites/<client>/theme-snapshot.json` → `push-theme-snapshot.py`; route snaps to it (`lib/normalise.mjs::loadSnapshot`, R-47-7) | `extract.py --client --draft <one file>`; README beside that file; `--merge-onto` | One draft file; design declared in inline `<style>` `:root` (Pass A) or a README colour **table** (FR-33-15) | Findings 1-3. A design doc not named `README.md` is never read; a slug-named colour row ("primary #EE8088") is not a recognised role (plan stage 5). No freshness gate in the route (FR-33-12 Status). Primary comes from the measured most-used button, which picked Mama's cream (plan stage 5). |
| 22 | Intended divergences and the fix register | `divergences.json`, `qa/ledger.config.json` (Spec 47 §3.5) | Hand / `ledger.mjs accept` | None | Ledger cannot scope to one element path (Spec 47 §5 Residual). |
| 23 | Block calibration (default paint per block) | `calibrate.mjs` per site (`calibration-targets.json`) | Run per site before Fill | None | Not a draft input, but Fill on a new client's site needs it; full runs exhaust 4 GB heap (`SGS_CAL_CHUNK`, Spec 47 §5 Residual). |
| 24 | Live site URL and credentials | `fill.mjs --live-url`; `surfaces.json` `envFile`/`envKey` | Hand flags; `.claude/secrets/<site>.env` | One WordPress test site per client (dev-setup) | A reset site serves a stale host cache until `hosting_cache_clear-website` (plan stage 5). |
| 25 | Dark mode | `_sgsDark` opt-in in the snapshot (FR-33-20) | Hand | None | Not drawn from the draft. |

**What a handover folder would need to carry to close these, in plain terms:** a machine-readable token file the
extractor can parse (or a README in the table form it parses), the surface list with each surface's URL/route and
root selector, the states with how to reach them, breakpoints including sub-tier rules, the motion list with triggers,
business details as data, menu structure, asset inventory with which images are placeholders, and form field lists.

---

# PART 2. Classification of every section of Spec 32

Classes: **FRAMEWORK** (the styling contract every block follows), **CLONING-ONLY** (exists to get a draft's design
into the framework), **FORMAT** (the snapshot format and its deployment, used by hand-built clients too: finding 5),
**FAT** (dated status, history, answered questions, point-in-time measurements; `.claude/CLAUDE.md` and root
`CLAUDE.md` "Docs state current truth only").

| Section | Class | One-line reason | FR IDs held |
|---|---|---|---|
| Front matter, title, one-liner, sibling note (lines 1-30) | FRAMEWORK (needs edit) | `absorbs: [26, 33]` and the one-liner tie the spec to the extractor; rewrite on the split | none |
| Migration-method banner (line 25) | FAT | Process rule repeated from root `CLAUDE.md` "Build the detector first" | none |
| Document map | FRAMEWORK (rewrite) | Parts B-D change owner | none |
| §0a Status | FAT | Points at §8's dated live measurements; gates are the status | none |
| §0 Problem statement | FRAMEWORK | No-inline and shared-contract rationale; first sentence frames SGS as pipeline-driven (keep neutral) | none |
| §1 Who this is for | FRAMEWORK | Row "The cloning pipeline" is a consumer row; keep as a pointer | none |
| §2 Goals and non-goals | FRAMEWORK | Goal 4 ("pipeline populates tokens") becomes a cross-reference | none |
| §3 Hard constraints | FRAMEWORK, one row CLONING-ONLY | Last row ("Pipeline extracts tokens from the draft; never asking Bean for values") is a cloning rule | none |
| §4 Component Contract | FRAMEWORK | BEM classes, token consumption, stylesheet states, canonical hover emitter | FR-32-1, FR-32-2, FR-32-3 |
| §4 Override Strategy | FRAMEWORK | Scoped per-instance values, per-item positional rules | FR-32-4, FR-32-4a |
| §4 Design Token Specification | FORMAT | Where `{component}Presets` live and their framework fallback; applies to every client | FR-32-5, FR-32-6 |
| §4 Pipeline Contract | CLONING-ONLY (FR-32-7); split (FR-32-8) | FR-32-7 is the extractor's job; FR-32-8's first half (a block renders its variant class, no inline) is FRAMEWORK, second half (route sets the class; naked link stays naked) is cloning. Both "Done when" lines assume SGS-BEM drafts (`.sgs-button--primary` in the draft), not Claude Design drafts | FR-32-7, FR-32-8 |
| §4 Naming Convention | FORMAT | Role vocabulary of `{component}Presets` | FR-32-9 |
| §4 CSS Output Consolidation | FRAMEWORK | Collector and output modes | FR-32-11 |
| §4 Residual CSS channel | FRAMEWORK | `sgsCustomCss` bound/fold/specificity rules; "whoever authors the residual (editor user or cloning route) applies the bound" is a cross-reference | FR-32-13 |
| §5 Non-functional (performance, editor parity, viewport gotcha, security, accessibility) | FRAMEWORK | Binding on every block | none |
| §6 Architecture (flow + key decisions) | FRAMEWORK, top of diagram CLONING | The diagram starts at "draft .sgs-button--primary … (FR-32-7 extractor)"; the block half is framework | none |
| §6.1 intro (mega-panel note, no-inline rules, box-family, box-flat audit, grid-item box controls, colour alpha) | FRAMEWORK; mega-panel blockquote FAT | The mega-panel note is a one-block migration remark | none |
| §6.1(a) named-object shape | FRAMEWORK | Storage shape | none |
| §6.1(a1) shared shorthand builders | FRAMEWORK | Cited by Spec 47 §5 Bean rulings | none |
| §6.1(a2) length sanitisation | FRAMEWORK | Helper contract | none |
| §6.1(b) base serialises scoped | FRAMEWORK | Most-cited Part A section (`r4-cites-byfile.txt`) | none |
| §6.1(c) family roster | FRAMEWORK | DB-authoritative family membership | none |
| §6.1(d) | split: CLONING-ONLY (extraction half) + FRAMEWORK (consumption half) | "The cloning route … extracts per-side box CSS into the named-object shape" is Spec 47 `lib/resolve.mjs` behaviour; BoxControl consumption is framework | FR-32-10 |
| §6.1(e) per-instance override channel | FRAMEWORK | | none |
| §6.1(f) border defaults | FRAMEWORK | Bean ruling 2026-10-05, current rule | none |
| §6.2 CSS output consolidation (a)-(d) | FRAMEWORK; "Status: BUILT" line and (d) canary measurement FAT | (d) is a point-in-time output check | FR-32-11 (detail) |
| §6.3 Grid-item defaults cascade | FRAMEWORK | | FR-32-12 |
| §7 Data model | FORMAT | `buttonPresets` JSON shape; also used by hand-built snapshots | none |
| §8 Acceptance criteria | FAT | Dated live measurements on canary page 2502; belongs in a report | (verifies FR-32-1/2/3/5/6/8) |
| §10 Button styling model | FRAMEWORK, with FAT clauses | D283, D270/D271/D293 history and "Bean-approved" notes are history | none |
| §11 Design questions answered | FAT | Answered questions; fold the three answers into §10/§4 as current rules | none |
| §11b Enforcement surface | FRAMEWORK | Gate roster (could move to `.claude/catalogues/`) | none |
| §12.0 Why this section exists | FRAMEWORK | Palette-role contract rationale | none |
| §12.1 Three-bucket rule | FRAMEWORK | | none |
| §12.2 Full palette semantics (no `text-secondary`, slot table) | FRAMEWORK | The slug roster and meanings; Indus-specific note in `footer-bg` row is a client name in a framework doc (allowed in docs, but FAT) | none |
| §12.3 Current usage by bucket | FAT (point-in-time inventory) | A list of call sites that changes with every block edit; the section itself says to grep | none |
| §12.4 Deliberate blend pattern | FRAMEWORK | | none |
| §12.5 Client palette audit | CLONING-ONLY / FAT | Audit of client snapshots; (b)'s gate `check-palette-slug-refs.py` is FORMAT-wide and should stay with the format | none |
| §12.6 Client colour changes | CLONING-ONLY | Client-value policy and the not-built extractor `border` guard | none |
| §12.7 Verification method + extractor proof | split: FRAMEWORK (computed-style verification) + CLONING-ONLY (`palette.py::_synthesise_surface_alt` guard) | | (references FR-33-2) |
| §13.1 The model | FRAMEWORK | WordPress layer merge model | none |
| §13.2 Per-client source of truth | FORMAT | Snapshot is per-client truth for every client | none |
| §13.3 Hard constraints | FAT (duplicate) | Restates R-31 rules and root CLAUDE.md | none |
| §13.4 Group A | FORMAT (A3, A4); FAT (A5) | A3/A4 are push mechanics for any client; A5 is a rationale ("no future session builds…") | FR-26-A3, FR-26-A4, FR-26-A5 |
| §13.4 Group B | FRAMEWORK | Raw values, overridable defaults, merged-value reads; B2 is a pointer to Spec 35 | FR-26-B1, FR-26-B2, FR-26-B3, FR-26-B4, FR-26-B6 |
| §13.4 Group D | FORMAT; D3's shadow ruling FAT and **stale** | D3 says SGS shadows are `subtle`, `raised`, `floating`, `glow`; `theme/sgs-theme/theme.json` has `whisper, soft, lifted, floating, crisp, long, outline, grounded, glow, pressed, hard, diffuse` (read in this review) | FR-26-D2, FR-26-D3 |
| §13.5 Flow | FORMAT | | none |
| §14.1 What it is | FORMAT | Says "the extractor (Part D) writes it" for every client; false for six hand-built snapshots (finding 5) | none |
| §14.2 Target slots | FORMAT (the vocabulary Part 3 below maps into) | Shared by extractor and hand-built clients | none |
| §14.3 `settings.custom` keys | FORMAT | Includes the reserved `header`/`footer` namespace | none |
| §14.4 Deployment | FORMAT | `prepare_deploy_snapshot`, disk, REST, safety | none |
| §15.1 Purpose and iron law | CLONING-ONLY | | none |
| §15.2 Process | CLONING-ONLY | Step 7 (deploy) and 8 (business data) are pointers | none |
| FR-33-1 to FR-33-10 | CLONING-ONLY | Extraction, roles, base typography, declared types, Pass B, dark/shell safety, trace/goldens, determinism, conservation, token-map reuse. FR-33-7 Status (stale Mama's golden) is FAT | FR-33-1 … FR-33-10 |
| FR-33-11 | FORMAT (deploy safety) | `push-theme-snapshot.py` backup/rollback/drift guards apply to every client push | FR-33-11 |
| FR-33-12 | CLONING-ONLY | Freshness keys; Status line current truth | FR-33-12 |
| FR-33-13 | FORMAT (namespace) + CLONING (acyclicity) | `settings.custom.header/footer` reservation is format; extractor-ownership is cloning | FR-33-13 |
| FR-33-14 | CLONING-ONLY | Business-data auto-fill from a draft; the Site Info store and REST endpoint are Spec 36/37 framework | FR-33-14 |
| FR-33-15, FR-33-16 | CLONING-ONLY | Claude Design declared sources; palette overlay | FR-33-15, FR-33-16 |
| FR-33-17, FR-33-18 | CLONING-ONLY, with a FRAMEWORK runtime part | `Google_Fonts_Self_Host` (`class-google-fonts-self-host.php`) is plugin runtime for any snapshot with `google: true` | FR-33-17, FR-33-18 |
| FR-33-19 | CLONING-ONLY, with a FRAMEWORK paragraph | "How the value is applied" (`SGS_Container_Wrapper` `contentWidth`) is framework | FR-33-19 |
| FR-33-20 | FORMAT / FRAMEWORK | Dark palette opt-in, derived at push for any client; nothing draft-specific | FR-33-20 |
| §15.4 Known limits | CLONING-ONLY | | none |

**Net split:** Part A minus FR-32-7, FR-32-8 (second half), FR-32-10 (extraction half), §12.5-§12.7 extractor parts, and
FAT sections stays FRAMEWORK. Part B Group B is FRAMEWORK; Groups A and D plus Part C plus FR-33-11, FR-33-13 (namespace)
and FR-33-20 are FORMAT and are needed by hand-built clients, so they should stay with Spec 32 (or move to a format spec),
**not** into the cloning Spec 48. Part D (FR-33-1 to -10, -12, -14 to -19, §15.1/15.2/15.4) is CLONING-ONLY and can move
to Spec 48.

## Places outside Spec 32 that cite it

Scope: `git grep -n -o -E "Spec 32 …(§…|Part …)|FR-3[23]-n|FR-26-[ABD]n|Spec 32"` across the repo, excluding
`.claude/archive/`, `**/archive/**` and the spec itself. **431 files, 1,038 hits.** Full per-file list:
`r4-cites-byfile.txt` in this folder; 105 of the 431 are dated records (`reports/`, `.claude/reports/`,
`.claude/memory/`, `.claude/backups/`) that need no edit under "docs state current truth only".

Hit counts per ID: FR-32-4 107, FR-32-1 30, FR-32-11 22, FR-33-1 21, FR-33-4 19, FR-33-5 17, FR-33-18 15,
FR-33-11 14, FR-33-12 13, FR-32-12 12, FR-33-3 12, FR-33-6 12, FR-33-14 12, FR-32-4a 9, FR-32-9 8, FR-33-19 7,
FR-32-2 6, FR-32-13 6, FR-33-2 6, FR-26-D2 5, FR-33-9 5, FR-33-7 4, FR-33-8 3, FR-33-13 3, FR-32-5 2, FR-32-6 2,
FR-33-10/15/17/20 1 each. Section cites: "Spec 32 §6.1…" about 50, "Part C" 12, "Part B" 5, "Part D" 3, "§6.2" 7,
"§14" 1, "§13.2" 1, "§12.5" 1, "§12.2" 1. No current file cites FR-32-7, FR-32-8 or FR-32-10 by ID.

**Citations that break if Parts B, C, D or FR-33/FR-26 IDs move or renumber** (live docs and code only):

| File | What it cites |
|---|---|
| `CLAUDE.md` (root, Non-negotiables) | Spec 32 Part C |
| `.claude/specs/00-OVERVIEW.md` | Spec 32 Part C |
| `.claude/specs/01-SGS-THEME.md` | Spec 32 Part B (x2), Part C, Part D, FR-33-4 |
| `.claude/specs/02-SGS-BLOCKS.md` | Spec 32 Part C (x3), FR-32-2, FR-32-9 |
| `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` | Spec 32 Part C |
| `.claude/specs/27-SGS-VARIABLE-PRODUCT-CONFIGURATOR.md` | Spec 32 Part B (x3) |
| `.claude/specs/37-HEADER-FOOTER-BUILDER.md` | Spec 32 Part C (x2), FR-33-20 |
| `.claude/specs/40-GENERATIVE-COVER-IMAGES.md` | Spec 32 Part C (x2) |
| `.claude/specs/47-COMPUTED-ROUTE-DRAFT-TO-TREE.md` | Spec 32 §14 / Part C, §6.1(a1), FR-33-5 |
| `.claude/specs/README.md` | Spec 32 FR-32-13 and §6.1 (old-number map row for Spec 31) |
| `.claude/wp-sgs-cli.md` | Spec 32 §13.2 |
| `.claude/catalogues/tooling.md` | FR-33-1/2/3/5/7/14/18/19, FR-32-1/9 (generated catalogue: regenerate, do not hand-edit; UNVERIFIED which generator) |
| `.claude/plans/2026-10-04-spec47-full-coverage.md` | FR-33-5 |
| `theme/sgs-theme/assets/css/type-scale.css` | Spec 32 Part D |
| `theme/sgs-theme/assets/css/utilities.css` | Spec 32 Part C |
| `plugins/sgs-blocks/includes/class-google-fonts-self-host.php` | Spec 32 Part D, FR-33-18 |
| `plugins/sgs-blocks/includes/class-button-presets-customiser.php` | FR-26-D2, FR-32-1, FR-32-4 |
| `plugins/sgs-blocks/scripts/push-theme-snapshot.py` | FR-26-D2 (x4), FR-33-11 (x9), FR-33-5 (x4) |
| `plugins/sgs-blocks/scripts/check-palette-slug-refs.py` | Spec 32 §12.5, §3, FR-32-2 |
| `plugins/sgs-blocks/scripts/shared_utils.py` | FR-33-12 (x3) |
| `plugins/sgs-blocks/scripts/sync-business-info.py`, `business_info/__init__.py`, `scripts/tests/test_sync_business_info.py` | FR-33-14 |
| `plugins/sgs-blocks/scripts/theme-extractor/*.py`, `*.js`, `tests/*.py` (19 files: colour, declared_reconcile, derive, extract, font-usage, layout-census, measure, palette, palette_vocab, presets, roles, schema_validate, site_palette, token_map, typography, used_fonts, used_layout, tests/test_declared_generalisation, test_extractor, test_freshness_source_hash, test_used_fonts, test_used_layout) | FR-33-1 … FR-33-19 |
| `plugins/sgs-blocks/src/blocks/button/style.css` | FR-33-4, FR-32-2 |
| `sites/{eye-care-ward-end,indus-foods,mamas-munches,mamas-munches-redesign}/theme-extract-trace.json` | FR-33-3/4/18 (generated trace rows; regenerate rather than edit) |

**Gate to respect:** `plugins/sgs-blocks/scripts/lints/lint-spec-drift.py` check `FR-ORPHAN` (advisory, `ADVISORY_CHECKS`)
flags an FR-ID cited in code that appears in no spec (`_RE_FR_ID`). Renumbering FR-33-n to FR-48-n without a sweep
of the 19 extractor files plus `push-theme-snapshot.py`, `shared_utils.py` and the business-info files would create
orphans. Keeping the FR-33-n IDs verbatim inside Spec 48 (as Spec 32 did when it absorbed Spec 33, document map) avoids
the sweep. Bare `§12`-`§14` cites in Spec 35, Spec 36 and `golden-controls.json` refer to those specs' own sections,
not Spec 32's (checked: Spec 35 §12.3/§12.5/§12.8/§14, Spec 36 §14.9.6, Spec 31 §12.7).

---

# PART 3. The framework vocabulary a handover maps into, and the Indus mapping

## 3.1 Vocabulary

**Palette slugs** (`theme/sgs-theme/theme.json` `settings.color.palette`, 21 slugs; meanings Spec 32 §12.1/§12.2):

| Slug | Meaning |
|---|---|
| `primary` | Main brand/interactive colour: buttons, links, active states |
| `primary-text` | Ink on a `primary` fill ("Text on Primary") |
| `primary-dark` | Hover/pressed shade of primary; derived from final primary (FR-33-16) |
| `accent` | Secondary/highlight brand colour: badges, callouts, secondary CTAs |
| `accent-text` | Text/border/icon on `accent-light` panels (AA-safe darker accent) |
| `accent-light` | Pale accent tint used as a raised fill |
| `success`, `success-light` | Positive state and its pale fill |
| `error`, `error-light` | Negative state and its pale fill |
| `info`, `info-light` | Informational state and its pale fill |
| `whatsapp` | WhatsApp brand green, WhatsApp CTA only |
| `surface` | Substrate: the page background (`styles.color.background`) |
| `surface-alt` | Raised: cards, panels, chips, tiles |
| `text` | Main text on light grounds (industry `text-primary`) |
| `text-muted` | Secondary copy on light grounds (industry `text-secondary`; no `text-secondary` slug may be added) |
| `text-inverse` | Ink on dark or saturated fills; never a background |
| `border`, `border-light` | Quiet neutral dividers (a saturated brand hue here is a role violation, §12.5(a)) |
| `footer-bg` | Deep neutral footer ground |
| `text-label` | Extractor-added extra slug for the small-label grey (FR-33-16); no block reads it |

Gradients: framework `settings.color.gradients` is empty (read in this review); Spec 32 §14.2 lists no gradient slot.

**Typography** (`theme.json`): font families `body`, `heading`, `display` (role slots, FR-33-3) plus one entry per
loaded-and-rendered family (FR-33-18; framework ships `dm-sans`). Font sizes (non-fluid ladder): `small` 14px,
`regular` 16px, `large` 20px, `x-large` 24px, `xx-large` 36px, `hero` 50px; a draft `clamp()` is emitted verbatim
(§14.2). Elements: `styles.elements.{link, heading, h1…h6, button}`; base `styles.typography`, `styles.color`.

**Spacing:** `spacingSizes` slugs `10` 0.25rem, `20` 0.5rem, `30` 1rem, `40` 1.5rem, `50` 2rem, `60` 3rem, `70` 5rem,
`80` 8rem. Layout: `contentSize` 1200px, `wideSize` 1400px (FR-33-19 derives them from the render). Device tiers
768/1024 fixed; sub-tier rules via `sgsCustomCss` (FR-32-13).

**Radius:** `settings.custom.borderRadius` `small` 4px, `medium` 8px, `large` 16px, `pill` 9999px. The extractor fills
only `medium` (or square 0) from a declared radius (FR-33-16).

**Shadow:** `settings.shadow.presets` `whisper, soft, lifted, floating, crisp, long, outline, grounded, glow, pressed,
hard, diffuse`; `settings.custom.shadowColour`; `settings.custom.shadowHover` (rest-to-hover ladder). No role names
(card/panel/button) exist for shadows.

**Component presets** (FR-32-9, §14.3): `buttonPresets.{primary, secondary, outline}` with roles `background, text,
border, border-width, border-radius, padding, font-size, font-weight, min-height, hover-background, hover-text,
hover-border` (+ optional `default` holding `hover-transform`, `hover-transition`, FR-33-4); `measuredDiagramPresets`
own roles. `product-card` CTA reuses `buttonPresets` (§11). Reserved empty: `settings.custom.header`, `.footer`
(FR-33-13). Also `sgs.headerPattern`, `sgs.footerPattern`, `accentSets`, `dark`, `darkInk`.

**Motion tokens** (`settings.custom`): `transition` fast/medium/slow; `duration` instant 60ms, fast 150ms, medium
300ms, slow 500ms, extra-slow 800ms; `easing` default, ease-out `cubic-bezier(0.16,1,0.3,1)`, ease-in, spring, linear;
`entrance` {distance 30px, duration 500ms, easing}; `focus-ring`; `linkSweep` (listed in §14.3, absent from the
framework file).

**Motion tiers** (Spec 38 §1): V vanilla/CSS (default), G GSAP (conditional, npm-bundled), H single-purpose helper
(Lenis, Lottie), W WebGL substrate. **Effects** (`fx_effects`, read-only DB query in this review): V `carousel-loop,
cursor-field, grid-dots, magnet, page-transitions, particles`; G `draggable, draw, flip, horizontal-panel,
image-sequence, morph, motion-path, pin-scrub, scramble, scrub, split-reveal`; H `lottie, scroll-smoother`; W
`generative-background, surface-treatment, wave-gradient`. Tier V entrances `sgsAnimation`: `fade-up, fade-down,
fade-in, fade-left, fade-right, slide-up, slide-down, slide-left, slide-right, scale-in, scale-out, rotate-in,
flip-in, blur-in, bounce-in, reveal-up`. Hover effects extension (`extensions/hover-effects/`): scale 1.02/1.05/1.1,
duration and easing tokens, tilt (`attributes.js`). Parallax extension. Draft grammar `data-sgs-fx-*` (Spec 38 §11,
not read by any route tool today).

**Header/footer/nav structures:** header rows `top`/`middle`/`bottom`, footer rows `top`/`columns`/`bottom`, row
`layout` flex|grid with per-device `columns` and `gridTemplateColumns` (Spec 37 §3.1-§3.3); header/footer/drawer are
CPT posts with active pointers (Spec 37 §5, Spec 36 FR-36-2). Nav: `sgs/nav-bar-menu` (bar + burger below collapse
point, split layout, trigger presentation), `sgs/nav-drawer` (native `<dialog>`) + `sgs/nav-drawer-menu`
(accordion/drill-down), `sgs_mega_menu` CPT with `sgs/mega-panel`, `mega-group`, `mega-aside`, menus = native WP menus
(FR-36-1), three responsive collapse modes (FR-36-8). Utilities: `sgs/cart`, `sgs/product-search`,
`sgs/social-icons` (Site Info-bound `sgs/icon` children), `sgs/responsive-logo`, `sgs/business-info` (Site Info),
link lists (FR-36-26), `sgs/whatsapp-cta`.

## 3.2 Indus mapping

Sources: `design_handoff_indus_foods_website/README.md` "Design Tokens", "Breakpoints", "Global layout", "Animations &
Behaviour"; `tokens/colors.css`, `tokens/typography.css`, `tokens/spacing.css`; `guidelines/*.html` are specimen
cards of the same values (`colors-brand.html` shows `#0A7EA8` "blue" etc.).

Verdicts: **slot** = an existing framework slot (named); **missing** = no slot, and which spec would need an edit;
**client** = lives only in the client's snapshot or as per-instance block settings.

### Colours

| Declared | Value | Verdict |
|---|---|---|
| `--brand-blue` (links, top bar, blue sections, CTA) | `#0A7EA8` | slot `primary` |
| `--brand-blue-hover` (link hover) | `#075E80` | slot `primary-dark` (extractor derives primary-dark from primary, FR-33-16, so the declared value would be overwritten; missing: a "declared hover wins" rule, Spec 48) |
| text-on-gold alt | `#0A6E93` | client (one-off hex, memory "One-off colours are hex") |
| `--brand-blue-light` (gradient stop, progress bar) | `#2EADE2` | client extra slug (no "secondary brand" slot; `info` is a state colour and must not be borrowed) |
| `--brand-gold` (accent, header border, selection) | `#D8CA50` | slot `accent` |
| `--brand-gold-light/-mid/-pale` | `#E7D768`, `#E3D35F`, `#EBDD78` | client (gradient stops); `accent-light` only if one is used as a raised panel fill (UNVERIFIED in the draft) |
| `--ink` (selection text) | `#1E2A3C` | slot `text` candidate (extractor ROLE_TABLE maps "ink" to `text`/`primary`, `palette_vocab.py::ROLE_TABLE`) |
| `--slate` (`--text-heading`; hover card fill) | `#2C3E50` | slot `styles.elements.heading.color` (element, not palette); as a palette entry: client extra. Note the framework's `text` covers body AND headings |
| `--grey-body` (`--text-body`, base 19px text) | `#4A5563` | conflict: Spec 32 §12.2 makes `text` the main body ink; extractor vocab maps "body text" to `text-muted` (`palette_vocab.py::ROLE_TABLE`). Spec 48 must settle which wins |
| `--grey-muted` | `#68727C` (`#5E6873` alt) | slot `text-muted` (or `text-label` per FR-33-16) |
| `--surface-white` | `#FFFFFF` | slot `surface` |
| `--surface-warm` (brand logo tiles) | `#FAFAF8` | slot `surface-alt` (but white vs `#FAFAF8` differ by ~5 RGB units: §12.6 "surface-alt distinctness" warns raised blocks look flat) |
| `--surface-cool` | `#F2F5F7` | client extra slug |
| `--tint-on-blue` (text on blue) | `#E3EFF4`, `#DCEBF1` | slot `primary-text` |
| `--whatsapp-green` | `#25D366` | slot `whatsapp` (equals the framework value) |
| Social LinkedIn/Facebook | `#0A66C2`, `#1877F2` | client per-instance (brand icon colours; whether `brand-registry.json` carries brand colours is UNVERIFIED) |
| Social Google | `#EA4335` | client literal (extractor `SKIP_TABLE` keeps "google" third-party colours literal) |
| `--gradient-hero`, `--gradient-brand`, `--gradient-progress` | three linear gradients | missing: no gradient slot in Spec 32 §14.2 and framework `color.gradients` is empty (Spec 32 Part C edit); values client |
| `--selection-bg/-fg` | gold / ink | missing: `theme.json` has no `::selection` element; client CSS (`styles.css` string in the snapshot, §14.1) |
| `--text-link`, `--text-link-hover` | blue / blue-hover | slot `styles.elements.link` color and `:hover` |
| `--border-accent` (header 3px bottom border) | gold | client per-instance (border setting on the header row); must NOT map to `border`, which is a neutral by §12.2/§12.5(a) |
| `--surface-topbar`, `--surface-section-blue`, `--surface-section-gold`, `--surface-header` | aliases | client per-instance backgrounds (section grounds) |
| footer ground | not declared | `footer-bg` stays framework default unless measured |
| Success "Open now" dot, error, info | not declared | framework defaults stay |

### Typography

| Declared | Verdict |
|---|---|
| `--font-heading` Montserrat 500-800 | slot `fontFamilies.heading` (+ `display`) |
| `--font-body` Source Sans 3 400-700 | slot `fontFamilies.body` |
| `--font-mono` Geist Mono (labels) | client extra family entry (FR-33-18 mechanism); no `mono` role slot (missing only if a mono role is wanted: Spec 32 §14.2) |
| `--fs-body` 19px, `--lh-body` 1.55 | slot `styles.typography` fontSize/lineHeight (FR-33-3) |
| `--fs-h1` clamp(36px,5vw,62px) | slot `styles.elements.h1` fontSize (verbatim clamp, §14.2); nearest ladder slug `hero` |
| `--fs-h2` clamp(28px,3.4vw,40px), -0.01em | slot `styles.elements.h2`; ladder `xx-large` |
| `--fs-card-title` 22px, `--fs-nav` 17px, `--fs-eyebrow` 13px, `--fs-mono` 12px | client: per-instance block settings or extra `fontSizes` entries; the ladder has no eyebrow/nav/caption slugs (missing only if the framework wants named text styles: Spec 32 §14.2) |
| `--tracking-eyebrow` / `--tracking-mono` .14em, uppercase | client per-instance (no letter-spacing token slot) |
| Heading weights (H1 800, cards 700) | slot `styles.elements.heading` fontWeight (FR-33-16 measured heading weight) |

### Shape, shadow, spacing, layout

| Declared | Verdict |
|---|---|
| `--radius-tag` 3px | slot `borderRadius.small` (value client) |
| `--radius-tile` 12px, `--radius-panel` 12px | slot `borderRadius.medium` |
| `--radius-card` 22px | slot `borderRadius.large` |
| `--radius-pill` 999px | slot `borderRadius.pill` |
| (extractor gap) | FR-33-16 fills only `medium` from a declared radius: mapping all four is a Spec 48 extractor edit |
| `--shadow-button`, `--shadow-card`, `--shadow-panel`, `--shadow-header` | family slot `settings.shadow.presets`, but no role names: missing a shadow-role contract (which preset is card/panel/button), Spec 32 §14.2; values client |
| `--gap-1…8` 8/10/14/18/22/28/40/64px | slot `spacingSizes` ladder (slugs 10-80 fixed; values client) — 8 values onto 8 slugs, but the framework ladder is rem-based 4…128px, so a replacement changes every block default that uses a slug (blast radius UNVERIFIED) |
| `--gutter-*` 20/32/40, `--section-*` 64/88/108, tight section 40/52/64 | missing: no per-tier section-padding or gutter token; today Fill writes them per instance as block padding tiers. A token would need Spec 32 §14.2 (and Spec 48A to declare it) |
| Header height 72/72/84 | client per-instance (Spec 37 header attrs); `settings.custom.header` is reserved but has no keys (FR-33-13): missing, Spec 37 |
| Max content widths: header 1320, sections 1040-1120 | slot `layout.contentSize` (derived 1080 in current snapshot) and `wideSize` (1320); the 1040/1120 spread needs literal `contentWidth` per container (FR-33-19 Known limit: no third width slot) |
| Breakpoints <768, 768-1023, >=1024 | slot: equals the framework device tiers exactly (FR-32-13) |
| CTA at >=1260, nav padding change at 1200 | slot `sgsCustomCss` residual (FR-32-13), bound to the Desktop tier |

### Motion

| Declared | Verdict |
|---|---|
| `--ease-out` cubic-bezier(.16,.84,.32,1) | slot `custom.easing` (client value; framework `ease-out` is (0.16,1,0.3,1)) and `custom.entrance.easing` |
| Hero stagger: translateY 28px + blur 8px, 900ms, 80ms + 110ms×i | partial: `sgsAnimation` has `fade-up` and `blur-in` but not both at once (UNVERIFIED whether the animation extension exposes blur amount or stagger); Fill writes measured duration/delay/distance (Spec 47 §3.4) |
| Scroll reveal (IO 0.12): headings up 22px + blur, children up 40px + scale .96, stagger | slot Tier V `sgsAnimation` with stagger (`data-stagger`, Spec 38 §11.1); combined translate+scale+blur preset missing (Spec 38) |
| Image clip-path reveal, inner scale 1.18→1 | slot `reveal-up` (closest; exact match UNVERIFIED) |
| Lines scaleX/scaleY draw (timeline connector) | slot FR-38-35 `sgs/timeline` progress connector (Tier V) or `draw` (G) |
| Magnetic buttons ±5px, shine sweep, press ripple | slot `magnet` (FR-38-30); shine sweep and ripple: missing (UNVERIFIED against hover-effects panels), Spec 38 |
| Pointer tilt 16deg + radial highlight | slot hover-effects tilt (`extensions/hover-effects/attributes.js`); radial highlight UNVERIFIED (cursor-field FR-38-25 is the nearest) |
| Brand logo marquee 38s, 0.15× on hover, edge fade | slot `sgs/brand-strip` (marquee with fade masks, Spec 32 §12.4) or `sgs/trust-bar` autoScroll; slow-on-hover UNVERIFIED |
| Hero photo float 12px 4.2s alternate; parallax -0.06×scrollY | slot parallax extension (`data-sgs-parallax`); float: Tier V keyframe, MotionPath FR-38-17 nearest |
| `hscroll` pinned horizontal timeline with counter | slot `horizontal-panel` (FR-38-8, Tier G) |
| Testimonial auto-advance 6.5s, slide-in | slot `sgs/testimonial-slider` |
| Scroll progress bar (3px gradient) | partial: global `--sgs-scroll-progress` (`assets/js/scroll-progress.js`, Spec 38 §11.1); a visible bar block/setting is UNVERIFIED |
| Main fade 380ms on route change | slot `page-transitions` (FR-38-19, View Transitions) |
| About hero animated SVG (WAAPI sequence, 4.4s) | client asset; nearest slots `lottie` (H) or `draw`/`morph` (G); no "inline animated SVG" slot (missing, Spec 38) |
| Mega menu: open on hover/focus, close 170ms after leave, panel entrance 340ms, child stagger 26ms, backdrop blur 2px | Spec 36 FR-36-4 disclosure settings; exact timing/backdrop controls UNVERIFIED |
| Drawer: right side, stagger 420ms/55ms | Spec 36 FR-36-6 / FR-36-29 drawer; stagger control UNVERIFIED |
| Reduced motion skips all JS motion | slot Spec 38 §4.5/§10 per-effect contract |

### Header, footer, navigation, business data

| Declared | Verdict |
|---|---|
| Top bar 46px blue, pill contact buttons, social circles | Spec 37 header row `top` (cluster), `sgs/button`, `sgs/social-icons` |
| Sticky header, gold 3px bottom border, shadow after 8px scroll | Spec 37 header + per-row scroll behaviours ("Per-row scroll behaviours", `scrolled` state in Spec 47 §3.1) |
| Logo horizontal SVG, height clamp(40px,3.8vw,52px) | `sgs/responsive-logo` (FR-36-22); logo image is a handover (row 13) |
| Desktop nav 6 items, active 2px gold underline, 17px/600 | `sgs/nav-bar-menu` + `current` state; menu items: native WP menu (nothing creates it, row 18) |
| Mega menus (About list + feature card, Sectors 4 cards on gradient, Brands logo grid + side block, Trade list + feature) | `sgs_mega_menu` CPT posts with `sgs/mega-panel` / `mega-group` / `mega-aside` (FR-36-2, FR-36-5); each a canvas surface (Spec 47 §3.8) |
| Mobile/tablet drawer (accordion, gold dividers, gold pill, email/call buttons, socials) | `sgs_drawer` + `sgs/nav-drawer` + `sgs/nav-drawer-menu` (FR-36-6) |
| Footer link groups, centred square logo, accreditation slots | Spec 37 footer rows `columns` (grid count 4+) and `bottom`; link lists FR-36-26; accreditation logos `sgs/media` or `sgs/brand-strip` |
| Opening hours widget with live "Open now / Closes at X" and pulsing dot (Europe/London) | `sgs/business-info` hours from Site Info (FR-36-23); the live open/closed status is UNVERIFIED in the block (grep of `business-info/` for open-now logic found nothing) |
| WhatsApp fixed pill bottom-right, `wa.me` link | `sgs/whatsapp-cta`; `wa.me` not recognised by the Site Info lint (Spec 47 §7) |
| Phone, email, address | Site Info keys via `sync-business-info.py` (FR-33-14) or handover provisioning (FR-47-9) |
| Forms (Careers, Trade Application, Contact; text/email/tel/select/file/textarea, required) | `sgs/form` + `form-field-text/email/phone/select/file/textarea` (all exist in `src/blocks/`); thank-you state and backend via `Sgs_Mailer` |
| Blog category chips, post cards, read time | `sgs/post-grid` + filter (UNVERIFIED for category chips and read time) |
| FAQ grouped accordions, icon rotates 45deg | `sgs/accordion` / `sgs/product-faq` (rotation setting UNVERIFIED) |

### Summary of missing slots (spec edits a handover would trigger)

1. Gradient slot roster (Spec 32 §14.2; framework `color.gradients` empty).
2. Shadow role names (card, panel, button, header) over `shadow.presets` (Spec 32 §14.2).
3. Per-tier section padding and page gutter tokens (Spec 32 §14.2; Spec 48A would declare them).
4. `settings.custom.header` keys (header height, scrolled shadow) reserved but undefined (Spec 37, FR-33-13).
5. Extractor rules (Spec 48): all four radii, declared hover over derived `primary-dark`, body-text vs `text-muted`
   precedence, README bullet/prose colour format, external `tokens/*.css` and `@import` fonts.
6. Motion presets Spec 38 lacks or that are UNVERIFIED: combined translate+blur(+scale) entrance, shine sweep, ripple,
   inline animated SVG sequences, marquee slow-on-hover.
7. Selection colours (no `theme.json` element): snapshot `styles.css` string, client-only.
