/**
 * Tier G vendor module — GSAP MotionPathPlugin.
 *
 * Spec 38 §4.4 (D409) / FR-38-17. Registered in PHP as `@sgs/gsap-motionpath`.
 *
 * Tier G owns ONLY the scroll-scrubbed case. Autonomous looping travel along a
 * path is Tier V (CSS `offset-path`/`offset-distance`, well supported) and must
 * stay there — the doctrine is a ratchet toward the cheap tier (§1.3). This
 * module is therefore enqueued only when path progress is mapped to scroll,
 * which is also why its `fx_effects` row pairs it with ScrollTrigger.
 *
 * ⚠ Same registration contract as every Tier G plugin: core via `window.gsap`
 * (`MotionPathPlugin.js:23-24`), self-registering at `MotionPathPlugin.js:368`
 * only if that global exists, and warning "Please
 * gsap.registerPlugin(MotionPathPlugin)" at line 233 when it does not.
 *
 * @package SGS\Blocks
 */

export { MotionPathPlugin, default } from 'gsap/MotionPathPlugin';
