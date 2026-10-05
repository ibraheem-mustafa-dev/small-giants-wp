/**
 * Editor-canvas mirrors of sgs/container layout values the shared layout
 * preview does not cover, each at the previewed device tier:
 *
 *  - the intrinsic column track sgs/container opts into
 *    (`supports.sgs.intrinsicColumns`): the column count is a ceiling that
 *    degrades with available width, floored at the "Minimum column width"
 *    (twin of sgs_intrinsic_columns_track() + sgs_container_tier_min_column_width());
 *  - grid rows (`gridTemplateRows`);
 *  - the content band's margin (`contentBandMargin`).
 *
 * @package SGS\Blocks
 */

import { tierValueOf, resolveBoxTierPreview } from '../../utils';

const UNITS = [ 'px', 'em', 'rem' ];

const isBlank = ( v ) => undefined === v || null === v || '' === String( v ).trim();

/**
 * Twin of sgs_intrinsic_columns_track().
 *
 * @param {number} count Column count ceiling.
 * @param {string} gap   Gap CSS value ('' for none).
 * @param {string} basis Minimum column width CSS value ('' for the default).
 * @return {string} Grid track list, '' for no columns.
 */
export function intrinsicColumnsTrack( count, gap, basis ) {
	const n = Math.abs( parseInt( count, 10 ) ) || 0;
	if ( n < 1 ) {
		return '';
	}
	if ( 1 === n ) {
		return 'repeat(1,1fr)';
	}
	const g = isBlank( gap ) ? '0px' : gap;
	const b = isBlank( basis ) ? 'var(--sgs-col-basis,16rem)' : basis;
	const max = `calc((100% - (${ n - 1 } * ${ g })) / ${ n })`;
	return `repeat(auto-fit,minmax(min(100%,max(${ b },${ max })),1fr))`;
}

/**
 * The column track painting at `tier`: an authored track list wins; otherwise
 * the intrinsic track for the tier's column count.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @param {string} gap        The tier's gap CSS value.
 * @return {string|undefined} Track list, undefined when an authored list applies.
 */
export function containerColumnsPreview( attributes, tier, gap ) {
	if ( ! isBlank( tierValueOf( attributes.gridTemplateColumns, tier ) ) ) {
		return undefined;
	}
	const width = tierValueOf( attributes.minColumnWidth, tier );
	const unit = UNITS.includes( attributes.minColumnWidthUnit ) ? attributes.minColumnWidthUnit : 'px';
	const basis = isBlank( width ) ? '' : `${ Math.abs( parseInt( width, 10 ) ) || 0 }${ unit }`;
	return intrinsicColumnsTrack( tierValueOf( attributes.columns, tier ), gap, basis ) || undefined;
}

/**
 * Grid rows at `tier`.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @return {string|undefined} grid-template-rows value.
 */
export function containerRowsPreview( attributes, tier ) {
	const rows = tierValueOf( attributes.gridTemplateRows, tier );
	return isBlank( rows ) ? undefined : String( rows ).trim();
}

/**
 * The content band's margin sides at `tier`, as React style keys.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       'desktop' | 'tablet' | 'mobile'.
 * @return {Object} `{ marginTop?, marginRight?, marginBottom?, marginLeft? }`.
 */
export function bandMarginPreview( attributes, tier ) {
	const tiers = attributes.contentBandMargin && 'object' === typeof attributes.contentBandMargin ? attributes.contentBandMargin : {};
	const box = resolveBoxTierPreview( tiers.desktop, tiers.tablet, tiers.mobile, tier );
	const out = {};
	[ [ 'top', 'marginTop' ], [ 'right', 'marginRight' ], [ 'bottom', 'marginBottom' ], [ 'left', 'marginLeft' ] ].forEach( ( [ side, key ] ) => {
		if ( ! isBlank( box[ side ] ) ) {
			out[ key ] = /^\d+(\.\d+)?$/.test( String( box[ side ] ) ) ? `${ box[ side ] }px` : String( box[ side ] );
		}
	} );
	return out;
}
