# Step 2 Strategic Plan — Theme Completion + 5 Client Pipeline

**Generated:** 2026-04-21
**Owner:** Bean Mustafa (QC/internal client only); delivery by `/wp-sgs-developer` + toolset
**Master feature audit reference:** `docs/plans/2026-02-21-master-feature-audit.md` (last updated 2026-04-18)
**Scope:** Step 2 of the 5-step master plan (mapping → strategic plan → toolset gap analysis → per-tool gap analysis → execute)

---

## 0. Context & primary outcome

**Problem:** Five client projects are all urgent/high-value, but two of them (Mama's Munches ecom + Snooza 3D configurator) depend on framework features that don't exist yet. Sequential delivery leaves revenue on the table; parallel delivery requires clear tracks so nothing collides.

**Effect if we don't plan:** Framework half-built during first major client launch; bespoke code leaks into client sites; ecommerce/3D features get built ad-hoc for one client and then have to be re-extracted into the framework later (more work, more risk).

**Solution:** Two parallel tracks — Track A builds the framework features (theme completion + new plugins/blocks) once, generically; Track B ships each client build drawing from the shared framework. Client builds start the moment their unblockers exist.

**Primary outcome:** All 5 clients shipped end-to-end with Bean only acting as QC/internal client. "Shipped" = live site, billable, and the toolset's next-run self-improvement systems have captured every correction.

---

## 1. Client priority queue

Order fixed per Bean's call (2026-04-21). Blockers noted; unblocker dates drive Track B scheduling.

### 1.1 Mama's Munches — small ecom rebuild
- **Current state:** Live site decent on desktop, awful on mobile. Only logo is set.
- **Scope:** Full ecom rebuild. Fresh design (brand TBD during discovery). Mobile-first.
- **Deliverables:** Homepage, product catalogue, product page, cart, checkout, order confirmation, account, basic CMS pages.
- **Blocker:** **SGS Ecommerce Plugin** (§3.1) — full cart/checkout/Stripe/products/variants (Bean's approved scope).
- **Kick-off gate:** SGS Ecommerce Plugin Phase 1 (catalogue + single-product page + Stripe one-off checkout) shippable.
- **End state / QC success:** Bean reviews design once at mockup stage, once at pre-launch. Between those: zero human QC required. Orders flow into WP → Stripe → email confirmation → admin order list. No manual data entry.

### 1.2 Indus Foods — Phase 2 + pricing
- **Current state:** Homepage live on test site (Hostinger). Core template built. Phase 1 close-out committed (`bfe0e4e`). Client brief at `sites/indus-foods/CLAUDE.md`; outstanding issues at `sites/indus-foods/outstanding-issues.md`.
- **Scope — Phase 2:** Complete the 4 service-audience pages (using shared template), trade application form (4-step), product catalogue display, content migration, SEO pass, launch.
- **Pricing:** **Separate deliverable** — produce quote for Phase 2 + roadmap for Phase 3+. Requires `/quoter` (rebuild per tooling audit) + `/sales-intelligence-advisor` 6-lens material (extracted into `/quoter`).
- **Blocker:** None for build — uses existing blocks. Pricing blocked on `/quoter` rebuild (§3.4).
- **Kick-off gate:** Can start immediately. Pricing doc blocked until `/quoter` is rebuilt.
- **End state / QC success:** All Phase 2 pages live, trade application form collecting submissions, email notifications via N8N webhooks (existing pattern). Quote doc signed off by Amir.

### 1.3 CMX Group — proposal build + quote
- **Current state:** No client dir yet. Client-provided feedback + competitor references exist (Bean has them).
- **Scope — discovery + proposal:** Build an example (pattern pages? single-page mockup?) based on client feedback and the competitors they provided. Ship quote alongside.
- **Deliverables:** Reference-matched design mockup pages (SGS blocks), wireframe of proposed site, quote doc.
- **Blocker:** None for proposal itself — uses existing blocks + `/sgs-discover` + `/design-ref`. Quote blocked on `/quoter` rebuild (§3.4).
- **Kick-off gate:** Can start immediately. Quote blocked until `/quoter` rebuilt.
- **Required first step:** Set up `sites/cmx-group/CLAUDE.md` + folder with client brief, feedback notes, competitor URLs.
- **End state / QC success:** Bean sends quote + mockup link; CMX signs off or gives redirection; if sign-off, project moves to build phase (out of Step 2 scope).

### 1.4 Snooza Chair / Ophir Solutions — 3D demo + colour picker
- **Current state:** 3D model present in `sites/snooza-chair/` (GLB/model files); Wix original site; brief in `sites/snooza-chair/CLAUDE.md`. Commit `d0a3e79` added 3D assets.
- **Scope — demo deliverable (for pitching):** A single product-page demo showing the chair rotating in 3D (Google `<model-viewer>`) with:
  - Colour picker: 6 colours (Mandarin Orange, Royal Blue, Apple Green, Grey, Hot Pink, Black)
  - Size picker: 4 sizes (Size 1 → Size 4)
  - Accessory toggles: rocker base, Snooza Lite, mobile base, pommel, leg rest (add-in/add-out components in preset places)
  - Variant swap = swap GLB model OR material/texture for colour
  - AR "view in your room" button (model-viewer built-in for iOS/Android)
- **Blocker:** **3D Configurator block + product page block + colour/variant picker block** (§3.2, 3.3).
- **Kick-off gate:** Configurator block + variant picker block shippable.
- **End state / QC success:** Bean walks into Ophir meeting with phone showing chair in AR; configurator works on desktop, tablet, mobile; colour+size+accessory changes update model in under 300 ms; demo link shareable.

### 1.5 Small Giants Studio — rebuild site (Next.js → SGS WP)
- **Current state:** Live on Vercel (Next.js). Brand docs + voice guide in `sites/small-giants-studio-v2/docs/`. Visual overhaul committed. Current status: "Pre-launch (Phase 4.5)".
- **Scope:** Rebuild on SGS WP framework. Preserve brand voice, design language, dark-mode support. Migrate content.
- **Blocker:** Full framework readiness. **Dark-mode toggle** may need framework support (§2 — mark as new framework requirement).
- **Kick-off gate:** Theme base functionality complete (§2); dark-mode toggle delivered.
- **Extra consideration:** This is SGS's own site — must exemplify the framework. Every block used here becomes de-facto showcase.
- **End state / QC success:** Parity with current Vercel site at minimum; ideally a visual uplift. DNS cut-over. Vercel deployment can be retired.

---

## 2. Theme base-functionality completion

Derived from `2026-02-21-master-feature-audit.md` (reality pass 2026-04-18). This is the P1 work-to-finish before any of the client builds in §1.3–1.5 ship with full framework coverage.

### 2.1 P1 items still outstanding (framework launch blockers)

| # | Feature | Impact (1–5) | Effort (1–5) | Notes |
|---|---------|-------------|-------------|-------|
| 2 | Column gap per breakpoint | 5 | 2 | Needs consistent implementation across all column blocks |
| 3 | Row gap per breakpoint | 5 | 2 | Paired with #2 |
| 9 | Asymmetric grid presets (2/3+1/3 etc.) | 4 | 2 | Column layout picker on `sgs/container` |
| 18 | Background overlay with opacity | 4 | 2 | Pseudo-element + controls on Hero + Container |
| 24 | Min-height per-breakpoint | 4 | 2 | Hero specifically needs this (mobile vs desktop) |
| 29 | Responsive spacing per breakpoint | 5 | 3 | `ResponsiveControl` on ALL blocks — universal extension candidate |
| 32 | Linked/unlinked spacing toggle | 4 | 2 | UI component reused across all spacing controls |
| 34 | Responsive gap per breakpoint | 4 | 2 | Per-block attribute |
| 37 | Per-breakpoint font size | 5 | 2 | Currently 7 blocks, need universal — candidate for extension |
| 99 | Block style variations (per-block presets) | 4 | 2 | Framework supports but nothing registered yet |
| 101 | Scale transform (hover) | 4 | 1 | Extension candidate — audit says not confirmed |
| 102 | Shadow elevation shift (hover) | 4 | 1 | Paired with #101 |
| 104 | Image zoom inner (hover) | 4 | 1 | |
| 106 | Reveal overlay (hover) | 4 | 1 | Gallery already has it — lift to extension |
| 125 | Icon slide on hover | 4 | 1 | Buttons + CTAs |
| 146 | Staggered grid population | 4 | 1 | Post Grid, Gallery |
| 157 | Font size responsive per breakpoint | 5 | 2 | Paired with #37 |
| 163 | Text alignment per breakpoint | 5 | 2 | ResponsiveControl pattern |

**Priority within P1:** #29 + #32 + #34 + #37 + #157 + #163 all consolidate into a single **Responsive Extension** — one big ship, then every block benefits. Build first.

### 2.2 Items deferred to P2 (post-launch, not blockers for any §1 client)

Shape dividers, progress bar, before/after image slider, timeline, logo carousel/marquee, map block, scroll-to-top reveal, conditional display by role/schedule/URL. **Deferred.** Reopen if a client brief requires them.

### 2.3 New framework requirement — dark-mode toggle (§1.5 dependency)

- **Why:** SGS Studio site uses dark-mode currently. Parity required post-rebuild.
- **Approach:** theme.json style variation switching triggered by JS toggle + `localStorage`. Ship as extension on `<body>` — token values swap on `data-theme="dark"`.
- **Effort:** 2 (extension + body-class hook + token layer in theme.json).

### 2.4 Success criteria for §2

All P1 items in 2.1 shipped, committed, verified on palestine-lives.org, captured in `/sgs-update` KB refresh. `/wp-theme-check` clean. `/visual-qa` passes on all existing SGS blocks after the responsive extension lands.

---

## 3. New framework features required for §1 clients

### 3.1 SGS Ecommerce Plugin (§1.1 Mama's Munches blocker)

**Scope (Phase 1 — minimum to ship Mama's):**
- Product CPT with price, SKU, stock, images, short/long description, category/tag taxonomy
- Variant support: size/colour/style (reusable attribute taxonomy)
- Cart — session-stored, sidebar + dedicated page
- Checkout — one-page; guest + account; Stripe Checkout session (redirect) OR Stripe Elements (in-page) — pick during gap analysis
- Order CPT — status (pending/paid/fulfilled/cancelled), customer, line items, Stripe payment intent ID
- Admin — product manager (native WP edit screens enhanced), order list with status filters, basic sales stats dashboard
- Emails — order confirmation (customer), new order alert (admin) — via existing N8N webhook pattern, NOT `wp_mail()`
- Schema — `Product`, `Offer`, `AggregateRating` on product pages (Rank Math integration)
- Blocks — `sgs/product-grid` (query loop variant), `sgs/product-card`, `sgs/product-hero`, `sgs/add-to-cart`, `sgs/cart-drawer`, `sgs/checkout`, `sgs/order-summary`

**Phase 2 (not required for Mama's launch):** discount codes, shipping zones/rates, tax tables, abandoned cart recovery, customer accounts beyond guest-checkout, inventory per-variant.

**Why not WooCommerce:** Bean's call. Avoids fighting Woo's opinionated stack; keeps the ecom inside the framework's block-first editor philosophy.

**Effort estimate:** 4–6 weeks elapsed by `/wp-sgs-developer` with autonomous loops, subject to Step 4 toolset gap-analysis confirming the agent can carry this without per-step human QC.

**Spec doc:** Create `specs/10-SGS-ECOMMERCE.md` before build starts.

### 3.2 3D Configurator Block (§1.4 Snooza blocker)

**Scope:**
- Block: `sgs/3d-configurator`
- Core renderer: Google `<model-viewer>` web component (approved approach; fallback to three.js only if Ophir's fidelity bar isn't met)
- Attributes:
  - `primaryModel` (glTF/GLB upload; attachment ID stored)
  - `variants` (array of named variant sets — e.g. "Size 1 Orange", with per-variant model ID OR material/texture override)
  - `accessories` (array of add-in components — each has name, GLB model, preset anchor point, toggleable)
  - `colourPalette` (array of colour swatches — name, hex, material map or GLB variant)
  - `initialCamera` (orbit position)
  - `autoRotate` (boolean)
  - `arEnabled` (boolean — model-viewer's built-in AR)
  - `background`, `lighting` (presets)
- Editor UX: InspectorControls for each attribute group; thumbnails for variants; drag-and-drop model upload
- Frontend UX: Rotate (mouse drag / touch drag), zoom (scroll / pinch), AR button (auto-hidden on unsupported devices), swatch picker, size picker, accessory checkboxes
- Performance: lazy-load model-viewer polyfill; only load GLBs on-demand; hint `importance="high"` on initial model
- Accessibility: keyboard rotation (arrow keys), screen-reader description of current config, alternate 2D image fallback

**Effort estimate:** 2–3 weeks once §3.3 lands.

**Spec doc:** Create `specs/11-SGS-3D-CONFIGURATOR.md`.

### 3.3 Product page + variant/colour picker block (§1.4 Snooza + §1.1 Mama's shared)

**Scope:**
- Block: `sgs/product-page` (or extend existing product blocks from §3.1)
- Integrates with Ecommerce product CPT (§3.1) AND configurator block (§3.2) — when a product has a 3D model attached, configurator replaces the image gallery
- Variant/colour picker component — same UI drives §3.1 ecom variants AND §3.2 configurator colour swatches — **reuse, don't duplicate**
- Price updates on variant change (ecom mode)
- Stock indicator per variant
- "Add to cart" integrates with cart drawer from §3.1
- Mobile: sticky add-to-cart bar

**Effort estimate:** 1–2 weeks, parallel to §3.1 once variant schema stable.

### 3.4 Quote/pricing system — `/quoter` rebuild (§1.2 + §1.3 blocker)

Per tooling audit + prior decisions in this session:
- **REBUILD `/quoter`** standalone with 5 ADHD friction resolvers (scope-creep detection, tiered scope menu, transparent ADHD buffer, ranked timeline scenarios, thread closure before finalising)
- **Extract 6-lens business-strategy framework + challenge library** from `/sales-intelligence-advisor` into `/quoter`
- **DELETE** `/sales-intelligence-advisor` from Bean's system (Amir retains his copy)
- **KEEP + adapter** `/lead-research-assistant` — one-way feed into `/quoter` (prospect research → scope seed)

**Effort estimate:** 1 week for rebuild + delete + adapter chain. Runs in Track A alongside framework work.

**Blocks:** §1.2 pricing + §1.3 quote.

### 3.5 Dark-mode toggle (§1.5 blocker, see §2.3)

Already captured in §2.

---

## 4. Parallel-track sequencing + dependency graph

### Track A — Framework & tooling build-out (zero client deps)

Sequence (earliest first):

1. **Step 3 + Step 4 of master plan** — toolset gap analysis + per-tool improvement. **Precedes all framework work** (tooling has to be reliable before `/wp-sgs-developer` carries the load).
2. **Responsive Extension** (§2.1 #29/32/34/37/157/163 consolidated) — unlocks responsive controls on all blocks.
3. **Hover Extension completion** (§2.1 #101/102/104/106/125) — lifts gallery/post-grid-only behaviours into universal extension.
4. **`/quoter` rebuild** (§3.4) — unblocks Indus pricing + CMX quote.
5. **Dark-mode extension** (§2.3) — unblocks SGS Studio rebuild.
6. **SGS Ecommerce Plugin Phase 1** (§3.1) — unblocks Mama's Munches.
7. **Variant/Colour Picker block** (§3.3) — shared component for §3.1 + §3.2.
8. **3D Configurator block** (§3.2) — unblocks Snooza demo.
9. **Block style variations registration** (§2.1 #99) — polish before SGS Studio rebuild.

### Track B — Client builds (start when blocker clears)

| Client | Start when | Overlaps with |
|--------|-----------|---------------|
| **Indus Foods Phase 2 (build)** | Immediately (uses existing blocks) | Track A runs in parallel |
| **Indus Foods pricing doc** | A4 done | — |
| **CMX Group proposal (design)** | Immediately | Track A parallel |
| **CMX Group quote doc** | A4 done | — |
| **Snooza demo** | A7 + A8 done | — |
| **Mama's Munches build** | A6 shipped | Product page (A7) can land mid-build |
| **SGS Studio rebuild** | A5 + responsive extension (A2) done | Other track-A work continues |

### Dependency graph (text form)

```
Toolset (Steps 3+4)
    ↓
    ├── A2 Responsive Ext ──┐
    │                       ├──→ SGS Studio rebuild (1.5)
    │                       │    (+ A5 Dark-mode)
    ├── A3 Hover Ext        │
    │                       │
    ├── A4 /quoter rebuild ─┼──→ Indus pricing (1.2) + CMX quote (1.3)
    │                       │
    ├── A6 Ecommerce Plugin ┼──→ Mama's Munches (1.1)
    │         ↓             │
    ├── A7 Variant Picker ──┤
    │         ↓             │
    └── A8 3D Configurator ─┴──→ Snooza demo (1.4)
```

Indus Phase 2 build and CMX proposal design kick off in parallel to Track A from day one — neither has a framework blocker for the build itself.

---

## 5. Success criteria — "Bean as QC/internal client only"

For each client, what "zero human intervention" means concretely:

| Client | Bean's QC touchpoints | Everything else by toolset |
|--------|----------------------|----------------------------|
| Mama's Munches | (1) brand/design sign-off on mockup, (2) pre-launch review | Content migration, product data entry, image optimisation, cart/checkout testing, Stripe setup, DNS cutover, post-launch monitoring — all automated or agent-driven |
| Indus Foods Phase 2 | (1) mockup sign-off per page, (2) form copy review, (3) pricing doc approval, (4) pre-launch | All page assembly, content migration, form wiring, N8N webhook config, visual QA loop |
| CMX Group | (1) proposal design sign-off, (2) quote approval | Competitor research, mockup generation, schema setup, quote build |
| Snooza Chair | (1) configurator fidelity sign-off, (2) demo link review | 3D model processing, variant setup, AR testing cross-device, copy drafting |
| SGS Studio | (1) design-language preservation check, (2) content parity review, (3) cutover | Content migration from Next.js, block mapping, dark-mode toggle, DNS cutover |

**If Bean has to intervene beyond these touchpoints, the toolset has failed** → correction captured by lifecycle system → fed back into per-tool gap analysis → tool improved for the next client.

This is the recurrence detection loop — the system gets more autonomous over time, not less.

---

## 6. Risks & unknowns — flagged for Step 3 gap analysis

These are the gaps most likely to require human intervention unless closed by the toolset:

1. **3D Configurator fidelity threshold** — can `<model-viewer>` handle material-swapping + accessory-toggling at the Ophir-demo fidelity bar? **Gap 3 action:** research + prototype before committing to A8. Fallback: three.js build (larger effort).
2. **Ecom scope creep** — the Phase 1 checklist is aggressive. **Gap 3 action:** verify each block in §3.1 is genuinely Phase 1; defer anything that only Mama's specifically needs to Phase 2.
3. **Stripe integration pattern** — Checkout session (redirect) vs Elements (in-page) is a UX/tax/compliance decision. **Gap 3 action:** decide during §3.1 kick-off.
4. **CMX competitor research depth** — client gave competitors + feedback; is `/sgs-discover` + `/design-ref` enough to produce a credible reference-matched proposal? **Gap 3 action:** confirm tool coverage.
5. **Indus Phase 2 pricing data** — no market/competitor pricing intel captured yet. **Gap 3 action:** check if `/sales-intelligence-advisor` 6-lens output applies to web-agency pricing (it was built for wholesale).
6. **SGS Studio content migration** — Next.js pages → WP blocks is not a trivial port. **Gap 3 action:** assess `/sgs-extraction` + `/design-ref` for Next.js sources (not just WP sites).
7. **Toolset readiness** — the TOOLING-REFERENCE workbook has ~80% `[audit needed]` blocks. Step 4 populates these before Step 5 executes. **Do not start Track A framework work before Step 4 lands** — risk of shipping code the toolset can't maintain.
8. **Client dir setup** — Mama's Munches + CMX Group don't have `sites/<client>/` dirs. Setup per client = SGS pipeline #5 (client onboarding) from TOOLING-REFERENCE. **Gap 3 action:** is this pipeline productised or ad-hoc?
9. **Brand/design for Mama's Munches** — only logo is set; everything else is TBD. Design discovery needed before build.
10. **Continuous-improvement loop** — the correction-ledger system works in CC, but is it surfaced to `/wp-sgs-developer` mid-build so the agent doesn't repeat errors? **Gap 3 action:** verify.

---

## 7. Exit criteria for Step 2

This plan is DONE when:

- [x] Client list confirmed (5 clients, Bean's order — captured §1)
- [x] Ecom scope confirmed (full shop — §3.1)
- [x] 3D approach confirmed (model-viewer — §3.2)
- [x] Framework gap list derived from the 2026-04-18 audit (§2)
- [x] Dependency graph shows no circular blockers (§4)
- [x] Success criteria defined per client (§5)
- [x] Risks flagged for Step 3 (§6)
- [ ] Spec docs stubbed: `specs/10-SGS-ECOMMERCE.md`, `specs/11-SGS-3D-CONFIGURATOR.md` — **defer to Step 5 kickoff**
- [ ] `sites/mamas-munches/` + `sites/cmx-group/` dirs created with CLAUDE.md + brief — **defer to Step 5 kickoff**

**Next action:** Step 3 — gap-analysis on the full toolset against this plan. Optimisation axes: quality, consistency/reliability, low human QC, token efficiency.

---

## 8. What this plan explicitly does NOT do

- Does not set dates. All estimates are relative. Real scheduling happens post-Step 3 when the toolset's actual throughput is measured.
- Does not pick Stripe integration pattern (redirect vs Elements) — deferred to §3.1 kick-off.
- Does not size the CMX/Mama's Munches discovery time — varies by brand depth. Captured as Step 5 input.
- Does not over-specify the configurator accessory anchor-point system — that's a §3.2 design decision.
- Does not decide whether to migrate Indus Foods from test site to live domain during Phase 2 or defer to Phase 3 — Amir decides.

---

## 9. Decision log (captured this session)

| Decision | Made | Captured |
|---------|------|----------|
| Client order = Bean's listed order (Mama's → Indus → CMX → Snooza → SGS) | 2026-04-21 | §1 |
| Ecom scope = full shop with cart/checkout/Stripe/variants | 2026-04-21 | §3.1 |
| 3D renderer = Google `<model-viewer>` (fallback three.js) | 2026-04-21 | §3.2 |
| `/quoter` path = rebuild + extract 6 lenses + challenge library from sales-intel; DELETE sales-intel | 2026-04-21 | §3.4 |
| Parallel tracks: framework (A) + client (B); clients start when their blockers clear | 2026-04-21 | §4 |
| Zero-QC definition locked per client | 2026-04-21 | §5 |
