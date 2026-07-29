---
doc_type: design-gate
project: small-giants-wp
date: 2026-07-29
status: AWAITING BEAN SIGN-OFF — nothing built. Rule-7 gate (shared-mechanism change).
governs: the merged Spec 36 + Spec 37 execution track — drawer CPT move, nav-menu controllability,
  clone-first POC sequencing, harness honesty. Supersedes the per-track sequencing in both specs'
  build sections once signed.
inputs: Bean's decisions 2026-07-29 (drawer rejection review + Q1-Q3 answers + merge directive);
  the drawer track's own CPT recommendation; reports/2026-07-28-drawer-code-extraction/;
  reports/2026-07-29-nav-drawer-variants-task5-exit-gate.md (REJECTED).
---

# Architecture gate — one nav system: merged 36/37 execution, drawer CPT, clone-first POC

## 0. Bean's locked inputs (recorded 2026-07-29 — these are decisions, not proposals)

- **Q1:** B3 header roster = 7 invented cut to keep Warm out, **plus the headers/footers of the
  drawer reference sites** that aren't already covered. POC = **100% clone including all content,
  images, colours, typography**.
- **Merge:** Spec 36 and Spec 37 execution merges into ONE track — *"the nav drawer clones won't
  sit right without their header counterpart looking the part, functioning the same, and being in
  the same positioning as the originals."*
- **Q3:** existing starters — retire the 3 structural duplicates (`centred`, `minimal`, `full`),
  keep `scratch` + the 3 search-bar variants (capability, not look).
- **Controllability (standing requirement):** everything coded into these drawers/headers/footers
  becomes a client-controllable element or attribute. No baked-in developer-only values.
- **CPT:** Bean raised drawer-as-CPT independently; the drawer track concurred and design-gated it
  here rather than building. Bean's read on nav-menu: probably NOT its own CPT; more control in the
  header CPT instead; the nav-menu↔drawer relation needs overhauling to match.

## 1. The decisions (DP-numbered; each with recommendation + the honest counterweight)

### DP1 — Merge the EXECUTION of Specs 36+37 into one track. Keep the two spec DOCUMENTS separate.

One track, one implementation plan, one exit gate, one owner-session at a time. The evidence for
the merge is already in the project's own findings: Task-5's F2 (a broken header at 375px) was
discovered by the drawer track, filed as "belongs to the header track", and therefore fixed by
nobody. Mechanically the two are inseparable — the drawer's `header` anchor derives from header
height, the burger lives in the header, colour inheritance flows from it.

**Keep two spec docs** because they already cross-amend in the same commit by Spec 37 §1.2's own
boundary rule, which gives the coupling benefit without merging ~2,000 lines of ratified spec —
doc churn this project just spent two sessions paying down. The merge is operational, not textual.

*Counterweight:* one track serialises work that previously ran in parallel. Accepted — the parallel
tracks are what produced a drawer judged without its header.

### DP2 — `sgs/nav-drawer` moves to a CPT. The block becomes the CPT's renderer, not its home.

**Model (mirrors what already exists for headers/footers — no new machinery invented):**
- New CPT `sgs_drawer` in the same family as the header/footer CPTs: same registration pattern,
  same admin list, same Active/preview model (`get_active_id()` + FR-37-41 preview-before-active),
  same revisions-for-free.
- A drawer post's CONTENT is the existing block markup (nav-drawer wrapping nav-menu + secondary
  blocks) — the InnerBlocks composition is unchanged; only where it LIVES changes.
- `sgs/nav-drawer` the block stays as the render vehicle inside the CPT. On the front end the
  active/referenced drawer post renders once per page (site-footer-adjacent, as now), killing the
  duplicate-id class by construction.
- **`drawerRef` is re-typed from a DOM-id string to a drawer post reference.** Today it is
  `sanitize_html_class(string)` (`nav-menu/render.php:325`) pointing at a hand-typed DOM id — the
  exact "operator types a magic string" shape FR-36-9a already had to bolt a warning onto. It
  becomes a post ID + a picker control ("Which menu panel does this burger open?") listing drawer
  posts by title, with "Create one" inline. The FR-36-9a dangling-ref warning survives but now
  fires on a deleted/draft post instead of a typo'd string.
- **`variantPreset` dies.** The 7 looks become **drawer starter patterns** offered by the CPT's
  native starter-pattern picker — the SAME mechanism the header CPT already uses (D377/D393-hardened,
  ≥2 patterns + no template seed = native picker, zero custom UI). A "variant" stops being a
  block-variation that bakes defaults and becomes a fully-editable starting document. This resolves
  `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` by dissolution: presets become content, and content
  needs no discriminator signature.

**Why this is the right shape for Bean's controllability rule:** a CPT gives every drawer a real
edit screen. Client control = open the drawer in its own editor, exactly like headers. A
block-variation gives a developer preset with defaults baked at insert time — structurally wrong
for "clients set this up later".

*Counterweight (the drawer track's, kept honest):* the CPT changes where a drawer lives, not how
faithfully it paints. The invisible icon-list text, the missing align class, the styling/imagery/
motion gap all exist on either path. The CPT is sequenced FIRST only because rebuilding fixtures on
the block path is wasted work once the container changes — not because it fixes fidelity.

**Migration:** stored instances live in the 8 header starter patterns + canary fixture pages. Per
the no-deprecations rule (D270/D293, pre-production): hard cut, no `deprecated.js`. The 8 header
patterns drop their embedded drawer; a seed step creates one default `sgs_drawer` post per site
(same as the header/footer seeding); canary fixture pages are rebuilt by the POC work anyway.
The FR-36-9a "Add the mobile menu" one-click fix changes from "insert a sibling block" to "create
a drawer post + set the reference" — same UX, better outcome.

### DP3 — nav-menu does NOT get a CPT. (Bean's instinct; the code agrees.)

Three reasons, in order of weight:
1. **Its content already has a home.** The menu ITEMS live in WP's classic menu system
   (`wp_nav_menu`, screen at Appearance→Menus) — that IS a storage layer with its own edit surface.
   A nav-menu CPT would triple-indirect: header CPT → nav-menu CPT → classic menu, three screens to
   answer "why did my menu change?".
2. **Its presentation belongs to the header.** nav-menu is a leaf inside the header CPT's
   composition; the header edit screen IS the natural place to style it — which is Bean's "more
   control over it in the header CPT" position, and it's correct.
3. **The mega precedent doesn't apply.** Mega panels are posts because a PANEL is a rich document.
   A nav-menu is a projection of a menu — no document-shaped content of its own.

**What it gets instead (the overhaul):** the relation and the presentation both upgrade —
- `drawerRef` → drawer-post picker (DP2).
- **The burger becomes a first-class controllable element** (DP4).
- Nav-menu presentation controls remain block attrs on the instance inside the header CPT — which,
  post-DP2, means every nav control lives on ONE edit screen (the header's), matching Bean's ask.

### DP4 — The burger trigger becomes a designed, controllable element (closed AND open state)

Today's block.json has burger colour/bg/hover/size — but NO way to change what the trigger IS.
The references make this table stakes: studionamma renders the word "MENU", fantasy a symbol,
lamalama a morphing glyph. New attrs on nav-menu (all inspector-controlled, Spec 35-conformant):

| Attr | Type | What the client sets |
|---|---|---|
| `triggerStyle` | enum: `burger` \| `word` \| `word-burger` \| `symbol` | what the closed trigger looks like |
| `triggerLabel` | string, default "Menu" | the word, when word/word-burger |
| `triggerSymbol` | icon (shared `IconPicker` — already built, 12-block precedent) | the symbol, when symbol |
| `triggerOpenStyle` | enum: `morph-x` \| `swap-label` \| `unchanged` | what it becomes while the drawer is open |
| `triggerOpenLabel` | string, default "Close" | the open-state word, when swap-label |

The open-state wiring is the cross-block state already parked as `P-DRAWER-BURGER-MORPH-SYNC`
(`store('sgs/nav')`) — this DP promotes it from parked follow-on to a named build item, since
Bean's requirement makes it core, not polish. The drawer's own `closeStyle` stays on the drawer
(CPT-side): trigger = nav-menu's, close chrome = drawer's.

### DP5 — The controllability contract (the test every reference-derived value must pass)

For each visual/behavioural property lifted from a reference site, the build must answer: **which
of exactly three homes does it live in?**
1. **Drawer-CPT / header-CPT content or attrs** — per-instance design (layout, alignment, columns,
   surface colour/blur, per-block styling). Edited on the CPT screen.
2. **Block inspector attrs** — per-element controls (trigger style, link sizing, hover motion),
   Spec 35-conformant, in the manifest.
3. **Theme tokens** — brand colour/typography, so presets restyle per client automatically.

**A value with no home is a build defect** — the same class as a hardcoded wrapper default
("hardcode-is-override-not-literal"). The implementation plan must ship a per-property homes table
for the first clone, reviewed at its gate; the audit-inspector-conformance prebuild gate already
fails on unmanifested controls, giving this mechanical teeth for home #2.

### DP6 — Clone-first sequencing: ONE reference site 100%, then the rest. B3 merges into this work.

- POC = **studionamma first**, complete: header + drawer + footer, 100% clone — content, imagery,
  colours, typography, motion, positioning, mobile behaviour (its header CTA migrating into the
  drawer list at mobile is a genuine content-role migration and will stress DP4/DP5 properly).
- Bean's eye on that ONE clone before any of the other six are attempted. Seven parallel
  half-clones is the exact shape that produced the 2026-07-29 rejection.
- **Each accepted clone yields a header preset + footer preset + drawer starter** — B3's roster
  stops being a separate authoring job: 7 cloned pairs (buck, dogstudio, fantasy, lamalama, lusion,
  studionamma, wearecollins) + invented fills only where the references leave a gap (**Utility**
  commerce header/footer, **Overlay** hero-contrast header, **Directory** footer). resn is
  WebGL — reference-only, excluded.
- Q3 applied at the end: retire `header-centred/minimal/full`, keep `scratch` + 3 search variants.

### DP7 — Harness honesty gates the first re-present (no re-review before these exist)

1. **Screenshot capture asserts the panel is OPEN** (non-zero box + `dialog[open]` + ≥1 visible
   focusable) before saving, else exits VACUOUS — the same guard the axe harness got on 2026-07-29;
   the capture harness demonstrably did not (two-column-editorial's "reference" was the closed
   homepage; solid-brand-light had no reference at all).
2. **Contrast sweep walks EVERY text element in the surface**, not one selector — the 1:1-contrast
   icon-list text passed because the check only measured `.sgs-nav-menu__link-text`.
3. **Content fidelity is verified against the per-variant source** (`labels-<site>.json` counts +
   labels), and the harness FAILS on mismatch. It must also verify against the RIGHT site — the
   3-vs-7 misdiagnosis happened by comparing one variant against another variant's reference.

## 2. What dies, what survives

| Thing | Fate |
|---|---|
| `variantPreset` attr + 7 `registerBlockVariation`s | **Dies** → 7 drawer starter patterns (CPT picker) |
| `drawerRef` as DOM-id string | **Dies** → drawer post reference + picker |
| `P-NAV-DRAWER-VARIANTS-NO-DISCRIMINATORS` | Resolved by dissolution (presets become content) |
| `P-DRAWER-BURGER-MORPH-SYNC` | Promoted into DP4 (core, not parked) |
| Drawer block markup / InnerBlocks composition | Survives unchanged inside the CPT |
| Backdrop-click/ESC/focus store (`store('sgs/nav')`) | Survives; gains open-state trigger sync |
| 16 pattern-embedded drawer instances | Migrated: patterns slim down, seed step creates default drawer post |
| Task-5 measurement harness | Survives with DP7 fixes; axe openness guard already done |

## 3. Open questions for Bean (only what the gate can't decide)

1. **CPT admin naming:** "Menu Panels" or "Drawers" in the admin sidebar? (Client-facing word —
   recommend **"Menu Panels"**, matching the FR-36-9a notice language already shipped.)
2. **One drawer per site or per-header?** Recommend: site-wide Active default (like footer) +
   per-nav-menu override via the picker — covers the 99% case and the odd landing-page exception.
3. **First clone = studionamma?** (Reasoned in DP6; swap freely if you'd rather judge a different
   look first.)

## 4. What happens after sign-off (next session, in order)

1. `/strategic-plan` for the merged track: CPT build → migration → harness fixes → studionamma
   clone → Bean's eye → parallel remaining 6 → preset extraction → Q3 starter retirement.
2. Spec 36 + Spec 37 amended in the SAME commit (37 §1.2 rule): drawer CPT ownership lands in 37's
   CPT family sections; 36 keeps drawer behaviour/a11y; both mark variantPreset retired.
3. Nothing renders differently until the studionamma gate — the CPT move is judged by "default
   instances render property-identical", the same bar the variant build used (D403).
