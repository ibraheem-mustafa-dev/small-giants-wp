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
 * Canvas style for a 4-side width box plus a stored style — the twin of
 * `sgs_border_box_decls()`. Empty when no side has a width or the client
 * chose `none`; unset sides render as `0`.
 *
 * @param {Object|undefined} widthBox `{ top, right, bottom, left }`.
 * @param {string|undefined} style    Stored style attribute.
 * @return {{borderStyle?: string, borderWidth?: string}} React style fragment.
 */
export function borderBoxPreview( widthBox, style ) {
	const borderWidth = boxShorthand( widthBox );
	const borderStyle = resolveBorderStyle( style );
	if ( ! borderWidth || 'none' === borderStyle ) {
		return {};
	}
	return { borderStyle, borderWidth };
}
