/**
 * Tier G vendor module — GSAP core.
 *
 * Spec 38 §4.4 (D409). GSAP is npm-bundled, NEVER a CDN reference. This shim
 * exists so webpack has an entry point to build GSAP core into ONE standalone
 * ES module, which PHP registers via `wp_register_script_module()` as
 * `@sgs/gsap`. Every consumer (the provider, each effect module) imports the
 * bare specifier `gsap`, which webpack rewrites to that module ID — so no
 * block or effect chunk ever carries its own copy.
 *
 * The externals rule in `webpack.config.js` deliberately does NOT apply inside
 * this directory: these shims are the modules everything else externalises TO,
 * so they must bundle what they re-export.
 *
 * @package SGS\Blocks
 */

export { gsap, default, CSSPlugin } from 'gsap';
