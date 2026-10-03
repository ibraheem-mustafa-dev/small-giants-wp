// The one property-to-setting engine (FR-47-1, R-47-3). Given a block, the rendered element (slot) a difference
// sits on, a CSS property, a state and the measured draft value at each width, it returns the setting writes in the
// block's storage shape, or a gap with its reason. Candidates come from the framework database (source 'sgs' only);
// calibration decides which candidate paints that slot (R-47-6); values snap to the site's tokens (R-47-7).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { candidates, siblings } from './db.mjs';
import { parseLength, toPx, pxTo, snapColour, round } from './normalise.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const BLOCKS_DIR = path.resolve( HERE, '../../../plugins/sgs-blocks/src/blocks' );

// Gap reasons (§3.1), plus `uncalibrated` (the block has no calibration file yet, so no slot is proven).
export const GAPS = [ 'no-setting', 'ambiguous', 'shape', 'uncalibrated' ];

const TIER_OF = { 375: 'mobile', 768: 'tablet', 1440: 'desktop', 1920: 'desktop' };
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const COLOUR_PROPS = [ 'color', 'background-color', 'border-color' ];

let schemaIndex = null;
// block.json attributes for a block slug, read from the plugin's block sources (not its scripts, R-47-1).
export function blockSchema( slug ) {
	if ( ! schemaIndex ) {
		schemaIndex = {};
		for ( const dir of fs.readdirSync( BLOCKS_DIR ) ) {
			const f = path.join( BLOCKS_DIR, dir, 'block.json' );
			if ( fs.existsSync( f ) ) {
				const j = JSON.parse( fs.readFileSync( f, 'utf8' ) );
				schemaIndex[ j.name ] = j.attributes || {};
			}
		}
	}
	return schemaIndex[ slug ] || null;
}

// A walker property (a longhand) as the database's property and the side of a box it writes.
export function splitProperty( prop ) {
	let m = prop.match( /^(padding|margin)-(top|right|bottom|left)$/ );
	if ( m ) {
		return { short: m[ 1 ], side: m[ 2 ] };
	}
	m = prop.match( /^border-(top|right|bottom|left)-(width|color|style)$/ );
	if ( m ) {
		return { short: `border-${ m[ 2 ] }`, side: m[ 1 ] };
	}
	if ( /^(row|column)-gap$/.test( prop ) ) {
		return { short: 'gap', side: null };
	}
	if ( 'text-decoration-line' === prop ) {
		return { short: 'text-decoration', side: null };
	}
	return { short: prop, side: null };
}

// Measured widths grouped into tiers. 1440 and 1920 are both desktop: unequal, they cannot share one setting.
export function tiersOf( perWidth, prop ) {
	const tiers = {};
	for ( const [ w, v ] of Object.entries( perWidth ) ) {
		const t = TIER_OF[ w ];
		if ( ! t ) {
			continue;
		}
		if ( t in tiers && ! sameMeasured( prop, tiers[ t ], v ) ) {
			return { error: `desktop differs between 1440 (${ tiers[ t ] }) and 1920 (${ v })` };
		}
		tiers[ t ] = v;
	}
	return { tiers };
}

const sameMeasured = ( prop, a, b ) => {
	const la = parseLength( a );
	const lb = parseLength( b );
	return la && lb ? la.unit === lb.unit && Math.abs( la.n - lb.n ) <= 0.5 : String( a ) === String( b );
};

// One measured value in the setting's form. Returns { value } or { error }.
function formatValue( { prop, raw, def, unit, fontPx, forms, prefer, snapshot, log, where } ) {
	if ( COLOUR_PROPS.includes( prop ) ) {
		const s = snapColour( raw, snapshot, { log, where, prefer } );
		if ( ! s ) {
			return { error: `colour ${ raw } not parsed` };
		}
		if ( 'slug' === s.form && forms && ! forms.includes( 'slug' ) ) {
			return { value: snapColour( raw, { palette: [] }, { log: [] } ).value };
		}
		return { value: s.value };
	}
	if ( Array.isArray( def?.enum ) ) {
		return def.enum.includes( raw ) ? { value: raw } : { error: `${ raw } is not one of ${ def.enum.join( ', ' ) }` };
	}
	if ( 'font-weight' === prop ) {
		return { value: String( raw ) };
	}
	if ( 'background-image' === prop && [].concat( def?.type || [] ).includes( 'object' ) ) {
		// An image setting holds { url }: a measured url(...) maps to it; a gradient or several layers cannot.
		const m = String( raw ).match( /^url\(["']?([^"')]+)["']?\)$/ );
		return m ? { value: { url: m[ 1 ] } } : { error: `${ raw } is not one image` };
	}
	const px = toPx( raw, fontPx );
	if ( null === px ) {
		// Keywords (none, normal, a font stack) are written as measured when the setting takes a string.
		return [].concat( def?.type || [] ).includes( 'string' ) && 'line-height' !== prop ? { value: raw } : { error: `${ raw } cannot be held` };
	}
	if ( undefined !== unit ) {
		const n = '' === unit || 'unitless' === unit ? ( 'line-height' === prop ? round( px / fontPx ) : null ) : pxTo( px, unit, fontPx );
		if ( null === n ) {
			return { error: `cannot convert ${ raw } to unit "${ unit }"` };
		}
		// A string setting beside its unit setting holds the number as text ("37").
		return { value: [].concat( def?.type || [] ).includes( 'string' ) && ! [].concat( def?.type || [] ).includes( 'number' ) ? String( n ) : n };
	}
	return { value: `${ round( px ) }px` };
}

// A setting with no css_property that calibration showed paints `prop` on `slot` (calibration.discovered): the enum
// value whose recorded effect equals the draft at every calibrated width. Ties go to the value that also matches most
// of the element's other draft properties (`siblings`: { prop: { width: value } }). Returns a write, a gap, or null.
export function resolveDiscovered( { slot, prop, perWidth, siblings = {} }, calibration ) {
	const at = ( pw, w ) => pw[ w ] ?? ( 1440 === w ? pw[ 1920 ] : undefined );
	const same = ( a, b ) => String( a ).replace( /\s+/g, '' ) === String( b ).replace( /\s+/g, '' );
	const fits = ( values, pw ) => {
		const ws = [ 375, 768, 1440 ].filter( ( w ) => undefined !== at( pw, w ) && undefined !== values[ w ] );
		return ws.length > 0 && ws.every( ( w ) => same( values[ w ], at( pw, w ) ) );
	};
	const options = [];
	for ( const [ attr, props ] of Object.entries( calibration?.discovered || {} ) ) {
		const d = props[ prop ];
		if ( ! d || ! d.slots.includes( slot ) ) {
			continue;
		}
		for ( const [ value, values ] of Object.entries( d.values ) ) {
			if ( fits( values, perWidth ) ) {
				const score = Object.entries( siblings ).filter( ( [ p2, pw ] ) => p2 !== prop && props[ p2 ]?.values[ value ] && fits( props[ p2 ].values[ value ], pw ) ).length;
				options.push( { attr, value, score } );
			}
		}
	}
	if ( ! options.length ) {
		return null;
	}
	const best = Math.max( ...options.map( ( o ) => o.score ) );
	const top = options.filter( ( o ) => o.score === best );
	if ( top.length > 1 ) {
		return { gap: 'ambiguous', detail: `${ top.map( ( o ) => `${ o.attr }=${ o.value || '(none)' }` ).join( ', ' ) } all give ${ prop } on "${ slot }"` };
	}
	return { writes: [ { attr: top[ 0 ].attr, value: top[ 0 ].value, merge: 'replace' } ] };
}

// FR-47-1. input: { block, slot, prop, state, perWidth: { width: value }, fontPx: { width: px }, current: node attrs,
// siblings: the element's other draft properties, for settings found by calibration }.
// ctx: { db, calibration: { settings: { attr: { slot, forms } } } | null, snapshot, log }.
// Returns { writes: [{ attr, value, merge: 'deep'|'replace' }] } or { gap, detail }.
// A border-radius box stores corners, never sides (helpers-box.php::sgs_border_radius_tiers reads topLeft, topRight,
// bottomLeft, bottomRight and ignores any other key), per device when the attribute's default is a tier object.
export const CORNERS = [ 'topLeft', 'topRight', 'bottomRight', 'bottomLeft' ];

// The computed border-radius shorthand ("8px", "8px 4px", …) as corners, or null for an elliptical radius.
export function radiusCorners( raw ) {
	const v = String( raw ).trim().split( /\s+/ );
	if ( ! v.length || v.length > 4 || v.some( ( x ) => '/' === x || ! parseLength( x ) ) ) {
		return null;
	}
	const [ a, b = a, c = a, d = b ] = v;
	return Object.fromEntries( CORNERS.map( ( k, i ) => [ k, [ a, b, c, d ][ i ] ] ) );
}

function radiusWrite( attr, tiers, def ) {
	const perTier = Object.fromEntries( Object.entries( tiers ).map( ( [ t, raw ] ) => [ t, radiusCorners( raw ) ] ) );
	const bad = Object.entries( perTier ).find( ( [ , c ] ) => ! c );
	if ( bad ) {
		return { gap: 'shape', detail: `${ attr } cannot hold the radius ${ tiers[ bad[ 0 ] ] }` };
	}
	if ( def?.default && 'object' === typeof def.default && 'desktop' in def.default ) {
		return { writes: [ { attr, value: perTier, merge: 'deep' } ] };
	}
	const vals = [ ...new Set( Object.values( perTier ).map( ( c ) => JSON.stringify( c ) ) ) ];
	if ( vals.length > 1 ) {
		return { gap: 'shape', detail: `${ attr } holds one radius for every width; draft has ${ vals.join( ', ' ) }` };
	}
	return { writes: [ { attr, value: JSON.parse( vals[ 0 ] ), merge: 'replace' } ] };
}

export function resolve( input, ctx ) {
	const { block, slot, prop, state = null, perWidth, fontPx = {}, current = {} } = input;
	const { short, side } = splitProperty( prop );
	const rows = [ ...candidates( ctx.db, block, short, state ), ...( short !== prop ? candidates( ctx.db, block, prop, state ) : [] ) ]
		.filter( ( r, i, all ) => all.findIndex( ( x ) => x.attr_name === r.attr_name ) === i );
	if ( ! rows.length ) {
		return ( ! state && resolveDiscovered( input, ctx.calibration ) ) || { gap: 'no-setting', detail: `${ block } has no setting for ${ prop }${ state ? ' (' + state + ')' : '' }` };
	}
	if ( ! ctx.calibration ) {
		return { gap: 'uncalibrated', detail: `${ block } has no calibration file` };
	}
	const tied = rows.filter( ( r ) => {
		const c = ctx.calibration.settings?.[ r.attr_name ];
		return c && ( c.slots || [ c.slot ] ).includes( slot ) && ( ! c.property || c.property === short || c.property === prop );
	} );
	// A state setting calibration never measured (no trigger for that state yet) is unproven, not missing.
	if ( ! tied.length && state && ! rows.some( ( r ) => ctx.calibration.settings?.[ r.attr_name ] ) ) {
		return { gap: 'uncalibrated', detail: `${ block } ${ rows.map( ( r ) => r.attr_name ).join( ', ' ) } (${ state }) not calibrated` };
	}
	if ( ! tied.length ) {
		return ( ! state && resolveDiscovered( input, ctx.calibration ) ) || { gap: 'no-setting', detail: `no ${ prop } setting on ${ block } paints "${ slot }" (candidates: ${ rows.map( ( r ) => r.attr_name ).join( ', ' ) })` };
	}
	const flat = tied.filter( ( r ) => 'flat_sibling' === r.tier_shape );
	const others = tied.filter( ( r ) => 'flat_sibling' !== r.tier_shape );
	const bases = new Set( flat.map( ( r ) => r.attr_name.replace( /(Tablet|Mobile)$/, '' ) ) );
	if ( others.length + bases.size > 1 ) {
		return { gap: 'ambiguous', detail: `${ [ ...others.map( ( r ) => r.attr_name ), ...bases ].join( ', ' ) } all paint ${ prop } on "${ slot }"` };
	}
	const { tiers, error } = tiersOf( perWidth, prop );
	if ( error ) {
		return { gap: 'shape', detail: error };
	}
	const schema = blockSchema( block ) || {};
	const row = others[ 0 ] || flat[ 0 ];
	const attr = others[ 0 ] ? row.attr_name : [ ...bases ][ 0 ];
	const unitAttr = schema[ `${ attr }Unit` ] ? `${ attr }Unit` : null;
	const unit = unitAttr ? ( current[ unitAttr ] ?? schema[ unitAttr ].default ?? 'px' ) : undefined;
	const forms = ctx.calibration.settings[ row.attr_name ]?.forms;
	const tierPx = ( t ) => fontPx[ { mobile: 375, tablet: 768, desktop: 1440 }[ t ] ] || 16;
	const fmt = ( t, raw, def ) => formatValue( { prop: short, raw, def, unit, fontPx: tierPx( t ), forms, prefer: typeof current[ attr ] === 'string' ? current[ attr ] : null,
		snapshot: ctx.snapshot, log: ctx.log || [], where: `${ block } ${ slot } ${ prop }@${ t }` } );
	if ( 'border-radius' === short && ( row.box_family || 'box_only' === row.tier_shape ) ) {
		return radiusWrite( attr, tiers, schema[ attr ] );
	}
	const out = {};
	for ( const [ t, raw ] of Object.entries( tiers ) ) {
		const def = 'flat_sibling' === row.tier_shape ? schema[ attr + ( 'desktop' === t ? '' : t[ 0 ].toUpperCase() + t.slice( 1 ) ) ] : schema[ attr ];
		const f = fmt( t, raw, def );
		if ( f.error ) {
			return { gap: 'shape', detail: f.error };
		}
		out[ t ] = f.value;
	}
	const isBox = !! row.box_family || 'box_only' === row.tier_shape;
	// A box with some sides set prints 0 for the rest (helpers-box.php::sgs_box_object_shorthand), overriding the
	// block's own stylesheet default. So the first side written into an empty box brings the other sides at their
	// calibrated default paint, and only the measured side changes.
	const seedSides = ( t, existing ) => {
		if ( ! side || ( existing && Object.keys( existing ).length ) ) {
			return {};
		}
		const paint = ctx.calibration.elements?.[ slot ]?.[ { mobile: 375, tablet: 768, desktop: 1440 }[ t ] ] || {};
		return Object.fromEntries( SIDES.filter( ( s ) => s !== side && undefined !== paint[ `${ short }-${ s }` ] ).map( ( s ) => [ s, paint[ `${ short }-${ s }` ] ] ) );
	};
	const boxed = ( v, t ) => {
		if ( ! isBox ) {
			return v;
		}
		if ( ! side ) {
			return Object.fromEntries( SIDES.map( ( s ) => [ s, v ] ) );
		}
		const existing = 'tier_object' === row.tier_shape ? current[ attr ]?.[ t ] : current[ attr ];
		return { ...seedSides( t, existing ), [ side ]: v };
	};
	const writes = [];
	if ( 'flat_sibling' === row.tier_shape ) {
		for ( const [ t, v ] of Object.entries( out ) ) {
			const name = siblings( ctx.db, block, attr ).find( ( r ) => r.css_tier === t )?.attr_name;
			if ( ! name ) {
				return { gap: 'shape', detail: `${ attr } has no ${ t } sibling` };
			}
			writes.push( { attr: name, value: v, merge: 'replace' } );
		}
	} else if ( 'tier_object' === row.tier_shape ) {
		writes.push( { attr, value: Object.fromEntries( Object.entries( out ).map( ( [ t, v ] ) => [ t, boxed( v, t ) ] ) ), merge: 'deep' } );
	} else {
		const vals = [ ...new Set( Object.values( out ).map( ( v ) => JSON.stringify( v ) ) ) ];
		if ( vals.length > 1 ) {
			return { gap: 'shape', detail: `${ attr } holds one value for every width; draft has ${ vals.join( ', ' ) }` };
		}
		writes.push( { attr, value: boxed( JSON.parse( vals[ 0 ] ), 'desktop' ), merge: isBox ? 'deep' : 'replace' } );
	}
	return { writes };
}
