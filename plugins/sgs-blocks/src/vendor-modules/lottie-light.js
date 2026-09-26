/**
 * Tier H vendor module — the Lottie player (U-17, design §3.3).
 *
 * Re-exports `lottie-web/build/player/lottie_light.min.js` specifically —
 * NOT the package's ESM entry (`lottie-web/build/player/lottie_light.js` /
 * `esm/lottie_light.js`), which ships unminified at roughly 72 KB. The
 * `.min.js` build is a plain UMD/CJS bundle with no ES exports, so it is
 * imported for its side effect (it assigns to `module.exports`) and the CJS
 * default is re-exported here as both the default and the named `lottie`
 * export, matching the shape `src/shared/effects/lottie-adapter.js` expects.
 *
 * The externals rule in `webpack.config.js` deliberately does NOT apply
 * inside `src/vendor-modules/` — these shims are the modules everything else
 * externalises TO, so this one file bundles the player itself. PHP registers
 * the build output as `@sgs/lottie-web` (`includes/class-sgs-motion-registry.php::MODULES`).
 *
 * SVG renderer only (`renderer: 'svg'`, set by the adapter) — the light
 * build supports canvas too, but SVG is what the design settled on for
 * crisp output at any size with no extra canvas-resize handling.
 *
 * @package SGS\Blocks
 */

// eslint-disable-next-line import/no-unresolved -- CJS/UMD build, no .d.ts export map entry.
import lottie from 'lottie-web/build/player/lottie_light.min.js';

export { lottie };
export default lottie;
