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
  generic proof content; authoring the real branded content per site was
  deliberately deferred to a cloning pipeline that doesn't exist yet
  ("Spec 33 Part 2").
- **Header**: `.claude/parking.md` entry `P-NAV-INDUS-CUTOVER` (status
  PARTIAL) — same shape: cutover mechanism proven, branded content never
  authored. A related entry, `P-NAV-FEATURED-HOVER-DRAFT-PARITY`, records
  that the "Send to Ward" styling gap was left in deliberately, as a test
  fixture for this exact future work.

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
- Per-site branded content authoring (the actual blocker above).
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

## Recommended first action (small, per ADHD Rule 2)

Read `.claude/specs/37-HEADER-FOOTER-BUILDER.md` in full before touching
anything — this project's standing rule for any cloning/header-footer
session. Then confirm with Bean: are we authoring Mama's Munches' branded
header/footer by hand through the CPT editor now (fastest path to closing
the two parking items), or are we building the "Spec 33 Part 2" clone
pipeline first so this becomes repeatable for every future client? Both
are legitimate — the parking entries assume the pipeline is the endpoint,
but hand-authoring one client's content is a same-day close if that's
what's wanted instead. Don't assume; ask.

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
