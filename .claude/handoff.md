---
doc_type: handoff
project: small-giants-wp
project_id: 14
session_date: 2026-05-01
session_tag: small-giants-wp-2026-05-01-block-validation-fix
recommended_model: sonnet
---

# Session Handoff — 2026-05-01 (block validation fix + header/footer architecture lesson)

## Completed This Session

1. **Block validation root-cause shipped** (commit `fd4eab4`). Three fictitious blocks (`sgs/header`, `sgs/footer`, `sgs/feature-grid`) replaced with real WP blocks; core block content moved from JSON attributes to innerHTML; missing `lucide-icons.php` require added to `sgs-blocks.php` so `sgs/mobile-nav` no longer 500s on render.
2. **Sandybrown homepage now renders end-to-end with zero validation errors.** Created post 8 via `wp post create` (correct innerHTML format), set as `page_on_front`. Hero, trust badges, story section, ingredients with emoji icons, gift section, and Mama's-Munches-specific footer all rendering. Front page: https://sandybrown-nightingale-600381.hostingersite.com/.
3. **Header/footer architecture lesson captured** to all three persistence layers (workspace, CC memory, blub.db row 204). Pattern key: `header-footer-universal-not-per-client`. Rule: never create per-client `.html` template part files; one universal `header.html` + `footer.html` driven by style variations + WP global settings + the block editor.
4. **Living docs updated** (commit `c1c95ad`). `state.md` phase shifted from `framework-rendering-fidelity` to `header-footer-universal-audit`; `mistakes.md` row added for the new lesson.

## Current State

- **Branch:** `feat/recogniser-v1` at `c1c95ad` (PR #10, 18 commits ahead of `main`, pushed)
- **Tests:** no test suite (WP block plugin)
- **Build:** clean (`cd plugins/sgs-blocks && npm run build` exits 0; nothing rebuilt this session)
- **Uncommitted changes:** none material; long-standing untracked subproject scaffolds remain
- **Live test:** sandybrown front page = post 8, renders cleanly with `header-mamas-munches` + `footer-mamas-munches` parts (server-only registrations, NOT in repo)
- **Server-only changes (not in repo, sandybrown only):** `theme.json` adds `header-mamas-munches`/`footer-mamas-munches` to `templateParts`; `front-page.html` references those slugs

## Known Issues / Blockers

- `sgs/testimonial` block did not render on the deployed page despite valid attributes — needs investigation in the next session.
- `sgs/notice-banner` self-closing form was migrated by v1 deprecation, stripping `iconValue`/`linkText`/`linkUrl`. The deprecation chain doesn't currently cover the live save shape.
- `header-mamas-munches.html` + `footer-mamas-munches.html` exist in the repo as the wrong model — they should be deleted as part of the next-session audit.
- Default `header.html` carries Indus-specific top bar (LinkedIn/Facebook/Google/Instagram social links + "Apply For Trade Account" button). Default `footer.html` carries Indus-shaped placeholders ("Quick Links: Certifications/Trade/Brands…"). These need to be stripped to make the framework parts genuinely universal.

## Next Priorities (in order)

1. **Audit `theme/sgs-theme/parts/header.html`** — strip every Indus-specific element (top-bar social URLs, trade-account CTA, mega-menu references that aren't universally applicable). Keep: skip-link, site-logo, navigation, mobile-nav. Anything optional becomes either a setting toggle or a saved pattern.
2. **Audit `theme/sgs-theme/parts/footer.html`** — same approach. Keep: site-logo, business-info, copyright. Remove: Indus-specific column headings ("Quick Links: Certifications/Trade/Brands…"), "Get Directions" CTA framing.
3. **Delete `header-mamas-munches.html` + `footer-mamas-munches.html`** from the repo and the corresponding `templateParts` entries from `theme.json`. The Mamas Munches site uses the universal parts plus its style variation — no per-client files.
4. **Save current "good" arrangements as patterns** via the Site Editor → register in `theme/sgs-theme/patterns/` — so onboarding a similar client = insert pattern, edit two things, done. Patterns are speed, not conformity.
5. **Verify on sandybrown** — once universal parts ship, switch sandybrown's `front-page.html` back to `slug:header` + `slug:footer`, confirm Mamas Munches homepage still renders cleanly with the universal parts.

## Files Modified

| File | What changed |
|---|---|
| `plugins/sgs-blocks/sgs-blocks.php` | Added `require_once includes/lucide-icons.php` before `mobile-nav-patterns.php` so `sgs_get_lucide_icon()` is defined when mobile-nav renders |
| `theme/sgs-theme/parts/header-mamas-munches.html` | Replaced fictitious `wp:sgs/header` with real blocks (skip-link, group, site-logo, navigation, mobile-nav). NOTE: this whole file should be deleted next session per the architecture lesson |
| `theme/sgs-theme/parts/footer-mamas-munches.html` | Replaced fictitious `wp:sgs/footer` with real blocks (group, columns, site-logo, paragraphs, copyright). NOTE: same deletion target |
| `reports/mamas-munches-page-content-sandybrown.html` | Rewrote with correct WP block format — core content in innerHTML not JSON attrs; replaced `sgs/feature-grid` with `core/group` + `core/columns`; quote rewritten as paragraphs |
| `.claude/state.md` | Phase → `header-footer-universal-audit`; blockers cleared; new architecture decision recorded |
| `.claude/mistakes.md` | Row added: `header-footer-universal-not-per-client` (links to feedback file + blub.db row 204) |
| `~/.openclaw/workspace/memory/learning/2026-05-01-header-footer-universal-not-per-client.md` | Workspace lesson file (full rule + how-to-apply + related corrections) |
| `~/.claude/projects/c--Users-Bean-Projects-small-giants-wp/memory/feedback_header-footer-universal-not-per-client.md` | CC auto-memory feedback file + MEMORY.md index updated |

## Notes for Next Session

- **Per-client template part files are the wrong model.** Deleting `header-mamas-munches.html` + `footer-mamas-munches.html` is part of the audit, not separate. Mamas Munches gets its appearance from `styles/mamas-munches.json` + WP global settings + the block editor — no client-specific theme files.
- **Patterns exist for speed, not conformity.** Once you've built a clean Mamas Munches header arrangement in the Site Editor, save it as a pattern. Next similar client = insert that pattern, change the logo, swap the nav menu, done. The pattern is an INSERT-and-edit starting point, never a structural lock.
- **The `sgs/mobile-nav` block is fragile.** It silently relied on `sgs_get_lucide_icon()` being defined, which it wasn't (no `require_once`). Fixed this session — but consider auditing for similar missing-require bugs across other dynamic blocks (`grep -rn "sgs_get_lucide_icon\|sgs_get_" includes/` — match every helper against the require list in `sgs-blocks.php`).
- **WP block validation rule reminder:** core blocks like `core/heading`, `core/paragraph`, `core/quote`, `core/button` use `source: rich-text` for their text content — text MUST be in innerHTML, not JSON attributes. The recogniser/serialiser violated this. The same rule applies to any pipeline that synthesises block markup.
- **Sandybrown server has divergent state vs repo.** `theme.json` on sandybrown has `header-mamas-munches`/`footer-mamas-munches` registered; `front-page.html` references those slugs. Once universal parts ship and per-client files are deleted, revert sandybrown's server-side overrides too.

## Next Session Prompt

~~~
recommended_model: sonnet
session_tag: small-giants-wp-2026-05-02-header-footer-universal-audit

You are a senior WordPress block-theme architect specialising in the SGS Framework, FSE template parts, and multi-tenant block-theme design. Your goal this session is to make the SGS framework's `header.html` and `footer.html` truly universal — driven entirely by style variations, WP global settings, and the block editor — and remove the per-client `.html` files that were created in error.

Resume command: CLAUDE_CODE_ENABLE_AWAY_SUMMARY=1 claude -p --resume "small-giants-wp-2026-05-02-header-footer-universal-audit"

Read in this order before doing anything:
1. `MEMORY.md` (auto memory) — note `feedback_header-footer-universal-not-per-client.md` is the captured rule for this whole session
2. `.claude/handoff.md` — last session's summary; your "Next Priorities" are the audit task list
3. `.claude/state.md` — current phase is `header-footer-universal-audit`
4. `theme/sgs-theme/parts/header.html` and `theme/sgs-theme/parts/footer.html` — the files you are auditing
5. `theme/sgs-theme/parts/header-mamas-munches.html` + `footer-mamas-munches.html` — the wrong-model files you will delete
6. `theme/sgs-theme/CLAUDE.md` and project root `CLAUDE.md`

## Skills to Invoke

| Skill | When to use |
|-------|-------------|
| `/brainstorming` | ALWAYS INCLUDE — design trade-offs (e.g. is the top bar a setting toggle or a separate pattern?) |
| `/gap-analysis` | ALWAYS INCLUDE — grade the universal header/footer against three diverse client personas (food brand, healthcare, construction) before delivery |
| `/lifecycle` | ALWAYS INCLUDE — required if any skill/agent/pipeline change comes up |
| `/research` | ALWAYS INCLUDE — auto-routes to the right tier |
| `/strategic-plan` | ALWAYS INCLUDE — order the audit + cleanup steps before editing |
| `/sgs-wp-engine` | All SGS Framework work; sgs-db.py introspection of header/footer block usage |
| `/wp-block-themes` | theme.json templateParts, FSE patterns, style variations |
| `/wp-block-development` | If header/footer pattern logic needs new block attributes |
| `/wordpress-router` | If scope expands to other template parts |
| `/playwright` | Visual capture of sandybrown after switching to universal parts |
| `/library-docs` | Verify FSE template-part + pattern best practice |

## MCP Servers & Tools

| Tool | What to use it for |
|------|-------------------|
| Playwright MCP | Capture sandybrown after the universal parts ship; compare to current state |
| `sgs-db.py` CLI | `python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py` — query patterns + tokens used by header/footer |
| WP-CLI via SSH | sandybrown root: `ssh -p 65002 -i ~/.ssh/id_ed25519 u945238940@141.136.39.73`. Use to revert sandybrown's `theme.json` + `front-page.html` overrides once the universal parts are clean |
| GitHub MCP | Update PR #10 with the audit commits |

## Agents to Delegate To

| Agent | When |
|-------|------|
| `wp-sgs-developer` | All header/footer audit edits, theme.json updates, pattern registration |
| `design-reviewer` | Visual review across the three persona clients (food/healthcare/construction) using stub style variations |
| `feature-dev:code-reviewer` | Review the audit diff before merging |
| `test-and-explain` | Plain-English session run-through for Bean at the end |

## Research Approach

Use `/research-check` for quick lookups on FSE template-part best practice (Twenty Twenty-Five and other modern block themes' header/footer patterns). Don't deep-research — this is well-documented WP territory.

---

## Task 1: Audit `theme/sgs-theme/parts/header.html` for universality

Read `header.html` end to end. List every element. Classify each as:
- **Universal** (skip-link, site-logo, navigation, mobile-nav, container groups) — keep
- **Indus-specific content** (LinkedIn/Facebook/Google/Instagram URLs, "Apply For Trade Account" CTA, sgs-top-bar-mobile-cta) — extract or remove
- **Optional component** (top bar, mega-menu integration) — convert to either a setting toggle (Settings → SGS Header) or a saved pattern

Rewrite `header.html` to contain only the universal layer. Move Indus-specific arrangement to `theme/sgs-theme/patterns/header-with-trade-bar.php` as an INSERT-and-edit pattern. Use `/brainstorming` for the trade-off (toggle vs pattern). Default to pattern unless the toggle gives meaningful per-page benefit.

## Task 2: Audit `theme/sgs-theme/parts/footer.html` for universality

Same approach. Read it. Classify every element. Universal layer stays in `footer.html`; Indus-shaped column headings ("Certifications/Trade/Brands") and the "Get Directions" CTA framing move out. The universal footer has site-logo, sgs/business-info, copyright, and a generic columns container with placeholder nav. Clients fill the columns in the Site Editor — no copy is hard-coded.

## Task 3: Delete the per-client files + theme.json registrations

Delete `theme/sgs-theme/parts/header-mamas-munches.html` and `theme/sgs-theme/parts/footer-mamas-munches.html`. Remove the matching `templateParts` entries from `theme/sgs-theme/theme.json`. Then revert sandybrown's server-side overrides (it currently has `header-mamas-munches`/`footer-mamas-munches` registered in its own theme.json copy + front-page.html references) so it consumes the universal parts.

## Task 4: Verify on sandybrown + grade against three persona clients

Use Playwright to capture the sandybrown front page (`https://sandybrown-nightingale-600381.hostingersite.com/`) after the universal parts ship. Confirm hero, content sections, and footer still render correctly with no validation errors.

Then run `/gap-analysis` against three persona-specific style variations (food brand, healthcare, construction) using a stub variation JSON for each. Score the universal `header.html` and `footer.html` on whether they look correct, professional, and brand-appropriate for each persona without any HTML edits. Target: 4/5 anchor on each persona — anything below means the universal parts still carry domain-specific assumptions.

## Task 5: Update PR #10 + run `/handoff`

Commit the audit work to `feat/recogniser-v1`. Update PR #10 description with the new universal-parts model. Run `/handoff` at the end of the session.

## Guardrails

- Universal `header.html` and `footer.html` MUST work for any client with zero HTML changes. Anything client-specific is either a style variation, a WP global setting, a saved pattern (insert + edit), or an editor-level rearrangement.
- Patterns are insert-and-edit conveniences. They are NEVER required for a client to launch — clients can ignore patterns and arrange blocks however they want.
- All edits go to `feat/recogniser-v1`, never `main`.
- Build via `cd plugins/sgs-blocks && npm run build` only if plugin source changes — header/footer audit is theme-only, no rebuild needed.
- Tar deploy method per project `CLAUDE.md`. HTTP-method OPcache reset after PHP changes.
- Do NOT regress sandybrown — once universal parts ship, the Mamas Munches homepage on sandybrown must still render cleanly.
- Do NOT add any business-specific text, social URLs, or contact info into the universal parts. All such content flows from `sgs/business-info` reading the Settings → Business Details page.

## Acceptance for this session

- `header.html` + `footer.html` carry zero Indus-specific content
- `header-mamas-munches.html` + `footer-mamas-munches.html` deleted from repo + theme.json
- Sandybrown front page renders cleanly with universal parts (no per-client files)
- `/gap-analysis` scores ≥ 4/5 on each of three persona variations (food / healthcare / construction)
- 1+ saved pattern registered in `theme/sgs-theme/patterns/` for the "trade bar" optional header arrangement
- PR #10 updated with the audit summary
- Session handoff written via `/handoff`
~~~


---
