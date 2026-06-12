# Visual-diff — sgs/product-card shared-store island fallback (Spec 30 Step 10a, D218) — 2026-06-12

verdict: PASS
first_paint_capture_passed: true

**Change:** NON-VISUAL. `product-card/view.js` only — an additive gallery data-island fallback inside `applyPillSelection` (reads `script.sgs-buybox-galleries` from the cardRef when a seeded combo gallery has <2 images) + a `galleryIslandByRef` WeakMap. `product-card/block.json` version bump 1.16.7→1.16.8 (cache-bust for the shared view module). **No render.php / save.js / style.css / save-output change** — the product-card's rendered first paint is byte-identical.

**Validation:** The island lookup only fires when a `script.sgs-buybox-galleries` element exists inside the cardRef. Product-card cards emit NO such element (their galleries fit the context seed), so `island` stays null and the code path is skipped — identical behaviour to before (verified by reading the full git diff + cross-family haiku rater: product-card regression check PASS, purely additive/null-safe). The change exists solely so the buybox (which mounts this shared store) can swap thumbnails for all variations without the 24KB context cap.

## Result — PASS (R-22-11)
- Render output unchanged (first paint byte-identical); shared-store edit is a guarded additive no-op for product-card; `comboKey` in scope; JSON.parse try/caught + cached. No visual regression possible on product-card from this change.
