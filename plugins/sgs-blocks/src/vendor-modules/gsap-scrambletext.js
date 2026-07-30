/**
 * Tier G vendor module — GSAP ScrambleTextPlugin.
 *
 * Spec 38 §4.4 (D409) / FR-38-11. Registered in PHP as `@sgs/gsap-scramble`.
 *
 * Default OFF and shipped for a niche (tech/creative clients). Spec 38 §2 is
 * explicit that this is the one Tier G effect vanilla could *plausibly* reach —
 * it is Tier G because a bespoke maintained implementation is not worth it for
 * a default-OFF toy, not because the capability is unreachable.
 *
 * Under reduced motion it SUPPRESSES entirely (§10): the text renders plain and
 * the scramble never runs. Scrambling letters is precisely the kind of rapid
 * character churn that motion-sensitive visitors ask to be spared.
 *
 * ⚠ Same registration contract as every Tier G plugin — core via `window.gsap`
 * (`ScrambleTextPlugin.js:40-41`), absent in an ES-module build.
 *
 * @package SGS\Blocks
 */

export { ScrambleTextPlugin, default } from 'gsap/ScrambleTextPlugin';
