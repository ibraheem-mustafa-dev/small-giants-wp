// The mechanism census: reads one surface's walker report and Fill run into rows and gives each row a mechanism signature,
// so rows with one cause group together across surfaces and clients (never by element number or client name).
// A signature is block family (framework DB, read-only), property family (lib/css-families.mjs), interaction state, run-state
// pattern, tier pattern (which widths differ), side (walker-only, fill-unwritten, fill-held, both) and Fill reason class.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { familyOf, physicalOf, isCssProperty } from './css-families.mjs';
import { classify, loadRules } from './fill-census.mjs';

const VOCAB = JSON.parse( fs.readFileSync( path.join( path.dirname( fileURLToPath( import.meta.url ) ), '..', 'data', 'census-mechanisms.json' ), 'utf8' ) );
const FILL_STATE = VOCAB.fillStatePatterns.map( ( p ) => new RegExp( p, 'i' ) );
const INVENTORY_ID = new RegExp( VOCAB.inventoryIdPattern );
export const SIGNATURE_PARTS = [ 'block', 'property', 'state', 'runStates', 'tier', 'side', 'reason' ];

const json = ( v ) => JSON.stringify( v ?? null );
const uniqSorted = ( list ) => [ ...new Set( list ) ].sort( ( a, b ) => a - b );
const SEP = '\u0001';
const EFFECT_OF = new Map( Object.entries( VOCAB.composedEffects ).flatMap( ( [ effect, names ] ) => names.map( ( n ) => [ n, effect ] ) ) );

// A part or effect row's key is `<the client's part name> <hover|press|rest>[:<property>]` (the walker's parts pass): the name
// is the client's label and no part of the mechanism. Returns { state, family } read from the key and the row's two sides
// (an effect row names the side that lacks the effect), or null for any other row.
export function partParts( kind, key, cell = {} ) {
	const m = ( VOCAB.partKind === kind || VOCAB.effectKind === kind ) && /\s(hover|press|rest)(?::(.+))?$/.exec( String( key ?? '' ).trim() );
	if ( ! m ) {
		return null;
	}
	const state = 'press' === m[ 1 ] ? VOCAB.pressState : 'rest' === m[ 1 ] ? 'default' : m[ 1 ];
	if ( VOCAB.effectKind === kind ) {
		const none = ( v ) => String( v ?? VOCAB.noneSide ) === VOCAB.noneSide;
		return { state, family: `${ VOCAB.effectKind }:${ m[ 1 ] }:${ none( cell.live ) ? 'live-lacks' : none( cell.draft ) ? 'draft-lacks' : 'differs' }` };
	}
	return { state, family: `${ VOCAB.partKind }:${ 'layers' === m[ 2 ] ? `${ m[ 1 ] }-layers` : propertyFamily( 'style', m[ 2 ] ) ?? m[ 2 ] }` };
}

// The family of a property key: a shorthand family's name for a box edge, corner or axis longhand, the composed effect for a
// transform longhand, the property itself for any other CSS property (a mixed shorthand's longhands stay apart), `box:<key>` for a measured box, `<kind>:<first word>` for a presence, auto-text or link row (its
// quoted text is the content, not the mechanism), `part:<property family>` and `effect:<hover|press>:<side that lacks it>` for a
// part or effect row (the client's part label is dropped), the motion-record family for an inventory ID, and `walker:<key>` for a
// walker pseudo-key (painted-ground, icon-fill). null when the key is empty.
export function propertyFamily( kind, key, value = null, cell = {} ) {
	const k = String( key ?? '' ).trim();
	if ( ! k ) {
		return null;
	}
	if ( VOCAB.boxKind === kind ) {
		return `box:${ k }`;
	}
	const part = partParts( kind, k, cell );
	if ( part ) {
		return part.family;
	}
	if ( VOCAB.keyWordKinds.includes( kind ) ) {
		return `${ kind }:${ k.split( /\s/ )[ 0 ] }`;
	}
	if ( INVENTORY_ID.test( k ) || ( ! isCssProperty( k ) && INVENTORY_ID.test( String( value ?? '' ) ) ) ) {
		return VOCAB.inventoryIdFamily;
	}
	if ( isCssProperty( k ) ) {
		const fam = familyOf( k );
		return EFFECT_OF.get( k ) ?? ( fam && 'mixed' !== fam.kind ? fam.short : physicalOf( k ) );
	}
	return `walker:${ k }`;
}

// The width pattern of a row: `flat` when it has no width of its own, `all` when it differs at every width of its surface,
// else the widths joined (`375+768`).
export function tierPattern( widths, allWidths ) {
	if ( ! widths || ! widths.length ) {
		return 'flat';
	}
	const own = uniqSorted( widths );
	return allWidths.length && allWidths.every( ( w ) => own.includes( w ) ) ? 'all' : own.join( '+' );
}

// Builds `lookup( slug ) → { slug, parent_block } | null` from the framework DB's blocks table (read-only handle).
export function blockLookup( db ) {
	const by = new Map( db.prepare( 'SELECT slug, parent_block FROM blocks' ).all().map( ( r ) => [ r.slug, r ] ) );
	return ( slug ) => by.get( slug ) ?? null;
}

// A block's family: the root of its parent chain in the framework DB (`sgs/site-header-row` → `sgs/site-header`), or null
// when the DB does not hold the block.
export function blockFamily( slug, lookup ) {
	let row = lookup( slug );
	for ( let hops = 0; row && row.parent_block && hops < 8; hops++ ) {
		row = lookup( row.parent_block ) ?? row;
	}
	return row ? row.slug : null;
}

// The `ref → block slug` map of a Fill run's tree (a node carries its ref as a `cr-ref-…` class).
export function refBlocks( tree ) {
	const out = new Map();
	const walk = ( nodes ) => {
		for ( const n of Array.isArray( nodes ) ? nodes : [] ) {
			const ref = String( n.attributes?.className ?? '' ).match( /cr-ref-[\w-]+/ );
			ref && out.set( ref[ 0 ], n.name );
			walk( n.innerBlocks );
		}
	};
	walk( tree );
	return out;
}

// Walker rows of one report as items: rows de-duplicated by (width, state, element identity, kind, key, values) so a pair
// nested in another reports an element once, run states that read the same collapsed, then one item per (identity, kind,
// key) holding its cells by width. A row with no `ref` belongs to its pair (an element-less row such as a transition list).
// Returns { items, widths, runStates, rows, duplicates }.
export function walkerItems( report ) {
	const runs = report?.runs ?? [];
	const widths = uniqSorted( runs.map( ( r ) => r.width ) );
	const runStates = [ ...new Set( runs.map( ( r ) => r.state ) ) ];
	const seen = new Set();
	const items = new Map();
	let rows = 0;
	let duplicates = 0;
	for ( const run of runs ) {
		const ordinal = new Map();
		for ( const [ pair, p ] of Object.entries( run.pairs ) ) {
			for ( const d of p.diffs ) {
				rows++;
				const identity = d.ref ? `${ d.ref }${ SEP }${ d.path || '' }` : `@${ pair }`;
				const same = [ identity, d.kind, d.key, json( d.draft ), json( d.live ) ].join( SEP );
				// Rows with no ref cannot be told apart by identity, so identical ones in one pair keep their count.
				const counter = `${ pair }|${ same }`;
				const n = d.ref ? 0 : ( ordinal.get( counter ) ?? -1 ) + 1;
				d.ref || ordinal.set( counter, n );
				const rowKey = [ run.width, run.state, same, n ].join( SEP );
				if ( seen.has( rowKey ) ) {
					duplicates++;
					continue;
				}
				seen.add( rowKey );
				const itemKey = [ identity, d.kind, d.key, n ].join( SEP );
				if ( ! items.has( itemKey ) ) {
					items.set( itemKey, { ref: d.ref ?? null, path: d.path || '', pair, kind: d.kind, key: d.key, block: d.block ?? null, cells: new Map() } );
				}
				const item = items.get( itemKey );
				const cellKey = [ run.width, json( d.draft ), json( d.live ) ].join( SEP );
				if ( ! item.cells.has( cellKey ) ) {
					item.cells.set( cellKey, { width: run.width, draft: d.draft, live: d.live, runStates: new Set() } );
				}
				item.cells.get( cellKey ).runStates.add( run.state );
			}
		}
	}
	const list = [ ...items.values() ].map( ( i ) => {
		const cells = [ ...i.cells.values() ].map( ( c ) => ( { ...c, runStates: [ ...c.runStates ] } ) );
		return { ...i, cells, widths: uniqSorted( cells.map( ( c ) => c.width ) ), runStates: [ ...new Set( cells.flatMap( ( c ) => c.runStates ) ) ] };
	} );
	return { items: list, widths, runStates, rows, duplicates };
}

// The interaction state a Fill row speaks for, read from its reason text.
function fillState( reason ) {
	for ( const re of FILL_STATE ) {
		const m = re.exec( String( reason ?? '' ) );
		if ( m ) {
			return m[ 1 ].toLowerCase();
		}
	}
	return 'default';
}

// A Fill row's per-width value map's widths, or null for a plain value.
function valueWidths( value ) {
	try {
		const v = JSON.parse( value );
		const keys = v && 'object' === typeof v ? Object.keys( v ).filter( ( k ) => /^\d+$/.test( k ) ) : [];
		return keys.length ? keys.map( Number ) : null;
	} catch {
		return null;
	}
}

// The Fill run's rows: every UNMAPPED and already-held row.
export function fillRows( run ) {
	const row = ( origin, r, state ) => ( { origin, node: r.node, slot: r.slot || '', property: r.property, state, widths: valueWidths( r.value ), value: r.value, reason: r.reason, block: r.block } );
	return [
		...( run.unmapped ?? [] ).map( ( r ) => row( 'unmapped', r, fillState( r.reason ) ) ),
		...( run.held ?? [] ).map( ( r ) => row( 'held', r, r.state || 'default' ) )
	];
}

const keyOf = ( node, slot, property, state ) => [ node, slot || '', property, state ].join( SEP );

// Joins one surface's walker items to its Fill rows and returns the census rows (one per walker item or unjoined Fill row),
// each carrying the signature parts. `run` is { unmapped, held, writes, confirm, tree }; `lookup` is `blockLookup`'s result.
export function surfaceRows( { client, surface, report, run, lookup, rules = loadRules() } ) {
	const walk = report ? walkerItems( report ) : { items: [], widths: [], runStates: [], rows: 0, duplicates: 0 };
	const fill = fillRows( run ?? {} );
	const blocks = refBlocks( run?.tree );
	const allWidths = walk.widths.length ? walk.widths : uniqSorted( ( run?.confirm ?? [] ).map( ( c ) => c.width ) );
	const fillBy = new Map();
	for ( const f of fill ) {
		const k = keyOf( f.node, f.slot, f.property, f.state );
		fillBy.set( k, [ ...( fillBy.get( k ) ?? [] ), f ] );
	}
	const wrote = new Set( ( run?.writes ?? [] ).map( ( w ) => keyOf( w.node, w.slot, w.prop, 'default' ) ) );
	const confirmBy = new Map( ( run?.confirm ?? [] ).map( ( c ) => [ keyOf( c.node, c.slot, c.property, c.state ), c.verdict ] ) );
	const ruleOf = ( f ) => classify( f.reason, 'unmapped' === f.origin ? rules.unmapped : rules.held );
	const slugOf = ( ref, slug, cls ) => slug || blocks.get( ref ) || ( cls && cls.startsWith( 'sgs-' ) ? `sgs/${ cls.slice( 4 ) }` : null );
	const used = new Set();
	const rows = [];
	for ( const item of walk.items ) {
		const cell = item.cells[ 0 ];
			const state = VOCAB.interactionKinds.includes( item.kind ) ? item.kind : partParts( item.kind, item.key, cell )?.state ?? 'default';
		const key = item.ref ? keyOf( item.ref, item.path, item.key, state ) : null;
		const hits = key ? fillBy.get( key ) ?? [] : [];
		const hit = hits.find( ( h ) => 'unmapped' === h.origin ) ?? hits[ 0 ];
		hits.forEach( ( h ) => used.add( h ) );
		const rule = hit ? ruleOf( hit ) : null;
		const reason = hit ? rule?.class ?? null : ( key && wrote.has( key ) ? VOCAB.reasonClasses.wrote : VOCAB.reasonClasses.walkerOnly );
		rows.push( {
			client, surface, element: item.ref ? `${ item.ref }${ item.path ? ` ${ item.path }` : '' }` : item.pair,
			slug: item.ref ? slugOf( item.ref, hit?.block, item.block ) : null, surfaceLevel: ! item.ref,
			kind: item.kind, key: item.key, property: propertyFamily( item.kind, item.key, null, cell ), state,
			runStates: item.runStates.length === walk.runStates.length ? 'all' : 'some', tier: tierPattern( item.widths, allWidths ),
			side: hit ? 'both' : 'walker-only', reason, reasonText: hit?.reason ?? null, owner: rule?.owner ?? null,
			draft: cell.draft, live: cell.live, confirm: key ? confirmBy.get( key ) ?? null : null
		} );
	}
	for ( const f of fill.filter( ( r ) => ! used.has( r ) ) ) {
		const rule = ruleOf( f );
		rows.push( {
			client, surface, element: `${ f.node }${ f.slot ? ` ${ f.slot }` : '' }`, slug: slugOf( f.node, f.block ), surfaceLevel: false,
			kind: 'fill', key: f.property, property: propertyFamily( 'style', f.property, f.value ), state: f.state, runStates: 'all',
			tier: tierPattern( f.widths, allWidths ), side: VOCAB.fillSides[ f.origin ], reason: rule?.class ?? null, reasonText: f.reason ?? null, owner: rule?.owner ?? null,
			draft: f.value, live: null, confirm: confirmBy.get( keyOf( f.node, f.slot, f.property, f.state ) ) ?? null
		} );
	}
	return { rows: rows.map( ( r ) => ( { ...r, block: r.surfaceLevel ? VOCAB.surfaceBlockFamily : ( r.slug ? blockFamily( r.slug, lookup ) : null ) } ) ), walk };
}

// The signature of a row: its parts joined, or null when any part is missing (a row no signature covers).
export function signatureOf( row ) {
	const parts = SIGNATURE_PARTS.map( ( p ) => row[ p ] );
	return parts.some( ( p ) => null === p || undefined === p || '' === p ) ? null : SIGNATURE_PARTS.map( ( p, i ) => `${ p }=${ parts[ i ] }` ).join( ' | ' );
}

// Groups rows by signature, whatever their client or surface. Returns { groups, unclassified }: each group holds its parts,
// per-client row counts, up to `examples` example rows, a Fill reason sample and the owning Spec 48 item.
export function groupRows( rows, { examples = 2 } = {} ) {
	const by = new Map();
	const unclassified = [];
	for ( const row of rows ) {
		const signature = signatureOf( row );
		if ( ! signature ) {
			unclassified.push( row );
			continue;
		}
		if ( ! by.has( signature ) ) {
			by.set( signature, { signature, parts: Object.fromEntries( SIGNATURE_PARTS.map( ( p ) => [ p, row[ p ] ] ) ), total: 0, byClient: {}, examples: [], reasonText: null, owner: null } );
		}
		const g = by.get( signature );
		g.total++;
		g.byClient[ row.client ] = ( g.byClient[ row.client ] ?? 0 ) + 1;
		g.reasonText ??= row.reasonText;
		g.owner ??= row.owner;
		g.examples.length < examples && g.examples.push( { client: row.client, surface: row.surface, element: row.element, draft: row.draft, live: row.live } );
	}
	return { groups: [ ...by.values() ].sort( ( a, b ) => b.total - a.total || a.signature.localeCompare( b.signature ) ), unclassified };
}
