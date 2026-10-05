#!/usr/bin/env node
/**
 * Declares the per-device box settings that were missing from
 * `supports.sgs.boxFamilies`. Each one stores a `{desktop, tablet, mobile}`
 * object whose tiers are `{top, right, bottom, left}` sides (or corners) and is
 * painted as a box by its renderer: a `'box' => true` spec handed to
 * `sgs_emit_responsive_css()`, or `sgs_responsive_normalise_object( $value, true )`.
 * Without the declaration the DB row carries no box_family, so the computed
 * route and calibration treat the tier value as a scalar.
 *
 * Text-level edit so each file keeps its own formatting; the result is
 * re-parsed to prove it is still valid JSON and that every listed attribute is
 * a declared object attribute of that block.
 *
 * Usage: node scripts/codemods/add-box-families.js [--check]
 *   --check  list the declarations still missing and exit 1 (no writes).
 */
const fs = require( 'fs' );
const path = require( 'path' );

const BLOCKS_DIR = path.join( __dirname, '..', '..', 'src', 'blocks' );

// block folder -> { family: attribute }. A family is named after its attribute
// (the existing convention), except the block-level `margin` family.
const DECLARATIONS = {
	'multi-button': { childBtnBorderRadius: 'childBtnBorderRadius' },
	'nav-bar-menu': { margin: 'margin', burgerPadding: 'burgerPadding', itemBadgePadding: 'itemBadgePadding' },
	'nav-drawer-menu': { margin: 'margin', itemBadgePadding: 'itemBadgePadding' },
	'nav-drawer': { chromeRowPadding: 'chromeRowPadding', closePadding: 'closePadding' },
	'language-switch': { panelPadding: 'panelPadding' },
	'card-grid': { imagePadding: 'imagePadding' },
	cart: {
		panelHeadPadding: 'panelHeadPadding',
		panelBodyPadding: 'panelBodyPadding',
		panelFooterPadding: 'panelFooterPadding',
		panelEmptyPadding: 'panelEmptyPadding',
		emptyCtaPadding: 'emptyCtaPadding',
		freeDeliveryBarMargin: 'freeDeliveryBarMargin',
	},
	'site-footer-row': { rowShrinkPadding: 'rowShrinkPadding' },
	'site-header-row': { rowShrinkPadding: 'rowShrinkPadding' },
};

function missing( json, wanted ) {
	const declared = json?.supports?.sgs?.boxFamilies || {};
	return Object.entries( wanted ).filter(
		( [ family, attr ] ) => ! ( declared[ family ] || [] ).includes( attr )
	);
}

function indentOf( line ) {
	return line.match( /^\s*/ )[ 0 ];
}

/**
 * Insert `"family": [ "attr" ]` rows into the text. Adds to an existing
 * boxFamilies object, or opens one as the first key of supports.sgs.
 */
function addRows( text, rows ) {
	const eol = text.includes( '\r\n' ) ? '\r\n' : '\n';
	const lines = text.split( /\r?\n/ );
	const unit = text.match( /\n(\t| {2,4})"/ )?.[ 1 ] || '\t';
	const render = ( indent ) =>
		rows.map( ( [ family, attr ] ) => `${ indent }"${ family }": [ "${ attr }" ]` );

	const openIdx = lines.findIndex( ( l ) => /^\s*"boxFamilies"\s*:\s*\{\s*$/.test( l ) );
	if ( openIdx >= 0 ) {
		const base = indentOf( lines[ openIdx ] );
		let close = openIdx + 1;
		while ( close < lines.length && ! new RegExp( `^${ base }\\}` ).test( lines[ close ] ) ) {
			close++;
		}
		const last = close - 1;
		if ( ! lines[ last ].trimEnd().endsWith( ',' ) ) {
			lines[ last ] = lines[ last ].trimEnd() + ',';
		}
		const added = render( base + unit );
		added.forEach( ( row, i ) => {
			if ( i < added.length - 1 ) {
				added[ i ] = row + ',';
			}
		} );
		lines.splice( close, 0, ...added );
		return lines.join( eol );
	}
	const sgsIdx = lines.findIndex( ( l ) => /^\s*"sgs"\s*:\s*\{\s*$/.test( l ) );
	if ( sgsIdx < 0 ) {
		throw new Error( 'no multi-line supports.sgs object to add boxFamilies to' );
	}
	const keyIndent = indentOf( lines[ sgsIdx ] ) + unit;
	const added = render( keyIndent + unit ).map( ( row, i, all ) => ( i < all.length - 1 ? row + ',' : row ) );
	lines.splice( sgsIdx + 1, 0, `${ keyIndent }"boxFamilies": {`, ...added, `${ keyIndent }},` );
	return lines.join( eol );
}

const check = process.argv.includes( '--check' );
let pending = 0;
for ( const [ folder, wanted ] of Object.entries( DECLARATIONS ) ) {
	const file = path.join( BLOCKS_DIR, folder, 'block.json' );
	const text = fs.readFileSync( file, 'utf8' );
	const json = JSON.parse( text );
	for ( const attr of Object.values( wanted ) ) {
		const def = json.attributes?.[ attr ];
		if ( ! def || 'object' !== def.type ) {
			throw new Error( `${ folder }: ${ attr } is not a declared object attribute` );
		}
	}
	const rows = missing( json, wanted );
	if ( ! rows.length ) {
		continue;
	}
	pending += rows.length;
	if ( check ) {
		rows.forEach( ( [ family, attr ] ) => console.log( `${ folder }: boxFamilies.${ family } lacks ${ attr }` ) );
		continue;
	}
	const next = addRows( text, rows );
	const parsed = JSON.parse( next );
	if ( missing( parsed, wanted ).length ) {
		throw new Error( `${ folder }: edit did not land` );
	}
	fs.writeFileSync( file, next );
	console.log( `${ folder }: declared ${ rows.map( ( [ f ] ) => f ).join( ', ' ) }` );
}
if ( check && pending ) {
	process.exit( 1 );
}
console.log( check ? 'add-box-families: nothing missing' : `add-box-families: ${ pending } declaration(s) written` );
