// The comparison of what the route would write with what a site already holds (template-rework Task 4): every look setting of
// a block is classed as equal, differs (both values shown), hand-set only (the site holds a value the route would not write,
// with the reason) or route only. Pure: the saved attributes, the route's build (lib/fill-part-look.mjs::buildLook) and the
// site's palette go in.
import { parseColour } from './normalise.mjs';
import { samePrimitive, tableAttrs } from './fill-part-look.mjs';

const TIERS = [ 'desktop', 'tablet', 'mobile' ];
const isTiered = ( v ) => v && 'object' === typeof v && ! Array.isArray( v ) && Object.keys( v ).length > 0 && Object.keys( v ).every( ( k ) => TIERS.includes( k ) );

// A setting's value as what each device shows: { desktop, tablet, mobile }, a missing narrower tier taking the wider one's.
export function effective( v ) {
	const t = isTiered( v ) ? v : { desktop: v };
	const tablet = t.tablet ?? t.desktop;
	return { desktop: t.desktop, tablet, mobile: t.mobile ?? tablet };
}

// A leaf resolved to a comparable form: a palette slug becomes its colour, a font slug its family, a bare number or px length a number.
function resolveLeaf( v, site ) {
	if ( 'string' !== typeof v ) {
		return v;
	}
	const colour = site?.palette?.find( ( t ) => t.slug === v )?.colour;
	if ( colour ) {
		return `rgb(${ colour.r }, ${ colour.g }, ${ colour.b })`;
	}
	const family = site?.fontFamilies?.find( ( t ) => t.slug === v )?.family;
	if ( family ) {
		return family;
	}
	if ( parseColour( v ) ) {
		return v;
	}
	const m = v.trim().match( /^(-?\d*\.?\d+)(px)?$/ );
	return m ? Number( m[ 1 ] ) : v.trim().toLowerCase().replace( /^["']|["']$/g, '' );
}

const resolveDeep = ( v, site ) => ( v && 'object' === typeof v ? Object.fromEntries( Object.entries( v ).map( ( [ k, x ] ) => [ k, resolveDeep( x, site ) ] ) ) : resolveLeaf( v, site ) );

// Whether two saved values show the same look on every device.
export function sameSetting( a, b, site = null ) {
	const [ ea, eb ] = [ effective( a ), effective( b ) ];
	return TIERS.every( ( t ) => samePrimitive( resolveDeep( ea[ t ], site ), resolveDeep( eb[ t ], site ) ) );
}

// A shadow as { x, y, blur, spread, colour }: the lengths in order and the colour token (a palette slug or a colour), which may
// sit in the string or in a companion setting.
function shadowOf( text, colourAttr, site ) {
	const tokens = String( text ?? '' ).trim().split( /\s+(?![^(]*\))/ ).filter( Boolean );
	const lengths = tokens.filter( ( t ) => /^-?[\d.]+(px)?$/.test( t ) ).map( ( t ) => parseFloat( t ) );
	const colour = tokens.find( ( t ) => ! /^-?[\d.]+(px)?$/.test( t ) ) ?? colourAttr;
	return { x: lengths[ 0 ] ?? 0, y: lengths[ 1 ] ?? 0, blur: lengths[ 2 ] ?? 0, spread: lengths[ 3 ] ?? 0, colour: resolveLeaf( colour, site ) };
}

const REASON = {
	drawn: 'the draft draws this part, so it is not hidden',
	notDrawn: 'the draft does not draw this part, so the switch stays off',
	neighboursNotFound: 'the neighbours of the part were not found in the draft, so nothing is hidden',
	switchDirection: 'no data says which value of this switch hides the part',
	undeclared: 'the draft states no such size (the layout decides it)',
	noLocator: 'no locator for the part',
	unpaired: 'the part has a locator and the draft has no element for it',
	noDifference: 'no draft difference (the draft shows the same value at every width)',
	initial: 'no draft difference (the draft value is the CSS initial of the look)',
	absent: 'the draft shows no element for the part at 1440',
	conflict: 'the part\'s instances differ in the draft, so nothing is written',
	shape: 'the setting cannot hold the draft\'s value',
	unsupported: 'a look the route does not read',
	state: 'a state setting the route does not read',
};

// writes: buildLook().writes; settings: buildLook().settings; saved: the block's saved attributes; lookAttrs: the names of the
// block's look settings (the database rows with a part and a property). Returns { equal, differs, handSetOnly, routeOnly, counts }.
export function compareSettings( { writes, settings, saved, lookAttrs, site = null } ) {
	const out = { equal: [], differs: [], handSetOnly: [], routeOnly: [] };
	const route = new Map( writes.map( ( w ) => [ w.attr, w ] ) );
	const names = new Set( [ ...lookAttrs ].filter( ( a ) => undefined !== saved[ a ] ) );
	const colourProps = new Set( [ 'color', 'background-color', 'border-color' ] );
	for ( const [ attr, w ] of route ) {
		if ( w.companionOf ) {
			continue;
		}
		const entry = { attr, part: w.part, route: w.value, ...( w.knownFault ? { knownFault: w.knownFault } : {} ) };
		const shadow = w.pairedColour ? ( a ) => shadowOf( a[ attr ], a[ w.pairedColour ], site ) : null;
		if ( undefined === saved[ attr ] ) {
			out.routeOnly.push( entry );
		} else if ( shadow ? samePrimitive( shadow( { [ attr ]: w.value, [ w.pairedColour ]: route.get( w.pairedColour )?.value } ), shadow( saved ) ) : sameSetting( w.value, saved[ attr ], site ) ) {
			out.equal.push( { ...entry, saved: saved[ attr ] } );
		} else {
			const slugLeaf = ( v ) => 'string' === typeof v && /^[a-z][a-z0-9-]*$/.test( v ) && ! [ 'solid', 'dashed', 'dotted', 'none', 'transparent', 'currentcolor' ].includes( v );
			const unresolved = colourProps.has( w.property ) && slugLeaf( saved[ attr ] ) && ! site?.palette?.some( ( t ) => t.slug === saved[ attr ] );
			out.differs.push( { ...entry, saved: saved[ attr ], ...( unresolved ? { note: 'the saved colour is a slug the client snapshot palette does not hold, so it cannot be compared with the draft colour' } : {} ) } );
		}
		names.delete( attr );
		w.pairedColour && names.delete( w.pairedColour );
	}
	for ( const attr of names ) {
		const s = settings[ attr ] || { code: 'noLocator' };
		out.handSetOnly.push( { attr, part: s.part ?? null, saved: saved[ attr ], code: s.code || 'noLocator', reason: REASON[ s.code ] || s.reason || 'not written', ...( s.knownFault ? { knownFault: s.knownFault } : {} ) } );
	}
	const byCode = {};
	for ( const h of out.handSetOnly ) {
		byCode[ h.code ] = ( byCode[ h.code ] || 0 ) + 1;
	}
	out.counts = {
		equal: out.equal.length,
		differs: out.differs.length,
		handSetOnly: out.handSetOnly.length,
		handSetOnlyByReason: byCode,
		routeOnly: out.routeOnly.length,
		knownFaultValues: [ ...out.equal, ...out.differs, ...out.routeOnly ].filter( ( e ) => e.knownFault ).length,
	};
	return out;
}

// The faults a block's settings are known to have: the data file's named ones plus every setting of a look-table row that has no
// selector for the block (the setting prints nothing there). Returns ( attr ) => reason | null.
export function faultsOf( { block, blockKey, table, listed } ) {
	const named = listed.blocks?.[ block ] || {};
	const rows = tableAttrs( table );
	const none = {};
	for ( const [ attr, { row } ] of Object.entries( rows ) ) {
		if ( blockKey && ! table.rows[ row ][ blockKey ] ) {
			none[ attr ] = `the look table's row ${ row } has no ${ blockKey } selector, so it paints nothing on the ${ blockKey }`;
		}
	}
	return ( attr ) => named[ attr ] ?? none[ attr ] ?? null;
}
