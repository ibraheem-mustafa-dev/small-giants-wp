/**
 * The effect picker thumbnails (Spec 38 §11.2, D427, D479): the surface-treatment glyphs, the morph shape-pair and
 * the motion-path route previews, each a small inline SVG drawn from the same data the render layer uses.
 *
 * @package
 */

/**
 * A surface-treatment thumbnail — a small glyph suggesting the finish.
 *
 * Drawn as a simple pattern rather than the real shader output (unlike
 * `routeThumbnail`/`shapeThumbnail`, which can draw the exact `d` the
 * runtime will use): a WebGL grain/halftone/duotone finish has no static
 * path data to preview from, only a live-rendered pixel field, so the
 * closest honest preview at 24px is an iconographic stand-in for each
 * finish rather than a false promise of pixel accuracy.
 *
 * @param {string} id Preset id — `grain` | `halftone` | `duotone`.
 * @return {Object} An SVG element.
 */
export function treatmentThumbnail( id ) {
	if ( 'halftone' === id ) {
		return (
			<svg
				viewBox="0 0 100 100"
				width="24"
				height="24"
				aria-hidden="true"
				focusable="false"
			>
				<circle cx="22" cy="22" r="13" fill="currentColor" />
				<circle cx="58" cy="22" r="9" fill="currentColor" />
				<circle cx="86" cy="24" r="5" fill="currentColor" />
				<circle cx="22" cy="58" r="9" fill="currentColor" />
				<circle cx="58" cy="58" r="6" fill="currentColor" />
				<circle cx="86" cy="60" r="3" fill="currentColor" />
				<circle cx="22" cy="86" r="5" fill="currentColor" />
				<circle cx="58" cy="86" r="3" fill="currentColor" />
			</svg>
		);
	}

	if ( 'duotone' === id ) {
		return (
			<svg
				viewBox="0 0 100 100"
				width="24"
				height="24"
				aria-hidden="true"
				focusable="false"
			>
				<rect
					x="12"
					y="12"
					width="76"
					height="76"
					fill="currentColor"
				/>
				<path
					d="M 12 12 H 88 V 88 Z"
					fill="none"
					stroke="currentColor"
					strokeOpacity="0.35"
					strokeWidth="10"
				/>
				<rect
					x="12"
					y="12"
					width="38"
					height="76"
					fill="currentColor"
					fillOpacity="0.4"
				/>
			</svg>
		);
	}

	// `grain` — scattered flecks, the default/fallback glyph.
	return (
		<svg
			viewBox="0 0 100 100"
			width="24"
			height="24"
			aria-hidden="true"
			focusable="false"
		>
			<rect
				x="10"
				y="10"
				width="80"
				height="80"
				rx="6"
				fill="none"
				stroke="currentColor"
				strokeWidth="6"
			/>
			<circle cx="27" cy="30" r="4" fill="currentColor" />
			<circle cx="52" cy="22" r="3" fill="currentColor" />
			<circle cx="72" cy="38" r="4.5" fill="currentColor" />
			<circle cx="34" cy="55" r="3" fill="currentColor" />
			<circle cx="60" cy="58" r="4" fill="currentColor" />
			<circle cx="78" cy="70" r="3" fill="currentColor" />
			<circle cx="24" cy="76" r="4" fill="currentColor" />
			<circle cx="48" cy="80" r="3" fill="currentColor" />
		</svg>
	);
}

/**
 * A shape-pair thumbnail — the FROM shape, filled small.
 *
 * Filled rather than stroked (unlike `routeThumbnail`, which draws a line):
 * a morph target is a SHAPE, not a path to travel along, so the thumbnail
 * reads the same way the render layer will actually paint it
 * (`fill: currentColor` in `assets/css/fx-morph.css`).
 *
 * @param {string|null} d Path data, or null for the custom-upload option.
 * @return {Object} An SVG element.
 */
export function shapeThumbnail( d ) {
	if ( null === d ) {
		// Custom upload: the same outline-with-arrow glyph FX_PATH_OPTIONS
		// uses, so both "upload your own" options read identically.
		return (
			<svg
				viewBox="0 0 100 100"
				width="24"
				height="24"
				aria-hidden="true"
				focusable="false"
			>
				<path
					d="M 26 16 H 62 L 80 34 V 88 H 26 Z M 53 46 V 76 M 40 59 L 53 46 L 66 59"
					fill="none"
					stroke="currentColor"
					strokeWidth="7"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		);
	}

	return (
		<svg
			viewBox="0 0 100 100"
			width="24"
			height="24"
			aria-hidden="true"
			focusable="false"
		>
			<path d={ d } fill="currentColor" stroke="none" />
		</svg>
	);
}

/**
 * A route thumbnail — the actual curve, drawn small.
 *
 * The signed D427 shape is "the client picks a THUMBNAIL", and a thumbnail of
 * a route is simply that route at 24px. Drawing it from the same `d` the render
 * layer will use means the preview cannot drift from the result.
 *
 * @param {string|null} d Path data, or null for the custom-upload option.
 * @return {Object} An SVG element.
 */
export function routeThumbnail( d ) {
	if ( null === d ) {
		// Custom upload: an outline sheet with an arrow, drawn in the same
		// stroke weight so it sits evenly beside the four route curves.
		return (
			<svg
				viewBox="0 0 100 100"
				width="24"
				height="24"
				aria-hidden="true"
				focusable="false"
			>
				<path
					d="M 26 16 H 62 L 80 34 V 88 H 26 Z M 53 46 V 76 M 40 59 L 53 46 L 66 59"
					fill="none"
					stroke="currentColor"
					strokeWidth="7"
					strokeLinecap="round"
					strokeLinejoin="round"
				/>
			</svg>
		);
	}

	return (
		<svg
			viewBox="0 0 100 100"
			width="24"
			height="24"
			aria-hidden="true"
			focusable="false"
		>
			<path
				d={ d }
				fill="none"
				stroke="currentColor"
				strokeWidth="8"
				strokeLinecap="round"
			/>
		</svg>
	);
}
