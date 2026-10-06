// Fill's root-down resolution (FR-47-4 steps 2 and 3): every node and slot of the skeleton, every property that differs
// from what the node already shows, written through the resolver; spacing ownership decided per tier from rendered
// gaps; presence, words and links from calibration; what no setting can hold listed as UNMAPPED, and what lives outside
// the tree as handover.
import { PSEUDO_PROPS, HOVER_PROPS } from '../../parity/lib/collect.mjs';
import { blockSchema, LOOSE } from './resolve.mjs';
import { match as ledgerMatch } from './ledger.mjs';
import { setAttr, refOf, walk } from './tree.mjs';
import { usedValueTarget } from './solve-rows.mjs';
import { PROPS, READ_WIDTHS } from './fill-read.mjs';
import { FLUID_WIDTHS } from './fill-values.mjs';
import { INHERITED, CARRIED, defaultPaint, knownPaths, resolveProperty, notPainted } from './fill-prop.mjs';
import { pageBaseline } from './fill-page.mjs';
import { spacingOwnership } from './fill-spacing.mjs';
import { presenceDecisions, textDecisions, linkDecisions } from './fill-presence.mjs';
import { handoverEntry } from './fill-handover.mjs';

const GAP_PROPS = [ 'row-gap', 'column-gap' ];
const PSEUDO_LAYERS = [ '::before', '::after' ];
const slugClass = ( name ) => `sgs-${ name.replace( /^sgs\//, '' ) }`;
const json = ( v ) => JSON.stringify( v );

// A draft's per-width values as one readable value: the value itself when every width agrees, else { width: value }.
export function valueText( draft ) {
	const vals = Object.values( draft );
	return vals.every( ( v ) => v === vals[ 0 ] ) ? String( vals[ 0 ] ) : json( draft );
}

// The settings (other than the slot itself) a carried property could be painted by: the slots of the block's settings for
// that property, from calibration.
function alternateSlots( cal, prop ) {
	if ( ! CARRIED.includes( prop ) ) {
		return [];
	}
	const short = prop.replace( /^(row|column)-gap$/, 'gap' );
	return Object.values( cal?.settings || {} ).filter( ( s ) => ( s.property === prop || s.property === short ) && ! s.state ).flatMap( ( s ) => [ ...( s.slots || [ s.slot ] ), ...( s.reaches || [] ) ] );
}

// The state a Fill run reads: one object built once, passed to every step.
function makeState( o ) {
	const flat = [];
	walk( o.tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	return {
		...o, flat,
		out: { writes: [], unmapped: [], notes: [], handover: [], spacing: [], fluid: [], held: [] },
		shown: new Map(), // `${index}|${prop}` -> { width: value } for the node's own element, once resolved
		gapSet: new Map(), // `${index}|${prop}` -> { width: value } the parent decided from rendered gaps
		margins: new Map(), // child index -> { width: [margin sides the parent owns] }
		notedBlocks: new Set(),
		page: ( ( cache ) => ( tag ) => {
			if ( ! cache.has( tag ) ) {
				cache.set( tag, pageBaseline( o.rawSnapshot, tag ) );
			}
			return cache.get( tag );
		} )( new Map() ),
	};
}

// The element tag a node paints, for the theme's element styles: a heading's level, a block's tag, else the root tag
// calibration saw.
const tagOf = ( st, rec, cal ) => {
	const a = st.flat[ rec.index ].attributes || {};
	return a.level || a.tagName || cal?.elements?.[ '' ]?._tag;
};

// The value an ancestor's element shows for an inherited property at a width, nearest first. A line height is inherited
// as a ratio of the element's own font size, so it is carried as that ratio.
function inheritedFrom( st, rec, prop, w, ownFontPx ) {
	for ( let i = rec.parent; null !== i; i = st.nodes[ i ].parent ) {
		const v = shownAt( st, i, prop, w, ownFontPx );
		if ( undefined !== v ) {
			return v;
		}
	}
	return undefined;
}

// What node `index` shows for an inherited property at a width, as the value a node of font size ownFontPx inherits.
function shownAt( st, index, prop, w, ownFontPx ) {
	const v = st.shown.get( `${ index }|${ prop }` )?.[ w ];
	if ( 'line-height' !== prop || undefined === v || ! ownFontPx ) {
		return v;
	}
	const fs = parseFloat( st.shown.get( `${ index }|font-size` )?.[ w ] );
	return fs ? `${ Math.round( ( parseFloat( v ) / fs ) * ownFontPx * 100 ) / 100 }px` : v;
}

// What the node shows at a slot with nothing written. A non-inherited property shows its calibrated default paint. An
// inherited one (R-47-5) shows what its parent shows, or at the top of the surface what the theme gives the page; a theme
// element style (a heading's family and weight) beats the parent. ownFontPx( width ): the element's own font size.
function baselineFn( st, rec, cal, prop, ownFontPx = () => undefined ) {
	const page = st.page( tagOf( st, rec, cal ) );
	return ( slot, w ) => {
		if ( INHERITED.includes( prop ) && ! slot.includes( '::' ) ) {
			const fs = ownFontPx( w );
			if ( page.own( prop ) ) {
				return page.value( prop, w, fs );
			}
			const here = '' === slot ? undefined : shownAt( st, rec.index, prop, w, fs );
			return here ?? inheritedFrom( st, rec, prop, w, fs ) ?? page.value( prop, w, fs ) ?? defaultPaint( cal, slot, w, prop );
		}
		return defaultPaint( cal, slot, w, prop );
	};
}

// The divergence ledger over one property's draft values (R-47-8): a value entry replaces the draft at its widths, a rule
// entry leaves the width unwritten. Returns { draft, rules, held }.
function ledgerView( st, rec, ref, prop, draft, pseudo ) {
	const out = { draft: { ...draft }, rules: [], held: [] };
	for ( const w of Object.keys( draft ).map( Number ) ) {
		for ( const state of st.ledgerStates.length ? st.ledgerStates : [ undefined ] ) {
			const e = ledgerMatch( st.ledger, { ref, block: slugClass( rec.name ), property: prop, state, width: w, kind: 'style', pseudo: pseudo || null } );
			if ( e ) {
				if ( 'value' in e.expected && HOVER_PROPS.includes( prop ) && '*' !== e.state ) {
					// The walker judges this entry against hover rows too, and Fill reads the rest state: a decided hover
					// value is never a rest value. Solve applies it where the row exists.
					out.held.push( { id: e.id, width: w, applied: false } );
				} else if ( 'value' in e.expected ) {
					out.draft[ w ] = e.expected.value;
					out.held.push( { id: e.id, width: w, applied: true } );
				} else {
					delete out.draft[ w ];
					out.rules.push( { id: e.id, width: w, rule: e.expected.rule } );
				}
				break;
			}
		}
	}
	return out;
}

const snapsOf = ( st, id ) => Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, st.reads.widths[ w ]?.[ id ] ] ).filter( ( [ , s ] ) => s && ! s.missing ) );
const draftOf = ( snaps, get ) => Object.fromEntries( Object.entries( snaps ).map( ( [ w, s ] ) => [ Number( w ), get( s ) ] ).filter( ( [ , v ] ) => undefined !== v && '' !== v ) );

// Spacing ownership for one node's children, per tier (step 3): fills gapSet (the parent's gap per width) and margins
// (the sides each child gives up), and logs the decision. A parent with no element of its own, or children without one,
// decides nothing.
function planSpacing( st, rec ) {
	const kids = rec.children;
	if ( ! kids.length || ! rec.targets.length ) {
		return;
	}
	const measured = kids.filter( ( c ) => st.nodes[ c ].targets.length );
	const unmeasured = kids.length - measured.length;
	for ( const w of READ_WIDTHS ) {
		const rects = measured.map( ( c ) => {
			const s = st.reads.widths[ w ]?.[ `${ c }:` ];
			return s && ! s.missing ? { ...s.rect, inFlow: s.inFlow } : null;
		} );
		const ownership = spacingOwnership( rects, { unmeasured } );
		if ( 'unknown' === ownership.owner || ownership.decisions.length ) {
			st.out.spacing.push( { node: refOf( st.flat[ rec.index ] ), index: rec.index, width: w, owner: ownership.owner, count: ownership.count, decisions: ownership.decisions } );
		}
		const rendered = measured.filter( ( c, i ) => rects[ i ] && false !== rects[ i ].inFlow && ( rects[ i ].w > 0 || rects[ i ].h > 0 ) );
		for ( const d of ownership.decisions ) {
			const gaps = st.gapSet.get( `${ rec.index }|${ d.prop }` ) || {};
			gaps[ w ] = d.value;
			st.gapSet.set( `${ rec.index }|${ d.prop }`, gaps );
			if ( 'parent' !== d.owner ) {
				continue;
			}
			// Margins between siblings move into the parent's gap; a first child's leading margin and a last child's
			// trailing margin are not between siblings, so they stay.
			rendered.forEach( ( c, i ) => {
				const per = st.margins.get( c ) || {};
				per[ w ] = [ ...( per[ w ] || [] ), ...d.margins.filter( ( side, k ) => ( 0 === k ? i > 0 : i < rendered.length - 1 ) ) ];
				st.margins.set( c, per );
			} );
		}
	}
}

// Writes one resolver result into the node, recording each change. Returns the number of settings changed.
function apply( st, rec, ref, target, prop, res, slot ) {
	const node = st.flat[ rec.index ];
	let changed = 0;
	for ( const w of res.writes ) {
		if ( json( w.value ) === json( node.attributes?.[ w.attr ] ) ) {
			continue;
		}
		const { before, after } = setAttr( node, w );
		changed++;
		st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot, prop, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how: res.how } );
	}
	return changed;
}

function unmapped( st, rec, ref, row ) {
	st.out.unmapped.push( { node: ref, block: rec.name, slot: '', ...row } );
}

// One element's properties at one slot, every one that differs. layer: '::before' | '::after' for a painted pseudo layer.
function fillElement( st, rec, ref, cal, target, snaps, layer = null ) {
	const slot = `${ target.slot }${ layer || '' }`;
	const ids = layer ? PSEUDO_PROPS.filter( ( p ) => 'content' !== p ) : PROPS;
	// A block's layout setting describes the element laying out its children: a draft wrapper around a grid reads as the grid.
	const valueAt = ( s, p ) => ( layer ? s.pseudo?.[ layer ]?.[ p ] : ( 'display' === p && '' === target.slot && /(flex|grid)$/.test( s.layoutDisplay || '' ) ? s.layoutDisplay : s.styles?.[ p ] ) );
	const fontPx = Object.fromEntries( Object.entries( snaps ).map( ( [ w, s ] ) => [ w, parseFloat( s.styles?.[ 'font-size' ] ) ] ).filter( ( [ , v ] ) => v ) );
	const allDrafts = Object.fromEntries( ids.map( ( p ) => [ p, Object.fromEntries( Object.entries( draftOf( snaps, ( s ) => valueAt( s, p ) ) ).filter( ( [ w ] ) => layer || ! notPainted( p, snaps[ w ].styles || {} ) ) ) ] ) );
	const gapProp = {};
	for ( const prop of ids ) {
		let draft = allDrafts[ prop ];
		if ( ! Object.keys( draft ).length ) {
			continue;
		}
		// Spacing ownership (step 3): the parent's gap and the children's margins follow the rendered gaps.
		if ( ! layer && '' === target.slot && GAP_PROPS.includes( prop ) && st.gapSet.has( `${ rec.index }|${ prop }` ) ) {
			draft = { ...draft, ...Object.fromEntries( Object.entries( st.gapSet.get( `${ rec.index }|${ prop }` ) ).filter( ( [ w ] ) => undefined !== draft[ w ] ) ) };
		}
		const owned = ! layer && '' === target.slot ? st.margins.get( rec.index ) : null;
		if ( owned && /^margin-(top|right|bottom|left)$/.test( prop ) ) {
			draft = { ...draft, ...Object.fromEntries( Object.entries( owned ).filter( ( [ w, sides ] ) => sides.includes( prop ) && undefined !== draft[ w ] ).map( ( [ w ] ) => [ w, '0px' ] ) ) };
		}
		const led = ledgerView( st, rec, ref, prop, draft, layer );
		led.held.forEach( ( h ) => st.out.held.push( { ...h, node: ref, prop, slot } ) );
		led.rules.forEach( ( r ) => st.out.held.push( { ...r, node: ref, prop, slot } ) );
		draft = led.draft;
		if ( ! Object.keys( draft ).length ) {
			continue;
		}
		// An auto side margin computes to the px that centres the box: the used size, not a margin the draft sets.
		if ( ! layer && /^margin-(left|right)$/.test( prop ) ) {
			for ( const w of Object.keys( draft ) ) {
				if ( 'auto' === st.reads.declared?.[ w ]?.[ target.id ]?.[ prop ] ) {
					delete draft[ w ];
				}
			}
			if ( ! Object.keys( draft ).length ) {
				continue;
			}
		}
		if ( 'width' === prop ) {
			// A computed width is the used size: only a width the draft declares as a plain length or percentage is written.
			const declared = Object.fromEntries( Object.keys( draft ).map( ( w ) => [ w, st.reads.declared?.[ w ]?.[ target.id ]?.width ] ).filter( ( [ , v ] ) => v ) );
			const t = usedValueTarget( 'width', { perWidth: draft, declared, held: led.held.map( ( h ) => String( h.width ) ) } );
			if ( t.gap ) {
				continue;
			}
			draft = t.perWidth;
		}
		const fluid = fluidSamples( st, target, layer, prop );
		const res = resolveProperty( { node: st.flat[ rec.index ], block: rec.name, prop, draft, baseline: baselineFn( st, rec, cal, prop, ( w ) => fontPx[ w ] ), slots: [ slot, ...( layer ? [] : alternateSlots( cal, prop ).filter( ( s ) => s !== slot ) ) ], calibration: cal, db: st.db, snapshot: st.snapshot, log: st.snaps, fontPx, siblings: allDrafts, fluid } );
		if ( 'gap' === res.status ) {
			unmapped( st, rec, ref, { slot, property: prop, value: valueText( draft ), reason: `${ res.gap }: ${ res.detail }` } );
		} else if ( 'written' === res.status ) {
			// One gap setting holds both a row and a column gap: a second prop writing it with another value is a conflict.
			const attrs = res.writes.map( ( w ) => w.attr );
			const prior = GAP_PROPS.includes( prop ) ? Object.entries( gapProp ).find( ( [ , a ] ) => a.attrs.some( ( x ) => attrs.includes( x ) ) ) : null;
			if ( prior && valueText( prior[ 1 ].draft ) !== valueText( draft ) ) {
				unmapped( st, rec, ref, { slot, property: prop, value: valueText( draft ), reason: `conflict: ${ attrs.join( ', ' ) } already holds ${ prior[ 0 ] } ${ valueText( prior[ 1 ].draft ) } (one setting, two gaps)` } );
			} else {
				if ( GAP_PROPS.includes( prop ) ) {
					gapProp[ prop ] = { attrs, draft };
				}
				apply( st, rec, ref, target, prop, res, res.slot );
			}
			if ( res.fluid ) {
				st.out.fluid.push( { node: ref, slot, prop, clamp: res.fluid.clamp, written: res.fluid.accepted ? 'clamp' : 'per-tier', reason: res.fluid.accepted ? 'every sample lies on one line and calibration lists clamp among the setting\'s forms' : `${ attrs.join( ', ' ) } accepts no clamp() (calibration forms): per-tier values from 375, 768 and 1440` } );
			}
		}
		// What the element shows from here on, for the descendants that inherit it.
		if ( ! layer && '' === target.slot && INHERITED.includes( prop ) ) {
			const base = baselineFn( st, rec, cal, prop, ( w ) => fontPx[ w ] );
			st.shown.set( `${ rec.index }|${ prop }`, Object.fromEntries( Object.keys( draft ).map( ( w ) => [ Number( w ), 'gap' === res.status ? base( '', Number( w ) ) : draft[ w ] ] ) ) );
		}
	}
}

// The samples of a fluid candidate at the five widths ({ width: value }), or null when any is missing.
function fluidSamples( st, target, layer, prop ) {
	if ( layer ) {
		return null;
	}
	const s = Object.fromEntries( FLUID_WIDTHS.map( ( w ) => [ w, st.reads.widths[ w ]?.[ target.id ]?.styles?.[ prop ] ] ) );
	return Object.values( s ).every( ( v ) => undefined !== v ) ? s : null;
}

// Presence, words and links for one node's elements, and its declared handover (step 5).
function fillContent( st, rec, ref, cal ) {
	const node = st.flat[ rec.index ];
	const skeletonNode = st.nodes[ rec.index ].node;
	const atDesktop = Object.fromEntries( rec.targets.map( ( t ) => [ t.slot, st.reads.widths[ 1440 ]?.[ t.id ] ] ) );
	const evidence = Object.fromEntries( rec.targets.filter( ( t ) => '' !== t.slot ).map( ( t ) => [ t.slot, !! atDesktop[ t.slot ] && ! atDesktop[ t.slot ].missing ] ) );
	const words = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing ).map( ( [ slot, s ] ) => [ slot, s.words ] ) );
	const hrefs = Object.fromEntries( Object.entries( atDesktop ).filter( ( [ , s ] ) => s && ! s.missing ).map( ( [ slot, s ] ) => [ slot, s.href ] ) );
	const local = [];
	const take = ( r ) => {
		for ( const w of r.writes ) {
			if ( json( w.value ) !== json( node.attributes?.[ w.attr ] ) ) {
				const { before, after } = setAttr( node, w );
				st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: '', prop: '(content)', attr: w.attr, before, after, widths: [], how: 'content' } );
			}
		}
		st.out.notes.push( ...r.notes.map( ( n ) => `${ ref } ${ rec.name }: ${ n }` ) );
		local.push( ...r.unmapped.map( ( u ) => ( { node: ref, block: rec.name, ...u } ) ) );
	};
	const absent = [ 'presence', 'text', 'link' ].filter( ( k ) => ! cal?.[ k ] );
	if ( absent.length && ! st.notedBlocks.has( rec.name ) ) {
		st.notedBlocks.add( rec.name );
		st.out.notes.push( `${ rec.name }: calibration has no ${ absent.join( ', ' ) } key, so those were not judged for this block (recalibrate it to read them)` );
	}
	take( presenceDecisions( { calibration: cal, schema: blockSchema( rec.name ), attributes: node.attributes || {}, evidence } ) );
	take( textDecisions( { calibration: cal, attributes: node.attributes || {}, slots: words, leaf: 0 === rec.children.length } ) );
	take( linkDecisions( { calibration: cal, attributes: node.attributes || {}, slots: hrefs, origin: st.origin } ) );
	// A skeleton's own statement that something lives outside the tree turns the matching UNMAPPED row into handover.
	for ( const h of skeletonNode.handover || [] ) {
		const slot = h.slot ?? '';
		const draft = 'text' === h.kind ? words[ slot ] : 'link' === h.kind ? hrefs[ slot ] : 'presence' === h.kind ? ( '' === slot ? 'shown' : ( evidence[ slot ] ? 'shown' : 'hidden' ) ) : h.detail;
		st.out.handover.push( handoverEntry( { owner: h.owner, kind: h.kind, node: ref, block: rec.name, slot, evidence: { key: h.kind, draft: draft ?? '', width: 1440 }, reason: h.detail } ) );
	}
	const declared = ( u ) => ( skeletonNode.handover || [] ).some( ( h ) => h.kind === u.property && ( h.slot ?? '' ) === u.slot );
	st.out.unmapped.push( ...local.filter( ( u ) => ! declared( u ) ) );
}

// Fills the tree in place. tree: the cleaned skeleton (refs added, draft keys removed), nodes: skeletonNodes of the
// skeleton (same indices), reads: lib/fill-read.mjs::readDraft, calFor( block ): calibration or null, ledger: the
// divergence entries, ledgerStates: the walker states that are the rest state (the ledger's `state` names one).
// Returns { writes, unmapped, notes, handover, spacing, fluid, held, snaps }.
export function fillTree( opts ) {
	const st = makeState( { ledger: [], ledgerStates: [], origin: '', ...opts, snaps: [] } );
	for ( const rec of st.nodes ) {
		const ref = refOf( st.flat[ rec.index ] );
		planSpacing( st, rec );
		if ( ! rec.targets.length ) {
			continue;
		}
		const cal = st.calFor( rec.name );
		if ( ! cal ) {
			unmapped( st, rec, ref, { property: '(block)', value: '', reason: `uncalibrated: ${ rec.name } has no calibration file` } );
			continue;
		}
		const roots = snapsOf( st, `${ rec.index }:` );
		if ( ! Object.keys( roots ).length ) {
			unmapped( st, rec, ref, { property: '(element)', value: json( rec.targets[ 0 ].finder ), reason: 'the draftRef finder resolved no visible element at 375, 768 or 1440' } );
			continue;
		}
		fillContent( st, rec, ref, cal );
		for ( const target of rec.targets ) {
			const snaps = snapsOf( st, target.id );
			if ( ! Object.keys( snaps ).length ) {
				continue;
			}
			if ( ! knownPaths( cal ).map( LOOSE ).includes( LOOSE( target.slot ) ) ) {
				unmapped( st, rec, ref, { slot: target.slot, property: '(element)', value: json( target.finder ), reason: `unmapped-element: ${ rec.name } path "${ target.slot }" is not a calibrated element` } );
				continue;
			}
			fillElement( st, rec, ref, cal, target, snaps );
			for ( const layer of PSEUDO_LAYERS.filter( ( l ) => Object.values( snaps ).some( ( s ) => s.pseudo?.[ l ] ) ) ) {
				if ( ! knownPaths( cal ).map( LOOSE ).includes( LOOSE( `${ target.slot }${ layer }` ) ) ) {
					unmapped( st, rec, ref, { slot: `${ target.slot }${ layer }`, property: '(pseudo layer)', value: `content ${ Object.values( snaps ).find( ( s ) => s.pseudo?.[ layer ] ).pseudo[ layer ].content }`, reason: `unmapped-element: the draft paints ${ layer } on "${ target.slot }" and ${ rec.name } has no calibrated ${ layer } there` } );
					continue;
				}
				fillElement( st, rec, ref, cal, target, snaps, layer );
			}
		}
	}
	return { ...st.out, snaps: st.snaps };
}
