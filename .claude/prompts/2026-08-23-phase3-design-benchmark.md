# Phase 3 — design benchmark: make each template the best version of ITSELF

Invoke `/autopilot` before doing anything else.

---

## The task in one sentence

Benchmark the SGS theme's templates against top-tier designed versions of the same page
type, and produce a **findings register** — not edits — that says, per surface, exactly
where the design falls short of industry standard and what class of change would close it.

## ⛔ THE CONSTRAINT THAT DEFINES THIS TASK (Bean, 2026-08-23, verbatim intent)

> *"match the top industry standard to make us Awwwards level while not going overboard and
> designing pages into defaults that should be empty if they are supposed to be empty.
> Need to be the best version of themselves."*

Three things follow, and getting them wrong makes the whole pass worthless:

1. **A template that is SUPPOSED to be an empty shell stays an empty shell.** `page.html`
   and `front-page.html` are `<main>` + `post-content`. That is CORRECT block-theme
   practice — the design of a Page lives in the patterns and content dropped into it. Do
   NOT invent default sections for them. A finding on those two is a **pattern-layer** or
   **content-layer** finding, and must be labelled as such.
2. **"Best version of itself" is per-page-type, not one house style.** A 404 and a product
   detail page are held to different standards. Judge each against the best examples of
   ITS OWN type.
3. **You produce a REGISTER, not commits.** No template edits in this session. Mixing a
   correctness pass with a design uplift destroys attribution — that is why the Phase 3
   plan separates them.

---

## Read first, in this order

1. `.claude/plans/phase-shop-container-remediation.md` — the `## ▶ PHASE 3 STATUS` block
   near the Phase 3 section. Wave A (static audit) is CLOSED; this is the design axis,
   which has never run.
2. `.claude/reports/2026-08-22-phase3-template-audit-register.md` — what the static audit
   found. Do not re-find it; build on it.
3. `theme/sgs-theme/CLAUDE.md` and the root `CLAUDE.md` — the framework's competitive
   positioning (it competes with Kadence / Spectra / GenerateBlocks) and the
   non-negotiables (WCAG 2.1 AA, performance budget <100KB CSS / <50KB JS, no CDN,
   motion doctrine).
4. `sites/mamas-munches/CLAUDE.md` — the live client whose canary you will be looking at.

---

## The ten surfaces, split by whether the TEMPLATE owns the design

**SEVEN get a full benchmark** — the template genuinely determines what the visitor sees:

| Surface | What it owns | Benchmark against |
|---|---|---|
| `archive-product.html` | filter rail, product grid density, sort/results row, pagination | top-tier shop / collection pages |
| `single-product.html` + `parts/sgs-pdp-*` | gallery, buybox, trust signals, tabs, related-products rhythm | top-tier PDPs (product detail pages) |
| `archive.html` | listing card, meta treatment, empty state, pagination | editorial index pages |
| `search.html` | results card, the **empty state** (first-class here), retry affordance | search-results pages |
| `index.html` | same as archive — but see the caveat below | editorial index pages |
| `single.html` | measure, typographic scale, comment thread | editorial article pages |
| `404.html` | the entire page; depends on no content at all | 404 pages (a standing Awwwards showcase category) |

**TWO are shells and must STAY shells:**

| Surface | Why | What a finding looks like |
|---|---|---|
| `page.html` | `<main>` + post-title + post-content. 135 published pages use it. | a PATTERN gap ("there is no strong hero pattern for a service page"), never a template edit |
| `front-page.html` | `<main>` + post-content only | a PATTERN or SETTINGS finding |

⚠ **`index.html` caveat:** it is WordPress's mandatory fallback and is currently
**unreachable** on the canary (`show_on_front=posts`, `page_for_posts=0`, so
`front-page.html` intercepts). It must still exist and must still look right if ever hit.
Benchmark it, but note that it cannot be viewed live — and say so rather than pretending.

---

## Skills — invoke these, in this order, with what each is for

| Skill | When | What it gives you |
|---|---|---|
| `/autopilot` | FIRST, before any response | live skill routing + ADHD support for the whole session |
| `/sgs-discover` | Step 1, per page type | **THE reference-site finder.** Its triggers are literally "find me sites like X", "show me 3 references for a dentist site", design-gallery / industry match. This is the spine of the research half |
| `/ui-ux-pro-max` | Step 2, continuously | **The judgement layer.** A 48-table design DB: `ux_guidelines` + `ui_reasoning` are PRIORITY-WEIGHTED (accessibility → touch → performance → layout → typography → animation → style → charts) — apply in that order when findings conflict. Also `landing` section structures, `typography` pairings, `colors` by industry. ⛔ It is a REFERENCE DB, not an execution skill |
| `/research-buddies` | Step 3, for the "is this current and does it convert" angle | Two personas: The Nerd finds bleeding-edge community-validated material (Reddit, forums, real practitioner discussion); **The Practical One challenges it and makes it real.** That second persona IS the structural guard against the over-design failure Bean named — use it deliberately, do not skip its half |
| `/gh-research` | Step 4, NARROWLY — see the scoping box below | GitHub repos / issues / code / discussions |
| `/sgs-extraction` → `ingest-extraction.py` | after a reference site is chosen | captures HTML + tokens + a11y from a reference and **writes it back into the uimax DB**, so this benchmark compounds instead of being thrown away |
| `/a11y-audit` | per surface | WCAG 2.1 AA is a NON-NEGOTIABLE baseline here, not a design nicety |
| `/visual-qa` | per surface, live | the 9-layer SGS visual pipeline |
| `/qc-council` | ONLY if a surface produces 2+ competing design directions | forces empirical pre/post framing before anything is treated as decided |
| `/brainstorming` (design mode) | if a finding turns into a real design proposal | do NOT jump to implementation; this session ends at a register |

### ⛔ Scoping box for `/gh-research` — it is narrow on purpose

Awwwards-calibre design lives on live commerce and editorial sites, **not in GitHub repos**.
Pointed at "what should this look like", `/gh-research` returns code and wastes the session.
Use it for exactly two questions, both on the FUNCTIONAL half:

1. **How do the best WordPress block themes structure a product archive / PDP template?**
   (search block-theme repos for `templates/archive-product.html`, `single-product.html`)
2. **What do people actually complain about in WooCommerce shop UX?** (scan the
   WooCommerce and Gutenberg issue trackers for filter, pagination, empty-state and
   mobile-drawer complaints)

That is filter behaviour, pagination patterns and empty states — the engineering-shaped
half. Everything aesthetic comes from `/sgs-discover` + `/ui-ux-pro-max`.

---

## Tools + MCP

| Tool | Use for |
|---|---|
| Playwright MCP | Viewing the live canary. `getComputedStyle` / `getBoundingClientRect` for anything measured; screenshots for the aesthetic judgement half — **and unlike the correctness pass, a screenshot IS legitimate evidence here**, because design quality is a visual question |
| `.claude/secrets/sandybrown.env` | canary credentials — gitignored, always available, do not ask |
| `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<brief>" --domain <d> --limit 5` | the uimax DB directly; `--design-system` queries 5 domains at once |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` | what blocks/attributes actually EXIST before proposing a design that needs a capability we lack |
| `python ~/.claude/hooks/wp-blocks.py dump` | block schema check before claiming a control is missing |
| `mcp__serpapi__search` / `/search` | finding award-winning examples by page type |

**Canary:** `https://sandybrown-nightingale-600381.hostingersite.com`
**SSH:** `ssh hd` (alias configured). WP path:
`/home/u945238940/domains/sandybrown-nightingale-600381.hostingersite.com/public_html`

---

## Research approach — numbered, do it in this order

1. **Per page type, find 3–5 genuinely top-tier references** via `/sgs-discover`. Named
   sites, not vibes. For each, say WHY it is exemplary for that page type.
   Suggested searches: "best ecommerce product detail page design 2026", "awwwards
   ecommerce collection page", "best 404 page design", "editorial article layout
   typography award", "search results page UX pattern".
2. **Extract what makes them work** — `/sgs-extraction` on 1–2 references per type, then
   pipe the manifest through `ingest-extraction.py` so the DB compounds.
3. **Query `/ui-ux-pro-max` for the rules that govern that page type** — section
   structures, typographic scale, colour, and the priority-weighted UX guidelines.
4. **Run `/research-buddies`** on the two questions that references alone cannot answer:
   what has actually converged as best practice in 2026, and what converts versus what
   merely looks good. **Let The Practical One argue against the Nerd — that exchange is
   the point**, and it is the guard against over-design.
5. **Run `/gh-research` on its two scoped questions only** (see the box above).
6. **Open each live surface** and judge it against what you now know. Screenshot at
   375 / 768 / 1440.
7. **Write the register.**

---

## The register — the deliverable

Write to `.claude/reports/2026-08-23-template-design-benchmark.md`. Per surface:

- **Grade** against top-tier for that page type, with the reasoning (not just a letter).
- **The reference set used**, named.
- **Findings**, each with:
  - what specifically falls short (composition, typographic scale, density, empty/loading
    states, motion, imagery treatment, hierarchy, trust signals)
  - **effort** and **impact**, so Bean can rank
  - **which layer owns it**: `TEMPLATE` / `PATTERN` / `BLOCK CAPABILITY` / `CONTENT` /
    `SETTINGS`. This is the most important field in the register — a finding aimed at the
    wrong layer produces the over-design Bean is warning against.
  - a gap with **no SGS equivalent** becomes a **block candidate**, never a silent drop
    (Rosetta Stone rule — see `/ui-ux-pro-max`)
- **What is already good** and should not be touched. A register that only lists faults is
  not a benchmark.

Close with a **single ranked list across all surfaces** — the highest impact-per-effort
first — so there is an obvious starting point.

---

## Ground truth from the session that preceded this one — do not re-derive

- **`supports.align` is GONE from `sgs/container`** and the whole align mechanism was
  measured inert. Full-bleed comes from `maxWidth` defaulting to `{}` (no outer cap).
  A section-shaped block is full-width by default; it needs no align rule.
- **The width model:** OUTER (`maxWidth`, default `{}` = no cap) paints full-bleed; INNER
  (`contentWidth`: normal 1200 / wide 1400 / full / custom) holds the content. `<main>` is
  structure and passes width through. A banded `<main>` is a legitimate opt-in (D725).
- **A `<main>` is NOT a flex container** — it emits no display and stacks by normal block
  flow, so its sections are full-width. (This landed twice on 2026-08-23: first as
  `layout:"stack"` on all nine templates, then corrected to suppressing the outer flex in
  the wrapper, because forcing flex-column still made `<main>` a flex container it had no
  reason to be. The templates no longer state a layout; `404.html` states nothing at all
  and is the living canary for the behaviour.) Before that fix, every page laid its
  top-level sections out in a ROW.
- **Canary content:** 9 posts, 135 pages, 5 products, 1 category, **0 approved comments**.
  `single.html`'s comment thread cannot be seen without seeding one — seed a couple if you
  want to judge that design honestly.
- **`front-page.html` renders ~104 chars and ZERO `<h1>`.** The template is correct; the
  site is set to show latest posts while the template holds `post-content`. That is a
  SETTINGS finding.
- **`sgs-container--flex` is a semantic MARKER, not a styling hook.** Real flex containers
  get `display` from a per-instance `.{uid}` rule under Spec 32's no-inline contract; no
  rule anywhere keys `display` off that class. Do not read the class and conclude an
  element is flex — measure it.

- **Known open correctness items (NOT yours, do not fix):** `main` missing from the editor
  tag dropdown; h1→h3 heading skip on `archive.html:21` and `search.html:16`; redundant
  nested `contentWidth` in five files.

---

## Standing constraints

- **No template edits.** Register only. If something is so obviously broken you want to fix
  it, record it and raise it — do not commit it in this session.
- **`git status` before any git operation.** This is a shared worktree; the colour-golden
  track has been active on `main` all week and had uncommitted LEDGER changes as of
  2026-08-23. Never commit a file you did not write.
- **Verify branch in the same command as any commit** (`main` for framework work).
- **Do not update `.claude/LEDGER.md` if another track has uncommitted changes in it** —
  put status in the Phase 3 plan doc instead.
- **WCAG 2.1 AA is a floor, not a finding.** A beautiful design that fails contrast is not
  top-tier, it is a defect.
- **Performance budget is a design constraint:** <100KB CSS, <50KB JS per page, no CDN,
  and motion follows the four-tier doctrine (Spec 38 §1). A proposal that blows these is
  not "Awwwards level", it is out of scope.

## Done-when

All ten surfaces graded, every finding labelled with its owning layer, one ranked
cross-surface list, and the two shell templates explicitly reported as shells with their
findings pushed to the pattern/content layer rather than invented into the template.
