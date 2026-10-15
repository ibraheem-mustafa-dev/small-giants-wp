/**
 * The motion schema extract for the editor (Spec 38A): the `$defs`, `x-sgs-tokens`, `x-sgs-channels`, `x-sgs-writes`,
 * `x-sgs-effects`, `x-sgs-refusals`, `x-sgs-layer-labels`, `x-sgs-panels` and the root node (`type`, `properties`,
 * `required`, `additionalProperties`) of `schemas/motion.schema.json`, as written by `scripts/generate-motion-editor-defs.py` into `generated-motion-defs.json`.
 *
 * This is the only module that imports the `@sgs/motion-defs` id. In the webpack build that id is an external
 * (`webpack.config.js`, the script config's dependency-extraction plugin): it resolves to the `window.sgsMotionDefs`
 * global and adds the `sgs-motion-defs` script handle to the importing bundle's `index.asset.php`, so the extract ships
 * once, in `build/motion-defs/index.js`, instead of inside every block's editor bundle. PHP registers that handle in
 * `includes/motion/motion-defs-script.php`. In Jest, `jest.config.js` maps the id straight to the JSON file.
 *
 * Every editor module that reads the extract (`field-types.js`, `TriggerPicker.js`, `StaggerHelper.js`) imports this
 * module, never the id or the JSON; so does the editor-canvas emitter (`src/blocks/extensions/motion/canvas/`).
 */

// eslint-disable-next-line import/no-unresolved -- a webpack external (window.sgsMotionDefs), mapped to the JSON in jest.config.js.
import defs from '@sgs/motion-defs';

export default defs;
