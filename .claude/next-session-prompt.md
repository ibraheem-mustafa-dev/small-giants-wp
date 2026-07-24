Invoke /autopilot before doing anything else.

> **Co-active tracks share this worktree.** A Spec-35/31 track commits between handoffs. Files under
> `plugins/sgs-blocks/scripts/behavioural-analyser/*`, `db-consistency/*`, `sgs-update-v2.py`,
> `includes/lucide-icons.php`, `reports/phase4-*.txt`, `.claude/reports/inline-styling-audit-*`,
> `plugins/sgs-blocks/scripts/tests/fixtures/phase-f/*`, `.claude/mistakes.md`, and
> `next-session-prompt-spec35*.md` / `next-session-prompt-track1-converter.md` may carry UNCOMMITTED changes
> that are **not yours**. Path-scope every commit, re-check `git branch --show-current` in the SAME command as
> the commit, never `git add -A`. **The shared prebuild is RED** on the co-active `sgs/tabs` `tabIndicatorColour`
> DB↔block.json finding (STOP-24). Build via `npx wp-scripts build --experimental-modules --webpack-copy-php`
> directly; the SGS visual-diff pre-commit gate blocks any touch to a block's render.php/block.json/edit.js
> without a passing visual-diff report — its OWN message sanctions `--no-verify` for logic-predominant changes
> (STOP-VISUAL-DIFF-GATE-NO-VERIFY-FOR-LOGIC). Do NOT reseed their DB; do NOT baseline their finding. A bare
> `git commit` (whole index) is gate-blocked on this shared tree — add `[batch-ok:<reason>]` in the command
> only after verifying `git diff --cached --name-only` is exclusively your paths.

---

# Next session — BUILD the SGS mega CORE (Spec 36 Phase 2, re-scoped)

You are the engineer-orchestrator for the SGS mega-menu. The DESIGN is DONE: last session ran the full
pre-build gauntlet — grounding → complete BUILD-SPEC → 7-persona adversarial council (NO-GO→GO-after-re-scope)
→ source fact-check (caught 1 false claim, CF-3) → qc-council (all 15 fixes validated). **This session BUILDS
the re-scoped core against a pinned, council-hardened spec. No fresh design — clean execution.**

## First action (smallest step, <5 min, zero deps)
```bash
cd "c:/Users/Bean/Projects/small-giants-wp" && git log -1 --format='%h %s' && \
  grep -oE 'D[0-9]{1,4}' .claude/decisions.md | sort -V | tail -1 && git branch --show-current
```
Expect branch `main`, D-ceiling ≥ D378. Then run the **SPIKE** (below) — the true first build step.

## Mandatory READING — before any Write/Edit or dispatch
1. **`.claude/plans/2026-07-24-mega-menu-BUILD-SPEC.md` §0.5 (CORE SCOPE + CF-1..CF-15) + §0.6 (qc-council
   validation ledger) FIRST** — the self-contained, controlling build spec. §1–§10 = full-vision follow-on
   reference. §0 = the D-A..D-G decisions.
2. **`.claude/plans/2026-07-24-mega-menu-foundation-strategic-plan.md`** — unit specs (superseded by §0.5.D for the sequence).
3. **`.claude/LEDGER.md`** ⭐ CURRENT + ⭐ Your next session.
4. **`.claude/STOP-CATALOGUE.md`** — the uncapped STOP catalogue + pre-flight ritual (§C).
5. **`.claude/specs/36-SGS-NAVIGATION-SYSTEM.md`** IN FULL (governing spec) — esp. FR-36-3/4/5/9a/10/11/17.

## Why this matters (motivation — Rule 7)
A block-native, ARIA-compliant, **content-preserving** mega menu that replaces Max Mega Menu / JetMenu /
Kadence Pro with zero external deps — and (the council's named differentiator) preserves rich content on
mobile where every competitor flattens. The core proves the spine (a mega opens on a real page, editable,
a11y-clean); the polish drops onto it next. Headline nav surface for every client build.

## The build (BUILD-SPEC §0.5.D — each is a task; orchestration annotated)

**SPIKE — canary CPT-attach (inline, <5 min).** On sandybrown: create one `sgs_mega_menu` post, confirm it
appears in Appearance→Menus, attach it, confirm `Sgs_Mega_Menu_CPT::resolve_panel_for_menu_item` returns it.
The CPT + resolver already EXIST + are correct (verified) — this proves attach live. **Acceptance:** attachable + resolves.

**Wave-0 — extract + pin (inline, ~15 min).**
`git show '23a3cf63^:plugins/sgs-blocks/src/blocks/mega-menu/view.js' > .claude/scratch/old-mega-menu/view.js`
(+ render.php). Pin into §0.5: the `general` InnerBlocks template block-by-block (CF-10 — decide `sgs/mega-group`
vs `sgs/container`-locked), all 9 manifest attrMaps (CF-12), apply the `columns→columnCount` rename (CF-11).

**U1..U13 core.** Delegate implementer units to `wp-sgs-developer` (Sonnet) — **each dispatch MUST say "EXECUTE
YOURSELF with your OWN tools; do NOT delegate to further agents" (D362).** `/qc-council` before any SGS-block commit (blub.db 255).
- **U1** scaffold — `general` only (enum-declare media-cards/brands); attrs + ADVISORY manifest (CF-4/11/12).
- **U3-spike** — prove `templateLock:contentOnly` + `role:content` edits live (CF-6). Depends: U1.
- **U2** render.php + style.css — `columns`=**FLEXBOX** (CF-9), light-only, caret, optional static cta aside;
  escaping (CF-2); recursion-safe helper in a `function_exists`-guarded include (D374/CF-1). Depends: U1.
- **U3** edit.js — element×cluster inspector (advisory manifest); **`variant` INSERT-TIME only** (CF-5). Depends: U1.
- **U8** — NEW `src/shared/nav-interactivity/mega-disclosure.js` `store('sgs/mega')` (CF-3: reuse ONLY pure
  helpers — `getFocusable`/`prefersReducedMotion` are NOT exported, add them to store.js's export or
  re-implement; NO reparent/scroll-lock/showModal). Commit ISOLATED + tag. Independent of U1/U2/U3.
- **EARLY drawer smoke-check** on the canary (drawer un-regressed) BEFORE U9. Depends: U8 deployed.
- **U9** nav wiring — resolve + `<button aria-expanded>` (CF-15: trigger=button, destination link INSIDE the
  panel) + `do_blocks` at real position + **recursion guard CF-1** (visited-set + depth-cap 3) + JS-off degrade;
  NEVER a top-level fn in render.php (D374). Depends: U2, U8.
- **U10** 2 `general` patterns + scratch shell · **U11** theme `style.css` version bump (pattern cache). Depends: U1/U2.
- **U12** build + deploy (isolated worktree, `--skip-build`, md5-verify) + **live-a11y QC** (axe open panel +
  drawer, occlusion, crawl JS-off, reduced-motion, no drawer regression, recursion-guard test, escaping-injection
  test) + Bean's eye (R-31-13). Depends: ALL. /qc-council before commit.
- **U13** docs — fix Spec 36 §8a (CPT + resolver EXIST + correct; the `show_in_nav_menus` citation is wrong) + record decisions.

**DEFERRED (declared, NOT cut):** the 5 effects (KEEP caret), `media-cards`+`brands`, night/day `dark` set,
aside `feature`/`preview`, full manifest conformance, the true safe-triangle (CF-13 ships the 170ms bridge —
record the deferral against FR-36-4, STOP-29).

## Dependency graph
```
SPIKE → Wave-0 → U1 ──┬─ U2 (U1) ──────────────┐
                      ├─ U3 (U1)                │
U8 (independent) ── EARLY drawer-check ──────── U9 (U2+U8) ─┐
                      └─ U10/U11 (U1/U2) ───────────────────┴─ U12 (all) → U13
```

## Pre-flight self-attestation ritual (answer inline before first Write/Edit or dispatch)
**Full uncapped ritual + ALL STOP defences = `STOP-CATALOGUE.md` §C — carried forward there, never dropped.
Below = the mega-build subset + this session's NEW gates (12/13/14/15 from the fact-check + council):**
1. Read BUILD-SPEC §0.5/§0.6 + the strategic plan + LEDGER + STOP-CATALOGUE + Spec 36 in full?
2. Did last session LAND? (It was DESIGN only — 2 plan docs, no code. D-ceiling ≥ D378. Nothing to "verify shipped".)
3. Am I about to assert a cause I have NOT tested? (STOP-PROVE-CAUSE-BEFORE-FIX.)
4. Building the CORE scope only (general/columns/light/caret) — NOT the deferred effects/variations/night-day? (§0.5.A.)
5. Passing the declared SHAPE (object vs flat; support vs attr)? (STOP-D328.)
6. Reusing what exists — CPT+resolver (built), the pure store helpers, Spec-35 components, the recovered view.js? Did I grep?
7. Am I extending `store('sgs/nav')`? DON'T — a SEPARATE `store('sgs/mega')` module (CF-3). The drawer store is untouched.
8. Canary before dev-site? Full cache clear + theme-version bump (pattern cache) before measuring? Desktop browser for geometry?
9. D-ceiling + branch verified in the SAME command as the commit? (STOP-RECHECK-BRANCH.)
10. Touching another track's files (lucide-icons.php, phase4-*, phase-f fixtures, spec35/converter prompts)? DON'T.
11. Would my acceptance test still pass if the feature were absent? (STOP-NEGATIVE-CONTROL.)
12. **[NEW] Is this pinned CF still true against source?** Fact-check council fix-shapes before acting — CF-3 was FALSE last session (STOP-FACT-CHECK-COUNCIL-FINDINGS).
13. **[NEW] `role:content` on every editable child attr, verified LIVE** (a green build won't catch it)? (CF-6.)
14. **[NEW] Recursion guard on the render path + a named self-reference test at U9?** (CF-1 — a fatal DoS otherwise.)
15. **[NEW] Escaping:** colour→`sgs_colour_value()`, dims→the nav-menu regex, text/URL→`esc_html`/`esc_url`, no raw attr in `<style>`? (CF-2.)
16. A 2+-instance-of-the-same-block live page (D374) + no top-level fn in per-render render.php?
17. Verifying a fix EMITS/RENDERS on the live page, not just that the code exists? (R-31-11/13.)
18. Every implementer dispatch says "EXECUTE YOURSELF, do NOT delegate" (D362)?
19. Setting option-driven/active state via the admin action / live-domain context, not a raw CLI `wp option update` (D360)?
20. Proving a thing is MISSING before adding it, against rendered output (D369)? Not deleting on a live site without inspecting (D362)?

## Methodology guardrails (do not skip)
- **Fact-check council/register fix-shapes against LIVE SOURCE before applying** (STOP-FACT-CHECK; CF-3 proof this session).
- **/qc multi-rater BEFORE every commit** touching SGS block/converter logic (blub.db 255).
- **Deploy on a shared worktree via an ISOLATED worktree** — commit first, `git worktree add --detach <sha>`,
  copy `build/` (+ changed `includes/`), `--skip-build`. Never junction node_modules. Checksum every deploy
  (`md5sum` local↔server); `[verify] HTTP 200` passes on ANY working page (STOP-VERIFY-DEPLOY-BY-CHECKSUM).
- **WP_DEBUG_DISPLAY stays false** on staging. **STOP-29** — never "out of scope" on a spec'd surface; map every deferral to a named spec stage.
- **An agent's "done" is a CLAIM** — verify against the real repo / live state (D362).

## Known-open, NOT blockers
- The `sgs_mega_menu` CPT + `resolve_panel_for_menu_item` EXIST + are correct — do NOT rebuild (Spec 36 §8a is stale; U13 fixes it).
- `P-MAMAS-PRIMARY-CONTRAST` · two unnamed `<main>` landmark defect · both sites generic proof headers.
- Blub dashboard DOWN (port 5050) — lessons pending upload. Design zips gitignored; extracted folders committed.

## Skills to Invoke
| Skill | When |
|---|---|
| `/brainstorming` | ALWAYS — but design is DONE; only for a genuinely new sub-decision (e.g. CF-10 block choice) |
| `/gap-analysis` | ALWAYS — grade dispatched agents' output before acting |
| `/lifecycle` | ALWAYS — before any skill/agent change |
| `/research` | ALWAYS — auto-routes the tier |
| `/strategic-plan` | ALWAYS — but the plan EXISTS (§0.5.D is the sequence) |
| `/sgs-wp-engine` | Any SGS block/theme work |
| `/wp-block-development` | Core WP block-API questions |
| `/qc-council` | Multi-rater before any SGS-block commit (blub.db 255) |
| `/qc-inline` | Inline acceptance gate |
| `/systematic-debugging` | Root cause before fix |
| `/sgs-db` · `/wp-blocks` | Mega CPT/block/variant DB ground truth |
| `/wp-sgs-deploy` | Deploy ceremony + gates |
| `/handoff` | Session close — rewrite THIS file + the LEDGER |

## MCP Servers & Tools
| Tool | What for |
|---|---|
| `playwright` / `chrome-devtools` | Live DOM (R-31-11): SPIKE attach, disclosure hover/tap/keyboard, axe, drawer no-regression |
| `hostinger` | Cache purge / WP version checks |
| `sgs-db.py` | Mega CPT + block attrs/variants — DB is authoritative |
| `nav-qa/*.mjs` | `axe-run` · `crawl-assert` · `palette-contrast-sweep` |

## Agents to Delegate To
| Agent | When |
|---|---|
| `wp-sgs-developer` | U1..U13 builds (add "EXECUTE YOURSELF, do NOT delegate", D362) |
| `code-reviewer` / `general-purpose` | Pre-commit multi-rater review + verify dispatched agents' "done" |
| `design-reviewer` | Compare the built mega panel against Bean's Claude Design drafts |
| `test-and-explain` | Plain-English confirmation for Bean that the mega picker + disclosure work |

## Guardrails
- Build via `npx wp-scripts build --experimental-modules --webpack-copy-php` (shared prebuild RED on co-active sgs/tabs).
- Path-scoped commits only; re-check branch in the same command; `--no-verify` + `[gates-ok:<reason>]` for logic-only.
- The mega is a SEPARATE disclosure module — do NOT touch `store('sgs/nav')`'s drawer orchestration.
