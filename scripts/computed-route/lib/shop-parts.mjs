// Spec 48 FR-48-60, FR-48-61, FR-48-62 (section 13): each shop surface of a draft is taken part by part. The existing
// parts first (the `sgs-pdp-buybox` template part and `sgs/buybox` settings, WooCommerce's filter blocks as the
// framework's archive template composes them, `sgs/cart`'s panel settings), a part with no home becomes a
// missing-features row (FR-48-34's row shape). Pure: units, the vocabulary (data/shop-part-vocab.json) and the framework
// facts in, one record out. Nothing is dropped: every unit lands in a mapped part, an `elsewhere` part (another
// surface owns it), a missing part, or an unmatched row that is itself a missing-features row.
import { readFileSync } from 'node:fs';

export class ShopPartsError extends Error {}

export const VOCAB_FILE = new URL( '../data/shop-part-vocab.json', import.meta.url );
export const loadVocab = () => JSON.parse( readFileSync( VOCAB_FILE, 'utf8' ) );

const CRITERIA = [ 'text', 'tag', 'parent', 'branch', 'kind' ];

// The vocabulary's regexes, compiled once (case-insensitive), with every `home` checked against the framework facts:
// `env.attrs` maps a block slug to the set of its attribute names (the framework DB), `env.files` maps a repo path to
// its text. A settings pattern that finds no attribute, a block the DB does not hold, or a part or template file that does
// not hold the named block is refused: the vocabulary is stale and its parts would write nothing. Throws one
// ShopPartsError listing every stale entry.
export function resolveVocab( vocab, env ) {
	const problems = [];
	const entries = vocab.entries.map( ( e ) => {
		const home = { ...e.home };
		if ( 'setting' === home.type ) {
			const names = env.attrs[ home.block ];
			if ( ! names ) {
				problems.push( `${ e.id }: the framework DB holds no block ${ home.block }` );
			} else {
				home.resolved = home.settings.map( ( pattern ) => {
					const hit = [ ...names ].filter( ( n ) => new RegExp( pattern ).test( n ) );
					if ( ! hit.length ) {
						problems.push( `${ e.id }: no ${ home.block } attribute matches ${ pattern }` );
					}
					return hit;
				} ).flat();
				if ( home.valueFrom && 1 !== home.resolved.length ) {
					problems.push( `${ e.id }: valueFrom needs exactly one setting, got ${ home.resolved.length }` );
				}
			}
		} else if ( 'part' === home.type || 'template-block' === home.type ) {
			const text = env.files[ home.file ];
			if ( undefined === text ) {
				problems.push( `${ e.id }: ${ home.file } is not readable` );
			} else if ( ! text.includes( home.contains ) ) {
				problems.push( `${ e.id }: ${ home.file } holds no ${ home.contains }` );
			}
		}
		return { ...e, home, rx: Object.fromEntries( CRITERIA.filter( ( k ) => e[ k ] ).map( ( k ) => [ k, new RegExp( e[ k ], 'i' ) ] ) ) };
	} );
	if ( problems.length ) {
		throw new ShopPartsError( `shop-part vocabulary refused:\n  ${ problems.join( '\n  ' ) }` );
	}
	return { surfaces: vocab.surfaces, entries };
}

const haystack = ( u ) => ` | ${ [ u.tag, u.text, u.aria, u.placeholder, u.type, u.on, u.href ].map( ( v ) => v || '' ).join( ' | ' ) } | `;
const labelOf = ( u ) => u.text || u.aria || u.placeholder || u.src || u.type || u.tag;
const matches = ( e, u ) => {
	const field = { text: haystack( u ), tag: u.tag, parent: u.parent || '', branch: u.conds.join( ' > ' ), kind: u.kind };
	return Object.entries( e.rx ).every( ( [ k, rx ] ) => rx.test( field[ k ] ) );
};
const literal = ( text ) => ( text && ! text.includes( '{{' ) ? text : null );

// One surface's units into parts. A part is one vocabulary id (its entries may be several); units matching nothing
// become one `unmatched` part per distinct label. Control-only surfaces drop a text run unless an entry claims it.
export function matchSurface( kind, units, vocab ) {
	const cfg = vocab.surfaces[ kind ];
	const entries = vocab.entries.filter( ( e ) => e.surface === kind );
	const parts = new Map();
	for ( const u of units ) {
		const hit = entries.find( ( e ) => matches( e, u ) );
		if ( cfg.controlsOnly && 'text' === u.kind && ! hit?.claimsText ) {
			continue;
		}
		const id = hit ? hit.id : `unmatched:${ kind }:${ labelOf( u ).toLowerCase().replace( /\s+/g, ' ' ) }`;
		if ( ! parts.has( id ) ) {
			parts.set( id, { id, surface: kind, label: hit ? hit.label : labelOf( u ), home: hit ? hit.home : { type: 'missing', reason: `no part or setting in the framework is known for this ${ u.kind } (${ u.tag })` }, units: [] } );
		}
		parts.get( id ).units.push( { kind: u.kind, tag: u.tag, label: labelOf( u ), conds: u.conds, file: u.file } );
	}
	return [ ...parts.values() ].map( ( p ) => {
		const h = p.home;
		const value = 'setting' === h.type && 'text' === h.valueFrom ? literal( p.units.find( ( u ) => literal( u.label ) )?.label ) : null;
		return {
			id: p.id,
			label: p.label,
			home: 'setting' === h.type ? { type: h.type, block: h.block, settings: h.resolved } : Object.fromEntries( Object.entries( h ).filter( ( [ k ] ) => 'resolved' !== k ) ),
			write: value ? { [ h.resolved[ 0 ] ]: value } : null,
			units: p.units.length,
			sample: [ ...new Set( p.units.map( ( u ) => u.label ) ) ].slice( 0, 4 ),
		};
	} );
}

// FR-48-34's row shape, one per missing part.
export const missingRow = ( kind, part, record, file, mainFlow ) => ( {
	rowId: `missing:shop:${ kind }:${ part.id }`,
	draftId: `${ record }:${ part.id }`,
	construct: `shop ${ kind } part: ${ part.label }`,
	from: 'shop-parts',
	key: `${ file }#${ kind }/${ part.id }`,
	line: `${ part.label }: ${ part.home.reason } (${ part.units } unit${ 1 === part.units ? '' : 's' })`,
	mainFlow,
	why: part.home.reason,
} );

// The client's record: for each surface kind its parts by home, the settings to write, and the missing-features rows.
// `surfaces` is lib/shop-parts-read.mjs::readShopSurfaces' result. A surface the reader could not find stays in the record
// with its problem, never as an empty success.
export function buildRecord( { client, surfaces, vocab } ) {
	const out = surfaces.map( ( s ) => {
		const parts = s.problem ? [] : matchSurface( s.kind, s.units, vocab );
		const missing = parts.filter( ( p ) => 'missing' === p.home.type ).map( ( p ) => missingRow( s.kind, p, s.record, s.file, vocab.surfaces[ s.kind ].mainFlow ) );
		return { kind: s.kind, record: s.record, file: s.file, problem: s.problem, units: s.units.length, parts, missing };
	} );
	const all = out.flatMap( ( s ) => s.parts );
	const count = ( type ) => all.filter( ( p ) => type === p.home.type ).length;
	return {
		client,
		surfaces: out,
		counts: {
			units: out.reduce( ( n, s ) => n + s.units, 0 ),
			parts: all.length,
			mapped: all.filter( ( p ) => ! [ 'missing', 'elsewhere' ].includes( p.home.type ) ).length,
			missing: count( 'missing' ),
			elsewhere: count( 'elsewhere' ),
			problems: out.filter( ( s ) => s.problem ).length,
		},
	};
}
