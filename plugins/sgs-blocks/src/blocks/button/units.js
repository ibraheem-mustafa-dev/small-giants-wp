/**
 * sgs/button inspector length units and the number + unit helpers its UnitControls share.
 *
 * @package
 */

// UnitControl unit sets.
export const CUSTOM_WIDTH_UNITS = [
	{ value: 'px', label: 'px', default: 200 },
	{ value: '%', label: '%', default: 50 },
];

export const MIN_HEIGHT_UNITS = [
	{ value: 'px', label: 'px', default: 48 },
	{ value: 'em', label: 'em', default: 3 },
	{ value: 'rem', label: 'rem', default: 3 },
];

// '' = unitless (matches TypographyControls.js's LINE_HEIGHT_UNITS + the PHP
// helper's empty-string → unitless semantic). Re-declared locally because this
// block's lineHeight is now a tier OBJECT and can no longer go through
// TypographyControls' own (flat-scalar) line-height control.
export const LINE_HEIGHT_UNITS = [
	{ value: '', label: '—', default: 1.5 },
	{ value: 'em', label: 'em', default: 1.5 },
	{ value: 'rem', label: 'rem', default: 1.5 },
	{ value: 'px', label: 'px', default: 24 },
];

export function composeUnit( num, unit ) {
	if ( num === undefined || num === null || num === '' ) {
		return '';
	}
	return `${ num }${ unit || '' }`;
}

export function parseUnit( raw, currentUnit ) {
	if ( ! raw && raw !== 0 ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const str = String( raw ).trim();
	if ( '' === str ) {
		return { num: undefined, unit: currentUnit || 'px' };
	}
	const match = str.match( /^([\d.]+)\s*([a-z%]*)$/i );
	if ( match ) {
		const num = parseFloat( match[ 1 ] );
		const unit = match[ 2 ] || currentUnit || 'px';
		return { num: isNaN( num ) ? undefined : num, unit };
	}
	return { num: undefined, unit: currentUnit || 'px' };
}
