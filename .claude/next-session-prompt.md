---
doc_type: next-session-prompt
project: small-giants-wp
thread: cloning-pipeline / theme-snapshot DEFAULTS fix → trust-bar icon-fill control → Task-3 residuals → re-clone + reliable parity tool
generated: 2026-07-03
primary_goal: "D259 (min-width/max-width cross-device tier CASCADE, FR-31-5.2) is BUILT + LANDED on page 8 (trust-bar 375=2/768=4/1440=4, Bean-confirmed) but its commit is BLOCKED by Gate A (golden-fixture regen needed) and held from push. A full clone-vs-draft parity audit produced the root-cause THEMES. NEXT (Bean-set order): (1) FIRST fix the Mama's Munches theme-snapshot/stylesheet to match the DRAFT DEFAULTS — base font-size 16px (clone renders 18px) + inherited line-heights — this fixes the brand-quote 16→18 + all no-explicit-size text in ONE theme-layer change; (2) trust-bar + icon-block FILLED-icon rendering (the star) + a CLIENT-FACING per-icon fill control (outline/filled) + a custom fill-COLOUR override (P-RAWSVG-FILLED-VS-OUTLINE); (3) ALL Task-3 residuals (P-FINGERPRINT-MIGRATION, P-ARRAY-RECOGNITION-SCORING, P-SINGLE-ITEM-ARRAYS, push held commits, + D101 carry-forward: product-card Layer-B, ingredient __icon, cog-complexity lint); (4) THEN re-run /sgs-clone + use the reusable computed-parity tool for reliable detailed scores + the L2 content-width UNIVERSAL fix + feature-grid variant fix. Resolve the D259 Gate A regen first. Follow Spec 31 in every detail; parity = computed values matched by content (CLAUDE.md rule 4a)."
---

# Next session — theme-snapshot DEFAULTS fix → trust-bar icon-fill control → Task-3 residuals → re-clone + parity tool

Invoke `/autopilot` before anything else. This is a `/systematic-debugging` + `/sgs-wp-engine` + spec-conformance session.

**Agent identity.** You are the SGS cloning-pipeline engineer. Last session built + LANDED the min-width cross-device tier CASCADE (D259) and ran a full clone-vs-draft parity audit that produced the root-cause themes. Your job: work the Bean-set task order below, starting with the theme-snapshot defaults fix (the single highest-visual-return, theme-layer change).

**State recap (plain English).** The cloning pipeline converts a draft mockup into native SGS blocks. D259 fixed the responsive GRID columns (min-width media rules were being silently dropped → the cascade now transfers them and inverts mobile-first into SGS desktop-base). LANDED + Bean-confirmed. The parity audit then showed the remaining gaps are: **(A) typography DEFAULTS** — the clone's theme base font is 18px vs the draft's 16px, so the brand-quote and every no-explicit-size paragraph renders 2px large + inherited line-heights are tight (Priority 1); **(B) L2 content-width** — the `__inner` content-band `max-width` drops (universal — 4 composites lack the mirrored `contentWidth` attr because the container-mirror sync is report-only); **(C) grid variant defaults** — feature-grid `layoutMode=auto-flex` ignores the transferred columns; **(D) product-card** structure broken. Content is ~96% present; explicit font-sizes are faithful.

---

## ⛔ THE 7 NON-NEGOTIABLE RULES (Bean-set; gate every change)
1. **CONVERT, don't mirror** — output = native SGS blocks driven by attributes; NOT a div-by-div copy of draft classes.
2. **NO CHEATS** — no `sourceMode='bound'` converter emit, no echo-`$content` passthrough, no hardcoded `!important`/default overriding faithful draft CSS, **no hand-declared per-block/per-draft selectors**, **no client copy baked into a base block**, **no per-slug/per-slot/per-role literal in a resolver body**. Only the live WC configurator `wc-product`/`sgs-cpt` is legitimate.
3. **UNIVERSAL, no carve-outs** — a fix fires for every qualifying block/case; over-broad universality is ALSO a break. Universal signal = a DB fact (`is_root`, `container_kind`, a capability), never `if slug == X`. **L2/contentWidth is UNIVERSAL across ALL container-equivalents (Spec 29) — "4 blocks lack contentWidth" is ONE mirror-sync gap, not 4 fixes.**
4. **NO SKIPPING** — every draft content node + CSS declaration transfers, OR is EXCLUDED-with-reason, OR is a tracked GAP. Zero silent drops.
5. **VERIFY ON THE REAL HOMEPAGE** — live computed-style/innerText + draft-vs-clone at 375/768/1440. Emit-green ≠ LANDED. WRITTEN ≠ LANDED. "Deploy to homepage" = overwrite the REAL homepage page (sandybrown = page 8), never a new page (D254). Don't declare a section fixed from a grid+N-items impression (STOP-40).
6. **RESPONSIVE VALUES IN BLOCK ATTRIBUTES, never inline CSS.**
7. **FOLLOW THE SPEC IN EVERY DETAIL** *(replaces the old design-gate rule — Bean 2026-07-02).* Spec 31 is the settled authority for every pipeline change. Read the governing section IN FULL and implement exactly what it specifies. Where the spec is silent, state that explicitly and pin the smallest spec-consistent rule (then write it INTO the spec), rather than inventing a mechanism.

## ⛔⛔ MANDATORY READING GATE (verify against ground truth, never guess; read WHOLE docs, not greps). Tick each in your first message:
1. ☐ **`.claude/specs/31-UNIVERSAL-CLONING-PIPELINE.md` — READ IT IN FULL, END TO END (Bean directive; STOP-26).** Especially §2 (core mechanism), §2.3/§2.4 (LAYER decomposition + the sole-pass-through fold → contentWidth), §3.A (CSS branch — max-width by LAYER, step 3/4), §13.4 FR-31-5.2 (the D259 device-tier cascade), §13.6 (composite-mirror).
2. ☐ **`.claude/specs/29-CONTAINER-EQUIVALENT-BLOCKS.md`** — the UNIVERSAL L1-L4 model + the container-mirror sync (`sync-container-wrapping-blocks.py --apply`, currently report-only) — this is the L2 content-width fix's universal channel.
3. ☐ **`.claude/handoff.md` (2026-07-03 top entry)** — D259 + the audit themes + the reliable-parity method + Gate A block + the log-accuracy doubt.
4. ☐ **`.claude/decisions.md` head** (verify D-ceiling: `grep -oE 'D[0-9]+' .claude/decisions.md | sort -V | tail -1` → D259).
5. ☐ **`CLAUDE.md` root-cause methodology rule 4a** (parity = computed values matched by CONTENT; never declaration-diff / wrapper-keying) + the draft `sites/mamas-munches/mockups/homepage/index.html` (base font, per-element typography).
6. ☐ **The live canary** — `https://sandybrown-nightingale-600381.hostingersite.com/` (page 8) — inspect after any deploy.

## Pre-flight self-attestation ritual (answer in your first message)
1. Have I completed the READING GATE — Spec 31 IN FULL + Spec 29 + handoff + decisions→D-ceiling + CLAUDE.md rule 4a + the draft? (Quote one specific thing to prove it.)
2. What branch + D-ceiling? (`git branch --show-current` → main; D-ceiling → D259.) D259 code is staged but its commit is BLOCKED by Gate A (regen needed); the D257/D258/D259 sets are held from push.
3. For the fix I'm about to build: theme-layer (theme-snapshot) or converter or block? Is it UNIVERSAL where it should be (Rule 3)? Does it FOLLOW SPEC 31 (Rule 7)?
4. Am I gating on the REAL page (LANDED page 8, computed-parity matched by content, Bean eye) not emit-green (Rules 4/5, STOP-4/21/37/40)?
5. For any subagent: CODING subagents CASCADE-FAIL here (STOP-39) — build INLINE. Read-only analysis/council/Explore agents work.

## ⛔ ANTI-PATTERN STOP CATALOGUE (carried forward; do NOT subtract)
- **STOP-1 — READ before you conjecture.** Verify every claim (yours, a subagent's, a doc's, a metric's) against ground truth — live code (file:line), the DB, the raw artefacts.
- **STOP-2 — Subagents RETURN data / implement assigned files; NEVER write shared files.**
- **STOP-4 — WRITTEN ≠ LANDED.** "An attr was emitted" is a progress signal, never a gate.
- **STOP-6 — A gate that EXISTS but isn't WIRED-TO-SOMETHING-THAT-RUNS protects nothing.** Grep the wiring + confirm it RUNS before claiming "enforced".
- **STOP-8 — Device-tier ≠ arbitrary visual breakpoints** (768/1024 vs 600/640/781).
- **STOP-10 — Empty cloned section = usually a cv2 soft-fail** — read extract.json + trace.jsonl first; gate on `innerText.length>0`.
- **STOP-11 — SCHEMA enumeration ≠ USAGE enumeration.** Knowing an attr/column exists is necessary-not-sufficient; grep how it's WRITTEN and READ.
- **STOP-15 — A council/analysis finding is a HYPOTHESIS.** FACT-CHECK it against ground truth (file:line, DB rows) before acting.
- **STOP-16 — A subagent's "N tests pass / gate green" is a HYPOTHESIS.** Re-run the suite + gate `--check` YOURSELF from the CANONICAL cwd (`plugins/sgs-blocks/scripts`, `--import-mode=importlib`).
- **STOP-21 — LANDED-proven only by deploying the GENUINE emit to a live page + computed-style/innerText — NOT new-vs-frozen attr equivalence.** Recipe: `/sgs-clone SGS_NEW_ENGINE=1` → overwrite page 8 → anonymous Playwright. Creds: `.claude/secrets/sandybrown.env` (grep/cut, never `source`).
- **STOP-23 — Run a pre-commit `/qc-council` (or an adversarial council) on the BUILT converter code** (blub 255). Verify input-class ≠ output-class; render.php reads the attr you write AND paints the element you check.
- **STOP-24 — A DB change a reseed RE-DERIVES must use a reseed-surviving channel** (block.json / a dated migration / `sgs-update` seeder), never a manual DB edit. NOTE: `slots.aliases` is written only by `uimax-tools/seed-slot-synonyms.py`, NOT wired into `/sgs-update`.
- **STOP-26 — Read the WHOLE target spec section holistically before building.**
- **STOP-27 — A conservation/regression guard is `raise`, NEVER a bare `assert`** (`python -O` strips assert).
- **STOP-28 — Do NOT flip the PRODUCTION default to the new engine** until A1 (media-map) + A2 (content ledger) are green. `SGS_NEW_ENGINE=1` is the opt-in test switch. Intact.
- **STOP-31 — A commit-blocking static gate must be scoped to the cheat's ACTUAL syntactic context; plant-test it.**
- **STOP-32 — FOUR-CHANNEL CHECK before claiming a CSS property is "dropped"** (native supports→style.*, custom attrs, wrapper render, spec destination).
- **STOP-34 — SYNTHETIC-FIXTURE-GREEN ≠ REAL-DRAFT-CORRECT.** Reproduce on the FULL real draft.
- **STOP-35 — DEFAULT-IS-CONTAINER: a slug-None class-section defaults to `sgs/container` + recurse, it does NOT fail.**
- **STOP-37 — LANDED catches EMIT/SERIALISATION bugs unit tests structurally cannot.** Deploy + count rendered sections/items.
- **STOP-38 — A section-outer/wrapper fix scoped to ONE slug is an R-31-9 carve-out CHEAT.** Fire on a DB signal (`is_root`, capability), never a slug literal.
- **STOP-39 — CODING SUBAGENTS CASCADE-FAIL in this environment.** DO THE BUILD INLINE. Read-only analysis/council/Explore agents work fine.
- **STOP-40 — Don't declare a section "fixed" from seeing a grid + N items.** Check the RENDERED result vs the DRAFT's actual desktop layout.
- **STOP-41 — the `no_slug_literal` gate guards `role`/`slot`/`canonical_slot` too, not just `block_slug`.** Any per-slot/per-role LITERAL comparison in a resolver body is a carve-out it blocks. Normalise via the DB or the un-gated shared `field_extractors`.
- **STOP-42 (NEW, 2026-07-03) — PARITY = computed values matched by CONTENT, never source-declaration-diff, never wrapper-class-keying.** Source-declaration-diff is blind to INHERITED values (missed the brand-quote 16→18 base-font drop); wrapper-class-keying compares raw-section vs block-wrapper (false positives). Use `getComputedStyle` on rendered text elements keyed by normalised text content. CLAUDE.md rule 4a. Also: the pipeline drop-logs (`attribute_gap_candidates`=cumulative ledger, `leftover-buckets.json`) measure converter INPUT-side, NOT rendered fidelity — do NOT trust their counts as a per-clone drop signal (Bean's doubt, confirmed).

---

## ORCHESTRATION PLAN (Bean-set order 2026-07-03; every task FOLLOWS SPEC 31; parity = computed-matched-by-content)

### Task 0 — Resolve the D259 Gate A regen + commit (quick, first)
**What:** D259's commit is blocked by Gate A (golden-fixture regression) because the fix intentionally changes the converter emit. Verify the fixture diff is ONLY the intended min-width tier change (not accidental drift), then re-baseline with `REGEN=1` + a cited reason, commit the held D259 code+docs. Do NOT push yet (held for Bean full sign-off with D257/D258).
**Orchestration:** INLINE. **Acceptance:** Gate A green with an honest regen reason; `git log -1` shows the D259 commit on main.

### Task 1 — TOP: fix the Mama's Munches theme-snapshot to match the DRAFT DEFAULTS (theme-layer)
**What:** The clone's base font-size is 18px; the draft's is 16px (the draft `body` sets only `line-height:1.6` → text falls to the 16px default). So the brand quote + every no-explicit-size paragraph renders 2px large, and inherited line-heights are tight. Fix the per-client theme (`sites/mamas-munches/theme-snapshot.json` base typography → `push-theme-snapshot.py`) so the base font-size + line-height match the draft. This is NOT a converter change — it is the theme defaults.
**Why:** one theme-layer value fixes the brand-quote 16→18 + all no-explicit-size body text at once (Priority 1, highest visual return).
**Orchestration:** INLINE (`/sgs-wp-engine`). Deploy the snapshot, then computed-parity-verify (matched by content, rule 4a) on page 8.
**Acceptance:** the brand quote renders 16px on page 8; the reliable computed-parity typography score rises materially from the 62% baseline.

### Task 2 — trust-bar + icon-block FILLED icon + a CLIENT-FACING fill control + custom fill-colour override (P-RAWSVG-FILLED-VS-OUTLINE)
**What:** The trust-bar's 4th badge (the star) must render FILLED, but the block's icon CSS forces `fill:none; stroke:currentColor` on every SVG uniformly → the raw star renders as an outline. Fix: expose a per-icon "fill style: outline / filled" CONTROL in the trust-bar + icon block editor + a custom fill-COLOUR override; the converter sets it; render exempts a `filled` icon from the uniform `fill:none`.
**Why:** Bean's principle — every pipeline capability MUST ship as a customisable block control for the clients buying the sites; a converter-only fix is half-done.
**Orchestration:** INLINE (block-dev). Add attr + inspector control + render + deprecation/version bump. `npm run build`. Live-verify.
**Acceptance:** a client can toggle a badge icon outline↔filled + set its fill colour in the editor; the cloned star renders filled on page 8.

### Task 3 — ALL Task-3 residuals (fact-check each; DONE-NOW / DISMISSED / DEFERRED-with-blocker)
- **P-FINGERPRINT-MIGRATION** — migrate `fingerprints.json` selectors → `ATTR_CLASSIFICATION_OVERRIDES` + drop the fingerprints load from `assign-canonical.py`. 62 entries staged at `.claude/scratch/fingerprint-migration-entries.txt`; needs a core/* keep-skip decision + a reseed-diff proving zero regression. INLINE.
- **P-ARRAY-RECOGNITION-SCORING** (FR-31-2.5a) · **P-SINGLE-ITEM-ARRAYS** · **push the held commits** (D257/D258/D259 on Bean's page-8 sign-off).
- **D101 carry-forward:** product-card typed-mode Layer-B rebuild, ingredient `__icon` emoji lift, cognitive-complexity lint on `array_content.py`.

### Task 4 — THEN re-clone + reliable parity tool + the bigger converter fixes
**What:** After Tasks 1-3 land + QC, re-run `/sgs-clone SGS_NEW_ENGINE=1` → page 8, and run the reusable computed-parity tool (built this thread — text-matched computed values, typography+colour+spacing+layout) for reliable detailed per-section scores. Then tackle the **L2 content-width UNIVERSAL fix** (apply the container-mirror sync so all container-equivalents get `contentWidth` + fix the `__inner` fold routing) + the **feature-grid `layoutMode`/columns fix** + **product-card structure**.
**Acceptance:** dependable per-section parity scores; L2 content-width lands on trust-bar/gift/ingredients/social/featured; feature-grid renders 4-col at 1440.

## Skills to Invoke
| Skill | When |
|-------|------|
| `/brainstorming` | design thinking where the spec leaves a detail open (then write it into the spec) |
| `/gap-analysis` | grade any output before delivery |
| `/lifecycle` | before any skill/agent/pipeline change |
| `/research` | auto-routes if a defect needs external reference |
| `/strategic-plan` | order the tasks before coding |
| `/systematic-debugging` | ALWAYS — root-cause on the DRAFT + live page before any fix |
| `/sgs-wp-engine` | theme-snapshot + block-dev (Tasks 1+2) — evidence-gate + SKILL-STATUS harness |
| `/sgs-clone` · `/sgs-db` · `/wp-blocks` | DB ground-truth + the LANDED run (`SGS_NEW_ENGINE=1`) |
| `/qc-council` · `/qc-inline` | multi-rater on BUILT converter/block code before commit (STOP-23) |
| `/verify-loop` · `/handoff` · `/capture-lesson` | 2-attestation / session close |

## MCP Servers & Tools
| Tool | What for |
|------|----------|
| Playwright / chrome-devtools | LANDED proof on page 8 — computed-parity matched by CONTENT (rule 4a) at 375/768/1440 |
| `python ~/.claude/hooks/wp-blocks.py dump` · `sgs-db.py sql "..."` | schema/DB ground-truth before any "missing X" |
| REST (Basic auth, `.claude/secrets/sandybrown.env`) | overwrite page 8 (the homepage) — NOT a new page (Rule 5) |

## Agents to Delegate To
| Agent | When |
|-------|------|
| `Explore` (read-only) | parallel ground-truth analysis (works; coding agents cascade-fail — STOP-39) |
| `wp-sgs-developer` | heavy block-dev (Task 2 icon control) — via the agent OR inline, NOT general-purpose coding subagents |

## Methodology guardrails (do not skip)
- **FOLLOW SPEC 31 in every detail** — no design-gate; the spec is the settled authority (Rule 7). Where silent, pin the smallest spec-consistent rule + write it into the spec.
- **PARITY = computed values matched by CONTENT** (CLAUDE.md rule 4a / STOP-42) — never declaration-diff, never wrapper-keying. Build/reuse the computed-parity tool.
- **Deploy before measure** — any LANDED check requires the genuine `SGS_NEW_ENGINE=1` emit deployed to page 8 BEFORE any computed read (STOP-21). "Deploy to homepage" = overwrite page 8.
- **Universal or it's a cheat** — L2/contentWidth fires for ALL container-equivalents on a DB signal (Spec 29), never a slug literal (Rule 3, STOP-38/41).
- **/qc-council BEFORE every commit** touching converter/block/theme (blub 255). **LANDED (Bean eye on page 8) is the closing gate**, not emit-green (R-31-13 / STOP-4/21/37).
- **convert.py stays byte-identical** (D-MODULAR) — never edit the frozen engine; port-read only.
- **Do NOT trust the pipeline drop-logs' counts** as a per-clone signal (STOP-42) — they are cumulative/input-side. Rendered computed-parity is the signal.
- Tests: `cd plugins/sgs-blocks/scripts && python -m pytest converter/tests cheat-gate/tests -q --import-mode=importlib` (320 baseline; never drop). Cheat-gate: `python cheat-gate/run.py --check` exits 0. Branch `main`; verify D-ceiling; commit path-scoped (`git commit -- <paths>` or `-F msg`, NOT `-m` after `--`). Block.json metadata-only commits: the visual-diff gate's own message sanctions `--no-verify`.
