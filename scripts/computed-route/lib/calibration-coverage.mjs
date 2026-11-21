// Calibration coverage: every block setting that could paint or change the block and has no usable calibration reading,
// each with one reason from a closed list, the drift between what a block declares (the framework database's
// css_property and css_element, block.json's supports.sgs.elements attrMap) and what calibration measured, and where two
// calibration caches disagree on one setting. Pure: the caller hands in database rows, block.json elements and cache
// files (tools/calibration-coverage.mjs reads them). No browser, no site.
import { longhands } from './calibrate-props.mjs';
import { listedProperties } from './db.mjs';
import { reachedBy, storedKeys } from './css-families.mjs';
import { lookOfProperty } from './skeleton-paint-conservation.mjs';

// The closed list of reasons a setting has no usable reading.
export const REASONS = [
	'never-planned', // the planner never builds an instance: detail no-property, no-longhand, role-skipped or number-choice
	'not-calibrated', // no calibration cache of the block exists
	'stale', // the cache predates the setting: its fingerprints do not name it and no list does either
	'rejected', // the editor refused the marker
	'no-marker', // the planner could not build a value to test
	'state-untriggerable', // its state could not be triggered: detail closed-panel, part-not-drawn, no-trigger or other
	'dead-site', // read dead here, read live in a cache measured on another site: the measuring site decides
	'dead-part-not-drawn', // read dead, and its declared part appears in no reading of the cache: the fixture never draws it
	// read dead for another cause (another setting off, the fixture's content): detail discovery-no-change (an enum whose
	// values changed nothing), presence-unseen (a switch whose flip showed and hid nothing), fixture-holds-flip (the
	// fixture already holds the flipped value), unstable (another run on the same site read it live)
	'dead',
	'dropped', // planned and fingerprinted, yet the cache holds no row and no list names it
	'one-width', // a per-device setting read at one width only
];

// The share of a role's rows that must carry a css_property for the role to count as one that paints: a setting of such a
// role with no property is a look the planner cannot reach. Read from the rows, never listed by name.
export const PAINT_SHARE = 0.25;

// The custom CSS every block carries: it holds what no setting reads, so it is never a calibration target.
export const CUSTOM_CSS_ATTR = 'sgsCustomCss';

// Whether a row is the unit companion of another setting of its block (`letterSpacingUnit` beside `letterSpacing`): it is
// read with that setting, never on its own. unitSuffixes: modifier_suffixes rows of kind unit; names: 'block|attr' keys.
export function companionOf( row, unitSuffixes, names ) {
	return unitSuffixes.some( ( suf ) => row.attr_name.endsWith( suf ) && row.attr_name.length > suf.length && names.has( `${ row.block_slug }|${ row.attr_name.slice( 0, -suf.length ) }` ) );
}

// The roles that paint: classified styling-behaviour (the `roles` table) and carrying a css_property on at least
// PAINT_SHARE of their rows. rows: block_attributes rows; roles: { role_name: classification }.
export function paintRoles( rows, roles ) {
	const count = {};
	for ( const r of rows ) {
		if ( r.role ) {
			const c = ( count[ r.role ] ??= { all: 0, prop: 0 } );
			c.all++;
			r.css_property && c.prop++;
		}
	}
	return new Set( Object.entries( count ).filter( ( [ role, c ] ) => 'styling-behaviour' === roles[ role ] && c.prop / c.all >= PAINT_SHARE ).map( ( [ role ] ) => role ) );
}

// What kind of setting a row is, or null when it cannot paint or change the block: property (a declared CSS property),
// choice (named or numbered values), switch (a show or hide boolean), look (a painting role with nothing declared).
export function kindOf( row, { paint, presenceRoles, roles } ) {
	if ( row.css_property ) {
		return 'property';
	}
	if ( null != row.enum_values ) {
		return 'content-bearing' === roles[ row.role ] ? null : 'choice';
	}
	if ( 'boolean' === row.attr_type ) {
		return presenceRoles.includes( row.role ) || paint.has( row.role ) ? 'switch' : null;
	}
	return paint.has( row.role ) ? 'look' : null;
}

// Why the planner never builds an instance for a row, or null when it does (lib/calibrate-block.mjs::calibrateBlock's
// selection: attrsFor rows with a longhand, enumSettings, contentRowsFor's presence roles).
export function neverPlanned( row, kind, { presenceRoles } ) {
	if ( 'look' === kind ) {
		return 'no-property';
	}
	if ( 'property' === kind ) {
		return longhands( row.css_property ).length ? null : 'no-longhand';
	}
	if ( 'switch' === kind ) {
		return presenceRoles.includes( row.role ) ? null : 'role-skipped';
	}
	return null;
}

const presenceKeys = ( map, name ) => Object.keys( map?.presence || {} ).filter( ( k ) => k.split( '=' )[ 0 ] === name );
export const attrOfKey = ( key ) => String( key ).replace( /^content-(text|presence|link)-/, '' ).split( '-' )[ 0 ];

// One setting's rows in a cache: { setting, presence, discovered (null, {} or the effects), text, link }.
export function readingOf( map, name ) {
	return {
		setting: map?.settings?.[ name ] ?? null,
		presence: presenceKeys( map, name ),
		discovered: map?.discovered?.[ name ] ?? null,
		text: map?.text?.[ name ] ?? null,
		link: map?.link?.[ name ] ?? null,
	};
}

// Whether a reading can be written from. A choice with no property and number values needs a presence reading: the
// planner reads presence for string choices only (lib/calibrate-content.mjs::contentRowsFor), so its discovered paint
// alone never decides a structure.
export function usable( reading, row, kind ) {
	if ( reading.presence.length ) {
		return true;
	}
	if ( 'choice' === kind && ! row.css_property && 'string' !== row.attr_type ) {
		return false;
	}
	return !! ( reading.setting || reading.text || reading.link || Object.keys( reading.discovered || {} ).length );
}

// The sub-reason of an untested state from the calibration's own words.
export function stateWhy( text ) {
	const t = String( text );
	if ( ! t.includes( '(' ) ) {
		return 'no-trigger';
	}
	if ( /panel opened|panel is closed|stays hidden/.test( t ) ) {
		return 'closed-panel';
	}
	if ( /no element in the instance matches/.test( t ) ) {
		return 'part-not-drawn';
	}
	if ( /pointer|hover cannot/.test( t ) ) {
		return 'pointer';
	}
	return 'other';
}

// The parts a block declares for one setting: block.json elements whose attrMap (or a state's attrMap) names it, then
// the database's css_element. Returns [ { part, selector } ]; selector '' is the block root.
export function declaredParts( name, row, elements = {}, short ) {
	const out = new Map();
	const selectorOf = ( part ) => {
		const el = elements[ part ];
		if ( el?.selector ) {
			return el.selector;
		}
		return el?.isWrapper || [ 'wrapper', 'box' ].includes( part ) ? '' : `.sgs-${ short }__${ part }`;
	};
	for ( const [ part, el ] of Object.entries( elements ) ) {
		const maps = [ el.attrMap || {}, ...Object.values( el.states || {} ).map( ( s ) => s?.attrMap || {} ) ];
		maps.some( ( m ) => Object.values( m ).includes( name ) ) && out.set( part, selectorOf( part ) );
	}
	row?.css_element && ! out.has( row.css_element ) && out.set( row.css_element, selectorOf( row.css_element ) );
	return [ ...out ].map( ( [ part, selector ] ) => ( { part, selector, from: elements[ part ] ? 'block.json' : 'database' } ) );
}

const lastStep = ( slot ) => String( slot ).split( ' > ' ).pop();
const classesOf = ( sel ) => String( sel ).split( ',' ).map( ( alt ) => alt.trim().split( /\s+/ ).pop().replace( /:[a-z-]+(\([^)]*\))?/g, '' ).split( '.' ).filter( Boolean ) );

const stepClasses = ( step ) => String( step ).replace( /:nth-of-type\(\d+\)/g, '' ).split( '.' ).filter( Boolean );

// Whether a measured slot is a declared part, or inside it: the root is the empty slot or the block's own class alone;
// any other part's classes all sit on one step of the slot (a reading on the part's glyph or link is the part's).
export function slotIsPart( slot, selector, short = null ) {
	if ( '' === selector ) {
		return '' === slot || ( !! short && String( slot ) === `.sgs-${ short }` );
	}
	const steps = String( slot ).split( ' > ' );
	return classesOf( selector ).some( ( cls ) => cls.length && steps.some( ( step ) => cls.every( ( c ) => stepClasses( step ).includes( c ) ) ) );
}

// A slot the declaration cannot be compared with: a named pseudo slot (`@scrim::before`) or a pseudo-element.
const pseudoSlot = ( slot ) => /^@|::/.test( String( slot ) );

// Every class the cache's readings were taken on and its default paints (`paths`: element paths) show: the parts its
// fixture draws.
export function drawnClasses( map, paths = [] ) {
	const out = new Set();
	const add = ( slot ) => String( slot ).split( ' > ' ).forEach( ( step ) => stepClasses( step ).forEach( ( c ) => out.add( c ) ) );
	paths.forEach( add );
	Object.values( map?.settings || {} ).forEach( ( s ) => ( s.slots || [ s.slot ] ).forEach( add ) );
	Object.values( map?.discovered || {} ).forEach( ( d ) => Object.values( d || {} ).forEach( ( e ) => ( e?.slots || [] ).forEach( add ) ) );
	Object.values( map?.presence || {} ).forEach( ( p ) => [ ...( p?.shows || [] ), ...( p?.hides || [] ) ].forEach( add ) );
	return out;
}

// Whether every declared part of a setting is missing from what the cache read (false when nothing is declared).
const partsUndrawn = ( parts, drawn ) => parts.length > 0 && parts.every( ( p ) => '' !== p.selector && ! classesOf( p.selector ).some( ( cls ) => cls.length && cls.every( ( c ) => drawn.has( c ) ) ) );

// The reason one setting has no usable reading, or null when it has one. map: the block's freshest cache (null when the
// block was never calibrated); others: the other observations of the block [ { site, map } ].
export function reasonFor( { name, row, kind, parts = [] }, map, others = [], ctx ) {
	const never = neverPlanned( row, kind, ctx );
	if ( never ) {
		return { reason: 'never-planned', detail: never };
	}
	if ( 'choice' === kind && ! row.css_property && 'string' !== row.attr_type && ! readingOf( map, name ).presence.length ) {
		return { reason: 'never-planned', detail: 'number-choice' };
	}
	if ( ! map ) {
		return { reason: 'not-calibrated', detail: null };
	}
	const reading = readingOf( map, name );
	if ( usable( reading, row, kind ) ) {
		const s = reading.setting;
		const perDevice = 1 === Number( row.is_responsive ) && 'flat_sibling' !== row.tier_shape;
		return perDevice && s?.reachedAt?.length === 1 ? { reason: 'one-width', detail: `read at ${ s.reachedAt[ 0 ] } only` } : null;
	}
	const rejected = ( map.rejected || [] ).find( ( r ) => attrOfKey( r.key ) === name );
	if ( rejected ) {
		return { reason: 'rejected', detail: rejected.message || rejected.key };
	}
	if ( ( map.noMarker || [] ).includes( name ) ) {
		return { reason: 'no-marker', detail: null };
	}
	const untested = ( map.untestedStates || [] ).find( ( s ) => String( s ).split( ':' )[ 0 ] === name );
	if ( untested ) {
		return { reason: 'state-untriggerable', detail: stateWhy( untested ) };
	}
	const discoveredNothing = reading.discovered && ! Object.keys( reading.discovered ).length;
	const planned = Object.hasOwn( map.fingerprints || {}, name );
	// A presence flip that showed and hid nothing leaves no row and no list entry (lib/calibrate-content.mjs::collectContent
	// keeps no empty reading): planned, fingerprinted and silent is its dead.
	const presenceUnseen = 'switch' === kind && ! row.css_property && planned;
	if ( ( map.dead || [] ).includes( name ) || discoveredNothing || presenceUnseen ) {
		const live = others.filter( ( o ) => o.map && usable( readingOf( o.map, name ), row, kind ) );
		const elsewhere = live.filter( ( o ) => o.site !== map.site );
		if ( elsewhere.length ) {
			return { reason: 'dead-site', detail: `live on ${ [ ...new Set( elsewhere.map( ( o ) => o.site ) ) ].join( ', ' ) }` };
		}
		if ( live.length ) {
			return { reason: 'dead', detail: 'unstable' };
		}
		if ( partsUndrawn( parts, drawnClasses( map, ctx.drawnPaths || [] ) ) ) {
			return { reason: 'dead-part-not-drawn', detail: parts.map( ( p ) => p.part ).join( ', ' ) };
		}
		if ( presenceUnseen ) {
			return { reason: 'dead', detail: fixtureHoldsFlip( name, row, ctx.fixture ) ? 'fixture-holds-flip' : 'presence-unseen' };
		}
		return { reason: 'dead', detail: discoveredNothing ? 'discovery-no-change' : null };
	}
	if ( ! planned ) {
		return { reason: 'stale', detail: `measured ${ map.measured }` };
	}
	return { reason: 'dropped', detail: null };
}

// Whether a block's calibration fixture already holds a switch at the opposite of its default, so the planner's flip to
// the opposite renders the fixture's own look (the baseline fix on main reads such a flip against the default).
export function fixtureHoldsFlip( name, row, fixture ) {
	const held = fixture?.attributes?.[ name ];
	if ( 'boolean' !== typeof held ) {
		return false;
	}
	let def = null;
	try {
		def = JSON.parse( row.default_value );
	} catch {
		def = null;
	}
	return held !== ( true === def );
}

// The drift between what a block declares for a measured setting and what calibration measured. Returns [ { kind, ... } ]:
//   undeclared-property  the database declares no property, calibration measured one (the declaration is short)
//   other-property       the measured property is not one of the declared property's longhands
//   undeclared-part      a property is declared, no part is, calibration measured one
//   elsewhere            no measured slot is a declared part
//   declarations-differ  block.json's attrMap and the database's css_element name different parts
//   indexed-subset       a resting setting read on fewer instances of a repeated part than another resting setting of the
//                        same part (one open item where its sibling reads every item)
//   one-instance         read on a part the fixture draws once inside a repeated parent (one field among the form's
//                        children): whether it paints every child cannot be read
// Slots that are named pseudo slots are not compared with a part. short: the block's slug without its namespace.
export function driftOf( { name, row, parts, state = null }, map, instances, short = null ) {
	const s = map?.settings?.[ name ];
	if ( ! s ) {
		return [];
	}
	const out = [];
	const slots = s.slots?.length ? s.slots : [ s.slot ];
	if ( ! row.css_property ) {
		out.push( { kind: 'undeclared-property', measured: s.property, slots } );
	} else if ( s.property && ! sharesLonghand( row.css_property, s.property ) ) {
		out.push( { kind: 'other-property', declared: row.css_property, measured: s.property } );
	}
	const comparable = slots.filter( ( slot ) => ! pseudoSlot( slot ) );
	if ( row.css_property && ! parts.length ) {
		out.push( { kind: 'undeclared-part', slots } );
	} else if ( parts.length && comparable.length && ! comparable.some( ( slot ) => parts.some( ( p ) => slotIsPart( slot, p.selector, short ) ) ) ) {
		out.push( { kind: 'elsewhere', declared: parts.map( ( p ) => p.part ), slots } );
	}
	const dbPart = parts.find( ( p ) => p.part === row.css_element );
	const jsonOther = parts.filter( ( p ) => 'block.json' === p.from && p.part !== row.css_element && p.selector !== dbPart?.selector );
	if ( dbPart && 'database' === dbPart.from && jsonOther.length ) {
		out.push( { kind: 'declarations-differ', database: row.css_element, blockJson: jsonOther.map( ( p ) => p.part ) } );
	}
	for ( const [ key, ks ] of indexedOf( comparable ) ) {
		const [ base, rest ] = key.split( '|' );
		const siblings = instances.resting.get( key ) || new Set();
		const drawn = instances.drawn.get( key );
		const ofBase = instances.base.get( base ) || new Set();
		if ( ! state && siblings.size > ks.size ) {
			out.push( { kind: 'indexed-subset', base, rest, measured: [ ...ks ].sort(), siblings: [ ...siblings ].sort() } );
		} else if ( 1 === ( drawn || instances.any.get( key ) || ks ).size && ofBase.size > 1 ) {
			out.push( { kind: 'one-instance', base, rest, measured: [ ...ks ], instances: ofBase.size } );
		}
	}
	return out;
}

// Whether two stored properties share a longhand (a shorthand read for a declared longhand is the same property).
function sharesLonghand( declared, measured ) {
	if ( listedProperties( declared ).includes( measured ) ) {
		return true;
	}
	const mine = new Set( longhands( declared ) );
	return longhands( measured ).some( ( p ) => mine.has( p ) );
}

// { 'base|rest': Set of indexes } over a list of slots: base is the slot up to its first indexed step, rest what follows
// the index.
function indexedOf( slots ) {
	const out = new Map();
	for ( const slot of slots ) {
		const m = String( slot ).match( /^(.*?):nth-of-type\((\d+)\)(.*)$/ );
		if ( m ) {
			const key = `${ m[ 1 ] }|${ m[ 3 ] }`;
			( out.get( key ) || out.set( key, new Set() ).get( key ) ).add( m[ 2 ] );
		}
	}
	return out;
}

const addAll = ( to, key, ks ) => ks.forEach( ( k ) => ( to.get( key ) || to.set( key, new Set() ).get( key ) ).add( k ) );

// The indexed instances of a cache: resting ({ 'base|rest': indexes } its resting settings were read on), any (the same
// over every setting), drawn (the same from the default paint's element paths, when known) and base ({ base: every
// index any reading or path shows }).
export function instancesOf( map, settingRows = {}, paths = [] ) {
	const resting = new Map();
	const any = new Map();
	const drawn = new Map();
	const base = new Map();
	for ( const [ name, s ] of Object.entries( map?.settings || {} ) ) {
		for ( const [ key, ks ] of indexedOf( s.slots?.length ? s.slots : [ s.slot ] ) ) {
			settingRows[ name ]?.css_state || s.state || addAll( resting, key, ks );
			addAll( any, key, ks );
			addAll( base, key.split( '|' )[ 0 ], ks );
		}
	}
	for ( const [ key, ks ] of indexedOf( paths ) ) {
		addAll( drawn, key, ks );
		addAll( base, key.split( '|' )[ 0 ], ks );
	}
	return { resting, any, drawn, base };
}

// The freshest cache of each block across observations { block: [ { wt, site, measured, map, candidate } ] }: a refused
// candidate is an observation, never the freshest.
export function freshest( observations ) {
	const out = {};
	for ( const [ block, list ] of Object.entries( observations ) ) {
		const kept = list.filter( ( o ) => ! o.candidate ).sort( ( a, b ) => String( b.measured ).localeCompare( String( a.measured ) ) );
		kept.length && ( out[ block ] = kept[ 0 ] );
	}
	return out;
}

// One setting's answer in one cache, as compared across caches.
export function answerOf( map, name, row, kind ) {
	const r = readingOf( map, name );
	if ( usable( r, row, kind ) ) {
		return r.setting ? `read ${ r.setting.property } at ${ JSON.stringify( r.setting.slot ) }` : 'read';
	}
	if ( ( map.dead || [] ).includes( name ) || ( r.discovered && ! Object.keys( r.discovered ).length ) ) {
		return 'dead';
	}
	if ( ( map.noMarker || [] ).includes( name ) ) {
		return 'no-marker';
	}
	if ( ( map.untestedStates || [] ).some( ( s ) => String( s ).split( ':' )[ 0 ] === name ) ) {
		return 'untested';
	}
	if ( ( map.rejected || [] ).some( ( x ) => attrOfKey( x.key ) === name ) ) {
		return 'rejected';
	}
	return 'absent';
}

// Where two observations of a block give one setting different answers (an absent answer from a cache that predates the
// setting is not a disagreement): kind same-site when one site gave two answers (a run-to-run difference), across-sites
// when each site is consistent and the sites differ (the measuring site's tokens or content decide).
export function disagreements( block, settings, list ) {
	const out = [];
	for ( const { name, row, kind } of settings ) {
		const answers = list.map( ( o ) => ( { wt: o.wt, site: o.site, measured: o.measured, candidate: !! o.candidate, answer: answerOf( o.map, name, row, kind ) } ) ).filter( ( a ) => 'absent' !== a.answer );
		if ( new Set( answers.map( ( a ) => a.answer ) ).size > 1 ) {
			const bySite = {};
			answers.forEach( ( a ) => ( bySite[ a.site ] ??= new Set() ).add( a.answer ) );
			const kind = Object.values( bySite ).some( ( s ) => s.size > 1 ) ? 'same-site' : 'across-sites';
			out.push( { block, setting: name, kind, answers } );
		}
	}
	return out;
}

// Whether a draft property is painted by a stored css_property (a comma list).
export function propertyMatches( draftProp, stored ) {
	if ( ! stored ) {
		return false;
	}
	const keys = new Set( listedProperties( stored ).flatMap( ( s ) => storedKeys( s ) ) );
	if ( reachedBy( draftProp ).some( ( k ) => keys.has( k ) ) ) {
		return true;
	}
	const mine = new Set( longhands( stored ) );
	return longhands( draftProp ).some( ( p ) => mine.has( p ) );
}

// Whether a draft row's part is the hole's part: the same slot, the root on both sides, or the declared part's classes on
// the row's last step. A row with no part (null) matches any.
export function partMatches( rowPart, hole ) {
	if ( null == rowPart ) {
		return true;
	}
	const slots = hole.slots || [];
	if ( slots.includes( rowPart ) ) {
		return true;
	}
	if ( ! hole.parts.length ) {
		return '' === rowPart && ! slots.length;
	}
	return hole.parts.some( ( p ) => slotIsPart( rowPart, p.selector, String( hole.block ).replace( /^sgs\//, '' ) ) );
}

// The draft rows that hit a hole: same block, same state, a property the setting paints, the same part.
// draftRows: [ { source, block, part (slot or null), property or look, state, rows } ].
export function hitsOf( hole, draftRows ) {
	const stored = hole.property;
	const looks = new Set( stored ? longhands( stored ).map( ( p ) => lookOfProperty( p ) ).filter( Boolean ) : [] );
	let n = 0;
	const by = {};
	for ( const d of draftRows ) {
		if ( d.block !== hole.block || ( d.state || null ) !== ( hole.state || null ) || ! partMatches( d.part, hole ) ) {
			continue;
		}
		const hit = d.look ? looks.has( d.look ) : propertyMatches( d.property, stored );
		if ( hit ) {
			n += d.rows;
			by[ d.source ] = ( by[ d.source ] || 0 ) + d.rows;
		}
	}
	return { rows: n, by };
}

// The whole coverage. rows: the database's block_attributes rows (every source); roles: { role_name: classification };
// elementsOf: { block: block.json elements }; observations: { block: [ { wt, site, measured, map, candidate } ] };
// presenceRoles: lib/calibrate-content.mjs::PRESENCE_ROLES; unitSuffixes: the modifier suffixes of kind unit
// (modifier_suffixes); fixtures: calibration-fixtures.json; draftRows as hitsOf takes them. An observation's `drawn` lists
// the element paths of the block's default paints beside its cache.
export function coverage( { rows, roles, elementsOf = {}, observations = {}, presenceRoles, unitSuffixes = [], fixtures = {}, draftRows = [] } ) {
	const own = rows.filter( ( r ) => 'sgs' === r.source || 'sgs-ext' === r.source );
	const paint = paintRoles( own, roles );
	const ctx = { paint, presenceRoles, roles };
	const fresh = freshest( observations );
	const names = new Set( own.map( ( r ) => `${ r.block_slug }|${ r.attr_name }` ) );
	const settings = [];
	const apart = { companion: 0, customCss: 0 };
	for ( const row of own ) {
		const kind = kindOf( row, ctx );
		if ( ! kind ) {
			continue;
		}
		if ( CUSTOM_CSS_ATTR === row.attr_name ) {
			apart.customCss++;
			continue;
		}
		if ( companionOf( row, unitSuffixes, names ) ) {
			apart.companion++;
			continue;
		}
		const short = row.block_slug.replace( /^sgs\//, '' );
		settings.push( { block: row.block_slug, name: row.attr_name, row, kind, state: row.css_state || null, parts: declaredParts( row.attr_name, row, elementsOf[ row.block_slug ] || {}, short ) } );
	}
	const holes = [];
	const drift = [];
	const instancesByBlock = new Map();
	const rowsByBlock = {};
	settings.forEach( ( s ) => ( ( rowsByBlock[ s.block ] ??= {} )[ s.name ] = s.row ) );
	for ( const s of settings ) {
		const f = fresh[ s.block ] || null;
		const others = ( observations[ s.block ] || [] ).filter( ( o ) => o !== f );
		const why = reasonFor( s, f?.map || null, others, { ...ctx, drawnPaths: f?.drawn || [], fixture: fixtures[ s.block ] } );
		if ( why ) {
			const r = f?.map?.settings?.[ s.name ];
			const hole = { block: s.block, setting: s.name, kind: s.kind, state: s.state, property: s.row.css_property || r?.property || null, parts: s.parts, slots: r?.slots || ( r?.slot != null ? [ r.slot ] : [] ), ...why, cache: f ? { wt: f.wt, site: f.site, measured: f.measured } : null };
			holes.push( { ...hole, hits: hitsOf( hole, draftRows ) } );
		}
		if ( f?.map ) {
			instancesByBlock.has( s.block ) || instancesByBlock.set( s.block, instancesOf( f.map, rowsByBlock[ s.block ], f.drawn || [] ) );
			driftOf( s, f.map, instancesByBlock.get( s.block ), s.block.replace( /^sgs\//, '' ) ).forEach( ( d ) => drift.push( { block: s.block, setting: s.name, ...d } ) );
		}
	}
	holes.sort( ( a, b ) => b.hits.rows - a.hits.rows || a.block.localeCompare( b.block ) || a.setting.localeCompare( b.setting ) );
	const disagree = [];
	const byBlock = {};
	settings.forEach( ( s ) => ( byBlock[ s.block ] ??= [] ).push( s ) );
	for ( const [ block, list ] of Object.entries( observations ) ) {
		list.length > 1 && disagree.push( ...disagreements( block, byBlock[ block ] || [], list ) );
	}
	return { checked: settings.length, apart, settings, holes, drift, disagreements: disagree, freshest: Object.fromEntries( Object.entries( fresh ).map( ( [ b, o ] ) => [ b, { wt: o.wt, site: o.site, measured: o.measured } ] ) ) };
}

// Counts by reason (and detail), and the share of rows whose detail is `other`.
export function summarise( result ) {
	const byReason = {};
	for ( const h of result.holes ) {
		const k = h.reason;
		const e = ( byReason[ k ] ??= { settings: 0, details: {}, hits: 0 } );
		e.settings++;
		e.hits += h.hits.rows;
		h.detail && /^[a-z-]+$/.test( h.detail ) && ( e.details[ h.detail ] = ( e.details[ h.detail ] || 0 ) + 1 );
	}
	const other = result.holes.filter( ( h ) => 'other' === h.detail ).length;
	const driftByKind = {};
	result.drift.forEach( ( d ) => ( driftByKind[ d.kind ] = ( driftByKind[ d.kind ] || 0 ) + 1 ) );
	const perBlock = {};
	for ( const d of result.drift ) {
		const e = ( perBlock[ d.block ] ??= { declarations: 0, kinds: {} } );
		[ 'undeclared-property', 'other-property', 'undeclared-part', 'elsewhere', 'declarations-differ' ].includes( d.kind ) && e.declarations++;
		e.kinds[ d.kind ] = ( e.kinds[ d.kind ] || 0 ) + 1;
	}
	for ( const h of result.holes.filter( ( x ) => 'never-planned' === x.reason && 'no-property' === x.detail ) ) {
		const e = ( perBlock[ h.block ] ??= { declarations: 0, kinds: {} } );
		e.declarations++;
		e.kinds[ 'no-property' ] = ( e.kinds[ 'no-property' ] || 0 ) + 1;
	}
	return { checked: result.checked, holes: result.holes.length, usable: result.checked - result.holes.length, byReason, otherShare: result.holes.length ? other / result.holes.length : 0, driftByKind, perBlock };
}
