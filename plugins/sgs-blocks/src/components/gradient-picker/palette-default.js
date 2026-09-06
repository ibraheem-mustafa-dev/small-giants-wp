/**
 * SGS-only — no core equivalent.
 *
 * Builds the gradient a picker starts from when the block has NOTHING stored
 * yet. Core starts from `DEFAULT_GRADIENT`, a stock blue->purple that is
 * off-brand on every client site. This seeds from the live theme palette
 * instead, so the first thing an operator sees when they switch a colour row
 * to "Gradient" is already their own brand.
 *
 * Stops are emitted as `var(--wp--preset--color--<slug>)`, matching the shape
 * `getGradientAstWithControlPoints()` already writes for palette-linked stops
 * (`utils.js`) — so a later brand-colour change re-colours the gradient, the
 * same way every other SGS colour row behaves (D618/D619).
 *
 * This is a SEED, not a stored value: `hasGradient` stays false until the
 * operator actually touches the bar, exactly as in core. Nothing is written to
 * the block's attribute here.
 */

/**
 * Angle for the seeded gradient. Matches core's `DEFAULT_GRADIENT` so the
 * bar's geometry is unchanged — only the colours differ.
 */
const SEED_ANGLE_DEG = 135;

/**
 * A palette slug has to be safe to interpolate into a CSS custom property
 * name. Mirrors the character class `resolveStopToken()` accepts in `utils.js`
 * — a slug this rejects could never be recognised as palette-linked anyway.
 */
const SAFE_SLUG = /^[a-z0-9-]+$/i;

/**
 * Framework naming convention, not a client value: `primary` and `accent` are
 * the two slugs the SGS theme scaffold always defines, and they are the pair
 * most likely to read as a deliberate brand gradient rather than a wash. Any
 * palette missing them falls through to its own first two entries, so this
 * degrades safely on a hand-built or third-party palette.
 */
const PREFERRED_SLUGS = [ 'primary', 'accent' ];

/**
 * Build a brand-seeded gradient string from the live theme palette.
 *
 * @param {Array} palette `color.palette` from `useSettings()` — the same flat
 *                        array shape `DesignTokenPicker` reads.
 * @return {string|null} A CSS gradient string, or `null` when the palette
 *         cannot supply two distinct usable colours (caller then falls back to
 *         core's `DEFAULT_GRADIENT`).
 */
export function buildPaletteDefaultGradient( palette ) {
	if ( ! Array.isArray( palette ) ) {
		return null;
	}

	const usable = palette.filter(
		( entry ) => typeof entry?.slug === 'string' && SAFE_SLUG.test( entry.slug )
	);

	const preferred = PREFERRED_SLUGS.map( ( slug ) =>
		usable.find( ( entry ) => entry.slug === slug )
	).filter( Boolean );

	const stops = preferred.length === 2 ? preferred : usable.slice( 0, 2 );

	// Two DISTINCT stops or nothing — a gradient between a colour and itself
	// is a flat fill wearing a gradient's clothes, which would be a worse
	// starting point than core's blue->purple.
	if ( stops.length < 2 || stops[ 0 ].slug === stops[ 1 ].slug ) {
		return null;
	}

	const stopCss = stops.map(
		( entry, index ) =>
			`var(--wp--preset--color--${ entry.slug }) ${ index === 0 ? 0 : 100 }%`
	);

	return `linear-gradient(${ SEED_ANGLE_DEG }deg, ${ stopCss.join( ', ' ) })`;
}

export default buildPaletteDefaultGradient;
