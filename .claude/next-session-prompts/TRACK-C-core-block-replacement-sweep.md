---
doc_type: next-session-prompt
project: small-giants-wp
track: C — losslessly migrate every core block that has an SGS replacement
generated: 2026-07-15
starts: AFTER Track A's Step 0 + Step 4 land (they run CONCURRENTLY) — see the START GATE
owner: separate session (do NOT run inside the Track A / adaptive-nav session)
---

# TRACK C — 1,168 core-block uses that must be SGS blocks, migrated LOSSLESSLY

Invoke `/autopilot` before anything else.

## ⛔ START GATE — do NOT begin until Track A's branch MERGES

Track A is running **Step 0 (verify + commit 11 STOP-67-held files) and Step 4 (restore the 12 drawer capabilities + build FR-S9-6) CONCURRENTLY** (Bean, 2026-07-15). Step 4 rewrites `adaptive-nav/style.css` and changes the **attribute shapes** on all five §S9 blocks. So `plugins/sgs-blocks/src/` will go dirty again right after Step 0 clears it — **"working tree clean" is a FALSE all-clear mid-Step-4.** The only reliable signal is the merge:

```bash
cd c:/Users/Bean/Projects/small-giants-wp
git fetch && git log --oneline main..feat/adaptive-nav-dialog-drawer   # expect: EMPTY (merged) or branch gone
ls reports/visual-diff/ | grep -E "adaptive-nav|heading|business-info" # expect: `verdict: PASS`
```

- **Pass** → `git checkout main && git pull`, then **branch fresh off `main`** (`feat/core-block-migration`).
- **Fail** → **STOP and tell Bean.** Do NOT rebase onto the live Track A branch, and do NOT start "just on the safe files" — see why below.

**Why the merge and not just the file list.** Your own investigation established the safe zone (589 instances / 32 files) is disjoint from Track A's files, so file *contention* is not the risk. The risk is the **renderer moving**: Track A's Step 0 changes `sgs/heading`'s font-size behaviour on every page (h1 36→50, h3 36→24, h6 36→14) and Step 4 changes §S9 attr shapes. Any "live-verified, no visual diff" you record before those land is measured against a renderer that then changes — a false PASS you would have to redo. **Branch off `main` AFTER the merge and you inherit a stable renderer + Track A's 36 attr fixes for free, with zero rebase.**

## ⛔ THE PRESET GAP IS NOW CLOSED — re-check before you plan around it

Your Q2 blocker was real and **Bean approved closing it first**. Track A did (D338):
- `sgs/heading` `fontSize` `default: 28` → **`null`**, and the hardcoded `font-size:28px`/`36px` + `font-weight:700`/`line-height:1.2` REMOVED from `heading/style.css`. `theme.json` now owns heading typography (`styles.elements.h1..h6` fontSize; `styles.elements.heading` weight/lineHeight/family).
- `sgs/product-card` `ctaFontSize` `15` → `null` (matches `sgs/button`, which was already `null`).

**RE-VERIFY the current state before scoping** — do not trust this paragraph, and do not trust your own earlier finding either (the codebase moved):

```bash
python -c "import json;d=json.load(open('plugins/sgs-blocks/src/blocks/heading/block.json'));print(d['attributes']['fontSize'], d['supports'].get('typography'))"
```

**What this does and does NOT change.** `null` default = **inherit** ⇒ a core block with **no** `fontSize` converts losslessly (drop the attr, the theme supplies it). But `supports.typography` is still **absent** on `sgs/heading`/`sgs/text`, so an **explicit preset slug** (`"fontSize":"small"`) STILL has no representable target. **Your 100 preset-slug instances are not yet unblocked.** Adding `supports.typography.fontSize` is the remaining piece — WP stores a preset as top-level `fontSize:"small"` and a custom value as `style.typography.fontSize`, so **named and numeric sizes do NOT conflict**; they are different attributes. Scope that as a block gap (never a lossy pixel conversion), design-gate it, then sweep.

## Bean's definition of this track

> *"audit all of the patterns in the theme and figure out a way to **losslessly** migrate the contents and styles from each core block to its SGS replacement."*

Lossless = **contents AND styles preserved**. Not a tag swap. **Bean's steer on method:** *"create a migration script for each unique block-replacement PAIRING so we don't burn through tokens doing the same thing over and over — or a spec doc with instructions for each unique pairing."* **Do that.** One transformer per pairing (`core/group`→`sgs/container`, `core/heading`→`sgs/heading`…), not per instance. Your finding that every swap is a **schema transformation** (core = static, content as inner HTML + preset slugs; SGS = dynamic, `save:null`, attrs in the JSON comment delimiter) makes this essential, not an optimisation.

**While building each pairing, log any attr live on the core block with NO SGS equivalent.** Bean: *"this shouldn't happen — we were pretty thorough that replacements covered all functionality, but we didn't copy the naming convention completely and didn't use all of the attributes that weren't seen as needed."* So expect **naming mismatches** (the `textColor`/`textColour` class) more than true gaps. Each is a **gap candidate to add to the SGS block**, never a lossy conversion.

**You do NOT overlap Goal 3** (Bean checked; he is right). Goal 3 (Track A) de-hardcodes client content out of the base **BLOCKS** (`site-header/edit.js`, `site-footer/edit.js` TEMPLATEs). You do core→SGS migration in **PATTERNS**. Different files, different concern.

## ⛔ THE SILENT-DISCARD CLASS — your highest-value lead (D338)

**WordPress DISCARDS any block attribute the block.json does not declare — silently.** No error, no gate, no build failure. Confirmed **45 times** in these very patterns on 2026-07-15; **39 already fixed by Track A** (19× `"type"`→`"displayType"`, 17× American `"textColor"`→British `"textColour"` on `sgs/business-info`, plus `sgs/label` `content`→`text` and `sgs/whatsapp-cta` `buttonText`→`label`). **Do not redo those.**

**⛔ NEVER blanket-rename `textColor`→`textColour`.** American `textColor` is CORRECT on core blocks (`core/heading`, `core/paragraph`…). Any rename MUST be scoped inside `wp:sgs/*` block comments only. A blind sed corrupts every core block in the theme.

**Run the gate — it is committed and working:**
```bash
python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py
```
**6 findings remain open**, deliberately left for you because they need a design call, not a rename: `sgs/info-box` `iconColour` + `iconBackgroundColour` (`mega-menu-services.html` ×3). Verdict **B — genuine missing capability**: the block never declared them; FR-22-6 moved icon rendering to InnerBlocks. The fix is restructuring the pattern to child `sgs/icon` blocks (which DOES have `iconColour` + `backgroundShape`). **This bug class is directly your problem:** a core→SGS swap carrying an attr the SGS block doesn't declare is a SILENT loss — the migration looks green and drops the value. **Run the gate after every group.**

## The rule (Bean-directed, D337)

**STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT — a core block with a direct SGS replacement must NEVER be used.** The authoritative map is the DB column `blocks.replaces`. **Query it. Never hardcode a list, never infer from a name.**

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT slug, replaces FROM blocks WHERE replaces IS NOT NULL AND replaces != ''"
```

⚠️ **The column is `slug`, NOT `block_slug`** — the earlier version of this prompt had that wrong and you caught it. `blocks.replaces` faithfully derives from `block-replacements.json` (you fact-checked this — no hidden parallel system).

## Scope — YOUR re-count supersedes the old numbers

**1,168 replaceable instances across 58 files** (your measurement, 2026-07-15) — not the ~1,015/8-types this prompt originally claimed. The old figure **missed four block types entirely**: `core/button` (46), `core/details` (10), `core/query` (6), `core/cover` (2). **Re-count once more before executing** — Track A has since edited 6 pattern files and closed the heading gap; a scoped estimate goes stale (a previous session wasted effort on a list that had drained to zero).

**The split you measured:** 579 instances in Track A territory (nav/mega-menu 410, footer 148, header 21) vs **589 safe**. Note the old prompt's designated proving group — `core/site-logo` ×7 — is **100% inside Track A's files**, so it was unrunnable. Pick your proving group from the safe zone.

## ⛔ HARD CONSTRAINTS

1. **THEME FILES ONLY — never `post_content`.** Replacing core blocks inside `wp_posts.post_content` via WP-CLI/PHP is blocked by `wp-content-guard.py` and breaks block validation. This track covers `theme/sgs-theme/` (`parts/`, `patterns/`, `templates/`). **Page/post content is Track B's problem.**
2. **A swap is NOT a rename — it is a schema transformation.** Core blocks are static (content as inner HTML, styling as preset slugs); every one of the 12 target SGS blocks is dynamic (`save:null`, attrs in the JSON delimiter). There is **no transformer, no `transforms`, no deprecations, and no rollback path** (your finding). Verify each swapped file renders identically LIVE — not just that the build passes.
3. **`core/paragraph` is NOT the dangerous one** (correcting the old prompt) — the **preset-slug gap** is. Do not convert a preset slug to a pixel value: that hardcodes one client's typography into a framework pattern and breaks per-client theming (`theme-snapshot.json`). Colour is fine — `textColor`→`textColour` is slug-to-slug.
4. **HANDS OFF Track A's files** — `parts/header.html`, `parts/footer.html`, `framework-header-default.php`, `framework-footer-default.php`, `header-search-*.php`, `footer-*.php`, `mega-menu-*.html`. Their 579 instances are a follow-up after Track A closes.
5. **Path-scoped commits, one logical group per commit.** Never one 1,168-instance sweep. Group by block type so a regression is bisectable.
6. **Bump `theme/sgs-theme/style.css` `Version:` on ANY pattern/part change** — WP caches the pattern list against it and the CDN caches theme CSS on `?ver`. Without a bump your change is invisible and you will "verify" a stale page.

## Order (dependency-safe)

1. **Re-count + build the register** (read-only): every file, every core block with a `blocks.replaces` entry, grouped by pairing.
2. **Close the preset gap** (`supports.typography` on `sgs/heading` + `sgs/text`) — design-gate it first. Preset-free pairings (`core/image`, `core/details`, `core/buttons` — ~68 in the safe zone) are disjoint and can proceed in parallel.
3. **Prove ONE pairing end-to-end** from the SAFE zone: build its transformer, swap, build, deploy to the sandybrown canary, live-verify, commit. That proves the method before it is applied 1,000 times.
4. Then in ascending risk, one transformer per pairing.
5. `/sgs-update` at the end to reconcile the DB.

## Definition of done

- One documented, reusable transformer (or spec) **per unique pairing** — not per instance.
- `blocks.replaces`-derived grep over the safe zone returns **zero** replaceable uses (or each remaining one is documented with a named reason).
- Every touched pattern live-verified on the canary: no visual diff, no overflow at 375/768/1440, no inline `style=""` regression (Spec 32).
- `check-dead-pattern-attrs.py` clean for every pattern you touched.
- A register of every core attr with no SGS equivalent → gap candidates, never lossy conversions.
- STOP-67: `reports/visual-diff/<area>-<date>.md` with `verdict: PASS` per changed area.

## Rules that bind this work (D338 — learned the hard way)

- **Verify against the actual file / live DOM before ANY conclusion.** In one session: 3 handoff claims, a council claim, and "180 tests pass" were all asserted and all wrong. **Your instinct to fact-check this prompt's own framing was correct and it found 2 real errors — keep doing that.** A doc is a hypothesis; a subagent's "done" is a hypothesis (STOP-16); **your own diagnostic output is a hypothesis.**
- **Universal, never a per-client carve-out** (R-31-9).
- **Missing capability = a gap candidate to ADD to the SGS block, never a workaround.**
- **Green gates ≠ verified.** Build + 180 tests + every guard passed while the desktop nav rendered 0 links.
- **Two suites, do not conflate:** `scripts/oracle/tests/` = 180 pass (green, in prebuild); `scripts/tests/` = **61 fail on a CLEAN tree** (61/112/2) — pre-existing, you already fact-checked this. A/B against a `git stash` before blaming your change; do not "fix" them here.
- **Cache:** clear the Hostinger CDN before EVERY live measurement (`hosting_clearWebsiteCacheV1`). LiteSpeed is on sandybrown only, NOT Indus. `build-deploy.py` clears NO caches — do it manually.
- **Windows:** node/npm via **PowerShell** (nvm shim broken in Git Bash). Stage/commit via PowerShell.
- Pre-existing dirt (`lucide-icons.php`, `package-lock.json`, `phase4-*.txt`, root `.db`, `rr.json`, `iapi.html`) is NOT yours.
- **A NUL byte is a real risk when scripting edits** — one slipped into a `.js` gate this session and made ripgrep binary-sniff the whole file, silently skipping it in every future grep. Check: `python -c "print(open('<file>','rb').read().count(b'\x00'))"`.

## Skills / tools

| Skill | When |
|---|---|
| `/autopilot` | FIRST |
| `/sgs-db` + `/wp-blocks` | the authoritative `blocks.replaces` map (column = `slug`) — query, never assume |
| `/brainstorming` | design the per-pairing transformer BEFORE building |
| `/qc-council` | design-gate the preset gap + before the largest pairing |
| `/dispatching-parallel-agents` + `/delegate` | one agent per pairing once the method is proven |
| `/visual-qa` | per-group live verification |
| `/handoff` | session close |

| Tool | For |
|---|---|
| Playwright MCP | live verification per group |
| Hostinger MCP `hosting_clearWebsiteCacheV1` | CDN clear before EVERY live measurement |
| `build-deploy.py` | canary default; `--target palestine-lives` needs explicit opt-in |
