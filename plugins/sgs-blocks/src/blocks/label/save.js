/**
 * Label block — dynamic save.
 *
 * Returns null: all frontend output is handled by render.php. No deprecated.js
 * (plugin-wide no-deprecations policy, D270) — pre-existing stored instances
 * are re-cloned or recovered via the Site Editor's "Attempt Block Recovery".
 *
 * @return {null}
 */
const Save = () => null;
export default Save;
