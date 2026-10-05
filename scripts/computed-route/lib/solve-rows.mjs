// Solve's reading of a walker report (FR-47-3): which open rows it may write, the draft value at every width for each
// (node, element, property), and the classification of the rows that survive the last round.
import { isContentRow } from './issue-classes.mjs';

// The property kinds Solve writes through the property-to-setting resolver (box rows are split off and never written).
// Content rows (text, presence, link coverage) are not here: they resolve through calibration's content entries
// (resolveContent) and have their own group list.
export const WRITABLE_KINDS = [ 'style', 'hover', 'box' ];

// The CSS property a row's key stands for: icon size rows (on the svg's path) are its width and height; a painted
// ground (the colour an element shows, from its own background or a covering layer) is its background colour.
export const cssProp = ( key ) => ( 'painted-ground' === key ? 'background-color' : key.replace( /^icon-(width|height)$/, '$1' ) );

// The setting state a row's values belong to, from the surface's map of walker state to setting state
// ({ "<walker state>": null | "scrolled" | "open" | "shrunk" | "current" }). undefined = not writable: the walker state
// is unmapped, or the row is a hover in a non-rest state (no setting holds hover-while-scrolled).
export function settingState( r, stateMap ) {
	if ( ! stateMap || ! Object.hasOwn( stateMap, r.state ) ) {
		return undefined;
	}
	if ( 'hover' === r.kind ) {
		return null === stateMap[ r.state ] ? 'hover' : undefined;
	}
	return stateMap[ r.state ];
}

// Every element path a block's calibration knows: its measured elements, the slots and reaches of its settings, and the
// slots its DISCOVERED enum settings paint. A row on a path outside this list is `unmapped-element`; a row whose only
// evidence is a discovered slot must still reach lib/resolve.mjs::resolveDiscovered, so that source is part of the list.
// lib/triage.mjs::resolveIssue builds the same three-source list inline, so a row triage finds resolvable is a row the
// write round finds resolvable.
export function knownPaths( cal ) {
	return [ ...Object.keys( cal?.elements || {} ), ...Object.values( cal?.settings || {} ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] ),
		...Object.values( cal?.discovered || {} ).flatMap( ( props ) => Object.values( props || {} ).flatMap( ( d ) => d.slots || [] ) ) ];
}

// One key per written thing: node ref, element path, property, setting state ('' = rest).
export const groupKey = ( r, state ) => `${ r.ref }|${ r.path }|${ r.key }|${ state || '' }`;

// Every open (unaccepted) row of a report, flattened with its run's state and width and its pair name.
export function openRows( report ) {
	const out = [];
	for ( const run of report.runs || [] ) {
		for ( const [ pair, p ] of Object.entries( run.pairs || {} ) ) {
			for ( const d of p.diffs || [] ) {
				if ( ! d.accepted ) {
					out.push( { ...d, pair, state: run.state, width: run.width } );
				}
			}
		}
	}
	return out;
}

// One draft snapshot's value of prop: on a pseudo layer, at the hover end state, the painted ground (a full-check value
// chrome-walk.mjs stores on extras), a text run's row spacing (row-gap, from its rows), or the collected style.
function draftValueOf( d, prop, hover, pseudo ) {
	if ( pseudo ) {
		return d.pseudo?.[ pseudo ]?.[ prop ];
	}
	if ( hover ) {
		return d.hover?.[ prop ];
	}
	if ( 'painted-ground' === prop ) {
		return d.extras?.ground;
	}
	if ( 'row-gap' === prop && undefined === d.styles?.[ prop ] && d.rows ) {
		return `${ d.rows.space }px`;
	}
	return d.styles?.[ prop ];
}

// The draft's value of `prop` on a pair at every width it was measured (rest styles, or the hover end state), and the
// draft font size there (for em conversions). Read from the pair snapshots, so widths with no difference count too.
// walkerStates: only runs in these walker states are read (the states mapped to the group's setting state).
// pseudo ('::before' / '::after'): the value is read on that painting layer of the pair's element.
// declared: the value the draft's matched rules declare for prop at each width (the walker's DevTools read), when any.
// At a width where a divergence-ledger entry covers the row, the target is the entry's decided value instead, and the
// width is listed in held (no declared value replaces it).
export function draftValues( report, pair, prop, hover, walkerStates = null, pseudo = null ) {
	const perWidth = {};
	const fontPx = {};
	const declared = {};
	const held = [];
	for ( const run of report.runs || [] ) {
		if ( walkerStates && ! walkerStates.includes( run.state ) ) {
			continue;
		}
		const d = run.pairs?.[ pair ]?.draft;
		if ( ! d || d.missing ) {
			continue;
		}
		// A ledgered row (parity/lib/divergences.mjs::judgeDivergence) holds Bean's decided value at this width: that is
		// the target, accepted or drifted, so no group written from other widths overwrites the decision.
		const ruled = ( run.pairs[ pair ].diffs || [] ).find( ( x ) => x.decided && x.key === prop && ( 'hover' === x.kind ) === !! hover && ( x.pseudo || null ) === ( pseudo || null ) );
		const v = ruled ? ruled.decided.value : draftValueOf( d, prop, hover, pseudo );
		if ( undefined !== v ) {
			perWidth[ run.width ] = v;
		}
		if ( ruled ) {
			held.push( String( run.width ) );
		} else if ( ! hover && ! pseudo && undefined !== d.declared?.[ prop ] ) {
			declared[ run.width ] = d.declared[ prop ];
		}
		const fs = parseFloat( d.styles?.[ 'font-size' ] );
		if ( fs ) {
			fontPx[ run.width ] = fs;
		}
	}
	return { perWidth, fontPx, declared, held };
}

// A declared value a setting can hold as it is: a plain length or percentage (not auto, a keyword, var() or calc()).
export const plainLength = ( v ) => /^-?(\d+(\.\d+)?|\.\d+)(px|rem|em|%|vw|vh|ch)$/.test( String( v ?? '' ) );

// The target of a used-size group (solve.mjs::USED_VALUES): the draft's declared value at every width a ledger entry
// does not hold (held widths keep the decided value), or a used-value gap when any such width declares no plain length.
export function usedValueTarget( prop, { perWidth, declared, held = [] } ) {
	const free = Object.keys( perWidth ).filter( ( w ) => ! held.includes( w ) );
	if ( ! Object.keys( perWidth ).length || ! free.every( ( w ) => plainLength( declared[ w ] ) ) ) {
		return { gap: 'used-value', detail: `${ prop } is the box's used size, not a declared value${ Object.keys( declared ).length ? ` (the draft declares ${ JSON.stringify( declared ) })` : '' }` };
	}
	return { perWidth: { ...perWidth, ...Object.fromEntries( free.map( ( w ) => [ w, declared[ w ] ] ) ) } };
}

// Where the walker states that map to one setting state disagree about a group's draft value: { width, values: { walker
// state: draft value }, detail } for the first width at which two such states read different values, or null. Every
// walker state of the surface map that lands in the group's setting state counts, whether or not it carries an open row
// for the group: the setting holds one value for all of them, so a state that merely reads the pair at another value
// (the baseline `opening` state, say) still contradicts the value an open row in another state would write.
export function stateDisagreement( report, g, stateMap ) {
	const hover = 'hover' === g.state;
	const peers = Object.keys( stateMap || {} ).filter( ( ws ) => settingState( { kind: hover ? 'hover' : 'style', state: ws }, stateMap ) === g.state );
	const byWidth = {};
	for ( const ws of peers ) {
		for ( const [ w, v ] of Object.entries( draftValues( report, g.pair, g.prop, hover, [ ws ], g.pseudo ).perWidth ) ) {
			( byWidth[ w ] ||= {} )[ ws ] = String( v );
		}
	}
	const squash = ( v ) => v.replace( /\s+/g, '' );
	const clashing = Object.entries( byWidth ).filter( ( [ , values ] ) => new Set( Object.values( values ).map( squash ) ).size > 1 );
	if ( ! clashing.length ) {
		return null;
	}
	const [ width, values ] = clashing[ 0 ];
	return { width: Number( width ), values, detail: `${ g.prop } is read at ${ Object.entries( values ).map( ( [ ws, v ] ) => `${ v } in ${ ws }` ).join( ' and ' ) } at ${ width }px, and every one of those walker states maps to the setting state "${ g.state || 'rest' }": one setting cannot hold both draft values${ clashing.length > 1 ? ` (${ clashing.length } widths disagree)` : '' }` };
}

// The candidate groups a round may write: style and hover rows with a ref from a mapped walker state, one group per
// groupKey. Box rows, rows without a ref and rows from an unmapped state are returned apart (box rows are derived from
// the spacing that moves them; unreffed rows are unmapped; unmapped-state rows are reported, never written). A group
// whose mapped walker states read different draft values at one width (stateDisagreement) is returned in stateConflict,
// not in groups: it is refused, with its conflict attached, rather than written with the last state's value.
// Content rows (text, presence, link coverage) measured at rest and attributable to a node are grouped apart, in
// `content`, one group per node, element, kind and key; ones the walker gives no node for are `contentUnattributed`; ones
// from a state other than rest stay in `other` (no content setting is bound to a state).
export function writableGroups( report, stateMap ) {
	const groups = new Map();
	const contentGroups = new Map();
	const box = [];
	const unmapped = [];
	const unmappedState = [];
	const other = [];
	const contentUnattributed = [];
	for ( const r of openRows( report ) ) {
		const st = settingState( r, stateMap );
		const type = contentTypeOf( r );
		if ( type ) {
			const at = contentTarget( report, r );
			if ( null !== st ) {
				other.push( r );
			} else if ( ! at.ref || null === at.path ) {
				contentUnattributed.push( r );
			} else {
				const k = contentKey( at, r );
				if ( ! contentGroups.has( k ) ) {
					contentGroups.set( k, { key: k, type, ref: at.ref, path: at.path, pair: r.pair, walkerStates: [], rows: [] } );
				}
				contentGroups.get( k ).rows.push( r );
				contentGroups.get( k ).walkerStates.includes( r.state ) || contentGroups.get( k ).walkerStates.push( r.state );
			}
		} else if ( ! WRITABLE_KINDS.includes( r.kind ) ) {
			other.push( r );
		} else if ( undefined === st ) {
			unmappedState.push( r );
		} else if ( ! r.ref ) {
			unmapped.push( r );
		} else if ( 'box' === r.kind ) {
			box.push( r );
		} else {
			const k = groupKey( r, st );
			if ( ! groups.has( k ) ) {
				groups.set( k, { key: k, ref: r.ref, path: r.path, owners: r.owners || [], prop: r.key, state: st, pair: r.pair, pseudo: r.pseudo || null, walkerStates: [], rows: [] } );
			}
			const g = groups.get( k );
			g.rows.push( r );
			if ( ! g.walkerStates.includes( r.state ) ) {
				g.walkerStates.push( r.state );
			}
		}
	}
	const writable = [];
	const stateConflict = [];
	for ( const g of groups.values() ) {
		const conflict = stateDisagreement( report, g, stateMap );
		conflict ? stateConflict.push( { ...g, conflict } ) : writable.push( g );
	}
	return { groups: writable, box, unmapped, unmappedState, other, stateConflict, content: [ ...contentGroups.values() ], contentUnattributed };
}

// ── content rows: text, presence and link coverage ──────────────────────────────────────────────────────────────────

const looseOf = ( p ) => String( p ?? '' ).replace( /:nth-of-type\(\d+\)/g, '' );
// The walker reads at most this many characters of a text (parity/lib/collect.mjs), so a read this long may be cut short.
export const TEXT_READ_CAP = 400;
// Who edits content that lives outside the layout tree (Spec 47 §3.3): Site Info, product data, a page the draft links to
// but never shows, WooCommerce or core text, and behaviour the walker cannot drive.
export const HANDOVER_OWNERS = [ 'site-info', 'product-data', 'content-page', 'behaviour', 'woocommerce-text' ];

// Which content kind a row is, or null: text, presence, or link (kind `auto` with a link-missing or link-extra key).
export const contentTypeOf = ( r ) => ( isContentRow( r ) ? ( 'text' === r.kind ? 'text' : ( 'presence' === r.kind ? 'presence' : 'link' ) ) : null );

// The live element's trace for a row's pair in the row's own run: { ref, path, textPath, ... } or null (the element is
// absent on the live page, so nothing names a block).
export function pairTrace( report, r ) {
	const run = ( report.runs || [] ).find( ( x ) => x.state === r.state && x.width === r.width );
	return run?.pairs?.[ r.pair ]?.live?.trace || null;
}

// The node and element a content row is about. The walker stamps no ref or path on these rows, so they come from the
// pair's live trace: the text carrier's path for words and links, the element's own path for presence. { ref, path }
// with null where the trace names none.
export function contentTarget( report, r ) {
	const t = pairTrace( report, r );
	const own = 'presence' === r.kind ? t?.path : ( t?.textPath ?? t?.path );
	return { ref: r.ref || t?.ref || null, path: r.path ?? own ?? null };
}

export const contentKey = ( at, r ) => `${ at.ref }|${ at.path }|${ r.kind }|${ r.key }|`;

const escapeHtml = ( s ) => String( s ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' );
const squash = ( s ) => String( s ).replace( /\s+/g, ' ' ).trim();
const at1920 = ( w ) => ( 1920 === w ? 1440 : w );

// The setting that holds a content group, from the block's calibrated `text`, `presence` or `link` entries: { writes } in
// the resolver's write shape, or { gap, detail }. ctx: { calibration, report }. Gaps: no-setting (no calibrated entry for
// that element), ambiguous, unreached (the setting did not reach the element at a measured width), shape (the read cannot
// be written as it stands), no-target (a link to add whose target the walker did not record).
export function resolveContent( g, { calibration, report = { runs: [] } } ) {
	const widths = [ ...new Set( g.rows.map( ( x ) => x.width ) ) ];
	const one = ( hits, what ) => ( hits.length ? ( hits.length > 1 ? { gap: 'ambiguous', detail: `${ hits.map( ( h ) => h[ 0 ] ).join( ', ' ) } all hold ${ what } at "${ g.path }"` } : null ) : { gap: 'no-setting', detail: `no calibrated ${ g.type } setting for "${ g.path }"` } );
	const row = g.rows[ 0 ];
	if ( 'text' === g.type ) {
		const hits = Object.entries( calibration?.text || {} ).filter( ( [ , e ] ) => looseOf( e.path ) === looseOf( g.path ) );
		const gap = one( hits, 'the words' );
		if ( gap ) {
			return gap;
		}
		const [ attr, e ] = hits[ 0 ];
		const missed = widths.filter( ( w ) => e.reachedAt && ! e.reachedAt.includes( at1920( w ) ) );
		if ( missed.length ) {
			return { gap: 'unreached', detail: `${ attr } did not reach "${ g.path }" at ${ missed.join( ', ' ) }px` };
		}
		const words = [ ...new Set( g.rows.map( ( x ) => squash( x.draft ) ) ) ];
		const styles = report.runs.map( ( run ) => run.pairs?.[ g.pair ]?.draft?.styles?.[ 'text-transform' ] ).filter( Boolean );
		if ( words.length > 1 || ! words[ 0 ] || words[ 0 ].length >= TEXT_READ_CAP || styles.some( ( s ) => 'none' !== s ) ) {
			return { gap: 'shape', detail: words.length > 1 ? 'the draft reads different words at different widths' : ( ! words[ 0 ] ? 'the draft reads no words' : ( words[ 0 ].length >= TEXT_READ_CAP ? `the walker caps a text read at ${ TEXT_READ_CAP } characters, so this one may be cut short` : 'the draft text is read through a text-transform, so its source case is unknown' ) ) };
		}
		return { writes: [ { attr, value: escapeHtml( words[ 0 ] ), merge: 'replace' } ] };
	}
	if ( 'link' === g.type ) {
		const hits = Object.entries( calibration?.link || {} ).filter( ( [ , e ] ) => looseOf( e.path ) === looseOf( g.path ) );
		const gap = one( hits, 'the link' );
		if ( gap ) {
			return gap;
		}
		if ( 'href' !== ( hits[ 0 ][ 1 ].attr || 'href' ) ) {
			return { gap: 'shape', detail: `${ hits[ 0 ][ 0 ] } holds a link ${ hits[ 0 ][ 1 ].attr }, not an href` };
		}
		if ( ! row.key.startsWith( 'link-extra' ) ) {
			return { gap: 'no-target', detail: 'the draft links these words, and the walker records that they are linked, not where to' };
		}
		return { writes: [ { attr: hits[ 0 ][ 0 ], value: '', merge: 'replace' } ] };
	}
	// presence: the draft's state is the target. A setting is written only where calibration shows it shows or hides that element.
	const shown = 'present' === row.draft;
	const hits = Object.entries( calibration?.presence || {} ).filter( ( [ , e ] ) => ( shown ? e.shows : e.hides )?.some( ( p ) => looseOf( p ) === looseOf( g.path ) ) );
	const gap = one( hits, 'the element' );
	if ( gap ) {
		return gap;
	}
	const every = report.runs.filter( ( run ) => g.walkerStates.includes( run.state ) && run.pairs?.[ g.pair ] ).map( ( run ) => run.width );
	if ( every.some( ( w ) => ! widths.includes( w ) ) ) {
		return { gap: 'shape', detail: 'the element differs at only some widths, and a presence setting applies to every width' };
	}
	const [ key ] = hits[ 0 ];
	const [ attr, variant ] = key.split( '=' );
	const value = undefined === variant ? true : ( { true: true, false: false }[ variant ] ?? variant );
	return { writes: [ { attr, value, merge: 'replace' } ] };
}

// The handover list (Spec 47 §3.3): one entry per distinct issue among classified content rows filed as handover, and
// every behaviour row the walker could not drive (kind `drive`), each with its evidence row, the widths it was seen at and
// its owner. classes: the output of classify.
export function handoverOf( classes ) {
	const seen = new Map();
	for ( const x of classes.other || [] ) {
		const owner = 'drive' === x.kind ? 'behaviour' : ( 'handover' === x.contentClass ? x.owner : null );
		if ( ! HANDOVER_OWNERS.includes( owner ) ) {
			continue;
		}
		const k = `${ x.pair }|${ x.kind }|${ x.key }|${ owner }`;
		seen.has( k ) || seen.set( k, { owner, row: { kind: x.kind, key: x.key, draft: x.draft, live: x.live, pair: x.pair, state: x.state, ref: x.ref ?? null, path: x.path ?? null }, widths: [], reason: x.reason ?? null } );
		seen.get( k ).widths.includes( x.width ) || seen.get( k ).widths.push( x.width );
	}
	return [ ...seen.values() ].map( ( h ) => ( { ...h, widths: h.widths.sort( ( a, b ) => a - b ) } ) );
}

// Distance of a row from the draft: px difference for lengths, 0/1 otherwise (used to spot a write that made it worse).
export function rowDistance( r ) {
	const a = parseFloat( r.draft );
	const b = parseFloat( r.live );
	if ( /px$/.test( String( r.draft ) ) && /px$/.test( String( r.live ) ) && ! Number.isNaN( a ) && ! Number.isNaN( b ) ) {
		return Math.abs( a - b );
	}
	return String( r.draft ) === String( r.live ) ? 0 : 1;
}

// Classifies the surviving open rows. writes: every applied write ({ group, attr }); gaps: { groupKey: { gap, detail } }.
// Returns { hardcode, missing, unresolved, derived, other } (intended rows are already accepted, counted apart).
// Rows from an unmapped walker state go to `other` with their reason.
export function classify( report, { writes, gaps, elements, stateMap } ) {
	const written = new Set( writes.filter( ( w ) => ! w.reverted ).map( ( w ) => w.group ) );
	const out = { hardcode: [], missing: [], unresolved: [], derived: [], other: [] };
	for ( const r of openRows( report ) ) {
		// A content row stays in `other` (the sweep and triage count it there) with the fate Solve gave it: written,
		// missing (the block could hold it and has no setting), handover (the content lives outside the tree) or
		// unresolved. The node it was resolved on is `target`, kept off the row so its issue key is unchanged.
		if ( contentTypeOf( r ) && null === settingState( r, stateMap ) ) {
			const target = contentTarget( report, r );
			const gap = gaps[ contentKey( target, r ) ];
			const fate = ! target.ref || null === target.path ? { contentClass: 'unresolved', reason: 'unmapped-element (no ref: the walker names no node for this row, and the pair has no live element)' }
				: ( written.has( contentKey( target, r ) ) ? { contentClass: 'written', reason: 'the setting holds the draft value; the row still differs' }
					: ( 'handover' === gap?.gap ? { contentClass: 'handover', owner: gap.owner, reason: `handover to ${ gap.owner }: ${ gap.detail }` }
						: ( 'no-setting' === gap?.gap ? { contentClass: 'missing', reason: gap.detail }
							: { contentClass: 'unresolved', reason: gap ? `${ gap.gap }: ${ gap.detail }` : 'not written' } ) ) );
			out.other.push( { ...r, target, ...fate } );
			continue;
		}
		if ( ! WRITABLE_KINDS.includes( r.kind ) ) {
			out.other.push( r );
			continue;
		}
		const st = settingState( r, stateMap );
		if ( undefined === st ) {
			out.other.push( { ...r, reason: `unmapped-state ${ r.state }` } );
			continue;
		}
		if ( 'box' === r.kind ) {
			out.derived.push( r );
			continue;
		}
		if ( ! r.ref ) {
			out.unresolved.push( { ...r, reason: 'unmapped-element (no ref)' } );
			continue;
		}
		const k = groupKey( r, st );
		if ( 'breaks-layout' === gaps[ k ]?.gap ) {
			out.hardcode.push( { ...r, reason: gaps[ k ].detail } );
		} else if ( written.has( k ) ) {
			out.hardcode.push( { ...r, reason: 'the setting holds the draft value; paint still differs' } );
		} else if ( 'no-setting' === gaps[ k ]?.gap ) {
			out.missing.push( { ...r, reason: gaps[ k ].detail } );
		} else if ( gaps[ k ] ) {
			out.unresolved.push( { ...r, reason: `${ gaps[ k ].gap }: ${ gaps[ k ].detail }` } );
		} else if ( elements && ! elements( r ) ) {
			out.unresolved.push( { ...r, reason: 'unmapped-element (path unknown to calibration)' } );
		} else {
			out.unresolved.push( { ...r, reason: 'not written' } );
		}
	}
	return out;
}

// Counts accepted rows (intended: config accepts and divergence ledger entries).
export const intendedCount = ( report ) => ( report.runs || [] ).reduce( ( n, run ) => n + Object.values( run.pairs || {} ).reduce( ( m, p ) => m + ( p.diffs || [] ).filter( ( d ) => d.accepted ).length, 0 ), 0 );

// Rows a round made worse: open style or box rows absent from the previous report, or further from the draft there.
export function regressedRows( prev, report ) {
	const key = ( r ) => `${ r.pair }|${ r.state }|${ r.kind }|${ r.key }|${ r.width }`;
	const before = new Map( openRows( prev ).filter( ( r ) => [ 'style', 'box' ].includes( r.kind ) ).map( ( r ) => [ key( r ), r ] ) );
	return openRows( report ).filter( ( r ) => [ 'style', 'box' ].includes( r.kind ) && r.ref ).filter( ( r ) => {
		const b = before.get( key( r ) );
		return ! b || rowDistance( r ) > rowDistance( b ) + 0.5;
	} );
}
