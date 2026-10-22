// Fill resolution of one element (FR-47-4 step 2): every property that differs from what the element already shows,
// written through the resolver, with the not-plain, conflict and fluid records.
import { PSEUDO_PROPS } from '../../parity/lib/collect.mjs';
import { blockSchema, fluidForm } from './resolve.mjs';
import { setAttr } from './tree.mjs';
import { usedValueTarget } from './solve-rows.mjs';
import { PROPS, READ_WIDTHS } from './fill-read.mjs';
import { extraProps, usedValueDrafts, USED_VALUE } from './fill-declared.mjs';
import { FLUID_WIDTHS } from './fill-values.mjs';
import { INHERITED, resolveProperty, notPainted } from './fill-prop.mjs';
import { gateFor } from './fill-fixture.mjs';
import { fillEquivalent } from './fill-equivalents.mjs';
import { compareDR } from './fill-confirm.mjs';
import { GAP_PROPS, valueText, json, alternateSlots, baselineFn, ledgerView, gapTarget, draftOf } from './fill-resolve-state.mjs';

// Writes one resolver result into the node, recording each change. Returns the number of settings changed.
export function apply( st, rec, ref, target, prop, res, slot ) {
	const node = st.flat[ rec.index ];
	let changed = 0;
	for ( const w of res.writes ) {
		if ( json( w.value ) === json( node.attributes?.[ w.attr ] ) ) {
			continue;
		}
		const { before, after } = setAttr( node, w );
		changed++;
		st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot, prop, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how: res.how, ...( w.unit ? { unit: true } : {} ) } );
		// The switch the fixture turned on for this setting (childIconShowBackground for childIconBackground).
		const gate = gateFor( st, rec.name, st.calFor( rec.name ), blockSchema( rec.name ), w.attr, node.attributes );
		if ( gate ) {
			const g = setAttr( node, { attr: gate, value: true } );
			changed++;
			st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot, prop: '(switch)', attr: gate, before: g.before, after: g.after, widths: [], how: 'fixture-switch' } );
		}
	}
	return changed;
}

// The fixed-ratio equivalent for a property whose declared values are not plain. When it lands a write, the not-plain
// values it replaces stay on that write's `note`; when nothing is written (the result is `equal`, or the setting already
// holds the value) `landed` is false and the caller keeps the not-plain rows.
export function ratioWrite( st, rec, target, prop, draft, notPlain, ctx ) {
	const before = st.out.writes.length;
	const eq = fillEquivalent( st, rec, target, prop, draft, ctx );
	const landed = 'intrinsic-ratio' === eq?.condition && st.out.writes.length > before;
	if ( landed && notPlain.length ) {
		const note = `replaces the not-plain declared values ${ notPlain.map( ( n ) => `${ n.property } ${ n.value }` ).join( '; ' ) }`;
		st.out.writes.slice( before ).forEach( ( w ) => Object.assign( w, { note } ) );
	}
	return { eq, landed };
}

export function unmapped( st, rec, ref, row ) {
	st.out.unmapped.push( { node: ref, block: rec.name, slot: '', ...row } );
}

// One element's properties at one slot, every one that differs. layer: '::before' | '::after' for a painted pseudo layer.
export function fillElement( st, rec, ref, cal, target, snaps, layer = null ) {
	const slot = `${ target.slot }${ layer || '' }`;
	// Beyond Fill's list, every property the code declares on the element at a read width (FR-48-8).
	const extra = layer ? [] : [ ...new Set( READ_WIDTHS.flatMap( ( w ) => Object.keys( extraProps( st.reads.declared?.[ w ]?.[ target.id ], PROPS ) ) ) ) ].sort();
	const ids = layer ? PSEUDO_PROPS.filter( ( p ) => 'content' !== p ) : [ ...PROPS, ...extra ];
	// A block's layout setting describes the element laying out its children: a draft wrapper around a grid reads as the grid.
	const valueAt = ( s, p ) => ( layer ? s.pseudo?.[ layer ]?.[ p ] : ( 'display' === p && '' === target.slot && /(flex|grid)$/.test( s.layoutDisplay || '' ) ? s.layoutDisplay : s.styles?.[ p ] ) );
	const fontPx = Object.fromEntries( Object.entries( snaps ).map( ( [ w, s ] ) => [ w, parseFloat( s.styles?.[ 'font-size' ] ) ] ).filter( ( [ , v ] ) => v ) );
	const allDrafts = Object.fromEntries( ids.map( ( p ) => [ p, Object.fromEntries( Object.entries( draftOf( snaps, ( s ) => valueAt( s, p ) ) ).filter( ( [ w ] ) => layer || ! notPainted( p, snaps[ w ].styles || {} ) ) ) ] ) );
	const gapProp = {};
	for ( const prop of ids ) {
		let draft = allDrafts[ prop ];
		let rendered = null;
		let notPlain = [];
		if ( ! Object.keys( draft ).length ) {
			continue;
		}
		// Spacing ownership (step 3): the parent's gap and the children's margins follow the rendered gaps.
		if ( ! layer && target.id === gapTarget( st, rec )?.id && GAP_PROPS.includes( prop ) && st.gapSet.has( `${ rec.index }|${ prop }` ) ) {
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
		} else if ( ! layer && USED_VALUE.includes( prop ) ) {
			// A used-value property: the declared value, never the laid-out pixels; another declared form is named.
			const u = usedValueDrafts( draft, ( w ) => st.reads.declared?.[ w ]?.[ target.id ]?.[ prop ] );
			rendered = { ...draft };
			notPlain = u.notPlain.map( ( n ) => ( { slot, property: prop, value: n.declared, reason: `not-plain: the code declares ${ n.declared } at ${ n.width }px, which no setting holds as a length (the rendered pixels are a layout result)` } ) );
			draft = u.draft;
			if ( ! Object.keys( draft ).length ) {
				// Nothing plain to write; an element of fixed ratio still takes its rendered height as a maximum height.
				const { landed } = notPlain.length ? ratioWrite( st, rec, target, prop, draft, notPlain, { baselineFn, apply, rendered } ) : { landed: false };
				if ( ! landed ) {
					notPlain.forEach( ( row ) => unmapped( st, rec, ref, row ) );
				}
				continue;
			}
		}
		const fluid = fluidSamples( st, target, layer, prop );
		const res = resolveProperty( { node: st.flat[ rec.index ], block: rec.name, prop, draft, baseline: baselineFn( st, rec, cal, prop, ( w ) => fontPx[ w ] ), slots: [ slot, ...( layer ? [] : alternateSlots( cal, prop, draft ).filter( ( s ) => s !== slot ) ) ], calibration: cal, db: st.db, snapshot: st.snapshot, log: st.snaps, fontPx, siblings: allDrafts, fluid, declaredFluid: layer ? null : declaredFluid( st, target, prop, draft ), declared: layer ? {} : agreedDeclared( st, target, prop, draft, fontPx ) } );
		const { eq, landed } = 'gap' === res.status && 'no-setting' === res.gap && ! layer ? ratioWrite( st, rec, target, prop, draft, notPlain, { baselineFn, apply, rendered } ) : { eq: null, landed: false };
		// A maximum height written from the rendered heights replaces the not-plain rows (each width's height is what it
		// paints) and carries their values on its note; a result that wrote nothing keeps them as rows.
		if ( ! landed ) {
			notPlain.forEach( ( row ) => unmapped( st, rec, ref, row ) );
		}
		if ( 'gap' === res.status && ( ! eq || 'gap' === eq.status ) ) {
			unmapped( st, rec, ref, { slot, property: prop, value: valueText( draft ), reason: `${ res.gap }: ${ res.detail }${ eq ? `; ${ eq.detail }` : '' }` } );
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
				st.out.fluid.push( { node: ref, slot, prop, clamp: res.fluid.clamp, written: res.fluid.accepted ? 'clamp' : 'per-tier', reason: res.fluid.declared ? 'the code declares it as one value and calibration lists its form among the forms the setting takes: held as that one value' : res.fluid.accepted ? 'every sample lies on one line and calibration lists clamp among the setting\'s forms' : `${ attrs.join( ', ' ) } accepts no clamp() (calibration forms): per-tier values from 375, 768 and 1440` } );
			}
		}
		// What the element shows from here on, for the descendants that inherit it.
		if ( ! layer && '' === target.slot && INHERITED.includes( prop ) ) {
			const base = baselineFn( st, rec, cal, prop, ( w ) => fontPx[ w ] );
			st.shown.set( `${ rec.index }|${ prop }`, Object.fromEntries( Object.keys( draft ).map( ( w ) => [ Number( w ), 'gap' === res.status ? base( '', Number( w ) ) : draft[ w ] ] ) ) );
		}
	}
}

// The code's value at each width where it agrees with the value being written (FR-48-36 D–R `agree`): a confirmed row
// writes it in place of the rendered value. A run-time value (var(), calc(), a percentage) and a disagreement are left out.
function agreedDeclared( st, target, prop, draft, fontPx ) {
	return Object.fromEntries( Object.keys( draft ).map( ( w ) => [ w, st.reads.declared?.[ w ]?.[ target.id ]?.[ prop ] ] )
		.filter( ( [ w, d ] ) => null != d && 'agree' === compareDR( prop, d, draft[ w ], fontPx[ w ] || 16 ).dr ) );
}

// The fluid value the code declares for a property when it declares the same clamp(), min() or max() at every read width
// ({ width: value }), else null: a value that changes with the width is a per-tier one.
export function declaredFluid( st, target, prop, draft ) {
	const by = Object.keys( draft ).map( ( w ) => String( st.reads.declared?.[ w ]?.[ target.id ]?.[ prop ] ?? '' ).trim() );
	const form = fluidForm( by[ 0 ] );
	return form && by.every( ( v ) => v === by[ 0 ] ) ? Object.fromEntries( Object.keys( draft ).map( ( w ) => [ w, by[ 0 ] ] ) ) : null;
}

// The samples of a fluid candidate at the five widths ({ width: value }), or null when any is missing.
function fluidSamples( st, target, layer, prop ) {
	if ( layer ) {
		return null;
	}
	const s = Object.fromEntries( FLUID_WIDTHS.map( ( w ) => [ w, st.reads.widths[ w ]?.[ target.id ]?.styles?.[ prop ] ] ) );
	return Object.values( s ).every( ( v ) => undefined !== v ) ? s : null;
}
