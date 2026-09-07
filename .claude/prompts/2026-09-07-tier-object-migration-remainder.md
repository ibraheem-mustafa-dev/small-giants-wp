---
doc_type: prompt
title: Tier-object migration — Priority 4 (media-atom generalisation) + deploy-isolation hardening
created: 2026-09-07
governs: plugins/sgs-blocks/src/blocks/hero/, plugins/sgs-blocks/src/components/media/, plugins/sgs-blocks/scripts/build-deploy.py
retention: delete once consumed
---

# Tier-object migration remainder — Priority 4 + deploy hardening

**This file replaces `2026-09-07-tier-object-phase-3-next.md`, deleted this same session
(consumed in full).** Priorities 1-3 from that prompt are DONE and live-verified:
accordion/button/table-of-contents padding tiers, the shared media-padding atom, hero's
`splitMediaPadding` (both the atom-routed and the separate hand-rolled read), `sgs/media`'s
new `padding` attribute, and both originally-flagged border-radius "bugs" turned out to be
non-issues on investigation (whatsapp-cta already worked; sgs/media's radius is a different,
explicitly out-of-scope mechanism — see below). Full detail, including a live-incident
report worth reading before you deploy anything: `.claude/memory/sdd-progress.md`, every
section dated 2026-09-07.

Invoke `/autopilot` first. Check `ListAgents` and `git status` — this tree runs 150+
concurrent sessions on `main`.

## Check this first: a background fix may already be running or done

A `wp-sgs-developer` (Sonnet) subagent was dispatched this session to fix a SECOND, separate
`mediaPadding` bug on hero (the outer `.sgs-hero__media` wrapper padding — distinct from
`splitMediaPadding`, which is the split-layout image's own padding and was already fixed).
Check `git log -20 --oneline` for a commit touching `hero/block.json`+`hero/render.php`+
`hero/edit.js` together with a message about `mediaPadding`, and check
`.claude/memory/sdd-progress.md`'s tail for an entry documenting it. If it landed and was
live-verified, this task is done — don't redo it. If it's stalled or missing, that's a loose
end to pick up (the agent's brief is reconstructable from this session's dispatch history if
needed — ask Bean for the original prompt text if you can't find its output).

## The lesson this prompt exists to prevent you from re-learning the hard way

Bean caught a real design-error risk mid-session (2026-09-07) before it shipped: **not every
"Tablet/Mobile-suffixed" attribute on a media element is a candidate for this tier-object
migration.** There are two genuinely different shapes hiding under the same naming
convention, and conflating them is a real bug, not a style preference:

1. **A responsive VALUE** (padding, object-position, width, a border-radius corner set) —
   the SAME element renders at every tier; only a CSS property's value differs. This is
   exactly what `sgs_responsive_normalise_object()` + `patchTier()` + the tier-object
   `{desktop,tablet,mobile}` shape were built for. **Safe to migrate**, and already proven
   correct on `padding`/`margin`/`borderRadius` across `accordion`/`button`/`container`/
   `sgs/media`/hero's `splitMediaPadding`/`mediaPadding`.
2. **An ART-DIRECTION media SOURCE** (`splitImageUrl`/`splitImageUrlTablet`/
   `splitImageUrlMobile`, `splitVideoUrl*`, `thumbnail*`, `svgContent*`) — a DIFFERENT FILE
   renders per device tier, via genuinely separate sibling markup
   (`sgs_tier_media_render()` emits distinct `<img>`/`<video>`/`<svg>` elements, toggled by
   `@media`-scoped CSS visibility, not by one element's CSS property changing). Folding this
   into one JS-object attribute would be architecturally wrong — there is no single "value"
   to hold, there are three different resources. **These attributes are correctly LEFT in
   the old flat-sibling shape on purpose** and are NOT part of this migration. Full pattern
   description: `plugins/sgs-blocks/CLAUDE.md`, search "Art-direction tiers".

**How to tell which one you're looking at, for any given attribute:** does changing its
value at a breakpoint change WHICH DOM ELEMENT is visible (a different `<img>`/`<video>`
tag), or does it change a CSS PROPERTY on the SAME element that's already there? The first
is art-direction (leave alone). The second is a value (migrate). When genuinely unsure, grep
the attribute's name in the block's `render.php` and read what consumes it — do not guess
from the attribute's name or its Tablet/Mobile suffix alone; the suffix pattern is shared by
both shapes and tells you nothing on its own.

## Priority 4 — pilot-then-generalise the media-atom migration (the actual task)

The original scope (never executed) named these candidates for the NEXT properties to
migrate on hero's `splitMedia`-prefixed element family, after `splitMediaPadding`:
`splitMediaObjectPosition`, `thumbnail`, six video-toggle booleans
(`videoAutoplay`/`Tablet`/`Mobile` and its siblings), `splitMediaType`, `splitMediaWidth`.

**Do not treat this list as pre-cleared.** Re-classify every single one using the test
above before touching it:

- `thumbnail`/`thumbnailTablet`/`thumbnailMobile` — per `plugins/sgs-blocks/CLAUDE.md`'s own
  "VIDEO-source + poster art-direction tiers" section, this is explicitly documented as
  art-direction (a different poster IMAGE per device). **Almost certainly should NOT be
  migrated** — verify by reading how it's consumed in `hero/render.php` before concluding
  either way, but go in expecting to exclude it, not include it.
- `splitMediaType`/Tablet/Mobile — determines WHICH media kind (image/video/svg) renders per
  tier, which changes which sibling markup branch fires. This smells like art-direction
  (a different render path, not a CSS value) — verify against `sgs_tier_media_render()`
  before assuming either way.
- `splitMediaObjectPosition` — a CSS `object-position` value (e.g. `"50% 20%"`) applied to
  whichever image element is already showing. This smells like a VALUE (same shape as the
  `focal-point` atom, which may already handle it — check `sgs_media_atom_focal_point_css()`
  and its JS twin before assuming this needs new work at all).
- `splitMediaWidth` — a CSS width value. Smells like a VALUE, similar shape to padding.
- The six video-toggle booleans — read `helpers-tokens.php`'s `BooleanResponsiveControl`
  pattern (mentioned in `plugins/sgs-blocks/CLAUDE.md` under Media's "Per-device
  video-autoplay tiers") before deciding — a boolean toggle per tier might already be a
  different, deliberately-boolean-shaped mechanism that doesn't need the object-tier
  treatment at all, or might already BE tier-object-shaped. Verify, don't assume.

**Process once you've correctly classified a property as a genuine value:**
1. Pilot ONE property fully (fold block.json, fix render.php read via
   `sgs_responsive_normalise_object()`, fix edit.js control wiring via `patchTier()` +
   `ResponsiveBoxControl`/appropriate control, fix any reset/hasValue logic) through to a
   live-verified deploy, exactly mirroring the `splitMediaPadding` fix
   (`72a441659`/`d42cc76c9`/`bd58c88ed` — read all three diffs first).
2. Only generalise to the remaining correctly-classified properties once the pilot's pattern
   is proven live.
3. Add a fixture to `sgs-update-v2.py`'s `_self_test_is_responsive` for whatever you migrate
   — the heuristic there has been wrong before per its own doc comments; never trust it by
   analogy alone.
4. Run `python plugins/sgs-blocks/scripts/check-undeclared-attrs.py --check` and
   `python plugins/sgs-blocks/scripts/migrate-tier-object.py --check-db-parity` after EVERY
   block.json change and DB reseed (`python plugins/sgs-blocks/scripts/sgs-update-v2.py`) —
   these two gates caught the exact regression class this migration is prone to, twice, this
   session alone.

## Task B — harden the deploy pipeline against the shared-build-directory race

**A live incident happened this session and was fixed, but only manually, once.** Full
incident report: `.claude/memory/sdd-progress.md`, section "A genuine live incident
happened...". Summary: `plugins/sgs-blocks/build/` is gitignored and shared across every
concurrent session on this machine. `npm run build` does `rm -rf build` first. A deploy's
~155s pre-deploy gate window is long enough for another session's concurrent build to wipe
the build directory out from under an in-flight deploy, shipping a plugin tarball with ZERO
working blocks to the live canary. `build-deploy.py`'s own `[payload-verify]` step catches
this, but only AFTER the broken plugin is already live — it's a detector, not a preventer.

**The fix used this session (manual, worked, not durable):** `git worktree add
/tmp/<name> HEAD`, symlink `node_modules`+`vendor` from the main checkout (both gitignored,
safe to share read-only), build and deploy from the isolated worktree instead of the shared
checkout, remove the worktree after.

**What's actually needed:** make this the DEFAULT, not something a session has to remember.
Options to weigh (this is a real design decision — bring a recommendation, don't just
implement the first idea):
1. `build-deploy.py` builds into a per-invocation temp directory (or an isolated worktree it
   creates and tears down itself) automatically, rather than relying on the shared
   `plugins/sgs-blocks/build/` — removes the race entirely, at the cost of a slower/heavier
   deploy (git worktree creation + symlink setup + full build every time, no shared
   `node_modules` install step needed since symlinked).
2. A file lock (`build.lock`) that `npm run build` and `build-deploy.py` both respect —
   cheaper, but does nothing for a session that ignores the lock or a stale lock left by a
   crashed process; probably not sufficient alone given the observed concurrency level.
3. Some combination: lock as a fast-path guard + worktree-isolation as the actual fix.

Whatever you choose, it must not break `--skip-build` (deploying an already-built payload
without touching `build/` at all) or the existing gate chain. Test it under real concurrency
if you can (dispatch 2+ parallel build attempts and confirm neither corrupts the other's
output) — a single-session test won't reproduce the failure mode that caused the incident.

## Doc, spec, and plan closeout (do this once Priority 4 + Task B are both done, not before)

1. **`.claude/memory/sdd-progress.md`** — append (never overwrite) a final section closing
   out the whole tier-object migration arc: what Priority 4 covered, the classification
   decisions made (property-by-property, with reasoning — future sessions will hit the same
   art-direction-vs-value question on whatever's left unmigrated), and Task B's chosen
   design + why. If this file has grown past a size that makes it unwieldy to read in full
   (~59KB as of this prompt being written — check current size with `wc -c`), consider
   whether it's time to snapshot older sections to `memory/` per this project's usual
   rotation pattern (check `.claude/CLAUDE.md`'s doc-op standards for the convention) —
   don't do this automatically, flag it as a question if the file is large.
2. **`.claude/LEDGER.md`** — this is THE single living-status doc, replaced not appended.
   Read it in full first (it currently reflects a different session's typography-track
   close-out from earlier the same day — do not clobber that, fold your update in
   alongside it following the existing "Shipped today" table pattern). Add entries for
   whatever Priority 4 + Task B shipped, with D-number + commit-hash pointers, matching the
   existing table's format exactly.
3. **`.claude/decisions.md`** — add a new D-entry (check the current ceiling first:
   `grep -oE '^## D[0-9]+' .claude/decisions.md | grep -oE '[0-9]+' | sort -n | tail -1` —
   do NOT trust a cached number, it was 991 when this prompt was written and this repo adds
   ~13 decisions/day) for the tier-object migration's completion (Priorities 1-4 combined,
   since this is the natural closing point for that whole arc) AND a separate D-entry for
   Task B's deploy-hardening design, tagged `[INCIDENT]` since it exists because of the live
   incident, not as routine work.
4. **`plugins/sgs-blocks/CLAUDE.md`** — the "Tier-object migration triad" section currently
   describes the migration as a general, ongoing mechanism. If Priority 4 genuinely closes
   out every remaining flat-trio attribute in the framework (check via
   `python plugins/sgs-blocks/scripts/migrate-tier-object.py --property <name> --survey`
   across the full attribute list, not just hero's), update that section to say so — but
   verify completeness before claiming it; a half-finished migration claimed complete is
   exactly the kind of drift this project's doc-op standards exist to prevent. If Priority 4
   only closes hero's media-atom family and other blocks/properties remain, say precisely
   that instead — don't round up.
5. **`.claude/specs/35-BLOCK-INSPECTOR-UX-STANDARD.md`** — this is the governing spec for
   inspector-UX + control-type contracts. Check whether it references the tier-object
   attribute shape anywhere (search "tier-object", "responsive box", "patchTier") and
   whether Priority 4's work changes any of its Part L per-item completion states. Only
   touch it if something it claims is now stale — don't add narrative for its own sake.
6. **Prompt archiving** — delete THIS prompt file in the same commit that closes out the
   work it describes (per this project's standing convention: a prompt is an instruction,
   not a record; supersede-and-`git rm` in one commit, never leave two plausible prompts for
   the same track sitting in `.claude/prompts/`). Check whether
   `.claude/prompts/2026-09-07-colour-conformance-text-next.md` and
   `.claude/prompts/2026-09-07-inspector-gates-rule41-43-next.md` are unrelated (they look
   to be, from different concurrent tracks) — leave them alone, they're not yours to
   consume or delete.
7. **`.claude/parking.md`** — do NOT add an entry for anything in this prompt. Planned,
   already-scoped next-session work is a LEDGER pointer, not a parking entry (per this
   project's own captured lesson — parking is for genuinely DEFERRED work, not work that's
   simply next). If you genuinely can't finish something and it needs deferring past this
   session, ask Bean before adding a parking entry — never add one unasked.

## Git hygiene (read `.claude/CLAUDE.md`'s Git workflow section in full — this is the
condensed version)

- No PRs, no stashes. Commit straight to `main`, path-scoped
  (`git commit -m "..." -- <exact paths>`, never `git add -A`/a glob).
- Check `git branch --show-current` is `main` in the same command as every commit.
- Before pushing: `git fetch origin main --quiet && git rev-list --left-right --count
  origin/main...HEAD` — pull/rebase if behind.
- Before editing any file, `git status --short -- <path>` — if it's already dirty (another
  session mid-edit), wait and retry rather than editing blindly. This repo runs 150+
  concurrent sessions; expect this to happen regularly, budget time for it.
- Visual-diff pre-commit gate: for a genuine behavioural fix, use the honest scoped bypass
  (`SGS_VISUAL_GATE_SKIP=<block> SGS_VISUAL_GATE_REASON="..." git commit ...`) rather than
  fabricating a report — live-verify post-deploy instead, as this session did throughout.
- **Deploy using the isolated-worktree technique (or whatever Task B replaces it with) —
  do not build directly in the shared `plugins/sgs-blocks/build/` directory.** This is not
  optional given the incident above.
- Pre-existing gate findings from OTHER sessions' already-merged commits: verify via
  `git log -1 -- <file>` that they predate your work, then baseline + disclose with
  `[gates-ok: ...]` in the commit message (see commits `27ecb13e6`/`f9a34fa7d` this session
  for the exact pattern) rather than either fixing someone else's unrelated work or being
  blocked by it.

## Hand back if

- The dispatched hero-`mediaPadding` fix (see top of this prompt) hit a real blocker you
  can't resolve — read its output/commits first, don't restart it blind.
- Re-classifying `thumbnail`/`splitMediaType`/the video-toggle booleans surfaces a THIRD
  distinct shape not covered by the value-vs-art-direction split above — that's a design
  question for Bean, not a call to make solo.
- Task B's design choice has a real tradeoff Bean should weigh (e.g. deploy speed vs.
  robustness) — present the menu, don't just pick one.
