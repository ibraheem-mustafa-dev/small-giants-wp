// The one property-to-setting engine (FR-47-1, R-47-3). Given a block, the rendered element (slot) a difference
// sits on, a CSS property, a state and the measured draft value at each width, it returns the setting writes in the
// block's storage shape, or a gap with its reason. Candidates come from the framework database (source 'sgs' only);
// calibration decides which candidate paints that slot (R-47-6); values snap to the site's tokens (R-47-7).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { candidates, siblings, isPseudoProperty } from './db.mjs';
import { parseLength, toPx, pxTo, snapColour, snapFontFamily, ratioSetting, tracksSetting, round } from './normalise.mjs';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const BLOCKS_DIR = path.resolve( HERE, '../../../plugins/sgs-blocks/src/blocks' );

// Gap reasons (§3.1), plus `uncalibrated` (the block has no calibration file yet, so no slot is proven).
export const GAPS = [ 'no-setting', 'ambiguous', 'shape', 'uncalibrated' ];

const TIER_OF = { 375: 'mobile', 768: 'tablet', 1440: 'desktop', 1920: 'desktop' };
const SIDES = [ 'top', 'right', 'bottom', 'left' ];
const COLOUR_PROPS = [ 'color', 'background-color', 'border-color' ];
const TIME_PROPS = [ 'transition-duration', 'transition-delay', 'animation-duration', 'animation-delay' ];

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

// A path with its :nth-of-type steps dropped: an enclosing block's calibration fixture repeats the child at other
// positions, so paths from two different trees compare without their indices (the same rule `resolve`'s own `loose`
// applies under anyIndex).
export const LOOSE = ( p ) => String( p ?? '' ).replace( /:nth-of-type\(\d+\)/g, '' );

let contextIndex = null;
// A block's block-context channel, read from its block.json: { provides: { "<context key>": "<attribute>" }, uses:
// [ "<context key>" ] }. A child that `usesContext` a key an ancestor `providesContext` receives that ancestor's
// attribute at render (accordion-item/render.php reads $block->context['sgs/accordionHeaderPadding']), so the setting
// that holds the value sits on the ancestor and nothing on the child declares it. 32 provide keys across 5 blocks and
// 34 uses across 8 (sgs/accordion holds 25).
export function blockContext( slug ) {
	if ( ! contextIndex ) {
		contextIndex = {};
		for ( const dir of fs.readdirSync( BLOCKS_DIR ) ) {
			const f = path.join( BLOCKS_DIR, dir, 'block.json' );
			if ( fs.existsSync( f ) ) {
				const j = JSON.parse( fs.readFileSync( f, 'utf8' ) );
				contextIndex[ j.name ] = { provides: j.providesContext || {}, uses: j.usesContext || [] };
			}
		}
	}
	return contextIndex[ slug ] || null;
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
	if ( 'grid-template-columns' === prop ) {
		return tracksSetting( a ).value === tracksSetting( b ).value;
	}
	const la = parseLength( a );
	const lb = parseLength( b );
	return la && lb ? la.unit === lb.unit && Math.abs( la.n - lb.n ) <= 0.5 : String( a ) === String( b );
};

// One CSS time ("0.25s", "250ms", "1s") as a whole number of milliseconds, or null when it is not one non-negative time.
export function timeToMs( raw ) {
	const m = String( raw ?? '' ).trim().match( /^(\d*\.?\d+)(ms|s)$/i );
	if ( ! m ) {
		return null;
	}
	return Math.round( parseFloat( m[ 1 ] ) * ( 's' === m[ 2 ].toLowerCase() ? 1000 : 1 ) );
}

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
	if ( 'aspect-ratio' === prop ) {
		return ratioSetting( raw, def );
	}
	if ( 'grid-template-columns' === prop ) {
		return tracksSetting( raw );
	}
	if ( Array.isArray( def?.enum ) ) {
		return def.enum.includes( raw ) ? { value: raw } : { error: `${ raw } is not one of ${ def.enum.join( ', ' ) }` };
	}
	if ( 'font-weight' === prop ) {
		return { value: String( raw ) };
	}
	if ( 'font-family' === prop && snapshot ) {
		// A stack whose first family is a theme preset is written as that preset's slug, so it follows the client's theme.
		const slug = snapFontFamily( raw, snapshot, { log, where, prefer } );
		if ( slug ) {
			return { value: slug };
		}
	}
	if ( 'background-image' === prop && [].concat( def?.type || [] ).includes( 'object' ) ) {
		// An image setting holds { url }: a measured url(...) maps to it; a gradient or several layers cannot.
		const m = String( raw ).match( /^url\(["']?([^"')]+)["']?\)$/ );
		return m ? { value: { url: m[ 1 ] } } : { error: `${ raw } is not one image` };
	}
	if ( TIME_PROPS.includes( prop ) ) {
		// A time setting holds whole milliseconds: seconds convert (0.25s is 250), never a decimal or a unit suffix.
		const ms = timeToMs( raw );
		if ( null === ms ) {
			return { error: `${ raw } is not one non-negative time` };
		}
		return { value: [].concat( def?.type || [] ).includes( 'string' ) && ! [].concat( def?.type || [] ).includes( 'number' ) ? String( ms ) : ms };
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

// A per-device discovered setting: each tier takes the value whose recorded effect equals the draft at that tier's
// width (an unlisted value is the setting's empty state); a smaller tier is written only where it differs from the
// tier above. Returns { writes }, a gap when a tier fits two values, or null when no tier fits any.
function tierWrite( attr, d, perWidth, at, same ) {
	const value = {};
	for ( const [ t, w ] of [ [ 'desktop', 1440 ], [ 'tablet', 768 ], [ 'mobile', 375 ] ] ) {
		if ( undefined === at( perWidth, w ) ) {
			continue;
		}
		const fit = Object.entries( d.values ).filter( ( [ , values ] ) => undefined !== values[ w ] && same( values[ w ], at( perWidth, w ) ) ).map( ( [ v ] ) => v );
		if ( fit.length > 1 ) {
			return { gap: 'ambiguous', detail: `${ attr } values ${ fit.join( ', ' ) } all give the draft at ${ w }` };
		}
		const above = 'mobile' === t ? value.tablet ?? value.desktop : value.desktop;
		const v = fit[ 0 ] ?? '';
		if ( 'desktop' === t || v !== ( above ?? '' ) ) {
			value[ t ] = v;
		}
	}
	return Object.values( value ).some( ( v ) => '' !== v ) ? { writes: [ { attr, value, merge: 'deep' } ] } : null;
}

// A setting with no css_property that calibration showed paints `prop` on `slot` (calibration.discovered): the enum
// value whose recorded effect equals the draft at every calibrated width. Ties go to the value that also matches most
// of the element's other draft properties (`siblings`: { prop: { width: value } }). Returns a write, a gap, or null.
// Slots compare under the same `loose` rule every other path comparison uses, taking `anyIndex` from the input, so a
// setting discovered on a fixture's second repetition is found on a client's first. `state` must equal the state
// discovery recorded for the entry (an entry recording no state answers rest rows only): a resting measurement can
// never prove an open or hover value.
export function resolveDiscovered( { slot, prop, perWidth, siblings = {}, anyIndex = false, state = null }, calibration ) {
	const lp = ( p ) => ( anyIndex ? LOOSE( p ) : String( p ?? '' ) );
	const at = ( pw, w ) => pw[ w ] ?? ( 1440 === w ? pw[ 1920 ] : undefined );
	const same = ( a, b ) => String( a ).replace( /\s+/g, '' ) === String( b ).replace( /\s+/g, '' );
	const fits = ( values, pw ) => {
		const ws = [ 375, 768, 1440 ].filter( ( w ) => undefined !== at( pw, w ) && undefined !== values[ w ] );
		return ws.length > 0 && ws.every( ( w ) => same( values[ w ], at( pw, w ) ) );
	};
	const options = [];
	for ( const [ attr, props ] of Object.entries( calibration?.discovered || {} ) ) {
		const d = props[ prop ];
		if ( ! d || ! ( d.slots || [] ).map( lp ).includes( lp( slot ) ) || ( d.state ?? null ) !== ( state || null ) ) {
			continue;
		}
		if ( 'tier_object' === d.tier ) {
			const w = tierWrite( attr, d, perWidth, at, same );
			if ( w ) {
				return w;
			}
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
	const { block, prop, state = null, perWidth, fontPx = {}, current = {} } = input;
	// anyIndex (a setting of an enclosing block): calibration's fixture repeats the child at other positions, so paths
	// compare without their :nth-of-type steps.
	const loose = ( p ) => ( input.anyIndex ? String( p ).replace( /:nth-of-type\(\d+\)/g, '' ) : p );
	const slot = loose( input.slot );
	// An enclosing block's setting also matches on the element's tag where both sides know it (calibration's _tag).
	const tagAt = ( p ) => Object.values( ctx.calibration?.elements?.[ p ] || {} ).find( ( v ) => v?._tag )?._tag;
	const sameKind = ( p ) => ! input.anyIndex || ! input.tag || ! tagAt( p ) || tagAt( p ) === input.tag;
	const { short, side } = splitProperty( prop );
	const rows = [ ...candidates( ctx.db, block, short, state ), ...( short !== prop ? candidates( ctx.db, block, prop, state ) : [] ) ]
		.filter( ( r, i, all ) => all.findIndex( ( x ) => x.attr_name === r.attr_name ) === i );
	if ( ! rows.length ) {
		return resolveDiscovered( { ...input, state }, ctx.calibration ) || { gap: 'no-setting', detail: `${ block } has no setting for ${ prop }${ state ? ' (' + state + ')' : '' }` };
	}
	if ( ! ctx.calibration ) {
		return { gap: 'uncalibrated', detail: `${ block } has no calibration file` };
	}
	// A setting painting the slot itself wins; otherwise one whose inherited value calibration saw reach the slot.
	const tiedBy = ( paths ) => rows.filter( ( r ) => {
		const c = ctx.calibration.settings?.[ r.attr_name ];
		return c && paths( c ).some( ( p ) => loose( p ) === slot && sameKind( p ) ) && ( ! c.property || c.property === short || c.property === prop );
	} );
	const direct = tiedBy( ( c ) => c.slots || [ c.slot ] );
	const tied = direct.length ? direct : tiedBy( ( c ) => c.reaches || [] );
	// A state setting calibration never measured (no trigger for that state yet) is unproven, not missing.
	if ( ! tied.length && state && ! rows.some( ( r ) => ctx.calibration.settings?.[ r.attr_name ] ) ) {
		return { gap: 'uncalibrated', detail: `${ block } ${ rows.map( ( r ) => r.attr_name ).join( ', ' ) } (${ state }) not calibrated` };
	}
	if ( ! tied.length ) {
		return resolveDiscovered( { ...input, state }, ctx.calibration ) || { gap: 'no-setting', detail: `no ${ prop } setting on ${ block } paints "${ slot }" (candidates: ${ rows.map( ( r ) => r.attr_name ).join( ', ' ) })` };
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
	// Extension settings (source sgs-ext) are not in block.json: their database rows give type, default and enum.
	const rowDef = ( r ) => ( { type: r.attr_type, default: r.default_value ?? undefined, ...( r.enum_values ? { enum: JSON.parse( r.enum_values ) } : {} ) } );
	const schema = { ...Object.fromEntries( tied.filter( ( r ) => 'sgs-ext' === r.source ).map( ( r ) => [ r.attr_name, rowDef( r ) ] ) ), ...( blockSchema( block ) || {} ) };
	const row = others[ 0 ] || flat[ 0 ];
	const attr = others[ 0 ] ? row.attr_name : [ ...bases ][ 0 ];
	// A pseudo-namespaced setting (anim:duration, anim:easing, fx:*) holds a KEYWORD slug, not a measured CSS value:
	// `includes/animation-timing-clamp.php` clamps sgsAnimationDuration to instant, fast, medium, slow, extra-slow, and
	// block.json declares the attribute `{ type: 'string' }` with no enum, so a measured "0.3s" would be written and
	// then silently coerced back to the default on render. The measured value is only written when the schema declares
	// it as one of the setting's own values; otherwise the row is a shape gap, and what the route still needs is a
	// calibration discovery of which keyword gives which duration, not a hardcoded keyword-to-duration table.
	if ( isPseudoProperty( row.css_property ) ) {
		const allowed = [].concat( schema[ attr ]?.enum || [] );
		const bad = Object.values( tiers ).find( ( v ) => ! allowed.includes( String( v ) ) );
		if ( undefined !== bad ) {
			return { gap: 'shape', detail: `${ attr } holds a ${ row.css_property } keyword (includes/animation-timing-clamp.php: instant, fast, medium, slow, extra-slow), not the measured ${ bad }` };
		}
	}
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
	// Padding and margin boxes print only their set sides (sgs_box_object_longhands), so writing one side leaves the
	// others to the stylesheet or a wider tier, and nothing is seeded. A border width prints 0 for every unset side
	// (an unset width must be 0), so the first side written into an empty width box brings the other sides at their
	// calibrated default paint.
	const seedsUnsetSides = 'border-width' === short;
	const seedSides = ( t, existing ) => {
		if ( ! side || ! seedsUnsetSides || ( existing && Object.keys( existing ).length ) ) {
			return {};
		}
		const elementKey = Object.keys( ctx.calibration.elements || {} ).find( ( k ) => loose( k ) === slot ) ?? slot;
		const paint = ctx.calibration.elements?.[ elementKey ]?.[ { mobile: 375, tablet: 768, desktop: 1440 }[ t ] ] || {};
		return Object.fromEntries( SIDES.filter( ( s ) => s !== side ).map( ( s ) => [ s, paint[ 'border-width' === short ? `border-${ s }-width` : `${ short }-${ s }` ] ] ).filter( ( [ , v ] ) => undefined !== v ) );
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
		if ( 1 !== vals.length || undefined === vals[ 0 ] ) {
			return { gap: 'shape', detail: vals.length > 1 ? `${ attr } holds one value for every width; draft has ${ vals.join( ', ' ) }` : `no draft value for ${ prop }` };
		}
		writes.push( { attr, value: boxed( JSON.parse( vals[ 0 ] ), 'desktop' ), merge: isBox ? 'deep' : 'replace' } );
	}
	return { writes };
}

// The measured descendants one ancestor setting's paint reaches: the element paths the CALLER measured an open row of
// this property on (ctx.measuredSlots, in the ancestor's own path space), that the ancestor's calibration shows this
// setting painting or reaching. Counted from measurement only. An ancestor merely declaring a property of the same
// name proves nothing about paint, so a setting with no calibration entry reaches nothing and can never be written.
// The match is loose, because the calibration fixture and the client tree index their repetitions differently; the
// COUNT is of the measured paths as measured. Two accordion items share one loose path and are still two descendants,
// so counting loose forms would collapse them and let a parent attribute be written over both.
export function reachedDescendants( attr, ancestor, measuredSlots ) {
	const c = ancestor.calibration?.settings?.[ attr ];
	const paints = [ ...( c?.slots || ( c?.slot ? [ c.slot ] : [] ) ), ...( c?.reaches || [] ) ].map( LOOSE );
	return [ ...new Set( measuredSlots || [] ) ].filter( ( p ) => paints.includes( LOOSE( p ) ) );
}

// FR-47-8 / R-47-12: the canvas-awareness hop. The caller invokes it ONLY after the existing `owners` retry has
// exhausted (its result still carries a gap), so the order is direct match → calibration `reaches` tie → the existing
// caller hop → this hop. A row that resolves today therefore cannot change, and deleting this one call restores the
// previous behaviour exactly, which is what makes the hop falsifiable.
//
// input: the row's own resolver input ({ block, slot, prop, state, perWidth, fontPx, siblings }).
// ctx: { db, snapshot, log, canvas: the surface's manifest flag (§2), ancestors: [ { ref, block, path, tag,
//   attributes, calibration } ] nearest first — built by the caller from the row's own `owners`, with no tree walk and
//   no new lookup — and measuredSlots: the element paths under the ancestor carrying an open row for this property.
//
// Returns one of:
//   null                                      no block in the chain declares the property in the row's state
//   { writes, on, via, cite }                 a proven write whose paint reaches exactly ONE measured descendant
//   { gap: 'canvas-settable', detail, cite }  on a canvas: a block that can hold it, cited, and no write (R-47-5)
//   { cite }                                  off a canvas: the same citation, for the caller's `evidence`, and the
//                                             row's existing classification untouched — the five ordinary pages are
//                                             the route's own output, so a missing setting there stays a real gap
export function resolveViaAncestor( input, ctx ) {
	const { prop, state = null } = input;
	const { short } = splitProperty( prop );
	const uses = blockContext( input.block )?.uses || [];
	for ( const a of ctx.ancestors || [] ) {
		const rows = [ ...candidates( ctx.db, a.block, short, state ), ...( short !== prop ? candidates( ctx.db, a.block, prop, state ) : [] ) ]
			.filter( ( r, i, all ) => all.findIndex( ( x ) => x.attr_name === r.attr_name ) === i );
		if ( ! rows.length ) {
			// Nothing on this ancestor declares the property IN THE ROW'S STATE. A resting setting is never cited for an
			// open or hover row: that citation would be the false positive this hop exists to avoid.
			continue;
		}
		// Write-prover 1: the ancestor's own calibration proves one of those settings paints or reaches this element.
		const painted = rows.find( ( r ) => {
			const c = a.calibration?.settings?.[ r.attr_name ];
			return c && [ ...( c.slots || ( c.slot ? [ c.slot ] : [] ) ), ...( c.reaches || [] ) ].some( ( p ) => LOOSE( p ) === LOOSE( a.path ) ) &&
				( ! c.property || c.property === short || c.property === prop ) && ( ( c.state || null ) === ( state || null ) );
		} );
		// Write-prover 2: the block-context channel. The row's block `usesContext` a key this ancestor
		// `providesContext`, and the attribute behind that key is one of the candidates.
		const provides = blockContext( a.block )?.provides || {};
		const viaContext = rows.find( ( r ) => Object.entries( provides ).some( ( [ key, attr ] ) => attr === r.attr_name && uses.includes( key ) ) );
		const row = painted || viaContext || rows[ 0 ];
		const via = painted ? 'calibration' : ( viaContext ? 'context' : 'declared' );
		const cite = { check: 'canvas-settable', ref: a.ref ?? null, block: a.block, setting: row.attr_name, property: row.css_property, via };
		if ( painted || viaContext ) {
			// R-47-5, the refuse-to-write guard: a parent attribute is written only where its paint reaches exactly one
			// measured descendant. sgs/container's inherited typography and sgs/accordion's headerPadding both reach
			// every item, so on a real page they are explained and cited, never written; the write belongs on the child.
			const reach = reachedDescendants( row.attr_name, a, ctx.measuredSlots );
			cite.measuredDescendants = reach;
			if ( 1 === reach.length ) {
				const out = resolve( { ...input, block: a.block, slot: a.path, anyIndex: true, tag: a.tag || null, current: a.attributes || {} },
					{ ...ctx, calibration: a.calibration } );
				if ( out.writes ) {
					return { writes: out.writes, on: { ref: a.ref ?? null, block: a.block, path: a.path }, via, cite };
				}
				cite.resolverGap = out.gap;
			}
		}
		return ctx.canvas
			? { gap: 'canvas-settable', detail: `${ a.block }::${ row.attr_name } is already in this canvas and can hold ${ prop }${ state ? ' (' + state + ')' : '' }`, cite }
			: { cite };
	}
	return null;
}
