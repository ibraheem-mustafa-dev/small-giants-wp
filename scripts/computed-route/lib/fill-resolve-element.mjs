// Fill resolution of one element (FR-47-4 step 2): every property that differs from what the element already shows,
// written through the resolver, with the not-plain, conflict and fluid records.
import { PSEUDO_PROPS, CONTEXT_PROPS } from '../../parity/lib/collect.mjs';
import { blockSchema, fluidForm, LOOSE } from './resolve.mjs';
import { setAttr } from './tree.mjs';
import { usedValueTarget } from './solve-rows.mjs';
import { PROPS, READ_WIDTHS, TIE_PROPS } from './fill-read.mjs';
import { extraProps, usedValueDrafts, USED_VALUE } from './fill-declared.mjs';
import { FLUID_WIDTHS } from './fill-values.mjs';
import { INHERITED, resolveProperty, notPainted, undeclaredInitial, defaultPaint, gapPaintsNothing, flexOnlyPaintsNothing, calibratedContext } from './fill-prop.mjs';
import { draftParents, unpairedPart } from './fill-part-pairing.mjs';
import { gateFor, carriedFor } from './fill-fixture.mjs';
import { fillEquivalent } from './fill-equivalents.mjs';
import { compareDR } from './fill-confirm.mjs';
import { declaredTracks } from './normalise.mjs';
import { elementContext } from './fill-held.mjs';
import { exactPaint } from './css-equivalence/tolerance.mjs';
import { fillLayerBox } from './fill-layer-box.mjs';
import { tokenWrites } from './fill-token-ref.mjs';
import { normalKeywords } from './fill-normal-keywords.mjs';
import { gutterBaseline } from './fill-gutter.mjs';
import { sweepResult } from './fill-underline-sweep.mjs';
import { BOX_LOOK, parentDrawsBox } from './fill-shared-element.mjs';
import { notInForce } from './fill-device-mode.mjs';
import { GAP_PROPS, RADIUS_CORNERS, mergedRadius, valueText, json, alternateSlots, baselineFn, baselineSourceFn, equalBaseline, ledgerView, gapTarget, draftOf, recordDisplay } from './fill-resolve-state.mjs';

// Whether a resolver result writes only settings calibration measured painting `slot` itself (not ones that only reach it).
const writesOwnSlot = ( res, cal, slot ) => 'written' === res?.status && res.writes.length > 0 && res.writes.every( ( w ) => {
	const c = cal?.settings?.[ w.attr ];
	return !! c && ( c.slots || [ c.slot ] ).some( ( p ) => 'string' === typeof p && LOOSE( p ) === LOOSE( slot ) );
} );

// Writes one resolver result into the node, recording each change. Returns the number of settings changed. `slot` is the
// element the setting sits on; `res.readSlot`, when it differs, the element the value was read on (a property read on the
// root carried to a setting on an inner element), kept on the row as `readSlot` so the read stays answered. A row's
// `widths` are the tiers it changes; `res.answers`, every read width the result leaves showing the draft's value (a
// width the resolver left out already shows it, or takes it from a wider tier), kept on the row as `answers`.
export function apply( st, rec, ref, target, prop, res, slot ) {
	const node = st.flat[ rec.index ];
	const widths = Object.keys( res.included || {} ).map( Number );
	const from = { ...( undefined !== res.readSlot && res.readSlot !== slot ? { readSlot: res.readSlot } : {} ), ...( res.answers ? { answers: res.answers } : {} ) };
	let changed = 0;
	for ( const w of res.writes ) {
		if ( json( w.value ) === json( node.attributes?.[ w.attr ] ) ) {
			settled( st, rec, ref, { slot, ...from, property: prop, value: json( w.value ), widths: res.answers || widths, reason: 'already-set', attr: w.attr, detail: `${ w.attr } already holds this value in the tree` } );
			continue;
		}
		const { before, after } = setAttr( node, w );
		changed++;
		st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot, ...from, prop, attr: w.attr, before, after, widths, how: res.how, ...( w.unit ? { unit: true } : {} ) } );
		// The switch the fixture turned on for this setting (childIconShowBackground for childIconBackground).
		const gate = gateFor( st, rec.name, st.calFor( rec.name, rec ), blockSchema( rec.name ), w.attr, node.attributes );
		if ( gate ) {
			const g = setAttr( node, { attr: gate, value: true } );
			changed++;
			st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot, prop: '(switch)', attr: gate, before: g.before, after: g.after, widths: [], how: 'fixture-switch' } );
		}
		// The companion values the fixture lists for this setting (widthType custom for customWidth).
		for ( const [ name, value ] of Object.entries( carriedFor( st, rec.name, w.attr, node.attributes ) || {} ) ) {
			const c = setAttr( node, { attr: name, value } );
			changed++;
			st.out.writes.push( { node: ref, index: rec.index, block: rec.name, slot, prop: '(switch)', attr: name, before: c.before, after: c.after, widths: [], how: 'fixture-carry' } );
		}
	}
	return changed;
}

const TIER_KEYS = [ 'desktop', 'tablet', 'mobile' ];
const TIER_WIDTH = { mobile: 375, tablet: 768, desktop: 1440 };
// The tiers a width shows, nearest first: a tier left empty shows the next wider one.
const chainAt = ( w ) => ( w < 768 ? [ 'mobile', 'tablet', 'desktop' ] : w < 1024 ? [ 'tablet', 'desktop' ] : [ 'desktop' ] );

// The read widths a written result leaves showing the draft's value (`answers`): a width answers when the tier it shows is
// one the result writes and the draft value that tier holds (its own width's) paints the same as the draft there, or when
// no written tier reaches it (the resolver judged that it already shows the value). A Tablet or Mobile sibling holds its
// tier; any other plain value holds every width. A fluid value answers every width it was fitted to.
export function answeredWidths( prop, draft, res ) {
	const widths = Object.keys( draft ).map( Number );
	if ( [ 'clamp', 'declared-fluid' ].includes( res.how ) ) {
		return widths;
	}
	const held = new Set();
	for ( const w of ( res.writes || [] ).filter( ( x ) => ! x.unit ) ) {
		if ( isObj( w.value ) && TIER_KEYS.some( ( k ) => k in w.value ) ) {
			TIER_KEYS.filter( ( k ) => undefined !== w.value[ k ] && '' !== w.value[ k ] ).forEach( ( k ) => held.add( k ) );
		} else {
			held.add( /Tablet$/.test( w.attr ) ? 'tablet' : /Mobile$/.test( w.attr ) ? 'mobile' : 'desktop' );
		}
	}
	return widths.filter( ( w ) => {
		const tier = chainAt( w ).find( ( t ) => held.has( t ) );
		const from = tier ? TIER_WIDTH[ tier ] : null;
		const source = null === from ? undefined : res.included?.[ from ] ?? draft[ from ];
		return undefined === source || from === w || exactPaint( prop, draft[ w ], source );
	} );
}

export function unmapped( st, rec, ref, row ) {
	st.out.unmapped.push( { node: ref, block: rec.name, slot: '', ...row } );
}

// A value read that ends with nothing to write and nothing unwritten (lib/fill-report.mjs::SETTLED names the reasons), with
// the read widths it answers (`widths`). A throwaway state (lib/fill-row-lift.mjs::readCopy) starts its own list, which
// the row lift carries onto the icon it read.
export function settled( st, rec, ref, row ) {
	( st.out.settled ??= [] ).push( { node: ref, block: rec.name, slot: '', ...row } );
}

// Which element of a node wrote each of its settings this run: node -> Map( attr -> { from: the target's slot, prop,
// direct: the setting sits on that element, value } ). Keyed by the node object, so a throwaway copy
// (lib/fill-row-lift.mjs::readCopy) keeps its own.
const OWNERS = new WeakMap();
const owners = ( st, rec ) => {
	const node = st.flat[ rec.index ];
	OWNERS.has( node ) || OWNERS.set( node, new Map() );
	return OWNERS.get( node );
};

// The element that wrote a setting of the node this run: { from, prop, direct, value }, or undefined.
export const ownerOf = ( node, attr ) => OWNERS.get( node )?.get( attr );

// Records the element that wrote a setting; a write that left the value as it was keeps the earlier writer.
export function recordOwner( st, rec, target, prop, attr, direct ) {
	const value = st.flat[ rec.index ].attributes?.[ attr ];
	const prior = owners( st, rec ).get( attr );
	if ( ! prior || json( prior.value ) !== json( value ) ) {
		owners( st, rec ).set( attr, { from: target.slot, prop, direct, value } );
	}
}

const isObj = ( v ) => v && 'object' === typeof v && ! Array.isArray( v );

// The places (`mobile`, `tablet.top`) where two values of one setting both say something and differ.
export function clashes( a, b, at = '' ) {
	if ( isObj( a ) && isObj( b ) ) {
		return Object.keys( b ).filter( ( k ) => k in a ).flatMap( ( k ) => clashes( a[ k ], b[ k ], at ? `${ at }.${ k }` : k ) );
	}
	return json( a ) === json( b ) ? [] : [ at || 'every tier' ];
}

// Whether a write goes ahead over what another element of the node already wrote to the same setting (a property read
// on the root carried to the setting on an inner element, lib/fill-resolve-state.mjs::alternateSlots, beside that
// element's own reading). Where the two values differ, the element the setting sits on wins over one carried from
// another element, and between two of the same kind the first stays. The value not kept is a conflict row naming both:
// one setting is never overwritten silently.
export function ownerKeeps( st, rec, ref, target, prop, w, settingSlot ) {
	const prior = owners( st, rec ).get( w.attr );
	const at = prior && prior.from !== target.slot ? clashes( prior.value, w.value ) : [];
	if ( ! at.length ) {
		return true;
	}
	const here = { from: target.slot, prop, direct: target.slot === settingSlot, value: w.value };
	const [ keep, drop ] = here.direct && ! prior.direct ? [ here, prior ] : [ prior, here ];
	const where = ( o ) => `${ o.prop } ${ json( o.value ) } read on ${ '' === o.from ? 'the root' : o.from }`;
	unmapped( st, rec, ref, { slot: drop.from, property: drop.prop, value: json( drop.value ), reason: `conflict: ${ w.attr } (one setting, two elements): ${ where( drop ) } differs from ${ where( keep ) } at ${ at.join( ', ' ) }; the setting keeps ${ keep.direct && ! drop.direct ? 'the value of the element it sits on' : 'the first value' }` } );
	return keep === here;
}

// One element's properties at one slot, every one that differs. layer: '::before' | '::after' for a painted pseudo layer.
export function fillElement( st, rec, ref, cal, target, snaps, layer = null ) {
	const slot = `${ target.slot }${ layer || '' }`;
	// Fill's list without the context reads (direction, column-count, column-width: read so canon() and the equivalence
	// rules can judge a value) and the tie reads (TIE_PROPS: read so the resolver can break a tie), never written from the
	// computed read, so they stay only in the element's other properties the resolver judges with, `allDrafts`); beyond
	// it, every property the code declares on the element at a read width (FR-48-8), a declared column-count among them.
	const own = PROPS.filter( ( p ) => ! CONTEXT_PROPS.has( p ) && ! TIE_PROPS.includes( p ) );
	const extra = layer ? [] : [ ...new Set( READ_WIDTHS.flatMap( ( w ) => Object.keys( extraProps( st.reads.declared?.[ w ]?.[ target.id ], own ) ) ) ) ].sort();
	const ids = layer ? PSEUDO_PROPS.filter( ( p ) => 'content' !== p ) : [ ...own, ...extra ];
	// The element's context per width for canon() (lib/fill-held.mjs::elementContext); a painted layer is judged without one.
	const contextAt = ( w ) => ( layer ? {} : elementContext( st, rec, target, w ) );
	// A block's layout setting describes the element laying out its children: a draft wrapper around a grid reads as the grid.
	const valueAt = ( s, p ) => ( layer ? s.pseudo?.[ layer ]?.[ p ] : ( 'display' === p && '' === target.slot && /(flex|grid)$/.test( s.layoutDisplay || '' ) ? s.layoutDisplay : s.styles?.[ p ] ) );
	const fontPx = Object.fromEntries( Object.entries( snaps ).map( ( [ w, s ] ) => [ w, parseFloat( s.styles?.[ 'font-size' ] ) ] ).filter( ( [ , v ] ) => v ) );
	// A value that paints nothing at a width (lib/fill-prop.mjs::notPainted: a gap on a box laying out no flex or grid items,
	// an outline or border side with no width, a decoration with no line, a 0s transition) is left out there and recorded
	// as a settled row with its reason (notPaintedWhy), never dropped silently.
	const allDrafts = Object.fromEntries( ( layer ? ids : [ ...new Set( [ ...ids, ...CONTEXT_PROPS, ...TIE_PROPS ] ) ] ).map( ( p ) => [ p, Object.fromEntries( Object.entries( draftOf( snaps, ( s ) => valueAt( s, p ) ) ).filter( ( [ w ] ) => {
		if ( layer ) {
			return true;
		}
		if ( undeclaredInitial( p, valueAt( snaps[ w ], p ), st.reads.declared?.[ w ]?.[ target.id ] ?? null, defaultPaint( cal, target.slot, Number( w ), p ) ) ) {
			settled( st, rec, ref, { slot, property: p, value: String( valueAt( snaps[ w ], p ) ), widths: [ Number( w ) ], reason: 'not-painted', detail: `at ${ w }: ${ p } is its initial value, nothing in the draft's code declares it and the block's own default look paints the same, so the block's own layout stands` } );
			return false;
		}
		if ( ! notPainted( p, snaps[ w ].styles || {}, snaps[ w ] ) ) {
			return true;
		}
		settled( st, rec, ref, { slot, property: p, value: String( valueAt( snaps[ w ], p ) ), widths: [ Number( w ) ], reason: 'not-painted', detail: `at ${ w }: ${ notPaintedWhy( p, snaps[ w ].styles || {}, snaps[ w ] ) }` } );
		return false;
	} ) ) ] ) );
	const gapProp = {};
	// Four equal corner radii are read as the one `border-radius` they make, unless the ledger decides one of the corners.
	const radius = layer ? null : mergedRadius( allDrafts );
	const merged = radius && ! RADIUS_CORNERS.some( ( c ) => {
		const v = ledgerView( st, rec, ref, c, allDrafts[ c ], layer );
		return v.held.length || v.rules.length;
	} );
	if ( merged ) {
		allDrafts[ 'border-radius' ] = radius;
		RADIUS_CORNERS.forEach( ( c ) => delete allDrafts[ c ] );
	}
	// A decorative layer's stacking, anchor and sides-drawn size are written from the code the applier shares (lib/layer-box.mjs).
	const boxed = layer ? new Set() : fillLayerBox( { st, rec, ref, target, snaps, apply } );
	// A block reading the element its parent reads leaves the box look to the parent (lib/fill-shared-element.mjs).
	const parentBox = ! layer && parentDrawsBox( st, rec, target );
	// A link drawn with no line whose underline grows on hover is the block's `sweep` underline (lib/fill-underline-sweep.mjs): the
	// one write answers its text-decoration-line, and the gradient it grows from is the setting's own, so it is left out below.
	const sweep = layer ? null : sweepResult( { db: st.db, cal, block: rec.name, slot, snaps, reads: st.reads, id: target.id } );
	if ( sweep ) {
		( st.sweeps ??= new Map() ).set( target.id, sweep );
		// The write goes through the same owner check as every other write: a setting another element of the block already wrote
		// with another value is a conflict row, not replaced.
		const kept = sweep.writes.filter( ( w ) => ownerKeeps( st, rec, ref, target, 'text-decoration-line', w, sweep.slot ) );
		kept.length && apply( st, rec, ref, target, 'text-decoration-line', { ...sweep, writes: kept, readSlot: slot, answers: Object.keys( sweep.included ).map( Number ) }, sweep.slot );
		kept.forEach( ( w ) => recordOwner( st, rec, target, 'text-decoration-line', w.attr, target.slot === sweep.slot ) );
	}
	// The line a sweep grows on a painted ::before or ::after is the setting's own: its looks are settled, not written by another setting.
	const swept = layer ? st.sweeps?.get( target.id ) : null;
	if ( swept?.kinds?.includes( 'layer' ) ) {
		for ( const p of PSEUDO_PROPS.filter( ( x ) => 'content' !== x ) ) {
			const perWidth = draftOf( snaps, ( s ) => s.pseudo?.[ layer ]?.[ p ] );
			Object.keys( perWidth ).length && settled( st, rec, ref, { slot, property: p, value: valueText( perWidth ), widths: Object.keys( perWidth ).map( Number ), reason: 'held-by-setting', detail: `${ swept.writes[ 0 ].attr } sweep draws this line (its ${ layer } grows on hover)` } );
		}
		return;
	}
	for ( const prop of merged ? [ ...ids.filter( ( p ) => ! RADIUS_CORNERS.includes( p ) ), 'border-radius' ] : ids ) {
		if ( boxed.has( prop ) ) {
			continue;
		}
		if ( sweep && ( 'text-decoration-line' === prop || 'background-image' === prop ) ) {
			settled( st, rec, ref, { slot, property: prop, value: valueText( allDrafts[ prop ] || {} ), widths: Object.keys( allDrafts[ prop ] || {} ).map( Number ), reason: 'held-by-setting', detail: `${ sweep.writes[ 0 ].attr } sweep draws this underline (its line and the gradient it grows from)` } );
			continue;
		}
		if ( parentBox && BOX_LOOK.test( prop ) && allDrafts[ prop ] && Object.keys( allDrafts[ prop ] ).length ) {
			settled( st, rec, ref, { slot, property: prop, value: valueText( allDrafts[ prop ] ), widths: Object.keys( allDrafts[ prop ] ).map( Number ), reason: 'parent-held', detail: `the parent block reads this draft element too, and draws its box look once` } );
			continue;
		}
		let draft = allDrafts[ prop ];
		let rendered = null;
		let notPlain = [];
		let notPlainDeclared = {};
		// A 0s transition duration the draft never declares is the CSS initial value, not a design value (lib/fill-prop.mjs::
		// notPainted). It stays among the element's other draft properties (`allDrafts`, the context the resolver breaks ties
		// with) and is left out of what is resolved here, as a settled row.
		if ( ! layer && 'transition-duration' === prop ) {
			draft = { ...draft };
			for ( const w of Object.keys( draft ) ) {
				const declaredHere = st.reads.declared?.[ w ]?.[ target.id ] ?? null;
				if ( notPainted( prop, snaps[ w ].styles || {}, snaps[ w ], declaredHere, defaultPaint( cal, slot, Number( w ), prop ) ) ) {
					settled( st, rec, ref, { slot, property: prop, value: String( draft[ w ] ), widths: [ Number( w ) ], reason: 'not-painted', detail: `at ${ w }: ${ notPaintedWhy( prop, snaps[ w ].styles || {}, snaps[ w ], declaredHere ) }` } );
					delete draft[ w ];
				}
			}
		}
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
			const auto = Object.keys( draft ).filter( ( w ) => 'auto' === st.reads.declared?.[ w ]?.[ target.id ]?.[ prop ] );
			if ( auto.length ) {
				settled( st, rec, ref, { slot, property: prop, value: valueText( Object.fromEntries( auto.map( ( w ) => [ w, draft[ w ] ] ) ) ), widths: auto.map( Number ), reason: 'used-size', detail: `the code declares ${ prop }: auto at ${ auto.join( ', ' ) }px, the used size that centres the box` } );
			}
			auto.forEach( ( w ) => delete draft[ w ] );
			if ( ! Object.keys( draft ).length ) {
				continue;
			}
		}
		if ( 'width' === prop ) {
			// A computed width is the used size: only a width the draft declares as a plain length or percentage is written.
			const declared = Object.fromEntries( Object.keys( draft ).map( ( w ) => [ w, st.reads.declared?.[ w ]?.[ target.id ]?.width ] ).filter( ( [ , v ] ) => v ) );
			const t = usedValueTarget( 'width', { perWidth: draft, declared, held: led.held.map( ( h ) => String( h.width ) ) } );
			if ( t.gap ) {
				// A declared width the setting cannot take at every width is a row; a width the code never declares is the used size.
				const u = usedValueDrafts( draft, ( w ) => st.reads.declared?.[ w ]?.[ target.id ]?.width );
				const row = { slot, property: prop, value: valueText( draft ), widths: Object.keys( draft ).map( Number ) };
				u.notPlain.length || Object.keys( u.draft ).length ? unmapped( st, rec, ref, { ...row, reason: `${ t.gap }: ${ t.detail }` } ) : settled( st, rec, ref, { ...row, reason: 'used-size', detail: t.detail } );
				continue;
			}
			draft = t.perWidth;
		} else if ( ! layer && USED_VALUE.includes( prop ) ) {
			// A used-value property: the declared value, never the laid-out pixels; another declared form is named.
			const u = usedValueDrafts( draft, ( w ) => st.reads.declared?.[ w ]?.[ target.id ]?.[ prop ] );
			rendered = { ...draft };
			notPlain = u.notPlain.map( ( n ) => ( { slot, property: prop, value: n.declared, reason: `not-plain: the code declares ${ n.declared } at ${ n.width }px, which no setting holds as a length (the rendered pixels are a layout result)` } ) );
			notPlainDeclared = Object.fromEntries( u.notPlain.map( ( n ) => [ String( n.width ), String( n.declared ).trim() ] ) );
			draft = u.draft;
			// A width the code declares no length at (nothing, auto or a CSS-wide keyword) renders a layout result.
			const undeclared = Object.keys( rendered ).filter( ( w ) => ! ( w in draft ) && ! u.notPlain.some( ( n ) => String( n.width ) === w ) );
			if ( undeclared.length ) {
				settled( st, rec, ref, { slot, property: prop, value: valueText( Object.fromEntries( undeclared.map( ( w ) => [ w, rendered[ w ] ] ) ) ), widths: undeclared.map( Number ), reason: 'used-size', detail: `the code declares no ${ prop } length at ${ undeclared.join( ', ' ) }px: the rendered value is a layout result` } );
			}
			if ( ! Object.keys( draft ).length ) {
				// Nothing plain to write: the not-plain values are rows.
				notPlain.forEach( ( row ) => unmapped( st, rec, ref, row ) );
				continue;
			}
		}
		// A `normal` letter-spacing or line-height is written as the value it renders (lib/fill-normal-keywords.mjs), a line
		// height with its unitless declared form.
		let normalDeclared = {};
		if ( ! layer ) {
			const base = baselineFn( st, rec, cal, prop, ( w ) => fontPx[ w ] );
			const nk = normalKeywords( prop, draft, { snaps, base: ( w ) => base( slot, w ) } );
			draft = nk.draft;
			normalDeclared = nk.declared;
		}
		const fluid = fluidSamples( st, target, layer, prop );
		const alternates = layer ? [] : alternateSlots( cal, prop, draft, rec.targets.map( ( t ) => t.slot ), target.slot );
		const input = { node: st.flat[ rec.index ], block: rec.name, prop, draft, baseline: layer || '' !== target.slot ? baselineFn( st, rec, cal, prop, ( w ) => fontPx[ w ] ) : gutterBaseline( st, rec, prop, draft, allDrafts, baselineFn( st, rec, cal, prop, ( w ) => fontPx[ w ] ), cal ), slots: [ slot, ...alternates.filter( ( s ) => s !== slot ) ], calibration: cal, db: st.db, snapshot: st.snapshot, log: st.snaps, fontPx, siblings: allDrafts, fluid, declaredFluid: layer ? null : declaredFluid( st, target, prop, draft ), declared: layer ? {} : { ...agreedDeclared( st, target, prop, draft, fontPx ), ...normalDeclared }, contextAt };
		// A path the block's fixture renders in a state at rest (target.state: the open unit's, lib/skeleton-child-slots.mjs::
		// unitSlots) is resolved in that state first, so a setting of the state painting that path itself takes the read (an
		// accordion's open shadow); otherwise (no setting of the state, or one that only reaches the path, such as the open
		// header colour at a category line inside the header) the resting settings do (its open fill, the line's colour).
		const inState = target.state && ! layer ? resolveProperty( { ...input, state: target.state } ) : null;
		const res = writesOwnSlot( inState, cal, target.slot ) ? inState : resolveProperty( input );
		// A width where the property applies to no box the element is paints nothing there (lib/fill-prop.mjs::inapplicableAt): each
		// is a settled row naming why, and the equal row below covers only the widths the property applies at.
		const inapplicable = res.inapplicable ?? [];
		inapplicable.forEach( ( g ) => settled( st, rec, ref, { slot, property: prop, value: String( draft[ g.width ] ), widths: [ g.width ], reason: 'not-painted', detail: g.detail } ) );
		const eq = 'gap' === res.status && 'no-setting' === res.gap && ! layer ? fillEquivalent( st, rec, target, prop, draft, { baselineFn, apply } ) : null;
		// A property no setting of the block holds (no-setting), stated plain at some widths and in another form at the rest
		// (a hero's `82vh` on a phone, `min(84vh, 820px)` above), is one row stating every width's declared value, so the
		// residual pass writes each width's own expression; a row carrying the plain width alone would read as every width.
		const stated = 'gap' === res.status && 'no-setting' === res.gap && ( ! eq || 'gap' === eq.status ) && Object.keys( notPlainDeclared ).length ? { ...draft, ...notPlainDeclared } : null;
		( stated ? [] : notPlain ).forEach( ( row ) => unmapped( st, rec, ref, row ) );
		// The display the clone shows on this element, for the context its later properties and its children are judged in.
		if ( ! layer && 'display' === prop ) {
			recordDisplay( st, rec, cal, target.slot, draft, 'written' === res.status ? ( w ) => draft[ w ] : 'equal' === res.status ? ( w ) => input.baseline( res.slot ?? slot, w ) : null );
		}
		const applies = Object.keys( draft ).map( Number ).filter( ( w ) => ! inapplicable.some( ( g ) => g.width === w ) );
		if ( applies.length && ( 'equal' === res.status || 'equal' === eq?.status ) ) {
			// Which baseline made it equal (lib/fill-resolve-state.mjs::equalBaseline), and for a calibrated default the context
			// calibration measured it in (lib/fill-prop.mjs::calibratedContext). An equivalent setting's verdict names itself.
			const widths = applies;
			const at = res.slot ?? slot;
			const baseline = 'equal' === res.status ? equalBaseline( baselineSourceFn( st, rec, cal, prop, ( w ) => fontPx[ w ] ), input.baseline, at, widths ) : 'equivalent';
			const calibrated = 'calibrated-default' === baseline ? widths[ 0 ] : 'object' === typeof baseline && null !== baseline ? widths.find( ( w ) => 'calibrated-default' === baseline[ w ] ) : undefined;
			const measured = undefined !== calibrated ? calibratedContext( cal, at, calibrated ) : null;
			settled( st, rec, ref, { slot, property: prop, value: valueText( Object.fromEntries( widths.map( ( w ) => [ w, draft[ w ] ] ) ) ), widths, reason: 'equal', baseline, ...( measured ? { measured } : {} ), detail: 'the element already shows this value at every width (its parent, the theme or its calibrated default paint)' } );
		}
		if ( 'gap' === res.status && ( ! eq || 'gap' === eq.status ) ) {
			const ran = 'no-setting' === res.gap ? checksRan( { layer, alternates, res, eq } ) : {};
			const why = Object.entries( ran.skipped || {} ).map( ( [ check, reason ] ) => `${ check }: not asked: ${ reason }` );
			// The widths settled above as not painted are no part of the gap: the row and the part-wide pass state only the widths it applies at.
			const live = ( o ) => Object.fromEntries( Object.entries( o ).filter( ( [ w ] ) => ! inapplicable.some( ( g ) => g.width === Number( w ) ) ) );
			unmapped( st, rec, ref, { slot, property: prop, value: valueText( live( stated ?? draft ) ), reason: `${ res.gap }: ${ res.detail }${ eq ? `; ${ eq.detail }` : '' }${ why.map( ( w ) => `; ${ w }` ).join( '' ) }`, ...( res.code ? { code: res.code } : {} ), ...ran } );
			// A no-setting row on an element's own box goes to the part-wide pass (lib/fill-ancestor.mjs::partWideWrites), which asks the enclosing blocks.
			'no-setting' === res.gap && ! layer && ( st.hopRows ??= [] ).push( { row: st.out.unmapped.at( -1 ), rec, target, prop, draft: live( draft ), siblings: allDrafts } );
		} else if ( 'written' === res.status ) {
			// The widths of a mode no setting answers (lib/fill-prop.mjs::byMode) are a row of their own, naming those widths only
			// (`modeWidths`) and the settings not in force there (`notInForce`), so the passes after the walk write those widths'
			// look in the mode drawn there and never answer them from a setting of the other mode.
			for ( const g of res.modeGaps || [] ) {
				unmapped( st, rec, ref, { slot, property: prop, value: json( g.draft ), reason: `${ g.gap }: ${ g.detail }`, ...( g.code ? { code: g.code } : {} ), modeWidths: g.widths, notInForce: notInForce( cal, g.widths ) } );
				draft = Object.fromEntries( Object.entries( draft ).filter( ( [ w ] ) => ! g.widths.includes( Number( w ) ) ) );
			}
			// A setting of a part is written only from the element paired to that part (lib/fill-part-pairing.mjs).
			const unpaired = target.paired ? [] : res.writes.map( ( w ) => ( { w, why: unpairedPart( { db: st.db, block: rec.name, cal, attr: w.attr, readSlot: target.slot, prop, value: valueText( draft ), targets: rec.targets, readAt: ( id, x ) => st.reads.widths?.[ x ]?.[ id ], parentOf: st.inventory ? ( st.parentOf ??= draftParents( st.inventory ) ) : null } ) } ) ).filter( ( x ) => x.why );
			if ( unpaired.length ) {
				unpaired.forEach( ( x ) => unmapped( st, rec, ref, { slot, property: prop, value: valueText( draft ), reason: x.why } ) );
				res.writes = res.writes.filter( ( w ) => ! unpaired.some( ( x ) => x.w === w ) );
			}
			// An inherited value read on one of the block's parts (a draftSlots element) is never written on a setting calibration
			// shows only reaching that part from another element (the block's root typography): the setting would carry the
			// part's value to every text of the block the draft styles otherwise (an accordion header's button font size onto
			// its answers). The row names the setting.
			const reachOnly = ! layer && target.scoped && INHERITED.includes( prop ) ? res.writes.filter( ( w ) => {
				const c = cal?.settings?.[ w.attr ];
				return c && ! ( c.slots || [ c.slot ] ).some( ( p ) => LOOSE( p ) === LOOSE( target.slot ) );
			} ) : [];
			if ( reachOnly.length ) {
				unmapped( st, rec, ref, { slot, property: prop, value: valueText( draft ), reason: `reach-only: ${ reachOnly.map( ( w ) => w.attr ).join( ', ' ) } is calibrated on another element of ${ rec.name } and only reaches "${ target.slot }"; a part's inherited value is never written on the whole block` } );
				res.writes = [];
			}
			if ( ! res.writes.length ) {
				continue;
			}
			// One gap setting holds both a row and a column gap: a second prop writing it with another value is a conflict.
			const attrs = res.writes.map( ( w ) => w.attr );
			const prior = GAP_PROPS.includes( prop ) ? Object.entries( gapProp ).find( ( [ , a ] ) => a.attrs.some( ( x ) => attrs.includes( x ) ) ) : null;
			if ( prior && valueText( prior[ 1 ].draft ) !== valueText( draft ) ) {
				unmapped( st, rec, ref, { slot, property: prop, value: valueText( draft ), reason: `conflict: ${ attrs.join( ', ' ) } already holds ${ prior[ 0 ] } ${ valueText( prior[ 1 ].draft ) } (one setting, two gaps)` } );
			} else {
				if ( GAP_PROPS.includes( prop ) ) {
					gapProp[ prop ] = { attrs, draft };
				}
				// A draft value written with a token the site's snapshot carries is written as that token's reference (Spec 32 FR-32-29).
				res.writes = tokenWrites( st, target, prop, draft, res.writes, fontPx ).filter( ( w ) => ownerKeeps( st, rec, ref, target, prop, w, res.slot ) );
				apply( st, rec, ref, target, prop, { ...res, readSlot: slot, answers: answeredWidths( prop, draft, res ) }, res.slot );
				res.writes.forEach( ( w ) => recordOwner( st, rec, target, prop, w.attr, target.slot === res.slot ) );
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

// The checks a `no-setting` row went through before it was raised, for the census to class a row as a framework gap only
// when every check that can run did (lib/gap-classes.mjs): `own-slot` (a setting painting the element's own slot),
// `calibrated-slots` (the other slots the block's settings for the property paint, alternateSlots), `equivalence` (the
// css-equivalence engine, lib/css-equivalence), and `ancestor` (a setting on an enclosing block, lib/resolve.mjs::
// resolveViaAncestor), which the part-wide pass runs after the walk (lib/fill-ancestor.mjs::partWideWrites): it is listed
// under `unchecked` until that pass has looked at the row and moved it to `checks`. A painted layer tries its own slot alone:
// the two checks it skips are named under `skipped` with the reason, and stay out of `checks`.
export function checksRan( { layer, alternates, res, eq } ) {
	return {
		checks: [ 'own-slot', ...( layer ? [] : [ 'calibrated-slots' ] ), ...( res.equivalence || eq ? [ 'equivalence' ] : [] ) ],
		unchecked: [ 'ancestor' ],
		alternates: alternates.length,
		...( layer ? { skipped: { 'calibrated-slots': 'a painted layer is resolved on its own slot alone', ancestor: 'the part-wide pass asks for the box of an element in the tree, not a painted layer' } } : {} ),
	};
}

// Why a property lib/fill-prop.mjs::notPainted judges inert paints nothing on this element at this width: the zero width,
// the missing line or the instant transition that leaves it unseen (a gap's reason is gapPaintsNothing's).
export function notPaintedWhy( prop, styles, snap = null, declared = null ) {
	if ( 'transition-duration' === prop && null !== declared && undefined === declared[ prop ] ) {
		return `${ prop } ${ styles[ prop ] } is the initial value: the draft declares no transition on this element`;
	}
	if ( /gap$/.test( prop ) ) {
		return gapPaintsNothing( prop, styles, snap );
	}
	if ( /^flex-(direction|wrap)$/.test( prop ) ) {
		return flexOnlyPaintsNothing( prop, snap );
	}
	if ( /^outline-/.test( prop ) ) {
		return `${ prop } with outline-style ${ styles[ 'outline-style' ] ?? 'unread' } and outline-width ${ styles[ 'outline-width' ] ?? 'unread' }: no outline is drawn`;
	}
	const side = /^border-(top|right|bottom|left)-/.exec( prop );
	if ( side ) {
		return `${ prop } on a ${ side[ 1 ] } border of width ${ styles[ `border-${ side[ 1 ] }-width` ] }: no border is drawn on that side`;
	}
	if ( /^transition-/.test( prop ) ) {
		return `${ prop } with transition-duration ${ styles[ 'transition-duration' ] }: the change is instant, so nothing is timed`;
	}
	return `${ prop } with text-decoration-line ${ styles[ 'text-decoration-line' ] ?? 'none' }: no line is drawn`;
}

// The code's value at each width where it agrees with the value being written (FR-48-36 D–R `agree`): a confirmed row
// writes it in place of the rendered value. A run-time value (var(), calc(), a percentage) and a disagreement are left out.
// A column track list agrees where it lays out the rendered tracks (lib/normalise.mjs::declaredTracks): its `fr` and
// `auto` tracks never equal the rendered px, which is what the browser resolves them to.
export function agreedDeclared( st, target, prop, draft, fontPx ) {
	return Object.fromEntries( Object.keys( draft ).map( ( w ) => [ w, st.reads.declared?.[ w ]?.[ target.id ]?.[ prop ] ] )
		.filter( ( [ w, d ] ) => null != d && ( 'agree' === compareDR( prop, d, draft[ w ], fontPx[ w ] || 16 ).dr || ( 'grid-template-columns' === prop && !! declaredTracks( d, draft[ w ] ) ) ) ) );
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
