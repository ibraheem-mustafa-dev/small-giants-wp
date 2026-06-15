/**
 * Save for SGS Team Member — pure typed leaf, no InnerBlocks.
 *
 * Social links are driven by the socialLinks scalar attribute; all
 * rendering is server-side via render.php. Returning null is correct
 * for fully dynamic blocks — WordPress serialises only the block comment
 * (with attributes) into post_content.
 */
export default () => null;