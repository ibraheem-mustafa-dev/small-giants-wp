/**
 * SGS Cart — save function.
 *
 * Returns null because this is a fully dynamic block (server-rendered via
 * render.php). WordPress serialises only the block comment delimiters and
 * attributes into post_content — no inner HTML is stored.
 *
 * @return {null}
 */
export default function Save() {
	return null;
}
