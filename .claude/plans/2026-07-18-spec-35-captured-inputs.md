---
doc_type: plan-input
title: Spec 35 — captured inputs (surfaced 2026-07-18)
project: small-giants-wp
session_date: 2026-07-18
status: inputs-for-planning
---

# Spec 35 — captured inputs (for the /strategic-plan, Task 3)

Requirements + scope items surfaced during the 2026-07-18 session (inline-zero gate
+ core-block migration). Feed these into the Spec 35 plan — do NOT bolt them on
without evaluating the whole standard first (Bean, 2026-07-18).

Governing spec: `.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md` (read IN FULL before planning).

## 1. Block feature-parity with replaced core blocks (NEW requirement)
Every SGS block in the `replaces` roster must expose AT LEAST the full
functionality of the core block(s) it replaces (per `block-replacements.json`),
unless a documented named exception. A core capability the SGS block lacks = a
parity gap to close. Memory: [[sgs-block-feature-parity-with-replaced-core]].
- First instance closed this session: `sgs/separator` gained `opacity` (core/separator parity).
- The migration pairings are a natural parity-gap detector (a pairing that must
  REFUSE a core attr points at a missing SGS capability).

## 2. Blocks must shrink to fit their container (NEW block standard)
A Spec 35 block standard in the same tier as no-inline / dynamic-render. Every
block must be INTRINSICALLY responsive (min-content ≤ container at every
breakpoint) and shrink to fit on its own — NOT be forced by a container clamp
(which squishes/looks ugly). Memory: [[blocks-must-shrink-to-fit-container]].
- Per-block responsiveness is the standard; the shared container/wrapper
  `min-width:0` (+`min-height:0`) grid/flex-item safeguard is the framework
  BACKSTOP, not a substitute.
- Live proof this session: the testimonial-slider forced a 360px section to 894px
  (whole-page mobile scroll). Fixed at the block this session (slider redesign);
  the safeguard should also be landed as the framework backstop.
- Plan: (a) codify the standard; (b) land the container/wrapper `min-width:0`
  safeguard; (c) an audit that every block shrinks to fit at 360/768/1440.

## 3. Optimal image + video controls for sgs/media (scope item — EVALUATE, don't assume)
Spec 35 should EVALUATE the optimal/most-valuable image AND video controls the
framework is missing and add them to `sgs/media` — a holistic media-controls
review, NOT a piecemeal add. (Bean explicitly parked the earlier "image min-width/
min-height → max-width:100%" idea as just an idea: evaluate the full media-control
surface first, then decide.)
- Inputs to weigh: object-fit/position, aspect-ratio, responsive art-direction
  (per-breakpoint source), lazy/priority loading, focal point, lightbox, captions,
  video poster/controls/autoplay/loop/mute, and image sizing that scales to fit
  (max-width:100%, only exceeding bounds on a hover effect).
- Compare against Kadence / Spectra / GenerateBlocks media blocks for parity (ties
  to input #1).

## Cross-cutting
- These are INPUTS. The Spec 35 plan must read Spec 35 in full, evaluate the whole
  standard, then decide scope + phasing — no unevaluated additions (Bean, 2026-07-18).
