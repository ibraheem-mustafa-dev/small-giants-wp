---
doc_type: report
date: 2026-08-22
from: comment-narrative cleanup track
to: colour-golden track
status: OPEN — 11 findings, all blocking commits under plugins/sgs-blocks/
---

# Handover — 11 colour findings now blocking every commit

## Why you're getting this

The comment-cleanup track ran `/sgs-update` (Bean-authorised, after your merge to
`main`). That reseed made the DB honest about your colour work, and **two gates
started failing**. Both were passing before, not because the code was right but
because a stale snapshot was masking it.

**The reseed EXPOSED these. It did not cause them.** Evidence: the gate that now
fails reads only `block.json` files, and the reseed touched none.

**Impact: `db-consistency` fails, and its check is wired into `.githooks/pre-commit`
unconditionally for any staged file under `plugins/sgs-blocks/`. That hook has NO
bypass token. Nobody can commit anything in the plugin until these are closed.**

Nothing here has been fixed or baselined. Baselining was deliberately rejected —
the baseline file stores only keys, no reasons, so a future session would see a
green gate over three known clone-misrouting defects.

---

## ⚠ Read this before you act — the gate tells you the WRONG fix

`db-consistency` says, for each undeclared paint:

> Fix: Declare the element in block.json `supports.sgs.elements.<el>.attrMap`
> (add `"css:border-color": "borderColourHover"`)

**Do not do that.** `sgs/quote` and `sgs/text` each declare **both** `borderColour`
AND `borderColourHover`. They would collide on the single `css:border-color` key.

The correct mechanism is a **`states.hover` block**, which the manifest already
supports (`check-element-manifest-conformance.js:306` `resolveStateMember`). Verified
census: **0 of 83 blocks put a hover attr in a base `attrMap`; 16 use `states.hover`.**

Copy the shape from `card-grid/item`, which is already conformant:

```json
"states": {
  "hover": {
    "attrMap": {
      "css:background-color": "backgroundColourHover",
      "css:border-color": "borderColourHover",
      "css:border-color-gradient": "borderColourHoverGradient",
      "css:box-shadow": "shadowHover"
    }
  }
}
```

---

## Group A — element-manifest orphans (7)

`check-element-manifest-conformance --check` → `orphan_style_defect=7` vs baseline 0.
Each attribute is wired to its block but claimed by no declared cluster member.

| Block | Attributes |
|---|---|
| `sgs/container` | `gridItemBackgroundGradient`, `gridItemBackgroundHoverGradient`, `gridItemTextColourHoverGradient` |
| `sgs/cta-section` | `gridItemBackgroundGradient`, `gridItemBackgroundHoverGradient`, `gridItemTextColourHoverGradient` |
| `sgs/process-steps` | `numberBackgroundGradient` |

Both `container` and `cta-section` already have a `grid-item` element with a
`states.hover` block (currently holding only `gridItemBorderGradientHover`), so these
have an obvious home. `process-steps` needs checking.

Reproduce: `node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js --check`

---

## Group B — reseed-survival defects (4)

`python plugins/sgs-blocks/scripts/db-consistency/run.py --report`

### B1 · `sgs/nav-menu.navBg` — rogue seed
Has `css_property='background-color'` in the DB but is declared in **neither** the
classifier layer nor `ATTR_CLASSIFICATION_OVERRIDES`. It would vanish on the next reseed.

**The useful detail:** its own sibling IS declared. Measured in
`scripts/behavioural-analyser/css-property-classifications.json`:

| Attribute | In classifier file? |
|---|---|
| `navBg` | ❌ **No** |
| `navBgHover` | ✅ Yes |
| `underlineColour` | ✅ Yes |

So the extractor caught the hover variant and missed the base. That asymmetry is the
bug — likely worth checking whether other base/hover pairs have the same hole.

Paint site: `nav-menu/render.php:853` → `$uid_sel . '{' . $nav_decls . '}'`, where
`$uid_sel = '.' . $uid` (`render.php:644`) — the block ROOT, i.e. the `wrapper` element.

Fix: re-run `extract-signatures.py` so the classifier declares it, or add an override.

### B2 · `sgs/quote.borderColourHover` — undeclared sub-element paint · SAFE TO FIX
Paints `border-color` but resolved `css_element=NULL` and `derived_selector=NULL`, so it
fell to the root routing domain and **would misroute on a clone**.

Code is correct — `quote/render.php:345-352` emits to
`{$root_sel}:hover,{$root_sel}:focus-within` with a proper guard.

Fix: add `states.hover.attrMap` `{"css:border-color": "borderColourHover"}` to the
`box` element. Clean, evidence-backed, no code change needed.

### B3 · `sgs/text.borderColourHover` — same defect · SAFE TO FIX
Paints `border-color` on the root `$scope` (`text/render.php:522-523`).
Fix: `states.hover` on the `text` element. **But read B4 first — same code block.**

### B4 · `sgs/text.firstLetterColourHover` — ⛔ BLOCKED ON A REAL CODE BUG
**Do not declare this one until the code is decided.** Two problems:

**(a) It is a DEAD CONTROL.** `text/render.php:519-524` sits *inside*
`if ( $hover_decls )` on line 516 — note the zero indentation against its
doubly-indented neighbours, which is how it was pasted in:

```
 516|	if ( $hover_decls ) {
 517|		// Operator-supplied duration + easing replace the hardcoded 200ms/ease.
 518|		$css_hover  = $scope . '{transition:color ...}';
 519|if ( '' !== ( $attributes['firstLetterColourHover'] ?? '' ) ) {
 520|	$hover_decls[] = 'color:' . sgs_colour_value( $attributes['firstLetterColourHover'] );
 521|}
 522|if ( '' !== ( $attributes['borderColourHover'] ?? '' ) ) {
 523|	$hover_decls[] = 'border-color:' . sgs_colour_value( $attributes['borderColourHover'] );
 524|}
 525|		$css_hover .= $scope . ':hover,' . $scope . ':focus-visible{' . implode( ';', $hover_decls ) . '}';
```

Both attributes only take effect if `$hover_decls` is **already** non-empty from some
other hover setting. A client who sets ONLY the first-letter hover colour, or ONLY the
border hover colour, gets nothing. That is the Spec 35 failure mode — a control that
needs code to mean anything is not done.

**(b) It paints the wrong element.** It appends `color:` to the ROOT rule
(`$scope:hover`), not to `::first-letter`. When it does fire it recolours the entire
text block rather than the drop cap.

So it cannot be declared honestly anywhere: `first-letter` would be false (the code
doesn't paint there), and `css:color` on `text` collides with `textColourHover`.

**Suggested order:** fix the indentation + the selector as its own executable commit,
then declare the manifest against corrected behaviour.

---

## Bonus — a comment contradicting its own code (`sgs/text`)

Found by a cleanup agent, reported not fixed. `text/render.php` states at ~line 311 that
the scope selector is class-level and "never an ID" (D303) — which the code confirms
(`$scope = '.wp-block-sgs-text.' . esc_attr($anchor)`). But a later comment at ~line 549
says "the base value now lives in the `#uid` rule", an ID-selector reference that
contradicts both the code and the D303 comment in the same file.

---

## How to verify you're done

```bash
node plugins/sgs-blocks/scripts/check-element-manifest-conformance.js --check   # orphan_style_defect must be 0
python plugins/sgs-blocks/scripts/db-consistency/run.py --check                 # 0 NEW violations
```

⛔ Run these with `--check`. Several of these scripts exit 0 without it and 1 with it,
and don't read the exit code through a pipe — `tail` will mask it (that bit us today).

⛔ Do not `--update-baseline`. Three of the four are live clone-misrouting defects.

---

## What the cleanup track already did (no action needed from you)

- `ec8166e9` — 23 files of comment-narrative trim, on `origin/main`
- 47 further files trimmed, **uncommitted**, waiting on this gate
- `/sgs-update` reseed + `attr-role-map.json` regenerate (3,013 → 3,049 rows), **uncommitted**
- `generated-fx-qualifying-blocks.php` deleted + generator stopped emitting it (Spec 38), **uncommitted**

The uncommitted work is comment-only or generator-only and is provably disjoint from
your block.json files — it is blocked purely by the shared pre-commit hook.
