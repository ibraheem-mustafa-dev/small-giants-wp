/**
 * Entry point of the shared `sgs-motion-defs` editor script (built to `build/motion-defs/index.js`, registered by
 * `includes/motion/motion-defs-script.php`): publishes the motion schema extract as `window.sgsMotionDefs`, the global
 * that the `@sgs/motion-defs` external resolves to in every editor bundle (see `motion-defs.js`).
 *
 * This file imports the JSON directly; it is the one bundle that carries the extract.
 */

import defs from './generated-motion-defs.json';

window.sgsMotionDefs = defs;
