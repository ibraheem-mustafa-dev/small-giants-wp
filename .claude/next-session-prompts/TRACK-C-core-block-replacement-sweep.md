---
doc_type: next-session-prompt
project: small-giants-wp
track: C — replace every core block that has an SGS replacement
generated: 2026-07-15
owner: separate session (do NOT run inside the adaptive-nav track)
---

# TRACK C — ~1,015 core-block uses that must be SGS blocks

Invoke `/autopilot` before anything else.

## ⛔ READ FIRST — scope (Bean, 2026-07-15) + a rebase you must do

**Bean's definition of this track:** *"audit all of the patterns in the theme and figure
out a way to LOSSLESSLY migrate the contents and styles from each core block to its SGS
replacement."* Lossless = contents AND styles preserved. Not a tag swap.

**You do NOT overlap Goal 3** (Bean checked this, and he is right). Goal 3 (Track A) is
de-hardcoding client content out of the base BLOCKS (`site-header/edit.js`,
`site-footer/edit.js` TEMPLATEs). You are core→SGS migration in PATTERNS. Different files,
different concern.

**⛔ REBASE ONTO `feat/adaptive-nav-dialog-drawer` BEFORE YOU START.** Track A just
modified 6 theme pattern files and you WILL conflict: `framework-footer-default.php`,
`footer-indus-foods.php`, `footer-compact.php`, `footer-informational.php`,
`footer-minimal.php`, `header-full.php`.

**⛔ HANDS OFF the header/footer files entirely** — `parts/header.html`,
`parts/footer.html`, `framework-header-default.php`, `framework-footer-default.php`,
`header-search-*.php`, `footer-*.php`. Track A owns them.

## ⛔ THE SILENT-DISCARD CLASS — your highest-value lead (D338)

**WordPress DISCARDS any block attribute the block.json does not declare — silently.** No
error, no gate, no build failure. Confirmed **45 times** in these very patterns on
2026-07-15; 36 already fixed by Track A (19× `"type"`→`"displayType"`, 17× American
`"textColor"`→British `"textColour"` on `sgs/business-info`). **Do not redo those.**

**⛔ NEVER blanket-rename `textColor`→`textColour`.** American `textColor` is CORRECT on
core blocks (`core/heading`, `core/paragraph`…). Any rename MUST be scoped inside
`wp:sgs/*` block comments only. A blind sed corrupts every core block in the theme.

**Run the gate — it is committed:** `python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py`
9 findings remain open (Track A left them for triage — each needs a typo-vs-missing-capability
call): `sgs/info-box` `iconColour`+`iconBackgroundColour` (mega-menu-services ×3),
`sgs/whatsapp-cta` `buttonText`, `sgs/label` `content`+`labelStyle`. **This bug class is
directly your problem:** a core→SGS swap that carries an attr the SGS block doesn't declare
is a SILENT loss — the migration will look green and lose the value. Run the gate after
every group.

## The rule (Bean-directed, D337)

**STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT — a core block that has a direct SGS
replacement must NEVER be used.** The authoritative map is the DB column
`blocks.replaces`. **Query it. Never hardcode a list, never infer from a name.**

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT block_slug, replaces FROM blocks WHERE replaces IS NOT NULL AND replaces != ''"
```

Known from that column: `sgs/container` replaces `core/group` + `core/columns` +
`core/column`. `sgs/media` replaces `core/image` + `core/video`. `sgs/audio` replaces
`core/audio`. **This list is illustrative, NOT the spec — the DB is.** Derive the full
map at runtime; if the DB and this doc disagree, the DB wins and this doc is stale.

## Scope (counts from D337, 2026-07-14 — RE-COUNT, do not trust these)

~1,015 uses remain in the THEME, outside the header (the header was cleaned in D337):

| Core block | Approx count |
|---|---|
| core/paragraph | 356 |
| core/group | 204 |
| core/column | 170 |
| core/heading | 128 |
| core/columns | 64 |
| core/image | 46 |
| core/buttons | 40 |
| core/site-logo | 7 |

**Mine the CURRENT baseline before executing** — a scoped estimate goes stale as the
engine improves, and a previous session wasted effort on a list that had already
drained to zero. Re-count first, then scope.

## ⛔ HARD CONSTRAINTS

1. **THEME FILES ONLY — never `post_content`.** Replacing core blocks inside
   `wp_posts.post_content` via WP-CLI/PHP is blocked by `wp-content-guard.py` and
   breaks block validation. This track covers `theme/sgs-theme/` (`parts/`,
   `patterns/`, `templates/`). **Page/post content is Track B's problem, not yours.**
2. **A swap is NOT a rename.** `core/group` → `sgs/container` changes the emitted
   markup, the wrapper, the uid, the CSS surface. Verify each swapped file renders
   identically LIVE — not just that the build passes.
3. **`core/paragraph` (356) is the dangerous one.** Check `blocks.replaces` actually
   claims it before touching a single instance, and check whether `sgs/text` is a true
   drop-in (typography supports, RichText round-trip, inline formats). If it is not a
   clean equivalent, STOP and design-gate with Bean. 356 broken paragraphs is a
   catastrophe; 356 correct ones is a good day.
4. **Path-scoped commits, one logical group per commit.** Never one 1,015-instance
   sweep commit. Group by block type so a regression is bisectable and revertable.
5. **Bump `theme/sgs-theme/style.css` Version on ANY pattern/part change** — WP caches
   the pattern list against the theme version, and the CDN caches theme CSS on `?ver`.
   Without a bump your change is invisible and you will "verify" a stale page.
6. **Do NOT touch the header/footer parts if the adaptive-nav track (Track A) is live** —
   `parts/header.html`, `patterns/framework-header-default.php`,
   `patterns/framework-footer-default.php` are Track A's files. Coordinate or wait.
   Overlapping edits here caused a full session's rework already.

## Order (dependency-safe — do not improvise)

1. **Re-count + build the register** (read-only): every file, every core block with a
   `blocks.replaces` entry, grouped by block type.
2. **Prove ONE swap end-to-end first** — pick the lowest-risk group (`core/site-logo`,
   7 uses). Swap, build, deploy to the sandybrown canary, live-verify, commit. That
   proves the whole method before it is applied 1,000 times.
3. Then, in ascending risk: `core/image` → `core/buttons` → `core/columns`/`core/column`
   → `core/group` → `core/heading` → `core/paragraph` (last, largest, riskiest).
4. `/sgs-update` at the end to reconcile the DB.

## Definition of done

- `blocks.replaces`-derived grep over `theme/sgs-theme/` returns **zero** replaceable
  core-block uses (or every remaining one is documented with a named reason).
- Every touched template/part/pattern live-verified on the canary: no visual diff, no
  overflow at 375/768/1440, no inline `style=""` regression (Spec 32).
- The full test suite is **no worse than baseline**. Note: 61 tests in
  `plugins/sgs-blocks/scripts/tests/` were ALREADY failing on a clean tree as of
  2026-07-14 (`61 failed, 112 passed, 2 skipped`) — that is pre-existing. A/B against a
  stashed clean tree before blaming yourself, and do not "fix" them in this track.
- STOP-67: a `reports/visual-diff/<area>-<date>.md` with `verdict: PASS` per changed area.

## Skills / tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-db` + `/wp-blocks` | the authoritative `blocks.replaces` map — query, never assume |
| `/qc-council` | before the paragraph sweep (the high-blast-radius one) |
| `/dispatching-parallel-agents` + `/delegate` | mechanical per-group swaps (Haiku/Sonnet-shaped) |
| `/visual-qa` | per-group live verification |
| `/handoff` | session close |

| Tool | For |
|---|---|
| Playwright MCP | live verification per group |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before EVERY live measurement |
| `build-deploy.py` | canary first (`--target palestine-lives` needs explicit opt-in) |

## Methodology guardrails

- **Canary before dev-site**, always.
- **Green build ≠ verified** — the live DOM is the gate. A full build, 180 tests and
  every guard passed while the desktop nav rendered 0 links (D337).
- **Mine the current baseline** before executing a scoped estimate — it goes stale.
- Pre-existing repo dirt (`lucide-icons.php`, `package-lock.json`, `phase4-*.txt`, root
  `.db`, `rr.json`) is NOT yours — never commit it.
