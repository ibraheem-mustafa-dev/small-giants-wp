# multi-button — visual-diff report (2026-08-06)

```
verdict: PASS
first_paint_capture_passed: true
```

**Block:** `sgs/multi-button`
**Date:** 2026-08-06
**Change:** Spec 35 Step 0.2 #1 — **Phase B** of the attribute rename. Both canary posts migrated,
then the six legacy declarations and the legacy fallback arm deleted.

## What changed

1. Posts **1596** and **2130** migrated off the legacy attribute names.
2. Two THEME PATTERNS migrated: `footer-centred.php:23` and `footer-simple.php:21` both still used
   the legacy `wrap`. **This was not in the recorded Phase B steps** and would have been a silent
   regression — WordPress discards any attribute a block.json does not declare (D338), so those two
   footers would have lost `flex-wrap: wrap` with no error anywhere.
3. Six legacy declarations deleted from `block.json` (`direction`/`Tablet`/`Mobile`,
   `wrap`/`Tablet`/`Mobile`), each only after asserting its modern twin exists.
4. `$sgs_mb_attr` collapsed from `( $modern, $legacy, $fallback )` to `( $modern, $fallback )`; all
   six call sites updated.

## How the login blocker was cleared

The driver logs in ONCE PER RUN, so a dry-run plus a live run meant two submissions against a
rate-limited `wp-login.php` FORM — which is what failed twice previously, not the account or the
credentials (the REST app-password path was working throughout). Fixed by doing both posts inside a
SINGLE session with one login, using a persistent Playwright profile so a manual login could have
been reused had the form still refused. It did not refuse; the window had cleared.

`updateBlockAttributes` throughout, never `replaceBlock` — the latter rebuilds from `children`, which
a rename does not carry, and would have deleted this block's `sgs/button` subtree.

## Verification

**Migration landed — checked via REST (`context=edit`), independently of the migrating script:**

| post | attrs after | legacy present | `sgs/button` children |
|---|---|---|---|
| 1596 | `{"flexWrap":"wrap","className":"sgs-multi-button"}` | no | 2 |
| 2130 | `{"gapMobile":"10px"}` | no | intact |

⚠ **Attributes that "vanished" are value-equals-default omissions, NOT data loss.** WordPress omits
an attribute from the serialised comment when its value equals the declared default, and fills it at
render. Checked against `block.json`: `gap` default `'12px'`, `flexDirection` `'row'`,
`flexDirectionMobile` `'column'` — every omitted value matches its default exactly. `flexWrap:"wrap"`
(default `'nowrap'`) and `gapMobile:"10px"` (default `'8px'`) differ and are correctly written.
Rendering is identical.

**Live render, both pages, after deploy:**

```
/f3-oracle-sgs-multi-button/      root <div class="… sgs-multi-button …">  flex-wrap: wrap
/routing-audit-clone-2026-08-02/  root <div class="… sgs-multi-button …">  flex-direction: row
```

**First-paint capture (JS DISABLED):**

```
url      : https://sandybrown-nightingale-600381.hostingersite.com/routing-audit-clone-2026-08-02/
selector : .sgs-multi-button
result   : [PASS] server-rendered and VISIBLE with JS off — 1/1 items visible
           [PASS] NO clones in server markup — 0 clones with JS off
VERDICT  : PASS — 2/2 assertions held
```

`--not-a-loop` justified: `data-sgs-loop` is emitted by exactly five blocks (buybox, gallery,
google-reviews, post-grid, trustpilot-reviews); this block has no such emit path.

**Safe-to-delete evidence, gathered BEFORE deleting the declarations:** a site-wide DB query for
`wp:sgs/multi-button` carrying `direction`/`directionMobile`/`wrap` returned only **revisions**
(historical snapshots, never rendered) — zero live posts. The two theme patterns were the only other
holders and were migrated first. `[dead-pattern-attrs] OK` post-change confirms every `sgs/*` attr in
every pattern is declared.

## Not claimed

- No screenshot pixel-diff. This attests migration correctness, live flex values, root markup and
  first paint.
- Editor-canvas behaviour not verified (standing Spec 35 gap).
