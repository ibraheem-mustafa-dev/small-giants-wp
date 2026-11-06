// Incremental calibration (FR-48-93): a block whose build changed re-measures only the settings that are new or
// changed, plus every setting that read dead, and proves the rest of its slot map is still true with its default paint
// and a canary sample of unchanged settings. Anything that could not be proven falls back to a full measurement of the
// block, and says why. Pure: no browser, no site.
import { createHash } from 'crypto';

// Incremental runs a block may have in a row before a full measurement is forced (Bean, 2026-11-06): the bound on a row a
// canary could miss, a change in shared code that moves no default paint.
export const MAX_CHAIN = 5;
// The canary: 5% of a block's settings, at least CANARY_MIN and at most CANARY_MAX, within CANARY_INSTANCES instances.
export const CANARY_MIN = 6;
export const CANARY_MAX = 20;
export const CANARY_INSTANCES = 40;

const hash = ( v ) => createHash( 'md5' ).update( 'string' === typeof v ? v : JSON.stringify( v ) ).digest( 'hex' );

// The setting an instance measures, or null for a default, baseline or paint state.
export const settingOf = ( inst ) => inst.content?.attr ?? inst.discover?.attr ?? inst.row?.attr_name ?? null;

// The hash of a block's fixture: a changed fixture moves every element path.
export const fixtureKeyOf = ( fixture ) => hash( fixture || {} ).slice( 0, 12 );

// The block's own PHP as { word: [ lines ] }, so a setting's lines are found by its name. sources: an array of file texts.
export function codeIndex( sources ) {
	const index = new Map();
	for ( const text of sources ) {
		for ( const line of String( text ).split( /\r?\n/ ) ) {
			for ( const word of new Set( line.match( /[A-Za-z_][A-Za-z0-9_]*/g ) || [] ) ) {
				index.has( word ) ? index.get( word ).push( line.trim() ) : index.set( word, [ line.trim() ] );
			}
		}
	}
	return index;
}

const ROW_FIELDS = [ 'attr_type', 'default_value', 'enum_values', 'is_responsive', 'source', 'role', 'css_property', 'css_element', 'css_state', 'css_tier', 'tier_shape', 'box_family' ];

// What decides a setting's reading: its database row, its planned instances and the lines of the block's PHP naming it.
// A setting whose fingerprint is unchanged was measured the same way as last time. Returns { setting: hash }.
export function fingerprints( instances, index = new Map() ) {
	const grouped = {};
	for ( const inst of instances ) {
		const name = settingOf( inst );
		if ( name ) {
			( grouped[ name ] ??= [] ).push( inst );
		}
	}
	const out = {};
	for ( const [ name, list ] of Object.entries( grouped ) ) {
		const row = list.find( ( i ) => i.row )?.row || {};
		out[ name ] = hash( {
			row: Object.fromEntries( ROW_FIELDS.map( ( f ) => [ f, row[ f ] ?? null ] ) ),
			instances: list.map( ( i ) => [ i.key, i.attrs, i.target ?? null, i.trigger ?? null, i.marker?.expect ?? null, i.marker?.form ?? null ] ),
			code: index.get( name ) || [],
		} ).slice( 0, 12 );
	}
	return out;
}

// The setting an instance key belongs to: `<attr>-<label>-v<n>`, or `content-<kind>-<attr>` for a content instance.
export const attrOfKey = ( key ) => String( key ).replace( /^content-(text|presence|link)-/, '' ).split( '-' )[ 0 ];

// The settings a run must measure whatever their fingerprint says: last run left them dead, untested or rejected.
function unsettled( prev ) {
	return new Set( [
		...( prev.dead || [] ),
		...( prev.untestedStates || [] ).map( ( s ) => String( s ).split( ':' )[ 0 ] ),
		...( prev.rejected || [] ).map( ( r ) => attrOfKey( r.key ) ),
	] );
}

// Every row a map holds for one setting. A `presence` key is `<attr>` or `<attr>=<value>`.
function rowsOf( map, name ) {
	const presence = Object.fromEntries( Object.entries( map.presence || {} ).filter( ( [ k ] ) => k.split( '=' )[ 0 ] === name ) );
	return { setting: map.settings?.[ name ] ?? null, discovered: map.discovered?.[ name ] ?? null, text: map.text?.[ name ] ?? null, link: map.link?.[ name ] ?? null, presence };
}

// True when the map holds a reading of the setting: an empty `discovered` entry is a discovery that found nothing.
const hasRows = ( map, name ) => {
	const r = rowsOf( map, name );
	return !! ( r.setting || r.text || r.link || Object.keys( r.discovered || {} ).length || Object.keys( r.presence ).length );
};

// Every setting named by a row of the map.
const rowNames = ( map ) => [ ...new Set( [ 'settings', 'discovered', 'text', 'link', 'presence' ].flatMap( ( f ) => Object.keys( map[ f ] || {} ).map( ( k ) => k.split( '=' )[ 0 ] ) ) ) ];

// The canary: unchanged live settings in an order set by the build, so a new build samples others, up to `count` settings
// within CANARY_INSTANCES instances. `owned` is { setting: instances }.
export function canaryFor( candidates, owned, slotKey ) {
	const count = Math.min( CANARY_MAX, Math.max( CANARY_MIN, Math.ceil( candidates.length * 0.05 ) ) );
	const order = [ ...candidates ].sort( ( a, b ) => hash( `${ slotKey }:${ a }` ).localeCompare( hash( `${ slotKey }:${ b }` ) ) );
	const out = [];
	let total = 0;
	for ( const name of order ) {
		const n = owned[ name ]?.length || 0;
		if ( n && out.length < count && total + n <= CANARY_INSTANCES ) {
			out.push( name );
			total += n;
		}
	}
	// Settings each heavier than the whole budget still give one canary: a run never proves itself on none.
	const lightest = order.filter( ( n ) => owned[ n ]?.length ).sort( ( a, b ) => owned[ a ].length - owned[ b ].length )[ 0 ];
	return out.length || ! lightest ? out : [ lightest ];
}

// Why this block must be measured in full, or null when an incremental run may start. i: { prev (the slot map), prevPaint
// (this site's default paint), fixtureKey, snapshotKey, readKey, site, recalibrate, versions: { playwrightVersion,
// browserVersion } }. The map carries one version stamp, so rows read under another browser cannot be merged with new ones.
export function fullBecause( { prev, prevPaint, fixtureKey, snapshotKey, readKey, site, recalibrate = false, versions = {} } ) {
	if ( recalibrate ) {
		return '--recalibrate';
	}
	if ( ! prev ) {
		return 'the block has no slot map';
	}
	if ( ! prev.fingerprints ) {
		return 'the slot map holds no fingerprints (the first run after this feature)';
	}
	if ( prev.readKey !== readKey ) {
		return 'the read list changed';
	}
	if ( prev.site !== site ) {
		return `the slot map was measured on ${ prev.site }`;
	}
	for ( const [ key, value ] of Object.entries( versions ) ) {
		if ( prev[ key ] !== value ) {
			return `${ key } changed from ${ prev[ key ] } to ${ value }`;
		}
	}
	if ( prev.fixtureKey !== fixtureKey ) {
		return 'the block\'s fixture changed';
	}
	if ( ( prev.incremental?.chain || 0 ) >= MAX_CHAIN ) {
		return `${ MAX_CHAIN } incremental runs in a row`;
	}
	if ( ! prevPaint?.elements ) {
		return `this site has no default paint to compare with`;
	}
	if ( prevPaint.readKey !== readKey ) {
		return 'the default paint was read under another read list';
	}
	if ( prevPaint.slotKey !== prev.slotKey ) {
		return 'the default paint belongs to another build than the slot map';
	}
	if ( prevPaint.paintKey?.split( '-' )[ 1 ] !== snapshotKey ) {
		return 'the site\'s snapshot changed since its default paint was measured';
	}
	return null;
}

// The incremental plan: { instances, measure: [ settings ], canary: [ settings ], unplanned: [ settings ] }, every default,
// paint state and needed baseline included. `all` is the whole planned block; `declared` the block's attribute names. `unplanned`
// names old rows of a setting the block still declares and no longer plans: only a full measurement can say what became of
// them. A setting the block no longer declares is not unplanned: it simply leaves the map (mergeSlotMap).
export function planIncremental( prev, all, prints, slotKey, declared = null ) {
	const owned = {};
	for ( const inst of all ) {
		const name = settingOf( inst );
		name && ( owned[ name ] ??= [] ).push( inst );
	}
	const known = prev.fingerprints || {};
	const open = unsettled( prev );
	const measure = Object.keys( owned ).filter( ( n ) => known[ n ] !== prints[ n ] || open.has( n ) || ! hasRows( prev, n ) );
	const chosen = new Set( measure );
	const candidates = Object.keys( owned ).filter( ( n ) => ! chosen.has( n ) );
	const canary = canaryFor( candidates, owned, slotKey );
	canary.forEach( ( n ) => chosen.add( n ) );
	const picked = all.filter( ( i ) => chosen.has( settingOf( i ) ) );
	const bases = new Set( picked.map( ( i ) => i.baseKey ).filter( Boolean ) );
	const instances = all.filter( ( i ) => i.isDefault || i.paintState || ( i.isBase && bases.has( i.baseKey ) ) || chosen.has( settingOf( i ) ) );
	const unplanned = rowNames( prev ).filter( ( n ) => ! owned[ n ] && ( ! declared || declared.has( n ) ) );
	return { instances, measure, canary, unplanned };
}

// The first difference between two default paints, or null: every element at every width with every property. A changed
// element list is a changed block structure, and every slot in the map is a path through it.
export function paintMoved( before = {}, after = {} ) {
	const paths = new Set( [ ...Object.keys( before ), ...Object.keys( after ) ] );
	for ( const path of paths ) {
		if ( ! before[ path ] || ! after[ path ] ) {
			return `element ${ JSON.stringify( path ) } ${ before[ path ] ? 'is gone' : 'is new' }`;
		}
		for ( const w of new Set( [ ...Object.keys( before[ path ] ), ...Object.keys( after[ path ] ) ] ) ) {
			const a = before[ path ][ w ] || {};
			const b = after[ path ][ w ] || {};
			for ( const prop of new Set( [ ...Object.keys( a ), ...Object.keys( b ) ] ) ) {
				if ( a[ prop ] !== b[ prop ] ) {
					return `${ prop } on ${ JSON.stringify( path ) } at ${ w } moved from ${ a[ prop ] } to ${ b[ prop ] }`;
				}
			}
		}
	}
	return null;
}

// A value with its keys and plain lists in a fixed order, so two readings compare by what they hold.
function canonical( v ) {
	if ( Array.isArray( v ) ) {
		const items = v.map( canonical );
		return items.every( ( i ) => 'object' !== typeof i || null === i ) ? [ ...items ].sort( ( a, b ) => String( a ).localeCompare( String( b ) ) ) : items;
	}
	return v && 'object' === typeof v ? Object.fromEntries( Object.keys( v ).sort().map( ( k ) => [ k, canonical( v[ k ] ) ] ) ) : v;
}

// The first canary whose rows differ from the old map, or null: every field of every kind of row. `prev` and `next` are
// maps; a state setting's look and a part's `overriddenBy` count as much as its slot.
export function canaryDiffers( prev = {}, next = {}, names = [] ) {
	const bad = names.find( ( n ) => JSON.stringify( canonical( rowsOf( prev, n ) ) ) !== JSON.stringify( canonical( rowsOf( next, n ) ) ) );
	return bad ? `canary ${ bad } reads differently from the old map` : null;
}

// The new slot map: the old one with every measured setting's rows replaced, and every row of a setting the block no
// longer declares gone. `declared` is a Set of the block's attribute names; `measured` the settings this run read.
export function mergeSlotMap( prev, next, measured, declared ) {
	const fresh = new Set( measured );
	const attrOf = ( key ) => String( key ).split( '=' )[ 0 ];
	const keep = ( name ) => declared.has( name ) && ! fresh.has( name );
	const keyed = ( field ) => ( { ...Object.fromEntries( Object.entries( prev[ field ] || {} ).filter( ( [ k ] ) => keep( attrOf( k ) ) ) ), ...( next[ field ] || {} ) } );
	const merged = {
		...next,
		settings: keyed( 'settings' ),
		discovered: keyed( 'discovered' ),
		dead: [ ...( prev.dead || [] ).filter( keep ), ...( next.dead || [] ) ],
		oneWidth: [ ...( prev.oneWidth || [] ).filter( ( e ) => keep( attrOfKey( e.key ) ) ), ...( next.oneWidth || [] ) ],
		rejected: [ ...( prev.rejected || [] ).filter( ( e ) => keep( attrOfKey( e.key ) ) ), ...( next.rejected || [] ) ],
		untestedStates: [ ...new Set( [ ...( prev.untestedStates || [] ).filter( ( s ) => keep( String( s ).split( ':' )[ 0 ] ) ), ...( next.untestedStates || [] ) ] ) ],
	};
	for ( const field of [ 'text', 'presence', 'link' ] ) {
		const rows = keyed( field );
		Object.keys( rows ).length ? ( merged[ field ] = rows ) : delete merged[ field ];
	}
	return merged;
}

// Runs a block's measurement: incremental when the plan allows, and in full when it does not or when `verify` finds the
// old map no longer holds. `measure( instances )` returns a reading, `verify( reading )` the reason it failed or null.
// Returns { reading, mode: 'incremental' | 'full', why, plan }.
export async function measureWithFallback( { why, all, plan, measure, verify } ) {
	if ( why ) {
		return { reading: await measure( all ), mode: 'full', why };
	}
	const reading = await measure( plan.instances );
	const failed = verify( reading );
	return failed ? { reading: await measure( all ), mode: 'full', why: failed } : { reading, mode: 'incremental', why: null, plan };
}
