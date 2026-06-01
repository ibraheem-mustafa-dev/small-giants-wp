/**
 * SGS Option Picker — save.
 *
 * Dynamic block: all frontend output is handled by render.php.
 * save() returns null so WordPress stores only the block comment + JSON attrs.
 * No InnerBlocks — null is correct here (not InnerBlocks.Content).
 */
export default function Save() {
	return null;
}
