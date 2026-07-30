/**
 * Tier G vendor module — GSAP InertiaPlugin (momentum on drag release).
 *
 * Spec 38 §4.4 (D409) / FR-38-13. Registered in PHP as `@sgs/gsap-inertia`.
 *
 * Split from `@sgs/gsap-draggable` deliberately. Draggable works perfectly
 * without it — `inertia: true` is simply ignored when the plugin is absent —
 * and Spec 38 §10 requires momentum to be OFF under reduced motion while drag
 * itself keeps working (drag is user-driven input, not autonomous motion). A
 * combined module would make the reduced-motion visitor download physics code
 * that must never run.
 *
 * ⚠ Same registration contract as every other Tier G plugin: it resolves core
 * through `window.gsap` (`InertiaPlugin.js:28-29`), which does not exist in an
 * ES-module build, so the provider MUST `gsap.registerPlugin( InertiaPlugin )`.
 * Once registered it registers its own `VelocityTracker` helper
 * (`InertiaPlugin.js:348`) — that is internal and needs no module of its own.
 *
 * @package SGS\Blocks
 */

export { InertiaPlugin, default } from 'gsap/InertiaPlugin';
