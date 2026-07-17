/**
 * save.js — sgs/separator is fully dynamic (server-rendered via render.php)
 * and has no InnerBlocks slot, so save returns null — matching the sgs/icon
 * and sgs/brand-strip pattern (dynamic blocks WITHOUT children markers).
 */
export default function Save() {
	return null;
}
