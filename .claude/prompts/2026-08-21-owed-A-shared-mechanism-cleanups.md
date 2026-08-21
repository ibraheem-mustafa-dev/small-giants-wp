# Session prompt A — the sanitiser hardening (Phase 4, and only Phase 4)

Paste this whole file into a fresh session.

---

Invoke `/autopilot` before doing anything else.

**Plan label:** `[PLAN: sonnet]` — every phase is mechanical. Nothing here needs Opus.
**Time:** ~65 min end to end — ~50 for the migration and its live proof, ~15 for docs + enforcement.
**Done-when:** the code is deployed and live-verified **AND** all four docs describe the shipped
state **AND** the enforcement decision is made and acted on. Code-only is NOT done — four live docs
currently say this migration has not happened.
**USP:** this is the LAST behaviour change owed from the 2026-08-21 consolidation, and the only one
in the whole programme that alters rendered output. Done, `-10px` stops silently losing its sign
and `calc()` stops being corrupted — on 206 call sites at once.

> **Phases 1–3 of the original prompt A are DONE and deployed** (D731/D732/D733, commits `ab2d4730`,
> `51297d93`, `b6e11174`). Phase 2 was CANCELLED — its premise was disproved. Do not re-do any of it.
> **This file is now Phase 4 alone, with every ambiguity already resolved.** The investigation was
> done on 2026-08-21; you are executing, not deciding.

## Read first (cold entry) — three files, ~10 minutes

1. `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` **§6.1 (a2)** — the sanitiser contract.
   This is the spec you are implementing. It names the two functions, the four deltas, and the
   unitless carve-out.
2. `plugins/sgs-blocks/scripts/migrate-render-closures.py` — the PROVEN codemod shape for this exact
   job (survey / fix / check / self-test, negative control per family). **Copy its shape.**
3. `.claude/LEDGER.md` — check which tracks are live before touching a shared file.

You do NOT need to read the 2026-08-21 Phase 0 answers; everything relevant is restated below.

---

## THE ANSWERS — all of them. Nothing here is left for you to decide.

**What changes:** every LENGTH-valued call site moves from the crude
`sgs_css_length_sanitise()` to the hardened `sgs_css_length_value()`.

| input | crude (today) | hardened (after) |
|---|---|---|
| `-10px` | `10px` — sign silently lost | `-10px` |
| `calc(100% - 20px)` | `calc10020px` — corrupted | preserved |
| `var:preset\|spacing\|40` | `varpresetspacing40` — corrupted | resolved |
| bare `16` | `16` — invalid CSS, renders nothing | `var(--wp--preset--spacing--16)` |

**Enumerated 2026-08-21 — use these figures, they were counted not estimated:**

- **207** call sites of `sgs_css_length_sanitise(`, plus 7 definitions/`function_exists` guards.
  All 207 are spelled identically with **no whitespace variants** and are **all single-argument**.
- **206** are length-valued → migrate.
- **1** is unitless-legal → **DO NOT MIGRATE**: `src/blocks/testimonial/render.php` `quoteLineHeight`
  (search for `$quote_line_height`). `line-height: 2` would become
  `line-height: var(--wp--preset--spacing--2)` — a spacing token on a unitless property.
- Bare integers in authored content exist ONLY as `gap` defaults (`sgs/container`, `sgs/gallery`) and
  those already route through `sgs_container_gap_value()`, which is a one-line delegate to the
  hardened function. **The precedent already ships; you are extending it, not inventing it.**

**⛔ THE PRECONDITION — do this FIRST or the codemod fatals pages.**
`helpers-responsive.php:28-38` documents that some `render.php` files require a helper directly
without ever loading `render-helpers.php`. Enumerated: 54 of 56 files can already reach
`helpers-css-safety.php`; **two cannot** — `includes/helpers-box.php` and `includes/helpers-tokens.php`.
Add to each, copying `helpers-responsive.php`'s existing line and its rationale comment verbatim:

```php
require_once __DIR__ . '/helpers-css-safety.php';
```

Both files guard with `function_exists()`, so load order does not matter — only that both load
before either function is CALLED.

---

## PHASE 1 — the precondition — `[SESSION-START]`

**Model:** inline · **Time:** 5 min · **Deps:** none
**Files:** `includes/helpers-box.php`, `includes/helpers-tokens.php`
**Action:** add the `require_once` above to both, with a one-line comment saying why (mirroring
`helpers-responsive.php`). Nothing else.
**Test — Happy:** `php -l` clean on both; `npm run build` not needed yet.
**Fail:** if either file already has the require, do nothing and say so.

## PHASE 2 — build the codemod, self-test FIRST — `[SESSION-START]`

**Model:** sonnet · **Time:** 20 min · **Deps:** Phase 1
**File:** `plugins/sgs-blocks/scripts/migrate-length-sanitiser.py` (new)
**Action:** survey / fix / check / self-test, modelled on `migrate-render-closures.py`.

The transform is a single-arg rename: `sgs_css_length_sanitise(` → `sgs_css_length_value(`.

It MUST:
- **Skip the definition and the `function_exists` guards** — renaming those breaks the polyfill.
- **Skip the exclusion list**, which is a NAMED constant in the script, not a heuristic:
  `EXCLUDE = { ('src/blocks/testimonial/render.php', 'quote_line_height') }`. A future unitless
  site gets added here by hand, deliberately.
- **Refuse rather than guess** on anything it does not recognise (`SKIP: unrecognised`), and print
  every skip. A silent skip is the failure mode that produced two wrong counts on 2026-08-21.
- Write with `newline=''` to **preserve LF**.

**Self-test assertions (write these before running it for real):**
- a plain call site is renamed
- the DEFINITION is untouched
- a `function_exists( 'sgs_css_length_sanitise' )` guard is untouched
- the excluded unitless site is untouched **and reported as excluded**
- **negative control:** an inert file comes back byte-identical
- **negative control:** with the exclusion list emptied, the testimonial fixture DOES get renamed —
  proving the exclusion is doing real work rather than matching nothing

**Fail:** if the self-test passes on the first write, empty the exclusion list and confirm the
relevant assertions go RED. A green suite you have never seen fail proves nothing.

## PHASE 3 — run it — `[SESSION-START]`

**Model:** inline · **Time:** 5 min · **Deps:** Phase 2 green
**Action:** `--survey` (expect 207 sites / 206 migratable / 1 excluded), then `--fix` (dry run),
read the diff, then `--fix --apply`, then `--check` (expect 0 remaining).
**Test — Happy:** `php -l` clean on every touched file; `git diff --stat` lists only expected paths.
**Edge:** confirm `testimonial/render.php` is NOT in the diff.
**Fail:** any count other than 206 migrated — stop and reconcile before continuing. Do not proceed
on a number you cannot explain.

## QA Gate 1 — mechanical

**Model:** inline · **Deps:** Phase 3
**Check, per touched file:** `php -l` clean · line endings still LF (`file <path>`) · phpcs equal to
HEAD. **Extract HEAD keeping the same basename** (`/tmp/h/<name>.php`) — the WordPress standard
errors on a class file whose name doesn't match its class and will manufacture a false delta if you
rename it. phpcs lives at `/c/Users/Bean/AppData/Roaming/Composer/vendor/bin/phpcs`.
**Then:** `npm run build` exits 0.
**Pass:** all four. **Fail:** revert with `git checkout --` on the named files and re-run the codemod.

---

## PHASE 4 — the live proof — `[HANDOFF]`

**Model:** inline · **Time:** 20 min · **Deps:** QA Gate 1
**This is the phase the previous session could not do, and the reason this ships alone.**

⛔ **CAPTURE THE "BEFORE" ON THE CANARY *BEFORE* YOU DEPLOY.** The 2026-08-21 session deployed first
and could then only verify the after-state. Do not repeat that.

1. **Before deploy**, fetch a page that exercises these values and save it **to the scratchpad, not
   `/tmp`** (`/tmp` was clobbered mid-analysis by another process on 2026-08-21 and gave three
   different answers for one path). Fetch twice and confirm identical md5 — the page must be stable
   before it can be a baseline.
2. Deploy: `python plugins/sgs-blocks/scripts/build-deploy.py --target sandybrown`. Never hand-roll
   tar/scp. Do not reach for `--allow-dirty` or `--skip-verify`.
3. **After deploy**, fetch the same page and diff the emitted CSS.
   **Expected: a REAL difference** — that is the point. Any negative value keeps its sign; any
   `calc()` survives intact. **Zero difference means the migration did not take effect** — that is a
   FAILURE, not a pass. This is the inverse of the previous phases, where byte-identical was the win.
4. Confirm no PHP fatals in the live HTML, and parse any emitted CSS you assert on.

**Fail:** a value that got WORSE, or a page that now renders nothing where it previously rendered
something. Roll back with the `.bak` the deploy script leaves on the server.

---

## PHASE 5 — docs + enforcement — `[HANDOFF]`

**Model:** inline · **Time:** 15 min · **Deps:** Phase 4 verified live
**Do NOT skip this because the code works.** Four live docs currently describe this migration as
NOT DONE. Leaving them is how the next session re-investigates a solved problem — the exact cost
this programme kept paying.

**1. `.claude/specs/32-COMPONENT-STYLING-TOKEN-CONTRACT.md` §6.1 (a2)** — the contract you
implemented. Flip it from "is the target" to DONE, and state the outcome: how many sites moved, the
carve-out that remains, and the date. Keep the delta table — it is the *why*, and it stays true.

**2. `plugins/sgs-blocks/CLAUDE.md`**, the shared-helper section (search `sgs_css_length_value`).
It currently reads **"Still open, deliberately"** with the site count and the five deltas. That
sentence becomes false the moment you land Phase 3. Replace it with the shipped state + the
surviving carve-out. ⚠ The count in that file was already wrong once ("247 across 58" when the real
figure was 207 across 56, because it counted definitions and guards as call sites) — quote your
`--survey` output, not a remembered number.

**3. `.claude/decisions.md`** — one new D-entry at the top (verify the ceiling with
`grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` — **anchor on
the heading**; an unanchored grep once returned a hex colour as a D-number). Record: the ruling, the
counts, the ONE carve-out and why, the precondition that would have fatalled pages, and the live
before/after evidence. Tag `[ROUTINE]`.

**4. `.claude/LEDGER.md`** — the consolidation track says "CLOSED except Phase 4". Close it.
⚠ **It runs near its 24,576-byte cap** — shrink that block to a pointer rather than expanding it,
and run `python .claude/hooks/handoff-preflight.py --check` before committing. A `decisions-size`
FAIL is expected and **must be left alone** — it self-heals via the `decisions-sweep-auto.py` Stop
hook (verified 2026-08-21; `.claude/CLAUDE.md` says explicitly not to spend session time on it).

**5. ENFORCEMENT — decide, then act.** After this migration `sgs_css_length_sanitise()` has ONE
legitimate caller. Nothing currently stops a future block adding a 208th. Pick one and say which:

- **(a) Recommended — gate it.** Extend the existing detector triad with a `--check` that fails on
  any NEW `sgs_css_length_sanitise(` call outside the named exclusion list, and wire it into
  `prebuild` **in the same commit that builds it**. This repo's documented failure mode (D338/D493)
  is a gate built and left unwired for weeks while docs claimed it ran. Grep `package.json` to prove
  it is reachable; a gate nothing calls is not enforcement.
- **(b) Retire the function** — fold the one unitless caller onto a purpose-named helper
  (`sgs_css_unitless_sanitise()`), then delete the crude one outright so the wrong choice becomes
  impossible rather than merely discouraged. Cleaner end-state, slightly more work.
- **(c) Do nothing** — only defensible if you can say why a 208th caller would be harmless.

**Test — Happy:** every one of the four docs describes the SHIPPED state; the gate (if built) fails
on a planted violation and passes once removed.
**Fail:** any doc still saying "still open" / "not done" / carrying a superseded count.
**Integration:** `python .claude/hooks/handoff-preflight.py --check` — 9 of 10 PASS, with
`decisions-size` the only expected failure.

## Key Judgement Calls — already made, do not re-litigate

- **Migrate at all?** GO. Three of the four deltas turn broken output into correct output; the fourth
  (bare integer) already matches shipped behaviour for `gap`.
- **The unitless carve-out?** ONE site, named above. Do not "tidy" it onto the hardened function.
- **Ship alone?** Yes. It is the only behaviour change in the programme. Bundling it with anything
  else makes both unfalsifiable.

## Pre-emptive decisions, so nothing pauses mid-execution

- **"Should I also fix the phpcs warnings I can see?"** No. Compare to HEAD; fix only what your own
  change introduced. If removing a line merges an alignment group, reinstate a BLANK LINE — **never
  `phpcbf`**, which realigns whole files.
- **"Can I use a heredoc for a Python one-liner containing a backslash?"** Be careful — a `<<'PY'`
  heredoc ate a backslash twice on 2026-08-21, turning `\function_exists` into a form feed and
  making a replace silently match nothing. Build backslashes with `chr(92)`.
- **"Can I read the HTML with `errors='ignore'`?"** No. It silently discards bytes and lost an entire
  attribute from a count. Use `errors='replace'` and reconcile the raw byte count against the parsed
  count before reporting.
- **"The build failed — is it me?"** Revert, rebuild, re-apply, rebuild before attributing.
- **"Can I run `/sgs-update` or re-seed the DB?"** Not while another track is committing.
- **"A comment contradicts the code — do I fix it?"** Report it; don't rule unilaterally.