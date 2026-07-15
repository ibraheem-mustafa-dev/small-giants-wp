---
doc_type: next-session-prompt
project: small-giants-wp
track: C — losslessly migrate every core block that has an SGS replacement
generated: 2026-07-15 (rewritten same day after Track A committed its tree — clean-start edition)
starts: NOW — runs in PARALLEL with Track A's in-session drawer/header rebuild and Track B
owner: separate session (do NOT run inside the Track A / adaptive-nav session)
---

# TRACK C — 1,100+ core-block uses that must be SGS blocks, migrated LOSSLESSLY

Invoke `/autopilot` before anything else.

## ✅ START GATE — now a 60-second check, not a merge-wait

Track A's previously-unverified tree is **COMMITTED and live-verified** (2026-07-15
evening): drawer chrome attrs (`4e049ba9`), logo-off (`3badd8d7`), scrollbar bounce fix
(`ab5c7ca7`), and the D338-remnants commit — cart guard, **the heading fix** (`fontSize`
default null + block CSS removed, live-proven h1 58 / h2 36 / h3 19 where all tags were a
flat 36), attribution element, D328 template fixes. Reports:
`reports/visual-diff/*-2026-07-15.md`.

**Verify then start (do not trust this paragraph):**

```bash
cd c:/Users/Bean/Projects/small-giants-wp
git fetch; git checkout feat/adaptive-nav-dialog-drawer
ls reports/visual-diff/ | grep -E "heading|business-info|cart" | grep 2026-07-15  # expect 3+
git checkout -b feat/core-block-migration   # YOUR branch, off the feature branch HEAD
```

**Track A's session is STILL RUNNING a header/adaptive-nav/site-editor rebuild in
parallel** — the old "wait for the merge" gate is replaced by hard file boundaries:

1. **HANDS OFF (Track A, actively being rewritten right now):** `parts/header.html`,
   `parts/footer.html`, `framework-header-default.php`, `framework-footer-default.php`,
   `header-search-*.php`, `footer-*.php`, `mega-menu-*.html`, and
   `src/blocks/{adaptive-nav,site-header,site-header-row,site-footer,site-footer-row}/`.
   Their ~579 instances are a follow-up after Track A's rebuild lands.
2. **The preset-gap fix needs a COORDINATION CHECK before you build it** (see below) —
   Track A's rebuild may add `supports.typography` to `sgs/heading`/`sgs/text` itself. Ask
   Bean (he is driving the Track A session live) OR grep the branch head for
   `supports.typography` in those two block.jsons before designing yours. Duplicate work
   here is the biggest waste risk on this track.
3. **Never edit `.claude/decisions.md` / `parking.md` directly** (three concurrent sessions
   = merge conflicts on append). Write to `.claude/scratch/track-c-decisions-pending.md`;
   the end-of-day handoff merges.
4. **Deploys:** sandybrown carries the feature branch and Track A redeploys it repeatedly
   this session. For your live verification, coordinate deploys through Bean, or verify on
   a locally-served build if contention bites. Never deploy to palestine-lives.

## ⛔ THE PRESET GAP — still open, re-check before you plan around it

Track A closed the DEFAULTS half (D338, committed): `sgs/heading` `fontSize` `default: 28`
→ **`null`** + hardcoded block CSS removed — theme.json now owns heading typography;
`sgs/product-card` `ctaFontSize` → `null` (live-verified identical to `sgs/button`).

**What remains:** `supports.typography` is still **absent** on `sgs/heading`/`sgs/text`
(as of this rewrite — RE-VERIFY, the Track A rebuild may change it):

```bash
python -c "import json;d=json.load(open('plugins/sgs-blocks/src/blocks/heading/block.json'));print(d['attributes']['fontSize'], d['supports'].get('typography'))"
```

`null` default = **inherit** ⇒ a core block with **no** `fontSize` converts losslessly
(drop the attr, the theme supplies it). But an **explicit preset slug** (`"fontSize":
"small"`) STILL has no representable target — your ~100 preset-slug instances stay blocked
until `supports.typography.fontSize` lands. WP stores a preset as top-level
`fontSize:"small"` and a custom value as `style.typography.fontSize`, so named and numeric
sizes do NOT conflict. Scope it as a block gap (never a lossy pixel conversion),
design-gate it, coordinate with Track A per the gate above, then sweep.

## Bean's definition of this track

> *"audit all of the patterns in the theme and figure out a way to **losslessly** migrate
> the contents and styles from each core block to its SGS replacement."*

Lossless = **contents AND styles preserved**. Not a tag swap. **Bean's steer on method:**
*"create a migration script for each unique block-replacement PAIRING so we don't burn
through tokens doing the same thing over and over — or a spec doc with instructions for
each unique pairing."* **Do that.** One transformer per pairing (`core/group`→
`sgs/container`, `core/heading`→`sgs/heading`…), not per instance. Every swap is a
**schema transformation** (core = static, content as inner HTML + preset slugs; SGS =
dynamic, `save:null`, attrs in the JSON comment delimiter) — the per-pairing transformer is
essential, not an optimisation.

**While building each pairing, log any attr live on the core block with NO SGS
equivalent.** Bean: *"this shouldn't happen — we were pretty thorough that replacements
covered all functionality, but we didn't copy the naming convention completely and didn't
use all of the attributes that weren't seen as needed."* Expect **naming mismatches** (the
`textColor`/`textColour` class) more than true gaps. Each is a **gap candidate to add to
the SGS block**, never a lossy conversion.

**You do NOT overlap Goal 3** (Bean checked; he is right). Goal 3 (Track A) de-hardcodes
client content out of the base **BLOCKS** (`site-header/edit.js`, `site-footer/edit.js`
TEMPLATEs). You do core→SGS migration in **PATTERNS**. Different files, different concern.

## ⛔ THE SILENT-DISCARD CLASS — your highest-value lead (D338)

**WordPress DISCARDS any block attribute the block.json does not declare — silently.** No
error, no gate, no build failure. Confirmed **45 times** in these very patterns;
**39 fixed and COMMITTED** (19× `"type"`→`"displayType"`, 17× American `"textColor"`→
British `"textColour"` on `sgs/business-info`, `sgs/label` `content`/`labelStyle`→`text`,
`sgs/whatsapp-cta` `buttonText`→`label`). **Do not redo those.**

**⛔ NEVER blanket-rename `textColor`→`textColour`.** American `textColor` is CORRECT on
core blocks. Any rename MUST be scoped inside `wp:sgs/*` block comments only. A blind sed
corrupts every core block in the theme.

**Run the gate — committed and working:**
```bash
python plugins/sgs-blocks/scripts/check-dead-pattern-attrs.py
```
**6 findings remain open**, deliberately left because they need a design call, not a
rename: `sgs/info-box` `iconColour` + `iconBackgroundColour` (`mega-menu-services.html` ×3
— NOTE: that file is in Track A's hands-off zone, so this design call is a REGISTER entry
for you, not an edit). Verdict **B — genuine missing capability**: FR-22-6 moved icon
rendering to InnerBlocks; the fix is restructuring to child `sgs/icon` blocks. **This bug
class is directly your problem:** a core→SGS swap carrying an attr the SGS block doesn't
declare is a SILENT loss — the migration looks green and drops the value. **Run the gate
after every group.** ⚠ Gate blind spot found 2026-07-15 (D339d): its comment-stripper is
naive — a PHP string containing a block-comment opener swallows the rest of the file. If
its output looks impossibly clean/dirty, check that first.

## The rule (Bean-directed, D337)

**STOP-CORE-BLOCK-WITH-SGS-REPLACEMENT — a core block with a direct SGS replacement must
NEVER be used.** The authoritative map is the DB column `blocks.replaces`. **Query it.
Never hardcode a list, never infer from a name.**

```bash
python ~/.claude/skills/sgs-wp-engine/scripts/sgs-db.py sql \
  "SELECT slug, replaces FROM blocks WHERE replaces IS NOT NULL AND replaces != ''"
```

⚠️ **The column is `slug`, NOT `block_slug`** — an earlier version of this prompt had that
wrong and the session fact-check caught it. `blocks.replaces` faithfully derives from
`block-replacements.json` (fact-checked — no hidden parallel system).

## Scope — RE-COUNT FIRST; the numbers below are 2026-07-15-morning and Track A has edited patterns since

Baseline measurement (2026-07-15, superseding older figures): **1,168 replaceable instances
across 58 files**, including four types older counts missed entirely — `core/button` (46),
`core/details` (10), `core/query` (6), `core/cover` (2). The split then: 579 in Track A
territory vs **589 safe**. Since that count, Track A committed edits to
`mega-menu-contact.html` + `label-heading-subheading-cluster.php` and its live rebuild will
edit header/footer patterns further. **Re-count before executing** — a scoped estimate goes
stale (a previous session executed against a list that had drained to zero;
`mine-current-baseline-estimates-go-stale`).

Pick your proving group from the SAFE zone (the old designated group — `core/site-logo` ×7
— is 100% inside Track A files and unrunnable).

## ⛔ HARD CONSTRAINTS

1. **THEME FILES ONLY — never `post_content`.** Replacing core blocks inside
   `wp_posts.post_content` is blocked by `wp-content-guard.py` and breaks block validation.
   This track covers `theme/sgs-theme/` (`parts/`, `patterns/`, `templates/`) MINUS the
   Track A hands-off list. **Page/post content is Track B's problem.**
2. **A swap is NOT a rename — it is a schema transformation.** Core blocks are static
   (content as inner HTML, styling as preset slugs); the target SGS blocks are dynamic
   (`save:null`, attrs in the JSON delimiter). There is **no transformer, no `transforms`,
   no deprecations, and no rollback path**. Verify each swapped file renders identically
   LIVE — not just that the build passes.
3. **`core/paragraph` is NOT the dangerous one — the preset-slug gap is.** Do not convert a
   preset slug to a pixel value: that hardcodes one client's typography into a framework
   pattern and breaks per-client theming (`theme-snapshot.json`). Colour is fine —
   `textColor`→`textColour` is slug-to-slug.
4. **Path-scoped commits, one logical group per commit.** Never one 1,000+-instance sweep.
   Group by pairing so a regression is bisectable.
5. **Bump `theme/sgs-theme/style.css` `Version:` on ANY pattern/part change** — WP caches
   the pattern list against it and the CDN caches theme CSS on `?ver`. Without a bump your
   change is invisible and you will "verify" a stale page.

## Order (dependency-safe)

1. **Re-count + build the register** (read-only): every file, every core block with a
   `blocks.replaces` entry, grouped by pairing, split safe-zone vs Track-A-zone.
2. **Preset gap:** coordination check with Track A FIRST (see START GATE) → design-gate →
   build `supports.typography` on `sgs/heading` + `sgs/text` if Track A hasn't. Preset-free
   pairings (`core/image`, `core/details`, `core/buttons` — ~68 in the safe zone) are
   disjoint and can proceed in parallel with this.
3. **Prove ONE pairing end-to-end** from the SAFE zone: transformer → swap → build →
   deploy (coordinate the canary with Bean) → live-verify → commit. Prove the method before
   applying it 1,000 times.
4. Then in ascending risk, one transformer per pairing.
5. `/sgs-update` at the end to reconcile the DB.

## Definition of done

- One documented, reusable transformer (or spec) **per unique pairing** — not per instance.
- `blocks.replaces`-derived grep over the safe zone returns **zero** replaceable uses (or
  each remaining one is documented with a named reason).
- Every touched pattern live-verified on the canary: no visual diff, no overflow at
  375/768/1440, no inline `style=""` regression (Spec 32).
- `check-dead-pattern-attrs.py` clean for every pattern you touched.
- A register of every core attr with no SGS equivalent → gap candidates, never lossy
  conversions.
- STOP-67: `reports/visual-diff/<area>-<date>.md` with `verdict: PASS` +
  `first_paint_capture_passed: true` per changed area (the gate greps BOTH lines).

## Rules that bind this work (D338/D339/D340 — learned the hard way)

- **Verify against the actual file / live DOM before ANY conclusion.** Across two sessions:
  3 handoff claims, a council claim, "180 tests pass", a false contrast FAIL, and a false
  CSS syntax error were all asserted and all wrong. A doc is a hypothesis; a subagent's
  "done" is a hypothesis (STOP-16); **your own diagnostic output is a hypothesis.** Your
  instinct to fact-check this prompt's own framing found 2 real errors last time — keep
  doing that.
- **Universal, never a per-client carve-out** (R-31-9).
- **Missing capability = a gap candidate to ADD to the SGS block, never a workaround.**
- **Green gates ≠ verified.** Build + 180 tests + every guard passed while the desktop nav
  rendered 0 links. AND: the STOP-67 pre-commit gate printed "COMMIT BLOCKED" on 2026-07-15
  yet the commit went through (unexplained, D339d) — do not lean on it as your only net.
- **Two suites, do not conflate:** `scripts/oracle/tests/` = 180 pass (prebuild);
  `scripts/tests/` = **61 fail on a CLEAN tree** — pre-existing, already fact-checked. A/B
  against a `git stash` before blaming your change; do not "fix" them here.
- **Cache:** clear the Hostinger CDN before EVERY live measurement
  (`hosting_clearWebsiteCacheV1`). LiteSpeed is on sandybrown only. `build-deploy.py`
  clears NO caches — do it manually.
- **Windows:** node/npm via **PowerShell** (nvm shim broken in Git Bash). Stage/commit via
  PowerShell.
- Pre-existing dirt (`reports/phase4-*.txt`, root `.db`, `rr.json`, `iapi.html`) is NOT
  yours. (`lucide-icons.php`/`package-lock.json` were resolved 2026-07-15; if dirty again
  it is a build side-effect — restore package-lock, don't commit 43k lines of CRLF churn.)
- **A NUL byte is a real risk when scripting edits** — one slipped into a `.js` gate and
  made ripgrep binary-sniff the whole file. Check:
  `python -c "print(open('<file>','rb').read().count(b'\x00'))"`.

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
| `build-deploy.py` | canary default; coordinate deploys with Bean while Track A runs |
