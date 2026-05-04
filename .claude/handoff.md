---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-03
session_tag: small-giants-wp-2026-05-03-sgs-button-architecture
recommended_model: sonnet
---

# Session Handoff — 2026-05-03

## Completed This Session

1. **Investigated the recogniser's silent attribute coverage gap on sgs/hero.** Result: 6/48 attributes extracted (12%), missing `splitImage`, every responsive variant, all colour overrides. Root cause: hand-written fingerprints. Bean's directive — fingerprints must be auto-derived from `block.json` so attribute extraction can never silently skip declared attributes.
2. **Prototyped recogniser v2** at `tools/recogniser-v2/extract.py` — per-section CSS harvest using BS4's native selector engine + recursive @media block parsing. On the mamas hero: 17 block attributes auto-extracted, 27 CSS rules harvested, classified into block-attribute / universal / one-time-custom buckets.
3. **Architecture pivot agreed with Bean:** build `sgs/button` (canonical SGS button block) + `sgs/multi-button` (container, accepts 0..N sgs/button via InnerBlocks) instead of extending `core/button` or attaching a "Match Style" extension to every CTA-rendering block. Composition over extension. All button presets and bindings handled by composing `sgs/button` instances — no per-parent-block extension code.
4. **Universal CSS foundations applied** to `core-blocks-critical.css` via Sonnet subagent: `* { box-sizing: border-box }`, `img { max-width: 100%; height: auto; display: block }`, canonical `@media (prefers-reduced-motion: reduce)` rule. Cleanup: removed 4 redundant per-block reduced-motion blocks across `core-blocks.css` and `back-to-top.css`.
5. **Mama's heading typography aligned** with mockup in `mamas-munches.json` via Sonnet subagent: h1/h2/h3 lineHeight `1.2`, h1 letterSpacing `-0.022em`, h2 `-0.015em`, h3 unstyled. Added `styles.css` field carrying mockup-faithful focus-visible rule (2px solid `var(--text)`, border-radius 4px, offset 2px) — site-specific override of framework's 3px default.
6. **Dispatched competitor button research** (Spectra, Kadence, GenerateBlocks, Stackable) via background Sonnet subagent — output spec at `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md`. Includes a 387-line comparison matrix, 10 gaps identified, 2 over-engineering items moved to P2, and a final 87-attribute `block.json` skeleton.
7. **Wrote** `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` covering the recogniser v2 architecture (schema-driven, all-CSS-harvest, forward-only, composition emitter for sgs/multi-button + sgs/button output).
8. **Updated `.claude/architecture.md`** with three new architectural decisions (#19 SGS Button Architecture, #20 Recogniser v2, #21 Universal CSS foundations).
9. **Updated `.claude/specs/02-SGS-BLOCKS.md`** plugin structure to add sgs/button + sgs/multi-button blocks with cross-references to spec 11. Added new sections "Button architecture" and "Pipeline / extraction".
10. **Updated `.claude/specs/common-wp-styling-errors.md`** with 6 new failure-pattern entries (section L) capturing this session's architectural mistakes.
11. **Verified DB-write workflow** for canonical block markup is byte-perfect when applied to a test post (mix of dynamic + static + nested core blocks). Editor parses with `isValid: true`, save round-trips byte-identical. Deferred broader adoption pending validator improvements but verified the path.
12. **Refreshed both `.claude/next-session-prompt.md` and `NEXT-SESSION-PROMPT.md`** for the SGS button architecture session. Previous content was stale (2026-05-01 recogniser-v1 build).

## Current State
- Branch: `main` at `431f8e5`
- Tests: no test suite at framework level; existing builds compile
- Build: unaffected (no JS/PHP changes touched the build pipeline this session)
- Uncommitted changes: none in tracked files; untracked items are stale next-session prompts and other-client `.claude/` dirs
- Live deploy state (sandybrown): universal CSS additions NOT yet deployed (need scp + cache flush after the upcoming dispatch session lands)

## Known Issues / Blockers
- Hero perfect-clone is blocked behind the button architecture build. sgs/hero needs to be refactored to use InnerBlocks (sgs/multi-button → sgs/button) before its CTAs can render correctly. Don't attempt the hero clone until block architecture lands.
- Existing block instances on sandybrown will need migration — sgs/hero, sgs/cta-section, sgs/product-card all currently render CTAs internally via attributes (`ctaPrimaryText`, etc.). Refactoring to InnerBlocks composition needs a deprecation/migration path so existing posts don't break with "unexpected content" errors. Spec 11 §5 covers the migration shape.
- 3 reduced-motion rules outside the CSS cleanup scope (`dark-mode.css`, `header-modes.css`, `reading-progress.css`) may now be redundant. Parking P-8.

## Next Priorities (in order)
1. Read `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` — the competitor research output. This is the input spec for the build.
2. Build sgs/button block — full attribute surface from the spec, dynamic block (`render.php` + `save: () => null`), supports `inheritStyle: 'primary'|'secondary'|'outline'|'custom'` binding. ~2–3h.
3. Build sgs/multi-button block — container, InnerBlocks restricted to `sgs/button`, layout direction + per-breakpoint gap + alignment, default template auto-includes 2 sample buttons. ~2–3h.
4. Build button-presets settings page — clone the Business Details admin pattern. Two presets × full attribute set + hover states. Saves to `wp_options`. ~1.5h.
5. theme.json mirror — emit CSS custom properties from preset values so theme.json variations can override per-client. ~30min.
6. Refactor existing CTA-rendering blocks (sgs/hero, sgs/cta-section, sgs/product-card, sgs/feature-grid once it exists) — replace internal CTA attributes with InnerBlocks slot containing default `sgs/multi-button` template. Add deprecation paths. ~3–4h.
7. QC — visual diff vs mockup at 1440 + 375. Block validation check via Playwright + `wp.data.dispatch`. Fresh handoff doc.

## Files Modified
| File | What changed |
|------|--------------|
| `theme/sgs-theme/assets/css/core-blocks-critical.css` | Added 3 universal foundation rules (box-sizing, img, prefers-reduced-motion canonical) |
| `theme/sgs-theme/assets/css/core-blocks.css` | Removed 3 redundant per-block prefers-reduced-motion blocks |
| `theme/sgs-theme/assets/css/back-to-top.css` | Removed 1 redundant prefers-reduced-motion block |
| `theme/sgs-theme/styles/mamas-munches.json` | h1/h2/h3 typography aligned with mockup; added `styles.css` raw with mockup focus-visible rule |
| `tools/recogniser-v2/extract.py` | New ~600-line Approach-B forward-only extractor: schema-driven attributes + all-CSS harvest + classification |
| `.claude/specs/11-SGS-BUTTON-ARCHITECTURE.md` | NEW — 556-line button architecture spec including verbatim 387-line competitor research |
| `.claude/specs/12-DRAFT-TO-SGS-PIPELINE.md` | NEW — recogniser v2 architecture spec |
| `.claude/specs/02-SGS-BLOCKS.md` | Plugin structure adds sgs/button + sgs/multi-button; new "Button architecture" + "Pipeline / extraction" sections |
| `.claude/specs/common-wp-styling-errors.md` | New section L: 6 architectural-mistake patterns from this session |
| `.claude/architecture.md` | New decisions #19 (SGS Button Architecture), #20 (Recogniser v2), #21 (Universal CSS foundations) |
| `.claude/state.md` | Phase moved to sgs-button-architecture; full decision log this session |
| `.claude/mistakes.md` | 3 new lessons (extension-vs-composition, fingerprints-from-block.json, all-CSS-every-time) |
| `.claude/parking.md` | 4 new parking items (P-6 to P-9) |
| `.claude/next-session-prompt.md` + root `NEXT-SESSION-PROMPT.md` | Refreshed for sgs-button-architecture session (was stale, pointing at superseded 2026-05-01 build) |
| `CONVERSATION-HANDOFF.md` | Refreshed for current state |

## Notes for Next Session
- Dispatch the build via `/dispatching-parallel-agents` with Sonnet subagents. Bean's explicit instruction. Independent work units: (A) sgs/button block, (B) sgs/multi-button block, (C) settings page. Then dependent unit (D) refactor existing blocks after A+B finish. QC + visual diff + handoff inline at the end.
- Block deprecation pattern is documented in CLAUDE.md — see `plugins/sgs-blocks/CLAUDE.md` "Gotchas" section. Static-block-with-existing-instances needs `deprecated.js` v1 with `save: () => null` + `migrate()` if attributes rename. Mostly relevant for the refactor step.
- Two settings already on Mama's site: Business Details (Settings > Business Details) and Style Variation activated. Button presets settings page goes alongside Business Details.
- Sandybrown live state: images 21–25 uploaded, style variation active. After button architecture deploys, hero post 8 will need updating (but only after block deprecation paths confirmed safe).
- Recogniser-v2 hero output is byte-stable but inert until sgs/hero is refactored to support `splitImage` extraction properly. Don't run extract.py against the live hero again until after refactor.
- The four critic-reviews from the earlier session converged on "use WordPress as the serialiser, not a Python re-implementation" — that's exactly what InnerBlocks composition gives us automatically, so we're now on the architecturally correct path.
- DB-write of canonical markup is verified safe for dynamic-block-heavy posts (2026-05-02 test). Use it in the next session if Playwright-based application is too slow during the refactor migration testing.

## Next Session Prompt

See `.claude/next-session-prompt.md` (mirrored at root `NEXT-SESSION-PROMPT.md`) for the full ready-to-paste prompt. Resume command:

```
CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-03-sgs-button-architecture"
```
