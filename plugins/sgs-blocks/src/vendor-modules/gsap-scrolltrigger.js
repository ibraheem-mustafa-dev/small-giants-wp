/**
 * Tier G vendor module — GSAP ScrollTrigger plugin.
 *
 * Spec 38 §4.4 (D409). Built as a standalone ES module and registered in PHP as
 * `@sgs/gsap-scrolltrigger`, so it loads ONLY on pages carrying a scroll-driven
 * Tier G effect (pin+scrub, element scrub, horizontal panel).
 *
 * ⚠ ScrollTrigger does NOT import GSAP core (verified against gsap 3.15.0 —
 * its only import is `./Observer.js`). It resolves core at runtime through the
 * global `window.gsap` (`ScrollTrigger.js:81`), and self-registers at
 * `ScrollTrigger.js:2702` ONLY if that global exists. In an ES-module build it
 * does not, so that self-registration is a silent no-op: the provider MUST call
 * `gsap.registerPlugin( ScrollTrigger )` explicitly. Without it the plugin is
 * loaded but inert, warning at most once to the console.
 *
 * @package SGS\Blocks
 */

export { ScrollTrigger, default } from 'gsap/ScrollTrigger';
