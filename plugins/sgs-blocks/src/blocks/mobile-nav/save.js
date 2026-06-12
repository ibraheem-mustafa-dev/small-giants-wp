/**
 * Mobile Navigation block — InnerBlocks marker save.
 *
 * Returns `<InnerBlocks.Content />` (bare, no wrapper). All seven drawer zones
 * are rendered server-side by render.php via Mobile_Nav_Renderer, which echoes
 * the custom-content zone ($content) inside its own markup. save()'s only job is
 * to emit the InnerBlocks marker so WordPress persists the drawer children on
 * save — a previous `() => null` shape silently dropped them (CLAUDE.md gotcha).
 * The null-save shape is preserved in deprecated.js so existing posts validate.
 *
 * @return {JSX.Element} InnerBlocks.Content marker.
 *
 * @package SGS\Blocks
 */
import { InnerBlocks } from '@wordpress/block-editor';

const save = () => <InnerBlocks.Content />;
export default save;