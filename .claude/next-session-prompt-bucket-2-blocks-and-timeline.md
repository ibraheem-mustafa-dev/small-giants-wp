recommended_model: opus
session_tag: small-giants-wp-bucket-2-blocks-and-timeline-rework

Invoke `/autopilot` before doing anything else.

You are running a **dedicated SGS framework expansion session**. Mission: build 3 new SGS blocks (`sgs/empty-state`, `sgs/toggle`, `sgs/testimonial-slider`) AND rebuild `sgs/timeline` (current design / variants / animations are poor per Bean 2026-05-07). All four artefacts are framework-level work — they expand the SGS block library, they are NOT client-specific.

**Strategic dogfood opportunity:** if `/sgs-clone` is shipped and stable by the time this session runs, design the static layers (mockups) of the 3 new blocks AND the timeline variants in HTML/CSS first, then run `/sgs-clone` on each as a real-world stress test of the cloning skill. Manually layer the interactive concerns (slider gestures, toggle state, timeline scroll triggers) on top of the cloned visual. This validates `/sgs-clone` on new-block creation, not just client homepage cloning. **If `/sgs-clone` is NOT yet stable, build the blocks the conventional way using `/sgs-wp-engine`.**

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-bucket-2-blocks-and-timeline-rework"`

## Why this session exists

In session 2026-05-07 (cloning-skill-design), the bidirectional animation gap audit surfaced 7 gap candidates. Three of those (form-focus-ring, ripple-on-click, svg-path-draw-on-scroll) were implemented inline as Bucket 1 attributes spread across all applicable blocks. Three more required new blocks first and were parked here. One (svg-morph) was deferred — paid GSAP plugin dependency.

The gap candidates parked for this session:

| Gap candidate | Required new block | Animation that motivates it |
|---|---|---|
| `toggle-slide` | `sgs/toggle` | Sliding knob + colour shift on binary state change |
| `empty-state-float` | `sgs/empty-state` | Gentle vertical floating loop on illustration (3-6px / 3-5s) |
| `swipe-to-dismiss` | `sgs/testimonial-slider` | Drag card past threshold → animate off-screen, snap-back below threshold |

The timeline rework was added to this session by Bean 2026-05-07: *"the timeline block's design, lack of variety of design/style options and its animations are pretty awful."* Audit pass needed first.

## Read first (in this order)

1. `.claude/handoff.md` — last session summary (cloning-skill-design 2026-05-07)
2. `.claude/parking.md` entry for "Bucket 2 + timeline rework" — the deferred-from-2026-05-07 capture
3. `.claude/reports/animation-gap-audit-2026-05-06.md` — the gap candidates with implementation hints
4. The block-customisation standard in project `CLAUDE.md` (every per-element control, native `supports`, `:not([style*="..."])` fallbacks)
5. Current `sgs/timeline` source: `plugins/sgs-blocks/src/blocks/timeline/` (audit existing state before redesigning)
6. `~/.claude/skills/sgs-wp-engine/SKILL.md` Hard Rules 1-7 (especially Rule 7 — Rosetta Stone discipline if you're writing to uimax)

## Where you are at session start

- Bucket 1 gap-candidate effects already shipped via 2026-05-07 session — `formFocusRing*`, `sgsClickEffect=ripple`, `pathDrawOnScroll` attributes live on all applicable blocks
- `/sgs-clone` skill: status TBC at session start. If shipped, dogfood per "Strategic dogfood" above. If still in /lifecycle, build blocks conventionally via `/sgs-wp-engine`
- All 7 audit gap candidates: 3 closed (Bucket 1), 3 deferred to this session (the new blocks), 1 deferred indefinitely (`svg-morph` — paid GSAP plugin)
- uimax `animations` table: 63 rows populated 2026-05-07. The 3 new blocks should each get rows ADDED to uimax `animations` with full Rosetta Stone equivalents once their implementation lands. The 3 currently-flagged `is_gap_candidate=1` rows for these blocks should be UPDATED with the new sgs_block / sgs_attribute_name once the blocks ship.

## Tasks

### Task 1 — Audit + spec the timeline block (do this FIRST, before any building)

Read `plugins/sgs-blocks/src/blocks/timeline/` end to end:
- `block.json` — current attribute set
- `edit.js` — current inspector controls
- `render.php` — current markup
- `style.css` — current visual + animation
- `view.js` (or wherever scroll-trigger lives) — current animation trigger logic

Produce `.claude/reports/timeline-audit-<date>.md` with:
- Current state summary (visual / variants / animations / attribute coverage)
- Specific issues per Bean's complaint (design, variety, animations) — not vague, name the actual visual problems with screenshots from a deployed test page
- Competitor comparison: 3-5 reference timelines (Apple history pages, Cloudflare 2023 review, Stripe brand history, Figma timeline patterns from CodePen) — what visual / animation tricks they use that SGS doesn't
- Proposed redesign: 3-5 visual variants (e.g. `vertical-classic`, `horizontal-scroll`, `alternating-cards`, `numbered-stepper`, `branching-fork`)
- Proposed new animation set per variant (using existing scroll-reveal types where possible; flag any genuinely new animations as candidates for the uimax `animations` table)

Do NOT start building until the audit + spec are committed and you've surfaced the variant list to Bean for approval.

### Task 2 — Build `sgs/empty-state` (simplest of the 3 new blocks)

**Block purpose:** Show a friendly state when a list / search / cart / inbox is empty. Illustration + heading + body + optional CTA.

**Use cases on real client sites:** "Your cart is empty", "No search results", "No bookings yet", "All caught up", "404 page", "No reviews yet — be the first".

**Required attributes:**
- `illustration` (image attachment slot — uses existing `MediaPicker` component)
- `illustrationSize` (number, default 200) — px, with mobile/tablet/desktop variants per existing responsive pattern
- `heading` (RichText)
- `headingFontSize` + colour (per block-customisation standard)
- `body` (RichText)
- `bodyFontSize` + colour
- `cta` (button slot — link to existing `sgs/button` as InnerBlock or as own attribute set)
- `ctaVisible` (boolean, default true)
- `floatAnimation` (boolean, default true) — wires to the new keyframe
- `floatAmplitude` (number, default 6) — px peak-to-peak
- `floatDurationMs` (number, default 4000)

**Implementation notes:**
- Static block (save returns rendered output — no need for dynamic .php unless you want server-side filtering)
- Float animation: `@keyframes sgs-empty-state-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(calc(var(--sgs-float-amp) * -1px)); } }` — driven by CSS custom properties set inline via React's `style` attribute
- Honour `prefers-reduced-motion` — fallback to no animation
- Inspector groups: Illustration / Heading / Body / CTA / Animation

**Time estimate:** 25-40 min default-low.

### Task 3 — Build `sgs/toggle` (binary state control)

**Block purpose:** A pure UI toggle (NOT to be confused with `sgs/tabs` which is for content switching). Use cases: "Monthly / Yearly" pricing flip, "Show only X" filters, settings panel switches, GDPR cookie preferences, opt-in form fields.

**Required attributes:**
- `labelOff` (string, default "Off")
- `labelOn` (string, default "On")
- `defaultState` (enum: `off` | `on`, default `off`)
- `stateBindingMode` (enum: `local-storage` | `url-param` | `form-field` | `interactivity-store`, default `local-storage`)
- `stateBindingKey` (string) — name of the localStorage key / URL param / form field / store value
- `pillBackgroundColourOff` + `pillBackgroundColourOn` (token-picker)
- `knobColour`, `pillBorderColour`
- `pillBorderRadius` (number, default 999) — px
- `pillWidth`, `pillHeight` (numbers with px / responsive)
- `slideDurationMs` (number, default 200)
- `slideEasing` (enum: ease-out / ease / ease-in-out, default ease-out)

**Implementation notes:**
- Dynamic block recommended because state binding to localStorage / URL / Interactivity store needs view.js
- WP Interactivity API for the state binding (`data-wp-context`, `data-wp-on--click`, `data-wp-bind--aria-checked`)
- ARIA: `role="switch"`, `aria-checked` reflects state, `aria-labelledby` points at off/on labels
- Keyboard: Space + Enter toggle; arrow keys move focus to neighbouring toggles in the same group
- Inspector groups: Labels / State Binding / Pill / Knob / Animation

**Time estimate:** 40-60 min default-low. Stretch goal if time: emit a "toggle-group" pattern that ties multiple toggles to a shared state + auto-derives radio-like behaviour when only one can be active.

### Task 4 — Build `sgs/testimonial-slider` (the genuinely complex one)

**Block purpose:** Multi-card testimonial carousel with native swipe gesture support. Cards drag left/right with finger or mouse, snap to next on threshold, snap back below threshold.

**Required attributes:**
- `testimonials` (array of objects: each with `quote`, `author`, `role`, `avatarMedia`) — uses existing `MediaPicker`
- `cardsVisible` (number per breakpoint, default desktop 1, tablet 1, mobile 1)
- `gap` (number per breakpoint)
- `swipeThresholdPercent` (number, default 30) — % of card width before commit
- `snapBackDurationMs` (number, default 250)
- `swipeOutDurationMs` (number, default 400)
- `autoplay` (boolean, default false)
- `autoplayIntervalMs` (number, default 5000) — paused on hover and on user-initiated drag
- `pagination` (enum: `dots` | `numbers` | `none`, default `dots`)
- `keyboardArrows` (boolean, default true)
- Card visual attributes pulled from existing `sgs/testimonial`'s pattern (don't duplicate — extend)

**Implementation notes:**
- Dynamic block, WP Interactivity API for state
- Pointer events (NOT touch / mouse separately — Pointer API unifies them)
- State machine: idle → dragging → snapping-back / snapping-to-next → idle
- Use Web Animations API for the snap transitions (consistent timing across all cards) instead of CSS transitions (which fight with the inline transform during drag)
- Honour `prefers-reduced-motion` — disable autoplay, replace snap animation with instant transition
- Pagination dots / numbers: `role="tablist"`, each dot `role="tab"`, current `aria-selected="true"`
- Keyboard: arrow keys advance cards, Tab focuses pagination

**Time estimate:** 90-120 min default-low. This is genuinely the hard one. Consider extracting the state-machine logic into a small standalone module that future slider blocks can reuse.

### Task 5 — Update uimax `animations` table

For each new block, UPDATE the relevant rows:
- `toggle-slide` row (currently `is_gap_candidate=1`) → set `sgs_block='sgs/toggle'`, `sgs_attribute_name='slideDurationMs / slideEasing'`, `is_gap_candidate=0`
- `empty-state-float` row → set `sgs_block='sgs/empty-state'`, `sgs_attribute_name='floatAmplitude / floatDurationMs'`, `is_gap_candidate=0`
- `swipe-to-dismiss` row → set `sgs_block='sgs/testimonial-slider'`, `sgs_attribute_name='swipeThresholdPercent / swipeOutDurationMs'`, `is_gap_candidate=0`
- Populate `wp_interactivity` field with the actual `data-wp-*` directive snippet for each
- Populate `framer_motion` / `gsap` / `wapi` / `css_implementation` per Rosetta Stone discipline (Hard Rule 7) — the existing rows may have placeholders; fill them with concrete code

### Task 6 — Timeline rework (after Tasks 1-5 land)

Per Task 1 audit + variant approval:
- Implement each approved variant as a new value of the timeline `style` attribute (e.g. `vertical-classic`, `horizontal-scroll`, `alternating-cards`, etc.)
- Each variant gets its own animation set per the audit
- Update existing test pages (if any) with the new attribute defaults via `wp-update-block-attrs.js`
- Smoke test: deploy + verify each variant renders cleanly at 3 breakpoints + console error free
- Update `block-changes` table in sgs-db with the rework entry

**Time estimate:** 60-120 min after Task 1 audit lands.

## Skills + tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-wp-engine` | Throughout — central authority for SGS block work |
| `/sgs-clone` | If shipped + stable — dogfood path for the static layers (Tasks 2-4 + Task 6 variants). If not yet stable, skip. |
| `/innovative-design` | Stage 0 direction-setting before building each block — pull palette/style options from `/ui-ux-pro-max` |
| `/wp-block-development` | Per-block dev (block.json, attributes, supports, dynamic vs static, deprecations) |
| `/wp-interactivity-api` | For sgs/toggle and sgs/testimonial-slider state binding |
| `/visual-qa` | After each block ships — full 9-layer QA pipeline against deployed test page |
| `/qc-inline` | After each task closes — Bean's standing rule |
| `/handoff` | At session end — write next-session prompt for any spillover |

| Tool | Use |
|---|---|
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py <command>` | Query SGS DB; check `match` for related blocks; `gaps` for industry coverage |
| `python ~/.agents/skills/ui-ux-pro-max/scripts/search.py "<query>"` | Pull style / palette / animation references for the design phase |
| `node tools/multi-frame-qa/capture.js` | First-paint capture per block test page |
| `node scripts/mockup-parity-validator.js` | Computed-style diff vs the static mockup if dogfooding via /sgs-clone |
| `node scripts/screenshot-diff-helper.js` | Pixel-diff before claiming any visual fix complete (Hard Rule 10) |
| `node scripts/wp-update-block-attrs.js` | Apply attribute changes to existing test posts safely (avoids block-validation rejection) |
| Playwright MCP | Browser automation for visual QA |
| SSH `u945238940@141.136.39.73:65002` | Server access — deploy target palestine-lives.org |

## Constraints

- **UK English** in all comments, attribute descriptions, inspector labels, error messages
- **Block customisation standard** (project CLAUDE.md) — every text + interactive element exposed via inspector
- **No hardcoding** (Hard Rule 1) — design tokens / block attributes only
- **Rosetta Stone discipline** (Hard Rule 7) — every new animation row in uimax carries cross-platform equivalents; if you can't fill a platform field, write `null` explicitly, never silently drop
- **Time-estimate default LOW** — quote the smallest plausible figure; recover from being too low, don't pad upward
- **Pre-commit STOP GATE** will catch any block-src commit without a passing visual-diff report
- **Deprecations required** when changing static block save.js output
- **`prefers-reduced-motion`** — every new animation must have a no-motion fallback
- **WCAG 2.2 AA** — focus-visible visible, keyboard navigable, ARIA roles correct, 4.5:1 contrast minimum
- **Build verification** — `cd plugins/sgs-blocks && npm run build` must compile clean before each task closes

## Success criteria

1. Timeline audit + variant proposal landed at `.claude/reports/timeline-audit-<date>.md`, approved by Bean
2. `sgs/empty-state` block ships, deployed, smoke-tested clean at 3 breakpoints
3. `sgs/toggle` block ships with state binding to at least localStorage and Interactivity store, deployed, keyboard-accessible
4. `sgs/testimonial-slider` block ships with native pointer-event swipe + autoplay + pagination + keyboard arrows, deployed, no console errors
5. uimax `animations` rows for the 3 new blocks updated with full Rosetta Stone equivalents (`is_gap_candidate=0`)
6. Timeline rework variants implemented + smoke-tested per Task 1 spec
7. All 4 artefacts pass `/visual-qa` + `/qc-inline` cleanly
8. `/handoff` written at session end for any spillover (likely the timeline rework if Tasks 2-5 fill the session)

## Why this matters

These 3 blocks fill genuine framework gaps that surfaced from the bidirectional animation gap audit:
- Empty states are a conversion-moment pattern every modern site uses (Dropbox / Notion / Asana / Slack)
- Toggles are required for pricing pages and settings UIs across every B2B SaaS clone we'd ever build
- Testimonial sliders are the headline trust-building element on services / agency / hospitality sites — the single-card `sgs/testimonial` doesn't cut it for those clones

Together they raise SGS framework maturity from 23% (per the master feature audit) toward the 72% Phase 2-3 target. They also unlock more accurate `/sgs-clone` output — every cloned client homepage that has empty states, toggles, or testimonial carousels will now map to real SGS blocks instead of falling into the "missing block" gap.

The timeline rework matters because the current implementation is the kind of "looks generic AI" block that erodes confidence in SGS as a competitor to Kadence / Spectra. Fixing it lifts the framework's overall quality bar.
