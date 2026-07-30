/**
 * Tier G vendor module — GSAP DrawSVGPlugin.
 *
 * Spec 38 §4.4 (D409) / FR-38-15. Registered in PHP as `@sgs/gsap-drawsvg`.
 *
 * This module is what RETIRES Vivus (D408). Vivus was the project's evidence
 * that "no external libraries" was always an approximation — the real rule is
 * "bundle it, never CDN" — and swapping it here removes a dependency rather
 * than adding one: `sgs/responsive-logo`'s `animationStyle` enum keeps exactly
 * the same four values, so stored instances render identically and no
 * `deprecated.js` is involved (D270 forbids one).
 *
 * ⚠ Same registration contract as every Tier G plugin: core is resolved via
 * `window.gsap` (`DrawSVGPlugin.js:23-24`) and it self-registers at
 * `DrawSVGPlugin.js:313` ONLY if that global exists. It does not in an
 * ES-module build, so the provider MUST call `gsap.registerPlugin()`.
 *
 * @package SGS\Blocks
 */

export { DrawSVGPlugin, default } from 'gsap/DrawSVGPlugin';
