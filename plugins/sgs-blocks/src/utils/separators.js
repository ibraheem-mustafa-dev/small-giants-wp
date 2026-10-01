/**
 * Separators — the editor twin of `includes/helpers-separators*.php`.
 *
 * The setting is one object per list (`separators`, `submenuSeparators`, …):
 *
 *   {
 *     row:    { style, width: {desktop,tablet,mobile}, colour, colourHover },
 *     column: { style, width: {desktop,tablet,mobile}, colour, colourHover },
 *     edges:  'between' | 'all' | 'end',
 *     hoverTreatment: 'swap' | 'sweep' | 'none',
 *     sweepAngle: number
 *   }
 *
 * `row` is the line between rows (a horizontal line), `column` the line between
 * columns (a vertical line). These helpers read and patch that object, and build
 * the canvas preview for a `flow` list (native gap decorations; the runtime overlay
 * in `src/shared/separators/` covers editors without them).
 *
 * @package SGS\Blocks
 */

import { colourVar } from './tokens';
import { resolveTier } from './responsive';

export const SEPARATOR_AXES = [ 'row', 'column' ];

/**
 * One axis of the stored object, always an object.
 *
 * @param {Object} value The stored setting.
 * @param {string} axis  'row' or 'column'.
 * @return {Object} The axis (empty when unset).
 */
export function separatorAxis( value, axis ) {
	const raw = value && typeof value === 'object' ? value[ axis ] : null;
	return raw && typeof raw === 'object' ? raw : {};
}

/**
 * Whether two axes hold the same line, so the editor can show them linked.
 *
 * @param {Object} a First axis.
 * @param {Object} b Second axis.
 * @return {boolean} True when style, widths and colours all match.
 */
export function axesMatch( a, b ) {
	const tiers = ( axis ) => [ 'desktop', 'tablet', 'mobile' ].map( ( t ) => ( axis.width && axis.width[ t ] ) || '' );
	return (
		( a.style || '' ) === ( b.style || '' ) &&
		( a.colour || '' ) === ( b.colour || '' ) &&
		( a.colourHover || '' ) === ( b.colourHover || '' ) &&
		tiers( a ).join( '|' ) === tiers( b ).join( '|' )
	);
}

/**
 * The next setting after patching one axis, or both when the axes are linked.
 *
 * @param {Object}   value  The stored setting.
 * @param {string[]} axes   The axes the block offers.
 * @param {string}   axis   The axis being edited.
 * @param {Object}   patch  Fields to merge into the axis.
 * @param {boolean}  linked Whether the edit drives every offered axis.
 * @return {Object} The next setting.
 */
export function patchSeparatorAxis( value, axes, axis, patch, linked ) {
	const next = { ...( value || {} ) };
	const targets = linked ? axes : [ axis ];
	targets.forEach( ( target ) => {
		next[ target ] = { ...separatorAxis( value, linked ? axis : target ), ...patch };
	} );
	return next;
}

/**
 * The resolved thickness of an axis at a device tier ('' when it draws nothing).
 *
 * @param {Object} axis   One axis of the setting.
 * @param {string} device 'desktop' | 'tablet' | 'mobile'.
 * @return {string} A CSS length, or ''.
 */
export function separatorWidthAt( axis, device = 'desktop' ) {
	if ( ! axis || 'none' === axis.style ) {
		return '';
	}
	return String( resolveTier( axis.width || {}, device, '' ).value || '' );
}

/**
 * Canvas style for a `flow` list: native gap decorations for the active axes, plus the
 * custom properties the editor overlay reads. Spread into the list element's style.
 *
 * @param {Object} value  The stored setting.
 * @param {string} device The previewed device tier.
 * @return {Object} Style properties ({} when nothing draws).
 */
export function separatorsFlowPreview( value, device = 'desktop' ) {
	const style = {};
	SEPARATOR_AXES.forEach( ( axis ) => {
		const data = separatorAxis( value, axis );
		const width = separatorWidthAt( data, device );
		if ( width ) {
			const line = data.style && 'none' !== data.style ? data.style : 'solid';
			const colour = colourVar( data.colour ) || 'currentColor';
			style[ `${ axis }Rule` ] = `${ width } ${ line } ${ colour }`;
			// The same values as custom properties: the editor's overlay (for browsers
			// without gap decorations) reads them, exactly as the page's overlay does.
			style[ `--sgs-sep-w-${ axis }` ] = width;
			style[ `--sgs-sep-s-${ axis }` ] = line;
			style[ `--sgs-sep-c-${ axis }` ] = colour;
		}
	} );
	if ( Object.keys( style ).length ) {
		style.ruleVisibilityItems = 'between';
	}
	return style;
}
