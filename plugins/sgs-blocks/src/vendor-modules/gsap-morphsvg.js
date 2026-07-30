/**
 * Tier G vendor module — GSAP MorphSVGPlugin.
 *
 * Spec 38 §4.4 (D409) / FR-38-16. Registered in PHP as `@sgs/gsap-morphsvg`.
 *
 * Revives parking P-10, whose deferral premise ("requires a paid Club GSAP
 * membership") died with the April 2025 Webflow acquisition. Verified against
 * the installed gsap 3.15.0 rather than assumed: this is a 38 KB real
 * implementation, not a membership-gated stub.
 *
 * The heaviest Tier G plugin by some margin, which is exactly why the inspector
 * control is ASSET-GATED (§3.4): the module is only ever enqueued for an
 * instance that already carries both matched path assets, so a page that merely
 * *could* morph pays nothing.
 *
 * ⚠ Same registration contract as every Tier G plugin — core via `window.gsap`
 * (`MorphSVGPlugin.js:22-23`), absent in an ES-module build, so the provider
 * MUST call `gsap.registerPlugin()`.
 *
 * @package SGS\Blocks
 */

export { MorphSVGPlugin, default } from 'gsap/MorphSVGPlugin';
