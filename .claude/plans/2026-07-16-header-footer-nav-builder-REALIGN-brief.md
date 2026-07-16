---
doc_type: handoff
project: small-giants-wp
thread: Header/footer/nav BUILDER REALIGNMENT — vision-vs-reality reconciliation + research plan (Bean-approved end-goals, NOT yet designed/built)
generated: 2026-07-16
---

# Header/Footer/Nav Builder REALIGNMENT — handoff brief

**This is a REALIGNMENT brief, not a build plan.** Two investigation agents reconciled
Bean's stated vision against the specs, git history, and live code this session. Read this
brief in full before touching header/footer/nav work — it supersedes the framing in the
rest of `next-session-prompt.md` for anything builder/mode/bar-drawer/pattern-related.
Everything else in `next-session-prompt.md` (Phase 1 drawer polish, Step 1 framework-vs-
per-site split, Goals 1/3/4) still stands and is NOT superseded — see the pointer at the
top of that file.

## 1. Why this brief exists

Bean has been describing a header/footer "builder" for several sessions. This session
established that **no such builder surface exists** — what's live is native Site-Editor
template-part editing plus a block-inspector panel on `sgs/site-header`. A prior
`Sgs_Header_Customiser` WAS built, then deliberately retired (commit `87dd869d` / D329) in
favour of Site-Editor block editing. A "guided header-building UX in the Site Editor" was
scoped as Track B Task 2 but its design-gate doc was never written and nothing was built.
So a builder was promised and then quietly dropped. This brief captures the reconciled
truth and the Bean-approved target so the gap doesn't recur.

## 2. The reconciliation — vision vs reality, point by point

### 2.1 Specialist builder UI
- **Vision:** a dedicated, discoverable Site-Editor header/footer builder — Spectra-
  Customiser-*equivalent in spirit*, NOT a literal WP Customiser (that's legacy
  classic-theme tooling; `Sgs_Header_Customiser` was built then deliberately retired at
  `87dd869d`/D329 in favour of Site-Editor block editing).
- **Reality:** no builder surface. Only native Site-Editor template-part editing + a
  block-inspector panel on `sgs/site-header`.
- **Target:** a dedicated Site-Editor builder panel — a `PluginSidebar` or custom
  Site-Editor UI, purpose-built and prominent/discoverable. Its design-gate was never
  written; write it before building (Rule 7, high-blast-radius shared surface).

### 2.2 Header modes (sticky / transparent / shrink)
- **Reality (already correct — do not re-litigate):** independent, non-mutually-exclusive
  toggles (`headerSticky` / `headerTransparent` / `headerShrink`, shipped FR-S9-9 — sticky
  AND transparent can co-exist today). Bean's "mutually-exclusive / separate-patterns"
  worry does NOT apply to the live system.
- **Missing (new scope, not yet designed):**
  (a) **partial transparency** — per-row transparency, not whole-header;
  (b) **partial sticking** — only essential rows stay on scroll, others scroll away
      (currently only an unbuilt Blocksy "per-row-combination" design note exists — no
      spec, no code);
  (c) **a separate sticky-header configuration** — a genuinely different header
      (different blocks/colours/transparency) that swaps in once stuck, not just a CSS
      state change on the same markup;
  (d) **shrink as an extension of sticky**, not an independent third toggle as it is now.
- **Target:** design all four as an extension of the existing independent-toggle model —
  do not throw away FR-S9-9, extend it.

### 2.3 Bar ↔ drawer (desktop nav bar vs mobile disclosure drawer)
- **Reality:** one shared menu DATA SOURCE (built, working) but SEPARATE styling — 7
  link-styling attrs duplicated with different defaults (`linkColour` / `linkHoverColour`
  / `linkFontSize` / `linkFontWeight` / `linkFontStyle` / `linkLineHeight` /
  `linkLineHeightUnit`), dividers drawer-only, and (as of this session's hover fix on
  `main`) `hoverStyle` / `hoverBgColour` drawer-only too.
- **Bean's correction this session (load-bearing — do not build strict identity):**
  target = **CAPABILITY PARITY, NOT identity**. The bar, the drawer, AND each of the 3
  breakpoints must expose the SAME capabilities/settings, but keep INDEPENDENT
  content/values per surface + per breakpoint. Reasons Bean gave: different input
  (desktop mouse vs mobile/tablet touch), different placement (bar sits IN the header
  sharing space with other blocks; drawer is a modal overlay), different space
  constraints (a mobile header may fit an address + buttons; some phones can't fit 2
  buttons side by side).
- **Target:** a capability-parity attribute model — same attribute SET available on bar
  + drawer + each breakpoint, independently valued. This is the load-bearing design
  constraint for Realigned-Goal C below; do not collapse bar and drawer onto one shared
  value set.

### 2.4 Legacy core-block header patterns
- `header-minimal.php` / `header-centred.php` / `header-full.php` use `core/navigation` +
  `core/site-logo` and throw "Block contains unexpected/invalid content" — they are dead
  weight. Retire or migrate them (separate cleanup task; the live `header.html` +
  `framework-header-default.php` are already 100% SGS blocks, so this doesn't block
  anything else).

## 3. The REALIGNED end-goals (Bean-approved this session)

- **A — Dedicated Site-Editor header/footer builder panel.** Top-level/prominent,
  purpose-built; NOT a Customiser. Design-gate doc: write it (never written before).
- **B — Keep the independent toggles; extend them.** Add partial transparency + partial
  sticking + a separate sticky-header configuration; remodel shrink as an extension of
  sticky rather than a third independent toggle.
- **C — Capability-parity unification of bar + drawer + the 3 breakpoints.** Same
  capabilities everywhere, independent content/values per surface + breakpoint. NOT
  identity.
- **D — Retire the legacy core-block header patterns** (`header-minimal.php`,
  `header-centred.php`, `header-full.php`).
- **Overarching framing (Bean, verbatim intent):** the nav system must carry ALL of
  `core/navigation`'s functionality AND extend it; per-block per-breakpoint settings AND
  content; completely different headers/footers per context (e.g. sticky vs resting).
  **The comprehensive gap analysis is the assistant's job** (acting as WP/UX/CRO expert)
  — Bean only flags symptoms; he should never have to invent the full requirement list
  himself (ADHD Rule 1/9 — menu + ranking, never a blank page).

## 4. MANDATORY deep-research phase — run BEFORE designing or building anything

Bean's explicit instruction: *"do the deep research needed before you build the end
version."* This gates Section 5 — do not skip to spec-writing.

**Skills to invoke (in this order):**
1. `/research-council` or `/deep-research` (formal, peer-reviewed, 10+ sources — this is
   a high-stakes shared-surface architectural decision, not a quick lookup)
2. `/research-buddies` (cutting-edge community-validated sources: Reddit, GitHub issues,
   wp.org support threads — what real builder users actually hit)
3. `/ui-ux-pro-max` (design-system intelligence DB — palettes/patterns/Rosetta-Stone
   cross-platform equivalents; also the canonical skill for any new draft mockup work)
4. `/sgs-wp-engine` (ground the findings against the live SGS block/attribute schema
   before proposing changes)

**Research must produce a feature/gap matrix covering:**

1. **`core/navigation` feature-parity audit** — every capability of WP core's Navigation
   block (+ `core/site-logo`, `core/template-part` header behaviours) that SGS nav must
   match or explicitly supersede.
2. **Competitor header/footer/nav BUILDER feature matrices** — Spectra, Kadence, Astra,
   Blocksy, Elementor, Bricks, GenerateBlocks. Cover: where the builder UI lives and how
   discoverable it is; header modes (sticky/transparent/shrink + partial variants +
   separate-sticky-config); per-breakpoint content+settings model; mega-menu; mobile
   drawer patterns.
3. **Reviews / complaints / CRO feedback** on those builders — what users hate, what's
   missing, conversion-impacting header/nav patterns (sticky CTA, mobile call button,
   cart, trust signals). Search `site:reddit.com`, `site:wordpress.org/support`, G2,
   Trustpilot for each competitor by name + "review"/"complaint"/"hate"/"missing".
4. **Output:** a feature/gap matrix + a prioritised adopt / improve / innovate list. This
   feeds the realigned spec in Section 5 — do not start Section 5 without it.

## 5. After research: realigned spec → design-gate → Bean sign-off → phased build

1. Fold the realigned end-goals (Section 3) into **Spec 17 §S9** + **Spec 34**. Note:
   **Spec 33 Part 2** (header/footer clone extraction) is the clone-side counterpart —
   cross-reference, don't duplicate.
2. Write the builder-UX design-gate doc (never written before — this is the actual gap
   that let "no builder" ship silently).
3. Run `/adversarial-council` on the design before any build starts (Rule 7 — high-blast-
   radius shared surface: header/footer/nav touches every client site).
4. Phase the build (Rule R-31-5 — phases never ship as single commits). Likely shape,
   confirm against the research findings first:
   - Phase 1 — capability-parity attribute model (Section 2.3 / Goal C)
   - Phase 2 — builder panel (Goal A)
   - Phase 3 — advanced header modes: partial transparency/sticking, separate sticky
     config, shrink-as-extension-of-sticky (Goal B)
   - Phase 4 — legacy pattern retirement (Goal D)
   Each phase: its own dispatch, live-verified on both sites, Bean sign-off (R-31-13).

## 6. Also record — session state at handoff time

- Everything else this session shipped is LIVE on both sites; `main` = current
  `origin/main` (drawer WCAG hover fix `e8d7bd29`, Mama's charcoal polish, Phase 2, the
  full 3-branch merge, cart guard). The Indus orphaned LiteSpeed `object-cache.php` was
  moved to backup (error fixed).
- A merge worktree at `../sgs-main-merge` (this repo) is still in place — it has a
  `node_modules` junction and a temp `.claude/secrets/sandybrown.env` copy. Remove the
  junction + temp secret via PowerShell BEFORE `git worktree remove`, or it risks the
  shared `node_modules`.
- **Spec 34's own remaining polish is SUBSUMED into this realignment**, not dropped:
  Step 5 drawer settings (FR-34-5), Gate C, and the Step 7 round-trip proof. The drawer
  settings become part of the capability-parity model (Goal C) rather than a separate
  Spec-34-only task — don't build them twice.

## 7. What this brief does NOT cover

- Phase 1 (drawer resting-link-colour polish), the framework-vs-per-site header/footer
  split (Step 1), and Goals 1/3/4 (Indus replication, de-hardcoding base blocks, Mama's
  draft match) are all UNCHANGED by this brief — see `next-session-prompt.md` for those,
  they are not superseded.
- This brief does not itself contain a build plan — Section 4 (research) must run and
  produce the gap matrix before Section 5 (spec/design-gate/phased build) can start.

## Additional owner direction (2026-07-16, round 2)

**Build sequencing — decide this explicitly in planning:** what comes first — the
header/footer FORMAT/architecture (the capability + data model: what header/footer/nav CAN
do, per-surface and per-breakpoint) or the visual BUILDER (the UI that configures it)?
Assistant's lean to validate: architecture/data-model FIRST because the builder is a UI
over it and can't be meaningfully built until the model is defined — but they inform each
other, so design together with architecture leading. The planning session must state the
decision + rationale.

**Be critical of our OWN current features, not just competitors — hunt superior
alternatives.** Explicitly re-examine current SGS approaches for better designs, e.g.:
(a) the cart icon's spawn / hide-when-empty / WooCommerce-gated blocking behaviour;
(b) the whole nav-block setup (adaptive-nav + nav-menu split). For each, ask: is it better
to REPLICATE the core block and extend it to meet our needs, or to UNIFY certain aspects
and choose SEPARATION along a different axis than we do now? Produce a critical
"keep / improve / replace" verdict per current feature.

**Block-based competitor analysis + build-vs-adopt decision.** Answer concretely:
(1) What does our top competition do for header/footer/nav builders?
(2) What is the top competitor that does it BLOCK-BASED (FSE/Site-Editor-native, not
    Customiser)?
(3) Is there ANY competitor with a Site Editor + block-based header/footer builder? If
    YES: how hard would it be to SKIP much of the foundational building and ADOPT their
    approach, changing it to our requirements (evaluate feasibility + licensing + fit)?
(4) If NO block-based competitor builder exists: does that matter — is it a differentiator
    opportunity or a warning sign? State the build-vs-adopt recommendation with reasoning.

**Architecture decision + reflect it in the builder.** How do we DECIDE our
header/footer architecture (the format, the row/slot model, the capability set, per-
breakpoint content model), and how does the visual builder faithfully REFLECT and expose
that architecture? The output must connect the architecture and the builder as one
coherent thing.

**North-star (the acceptance bar):** all of the above must connect + harmonise the many
parts into ONE system that is simple in its essence and even simpler to use. Simplicity of
the end operator experience is the primary success criterion, however complex the
underlying model.

**Recommended planning setup (assistant's recommendation to Bean):** run the planning
session on **Opus at high→max reasoning effort** (architectural design + novel synthesis +
critical evaluation + adversarial validation — top of the reasoning-demand spectrum;
Sonnet would under-serve it). Delegate the RESEARCH to Sonnet researchers (fast, thorough
tool access for competitor-feature + reviews/complaints hunting) synthesised by Opus — use
`/research-council` or `/deep-research` for competitor + CRO research, `/gap-analysis` to
grade current features critically, and an `/adversarial-council` on the final design
before any build (Rule 7).
