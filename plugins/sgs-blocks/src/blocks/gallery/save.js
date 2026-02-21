/**
 * SGS Image Gallery — dynamic block, server renders all output via render.php.
 *
 * save() returns null so WordPress knows not to serialise any markup.
 * All output is produced by render.php which uses wp_get_attachment_image()
 * and escapes every value before output.
 */
export default function save() {
	return null;
}
