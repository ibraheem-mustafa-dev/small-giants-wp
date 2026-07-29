/**
 * Tier G vendor module — GSAP SplitText plugin.
 *
 * Spec 38 §4.4 (D409) + FR-38-10. Built as a standalone ES module and
 * registered in PHP as `@sgs/gsap-splittext`, so it loads ONLY on pages
 * carrying a SplitText reveal.
 *
 * ⚠ SplitText imports NOTHING (verified against gsap 3.15.0) and reaches GSAP
 * core through the global `window.gsap` (`SplitText.js:9`, `:319`). In an
 * ES-module build there is no such global, so the provider MUST call
 * `gsap.registerPlugin( SplitText )` explicitly or every split silently
 * no-ops.
 *
 * Accessibility (FR-38-10, non-negotiable): the 2025 rewrite's `aria` mode
 * keeps the split parent readable to screen readers. A split that breaks the
 * accessibility tree is a defect, not a setting — the provider passes the
 * aria-preserving options, never the raw defaults.
 *
 * @package SGS\Blocks
 */

export { SplitText, default } from 'gsap/SplitText';
