---
doc_type: report
project: small-giants-wp
date: 2026-07-30
unit: W2-a (sgs_drawer CPT) — GATE 2 evidence
commit: bd67a641
verdict: PASS on the mechanism. Fidelity NOT claimed — awaiting Bean's eye (R-31-13).
---

# W2-a — GATE 2 evidence

Every figure below was measured live on the sandybrown canary after deploying
`bd67a641`. Where a check could have passed vacuously, the negative control that
proves it can fail is recorded next to it.

## The headline

The drawer renders from its own CPT post, opens, is styled, and **exactly one
`<dialog>`** reaches the page even when a pattern-embedded drawer is also present.
With no Active drawer set, page output is unchanged.

**What this does NOT claim:** that the drawer LOOKS right. Gate 2 asks whether the
CPT path paints what the block path painted — it does. How good the drawer looks is
W2-c (starter looks) plus the two open defects W2-g/W2-h, and it closes on Bean's
eye, not on this report.

## 1. CPT + CLI + admin

| Check | Result |
|---|---|
| `wp post-type list` | `sgs_drawer` present |
| `wp sgs drawer list` | works — zero new command logic |
| Admin screen | title "Menu drawers", Active column, "Active" post state |
| Row actions | `Preview on site`, `Set as active`/`Clear active` — all inherited |
| Submenu | "Menu drawers" under SGS |

**Negative control:** `wp sgs drawer set-active 2056` against the DRAFT post →
`Error: Publish this layout before setting it as active.` The validation path is
live, not merely present.

## 2. Non-destructive property (the reason this half could ship alone)

Homepage, pointer UNSET, before vs after the whole deploy:

| | bytes | `<dialog>` | burgers |
|---|---|---|---|
| baseline (pre-activation) | 145,375 | 0 | 7 |
| pointer cleared (post-deploy) | 145,375 | 0 | 7 |
| pointer SET to 2056 | 161,646 | 1 | 8 |

`diff` between the first two rows = **2 hunks, both non-substantive**: the CSS
cache-epoch counter in a filename (`sgs-980-…` → `sgs-984-…`, **identical content
hash** `a5f04533…`) and a LiteSpeed cache timestamp. Nothing else changed.

The +1 burger in the active row is the drawer's OWN nested `sgs/nav-menu`, which
emits burger markup that `nav-drawer/style.css` suppresses inside the drawer —
pre-existing behaviour, not introduced here.

## 3. The landmark guard — PROVEN LOAD-BEARING, not assumed

Mixed-state pages (a content-embedded drawer AND an Active CPT drawer):

| Page | guard ENABLED | guard DISABLED (negative control) |
|---|---|---|
| `poc-drawer-centred-statement` | **1** `<dialog id="sgs-nav-drawer">` | **2** |
| `poc-drawer-floating-capped-card` | **1** | **2** |

The negative control commented out the `mark_served()` call on the deployed
`render.php`, reset OPcache, re-fetched, then restored and re-verified (back to 1).
**Two dialogs sharing one id is exactly the defect council BLOCKER 3 predicted** —
so the guard is doing real work, and "1 dialog" is not a run that measured nothing.

> **A caught near-miss worth keeping.** The first `sed` that was supposed to disable
> the call **silently did not match** (the line begins with a backslash before
> `SGS`). Had the patched line not been re-read, the negative control would have
> measured the UNCHANGED file, returned 1, and been written up as "the guard is
> load-bearing" on no evidence at all. Re-read the patched line, not the exit code.

## 4. Ordering — proven, not assumed

The design claim was that `wp_footer` priority 5 is early enough for the drawer's
scoped CSS. Measured:

- The drawer's uid-scoped rules (`.sgs-nav-drawer-dc780e18…`) are **present in the
  head stylesheet** `uploads/sgs-css/sgs-981-….css`, generated during `wp_footer`.
- The block's own `style-index.css` is enqueued (`sgs-nav-drawer-style-css`).
- Its `viewScriptModule` is enqueued (`sgs-nav-drawer-view-script-module-js-module`).

Mechanism: the CSS registry opens ONE whole-page output buffer at
`template_redirect` 0 and injects into the already-printed `<head>` when that buffer
closes — after all of `wp_footer`.

## 5. Open-state computed parity (rule 4a — text-keyed, never position)

`extract-css-diff.js --scope 'dialog.sgs-nav-drawer' --open '.sgs-nav-menu__burger'`,
pre-CPT block-path page (2058) vs CPT-path homepage.

- **375px — ✅ No property mismatches**, both sides guard-verified OPEN.
- **1440px / 768px — no open state exists.** The burger is CSS-hidden at or above
  `collapsePoint` (768), so it cannot be clicked — by a probe or by a user. This is
  correct product behaviour, **not** a parity failure and **not** a parity pass.
  Reported as absence of a measurable state.

**Attribute identity, independently:** both renders produced uid
`sgs-nav-drawer-dc780e18`. The uid is `md5(wp_json_encode($attributes) . $anchor)`,
so an identical uid proves the two paths received byte-identical attributes.

**Negative control on the parity run itself:** same command with `--open` omitted →
**exit 3, VACUOUS** — *"`<dialog>` has no open property — it is CLOSED; rendered box
is 0x0; computed display:none; contains 0 visible focusable elements"*. It refuses
to report "identical" from two closed dialogs.

## 6. Editor surface (D388)

| Check | Result |
|---|---|
| New Menu drawer → native "Choose a pattern" modal | fires, offers exactly the 2 drawer starters |
| Chosen starter's CHILD TREE (D377 — metadata is not verification) | `sgs/nav-drawer` › `sgs/nav-menu {ref:0}` + `sgs/responsive-logo {width:140, linkToHome:true}` |
| Console errors | **0** across drawer-new, drawer-list and header-CPT editors |

**Council fix (iv) — the notice that would have started lying.** Header CPT 1570
holds a burger and ZERO drawer blocks. That is the normal state once the panel is
site-wide, and the unamended FR-36-9a warning would have called every working burger
broken.

| Active pointer | `window.sgsBlocksData.activeDrawer` | Notice shown |
|---|---|---|
| 2056 (set) | `{id:2056, title:…, ref:"sgs-nav-drawer", editUrl:…}` | **info** — "This burger opens your site-wide menu panel … it will not appear in the editor here" + *Edit the menu panel* |
| cleared | `null` | **warning** — "there is no menu panel for it to open" + *Add the menu panel* |

The second row is the negative control: the info notice is state-driven, not a
blanket suppression of a real alarm.

## 7. Live open-drawer probe at 390px

`open` attribute present · `display:block` · box **340×767** · **18** focusable
elements · real link text · logo present · **exactly 1** dialog.
Screenshot: `reports/visual-diff/w2a-cpt-drawer-open-390.png`.

## Residuals found while running this gate

> **Both were FIXED the same session (`29f732a8`), not parked.** The two `→ parking` pointers
> below were accurate when this report was written at `779a2beb`; the entries now live in
> `memory/parking-archive.md` as RESOLVED. Left in place because this is a dated point-in-time
> evidence artefact — do not chase them into `parking.md` and conclude they were lost.

1. **`extract-css-diff.js` exits 0 when a trigger cannot be clicked.** The report
   text says *"This is NOT a pass"*, but the process still returns 0 — only the
   VACUOUS path sets exit 3. Two of three tiers measured nothing and the run looked
   green. This is the same class of defect W2-i existed to remove. → parking
   `P-EXTRACT-CSS-DIFF-UNOPENABLE-TRIGGER-EXITS-0`.
2. **Visual-diff commit gate has no path for a markup-neutral block change.** Its
   own message offers `--no-verify`, which discards every other gate in the same
   run. → parking `P-VISUAL-DIFF-GATE-NO-MARKUP-NEUTRAL-PATH`.

## Canary state left behind

- `sgs_drawer` **2056** "SGS Framework Menu Drawer — Default" — published, **ACTIVE**.
- Page **2058** `/w2a-gate2-precpt-drawer/` — the pre-CPT parity subject; keep for
  W2-b/W2-d re-runs.
- One unsaved new-drawer draft may exist from the starter-picker check (never saved).
