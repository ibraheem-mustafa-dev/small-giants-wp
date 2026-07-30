/**
 * Tier G vendor module — GSAP Draggable plugin.
 *
 * Spec 38 §4.4 (D409) / FR-38-13. Built as a standalone ES module and
 * registered in PHP as `@sgs/gsap-draggable`, so it loads ONLY on pages
 * carrying a block that opted into the drag roster.
 *
 * ⚠ Like ScrollTrigger, Draggable does NOT import GSAP core (verified against
 * gsap 3.15.0 — its only import is `./utils/matrix.js`). It resolves core at
 * runtime through the global `window.gsap` (`Draggable.js:41-42`) and warns
 * "Please gsap.registerPlugin(Draggable)" at `Draggable.js:873` when it cannot.
 * In an ES-module build that global does not exist, so the provider MUST call
 * `gsap.registerPlugin( Draggable )` explicitly. Without it the plugin is
 * loaded but inert.
 *
 * Momentum is a SEPARATE module (`@sgs/gsap-inertia`): `inertia: true` is only
 * honoured when InertiaPlugin is registered too, and a drag roster block that
 * disables momentum should not pay for it.
 *
 * @package SGS\Blocks
 */

export { Draggable, default } from 'gsap/Draggable';
