/**
 * Post Grid — dynamic block, server renders all output via render.php.
 *
 * save() returns null so WordPress knows not to serialise any markup.
 * All output is produced by Post_Grid_REST::render_card() called from render.php.
 */
export default function save() {
	return null;
}
