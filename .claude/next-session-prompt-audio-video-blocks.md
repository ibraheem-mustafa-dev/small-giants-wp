---
doc_type: next-session-prompt
project: small-giants-wp
thread: ONE-TIME — dedicated sgs/audio block (7 player variants) + sgs/media video re-skin + finish core→sgs table
generated: 2026-07-03-EVEN-LATER
lifespan: ONE-TIME — delete this file when the work is done (Bean's instruction). NOT the main cloning thread.
primary_goal: "Build a dedicated sgs/audio block with 7 player variants + a Web Audio visualiser view-module; re-point core/audio→sgs/audio (remove audio mode from sgs/media, port the D266 logic); re-skin the generic sgs/media VIDEO player with a branded control chrome; finish the deferred core→sgs replacement-table judgment rows. Design is LOCKED — see the artifact + the audit report."
---

# ONE-TIME session — sgs/audio block + video re-skin + core→sgs table completion

**This is a standalone one-time job — DELETE this file when done.** It is a SEPARATE workstream from the main cloning pipeline (`next-session-prompt.md` = feature-grid / product-card). Do not conflate the two.

## ⛅ STATUS (2026-07-04) — Tasks 1-3 DONE + pushed; only Task 4 remains
- **Task 1 — sgs/audio block: DONE (D268, `596b9943`, pushed).** 7 player styles (minimal/waveform/spectrum/radial/oscilloscope/gradient-pulse/hidden) + Web Audio view.js visualiser + AudioObject schema + perf. /qc PASS on sandybrown (all 7 LANDED; found+fixed a `crossorigin` playback bug).
- **Task 2 — re-point core/audio → sgs/audio + remove audio from sgs/media: DONE (D269, `e8bebd39`, pushed).** Audio mode fully removed from media; `sgs/audio.replaces=[core/audio]`, media `replaces=[core/image,core/video]`; DB registered (blocks + block_composition via seed-composition-roles.py).
- **Task 3 — sgs/media branded video player: DONE (D269, `e8bebd39`, pushed).** Centre-play + hover control bar (scrub/time/mute/volume/fullscreen), keyboard, theme-tokened; iframes untouched; progressive enhancement. /qc-council GO (2 raters); LANDED on sandybrown.
- **Task 4 — finish the core→sgs replacement table: STILL TODO** (the only remaining work — see below).
- **Routine follow-up:** run `/sgs-update` to regenerate `specs/02-SGS-BLOCKS-REFERENCE.md` (reflect the new sgs/audio block + media v1.5.0 + divider gap). Durable channels (block.json / seed-composition-roles.py) already verified.

**When Task 4 is done + the reseed run, DELETE this file.**

Invoke `/autopilot` before anything else. This is a `/sgs-wp-engine` (SGS block development) + `/frontend-design` + `/innovative-design` + `/interactive-design` (Web Audio motion) session, closed with `/design-review` + `/visual-qa` + LANDED verification.

**Agent identity.** You are the SGS block-development engineer. The design phase is DONE — Bean reviewed an interactive preview of 6 audio-player styles and chose to ship a dedicated block. Your job: build it well, client-facing, accessible, deployed + LANDED-verified.

## ⛔ READING GATE (tick each in your first message)
1. ☐ **The design artifact** — `.claude/reports/2026-07-03-audio-player-styles.html` (source, persisted in-repo) / published at https://claude.ai/code/artifact/625ea278-d1a9-471a-98db-8bb8d9b8cc76 — the 6 player styles + the studio-console identity (amber signal + cyan spectrum on graphite) + the Web Audio `AnalyserNode` reactive technique. READ THE SOURCE (`.claude/reports/2026-07-03-audio-player-styles.html`) — the visualiser draw functions (spectrum/oscilloscope/gradient-pulse/radial-glow) are directly portable to the block's `view.js`.
2. ☐ **`reports/2026-07-03-core-to-sgs-replacement-audit.md`** — §B2 (Bean-ruled rows, wired) + §C (deferred/unruled judgment rows to finish) + the many-core→one-sgs data model.
3. ☐ **`plugins/sgs-blocks/src/blocks/media/{block.json,edit.js,render.php,style.css}`** — the D266 audio logic to PORT into sgs/audio, then REMOVE from media (audio* attrs + the audio render branch + the mediaType 'audio' enum + the audio editor UI + the audio canvas preview).
4. ☐ **`plugins/sgs-blocks/CLAUDE.md`** — the Block Pattern, the MANDATORY Block Customisation Standard (per-element controls, `TypographyControls`, `:not([style*=...])` fallbacks), the deprecation rules, the `viewScriptModule` (ES module) frontend rule, the deploy sequence.
5. ☐ **`plugins/sgs-blocks/scripts/orchestrator/converter_v2/db_lookup.py`** — `_HTML_TAG_TO_CORE_BLOCK_SEED` (the `<audio>`→core/audio tag hook, D266) — you'll re-point the reverse-walk to sgs/audio via block.json `replaces`.
6. ☐ **The framework CLAUDE.md 7 non-negotiable rules + the block customisation / image-controls / no-jQuery / WCAG 2.2 AA / progressive-enhancement standards.**

## Pre-flight self-attestation (first message)
1. Have I read the artifact SOURCE (the visualiser draw fns) + the audit report + the media block's audio logic + plugins/sgs-blocks/CLAUDE.md?
2. Branch: SGS core block work → `main` (verify `git branch --show-current`). D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` (was D266 at handoff — assign the next).
3. Am I building this as a CLIENT-FACING block (every capability an editor control; no code touch for clients) + accessible (keyboard, focus, `prefers-reduced-motion`, ARIA) + progressive-enhancement (native `<audio controls>` fallback when JS is off)?
4. Am I gating on the REAL rendered output (deploy to sandybrown + play each variant live), not emit-green?

---

## TASK 1 — Build the dedicated `sgs/audio` block (the main deliverable)

**Block:** `sgs/audio` (category `sgs-content`). Single job: play an audio file with a chosen player style. Uses `render.php` (dynamic) + `view.js` (`viewScriptModule` ES module) for the Web Audio visualisers + `save.js` returning null.

**7 player variants** (`playerStyle` enum — the 6 from the artifact + a 7th):
1. `minimal` — Minimal Pill (play + thin progress track + timecode). The default. **Works with zero JS** (native `<audio controls>` fallback).
2. `waveform` — pre-rendered peaks fill with playback; clickable to seek.
3. `spectrum` — Live Spectrum: frequency bars (cyan→amber), `AnalyserNode.getByteFrequencyData`.
4. `radial` — Radial ring + glow; the glow pulses with amplitude.
5. `oscilloscope` — live waveform line, `AnalyserNode.getByteTimeDomainData`.
6. `gradient-pulse` — the player background shifts colour + brightness to the sound.
7. `hidden` — audio loads + plays but renders NO visible player (background/ambient audio, or triggered by another element). Autoplay/loop honoured; a visually-hidden but focusable control for a11y.

**Attributes (client controls — every one exposed in the inspector):**
- `audioUrl` / `audioSource` (external|internal) / `audioId` / `audioMimeType` — the source (port the D266 resolution logic: internal via `wp_get_attachment_url`, MIME auto-detect from extension).
- `playerStyle` (the 7-value enum, visual thumbnail picker à la testimonial's variant picker).
- `audioControls` / `audioLoop` / `audioAutoplay` / `audioPreload` (metadata|none|auto).
- Brand-token colours: `accentColour` (signal, default theme primary) + `spectrumColour` (default theme secondary) via `DesignTokenPicker` — so the visualisers use the CLIENT's brand, not the studio-console demo palette. The artifact's amber/cyan is the DEMO identity; in the block, drive the visualiser colours off theme tokens + these overrides.
- `title` / caption (optional label) with `TypographyControls`.

**view.js (the visualiser engine):** ONE shared `AudioContext` + `AnalyserNode` per instance, attached to the block's real `<audio>` element via `createMediaElementSource` (NOT a generated tone — that was only the artifact demo; the block reacts to the REAL audio). Port the artifact's `draw()` fns per style (spectrum/oscilloscope/gradient-pulse/radial). Respect `prefers-reduced-motion` (freeze to a static representative frame). Only instantiate the AudioContext on first play (autoplay-policy safe). Vanilla JS, no jQuery.

**Accessibility (WCAG 2.2 AA):** real `<button>` play/pause with `aria-label` + `aria-pressed`; keyboard operable; 44px targets; visible focus ring; the canvas visualisers are decorative (`aria-hidden`) with the native/custom controls as the accessible surface; `hidden` variant keeps a visually-hidden focusable control. Progressive enhancement: SSR a native `<audio controls>`; view.js UPGRADES it to the chosen style (so no-JS still plays).

**Deploy + LANDED:** `npm run build` → deploy `build/blocks/audio` + `includes` to sandybrown (path in handoff) → OPcache reset → create a test page per variant (REST, guard-safe) → play each live + confirm the visualiser reacts + a11y (keyboard) + the no-JS fallback. Delete the test page after. Visual-diff report `reports/visual-diff/audio-<date>.md` (verdict: PASS + first_paint_capture_passed: true) to satisfy the pre-commit visual gate.

## TASK 2 — Re-point core/audio → sgs/audio + remove audio from sgs/media
- `sgs/audio` block.json `replaces: ["core/audio"]`; REMOVE `core/audio` from `sgs/media` block.json `replaces` (leave image+video); the `_blocks_replaces_reverse` + `<audio>` tag hook then resolve to sgs/audio automatically (verify via `db_lookup.atomic_tag_map()`).
- REMOVE audio mode from sgs/media: the `mediaType` 'audio' enum value + the audio* attrs + the audio render branch + the audio editor UI + the audio canvas preview (all added in D266). sgs/media returns to image/video/svg. save.js is null → no deprecation. Bump media version.
- Reseed `/sgs-update` → verify the mapping + no orphan/duplicate core claim.

## TASK 3 — Re-skin the sgs/media VIDEO player (branded chrome)
The video mode is a raw native `<video controls>` — generic. Re-skin with a custom branded control chrome inspired by the studio-console identity: custom play/scrub/volume/fullscreen, a brand-tokened progress scrubber, hover-reveal controls, a considered poster state. Vanilla JS view module + progressive enhancement (native controls fallback). Its own design pass — a couple of chrome options for Bean if useful. Accessible (keyboard, ARIA, captions passthrough). LANDED-verify on sandybrown.

## TASK 4 — Finish the core→sgs replacement table
Work the deferred/unruled §C rows in `reports/2026-07-03-core-to-sgs-replacement-audit.md` (core/cover→hero? core/media-text→hero-split? core/query→post-grid/content-collection? core/column→container? core/form-input/submit-button? core/pullquote already ruled). Present each as a functional-equivalence decision for Bean (Rule 9 menu), wire the confirmed ones into block.json `replaces` (list), reseed, verify no duplicate core claim.

---

## Skills to Invoke
| Skill | When |
|-------|------|
| `/autopilot` | FIRST — live routing + ADHD support |
| `/sgs-wp-engine` | ALL block dev — the evidence-gate + SKILL-STATUS harness; block.json/edit.js/render.php/view.js patterns |
| `/frontend-design` · `/innovative-design` · `/interactive-design` | the player chrome + the Web Audio motion (visualisers) — production-grade UI |
| `/wp-block-development` · `/wp-interactivity-api` | Gutenberg block structure + (if used) Interactivity API; else vanilla `viewScriptModule` |
| `/design-review` · `/visual-qa` | before deploy — visual quality + WCAG 2.2 AA per variant |
| `/qc-inline` · `/qc-council` | on the built block code before commit |
| `/gap-analysis` | grade the block before delivery |
| `/handoff` · `/capture-lesson` | close |

## MCP & Tools
| Tool | For |
|------|-----|
| Playwright / chrome-devtools | LANDED — play each variant on sandybrown, confirm the visualiser reacts + a11y keyboard nav + no-JS fallback |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` · `python ~/.claude/hooks/wp-blocks.py dump` | DB/schema ground-truth (replaces mapping, block roster) |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | create/delete per-variant test pages |
| `npm run build` (PowerShell — the bash node shim fails) then tar+scp deploy to sandybrown | build + deploy the block |

## Research approach (Rule 16 — before building the visualisers)
1. `/frontend-design` + a `/search` for current best-in-class Web Audio `AnalyserNode` visualiser patterns (fftSize, smoothingTimeConstant, `createMediaElementSource` gotchas — a MediaElementSource can only be created ONCE per element; CORS on cross-origin audio taints the analyser → note the constraint for external URLs).
2. The artifact source already has working `draw()` fns — validate them against the real `<audio>` element (the demo used a generated tone; the real element needs `createMediaElementSource` + routing to destination).
3. Autoplay policy: instantiate `AudioContext` on first user gesture (play click), not on load.

## Methodology guardrails
- **Client-facing first** — every capability is an inspector control; a client never touches code. Visual thumbnail picker for `playerStyle`. Brand colours via `DesignTokenPicker` (theme tokens, not the demo palette).
- **Progressive enhancement** — SSR native `<audio controls>`; view.js upgrades. No-JS must still play.
- **Accessibility** — WCAG 2.2 AA per variant; visualisers `aria-hidden`; `prefers-reduced-motion` freezes motion.
- **LANDED is the gate** — deploy + play each variant live on sandybrown (Bean eye), not emit-green.
- **Deprecations** — sgs/audio is new (no deprecation). sgs/media audio REMOVAL: save.js is null (dynamic) so no deprecation, but any live sgs/media audio instances re-point — re-clone or swap.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests tests/test_converter_conformance.py -q --import-mode=importlib` (never drop the baseline); cheat-gate `--check` exits 0. `npm run build` clean (dead-control guard). WPCS 0 errors. Branch `main`; path-scoped commits; no co-author line.
- **When done: DELETE this file** + fold any durable lessons into decisions.md / memory.
