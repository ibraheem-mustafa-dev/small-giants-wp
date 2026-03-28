# Session Handoff — 2026-03-21 (Session 3)

## Completed This Session
1. AI model quality validation: Tripo 8/10, Meshy 7/10, TripoSR 5/10 (local free). Gate 1: PASS
2. Installed local 3D model generation tools: TripoSR (Python 3.12 venv + CUDA), Meshroom 2023.3.0 (photogrammetry), rembg (background removal)
3. Extracted 203 video frames from Ophir product video. Identified 3 segments: main chair (45 frames), accessories, other
4. Removed backgrounds from 158 frames using rembg. Fed to Meshroom reconstruction
5. Research on Meshroom best practices: need 80-150 images from 3 orbit heights, 60-80% overlap
6. Meshroom photogrammetry pipeline running with masked frames (may still be in progress)
7. Deep research on SGS Configurator Pro: 8 key questions answered (model-viewer self-hosting, Three.js bundle, KHR_materials_variants workflow, AI model APIs, lean WP ecommerce, Gutenberg 3D block, Freemius licensing, product-agnostic config schema). All HIGH confidence
8. Innovator research found signature feature: "Swatch-to-Scene" pipeline (photo swatch -> PBR texture -> model in 30 seconds)
9. S-grade confirmed for model-viewer + KHR_materials_variants + SGS block combination
10. Business decision: SGS Configurator Pro is a separate premium plugin (annual licence), not bundled in base theme

## Current State
- **Branch:** n/a (no code written yet — planning + model generation phase)
- **Tests:** n/a
- **Build:** n/a
- **Uncommitted changes:** None
- **Meshroom status:** Pipeline running with 158 masked frames on RTX 2060. Check `sites/snooza-chair/assets/models/meshroom-final/` for output
- **TripoSR output:** `sites/snooza-chair/assets/models/triposr-output/mesh.obj` (5/10 quality)
- **Project files:** CLAUDE.md, v1-development-plan.md, marketing-pricing-plan.md all written and comprehensive

## Known Issues / Blockers
- Meshroom reconstruction may fail with video frames (compression artefacts, limited angles, man touching chair in frames). If so, Tripo Pro ($10/month) is the fallback for production models
- TripoSR local output is 5/10 — usable for development placeholder, not production
- Both Tripo and Meshy lock API + export behind paid tiers ($10/month minimum)
- Windows Agent needs Gemini API key updated and model changed to gemini-2.0-flash-lite
- Development plan graded C (3.35/5) by gap-analysis — needs 3 fixes to reach B: client touchpoint at Gate 2, named stack specifics, 20% contingency buffer. All 3 fixes are now applied in the plan

## Next Priorities (in order)
1. Check Meshroom output quality. If good (>6/10), we have a free model pipeline for development
2. If Meshroom fails, subscribe to Tripo Pro ($10/month first month) for production model
3. Unit B — import best model into Blender 4.x, add 6 colour variants via KHR_materials_variants, Draco compress to <5MB GLB
4. Unit C — build configurator Gutenberg block (model-viewer + WP Interactivity API). This is the novel combination
5. Unit D (parallel with C) — lean ecommerce plugin core (CPT + REST cart + abstract payment gateway)

## Files Modified
| File | What changed |
|------|-------------|
| `plugins/sgs-configurator-pro/CLAUDE.md` | Full project spec with architecture, constraints, schema, scope |
| `plugins/sgs-configurator-pro/CONVERSATION-HANDOFF.md` | This file |
| `plugins/sgs-configurator-pro/.claude/plans/v1-development-plan.md` | Full phased plan with dependency graph, risk register, effort estimates, 7 units, 4 gates |
| `plugins/sgs-configurator-pro/.claude/plans/marketing-pricing-plan.md` | Pricing tiers, competitive positioning, go-to-market, revenue projections |
| `sites/snooza-chair/assets/video-frames/` | 203 frames extracted from Ophir video |
| `sites/snooza-chair/assets/meshroom-masked/` | 158 background-removed frames |
| `sites/snooza-chair/assets/models/triposr-output/` | TripoSR 5/10 output (mesh.obj) |

## Notes for Next Session
- Meshroom needs CUDA (RTX 2060 confirmed). Binary at `C:/Users/Bean/Projects/Meshroom-2023.3.0/meshroom_batch.exe`
- TripoSR venv at `C:/Users/Bean/Projects/TripoSR/venv312/`. Activate: `source venv312/Scripts/activate`
- rembg installed system-wide. Usage: `rembg i input.png output.png`
- Video segments: frames 1-45 = main chair rotation, 46-120 = accessories, 121-203 = other
- The man (Randall) is touching the chair in most frames — rembg keeps him. Meshroom will reconstruct him too. Delete his geometry in Blender post-processing
- Bean's feedback: solve problems before presenting them. Never present issues without solutions
- Payment gateway MUST be abstracted (no Stripe lock-in). Bean has ethical objection to Stripe's Israel support
- NO WooCommerce anywhere. Custom lean ecommerce
- All research and plans are in the .claude/plans/ folder — next session should read those before starting code

## Next Session Prompt

~~~
/using-superpowers
/wp-block-development
/wp-interactivity-api

Read CONVERSATION-HANDOFF.md and CLAUDE.md for full context, then work through these priorities:

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/using-superpowers` | FIRST — establishes live skill routing |
| `/wp-block-development` | When building the configurator Gutenberg block (Unit C) |
| `/wp-interactivity-api` | When wiring model-viewer state to WP Interactivity API (Unit C) |
| `/wp-plugin-development` | When building ecommerce plugin core (Unit D) |
| `/wp-rest-api` | When building cart/checkout REST endpoints (Unit D) |
| `/gap-analysis` | After completing each unit — MANDATORY, do not skip |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Context7 | Up-to-date WP Interactivity API docs, model-viewer docs, Blender Python API |
| Playwright | Visual QA at 375/768/1440px breakpoints after Unit C |
| GitHub MCP | Commit and push after each unit |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `test-and-explain` | After completing each unit — verify it works |
| `wp-sgs-developer` | Heavy WordPress block/plugin building work |
| `design-reviewer` | After Unit F — WCAG 2.2 AA check on the configurator |

---

## Task 1: Check Meshroom Output
Check `sites/snooza-chair/assets/models/meshroom-final/` for the photogrammetry result. If OBJ/PLY mesh exists, evaluate quality. If Meshroom failed, note failure and proceed with best available model (TripoSR 5/10 as development placeholder, Tripo Pro $10/month for production).

## Task 2: Get the Best Available Model into Blender
Import best model into Blender 4.x headless (Python API). Clean up topology (<30k polygons). Delete the man's geometry if Meshroom output included him. Add 6 colour materials. Set up KHR_materials_variants. Export compressed GLB (<5MB).

## Task 3: Unit C — Configurator Block
Build the Gutenberg block. Use viewScriptModule + WP Interactivity API. Wire option selectors to model-viewer variantName. Test on WP Playground. This is the novel combination — nobody has done this before. Read the config schema in CLAUDE.md.

## Task 4: Unit D — Ecommerce Plugin Core (parallel with Task 3)
Build lean ecommerce: product CPT, order CPT, REST cart, abstract payment gateway. NO WooCommerce. Follow the file structure in CLAUDE.md.

## Guardrails
- Run `/gap-analysis` after EVERY unit — grade must be >= B before proceeding
- No WooCommerce dependencies anywhere
- No Stripe-specific code in core — abstract payment gateway only
- model-viewer must be npm-bundled, not CDN
- All JS via viewScriptModule, no enqueue_script
- Test on mobile after every visual change
- Solve problems before presenting them
~~~
