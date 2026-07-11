---
doc_type: next-session-prompt
project: small-giants-wp
generated: 2026-07-11
thread: page-8 clone-fidelity discrepancy programme — root-cause the recurring hardcoded-default divergences (Bean-reported), then the inline-styles architecture
---

# NEXT SESSION — page-8 fidelity discrepancy programme (root-cause, universal, Spec-31-aligned)

Invoke `/autopilot` first. This session ships **D304+D305**: a scoped-selector live gate + three D228
"hardcoded-default overriding the draft" fixes (button `flex-wrap`, hero `.sgs-hero--split` gap, heading
`text-wrap:balance`). Bean reviewed page 8 and gave a **discrepancy register** (full text in parking
`P-PAGE8-DISCREPANCY-REGISTER`). His meta-diagnosis: *"we haven't purged the hardcoded styles from our blocks
completely"* + a routing issue (card-grid) + an inline-styles architecture concern.

**Bean's binding constraints for this programme (verbatim intent):** do NOT fix these piecemeal. **Root-cause
each**, find the **universal fix** that **aligns with Spec 31's relevant sections + rules**, and make sure the
fix does **not resemble any cheat listed in Spec 31**. Many of these collapse to ~3 universal causes (borders,
heights, buttons), not 15 instance fixes.

## ⛔ MANDATORY READING GATE (read IN FULL before any Write/Edit)
1. `.claude/handoff.md` (D304+D305 session) + `.claude/decisions.md` head (D305 + D304 + D301/D302/D303).
2. **Spec 31 IN FULL** (Bean-locked every session) — esp. §3.A CSS routing + §3 F-fork + §13.4 FR-31-5.1
   (absent-value → CSS initial), FR-31-5.2, FR-31-22 (box-object), §13.6 composite-mirror + the D294
   clarification, §7b (verify vs draft), AND the **cheat catalogue** (so your fix does not resemble one).
3. Spec 32 §6.1 (box-object / no-inline contract) — for the inline-styles track.
4. `.claude/parking.md` head — **`P-PAGE8-DISCREPANCY-REGISTER`** (the full grouped register) +
   `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` (the brand-spacing line-height may be this).
5. Surfaces you WILL likely touch: `converter/services/assembly.py`, `converter/services/styling_helpers.py`
   (`collect_css_decls_for_element`), `converter/services/root_supports.py`, the block `render.php`/`style.css`
   for card-grid / product-card / option-picker / label / info-box / notice-banner / testimonial / trustpilot,
   the shared `class-sgs-container-wrapper.php`.

## ⛔ ANTI-PATTERN STOPs (carry forward + this session's)
- **STOP-16** — a subagent/"it works"/build-green is a HYPOTHESIS. Re-run yourself: `npm run build` (PowerShell);
  `python -m pytest plugins/sgs-blocks/scripts/converter/tests -q --import-mode=importlib` (440 pass, 1 skip).
- **STOP-21** — emit-green ≠ LANDED. LANDED = deploy + OPcache reset + **CDN cache clear** + live computed-style
  at 375/768/1440. This session a stale CDN-cached CSS misled a live measure for ~20 min (the versioned
  `style-index.css?ver=` edge-caches; `hosting_clearWebsiteCacheV1` was needed, not just LiteSpeed rm).
- **STOP-static-vs-live (NEW, D304)** — for any "does this class / style actually land?" question, use the LIVE
  DOM (Playwright computed-style / `audit-scoped-selector-live.js`), NEVER static PHP parsing. A static analyser
  gave 26 FALSE POSITIVES this session (can't follow array_merge / variable class-arrays / esc_attr / wrapper
  extra_classes). Fact-check your OWN tool output before presenting it (prove-the-cause).
- **STOP-D228 (NEW, reinforced 3× this session)** — a framework default (block/theme/wrapper) that overrides the
  draft's faithfully-ABSENT value is a CHEAT to REMOVE/GATE, not a contract to keep. The fix = emit the draft's
  effective value (declared, else the CSS-initial); scope it universally (never per-block carve-out, R-31-9).
  Bean's whole discrepancy list is this pattern.
- **STOP-60** — a converter change that adds new attrs to cloned output changes conformance goldens. Re-run the
  suite; re-seed deliberately + LANDED-proof-cited (NOT a blanket re-seed).
- **STOP-44** — a schema-valid emitted attr can be a render no-op; verify the LIVE painted value.
- **STOP-48/49** — do NOT trust `computed-parity.js` numbers or leftover-buckets; the dependable signal = direct
  Playwright content-matched computed-style comparison + Bean's eye. IGNORE header/footer + the accepted
  testimonial static-grid→slider when judging fidelity.
- **STOP-67** — pre-commit visual-diff gate needs `reports/visual-diff/<block>-<date>.md` (EXACT name,
  `verdict: PASS` + `first_paint_capture_passed: true`) per CHANGED block. The commit hook BLOCKS without it.
- **STOP-34** — verify a converter fix on the REAL draft node (`build_block_markup(recognise_section(node), node,
  ...)`), not a synthetic fixture. (This session's D305 emit was verified on the real hero H1.)
- **safecss strips functional colours** — any INLINE colour VALUE must be hex/named/var (D302). Relevant to the
  black-border track (a stripped border-colour → currentColor → black is a candidate root cause).
- **Harness/node runs via PowerShell** (nvm4w shim broken in Git Bash). Python works in Bash.
- **Path-scoped commits** — `git commit -m <msg> -- <paths>` (message BEFORE `--`); `git add <file>` for NEW
  files first. Never `git add -A`. Don't pipe git to tail. **No version bumps / deprecations (pre-production).**
- **DB seed not in git** — a new block.json attr needs `/sgs-update --stage 1` to reach `block_attributes`
  (the converter's `db_lookup.block_attrs` reads the DB). block.json is the source of truth.

## Tasks (root-cause investigation programme — see `P-PAGE8-DISCREPANCY-REGISTER` for the full symptom list)

### Task 0 — Re-clone page 8 (FIRST; ~10 min)
- **What:** re-run the clone on the Mama's draft → page 8, so its headings pick up D305 `textWrap:wrap` and the
  baseline reflects the current converter. **Why:** page 8's hero H1 still renders `balance` (cloned pre-D305);
  and every discrepancy below must be judged against a fresh clone. **Orchestration:** inline (Opus). `/sgs-clone`
  or `sgs-clone-orchestrator.py`. **Acceptance:** hero H1 renders greedy "Made for the" live at 800px; page 8 =
  current converter output. Deploy + OPcache + CDN clear + verify.

### Task 1 — The recurring BLACK BORDER (universal; biggest ROI)
- **What:** borders render **black** in the clone but the draft uses the border token (`#E8D5C0`) or accent
  (`#F5D050` for the trial card's dashed border). Appears on: featured + trial product cards, both gift cards,
  announcement-bar container, info boxes, testimonial cards, trustpilot bar. **Root-cause hypothesis:** one
  cause — border-colour not transferred → defaults to `currentColor`/black (candidate: safecss strips a
  functional border-colour value, D302; OR the border-colour is never lifted; OR a block/wrapper default).
  **Constraint:** universal fix (border-colour transfer for ALL blocks), Spec 31 §3.A routing, no cheat.
  **Acceptance:** every listed section's border renders the draft's colour live.

### Task 2 — Card equal-height (product cards + gift cards)
- **What:** cards in a group render different heights; the draft standardises them (card-grid items stretch to
  equal height). Bean: *"think the source is it routed to sgs/container instead of card-grid"* and/or card-grid
  items aren't `align-items: stretch`. **Root-cause:** the routing (why product/gift card groups become
  containers not card-grids) + the grid-item stretch. Spec 31 recognition + §13.6 composite-mirror.
  **Acceptance:** cards in a row are equal height live at all widths.

### Task 3 — Button style fidelity
- Featured card button: white text / primary default instead of the draft's black-on-token; Trial card button:
  renders identical to featured when the draft is a **secondary** style; Brand "Read The Full Story": fixed-size
  left-aligned, draft is **full-width centred**; Announcement "Find out more": missing the draft's underline
  hover. **Root-cause:** button preset / `inheritStyle` / width not transferred faithfully (D228 defaults).

### Task 4 — Component injected-default sweep (the D228 purge Bean flagged)
- Option-picker: a **tick mark** on the selected pill not in the draft; pills wider than draft (blank
  left space reserved for an unset colour swatch). Label highlight: trial "NEW? START HERE" should stretch
  full-width; gift labels render a tight capsule vs the draft's padded rounded box. Info-box: text **margins**
  injected that the draft lacks. Disclaimer: missing the white background box + border (same token as featured
  card); text first-line much longer than the draft's balanced 2 lines. Emojis smaller than the draft.
  Trustpilot bar taller than the draft. **Root-cause each** as an injected default; universal removal/gate.

### Task 5 — Brand-section spacing / line-height
- Bigger gaps between paragraphs + heading↔quote than the draft. **May be** the theme base line-height (the
  parked `P-DRAFT-TOKEN-EXTRACTION-SETUP-PIPELINE` — theme base vs draft base). **Verify it isn't a separate
  injected margin** before attributing it to the token pipeline.

### Task 6 — Inline-styles architecture (Bean's separate concern; Spec 32)
- **What:** CSS is still emitted INTO the HTML via assorted tags — `<style>`, style-id, section-style-class,
  div-style, section-style — rather than appearing in the DevTools Styles panel like the draft. Bean reads this
  as a cheat (the CSS is still inline, just relocated). **Investigate** against Spec 32 §6.1 no-inline contract:
  which emissions are legitimate scoped `<style>` (the contract) vs genuine inline `style="…"` that must move.
  Distinguish the two precisely before changing anything.

## Orchestration
- Tasks 1–5 are ROOT-CAUSE-FIRST: `/systematic-debugging` to prove each cause on the live DOM vs the draft
  BEFORE any fix; group symptoms by shared cause; `/qc-council` on any shared-surface fix (converter / wrapper /
  shared helper) before dispatch. Read-only trace agents (general-purpose Sonnet) may run in parallel; coding is
  SOLO (one writer). Task 0 gates all others (need a fresh clone). Present the grouped root-cause register to
  Bean (diagnosis-first) before fixing.

## Skills | MCP | Agents
- `/systematic-debugging` (prove each cause), `/brainstorming` (fix shape), `/qc-council` (shared-surface),
  `/gap-analysis` (grade), `/sgs-clone` `/sgs-db` `/wp-blocks` (ground truth), `/handoff` `/capture-lesson`.
- Playwright / chrome-devtools MCP (live computed-style 375/768/1440 + matched-rule enumeration — the tool that
  cracked the text-wrap cause this session); **Hostinger MCP `hosting_clearWebsiteCacheV1`** (CDN edge cache —
  mandatory before a live CSS measure); REST app-pwd `.claude/secrets/sandybrown.env` (user `Claude`, pass creds
  inline — the env file has unquoted specials, don't `source` it).
- general-purpose (Sonnet, SOLO writer / parallel read-only traces); feature-dev:code-reviewer pre-commit.

## Methodology guardrails (do not skip)
- Read the governing spec IN FULL. Root cause before instance fix (group by shared cause; the black border is
  ONE cause across 7 sections, not 7 fixes). Deploy + OPcache + **CDN clear** + live computed-style BEFORE measure.
- Design-gate + Bean approval on any shared-surface change (converter / wrapper / shared helper). Branch `main`;
  path-scoped commits; no version bumps / deprecations. Every fix universal (R-31-9), no cheat (Spec 31 catalogue).
- Verify the LIVE painted value (STOP-44), on the REAL draft node for converter fixes (STOP-34). Bean's eye is
  co-authoritative (R-31-13).
