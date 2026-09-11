# Header/footer implementation — next session prompt

Invoke `/autopilot` before doing anything else.

## What this session is for

Mama's Munches is running a generic framework header and footer, not its own
branded ones. Spec 37 already built the mechanism to fix this — a CPT-based
editor where an operator writes a header or footer once and sets it active.
Nobody has ever authored the real branded content into that mechanism for
this client. That's the job: author it, verify it against the draft, close
the two parking items that already name this gap.

## What we saw today (evidence, not guesses)

A three-viewport visual comparison (desktop/tablet/mobile) of the Mama's
Munches homepage clone found the page body — hero through the gift section —
genuinely faithful to the draft. The header and footer were the exception:

**Header**
- The "Send to Ward ★" nav item is a filled pink pill button in the draft.
  On the live site it renders as plain text — no background, no star.
- The live header shows a dropdown arrow next to "Our Story" and phone/
  email/Instagram icons in the top right. None of these exist in the draft.

**Footer**
- Draft footer has two link columns: "SHOP" (All Products, Zookies, Trial
  Pack, Gift Ideas, Send to Ward, Our Story, FAQs) and "INFORMATION"
  (Privacy Policy, Shipping Info, Terms & Conditions, Allergen Information,
  Contact Us), plus Instagram AND WhatsApp buttons, and the footer logo
  forced to pure white against the dark background.
- Live footer shows a generic "Quick Links" column (Home, Shop, About,
  Contact, Privacy Policy) and a "Contact" column with an address/phone
  that don't appear in the draft, Instagram only (no WhatsApp), and the
  full-colour logo instead of white.
- At 768px specifically, the live footer also collapses to a single mobile
  column a full breakpoint tier too early — the draft keeps its 3-column
  layout down to 768px; confirmed via `getComputedStyle`
  (`grid-template-columns: 320.4px 160.2px 160.2px` on the draft vs a
  `flex-direction:column` stack on the clone, both read at
  `innerWidth: 768`).

Direct fetch of the live page confirms this at the HTML level: "Quick
Links" appears verbatim, "Information" appears zero times, and "WhatsApp"
appears only as an unused colour-token name, never as an actual link.

## Root cause — already named, not a new discovery

Both symptoms trace to the same root cause, and it's already tracked:

- **Footer**: `.claude/parking.md` entry `P-SPEC37-PER-SITE-DECLIENT`
  (status PARTIAL) — the CPT/"Set as active" mechanism is proven with
  generic proof content; authoring the real branded content per site
  hasn't happened yet.
- **Header**: `.claude/parking.md` entry `P-NAV-INDUS-CUTOVER` (status
  PARTIAL) — same shape: cutover mechanism proven, branded content never
  authored. A related entry, `P-NAV-FEATURED-HOVER-DRAFT-PARITY`, records
  that the "Send to Ward" styling gap was left in deliberately, as a test
  fixture for this exact future work.

**Correction (2026-09-11 — this was wrong in the original write-up of this
section):** the two parking entries above previously framed the missing
content as deferred to an unbuilt "Spec 33 Part 2" cloning pipeline. That
framing was never actually true and has been corrected this session — see
"Where Spec 37 actually stands" below. There is no pipeline dependency:
the CPT editor, `push-theme-snapshot.py`, and the active-CPT WordPress
option are all built and already proven to support multiple clients on
the one shared canary at once.

`.claude/decisions.md` D360 confirms the canary is running "generic proof
CPTs #1570/#1571 left active" — this has been the known state for a while.

## Where Spec 37 actually stands (checked against the codebase today, not
just the spec's own claimed status)

**Built and live-verified:** the CPT editing home, "Set as active" binding,
direct-render (no pattern-registry indirection), the container blocks
(`sgs/site-header`, `sgs/site-header-row`, `sgs/site-footer`,
`sgs/site-footer-row`) and their row/layout contract, the full behaviour
set (sticky/transparent/shrink/hide-on-scroll/contrast-safe), and the
preview-before-active flow.

**Genuinely open (re-verified against code 2026-09-11 — this section was previously
wrong on 3 of 5 items; don't trust old copies of this prompt):**
- Per-site branded content authoring — **not blocked on anything, just not
  yet done.** Confirmed this session by reading `push-theme-snapshot.py`:
  it defaults `DEFAULT_TARGET_DOMAIN` to
  `sandybrown-nightingale-600381.hostingersite.com` — the same single
  shared canary Mama's Munches runs on — so any client's real palette can
  be pushed straight onto it, no separate install needed. Also confirmed
  by direct action: a real-content Indus Brands mega-panel CPT post (ID
  3482) was created and sits on the canary right now alongside Mama's
  Munches' own test header/footer posts, proving the CPT model already
  supports multiple clients' real content side by side. Which content is
  "live" for a given request is just the `sgs_active_header_cpt_id` /
  `sgs_active_footer_cpt_id` WordPress option pointing at a post ID —
  flippable instantly, no redeploy. The only real work left is authoring
  Mama's Munches' (and Indus's) actual header/footer content through the
  existing editor and pointing the option at it.
- The visual column-shape picker (FR-37-42) — code rollout DONE on all three
  consumers since 2026-08-27 (`71a5d4d42`, `e90a1b313`). Only live-canary
  deployment + eye-verification remain.
- FR-37-12 never-overflow sweep — header AND footer rows both already pass a
  real 109-width sweep at 0 overflow. What's left is sweeping Indus Foods'
  own pages on the same canary install (there's no second WordPress site any
  more — palestine-lives.org retired 2026-08-10).
- The rules engine (FR-37-20) targets file-registered patterns only, not
  CPT posts — still genuinely open, this one was correct.

**Already built, previously mis-flagged as open — do not redo:**
- FR-37-16 (container responsive attrs → object shape) — done, `9b2996a68`
  (2026-09-05).
- FR-37-18 (inspector roster membership) — both containers are in
  `roster.json`; `sgs/site-footer` still has some real typography GAPs to
  close, but that's a smaller residual than "not in the roster."
- Scrolled-colour control (FR-37-45) — built: `backgroundColourScrolled` /
  `textColourScrolled` / `headerTransparentDirection` all exist and are wired
  in `site-header/render.php`.

**The strategic plan is stalled, not abandoned.** `.claude/plans/2026-07-29-
merged-spec36-37-track-strategic-plan.md` lays out 5 waves. Only Wave 1 and
the additive half of Wave 2's drawer-CPT chain shipped (D419) — nothing was
removed or migrated, 8 header patterns still embed their own drawer. Waves
3 through 5 never started. The plan's own "next session" pointer (re-open
the mega-panel fixture) is stale — that work was overtaken by an unrelated
track (colour/gradient rollout, wrapper-capability work, the clone-fidelity
programme this session closed out).

## Priority ruling already on record — don't re-litigate it

`.claude/decisions.md` D1004 (2026-09-07): Bean ruled the header/footer
clone gap outranks the motion-recognition work in the tier-migration plan
— "a named, design-gated, dependency-complete piece of work whose absence
Bean can see on every page," versus motion being "a research-grade problem
behind an unbuilt classifier." This session's work (starting here) is that
ruling being acted on.

## Done since this prompt was written (2026-09-11 session)

A related but separate track ran alongside this file's own scope,
covering Spec 38 motion capability for header/footer/mega-panel plus the
Indus Foods branded-content gap this file already names above (via
`P-NAV-INDUS-CUTOVER` / `P-SPEC37-PER-SITE-DECLIENT`). All of the
following is now shipped and live-verified — treat it as done, not as
remaining scope:

- **Motion capability** on `sgs/site-header-row`, `sgs/site-footer-row`,
  and `sgs/mega-panel`: cursor-reactive field, particle trail, grid-dot
  field, and CSS-only flowing gradient — all four offered as one shared
  effect dropdown — plus a scroll-scrubbed staggered reveal on
  footer-row only. Surface treatment (grain/halftone/duotone) via the
  shared `BackgroundPanel` also now reaches `sgs/container`, `sgs/hero`,
  `sgs/cta-section`, `sgs/trust-bar`, `sgs/multi-button`,
  `sgs/site-header`, and `sgs/site-footer`. Live-verified in the block
  editor, zero console errors. Commits `a9d808166`, `e8f20637f`,
  `2e590df08`, `ab3970a9e`, `e572d1f2b`.
- **FR-37-20** (rules engine can't target a CPT post) — checked Indus's
  real nav structure (`sites/indus-foods/extraction/homepage-nav-structure.json`);
  it has no per-page-type header need, so this correctly stays open/deferred
  — confirmed not a blocker for anything currently planned, not a new gap.
- **Mega-panel container roster** — checked the `block_composition` DB
  table directly: `sgs/mega-panel`, `sgs/mega-aside`, `sgs/mega-group` are
  already correctly registered with `container_kind` populated. Nothing
  needed here; a previously-suspected gap turned out not to exist.
- **FR-36-12** heading-less mega-panel a11y notice — built and shipped
  (informational only, never a build-blocking gate). Commit `e7f83b8fa`.
- **Indus Brands mega-menu content recovered and ported** — the
  historical `mega-menu-brands.html` content (Sanam / Lemon Tree / Green
  Leaf / Shan Foods / Indus Foods brand logos + an "Own Brands" side
  panel) was recovered from git history and rebuilt as a real test post
  (ID 3482, "Indus Brands Panel (Phase 2 port)") on the `sgs/mega-panel`
  block. Live-verified on the canary. This is the direct proof-of-concept
  for the "per-site branded content authoring" item above — it's the same
  mechanism Mama's Munches' header/footer still needs.
- **Two real bugs found and fixed while porting that content** — worth a
  permanent record, not just a footnote: `sgs/card-grid`'s and
  `sgs/brand-strip`'s image-picker attributes were declared in
  `block.json` with a narrower type than what their own editor picker UI
  actually writes. `WP_Block_Type::prepare_attributes_for_render()`
  silently wipes the ENTIRE repeater array (not just the one mismatched
  item) whenever that happens — meaning any real editor-authored
  card-grid or brand-strip content was rendering completely blank on the
  live frontend, with no error anywhere to catch it. Both attributes were
  widened to a proper `anyOf` schema and live-verified fixed. Documented
  as `.claude/decisions.md` D1027 and D1031. Commits `6a37490e1`,
  `c6a0338e6`, plus a follow-up correction `198c197b8`.

## Recommended first action (small, per ADHD Rule 2)

Read `.claude/specs/37-HEADER-FOOTER-BUILDER.md` in full before touching
anything — this project's standing rule for any cloning/header-footer
session. The either/or question this section used to pose ("hand-author
now, or build the Spec 33 Part 2 pipeline first?") is resolved: hand-
authoring through the existing CPT editor is confirmed the right
mechanism, proven working this session on a second client (Indus) on the
same shared canary — there is no pipeline to build first. The open
question is sequencing only. Recommended next action: author Mama's
Munches' real `sgs_header` / `sgs_footer` CPT posts by hand (matching the
draft evidence at the top of this file), set them active, and re-run the
three-viewport comparison to confirm the fix. If Indus is the priority
instead, the same steps apply to Indus: author its real
`sgs_header` / `sgs_footer` CPT posts, attach the already-built Indus
Brands mega-panel content (post 3482) into the header's mega-menu slot,
push Indus's palette via `push-theme-snapshot.py --client indus-foods`
(its `sites/indus-foods/theme-snapshot.json` already exists), and run the
FR-37-12 never-overflow sweep for real against Indus's own pages on the
canary. Ask Bean which client to close first — don't assume.

## Pointers

| For | Read |
|---|---|
| Full spec | `.claude/specs/37-HEADER-FOOTER-BUILDER.md` |
| Stalled strategic plan | `.claude/plans/2026-07-29-merged-spec36-37-track-strategic-plan.md` |
| Footer gap | `.claude/parking.md` → `P-SPEC37-PER-SITE-DECLIENT` |
| Header gap | `.claude/parking.md` → `P-NAV-INDUS-CUTOVER`, `P-NAV-FEATURED-HOVER-DRAFT-PARITY` |
| Priority ruling | `.claude/decisions.md` → D360, D419, D1004 |
| Draft to match | `sites/mamas-munches/mockups/homepage/index.html` (nav + footer markup/CSS) |
| Live canary | sandybrown-nightingale-600381.hostingersite.com, page 3448 (test clone) and 2742 (production homepage) |
| Per-client theme push | `plugins/sgs-blocks/scripts/push-theme-snapshot.py` (defaults to the shared canary — `DEFAULT_TARGET_DOMAIN`) |
| Indus palette snapshot | `sites/indus-foods/theme-snapshot.json` |
| Indus Brands content proof (mega-panel) | Canary post ID 3482, "Indus Brands Panel (Phase 2 port)"; source recovered from git history, `mega-menu-brands.html` |
| Image-picker repeater-wipe bug + fix | `.claude/decisions.md` → D1027, D1031; commits `6a37490e1`, `c6a0338e6`, `198c197b8` |
| Motion-capability shipment (header-row/footer-row/mega-panel + BackgroundPanel) | Commits `a9d808166`, `e8f20637f`, `2e590df08`, `ab3970a9e`, `e572d1f2b` |
| Heading-less mega-panel a11y notice (FR-36-12) | Commit `e7f83b8fa` |
