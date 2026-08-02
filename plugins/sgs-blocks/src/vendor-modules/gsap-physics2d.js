/**
 * Tier G vendor module — GSAP Physics2DPlugin.
 *
 * Spec 38 §4.4 (D409) / FR-38-27. Registered in PHP as `@sgs/gsap-physics2d`.
 * Sole consumer today: `sgs/physics-canvas` (`src/blocks/physics-canvas/
 * view.js` + `physics-body.js`) — the ONE named exception to FR-38-14's
 * "physics are an easing flavour, never a standalone toggle" rule (D447).
 *
 * ⚠ Same registration contract as every other Tier G plugin: it resolves
 * core through `window.gsap`, which does not exist in an ES-module build, so
 * the provider MUST `gsap.registerPlugin( Physics2DPlugin )`. Without it the
 * plugin loads and sits inert.
 *
 * @package
 */

export { Physics2DPlugin, default } from 'gsap/Physics2DPlugin';
