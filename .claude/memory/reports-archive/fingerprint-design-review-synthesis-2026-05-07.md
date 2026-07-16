# Fingerprint Design Review Synthesis — 2026-05-07

Three independent reviewers stress-tested the converged fingerprint design (Sonnet 4.6, Gemini Flash, Gemini Pro). All three returned **ship-with-fixes**. Cerebras was skipped per its own skill spec ("not enough reasoning depth vs Opus/Gemini-Pro" for architecture decisions).

## Headline verdict

**Ship-with-fixes — 11 specific fixes required before first real clone.** Five are critical (block the first scrape), four are important (catches major edge cases), two are stretch (improves long-term scaling).

The four-layer model, role-templating, and Rosetta Stone storage decisions were universally confirmed. The breakage is concentrated at the deterministic-extraction edge: real-world DOM messiness (utility wrappers, mixed conventions, hashed classes) defeats the rigid string-match assumptions in several places.

## Convergent findings (surfaced by 2+ reviewers)

| # | Finding | Reviewers | Severity |
|---|---|---|---|
| 1 | **Tailwind wrapper classes stored as space-separated string, not indexed token array** — first Tailwind clone returns 0 matches for whole sections because `min-h-screen flex items-center` doesn't appear as a single string in any indexed lookup | Sonnet (explicit), Flash (implied), Pro (implied) | CRITICAL |
| 2 | **Structural signature too rigid — `child_shape` is free-text, not a parseable typed schema** | All 3 | CRITICAL |
| 3 | **Single-convention-per-scrape assumption is fatal** — real sites mix BEM + Tailwind + Bootstrap on same elements | Flash, Pro | CRITICAL |
| 4 | **Hashed / minified class names break the reverse index entirely** — CSS Modules, MUI, SvelteKit, build-step minifiers all produce `.css-1q2w3e` style classes that don't match any fingerprint | Sonnet, Flash, Pro | CRITICAL |
| 5 | **Extract rules need `search_scope` field** — `gap-{n}` often lives on a parent / child of the conceptually correct element; without traversal fallback, layout extraction silently fails | Sonnet | CRITICAL |
| 6 | **Eight attribute roles insufficient** — missing `layout-alignment` (Flash), `accessibility-attribute` (Pro), `data-binding` (Pro), `visibility-control` (Flash), `layout-modifier` (Pro) | Flash, Pro | IMPORTANT |
| 7 | **Four leftover buckets insufficient** — need 5th bucket for "structural mismatch / orphan" (wrapper matches but inner DOM violates signature, OR unmatched content inside matched container) | Flash, Pro | IMPORTANT |
| 8 | **Recursion guard required** — `max_depth: 12` + `visited_nodes` Set | Pro (explicit), Sonnet (implied) | IMPORTANT |
| 9 | **Confidence scoring undefined** — recogniser flow returns "ranked candidates with confidence" but no formula. Class collisions (`.btn` matching multiple blocks) need a weighted disambiguation matrix | Sonnet, Pro | IMPORTANT |

## Divergent findings (single-reviewer)

### Sonnet 4.6 (practical implementer)

- `signature_hash` described as "sha256 of canonical structural signature" but canonical form never defined — two implementations of `/sgs-update` will produce different hashes for the same block, breaking the index
- Version drift between `blocks.fingerprint.attributes[]` and actual `block.json` attributes is undetected — `/sgs-update` regenerates sgs-db but doesn't validate fingerprint against block.json — they will drift silently
- `recogniser_index` rebuild concurrency unspecified — scrape running mid-rebuild reads partial state. Need write-lock or atomic versioned swap
- `OR` in selector strings (`".hero__cta-group OR auto-detected button group"`) is freetext masquerading as parseable selector. Needs typed fallback chain
- sgs/tabs per-instance content traversal — Layer 4 stores slot config but recogniser algorithm for "tab 2 contains sgs/card, tab 3 contains sgs/gallery" is unhandled

### Gemini Flash (gap scanner)

- **Pairing index missing** — `sgs/tabs` Tab Header N must align with Tab Panel N; Layer 3 and Layer 4 have no `logical_group` or `pairing_index` field
- **Tie-breaking strategy** — `.btn` collision between `sgs/button` and `sgs/multi-button` resolved via "internal element presence" tie-breaker (siblings → multi-button; single → button)
- **Global JS logic discontinuity** — `interactive-state` maps to attributes, but the trigger (event listener in `app.js`) isn't in scraped HTML. Recogniser finds the stateful class but misses the toggling logic
- **Computed-style passport** — for hashed classes, infer block identity from computed styles (`display:flex` + `flex-direction:column` + child with `font-size > 32px` → likely a Hero)

### Gemini Pro (deep reasoning + ecosystem)

- **AST-tree-diff alternative architecture** — Plasmic / Builder.io / Locofy parse inbound DOM into abstract structural tree first, use tree-diffing for parallel structures (state-linked tabs/accordions)
- **Computed layout analysis** — Locofy / Stackbit use bounding boxes + flex behaviours + spatial positioning to corroborate component identity when classes are obfuscated
- **Reverse-index O(1) collapses at 200+ blocks** — generic classes (`.btn`, `.row`, `.container`) legitimately match 3+ blocks. Need weighted scoring matrix combining `class_match_confidence` + `structural_signature_hash` + `child_node_count`

## Stretch findings

10. **Spatial / computed-layout signal as corroborating evidence** (Pro) — read getBoundingClientRect during scrape, use as additional matching dimension. Defer until first cloning shows pure-class matching is insufficient.
11. **AST-tree-diff alternative architecture** (Pro) — wholesale architecture change. Defer indefinitely; revisit only if deterministic fingerprinting hits a real wall after 50+ clones.

## Effort impact

| Layer | Original revised estimate | After review fixes |
|---|---|---|
| Schema + Layer 1+2 + reverse index | 90 min | unchanged |
| Layer 3 + 4 + slot overrides | 60 min | unchanged |
| Bidirectional platform_equivalents (extract + generate) | 75 min | +30 min for `search_scope` + typed selector chain |
| **Critical fixes (items 1-5)** | n/a | +60 min |
| **Important fixes (items 6-9)** | n/a | +90 min |
| Stretch (items 10-11) | n/a | defer |

**Revised total: ~405 min (6 hr 45 min) for the full passport.** Up from the 225 min I quoted before the review.

## Recommended action

Three options given the new scope:

| Option | What happens this session | What gets parked |
|---|---|---|
| **A (revised)** — execute the full ~405 min build now | Design fully implemented this session. Parking review can't fit. | Parking review → next session |
| **B — execute the critical-fixes-only subset (~210 min)** | Schema + envelope + Layer 1/2 + reverse index + critical fixes 1-5. Important fixes 6-9 deferred. | Important fixes + parking review → next session (or split across two) |
| **C — write design synthesis + handoff, defer all execution** ⭐ | Synthesis doc captured (this file). Bucket 2 next-session-prompt updated with revised Option A as the first task. Parking review fits this session. Session closes clean with design locked. | Full Option A → next session, anchored by this synthesis |

**My recommendation: C.** The design is now well-stress-tested and the work is too big for the remaining session window without sacrificing the parking review you specifically wanted to do. Capture the synthesis cleanly, update parking, write a tight handoff, and the next session executes Option A from a known-good design baseline.

If you want to push for B, the natural cut is items 1-5 (the five critical fixes) — they're the difference between "first clone fails immediately" and "first clone surfaces real edge cases for review." Items 6-9 are quality-of-life on top of a working foundation.
