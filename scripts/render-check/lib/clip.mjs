// The crop of a round-two probe picture: the element's box padded by 16px and cut to the viewport, or null when the
// element has no size or no part of it lies in the viewport (an open menu or drawer locks the page's scroll, so an
// element further down never scrolls into view). Playwright refuses a crop outside the viewport.
const PAD = 16;

export function probeClip( box, view ) {
	if ( ! box || box.width <= 0 || box.height <= 0 ) {
		return null;
	}
	const x = Math.max( 0, box.x - PAD );
	const y = Math.max( 0, box.y - PAD );
	const right = Math.min( view.width, box.x + box.width + PAD );
	const bottom = Math.min( view.height, box.y + box.height + PAD );
	if ( right - x < 1 || bottom - y < 1 ) {
		return null;
	}
	return { x, y, width: right - x, height: bottom - y };
}
