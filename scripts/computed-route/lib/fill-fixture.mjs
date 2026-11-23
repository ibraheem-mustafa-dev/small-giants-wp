// A setting-record fixture's styling preconditions, as Fill sees them (Spec 48 §3.4). The site look renders a block's
// default instance with its fixture's attributes, so a styling setting the fixture switches on to make another setting
// measurable (sgs/social-icons: childIconShowBackground, a 1px childIconBorderWidth) paints in the recorded rest
// though the block's own defaults paint none of it. Fill compares the draft with the unstyled value of every property
// such a precondition paints, so the draft's real value is written, and a written setting carries the switch the
// fixture turned on for it. Scaffolding (brand names, links, words, inner blocks) is never a precondition.
import { attrRow } from './db.mjs';
import { types } from './calibrate-markers.mjs';
import { gatingToggle } from './calibrate-instances.mjs';
import { LOOSE } from './resolve.mjs';

const json = ( v ) => JSON.stringify( v ?? null );

// The stem a boolean switch gates: "showBadge" gates badge*, a prefixed "childIconShowBackground" gates
// childIconBackground*. calibrate-instances.mjs::gatingToggle reads unprefixed switches only (its regex is anchored at
// the start), so a row's prefixed switch is named here.
export function toggleStem( name, def ) {
	if ( ! types( def ).includes( 'boolean' ) || true === def?.default ) {
		return null;
	}
	const m = name.match( /^(?:(show|enable|has|use)|([a-z]\w*?)(Show|Enable|Has|Use))([A-Z]\w*)$/ );
	if ( ! m ) {
		return null;
	}
	return m[ 2 ] ? `${ m[ 2 ] }${ m[ 4 ] }` : m[ 4 ].charAt( 0 ).toLowerCase() + m[ 4 ].slice( 1 );
}

// The styling settings (css_property not null) a switch gates.
function gatedBy( db, block, name, schema ) {
	const stem = toggleStem( name, schema[ name ] );
	if ( ! stem ) {
		return [];
	}
	return Object.keys( schema ).filter( ( a ) => a !== name && a.startsWith( stem ) && attrRow( db, block, a )?.css_property );
}

// The fixture attributes whose value differs from the block's default and that style the block: a setting with a
// css_property, or a switch gating one. Read from the fixture's attributes with its first variant, the variant whose
// read wins a shared element path. Returns { attr: fixtureValue }.
export function fixturePreconditions( block, fixtures, schema, db ) {
	const f = fixtures?.[ block ];
	if ( ! f ) {
		return {};
	}
	const out = {};
	for ( const [ name, value ] of Object.entries( { ...( f.attributes || {} ), ...( ( f.variants || [] )[ 0 ] || {} ) } ) ) {
		const def = schema[ name ];
		if ( ! def || json( value ) === json( def.default ) ) {
			continue;
		}
		if ( attrRow( db, block, name )?.css_property || gatedBy( db, block, name, schema ).length ) {
			out[ name ] = value;
		}
	}
	return out;
}

// A border width paints only with a style, so a width precondition also makes the style its paint.
const partners = ( prop ) => ( /^border(-(top|right|bottom|left))?-width$/.test( prop ) ? [ prop, prop.replace( /width$/, 'style' ) ] : [ prop ] );

// The CSS properties each calibrated slot shows only because of a precondition: { LOOSE(slot): Set(prop) }, props as
// the DB names them (shorthands allowed).
export function taintedProps( block, preconds, schema, db, cal ) {
	const out = new Map();
	for ( const name of Object.keys( preconds ) ) {
		const own = attrRow( db, block, name )?.css_property ? [ name ] : gatedBy( db, block, name, schema );
		for ( const a of own ) {
			const slot = cal?.settings?.[ a ]?.slot;
			if ( undefined === slot ) {
				continue;
			}
			const set = out.get( LOOSE( slot ) ) || new Set();
			String( attrRow( db, block, a ).css_property ).split( ',' ).map( ( p ) => p.trim() ).filter( Boolean ).flatMap( partners ).forEach( ( p ) => set.add( p ) );
			out.set( LOOSE( slot ), set );
		}
	}
	return out;
}

// Whether a DB property (a shorthand like border-width) covers a read longhand (border-top-width).
const covers = ( short, long ) => short === long || ( /^border-(width|style|color|radius)$/.test( short ) && new RegExp( `^border(-[a-z]+){1,2}-${ short.slice( 7 ) }$` ).test( long ) ) || ( 'background' === short && long.startsWith( 'background-' ) );

// What a property paints with nothing set, for the properties a precondition can switch on; undefined for any other.
function unstyled( prop ) {
	if ( /^border(-[a-z]+)*-width$/.test( prop ) ) {
		return '0px';
	}
	if ( /^border(-[a-z]+)*-style$/.test( prop ) ) {
		return 'none';
	}
	if ( 'background-color' === prop ) {
		return 'rgba(0, 0, 0, 0)';
	}
	return [ 'background-image', 'box-shadow' ].includes( prop ) ? 'none' : undefined;
}

// The fixture view of one block, cached on Fill's state (st.fixtureViews): { preconds, tainted, toggles: Set }.
function viewOf( st, block, cal, schema ) {
	if ( ! st.fixtureViews.has( block ) ) {
		const preconds = fixturePreconditions( block, st.fixtures, schema, st.db );
		const toggles = new Set( Object.keys( preconds ).filter( ( n ) => toggleStem( n, schema[ n ] ) ) );
		st.fixtureViews.set( block, { preconds, toggles, tainted: taintedProps( block, preconds, schema, st.db, cal ) } );
	}
	return st.fixtureViews.get( block );
}

// The baseline Fill compares a draft value with when a fixture precondition paints that property on that slot: the
// unstyled value. undefined = use the calibrated rest paint.
export function unstyledBaseline( st, block, cal, schema, slot, prop ) {
	if ( ! st.fixtures ) {
		return undefined;
	}
	const set = viewOf( st, block, cal, schema ).tainted.get( LOOSE( slot ) );
	return set && [ ...set ].some( ( p ) => covers( p, prop ) ) ? unstyled( prop ) : undefined;
}

// The calibrated slots the node does not draw at its own defaults: a fixture-precondition switch (showRating, which the fixture
// turns on so the rating's size and colour can be measured) the node leaves unset is off in the node, so the part it gates
// (the settings that start with its stem, at the slots calibration measured them on) is absent from the node's render though
// calibration's default render shows it. An element the draft lacks that the block already omits is no evidence for a setting that
// would hide it. Returns the slot paths ([] without fixtures).
export function absentByDefault( st, block, cal, schema, attributes = {} ) {
	if ( ! st.fixtures ) {
		return [];
	}
	const out = [];
	for ( const t of viewOf( st, block, cal, schema ).toggles ) {
		if ( undefined !== attributes[ t ] ) {
			continue;
		}
		const stem = toggleStem( t, schema[ t ] );
		for ( const [ a, m ] of Object.entries( cal?.settings || {} ) ) {
			a !== t && a.startsWith( stem ) && 'string' === typeof m?.slot && '' !== m.slot && out.push( m.slot );
		}
	}
	return [ ...new Set( out ) ];
}

// The presence evidence without the draft's absences of parts the block omits already: `evidence` ({ path: true | false }) minus
// each false entry at or under one of `slots` (absentByDefault's). Returns a new object.
export function withoutOmittedAbsences( evidence, slots ) {
	const under = ( p, slot ) => LOOSE( p ) === LOOSE( slot ) || LOOSE( p ).startsWith( `${ LOOSE( slot ) } > ` );
	return Object.fromEntries( Object.entries( evidence ).filter( ( [ p, shown ] ) => false !== shown || ! slots.some( ( slot ) => under( p, slot ) ) ) );
}

// The switch a written setting needs, or null: a fixture-precondition switch gating `attr`, else the switch calibration
// turned on to measure `attr` (lib/calibrate-instances.mjs::gatingToggle: showBackground for backgroundColour), the node
// holding neither. Only a resting setting calibration measured carries the second: its measured paint is the switch's, while
// a state setting (a hover background) paints without it, and switching the rest on would paint the block's default ground.
export function gateFor( st, block, cal, schema, attr, attributes = {} ) {
	if ( st.fixtures ) {
		for ( const t of viewOf( st, block, cal, schema ).toggles ) {
			if ( undefined === attributes[ t ] && attr !== t && attr.startsWith( toggleStem( t, schema[ t ] ) ) ) {
				return t;
			}
		}
	}
	const measured = cal?.settings?.[ attr ];
	if ( ! measured || measured.state || attrRow( st.db, block, attr )?.css_state ) {
		return null;
	}
	const [ t ] = Object.keys( gatingToggle( attr, schema || {}, attributes ) );
	return t && undefined === attributes[ t ] ? t : null;
}

// The companion settings a written setting needs to paint at all, or null: the fixture's `carries` list names the settings
// whose per-setting `preconditions` are switches Fill writes beside them (sgs/button's customWidth paints only under
// widthType custom, a value that paints nothing of its own). A precondition not listed there is calibration scaffolding
// (a hover background needs a resting one) and is never written. A companion the node already holds is left as it is.
// Returns { attr: value } or null.
export function carriedFor( st, block, attr, attributes = {} ) {
	const fixture = st.fixtures?.[ block ];
	if ( ! ( fixture?.carries || [] ).includes( attr ) ) {
		return null;
	}
	const out = Object.fromEntries( Object.entries( fixture.preconditions?.[ attr ] || {} ).filter( ( [ name ] ) => undefined === attributes[ name ] ) );
	return Object.keys( out ).length ? out : null;
}
