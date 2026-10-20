// The motion cloning writer (Spec 48 FR-48-78, FR-48-47; Spec 38A FR-38A-33, §14): each skeleton node's draft element
// and its slots take their motion records from the re-derived animation inventory (FR-48-25), become `sgsMotion`
// layers (lib/motion-layers.mjs) on the block's root or the declared part the slot names (`motion_targets`), snap to
// the client's tokens and to a framework preset where one equals them (lib/motion-tokens.mjs), and are written only
// when lib/motion-validate.mjs passes the whole document. The entrances sampled at 375, 768 and 1440
// (lib/fill-entrance.mjs) are the render check: a width whose measured delay or duration differs from the code by more
// than one sampling step writes that tier's value, and the difference is reported.
import { validateMotionWrite } from './motion-validate.mjs';
import { classify, entranceLayer, hoverLayer, matchByPose } from './motion-layers.mjs';
import { snapToken, presetFor, effectPresetFor, tokenTypes, clientTokens, clientPalette, tokenises } from './motion-tokens.mjs';
import { writeEffect, loadEffectOffers } from './motion-effects.mjs';
import { loopEffect, loopCheck, chooseEffect, runtimeLoopsFor, smilLoop, marqueeTag, measuredLoopOf } from './motion-loops.mjs';
import { loopKeyframesCss, loopName, isLoopRecord } from './motion-loop-css.mjs';
import { entranceCheck } from './motion-check.mjs';
import { setAttr } from './tree.mjs';

// The inventory key of a draft element: the innermost host's name and the element's tpl id, from a tpl finder
// (`Host>Child@12#0/34#1` is `Child/34`); null for any other finder. An element of the root host takes `rootComponent`
// (the entry draft's component), because the runtime names the root host `Root` on a served draft and intake's harness
// names it after the component.
export function elementKey( finder, rootComponent = null ) {
	const tpl = finder && 'object' === typeof finder ? finder.tpl : null;
	const m = /^([^/]+)\/(\d+)#\d+$/.exec( tpl || '' );
	if ( ! m ) {
		return null;
	}
	const parts = m[ 1 ].split( '>' );
	const host = 1 === parts.length && rootComponent ? rootComponent : parts.pop().replace( /(?:@\d+)?#\d+$/, '' );
	return `${ host }/${ m[ 2 ] }`;
}

// Inventory records by element key (`<dc>/<tpl id>`); a record naming several template elements (a ref bound in each)
// is keyed under each, and a record with no template element is not keyed.
export function recordsByElement( records ) {
	const out = new Map();
	for ( const r of records || [] ) {
		const tpl = r.element?.template_tpl_id;
		for ( const id of null === tpl || undefined === tpl ? [] : [ tpl ].flat() ) {
			const key = `${ r.element.dc }/${ id }`;
			if ( ! out.has( key ) ) {
				out.set( key, [] );
			}
			out.get( key ).push( r );
		}
	}
	return out;
}

// The declared part a slot finder's element is: the part whose class (its declared `css_element` selector, else
// `sgs-<slug>__<part>`) is a class of the slot selector's last compound. Returns the target name or null.
export function partForSlot( block, slotFinder, targets ) {
	const sel = 'string' === typeof slotFinder ? slotFinder : null;
	if ( ! sel ) {
		return null;
	}
	const last = sel.trim().split( /\s*[>+~]\s*|\s+/ ).pop() || '';
	const classes = new Set( [ ...last.matchAll( /\.([A-Za-z0-9_-]+)/g ) ].map( ( m ) => m[ 1 ] ) );
	const slug = block.replace( /^sgs\//, '' );
	const hit = targets.find( ( t ) => 'part' === t.kind && classes.has( String( t.cssElement || '' ).startsWith( '.' ) ? t.cssElement.slice( 1 ) : `sgs-${ slug }__${ t.cssElement }` ) );
	return hit ? hit.target : null;
}

// Every duration, easing and distance of a layer's values (and its device overrides) to a token reference where one
// equals it. `fieldOf(path)` gives the DB field for a values path.
function snapLayer( layer, fieldOf, ctx, prefer ) {
	const walkObj = ( obj, base ) => {
		for ( const [ k, v ] of Object.entries( obj ) ) {
			const p = `${ base }.${ k }`;
			if ( v && 'object' === typeof v && ! Array.isArray( v ) ) {
				walkObj( v, p );
			} else if ( Array.isArray( v ) ) {
				v.filter( ( item ) => item && 'object' === typeof item ).forEach( ( item ) => walkObj( item, p ) );
			} else {
				const f = fieldOf( p );
				if ( f && tokenises( k, f.fieldType ) ) {
					obj[ k ] = snapToken( v, f.fieldType, { ...ctx, prefer } );
				} else if ( f && 'colourReference' === f.fieldType && 'string' === typeof v ) {
					obj[ k ] = ctx.palette?.get( v.toLowerCase() ) ?? v;
				}
			}
		}
	};
	walkObj( layer.values, 'values' );
	for ( const dev of Object.values( layer.devices || {} ) ) {
		walkObj( dev, 'values' );
	}
}

// True when the element was found at some sampled width and played no entrance at any width it was found: the render
// disagrees with the code's record, and the render wins (R-47-4).
export const renderRefutes = ( sampled ) => {
	const seen = Object.values( sampled || {} ).filter( ( m ) => undefined !== m );
	return seen.length > 0 && seen.every( ( m ) => null === m );
};

// One entrance record as a finished `entrance.base`: render-checked, token-snapped, preset-named. { layer, notes } or
// { unmapped }.
function finishedEntrance( record, { mdb, ctx, sampled } ) {
	if ( renderRefutes( sampled ) ) {
		return { unmapped: `the code's record names this element, but the render shows no entrance at ${ Object.keys( sampled ).join( ', ' ) }, so the render wins and nothing is written` };
	}
	const e = entranceLayer( record, mdb, sampled?.[ 1440 ] || null );
	if ( e.unmapped ) {
		return e;
	}
	const check = entranceCheck( e.layer, record, sampled );
	if ( Object.keys( check.devices ).length ) {
		e.layer.devices = check.devices;
	}
	snapLayer( e.layer, ( p ) => mdb.field( 'entrance.base', p ), ctx, [ 'entrance' ] );
	const preset = presetFor( e.layer, mdb.presets( 'entrance' ) );
	if ( preset ) {
		e.layer.preset = preset;
	}
	return { layer: e.layer, notes: [ ...e.notes, ...check.differences.map( ( d ) => `render check ${ d }` ) ] };
}

// One hover layer from an element's hover records, token-snapped and preset-named: { layer, notes, unmapped }.
function finishedHover( records, { mdb, ctx } ) {
	const h = hoverLayer( records, mdb );
	if ( h.layer ) {
		snapLayer( h.layer, ( p ) => mdb.field( 'hover.state', p ), ctx, [ 'duration', 'easing', 'distance' ] );
		const preset = presetFor( { ...h.layer, trigger: 'hover' }, mdb.presets( 'hover' ) );
		if ( preset ) {
			h.layer.preset = preset;
		}
	}
	return h;
}

// The entrance record an element plays: its own, else (when the render measured one) the run-time record whose
// from-pose it matches. `others` are the element's records no layer of this writer holds, named when they explain a
// measured motion. { record, notes, unmapped }.
function pickEntrance( own, measured, runtime, others = [] ) {
	const notes = [];
	const unmapped = own.slice( 1 ).map( ( r ) => ( { record: r.id, reason: 'a second entrance on the same element: one entrance layer per element' } ) );
	if ( own.length ) {
		return { record: own[ 0 ], notes, unmapped };
	}
	if ( ! measured ) {
		return { record: null, notes, unmapped };
	}
	const m = runtime.length ? matchByPose( runtime, measured ) : null;
	if ( m?.record ) {
		notes.push( `${ m.record.id }: the code picks this element at run time, and the render's from-pose matched it` );
		return { record: m.record, notes, unmapped };
	}
	const oneShot = others.filter( ( r ) => /^(waapi|css-animation)$/.test( r.mechanism ) );
	if ( m?.ambiguous ) {
		unmapped.push( { record: m.ambiguous.join( ',' ), reason: 'the render\'s from-pose matches more than one run-time entrance equally' } );
	} else if ( oneShot.length ) {
		notes.push( `the render shows ${ oneShot.map( ( r ) => r.id ).join( ', ' ) } playing (${ measured.durationMs }ms), which its own wave writes (see its unmapped row)` );
	} else {
		notes.push( `the render shows a ${ measured.trigger } entrance (${ measured.durationMs }ms) that no code record explains, so nothing is written` );
	}
	return { record: null, notes, unmapped };
}

// The layers one draft element's records make on one target: { element, notes, unmapped: [{ record, reason }] }.
// `runtime` holds the entrance records whose element the code picks at run time.
export function elementMotion( records, { mdb, ctx, sampled, runtime = [] } ) {
	const element = {};
	const kinds = records.map( ( r ) => ( { r, c: classify( r ) } ) );
	const unmapped = kinds.filter( ( x ) => 'skip' === x.c.kind ).map( ( x ) => ( { record: x.r.id, reason: x.c.reason } ) );
	const pick = pickEntrance( kinds.filter( ( x ) => 'entrance' === x.c.kind ).map( ( x ) => x.r ), sampled?.[ 1440 ] || null, runtime, kinds.filter( ( x ) => 'skip' === x.c.kind ).map( ( x ) => x.r ) );
	const notes = [ ...pick.notes ];
	unmapped.push( ...pick.unmapped );
	if ( pick.record ) {
		const e = finishedEntrance( pick.record, { mdb, ctx, sampled } );
		if ( e.unmapped ) {
			unmapped.push( { record: pick.record.id, reason: e.unmapped } );
		} else {
			element.entrance = { base: e.layer };
			notes.push( ...e.notes.map( ( n ) => `${ pick.record.id }: ${ n }` ) );
		}
	}
	const hovers = kinds.filter( ( x ) => 'hover' === x.c.kind ).map( ( x ) => x.r );
	if ( hovers.length ) {
		const h = finishedHover( hovers, { mdb, ctx } );
		unmapped.push( ...h.unmapped.map( ( reason ) => ( { record: hovers.map( ( x ) => x.id ).join( ',' ), reason } ) ) );
		notes.push( ...h.notes );
		if ( h.layer ) {
			element.hover = { state: h.layer };
		}
	}
	return { element, notes, unmapped };
}

// The effects one draft element's endless animations make: its own loop records, else the run-time loop records the
// animation measured on it is (runtimeLoopsFor), plus a <marquee>'s attributes and its SVG animation elements.
// `loops` is the element's sampleMotion() loops by width. Returns { effects: [{ record, effect, values, devices,
// trigger, notes }], css: [{ record, name, css }], unmapped: [{ record, reason }], notes }. An endless keyframe animation
// no effect draws becomes `css` (the block's Additional CSS box, lib/motion-loop-css.mjs) when its values are literal.
export function elementEffects( records, { mdb, loops = null, runtimeLoops = [] } ) {
	const out = { effects: [], css: [], unmapped: [], notes: [] };
	const wide = loops?.[ 1440 ] || null;
	let own = records.filter( ( r ) => 'effect' === classify( r ).kind );
	if ( ! own.length && wide?.loops?.length ) {
		own = wide.loops.flatMap( ( l ) => runtimeLoopsFor( runtimeLoops, { ...wide, loops: [ l ] } ).slice( 0, 1 ) );
		out.notes.push( ...own.map( ( r ) => `${ r.id }: the code picks this element at run time, and the endless animation on it matched` ) );
	}
	const keep = ( record, e ) => ( e.unmapped ? out.unmapped.push( { record, reason: e.unmapped } ) : out.effects.push( { record, ...e } ) );
	for ( const r of own ) {
		const t = r.trigger?.type;
		if ( classify( r ).confirm && ! measuredLoopOf( r, wide ) ) {
			keep( r.id, { unmapped: `the draft's code starts this loop on ${ t }, and the render showed it not running on an untouched page, so nothing is written` } );
			continue;
		}
		const e = loopEffect( r, loops, { mdb } );
		const boxed = e.unmapped && isLoopRecord( r ) ? loopKeyframesCss( r, loopName( r ) ) : null;
		if ( boxed?.css ) {
			out.css.push( { record: r, css: boxed.css } );
			out.notes.push( `${ r.id }: no motion effect draws this loop (${ e.unmapped }), so it is written to the Additional CSS box: ${ boxed.stops } stops sampled from the ${ r.easing } curve, linear between them` );
			continue;
		}
		keep( r.id, e.unmapped || 'scroll-into-view' !== t ? e : { ...e, trigger: 'visible' } );
		out.notes.push( ...loopCheck( r, loops ).map( ( d ) => `${ r.id }: render check ${ d }` ) );
	}
	if ( wide?.marquee ) {
		const values = marqueeTag( wide.marquee );
		keep( '<marquee>', values ? { effect: 'marquee', values, devices: {}, trigger: 'load', notes: [] } : { unmapped: `a <marquee behavior="${ wide.marquee.behavior }">: the marquee effect only scrolls, a Spec 38 gap` } );
	}
	( wide?.smil || [] ).forEach( ( a, i ) => {
		const loop = smilLoop( a, wide.box );
		if ( loop ) {
			const at = ( w ) => ( loops?.[ w ]?.smil?.[ i ] ? smilLoop( loops[ w ].smil[ i ], loops[ w ].box ) : null );
			keep( `<${ a.tag } ${ a.attributeName || a.type || '' }>`, chooseEffect( loop, { tablet: at( 768 ), mobile: at( 375 ) }, { mdb } ) );
		}
	} );
	if ( wide?.loops?.length && ! own.length ) {
		out.notes.push( `the render shows an endless animation on this element that no code record explains, so nothing is written (R-47-4)` );
	}
	return out;
}

// One effect as a validated layer of its block: placed and checked by lib/motion-effects.mjs::writeEffect, its
// intensity preset named before token snapping (a preset stamps literal values), then durations, curves and travel
// snapped to the client's tokens. Returns { target, list, layer, dropped } or { refused }.
function finishedEffect( e, { block, target, mdb, schema, offers, ctx, id } ) {
	const w = writeEffect( { block, target, effect: e.effect, trigger: e.trigger, values: e.values, devices: e.devices, id }, { mdb, schema, offers } );
	if ( w.refused ) {
		return w;
	}
	const preset = effectPresetFor( w.layer, mdb.presets( 'effects' ) );
	if ( preset ) {
		w.layer.preset = preset;
	}
	snapLayer( w.layer, ( p ) => mdb.field( 'effects', p, e.effect ), ctx, [ 'duration', 'easing', 'distance' ] );
	return w;
}

// The motion target a skeleton target is: the block's root for the node's own element, the declared part a slot names.
function targetName( n, t, targets ) {
	return t.slot ? partForSlot( n.name, t.slot, targets ) : targets.find( ( x ) => 'root' === x.target )?.target || null;
}

// Validates one node's document and writes it, or reports it refused.
function writeNode( n, doc, pending, { flat, ref, schema, out } ) {
	const verdict = validateMotionWrite( doc, schema );
	if ( ! verdict.valid ) {
		out.unmapped.push( { node: ref, block: n.name, slot: '', property: 'motion', value: pending.join( ', ' ), reason: `sgsMotion refused: ${ [ ...verdict.errors, ...verdict.refusals ].join( '; ' ) }` } );
		return;
	}
	const { before, after } = setAttr( flat[ n.index ], { attr: 'sgsMotion', value: doc } );
	out.writes.push( { node: ref, block: n.name, slot: '', prop: `motion ${ pending.join( ', ' ) }`, attr: 'sgsMotion', before, after, widths: [], how: 'motion' } );
}

// Writes a node's endless-loop CSS into its Additional CSS box (`sgsCustomCss`, scoped to the block instance by
// includes/custom-css.php): appended to what the box holds, with the scope key and the note naming each record.
function writeLoopCss( n, items, { flat, ref, out } ) {
	const node = flat[ n.index ];
	const had = ( a ) => node.attributes?.[ a ] || '';
	const css = [ had( 'sgsCustomCss' ), ...items.map( ( i ) => i.css ) ].filter( Boolean ).join( ' ' );
	const note = [ had( 'sgsCustomCssNote' ), ...items.map( ( i ) => `Loop ${ i.record.id }: ${ i.record.name }` ) ].filter( Boolean ).join( '; ' );
	const values = { sgsCustomCss: css, sgsCustomCssId: had( 'sgsCustomCssId' ) || `loop-${ String( items[ 0 ].record.id ).toLowerCase() }`, sgsCustomCssNote: note };
	for ( const [ attr, value ] of Object.entries( values ) ) {
		const { before, after } = setAttr( node, { attr, value } );
		out.writes.push( { node: ref, block: n.name, slot: '', prop: `loop css ${ items.map( ( i ) => i.record.id ).join( ', ' ) }`, attr, before, after, widths: [], how: 'motion-css' } );
	}
}

// Writes every node's sgsMotion. nodes: skeletonNodes() records; flat: tree nodes by index; refOf: tree node to ref;
// records: the inventory's animation records; sampled: { '<target id>': { 375, 768, 1440: shapeEntrance() result } };
// mdb: lib/motion-db.mjs::motionDb; schema: the motion schema; rawSnapshot: the client's theme snapshot; rootComponent:
// the entry draft's component (lib/fill-motion.mjs::elementKey); loops: sampleMotion()'s loops by target id; offers:
// lib/motion-effects.mjs::loadEffectOffers. Returns { writes, unmapped, notes } in the shapes fill-resolve.mjs uses.
export function motionWrites( { nodes, flat, refOf, records, sampled = {}, loops = {}, mdb, schema, rawSnapshot, rootComponent = null, offers = loadEffectOffers() } ) {
	const out = { writes: [], unmapped: [], notes: [] };
	const byElement = recordsByElement( records );
	const unplaced = ( records || [] ).filter( ( r ) => null === ( r.element?.template_tpl_id ?? null ) );
	const runtime = unplaced.filter( ( r ) => 'entrance' === classify( r ).kind );
	const runtimeLoops = unplaced.filter( ( r ) => 'effect' === classify( r ).kind );
	const ctx = { types: tokenTypes( schema ), tokens: clientTokens( rawSnapshot ), palette: clientPalette( rawSnapshot ) };
	for ( const n of nodes ) {
		const ref = refOf( flat[ n.index ] );
		const targets = mdb.targetsOf( n.name );
		const doc = { v: 1, elements: {} };
		const pending = [];
		const boxes = [];
		for ( const t of n.targets ) {
			const own = byElement.get( elementKey( t.finder, rootComponent ) ) || [];
			if ( ! own.length && ! sampled[ t.id ]?.[ 1440 ] && ! loops[ t.id ] ) {
				continue;
			}
			const where = { node: ref, block: n.name, slot: t.slot };
			const target = targetName( n, t, targets );
			if ( ! target ) {
				const reason = targets.length ? `no declared part of ${ n.name } is this element (${ t.slot })` : `${ n.name } has no motion support`;
				out.unmapped.push( ...own.map( ( r ) => ( { ...where, property: 'motion', value: r.id, reason: 'skip' === classify( r ).kind ? `${ reason }; the record is also skipped: ${ classify( r ).reason }` : reason } ) ) );
				const shown = Object.values( loops[ t.id ] || {} ).some( ( l ) => l.loops?.length || l.marquee || l.smil?.length );
				if ( shown && ! own.length ) {
					out.unmapped.push( { ...where, property: 'motion', value: t.id, reason: `the render shows motion (an endless animation, a marquee or an SVG animation) on this element, whose block has no motion support to write it to (${ reason })` } );
				}
				continue;
			}
			const m = elementMotion( own, { mdb, ctx, sampled: sampled[ t.id ], runtime } );
			out.notes.push( ...m.notes.map( ( text ) => ( { ...where, text } ) ) );
			out.unmapped.push( ...m.unmapped.map( ( u ) => ( { ...where, property: 'motion', value: u.record, reason: u.reason } ) ) );
			if ( Object.keys( m.element ).length ) {
				doc.elements[ target ] = { ...( doc.elements[ target ] || {} ), ...m.element };
				pending.push( target );
			}
			const fx = elementEffects( own, { mdb, loops: loops[ t.id ] || null, runtimeLoops } );
			out.notes.push( ...fx.notes.map( ( text ) => ( { ...where, text } ) ) );
			out.unmapped.push( ...fx.unmapped.map( ( u ) => ( { ...where, property: 'motion', value: u.record, reason: u.reason } ) ) );
			if ( 'root' === target ) {
				boxes.push( ...fx.css );
			} else {
				out.unmapped.push( ...fx.css.map( ( c ) => ( { ...where, property: 'motion', value: c.record.id, reason: `an endless keyframe animation on the ${ target } part: the block's Additional CSS box styles the block itself, not a part` } ) ) );
			}
			for ( const e of fx.effects ) {
				const list = ( at ) => doc.elements[ at ]?.effects || [];
				const id = `${ e.effect }-${ [ 'root', target ].reduce( ( k, at ) => Math.max( k, list( at ).filter( ( l ) => l.effect === e.effect ).length ), 0 ) + 1 }`;
				const w = finishedEffect( e, { block: n.name, target, mdb, schema, offers, ctx, id } );
				if ( w.refused ) {
					out.unmapped.push( { ...where, property: 'motion', value: e.record, reason: `${ e.effect }: ${ w.refused }` } );
					continue;
				}
				doc.elements[ w.target ] = { ...( doc.elements[ w.target ] || {} ), effects: [ ...list( w.target ), w.layer ] };
				pending.push( w.target );
				out.notes.push( ...[ ...e.notes, ...( w.dropped.length ? [ `no ${ e.effect } field for ${ w.dropped.join( ', ' ) }` ] : [] ), ...( w.target !== target ? [ `${ e.effect } sits on the block, so the ${ target } loop is written on root` ] : [] ) ].map( ( text ) => ( { ...where, text: `${ e.record }: ${ text }` } ) ) );
			}
		}
		if ( boxes.length ) {
			writeLoopCss( n, boxes, { flat, ref, out } );
		}
		if ( pending.length ) {
			writeNode( n, doc, [ ...new Set( pending ) ], { flat, ref, schema, out } );
		}
	}
	return out;
}
