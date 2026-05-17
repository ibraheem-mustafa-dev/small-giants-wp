/**
 * save.js — returns null because sgs/quote is a dynamic (server-rendered) block.
 *
 * The render.php file handles all frontend output. Returning null here means
 * WordPress stores only the block comment + JSON attributes in post_content,
 * and the server fills in the HTML on every request — so inline-style attrs
 * always reach the DOM without a save.js freeze.
 */
export default function Save() {
	return null;
}
