// Spec 48 FR-48-60, FR-48-61, FR-48-62 (section 13): each shop surface of a draft is taken part by part. The existing
// parts first (the `sgs-pdp-buybox` template part and `sgs/buybox` settings, WooCommerce's filter blocks as the
// framework's archive template composes them, `sgs/cart`'s panel settings), a part with no home becomes a
// missing-features row (FR-48-34's row shape). Pure: units, the vocabulary (data/shop-part-vocab.json) and the framework
// facts in, one record out. Nothing is dropped: every unit lands in a mapped part, an `elsewhere` part (another
// surface owns it), a missing part, or an unmatched row that is itself a missing-features row.
// A unit is classified by what it is (RULES, over the structural facts lib/shop-parts-read.mjs reads), or by its
// position beside such a unit; an entry's word `hints` are a last resort whose part is reported as a gap row, never
// mapped.
import { readFileSync } from 'node:fs';
import { templateKey } from './fact-key.mjs';

export class ShopPartsError extends Error {}

export const VOCAB_FILE = new URL( '../data/shop-part-vocab.json', import.meta.url );
export const loadVocab = () => JSON.parse( readFileSync( VOCAB_FILE, 'utf8' ) );

const CRITERIA = [ 'text', 'tag', 'parent', 'branch', 'kind' ];
const pureBinding = ( u ) => /^\{\{[^}]+\}\}$/.test( u.text || '' );
const fx = ( u ) => u.facts?.effect || {};
const control = ( u ) => 'control' === u.kind;
const text = ( u ) => 'text' === u.kind;

// The structural tests a vocabulary entry's `rule` names, over a unit's facts (lib/shop-parts-read.mjs::unitsOf).
export const RULES = {
	bar: ( u ) => u.facts.bar,
	'h1-text': ( u ) => text( u ) && 1 === u.facts.heading,
	'add-control': ( u ) => control( u ) && fx( u ).appends && ! u.facts.loop,
	'loop-choice': ( u ) => control( u ) && 'button' === u.tag && !! u.facts.loop && ! u.facts.stepper && ! u.facts.expanded && fx( u ).sets?.length > 0 && ! fx( u ).writesStore,
	stepper: ( u ) => u.facts.stepper,
	disclosure: ( u ) => u.facts.expanded || u.facts.disclosed,
	price: ( u ) => text( u ) && u.facts.money && pureBinding( u ) && ! u.conds.length,
	closes: ( u ) => control( u ) && fx( u ).closes && ! u.facts.loop,
	count: ( u ) => text( u ) && u.facts.count,
	'line-edit': ( u ) => control( u ) && !! u.facts.loop && ! u.facts.stepper && u.facts.editsBasket,
	// A line's own control shown on some lines only, that leaves the surface for somewhere else with that line's item (the
	// item's product page, where its options open) without changing the basket.
	'line-options': ( u ) => control( u ) && !! u.facts.loop && u.facts.itemBound && u.facts.itemCond && u.facts.leaves && ! u.facts.stepper && ! u.facts.editsBasket && ! fx( u ).appends,
	'line-image': ( u ) => 'image' === u.kind && !! u.facts.loop,
	'line-text': ( u ) => text( u ) && !! u.facts.loop,
	total: ( u ) => text( u ) && u.facts.money && pureBinding( u ) && ! u.facts.loop,
	'form-route': ( u ) => control( u ) && !! u.facts.route?.form && ! u.facts.loop,
	'page-route': ( u ) => control( u ) && !! u.facts.route && ! u.facts.route.form && ! u.facts.loop && ! u.facts.empty,
	'empty-text': ( u ) => text( u ) && u.facts.empty,
	'empty-control': ( u ) => control( u ) && u.facts.empty && ! fx( u ).appends,
	import: ( u ) => 'import' === u.kind,
	select: ( u ) => control( u ) && 'select' === u.tag,
	range: ( u ) => control( u ) && 'range' === u.facts.inputType,
	'text-input': ( u ) => control( u ) && [ 'text', 'search' ].includes( u.facts.inputType ),
	checkbox: ( u ) => control( u ) && 'checkbox' === u.facts.inputType,
	switch: ( u ) => control( u ) && 'switch' === u.facts.role,
	resets: ( u ) => control( u ) && fx( u ).resets && u.facts.narrows,
	'toggle-panel': ( u ) => control( u ) && fx( u ).toggles && ! u.facts.narrows && ! u.facts.loop,
	'loop-toggle': ( u ) => control( u ) && u.facts.expanded && !! u.facts.loop && ! u.facts.narrows,
	'loop-narrow': ( u ) => control( u ) && !! u.facts.loop && u.facts.narrows,
};

const haystack = ( u ) => ` | ${ [ u.tag, u.text, u.aria, u.placeholder, u.type, u.on, u.href ].map( ( v ) => v || '' ).join( ' | ' ) } | `;
const labelOf = ( u ) => u.text || u.aria || u.placeholder || u.src || u.type || u.tag;
const hintHolds = ( hint, u ) => {
	const field = { text: haystack( u ), tag: u.tag, parent: u.parent || '', branch: u.conds.join( ' > ' ), kind: u.kind };
	return Object.entries( hint ).every( ( [ k, rx ] ) => rx.test( field[ k ] ) );
};
const ruleHolds = ( e, u ) => !! e.rule && !! RULES[ e.rule ]( u );
const hinted = ( e, u ) => e.hints.some( ( h ) => hintHolds( h, u ) );
const compileHints = ( e ) => ( e.hints || [] ).map( ( h ) => Object.fromEntries( CRITERIA.filter( ( k ) => h[ k ] ).map( ( k ) => [ k, new RegExp( h[ k ], 'i' ) ] ) ) );

// The vocabulary with every `home` checked against the framework facts and every entry checked against the drafts:
// `env.attrs` maps a block slug to the set of its attribute names (the framework DB), `env.files` maps a repo path to its
// text, `env.fixtures` (optional) lists draft surfaces (lib/shop-parts-read.mjs::readShopSurfaces results). A settings
// pattern that finds no attribute, a block the DB does not hold, a part or template file that does not hold the named
// block, a duplicate id, a rule RULES does not hold, an entry with neither a rule nor a hint, or (with fixtures) an entry
// whose rule and hints match no unit of any fixture is refused: the vocabulary is stale. Throws one ShopPartsError
// listing every stale entry.
export function resolveVocab( vocab, env ) {
	const problems = [];
	const ids = new Set();
	const entries = vocab.entries.map( ( e ) => {
		if ( ids.has( e.id ) ) {
			problems.push( `${ e.id }: the id is used by an earlier entry` );
		}
		ids.add( e.id );
		if ( e.rule && ! RULES[ e.rule ] ) {
			problems.push( `${ e.id }: no structural rule ${ e.rule } (lib/shop-parts.mjs::RULES)` );
		}
		if ( ! e.rule && ! ( e.hints || [] ).length ) {
			problems.push( `${ e.id }: names neither a rule nor a hint, so no unit can reach it` );
		}
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
				for ( const a of Object.keys( home.also || {} ) ) {
					names.has( a ) || problems.push( `${ e.id }: no ${ home.block } attribute ${ a } for its fixed value` );
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
		return { ...e, home, rule: e.rule && RULES[ e.rule ] ? e.rule : null, hints: compileHints( e ) };
	} );
	if ( env.fixtures ) {
		const units = env.fixtures.flatMap( ( surfaces ) => surfaces.flatMap( ( s ) => s.units.map( ( u ) => ( { kind: s.kind, u } ) ) ) );
		for ( const e of entries ) {
			if ( ! units.some( ( { kind, u } ) => kind === e.surface && ( ruleHolds( e, u ) || hinted( e, u ) ) ) ) {
				problems.push( `${ e.id }: its rule and hints match no unit of any draft read (a stale criterion)` );
			}
		}
	}
	if ( problems.length ) {
		throw new ShopPartsError( `shop-part vocabulary refused:\n  ${ problems.join( '\n  ' ) }` );
	}
	return { surfaces: vocab.surfaces, entries };
}

const literal = ( t ) => ( t && ! t.includes( '{{' ) ? t : null );

// One unit's classification: { entry, by: 'structure' | 'position' | 'hint' } or null. `placed` maps a row element
// number to the entry (one that takes `labels`) a structurally classified unit in that row took.
function classify( u, entries, placed ) {
	const byRule = entries.find( ( e ) => ruleHolds( e, u ) );
	if ( byRule ) {
		return { entry: byRule, by: 'structure' };
	}
	if ( 'text' === u.kind && literal( u.text ) && placed.has( u.rowN ) ) {
		return { entry: placed.get( u.rowN ), by: 'position' };
	}
	const byHint = entries.find( ( e ) => hinted( e, u ) );
	return byHint ? { entry: byHint, by: 'hint' } : null;
}

// A part's draft locator: the template key (`<dc>/<data-dc-tpl>`, lib/fact-key.mjs) of each element its units were found
// on, in stamp order; a unit the reader could not stamp (no draft component, or outside the template) adds none.
export const locatorsOf = ( units ) => [ ...new Set( units.filter( ( u ) => u.dc && Number.isInteger( u.tpl ) ).sort( ( a, b ) => a.tpl - b.tpl ).map( ( u ) => templateKey( { dc: u.dc, tpl: u.tpl } ) ) ) ];

// One surface's units into parts. A part is one vocabulary id reached by structure, or by position (a literal text run in
// the same row as a unit an entry with `labels` took structurally: the label beside a value); a unit only a word hint
// names goes to that id's gap part (`<id>:hint`, a missing part saying so); units matching nothing become one
// `unmatched` part per distinct label. Control-only surfaces drop a text run unless its entry claims text.
export function matchSurface( kind, units, vocab ) {
	const cfg = vocab.surfaces[ kind ];
	const entries = vocab.entries.filter( ( e ) => e.surface === kind );
	const placed = new Map();
	for ( const u of units ) {
		const e = entries.find( ( x ) => ruleHolds( x, u ) );
		if ( e?.labels && null != u.rowN && ! placed.has( u.rowN ) ) {
			placed.set( u.rowN, e );
		}
	}
	const parts = new Map();
	for ( const u of units ) {
		const hit = classify( u, entries, placed );
		if ( cfg.controlsOnly && 'text' === u.kind && ! hit?.entry.claimsText ) {
			continue;
		}
		let id;
		let make;
		if ( ! hit ) {
			id = `unmatched:${ kind }:${ labelOf( u ).toLowerCase().replace( /\s+/g, ' ' ) }`;
			make = () => ( { label: labelOf( u ), home: { type: 'missing', reason: `no part or setting in the framework is known for this ${ u.kind } (${ u.tag })` } } );
		} else if ( 'hint' === hit.by ) {
			id = `${ hit.entry.id }:hint`;
			make = () => ( { label: hit.entry.label, home: { type: 'missing', reason: `only words name this ${ u.kind } (${ u.tag }) as "${ hit.entry.label }": no structural fact of the draft confirms it, so it is a gap, not a mapped part`, hint: hit.entry.id } } );
		} else {
			id = hit.entry.id;
			make = () => ( { label: hit.entry.label, home: hit.entry.home } );
		}
		if ( ! parts.has( id ) ) {
			parts.set( id, { id, surface: kind, ...make(), units: [], by: new Set() } );
		}
		parts.get( id ).units.push( { kind: u.kind, tag: u.tag, label: labelOf( u ), conds: u.conds, file: u.file, dc: u.dc, tpl: u.tpl } );
		if ( hit ) {
			parts.get( id ).by.add( hit.by );
		}
	}
	return [ ...parts.values() ].map( ( p ) => {
		const h = p.home;
		const value = 'setting' === h.type && 'text' === h.valueFrom ? literal( p.units.find( ( u ) => literal( u.label ) )?.label ) : null;
		return {
			id: p.id,
			label: p.label,
			home: 'setting' === h.type ? { type: h.type, block: h.block, settings: h.resolved } : Object.fromEntries( Object.entries( h ).filter( ( [ k ] ) => 'resolved' !== k ) ),
			write: value ? { ...( h.also || {} ), [ h.resolved[ 0 ] ]: value } : null,
			by: [ ...p.by ].sort(),
			units: p.units.length,
			locators: locatorsOf( p.units ),
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
			hinted: all.filter( ( p ) => p.home.hint ).length,
			unmatched: all.filter( ( p ) => p.id.startsWith( 'unmatched:' ) ).length,
			problems: out.filter( ( s ) => s.problem ).length,
		},
	};
}
