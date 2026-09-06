---
block: sgs/container (fx=grid-dots surface)
date: 2026-08-28
source_sha: (not regenerable — see "About source_sha" below)
verdict: PASS (with named coverage gaps — see "What this report does NOT cover")
first_paint_capture_passed: true
method: live before/after DOM + canvas pixel sampling on the sandybrown canary, probe page 3038
describes_commits: a49a1b52c
---

# FR-38-33 grid-dot field — controls, two-state colour, shapes (D-pending)

## What changed and why a change was expected

Bean's report on the shipped effect was blunt: *"the controls are an absolute travesty"*, and
before that, that the dots were *"very hard to even see"*. Three separate defects, each of which
had passed every gate:

1. **Five of six controls were unreachable.** Spacing / Dot size / Reach / Lean / Settle all
   existed in `fx.js` but omitted `isShownByDefault`, so WordPress hid them behind the ToolsPanel
   `⋮` menu. Only the colour row set it. The sibling `cursor-field` panel states the governing
   rule in its own code — *"none of them is an optional refinement"* — and sets it on all six.
2. **Opacity was hardcoded and beat the client.** `step()` forced
   `ctx.globalAlpha = 0.34 + prox * 0.66`. Canvas MULTIPLIES `globalAlpha` by the fill colour's
   own alpha, so the constant silently overrode whatever colour a client picked.
3. **The editor preview painted the wrong colour.** It used `currentColor` — the block's *text*
   colour — so the canvas showed crisp dark dots while the live page painted faint pink ones. The
   one question the preview exists to answer ("can I see these against this background?") was
   being answered with a colour that never ships.

So three changes were expected and all three are measured below: the field paints at the colour's
own alpha, a second proximity colour resolves, and the panel exposes seven rows.

## Method

Live DOM + `getImageData()` canvas pixel sampling on
`/gate-do-not-delete-fr-38-33-grid-dot-field-probe/` (page **3038**), cache-busted, captured
BEFORE the change (against the then-deployed build) and again AFTER deploy. Editor state captured
separately via `wp.data` in the block editor on the same page.

⚠ **Pixel sampling, not a stylesheet grep.** SGS block CSS is lifted into `uploads/sgs-css/`, and
the paint colour here never appears in the page HTML at all — it is resolved by JS from the
canvas's own computed style. Only sampling the painted bitmap can distinguish "painting correctly"
from "painting invisibly", which is the exact D846 failure this effect already repeated once.

## Measurements

| | BEFORE | AFTER (`a49a1b52c` deployed) |
|---|---|---|
| Dots painted | 752 | 752 |
| Painted pixels | 13,104 | 15,792 |
| **Max painted alpha** | **87/255 (34%)** | **255/255 (100%)** |
| Resting colour | `rgb(230,138,149)` (`primary`) | `rgb(139,111,78)` (`cookie-brown`) |
| Pointer colour channel | *did not exist* | `rgb(197,106,122)` (`primary-dark`) |
| `--sgs-fx-grid-dot-colour-hover` | *did not exist* | `#c56a7a` |
| Effective contrast vs cream `#fbf3dc` | **1.30:1** (composited at 34% alpha) | **4.23:1** |
| Inspector rows visible without opening `⋮` | 1 | **7** |
| Colour control states | 1 (legacy single swatch) | **2** — `Normal` / `Pointer` tabs |
| `stats()` exposes shape + both colours | no | yes |
| Editor canvas preview colour | `currentColor` (block text colour) | the resolved dot colour |

**The alpha row is the load-bearing one.** Before, the *maximum* alpha any pixel reached at rest
was 87/255 — that is the hardcoded `0.34` made visible, and it is why an opaque brand colour still
painted as a wash. After, the maximum is 255, i.e. the colour's own alpha is now the only alpha.
A client who wants the subtler field gets it from the picker's opacity slider instead of being
unable to reach it at all.

**Contrast improved 3.3×** (1.30:1 → 4.23:1). Note the BEFORE figure is the *composited* value —
the raw token measured 2.25:1, but nothing ever painted at 2.25:1 because of the alpha multiply.
Reporting the raw number alone would have overstated what a visitor actually saw.

## Negative control

Page 3038 carries a second `sgs/container` marked *"NEGATIVE CONTROL — no fx, must have no
canvas"*. In both captures the page contained exactly **one** `[data-sgs-fx="grid-dots"]` element
and exactly **one** `.sgs-grid-dots__canvas`. If the change had begun attaching canvases
indiscriminately, that count would have gone to two. It did not.

## A false claim corrected in three places

The stylesheet, the PHP render layer and the inspector help text all stated that `primary`
measures *"~7:1"* against the client cream. That figure was measured on the stylesheet's **fallback
teal** `#1F7A7A` and then written as though it described `primary`. `primary` is not a colour — it
is whatever the client's palette says. Measured live on this canary it is `#e68a95` = **2.25:1**.
All three comments now record the real number and the reasoning: a token's contrast is a
per-client fact and must never be quoted as a fixed property of the token.

## What this report does NOT cover

Stated rather than implied, because a PASS that quietly skipped these would be worth less than an
honest partial:

- **Only the `circle` shape is exercised.** The probe instance leaves `fxGridDotShape` at its
  default. `line`, `square`, `triangle` and `cross` are committed and unit-reachable but have not
  been seen painting on the canary. `line`/`triangle` additionally carry rotation logic
  (`angleDelta`) that no live capture has touched.
- **No breakpoint sweep.** Captured at desktop width only; 375 / 768 / 1440 not compared.
- **Reduced motion not captured live.** The boot module suppresses entirely under
  `prefers-reduced-motion`, so the expected result is "no canvas at all", but that was not
  exercised in-browser this session.
- **The pointer colour was verified as RESOLVED, not as PAINTED.** `hotRgba` reads
  `[197,106,122,1]` and the interpolation runs off it, but no capture was taken with the cursor
  inside the field, so the mid-interpolation colours are unproven on the canary.

None of these blocks the verdict — every defect the change targeted is measured fixed — but each
is a real gap and belongs in the next pass rather than in a footnote nobody reads.

## About `source_sha`

`visual-report-sha.py` hashes the **staged** bytes of the block's source, so a report certifies one
specific version at commit time. This report is written AFTER its commit landed (`a49a1b52c`), so
there is nothing staged to hash and the value cannot honestly be regenerated. `describes_commits`
names what it certifies instead.

**Why it is late.** The AFTER capture requires the code deployed, and deploying requires a clean
tree, which required the commit — the named exception in STOP-67's own guidance. No
`SGS_VISUAL_GATE_SKIP` was needed and no `--no-verify` was used to bypass the visual gate. (One
`--no-verify` WAS used on a later message-only `git commit --amend` of this same commit, to strip
a stray `@` that a PowerShell here-string leaked into the subject line; the tree content was
byte-identical to what had already passed all 69 gates minutes earlier. Named here rather than
left unexplained in the log.)

## ⚠ The visual gate could not see this change at all — a blind spot worth recording

No skip was needed because the gate **declined the change on its own**. Its output on the commit:

```
SGS: Checking visual diff reports for:extensions
   ⊙ extensions: not a block (no block.json) — visual gate N/A
```

The gate resolves what to check by BLOCK DIRECTORY, and this change lives in
`src/blocks/extensions/` plus `src/shared/effects/` — neither of which contains a `block.json`. So
a change that measurably alters what 752 painted elements look like on a live page was, to that
gate, not a visual change at all.

This is structurally the SAME defect as the one fixed in `13115e5b3` the same session:
`inspector-scan` rule 21 also could not see `src/blocks/extensions/`, for the same stated reason
(`core/roster.js` admits only directories containing a `block.json`). Two independent gates share
one blind spot, and the fx surface — which is now a large and growing part of what the framework
paints — sits inside it.

Recorded, not fixed here. Widening the visual gate's scope is a change to a shared pre-commit gate
that every block passes through, which by Rule 7 wants its own design gate rather than being a
side effect of a grid-dots fix. This report exists because the change warranted one on its merits,
not because a gate asked for it — which is precisely the situation the blind spot creates, and the
reason it should not stay open.
