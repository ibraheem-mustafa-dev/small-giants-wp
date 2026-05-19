/**
 * Mobile Navigation block — dynamic save.
 *
 * Returns null: all frontend output (seven drawer zones) is handled by
 * render.php via Mobile_Nav_Renderer. The pre-conversion static save shape
 * is preserved in deprecated.js (v1) so WordPress can validate and migrate
 * existing stored content.
 *
 * @return {null}
 *
 * @package SGS\Blocks
 */
const save = () => null;
export default save;
