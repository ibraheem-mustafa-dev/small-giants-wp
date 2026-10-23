// Fill's state pass (Spec 48 FR-48-81): writes each target's state looks (lib/fill-state-read.mjs::readStates, read
// into readDraft's `states`) into the block settings that hold them, a first pass from the draft's code beside Fill's
// resting pass. Solve keeps correcting the residue the walker measures, through the same resolver with the same state.
// A look is written only through a setting state the framework DB holds (block_attributes.css_state). Keyboard focus
// that paints like hover is already written by the hover setting (SGS paints hover on :hover and :focus-visible
// together); any other look no setting holds is reported as a gap, never dropped.
//
// Three looks go to the client's theme snapshot instead (lib/fill-state-tokens.mjs): a focus look unlike hover, a press look
// on a button, and a :link, :any-link or :visited look on a plain content link; Fill returns them as `patch` and never
// edits the snapshot itself.
//
// A surface's open look: a modal, nav drawer or mega panel that is not shown at rest (every read width finds nothing
// visible) has no resting look to keep, so the look its :modal, :popover-open, :target or open state paints is the
// surface's own look. Fill writes it through the resolver as the resting state (state null), into the settings the
// surface paints at rest. A surface shown at rest, and a surface block whose settings hold an open state, keep the
// state-setting path below.
//
// A block's own interaction look (hover, focus, press) shows whatever the draft does, so writing only what the draft's state
// declares leaves it live. Calibration records it (defaultStateLook): where the block changes a property in that state and
// the draft does not, the setting that holds the state is written with the draft's resting value (holdDefaults), and a
// change no setting holds is a named `default-state` gap.

import { setAttr, refOf, walk } from './tree.mjs';
import { resolveProperty, knownPaths, notPainted } from './fill-prop.mjs';
import { LOOSE } from './resolve.mjs';
import { settingStates, statesVocabulary } from './db.mjs';
import { longhands } from './calibrate-props.mjs';
import { alternateSlots } from './fill-resolve-state.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { TIMING_PROPS, timingWrites } from './fill-timing.mjs';
import { motionDb } from './motion-db.mjs';
import { targetName } from './fill-motion.mjs';
import { MOTION_STATE_PROPS, stateHover } from './fill-state-motion.mjs';
import { createPatch, tokenRoute, pickValue, pressVariant, ownedBySetting, applyTokenLooks, conflictRow } from './fill-state-tokens.mjs';

export const COVERAGE_WRITES = [
	'aria-attr:aria-checked',
	'aria-attr:aria-current',
	'aria-attr:aria-expanded',
	'aria-attr:aria-pressed',
	'aria-attr:aria-selected',
	'construct:style-hover',
	'css-pseudo-class:checked',
	'css-pseudo-class:disabled',
	'css-pseudo-class:hover',
	'css-pseudo-class:modal',
	'css-pseudo-class:open',
	'css-pseudo-class:popover-open',
	'css-pseudo-class:target',
];

// The blocks whose panel is hidden until a trigger opens it (their open look is their own look).
export const SURFACE_BLOCKS = [ 'sgs/modal', 'sgs/nav-drawer', 'sgs/mega-panel' ];

// Whether a target was read at every width and found nothing visible there (a closed dialog, drawer or panel).
export const hiddenAtRest = ( reads, id ) => READ_WIDTHS.every( ( w ) => true === reads.widths?.[ w ]?.[ id ]?.missing );

const same = ( a, b ) => JSON.stringify( a ) === JSON.stringify( b );

// One target's state looks grouped by state, pseudo-element and property across the read widths: Map
// `${state}|${pseudo-element or ''}|${prop}` →
// { state, prop, pseudo, perWidth, read ('code' when any width's value was read from the stylesheet), draftDefect (the draft ID of a
// declaration the draft never paints, built from the code: lib/fill-state-defect.mjs) }. A combination of states (hover on the current item) keeps every word, joined by `+`.
// reads: readDraft's result; id: the target id.
export function stateDrafts( reads, id ) {
	const out = new Map();
	for ( const w of READ_WIDTHS ) {
		for ( const look of reads.states?.[ w ]?.looks?.[ id ] || [] ) {
			const state = [ ...look.states ].sort().join( '+' );
			// The rendered value is what Fill writes (code first, the render confirms): a property with no render read
			// (an unresolved var() or currentcolor in its declared text) is not written from its declaration.
			for ( const prop of Object.keys( look.declared ).filter( ( p ) => ! TIMING_PROPS.includes( p ) ) ) {
				// A look read from the stylesheet (read 'code': a state no browser can enter) has no rendered value; its declared
				// value is the value. An entered look's rendered value wins over a code look of the same state and property.
				const code = 'code' === look.read;
				const value = look.rendered?.[ prop ] ?? ( code ? look.declared[ prop ] : undefined );
				if ( ! value ) {
					continue;
				}
				// A look on a pseudo-element (`::after` under :hover) is that layer's own look, kept apart from the element's.
				const pseudo = look.pseudo || '';
				const key = `${ state }|${ pseudo }|${ prop }`;
				const e = out.get( key ) || { state, prop, pseudo, perWidth: {}, byCode: {}, read: 'entered' };
				look.draftDefect && ( e.draftDefect = look.draftDefect );
				if ( code && undefined !== e.perWidth[ w ] ) {
					continue;
				}
				e.perWidth[ w ] = value;
				e.byCode[ w ] = code;
				e.read = Object.values( e.byCode ).some( Boolean ) ? 'code' : 'entered';
				out.set( key, e );
			}
		}
	}
	return out;
}

// The target's resting snapshot (tag, link, role, class): the narrowest read width whose snapshot identifies the element
// (has a tag), since a target hidden at a narrow width has no tag there; with none identified, the narrowest one.
export function targetSnap( reads, target ) {
	const snaps = READ_WIDTHS.map( ( w ) => reads.widths?.[ w ]?.[ target.id ] ).filter( Boolean );
	return snaps.find( ( x ) => x.tag ) || snaps[ 0 ] || {};
}

// Why a look has no setting state to go to, or null when `state` is one the DB holds.
export function stateGap( state, held ) {
	if ( held.has( state ) ) {
		return null;
	}
	if ( state.includes( '+' ) ) {
		return `combined-state: the draft styles ${ state } together, and a setting holds one state`;
	}
	if ( 'focus' === state ) {
		return 'focus-differs: keyboard focus paints with the hover look and the theme focus ring (settings.custom.focus); a different per-element focus look has no setting';
	}
	if ( 'active' === state ) {
		return "press: a pressed look is sgs/button's buttonPresets active token (the theme snapshot), not a per-element setting";
	}
	return `no-state-setting: no block setting holds the ${ state } look`;
}

// The state families a visitor enters on any element at any moment (the `states` table's family column): pointer or
// keyboard (hover, focus) and press (active).
const INTERACTION_FAMILIES = [ 'pointer-keyboard', 'press' ];

// The interaction state words of the DB's state vocabulary.
export function interactionStates( db ) {
	return new Set( statesVocabulary( db ).rows.filter( ( r ) => INTERACTION_FAMILIES.includes( r.family ) ).map( ( r ) => r.state ) );
}

// A text colour and the ground it is read against, held together (holdDefaults).
const PAIR = [ 'color', 'background-color' ];

const pathOf = ( effect ) => effect.slice( 0, effect.lastIndexOf( '|' ) );
const propOf = ( effect ) => effect.slice( effect.lastIndexOf( '|' ) + 1 );

// The block's own look in one state, per element: { [LOOSE path]: Set of longhands }. Calibration reads each state setting's
// marker in that state against the block's default read at rest (calibrate.mjs::slotFor), so a change the block makes in the
// state by itself shows in every such reading of the element, as a side effect (`effects`) or under the setting's own
// property, which the marker overrides. A property is the block's own when at least one reading lists it as an effect and
// every reading of that element lists it or owns it; a marker's own side effect (a border following its colour) is in
// that one reading only. An element the default read never saw (a gradient's <defs>, absent from the default paint), and a
// reading that shows or hides the element (its `display` changed), is a marker building structure, never a look.
export function defaultStateLook( cal, state ) {
	const known = new Set( Object.keys( cal?.elements || {} ).map( LOOSE ) );
	const readings = {};
	for ( const s of Object.values( cal?.settings || {} ).filter( ( x ) => state === x.state ) ) {
		for ( const path of ( s.slots || [ s.slot ] ).filter( ( p ) => ! known.size || known.has( LOOSE( p ) ) ) ) {
			const effects = ( s.effects || [] ).filter( ( e ) => LOOSE( pathOf( e ) ) === LOOSE( path ) ).map( propOf );
			if ( effects.includes( 'display' ) ) {
				continue;
			}
			( readings[ LOOSE( path ) ] ??= [] ).push( { own: longhands( s.property ), effects } );
		}
	}
	const out = {};
	for ( const [ path, list ] of Object.entries( readings ) ) {
		const props = [ ...new Set( list.flatMap( ( r ) => r.effects ) ) ].filter( ( p ) => list.every( ( r ) => r.effects.includes( p ) || r.own.includes( p ) ) );
		props.length && ( out[ path ] = new Set( props ) );
	}
	return out;
}

// The draft's resting value of each property on a target: { prop: { width: value } }, leaving out a width where the
// property paints nothing (lib/fill-prop.mjs::notPainted: a border side with no width, a decoration with no line).
function restingOf( reads, id ) {
	const out = {};
	for ( const w of READ_WIDTHS ) {
		const styles = reads.widths?.[ w ]?.[ id ]?.styles || {};
		for ( const [ prop, v ] of Object.entries( styles ) ) {
			v && ! notPainted( prop, styles ) && ( ( out[ prop ] ??= {} )[ w ] = v );
		}
	}
	return out;
}

// The elements a held property is resolved on: the target's slot, the slots its resting writer reaches for a carried
// property (lib/fill-resolve-state.mjs::alternateSlots), and the slots of each resting setting of that property the node
// carries (an icon's ground colour sits on its shape).
function holdSlots( cal, node, slot, prop, rest ) {
	const carried = Object.entries( cal?.settings || {} ).filter( ( [ attr, s ] ) => ! s.state && longhands( s.property ).includes( prop ) && ! [ undefined, null, '' ].includes( node.attributes?.[ attr ] ) ).flatMap( ( [ , s ] ) => s.slots || [ s.slot ] );
	return [ ...new Set( [ slot, ...alternateSlots( cal, prop, rest ), ...carried ] ) ];
}

// Holds the block's own interaction looks the draft does not have on one target (see the header). Returns { writes,
// unmapped, held }; a property the draft's state declares is the state pass's, and a property whose resting value is the
// element's colour follows the colour (currentcolor), so it is held with it when no setting of its own resolves.
// taken: Map attr → value of the node's state settings already written (by a declared look, or a hold from another
// target): a declared look is never overwritten, and two targets holding one setting at different values is a gap.
// A text colour and its ground (PAIR) are held together or not at all: holding one alone would put the draft's colour
// beside the block's own hover colour, a pairing neither paints (a brand ground held under a glyph that still swaps to
// the brand colour vanishes).
export function holdDefaults( { node, ref, rec, target, cal, db, snapshot, reads, drafts, held, interaction, taken = new Map() } ) {
	const out = { writes: [], unmapped: [], held: [] };
	const rest = restingOf( reads, target.id );
	const read = ( prop ) => READ_WIDTHS.some( ( w ) => reads.widths?.[ w ]?.[ target.id ]?.styles?.[ prop ] );
	const declared = ( state, prop ) => [ ...drafts.values() ].some( ( d ) => d.state === state && ! d.pseudo && ( d.prop === prop || longhands( d.prop ).includes( prop ) ) );
	const gapRow = ( prop, state, why ) => ( { node: ref, block: rec.name, slot: target.slot, property: prop, state, value: JSON.stringify( rest[ prop ] || {} ), reason: `default-state: ${ rec.name } changes ${ prop } on ${ state } by itself and the draft does not, and nothing holds it (${ why })` } );
	for ( const state of interaction ) {
		const look = defaultStateLook( cal, state );
		const plan = [];
		for ( const prop of [ ...new Set( Object.values( look ).flatMap( ( s ) => [ ...s ] ) ) ] ) {
			const slots = holdSlots( cal, node, target.slot, prop, rest[ prop ] || {} );
			if ( declared( state, prop ) || ! slots.some( ( p ) => look[ LOOSE( p ) ]?.has( prop ) ) || ( ! rest[ prop ] && read( prop ) ) ) {
				continue;
			}
			const gap = ! rest[ prop ] ? `the draft's resting ${ prop } was not read on this element` : stateGap( state, held );
			plan.push( { prop, res: gap ? { status: 'gap', gap } : resolveProperty( { node, block: rec.name, prop, draft: rest[ prop ], baseline: () => undefined, slots, calibration: cal, db, snapshot, log: [], state } ) } );
		}
		const pairBroken = PAIR.every( ( p ) => plan.some( ( x ) => x.prop === p ) ) && plan.some( ( x ) => PAIR.includes( x.prop ) && 'written' !== x.res.status );
		for ( const { prop, res } of plan ) {
			if ( pairBroken && PAIR.includes( prop ) && 'written' === res.status ) {
				out.unmapped.push( gapRow( prop, state, `it is held with ${ PAIR.find( ( p ) => p !== prop ) }, which cannot be` ) );
			} else if ( 'written' === res.status ) {
				for ( const w of res.writes ) {
					if ( taken.has( w.attr ) ) {
						same( taken.get( w.attr ), w.value ) || out.unmapped.push( { node: ref, block: rec.name, slot: target.slot, property: prop, state, value: JSON.stringify( rest[ prop ] ), reason: `default-state: ${ w.attr } already holds ${ JSON.stringify( taken.get( w.attr ) ) } on this block, and this element's resting ${ prop } is ${ JSON.stringify( w.value ) }` } );
						continue;
					}
					taken.set( w.attr, w.value );
					const { before, after } = setAttr( node, w );
					out.writes.push( { node: ref, index: rec.index, block: rec.name, slot: target.slot, prop, state, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how: 'fill-state-hold', hold: `${ rec.name } changes ${ prop } on ${ state } by itself and the draft does not: held at the draft's resting value` } );
				}
			} else if ( 'gap' === res.status ) {
				const follows = rest[ prop ] && READ_WIDTHS.every( ( w ) => undefined === rest[ prop ][ w ] || rest[ prop ][ w ] === rest.color?.[ w ] );
				follows && 'color' !== prop
					? out.held.push( { node: ref, slot: target.slot, prop, state, reason: `default-state: ${ prop } follows the element's colour, so the colour's hold holds it` } )
					: out.unmapped.push( gapRow( prop, state, res.detail ? `${ res.gap }: ${ res.detail }` : res.gap ) );
			}
		}
	}
	return out;
}

// Whether the block's motion support holds this target's hover transform (its sgsMotion hover layer, written by
// lib/fill-motion.mjs::motionWrites), so the state pass leaves it there. A DB without motion tables holds none.
function motionHolds( mdb, rec, target ) {
	try {
		return Boolean( targetName( rec, target, mdb.targetsOf( rec.name ) ) );
	} catch {
		return false;
	}
}

// Writes every state look of every node into the tree in place. opts: { tree, nodes (skeletonNodes), reads, calFor,
// db, snapshot }. Returns { writes, unmapped, held, patch, patchEntries }: held lists the looks another setting already
// gives (focus as hover); patch is the theme-snapshot.json patch (settings.custom.focus, settings.custom.buttonPresets,
// styles.elements.link) with patchEntries listing each key it set.
export function fillStates( { tree, nodes, reads, calFor, db, snapshot } ) {
	const flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	const sink = createPatch();
	const snapOf = ( target ) => targetSnap( reads, target );
	const out = { writes: [], unmapped: [], held: [] };
	const interaction = interactionStates( db );
	let mdb = null;
	try {
		mdb = motionDb( db );
	} catch {
		mdb = null;
	}
	for ( const rec of nodes ) {
		const cal = rec.targets.length ? calFor( rec.name ) : null;
		if ( ! cal ) {
			continue;
		}
		// The setting states this block holds: a state another block holds is still a gap here.
		const held = settingStates( db, rec.name );
		const node = flat[ rec.index ];
		const ref = refOf( node );
		// The node's state settings written so far, which a hold never overwrites (holdDefaults).
		const taken = new Map();
		for ( const target of rec.targets ) {
			if ( ! knownPaths( cal ).map( LOOSE ).includes( LOOSE( target.slot ) ) ) {
				continue;
			}
			// Transition timings follow CSS direction semantics (lib/fill-timing.mjs), not the one-look-one-state rule below.
			const timing = timingWrites( { node, ref, rec, target, cal, db, snapshot, reads, held } );
			out.writes.push( ...timing.writes );
			out.unmapped.push( ...timing.unmapped );
			const drafts = stateDrafts( reads, target.id );
			const hidden = SURFACE_BLOCKS.includes( rec.name ) && hiddenAtRest( reads, target.id );
			const tokenLooks = {};
			for ( const { state, prop, pseudo, perWidth, read, draftDefect } of drafts.values() ) {
				// A pseudo-element look goes to that layer's calibrated path, as the resting writer sends it
				// (lib/fill-resolve.mjs), and never to a theme token: the site ring and press tokens paint the element.
				const slot = `${ target.slot }${ pseudo }`;
				if ( pseudo && ! knownPaths( cal ).map( LOOSE ).includes( LOOSE( slot ) ) ) {
					out.unmapped.push( { node: ref, block: rec.name, slot, property: prop, state, value: JSON.stringify( perWidth ), reason: `unmapped-element: the draft paints ${ pseudo } under ${ state } on "${ target.slot }" and ${ rec.name } has no calibrated ${ pseudo } there` } );
					continue;
				}
				if ( mdb && 'hover' === state && ! pseudo && MOTION_STATE_PROPS.includes( prop ) && motionHolds( mdb, rec, target ) ) {
					// Only what the motion writer writes (lib/fill-motion.mjs reads the same lib/fill-state-motion.mjs::stateHover) is left to it;
					// a hover transform it cannot hold (a var() or calc(), a width with none) is raised below with its reason.
					const held = stateHover( reads, target );
					if ( held.base ) {
						held.gaps.forEach( ( reason ) => out.unmapped.push( { node: ref, block: rec.name, slot: target.slot, property: prop, state, value: JSON.stringify( perWidth ), reason: `hover-motion: ${ reason }` } ) );
						continue;
					}
				}
				if ( 'focus' === state && same( drafts.get( `hover|${ pseudo }|${ prop }` )?.perWidth, perWidth ) ) {
					out.held.push( { node: ref, slot: target.slot, prop, state, reason: 'focus paints with hover: the hover setting writes it' } );
					continue;
				}
				if ( ! pseudo && tokenRoute( { state, prop, held, block: rec.name, node, slot: target.slot, tag: snapOf( target ).tag, role: snapOf( target ).role } ) ) {
					( tokenLooks[ state ] ??= {} )[ prop ] = pickValue( perWidth );
					continue;
				}
				const atRest = 'open' === state && hidden && ! held.has( state );
				const gap = atRest ? null : stateGap( state, held );
				const res = gap ? { status: 'gap', gap } : resolveProperty( { node, block: rec.name, prop, draft: perWidth, baseline: () => undefined, slots: [ slot ], calibration: cal, db, snapshot, log: [], state: atRest ? null : state } );
				if ( 'written' === res.status ) {
					for ( const w of res.writes ) {
						const { before, after } = setAttr( node, w );
						atRest || taken.set( w.attr, w.value );
						out.writes.push( { node: ref, index: rec.index, block: rec.name, slot, prop, state, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how: 'fill-state', ...( 'code' === read ? { read } : {} ), ...( draftDefect ? { draftDefect } : {} ), ...( atRest ? { surface: 'open look written as the resting look' } : {} ) } );
					}
				} else if ( 'gap' === res.status ) {
					out.unmapped.push( { node: ref, block: rec.name, slot: target.slot, property: prop, state, value: JSON.stringify( perWidth ), reason: res.detail ? `${ res.gap }: ${ res.detail }` : res.gap } );
				}
			}
			if ( ! hidden ) {
				const hold = holdDefaults( { node, ref, rec, target, cal, db, snapshot, reads, drafts, held, interaction, taken } );
				out.writes.push( ...hold.writes );
				out.unmapped.push( ...hold.unmapped );
				out.held.push( ...hold.held );
			}
			if ( Object.keys( tokenLooks ).length ) {
				const snap = snapOf( target );
				const from = { node: ref, block: rec.name, slot: target.slot, index: rec.index };
				out.unmapped.push( ...applyTokenLooks( { looks: tokenLooks, sink, from, target: { tag: snap.tag, href: snap.href, role: snap.role, className: snap.className, pressRoot: '' === target.slot && null !== pressVariant( rec.name, node ) }, variant: pressVariant( rec.name, node ), owned: ownedBySetting( cal, target.slot ) } ) );
			}
		}
	}
	out.unmapped.push( ...sink.conflicts.map( conflictRow ) );
	return { ...out, patch: sink.patch, patchEntries: sink.entries };
}
