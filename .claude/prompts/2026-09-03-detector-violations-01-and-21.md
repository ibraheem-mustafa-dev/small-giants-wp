# Resolving detector violations — 01-tab-group (32 open) + 21-render-without-control (54 open)

**Written 2026-09-03. Scope: inspector-scan detector findings only** — the gap-candidates
retirement (a separate, mid-flight thread in an isolated worktree) has its own prompt:
`.claude/prompts/2026-09-03-gap-candidates-retirement-and-detector-backlog.md`. Don't mix the two
threads in one session; they touch unrelated parts of the codebase. Invoke `/autopilot` first.

## Where you left off

`01-tab-group` went from 56 → 32 findings this session (verified live just now, not from memory —
an earlier note in this project's own docs briefly claimed "56 → 24", which was wrong; 32 is the
real current count). Two pieces of work landed on `main`, both pushed:

1. **Mega-aside false positive + 7 form-field panel merges** (commit `e273c6e7f`) — content-only
   panels merged per TIER 2 of the inspector UX spec.
2. **Mixed-panel exemption rule** (commit `0e1bd63f0`, built via `/subagent-driven-development`,
   cross-model reviewed): a panel containing at least one structural/behavioural control with no
   CSS property behind it (a variant picker, a layout-mode radio, a preset picker) now exempts the
   WHOLE panel from needing `group="styles"`, even when the same panel also has real
   CSS-styling controls. Bean's ruling: CSS controls sharing a panel with a structural sibling
   stay grouped with it in Settings, not split to Styles — this reversed an earlier "split mixed
   panels across tabs" assumption. Verified against 5 named worked examples individually (not
   just the aggregate count): `sgs/audio` and `sgs/image-sequence` clear entirely; `sgs/post-grid`'s
   Layout panel clears (the mixed case the rule exists for); `sgs/multi-button` and `sgs/text`
   correctly stay flagged (pure CSS, no structural anchor).

Also fixed as a side-effect of investigating modal's panels: `overlayColour`/`overlayOpacity` now
live together in one Styles-tab panel (commit `5ac5922d6`) — matches the existing 8-block
`BackgroundPanel.js` precedent (colour picker with alpha off + a plain opacity slider, one panel).

`image-sequence`'s own panel-merge work (Frame source + Responsive frame sources, plus a proposed
Scroll-effect exemption) is still **deferred** — Bean wanted a live-editor look before locking the
shape. Read `.claude/decisions.md`'s head for the exact scope already agreed there before touching
that block again — don't re-derive it from scratch.

## First action

```
cd plugins/sgs-blocks
node scripts/inspector-scan/run.js --json > /tmp-scan.json
node -e "const d=require('./tmp-scan.json'); ['01-tab-group','21-render-without-control'].forEach(id => { const r=d.rules.find(x=>x.id===id); console.log(id, (r.findings||[]).length); })"
```

Confirm the counts still match this doc (32 and 54) before planning anything — if either number
has moved, something changed since this was written and you need to find out what before
continuing.

## `01-tab-group` — 32 remaining, real work now (not detector noise)

The coarse-check phase is over. The mixed-panel rule already absorbed every panel where a
structural/no-CSS control was present. What's left in the 32 is genuinely unrouted CSS-styling
content with no structural anchor to exempt it — real per-block work, not another detector fix.

**Before dispatching fixes, get the current block list and bucket it** — don't assume the shape
of the remaining 32 matches what an earlier triage pass found (that triage was against the
pre-mixed-panel-rule 56, and many of those panels are now already resolved). Re-run:

```
node scripts/inspector-scan/run.js --json
```

and read each finding's own `detail` text (it names the specific block + panel + the FIX
pointer to Spec 35 Part O). For each block: does the panel need a `group="styles"` prop added
directly (the block already mounts a shared component like `SgsColourPanel` for SOME content but
this specific panel isn't routed), or does it need restructuring into per-element TIER 1 panels
per THE PLACEMENT RULE? Read the actual `edit.js` before deciding — don't guess from the block
name.

**Present the bucketed list to Bean as a menu before dispatching any fixes** — this project's
established rhythm this session was: bring one report, get a decision, dispatch immediately, keep
discussing while the agent works. Don't batch every fix to the end.

## `21-render-without-control` — 54 findings, completely untriaged

Nobody has looked at this rule's findings yet this session. Read the rule's own source
(`plugins/sgs-blocks/scripts/inspector-scan/rules/21-render-without-control.js`) first to
understand exactly what it checks — don't assume from the name. Then run it and read a sample of
the actual findings before proposing any fix shape. This is a first-pass triage, same discipline
as `01-tab-group` got at the start of its own work: don't blanket-fix, understand the check, sort
findings into real-vs-noise buckets, present a menu.

## Not in scope for this thread

- **Gap-candidates retirement** — separate prompt, separate worktree, don't touch it here.
- **`31-golden-colour-control`** — deliberately out of scope, runs as its own session. Read
  `.claude/reports/2026-09-03-media-atom-migration-lessons.md` first if picking it up (a prior
  attempt cost ~75% of a session's context on verification alone — that report names what to do
  differently).
- **`image-sequence`'s deferred panel merges** — noted above, needs the live editor, not blocked
  on anything in this prompt.

## Rules worth carrying forward

- **A detector rework can look done on the aggregate count and still hide real per-block
  work underneath.** 56 → 32 is real progress, but every one of the 32 remaining findings still
  needs individual judgement — the mixed-panel rule closed a CLASS of false-shaped findings, not
  the whole backlog.
- **Verify a cited count against the live detector before trusting it, including counts in this
  project's own docs.** This exact prompt corrects an earlier "56 → 24" claim that was wrong —
  caught by re-running the detector rather than copying a number forward.
- **A control that "doesn't work" already works somewhere — diff against it, don't design from
  scratch.** Confirmed again this session (modal's overlay-opacity fix came from finding the
  existing `BackgroundPanel.js` precedent, not inventing a new API).
- **When Bean pushes back on a technical claim, investigate concretely before answering** — don't
  just re-assert or just agree. Applies to any "this control should/shouldn't be here" judgement
  call during the `01`/`21` triage.
- **Dispatch the moment a decision is made, keep discussing while the agent works** — don't queue
  approved fixes behind an end-of-session batch.

## Skills

| Skill | When |
|---|---|
| `/autopilot` | First, before any response |
| `/delegate` | Before every dispatch |
| `/dispatching-parallel-agents` | An approved fix splits across disjoint blocks |
| `/subagent-driven-development` | A detector-logic change itself (implementer + cross-model reviewer) |
| `/qc-council` | Before trusting a new detector claim, or any fix touching a shared/core file |
| `/handoff` | Session close |

## Tools

| Tool | For |
|---|---|
| `node scripts/inspector-scan/run.js` (from `plugins/sgs-blocks/`) | Detector rule counts + per-finding detail |
| `npm run gate:fast` (from `plugins/sgs-blocks/`) | Full gate suite after any fix |
| `/sgs-db` · `/wp-blocks` | DB and block-schema ground truth |
| Playwright MCP | Live editor/DOM verification |
