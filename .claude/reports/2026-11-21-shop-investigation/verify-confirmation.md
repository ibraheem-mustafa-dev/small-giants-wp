# Confirmation findings: fact-check verdict (2026-11-21 night)

Checked by an independent read-only checker against main `4a95a195e` and the lab; saved by the main session (the checker could not write). Lightly shortened. Nothing merged since noon fixes any finding.

Counts: 7 confirmed, 4 corrected, 0 wrong, 0 unverifiable.

- confirmation-1: corrected. Holds: Mama's `intake.json` last committed by `7b0290ad1` (2026-11-16), before `22a7e34ff` (2026-11-19, `lib/intake-skeletons.mjs::surfaceRoots`); its 30 skeletons have no S-32; the manifest dry run prints `no-intake-surface template-order-confirmation: no intake skeleton has the id S-32`; the rebuild says "every stage ran and passed", exit=0; the 1,028-byte tree shows "Order received". Wrong mechanism: today's `lib/manifest-build.mjs::buildManifest` makes a page-shell copy only when no handoff record matches, and S-32 does match; with `--apply` today's code writes a `fill` copy. The `copy: {from:"page", unplayed}` entry is a stale October `surfaces.json` row (`1888f67b1`, restored by `0ea1a6cb2`) never re-applied. Fix (b) misplaced: the silent pass comes from `lib/clone-surface.mjs::finaliserVerdict`, which returns ok ("no skeleton of its own (a copy reads no draft)") for ANY surface without `intakeSurface`; `buildManifest` already lists the gap as `noIntake` and `manifest.mjs` only prints it. Fix (a) stands: intake, then `manifest --apply`.
- confirmation-2: confirmed (the account eyebrow chooses fixed words by `createAccount`; Eye Care's `doneNote`/`doneAccountNote` as quoted; order Show-to rules are only owner, guest, has-gift, no-gift, viewable, not-viewable).
- confirmation-3: confirmed ("EC-10482" appears exactly twice: the h1 and `placeOrder`'s `const order = {id:'EC-10482', …}`, stored via `placed:[order].concat(s0.placed)`).
- confirmation-4: confirmed (`template-pieces.json` order-confirmation has only `order-number` and `order-items`; nothing places `order-confirmation-status`; hand-finished page: 1 status block, 7 `order-viewable`, 2 `order-not-viewable`). Judged on the 2026-11-19 build.
- confirmation-5: confirmed (`lib/skeleton-data-branches.mjs` excludes `this.state` tests).
- confirmation-6: confirmed; Bean's choice. `Order_Binding::fact_value` answers only through `apply_filters('sgs_order_fact')`; nothing adds it but a test; no site-info key, Customizer setting or attribute lets a site supply it without code. Nuance: `delivery_method` binds the shipping method's admin-editable title, which could carry arrival wording, not a per-order bake date. `sgs/heading` has no early return on empty content (`sgs/text` does); that fix changes every site's empty-heading render and needs its pages listed.
- confirmation-7: confirmed (no part-look surface names order-items; the hand-finished block has 20 look attributes; totals border and padding, total font family and size, row padding and align are missing from `block.json`'s 52 attributes; `rowBorder*` is the row divider).
- confirmation-8: corrected: two causes. The ✓ badge, ✦ pill and ✓ ✦ → step discs are `sgs/text`; the "With you" disc is already an `sgs/icon` with `brandName:"♥"` (an emoji written into `brandName`, likely the star); the kitchen ← disc is an `sgs/heading`.
- confirmation-9: corrected: four cards are partial links, not three (all five draft cards are `<a>`; the route gives `sgsBlockLink` to the Instagram card only; the kitchen card has none).
- confirmation-10: confirmed, minor (editor shows '1234'; no `fact:` keys in the field list).
- confirmation-11: confirmed, minor, latent.

## Merges

confirmation-2 (Eye Care half), 3 (option B) and 5 share one cause: the order reader does not treat state written by the draft's order action (`placeOrder`: `placed`, `lastOrder`) as the order; one reader change. confirmation-8 hides two causes. confirmation-1 merges two stale inputs (the intake record and the October `surfaces.json` row).

## New, unchecked

`lib/clone-surface.mjs::finaliserVerdict` passes any surface lacking `intakeSurface`, so a fill template copy with no skeleton also passes finalise (a check that looks green comparing nothing).
