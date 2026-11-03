/**
 * Border style resolution for the editor canvas — the twin of
 * `includes/helpers-border-style.php`. Keep the two in step: if they
 * disagree, the canvas shows a different border from the published page.
 *
 * Rule: a border the client gave a width paints SOLID unless they chose
 * another style. An explicit style (dashed, dotted, none …) always wins.
 * `BorderStyleControl` writes '' when the active option is clicked again,
 * the same as WP core's style picker, and core paints that border solid.
 */
import { boxShorthand } from './spacing-preview';

export const BORDER_STYLE_KEYWORDS = Object.freeze( [
	'none',
	'solid',
	'dashed',
	'dotted',
	'double',
	'groove',
	'ridge',
	'inset',
	'outset',
] );

/**
 * Resolve a stored border-style value to the keyword a width paints with.
 *
 * @param {string|undefined} style Stored style attribute ('' when unset).
 * @return {string} An allow-listed keyword; 'solid' when unset or unknown.
 */
export function resolveBorderStyle( style ) {
	const keyword = 'string' === typeof style ? style.trim().toLowerCase() : '';
	return BORDER_STYLE_KEYWORDS.includes( keyword ) ? keyword : 'solid';
}

/**
 * The width box a device paints. A stored width is a flat `{ top, right, bottom, left }`
 * box (the desktop width) or a tier object `{ desktop, tablet, mobile }` of boxes; a
 * tablet or mobile box that is absent takes the next device up, as the published page's
 * max-width queries do (`sgs_border_element_decls()`).
 *
 * @param {Object|undefined} width Stored width: a flat box or a tier object.
 * @param {string}           [tier='desktop'] 'desktop' | 'tablet' | 'mobile'.
 * @return {Object|undefined} The box that paints on that device.
 */
export function borderWidthBoxForTier( width, tier = 'desktop' ) {
	if ( ! width || 'object' !== typeof width ) {
		return width;
	}
	const tiered = [ 'desktop', 'tablet', 'mobile' ].some( ( key ) => key in width );
	if ( ! tiered ) {
		return width;
	}
	const chain = { desktop: [ 'desktop' ], tablet: [ 'tablet', 'desktop' ], mobile: [ 'mobile', 'tablet', 'desktop' ] }[ tier ] || [ 'desktop' ];
	const key = chain.find( ( candidate ) => width[ candidate ] && 'object' === typeof width[ candidate ] && boxShorthand( width[ candidate ] ) );
	return key ? width[ key ] : undefined;
}

/**
 * Canvas style for a width plus a stored style — the twin of
 * `sgs_border_box_decls()`. Empty when no side has a width or the client
 * chose `none`; unset sides render as `0`.
 *
 * @param {Object|undefined} widthBox A flat `{ top, right, bottom, left }` box or a per-device tier object.
 * @param {string|undefined} style    Stored style attribute.
 * @param {string}           [tier='desktop'] Previewed device.
 * @return {{borderStyle?: string, borderWidth?: string}} React style fragment.
 */
export function borderBoxPreview( widthBox, style, tier = 'desktop' ) {
	const borderWidth = boxShorthand( borderWidthBoxForTier( widthBox, tier ) );
	const borderStyle = resolveBorderStyle( style );
	if ( ! borderWidth || 'none' === borderStyle ) {
		return {};
	}
	return { borderStyle, borderWidth };
}
