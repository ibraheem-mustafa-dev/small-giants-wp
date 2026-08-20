/**
 * Tier G vendor module — GSAP Flip plugin.
 *
 * Spec 38 §4.4 (D409) / FR-38-12 (redirected to WooCommerce Product Collection,
 * `.claude/plans/2026-08-20-flip-woocommerce-product-collection-design-gate.md`).
 * Built as a standalone ES module and registered in PHP as `@sgs/gsap-flip`, so
 * it loads ONLY on pages carrying an element with `data-sgs-fx="flip"`.
 *
 * Flip does NOT import GSAP core (same shape as ScrollTrigger/SplitText —
 * verified against gsap 3.15.0). It resolves core at runtime through the
 * global `window.gsap` and self-registers only if that global exists, which it
 * never does in an ES-module build — so the provider MUST call
 * `gsap.registerPlugin( Flip )` explicitly (`fx-flip.js` does this, mirroring
 * every other effect module's `tierG( Plugin )` call).
 *
 * @package SGS\Blocks
 */

export { Flip, default } from 'gsap/Flip';
