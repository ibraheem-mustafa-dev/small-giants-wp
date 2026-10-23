// The motion cloning writer (Spec 48 FR-48-78, FR-48-47; Spec 38A FR-38A-33, §14): each skeleton node's draft element
// and its slots take their motion records from the re-derived animation inventory (FR-48-25), become `sgsMotion`
// layers (lib/motion-layers.mjs) on the block's root or the declared part the slot names (`motion_targets`), snap to
// the client's tokens and to a framework preset where one equals them (lib/motion-tokens.mjs), and are written only
// when lib/motion-validate.mjs passes the whole document. The entrances sampled at 375, 768 and 1440
// (lib/fill-entrance.mjs) are the render check: a width whose measured delay or duration differs from the code by more
// than one sampling step writes that tier's value, and the difference is reported.
import { stateMotionRecords, MOTION_STATE_PROPS } from './fill-state-motion.mjs';
import { validateMotionWrite } from './motion-validate.mjs';
import { classify } from './motion-layers.mjs';
import { effectPresetFor, tokenTypes, clientTokens, clientPalette } from './motion-tokens.mjs';
import { writeEffect, loadEffectOffers, PANEL_LISTS } from './motion-effects.mjs';
import { applyBehaviours, applyControls, applyGlobals, applySettings, applyStrip, behaviourIndex, hasAttrOf } from './fill-behaviour.mjs';
import { accountedIds, silentRows, makeHomeOf, readingProgressHandover } from './fill-motion-account.mjs';
import { elementMotion, elementEffects, snapLayer } from './fill-motion-element.mjs';
import { openWords } from './motion-states.mjs';
import { setRecord } from './motion-set.mjs';
import { stateRows } from './state-vocab.mjs';
import { setAttr } from './tree.mjs';
import { templateKey, templateKeyOf } from './fact-key.mjs';

export { elementMotion, elementEffects, renderRefutes } from './fill-motion-element.mjs';

export const COVERAGE_WRITES = [
	'block-setting:css-gate:styling',
	'construct:helmet-script',
	'construct:keyframes',
	'construct:transition',
	'construct:waapi',
	'css-at:keyframes',
	'css-at:starting-style',
	'css-function:blur',
	'css-function:cubic-bezier',
	'css-function:grayscale',
	'css-function:inset',
	'css-function:linear',
	'css-function:matrix',
	'css-function:perspective',
	'css-function:rotate',
	'css-function:rotatex',
	'css-function:rotatey',
	'css-function:rotatez',
	'css-function:scale',
	'css-function:scale3d',
	'css-function:scalex',
	'css-function:scaley',
	'css-function:scalez',
	'css-function:translate',
	'css-function:translate3d',
	'css-function:translatex',
	'css-function:translatey',
	'css-function:translatez',
	'css-group:animations',
	'css-group:transitions',
	'css-media-feature:prefers-reduced-motion',
	'css-unit:deg',
	'css-unit:grad',
	'css-unit:ms',
	'css-unit:rad',
	'css-unit:s',
	'css-unit:turn',
	'html-attr:script.src',
	'html:script',
	'motion-preset:hover:hover-none',
];

// The inventory key of a draft element: the innermost host's name and the element's tpl id, from a tpl finder
// (`Host>Child@12#0/34#1` is `Child/34`); null for any other finder. An element of the root host takes `rootComponent`
// (the entry draft's component), because the runtime names the root host `Root` on a served draft and intake's harness
// names it after the component.
export function elementKey( finder, rootComponent = null ) {
	return templateKeyOf( finder && 'object' === typeof finder ? finder.tpl : null, rootComponent );
}

// Inventory records by element key (`<dc>/<tpl id>`); a record naming several template elements (a ref bound in each)
// is keyed under each, and a record with no template element is not keyed.
export function recordsByElement( records ) {
	const out = new Map();
	for ( const r of records || [] ) {
		const tpl = r.element?.template_tpl_id;
		for ( const id of null === tpl || undefined === tpl ? [] : [ tpl ].flat() ) {
			const key = templateKey( { dc: r.element.dc, tpl: id } );
			if ( ! out.has( key ) ) {
				out.set( key, [] );
			}
			out.get( key ).push( r );
		}
	}
	return out;
}

// A recognised behaviour whose element has no target of its own (an element a block draws, such as a nav item's label inside
// the nav block) is keyed under its nearest template ancestor that is a target, so the block that draws the element writes
// it. `targetKeys`: the element keys of every target; `template`: lib/fill-behaviour.mjs::templateOf; `isBehaviour( r )`.
export function adoptDrawnBehaviours( byElement, { targetKeys, template, isBehaviour } ) {
	const parentOf = ( key ) => template?.elements?.[ key ]?.parent ?? null;
	for ( const [ key, list ] of [ ...byElement ] ) {
		if ( targetKeys.has( key ) ) {
			continue;
		}
		let up = parentOf( key );
		while ( up && ! targetKeys.has( up ) ) {
			up = parentOf( up );
		}
		const moved = up ? list.filter( isBehaviour ) : [];
		if ( moved.length ) {
			byElement.set( up, [ ...( byElement.get( up ) || [] ), ...moved.filter( ( r ) => ! ( byElement.get( up ) || [] ).includes( r ) ) ] );
		}
	}
	return byElement;
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


// One effect as a validated layer of its block: placed and checked by lib/motion-effects.mjs::writeEffect, its
// intensity preset named before token snapping (a preset stamps literal values), then durations, curves and travel
// snapped to the client's tokens. Returns { target, list, layer, dropped } or { refused }.
function finishedEffect( e, { block, target, mdb, schema, offers, ctx, id } ) {
	const panel = e.panel || 'effects';
	const w = writeEffect( { block, target, effect: e.effect, panel, trigger: e.trigger, values: e.values, devices: e.devices, id }, { mdb, schema, offers } );
	if ( w.refused ) {
		return w;
	}
	const preset = 'effects' === panel ? effectPresetFor( w.layer, mdb.presets( 'effects' ) ) : null;
	if ( preset ) {
		w.layer.preset = preset;
	}
	snapLayer( w.layer, ( p ) => mdb.field( PANEL_LISTS[ panel ].layer, p, e.effect ), ctx, [ 'duration', 'easing', 'distance' ] );
	return w;
}

// The motion target a skeleton target is: the block's root for the node's own element, the declared part a slot names.
export function targetName( n, t, targets ) {
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
	// A loop the box already holds (a re-run over a written tree) is not added again.
	const fresh = items.filter( ( i ) => ! had( 'sgsCustomCss' ).includes( i.css ) );
	if ( ! fresh.length ) {
		return;
	}
	const css = [ had( 'sgsCustomCss' ), ...fresh.map( ( i ) => i.css ) ].filter( Boolean ).join( ' ' );
	const note = [ had( 'sgsCustomCssNote' ), ...fresh.map( ( i ) => `Loop ${ i.record.id }: ${ i.record.name }` ) ].filter( Boolean ).join( '; ' );
	// The scope key includes/custom-css.php::sgs_custom_css_uid accepts: 4 to 16 lowercase letters and digits.
	const id = `loop${ String( fresh[ 0 ].record.id ).toLowerCase().replace( /[^a-z0-9]/g, '' ) }`.slice( 0, 16 );
	const values = { sgsCustomCss: css, sgsCustomCssId: had( 'sgsCustomCssId' ) || id, sgsCustomCssNote: note };
	for ( const [ attr, value ] of Object.entries( values ) ) {
		const { before, after } = setAttr( node, { attr, value } );
		out.writes.push( { node: ref, block: n.name, slot: '', prop: `loop css ${ items.map( ( i ) => i.record.id ).join( ', ' ) }`, attr, before, after, widths: [], how: 'motion-css' } );
	}
}

const blank = ( v ) => null === v || undefined === v || '' === v || ( Array.isArray( v ) && ! v.length );

// A record whose trigger detail only says "Same as A-12" takes that record's trigger (its type, detail and state keys).
// A chain of "Same as" is followed to its end (a cycle stops), and a field the record states itself (not null, not empty)
// is laid over the referenced trigger.
export function sameTriggerResolved( records ) {
	const byId = new Map( ( records || [] ).map( ( r ) => [ r.id, r ] ) );
	const refOf = ( r ) => byId.get( /^Same as ([A-Za-z]+-\d+)\b/.exec( String( r.trigger?.detail ?? '' ) )?.[ 1 ] );
	const triggerOf = ( r, seen = new Set() ) => {
		const ref = refOf( r );
		if ( ! ref || seen.has( r.id ) ) {
			return r.trigger;
		}
		const base = triggerOf( ref, new Set( [ ...seen, r.id ] ) ) || {};
		const own = Object.fromEntries( Object.entries( r.trigger || {} ).filter( ( [ , v ] ) => ! blank( v ) ) );
		return { ...base, ...own, detail: `${ base.detail ?? '' } (${ r.trigger.detail })` };
	};
	return ( records || [] ).map( ( r ) => ( refOf( r ) ? { ...r, trigger: triggerOf( r ) } : r ) );
}

// Writes every node's sgsMotion. nodes: skeletonNodes() records; flat: tree nodes by index; refOf: tree node to ref;
// records: the inventory's animation records; sampled: { '<target id>': { 375, 768, 1440: shapeEntrance() result } };
// mdb: lib/motion-db.mjs::motionDb; schema: the motion schema; rawSnapshot: the client's theme snapshot; rootComponent:
// the entry draft's component (lib/fill-motion.mjs::elementKey); loops: sampleMotion()'s loops by target id; offers:
// lib/motion-effects.mjs::loadEffectOffers; stateVocab: the `states` table rows that give the words meaning "open"
// (default: the framework DB's). Returns { writes, unmapped, notes } in the shapes fill-resolve.mjs uses.
export function motionWrites( { nodes, flat, refOf, records: given, sampled = {}, loops = {}, mdb, schema, rawSnapshot, rootComponent = null, offers = loadEffectOffers(), stateVocab = null, template = null, draftCss = [], hasAttr: givenHasAttr = undefined, db = null, reads = null } ) {
	const out = { writes: [], unmapped: [], notes: [], site: [], handover: [] };
	// Every settings write is checked against the framework DB's attributes: the handle given, else the framework DB itself.
	const hasAttr = givenHasAttr ?? ( db ? hasAttrOf( db ) : undefined );
	const records = sameTriggerResolved( given );
	const byElement = recordsByElement( records );
	// One classification context everywhere: an empty CSS list is no CSS given (a draft served from a URL), not CSS with no consumer.
	const cls = { css: draftCss, template };
	const unplaced = ( records || [] ).filter( ( r ) => null === ( r.element?.template_tpl_id ?? null ) );
	const runtime = unplaced.filter( ( r ) => 'entrance' === classify( r, cls ).kind );
	const runtimeLoops = unplaced.filter( ( r ) => 'effect' === classify( r, cls ).kind );
	const used = [];
	const ctx = { types: tokenTypes( schema ), tokens: clientTokens( rawSnapshot ), palette: clientPalette( rawSnapshot ), css: draftCss };
	const idx = behaviourIndex( { records, template, css: draftCss } );
	const targetKeys = new Set( nodes.flatMap( ( n ) => n.targets.map( ( t ) => elementKey( t.finder, rootComponent ) ) ).filter( Boolean ) );
	adoptDrawnBehaviours( byElement, { targetKeys, template, isBehaviour: ( r ) => idx.found.some( ( x ) => x.r === r ) } );
	const blockDone = new Set();
	const written = new Map();
	const controls = [ ...idx.controls ];
	const deferred = [];
	let words = null;
	for ( const n of nodes ) {
		const stateOffers = { names: mdb.statesOf( n.name ), opens: mdb.opensOf( n.name ), openWords: () => ( words ??= openWords( stateVocab || stateRows() ) ) };
		const ref = refOf( flat[ n.index ] );
		const targets = mdb.targetsOf( n.name );
		const doc = { v: 1, elements: {} };
		const pending = [];
		const boxes = [];
		for ( const t of n.targets ) {
			const sets = ( loops[ t.id ]?.[ 1440 ]?.smil || [] ).map( ( a, i ) => ( 'set' === a.tag ? setRecord( a, i ) : null ) ).filter( Boolean );
			const key = elementKey( t.finder, rootComponent );
			let own = [ ...( byElement.get( key ) || [] ), ...idx.hostedFor( key ).map( ( x ) => x.r ), ...sets.flatMap( ( s ) => ( s.record ? [ s.record ] : [] ) ) ];
			const where = { node: ref, block: n.name, slot: t.slot };
			applyStrip( { n, target: t, key, idx, out, where, flat, hasAttr } );
			// Settings behaviours (the header's scrolled shadow, the timeline's pinned track, ...) write block settings, not motion layers.
			const settings = own.map( ( r ) => idx.found.find( ( x ) => x.r === r ) ).filter( ( x ) => x && 'settings' === x.b.kind );
			if ( settings.length ) {
				applySettings( { items: settings, n, out, where, flat, hasAttr, palette: ctx.palette } );
				own = own.filter( ( r ) => ! settings.some( ( x ) => x.r === r ) );
			}
			// A behaviour the block expresses as its own settings (a nav label's magnet as the nav's item magnet) needs no declared
			// part; it is written once per record however many of the block's slots it reaches.
			const blockLevel = own.map( ( r ) => idx.found.find( ( x ) => x.r === r ) ).filter( ( x ) => x && x.b.alt?.settings.every( ( s ) => hasAttr?.( n.name, s.attr ) ) );
			if ( blockLevel.length ) {
				const fresh = blockLevel.filter( ( x ) => ! blockDone.has( x.r.id ) );
				fresh.length && applyBehaviours( { items: fresh, n, target: null, doc, pending, written, controls, out, where, flat, finish: () => ( { refused: 'a block-level setting' } ), mdb, hasAttr } );
				fresh.forEach( ( x ) => blockDone.add( x.r.id ) );
				own = own.filter( ( r ) => ! blockLevel.some( ( x ) => x.r === r ) );
			}
			// A companion write the same element's block-level setting holds (a label's reset on leave, which the item magnet
			// does itself) needs no declared part either: it is noted once per record. Without that setting it is raised below.
			const held = own.map( ( r ) => idx.found.find( ( x ) => x.r === r ) ).filter( ( x ) => x && 'covered' === x.b.kind && blockLevel.some( ( y ) => y.b.effects?.some( ( e ) => e.effect === x.b.by ) ) );
			for ( const { r, b } of held.filter( ( x ) => ! blockDone.has( x.r.id ) ) ) {
				const timing = [ 'number' === typeof r.duration_ms ? `${ r.duration_ms }ms` : null, r.easing || null ].filter( Boolean ).join( ' ' );
				out.notes.push( { ...where, text: `${ r.id }: ${ b.reason }; the ${ b.by } is the ${ n.name } block-level setting${ timing ? `, whose own return timing stands for the draft's ${ timing }` : '' }` } );
				blockDone.add( r.id );
			}
			own = own.filter( ( r ) => ! held.some( ( x ) => x.r === r ) );
			// A hover transform only the state read finds (no inventory record reaches the element) is the same hover layer.
			if ( reads && targetName( n, t, targets ) && ! own.some( ( r ) => 'hover' === r.trigger?.type && ( r.properties || [] ).some( ( p ) => MOTION_STATE_PROPS.includes( p.property ) ) ) ) {
				own = [ ...own, ...stateMotionRecords( reads, t ) ];
			}
			if ( ! own.length && ! sampled[ t.id ]?.[ 1440 ] && ! loops[ t.id ] ) {
				continue;
			}
			const target = targetName( n, t, targets );
			if ( ! target ) {
				const reason = targets.length ? `no declared part of ${ n.name } is this element (${ t.slot })` : `${ n.name } has no motion support`;
				out.unmapped.push( ...own.map( ( r ) => ( { ...where, property: 'motion', value: r.id, reason: 'skip' === classify( r, cls ).kind ? `${ reason }; the record is also skipped: ${ classify( r, cls ).reason }` : reason } ) ) );
				const shown = Object.values( loops[ t.id ] || {} ).some( ( l ) => l.loops?.length || l.marquee || l.smil?.length );
				if ( shown && ! own.length ) {
					out.unmapped.push( { ...where, property: 'motion', value: t.id, reason: `the render shows motion (an endless animation, a marquee or an SVG animation) on this element, whose block has no motion support to write it to (${ reason })` } );
				}
				continue;
			}
			const m = elementMotion( own, { mdb, ctx, sampled: sampled[ t.id ], runtime, offers: stateOffers, target } );
			m.unmapped.push( ...sets.filter( ( s ) => s.reason ).map( ( s ) => ( { record: '<set>', reason: s.reason } ) ) );
			used.push( ...m.used );
			out.notes.push( ...m.notes.map( ( text ) => ( { ...where, text } ) ) );
			out.unmapped.push( ...m.unmapped.map( ( u ) => ( { ...where, property: 'motion', value: u.record, reason: u.reason } ) ) );
			if ( Object.keys( m.element ).length ) {
				doc.elements[ target ] = { ...( doc.elements[ target ] || {} ), ...m.element };
				pending.push( target );
			}
			const fx = elementEffects( own, { mdb, loops: loops[ t.id ] || null, runtimeLoops, cls } );
			used.push( ...fx.css.map( ( c ) => c.record.id ) );
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
				written.set( e.record, { at: w.target, layer: w.layer, list: w.list, where } );
				used.push( e.record );
				pending.push( w.target );
				out.notes.push( ...[ ...e.notes, ...( w.dropped.length ? [ `no ${ e.effect } field for ${ w.dropped.join( ', ' ) }` ] : [] ), ...( w.target !== target ? [ `${ e.effect } sits on the block, so the ${ target } loop is written on root` ] : [] ) ].map( ( text ) => ( { ...where, text: `${ e.record }: ${ text }` } ) ) );
			}
			const behaviours = own.map( ( r ) => idx.found.find( ( x ) => x.r === r ) ).filter( Boolean );
			if ( behaviours.length ) {
				applyBehaviours( { items: behaviours, n, target, doc, pending, written, controls, out, where, flat, finish: ( e, id ) => finishedEffect( e, { block: n.name, target, mdb, schema, offers, ctx, id } ), mdb, hasAttr } );
			}
		}
		if ( boxes.length ) {
			writeLoopCss( n, boxes, { flat, ref, out } );
		}
		if ( pending.length ) {
			deferred.push( () => writeNode( n, doc, [ ...new Set( pending ) ], { flat, ref, schema, out } ) );
		}
	}
	applyControls( { controls, written, out, schema } );
	applyGlobals( { found: idx.found, out } );
	// A record on this surface that nothing above wrote, reported or noted is named, never left silent.
	const homeOf = makeHomeOf( { records, nodes, keyOf: ( finder ) => elementKey( finder, rootComponent ), idx } );
	out.unmapped.push( ...silentRows( { records, accounted: accountedIds( { used, written, out } ), refOf: ( n ) => refOf( flat[ n.index ] ), homeOf } ) );
	out.handover.push( ...readingProgressHandover( { found: idx.found, homeOf } ) );
	deferred.forEach( ( write ) => write() );
	return out;
}
