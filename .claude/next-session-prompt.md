---
doc_type: next-session-prompt
project: small-giants-wp
session_tag: small-giants-wp-2026-05-16-spec-16-phase-8-section-by-section
recommended_model: opus
generated: 2026-05-15
---

You are a senior SGS Framework architect continuing Spec 16 work. Phase 7 architectural work shipped 2026-05-15 on `feat/spec-16-converter-v2-rollout` (commit `06eca194`, not yet merged). Phase 8 is **section-by-section converter quality closure**.

Resume command: `CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-16-spec-16-phase-8-section-by-section"`

## READ FIRST (mandatory, in this order)

1. `.claude/handoff.md` — what shipped 2026-05-15 + remaining gaps
2. `.claude/specs/16-DETERMINISTIC-CONVERTER-V2.md` (esp. §9 Tooling integration)
3. `pipeline-state/<latest-run>/leftover-buckets.json` — **THE diagnostic surface; read BEFORE any conjecture about converter gaps**
4. The 3 captured lessons from 2026-05-15 in `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/MEMORY.md` (top 3 entries):
   - `feedback_read_leftover_buckets_before_conjecturing.md`
   - `feedback_multi_model_qc_before_commit.md`
   - `feedback_per_section_cropped_pixel_diff.md`

## Bean's binding methodology rules (DO NOT VIOLATE)

These 3 rules are captured in `~/.claude/projects/.../memory/MEMORY.md` and `blub.db` rows 254-256. Re-violation = recurring correction.

### Rule 1 — Read leftover-buckets.json BEFORE any conjecture

When diagnosing converter quality, pixel-diff gaps, or any /sgs-clone output problem — open `pipeline-state/<run>/leftover-buckets.json` and `stage-9.json` FIRST. The orchestrator classifies every gap by (section, slot, reason) into 5 buckets. Spot-fixing without bucket evidence is forbidden. The 2026-05-15 session lost ~6 hours to this exact failure mode. If bucket data isn't actionable enough, rework the bucket-writer until it is — don't work around it.

### Rule 2 — Multi-model /qc panel BEFORE every commit

`/qc-inline` is the lightweight self-check during implementation. `/qc` multi-model (Sonnet architecture + Haiku mechanical + Gemini Flash fresh-eyes + Cerebras ecosystem) is the dispatch gate BEFORE commit. Single-Sonnet implementer review missed 4+ hyperspecific patterns in the 2026-05-15 session (SECTION_AS_CONTAINER_OVERRIDES dict, sgs-hero__image hardcodes, mediaType=emoji default, variant=split default). The panel catches what the implementer's context blinds them to.

Models per lens (canonical):
- **Sonnet** — architecture review (abstractions sound? schema-driven vs hardcoded?)
- **Haiku** — mechanical scan (literal-by-literal inventory of hardcoded strings)
- **Gemini Flash** (via `/gemini-flash` skill) — fresh-eyes "would this work for Indus Foods, HelpingDoctors, mosque?"
- **Cerebras** (via `/cerebras` skill) — ecosystem-scan "does this pattern exist already? Conflicts with existing helpers?"

### Rule 3 — Per-section cropped pixel diff, not full-page

`scripts/pixel-diff.py --selector .sgs-{section}` is the standard. Full-page diff has ~30-45% structural noise floor (WP-block-wrapper differences + intentional UX choices) that any "perfect" converter cannot avoid. Per-section cropped diff is the honest converter-quality measurement. Each section closes independently at ≤ 1% across 375/768/1440 viewports. The page closes when all sections close.

## Phase 8 — Section-by-section closure workflow

Bean's 2026-05-15 directive: **"go through section by section and make universal fixes, run /qc to ensure generic (not cheating), then try again and keep going till we hit the pixel diff goals on each device type. As we move onto the next sections the issues should improve significantly because of structural improvements made for the earlier sections."**

### The loop (per section)

For each section in `sites/mamas-munches/mockups/homepage/index.html` (start with the worst per-section diff):

1. **Read the bucket** — `pipeline-state/<latest-run>/leftover-buckets.json` filtered by `section_id`. List the failing slots + reasons.
2. **Diagnose the cause** — is it converter (lift logic), block schema (missing attr), block render (render.php gap), or theme CSS (variation file)?
3. **Design the universal fix** — never section-specific or class-name hardcoded. If the fix is in the converter, it must be CSS-driven or DB-driven. If in a block, schema-driven.
4. **Implement** — write the code. Run /qc-inline self-check.
5. **`/qc` multi-model panel** — dispatch Sonnet + Haiku + Gemini Flash + Cerebras. Apply findings.
6. **Re-run orchestrator + redeploy** — push markup to post 65, theme/plugin to sandybrown.
7. **Per-section pixel diff** — `python scripts/pixel-diff.py --selector .sgs-{section} --viewport <vp>` for 375x812 / 768x1024 / 1440x900.
8. **Section closes when** all 3 viewports show ≤ 1% diff.
9. **Move to next worst section.**

### Order of attack (priority — from 2026-05-15 leftover-bucket data)

Pass 12 per-section diffs at 1440 (post-styling-lift baseline):

| Section | Per-section diff | Leftover entries | Action |
|---|---|---|---|
| `.sgs-hero` | 69.3% | 151 extraction_failed | Highest leverage. Many image attrs (splitImage, backgroundImage), responsive font sizes via context classes (`.sgs-hero__copy h1`), CTA hover states. Audit hero render.php first. |
| `.sgs-gift-section` | 56.9% | TBD | Read its bucket. |
| `.sgs-ingredients-section` | 48.2% | TBD | feature-grid + 4 info-box children — check if InnerBlocks emission matches mockup layout. |
| `.sgs-social-proof` | 41.8% | TBD | Testimonial-slider — carousel vs stacked layout difference may be intentional. |
| `.sgs-featured-product` | 39.1% | TBD | Lowest priority. Pack-size pills render gating may be the only real gap. |

### Open from 2026-05-15 (Phase 8 backlog)

1. **Heritage-strip as Brand Story PATTERN** — Bean's 2026-05-15 redirect. Retire the sgs/heritage-strip block; replace with a registered pattern composing sgs/container + core/heading + core/paragraph + sgs/quote + sgs/button. Spec 16 + pattern library updates.
2. **Per-block render.php audits** — many lifted styling attrs aren't honoured (e.g. `headlineFontSizeTablet` lifted but block doesn't emit a media query). 6-8 blocks need audits. (Each one becomes a section-by-section item in the loop above.)
3. **Remaining `block_slug ==` guards in `lift_subtree_into_block_attrs`** — `if block_slug == "sgs/hero":` (line 1016) + `if block_slug == "sgs/heritage-strip":` (line 1048) are pre-existing technical debt. Refactor to BEM-modifier-driven (subagent 5's design — DB-backed `block_image_slots` table).
4. **`convert_page.py` line 198** still hardcodes `extracted_attributes: {}` — apply the brace-depth extractor fix that `__init__.py` got.
5. **Pack-size pills not rendering** — audit `sgs/product-card` `render.php` `$is_trial` gating logic.
6. **Section-internal nav** — `<nav>` is in `SKIP_TOP_LEVEL_TAGS` (top-level), but nested navs pass-through children as bare `<a>` tags. Map to `core/navigation` or `sgs/mega-menu`.
7. **Non-standard breakpoints** — `_BREAKPOINT_SUFFIXES` table silently drops anything outside its list. Add stderr warning + extensible registration.

## Skills + Tools

| Skill | When |
|---|---|
| `/autopilot` | At session start (auto-invoked from SessionStart hook) |
| `/systematic-debugging` | For any "why doesn't this work" investigation. Read pipeline-state buckets in Phase 1 evidence-gathering. |
| `/brainstorming` | Architectural decisions (heritage-as-pattern, block render audits) |
| `/qc-inline` | Lightweight self-check during implementation |
| `/qc` | Multi-model panel BEFORE every commit (Sonnet + Haiku + Gemini Flash + Cerebras) |
| `/gemini-flash` | Fresh-eyes lens in the /qc panel |
| `/cerebras` | Ecosystem-scan lens in the /qc panel |
| `/delegate` | Per-subagent model selection |
| `/capture-lesson` | Any recurring correction needs capture-to-3-layers |
| `/handoff` | Session close — regenerate handoff.md + state.md + next-session-prompt.md |

## Tooling

| Tool | Purpose |
|---|---|
| `scripts/pixel-diff.py --selector .sgs-X` | Per-section cropped diff (Python + Playwright + PIL) |
| `scripts/screenshot-diff-helper.js --selector .sgs-X` | Established per-section diff (Node, requires pixelmatch — fallback) |
| `plugins/sgs-blocks/scripts/sgs-clone-orchestrator.py --converter-v2` | Pipeline entry — emits markup + leftover buckets |
| `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py block sgs/X` | Inspect block schema (attrs, supports, selectors) |
| `python plugins/sgs-blocks/scripts/orchestrator/converter_v2/convert_page.py <mockup> <media-map> --summary-only` | Direct converter smoke test (bypass orchestrator) |
| `mcp__plugin_playwright_playwright__*` | Visual capture in main thread |
| `mcp__plugin_github_github__*` | PR ops for the open feat/spec-16-converter-v2-rollout branch |

## Credentials

`.claude/secrets/credentials.yml` (gitignored). Loader:
```python
import yaml
sb = yaml.safe_load(open('.claude/secrets/credentials.yml'))['sandybrown']
# sb has: wp_user, wp_app_password, wp_admin_label, ssh_alias, ssh_path, url
```

Deployed Mama's converter post: post id 65 on sandybrown. Mockup baseline: post id 66.

## Guardrails (re-stating for emphasis)

- Pixel-diff floor is structural at ~40% full-page. Track converter quality via **leftover-bucket counts** (currently 195 total, 185 extraction_failed) and **per-section cropped diff** — not full-page numbers.
- NEVER add a dict mapping class names → specific attrs. Always CSS-driven or DB-driven.
- READ `pipeline-state/<run>/leftover-buckets.json` BEFORE writing any converter code.
- Run `/qc` multi-model BEFORE every commit (Sonnet + Haiku + Gemini Flash + Cerebras).
- Use the `--selector` flag on every pixel-diff invocation.
- The branch `feat/spec-16-converter-v2-rollout` is open and pushed — Phase 8 can continue on the same branch or branch off depending on scope.
