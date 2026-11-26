// Fill's state pass (Spec 48 FR-48-81): writes each target's state looks (lib/fill-state-read.mjs::readStates, read
// into readDraft's `states`) into the block settings that hold them, a first pass from the draft's code beside Fill's
// resting pass. Solve keeps correcting the residue the walker measures, through the same resolver with the same state.
// A look is written only through a setting state the framework DB holds (block_attributes.css_state). Keyboard focus
// that paints like hover is already written by the hover setting (SGS paints hover on :hover and :focus-visible
// together); any other look no setting holds is reported as a gap, never dropped. A look the draft's script sets on pointer
// or focus (lib/fill-state-script.mjs) goes the same way; its gap row is named `script-look`.
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
import { resolveProperty, knownPaths, notPainted, canon, PX_TOL, INHERITED } from './fill-prop.mjs';
import { initialOf, paintedProps } from './css-families.mjs';
import { sameValue } from '../../parity/lib/compare.mjs';
import { LOOSE } from './resolve.mjs';
import { settingStates, statesVocabulary, candidates } from './db.mjs';
import { longhands } from './calibrate-props.mjs';
import { alternateSlots } from './fill-resolve-state.mjs';
import { READ_WIDTHS } from './fill-read.mjs';
import { timingWrites } from './fill-timing.mjs';
import { motionDb } from './motion-db.mjs';
import { loadMotionSchema } from './motion-schema.mjs';
import { tokenTypes, clientTokens } from './motion-tokens.mjs';
import { paintOnlyLayer } from './fill-motion-element.mjs';
import { exactHome } from './fill-part-pairing.mjs';
import { stateDrafts, ancestorLook, ancestorHolds, motionHolds } from './fill-state-reach.mjs';

export { stateDrafts, ancestorLook, motionHolds };
import { MOTION_STATE_PROPS, stateHover } from './fill-state-motion.mjs';
import { scriptGapReason, openSlots, openAsHover } from './fill-state-script.mjs';
import { partStateSlots } from './fill-state-parts.mjs';
import { createPatch, tokenRoute, pickValue, pressVariant, ownedBySetting, applyTokenLooks, conflictRow, ringLook, restShadow } from './fill-state-tokens.mjs';
import { focusSharesHover, settleFocusRests } from './fill-state-focus.mjs';
import { stateChoice, choiceConflict } from './fill-choice-state.mjs';
import { sweepResult } from './fill-underline-sweep.mjs';
import { ownerOf } from './fill-resolve-element.mjs';

export { focusSharesHover };

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
// marker in that state against the block's default read at rest (lib/calibrate.mjs::slotFor), so a change the block makes in the
// state by itself shows in every such reading of the element, as a side effect (`effects`) or under the setting's own
// property, which the marker overrides. A property is the block's own when at least one reading lists it as an effect and
// every reading of that element lists it or owns it; a marker's own side effect (a border following its colour) is in
// that one reading only. An element the default read never saw (a gradient's <defs>, absent from the default paint), and a
// reading that shows or hides the element (its `display` changed), is a marker building structure, never a look.
// A change against the fixture's resting look misses a state value equal to it (a nav link turning primary on hover over
// a fixture whose link already rests primary), so calibration also records each state reading's look as values (`look`,
// lib/calibrate-instances.mjs::stateLook). Given the draft's resting look on the target (rest: { prop: { width: value } }),
// a property is the block's own where a state setting of that property governs the element (the block has a rule for it
// there) and the recorded state value differs from the draft's resting value at a width both state.
// ctxAt( width ): the element's context there for canon() ({ position, direction }: lib/fill-prop.mjs::canon), so a
// keyword canon decides only from the context (min-height auto, text-align start) compares as it paints.
export function defaultStateLook( cal, state, rest = {}, ctxAt = () => ( {} ) ) {
	const known = new Set( Object.keys( cal?.elements || {} ).map( LOOSE ) );
	const readings = {};
	for ( const s of Object.values( cal?.settings || {} ).filter( ( x ) => state === x.state ) ) {
		for ( const path of ( s.slots || [ s.slot ] ).filter( ( p ) => ! known.size || known.has( LOOSE( p ) ) ) ) {
			const effects = ( s.effects || [] ).filter( ( e ) => LOOSE( pathOf( e ) ) === LOOSE( path ) ).map( propOf );
			if ( effects.includes( 'display' ) ) {
				continue;
			}
			( readings[ LOOSE( path ) ] ??= [] ).push( { own: longhands( paintedProps( s ).join( ',' ) ), effects } );
		}
	}
	const out = {};
	for ( const [ path, list ] of Object.entries( readings ) ) {
		const props = [ ...new Set( list.flatMap( ( r ) => r.effects ) ) ].filter( ( p ) => list.every( ( r ) => r.effects.includes( p ) || r.own.includes( p ) ) );
		props.length && ( out[ path ] = new Set( props ) );
	}
	const settings = Object.values( cal?.settings || {} ).filter( ( x ) => state === x.state );
	const governs = ( path, prop ) => settings.some( ( x ) => longhands( paintedProps( x ).join( ',' ) ).includes( prop ) && ( x.slots || [ x.slot ] ).some( ( p ) => LOOSE( p ) === path ) );
	for ( const x of settings ) {
		for ( const [ raw, props ] of Object.entries( x.look || {} ) ) {
			const path = LOOSE( raw );
			if ( known.size && ! known.has( path ) ) {
				continue;
			}
			for ( const [ prop, values ] of Object.entries( props ) ) {
				const differs = Object.entries( values ).some( ( [ w, v ] ) => undefined !== rest[ prop ]?.[ w ] && ! sameValue( prop, canon( prop, v, ctxAt( w ) ), canon( prop, rest[ prop ][ w ], ctxAt( w ) ), PX_TOL ) );
				differs && governs( path, prop ) && ( out[ path ] ??= new Set() ).add( prop );
			}
		}
	}
	return out;
}

// The draft's resting value of each property on a target: { prop: { width: value } }, leaving out a width where the
// property paints nothing (lib/fill-prop.mjs::notPainted: a border side with no width, a decoration with no line).
function restingOf( reads, id ) {
	const out = {};
	for ( const w of READ_WIDTHS ) {
		const snap = reads.widths?.[ w ]?.[ id ];
		const styles = snap?.styles || {};
		for ( const [ prop, v ] of Object.entries( styles ) ) {
			v && ! notPainted( prop, styles, snap ) && ( ( out[ prop ] ??= {} )[ w ] = v );
		}
	}
	return out;
}

// The draft's own resting value of `prop` on a target, per width the element is drawn at: { width: value }. Its rendered read,
// else the value a resting rule declares, else (a property that is not inherited, so no rule means its initial value) the
// initial value; an inherited property no rule or read states is left out (lib/css-equivalence/index.mjs::consult holds a
// state value equal to the initial value only where the draft itself rests at it).
function restValue( reads, id, prop ) {
	const out = {};
	for ( const w of READ_WIDTHS ) {
		const snap = reads.widths?.[ w ]?.[ id ];
		if ( ! snap || snap.missing ) {
			continue;
		}
		const v = snap.styles?.[ prop ] ?? reads.declared?.[ w ]?.[ id ]?.[ prop ] ?? ( INHERITED.includes( prop ) ? undefined : initialOf( prop ) ?? undefined );
		undefined !== v && ( out[ w ] = String( v ) );
	}
	return out;
}

// The target's own context per read width, as the state read has it: its position (the snapshot's, else its styles') and
// its direction. Returns { at( width ) (canon's ctx), siblings (resolveProperty's { position, direction } per width) }.
// The parent's display is not part of a target's read, so a value canon decides from it stays undecided.
export function stateContext( reads, id ) {
	const siblings = { position: {}, direction: {} };
	for ( const w of READ_WIDTHS ) {
		const snap = reads.widths?.[ w ]?.[ id ];
		const position = snap?.position ?? snap?.styles?.position;
		position && ( siblings.position[ w ] = position );
		snap?.styles?.direction && ( siblings.direction[ w ] = snap.styles.direction );
	}
	return { at: ( w ) => ( { position: siblings.position[ w ], direction: siblings.direction[ w ] } ), siblings };
}

// The elements a held property is resolved on: the target's slot, the slots its resting writer reaches for a carried
// property (lib/fill-resolve-state.mjs::alternateSlots), and the slots of each resting setting of that property the node
// carries (an icon's ground colour sits on its shape).
function holdSlots( cal, node, slot, prop, rest ) {
	const carried = Object.entries( cal?.settings || {} ).filter( ( [ attr, s ] ) => ! s.state && longhands( paintedProps( s ).join( ',' ) ).includes( prop ) && ! [ undefined, null, '' ].includes( node.attributes?.[ attr ] ) ).flatMap( ( [ , s ] ) => s.slots || [ s.slot ] );
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
	// The ancestor whose declared look the element follows on `state` (its own `prop`, else its colour for a property
	// resting at its colour), only where that ancestor's written state look holds the element's change, and its colour's
	// for a property that follows the colour (ancestorHolds).
	const landed = ( from, state, prop, aprop ) => from && ancestorHolds( { cal, state, slot: target.slot, prop, ancestor: from, aprop, taken } ) ? from : null;
	const follows = ( state, prop ) => landed( ancestorLook( reads, rec, target, state, prop ), state, prop, prop ) || ( 'color' !== prop && rest[ prop ] && READ_WIDTHS.every( ( w ) => undefined === rest[ prop ][ w ] || rest[ prop ][ w ] === rest.color?.[ w ] ) && ( ( from ) => landed( from, state, prop, 'color' ) && landed( from, state, 'color', 'color' ) )( ancestorLook( reads, rec, target, state, 'color' ) ) );
	const ctx = stateContext( reads, target.id );
	const read = ( prop ) => READ_WIDTHS.some( ( w ) => reads.widths?.[ w ]?.[ target.id ]?.styles?.[ prop ] );
	const declared = ( state, prop ) => [ ...drafts.values() ].some( ( d ) => d.state === state && ! d.pseudo && ( d.prop === prop || longhands( d.prop ).includes( prop ) ) );
	const gapRow = ( prop, state, why ) => ( { node: ref, block: rec.name, slot: target.slot, property: prop, state, value: JSON.stringify( rest[ prop ] || {} ), reason: `default-state: ${ rec.name } changes ${ prop } on ${ state } by itself and the draft does not, and nothing holds it (${ why })` } );
	for ( const state of interaction ) {
		const look = defaultStateLook( cal, state, rest, ctx.at );
		const plan = [];
		for ( const prop of [ ...new Set( Object.values( look ).flatMap( ( s ) => [ ...s ] ) ) ] ) {
			const slots = holdSlots( cal, node, target.slot, prop, rest[ prop ] || {} );
			if ( declared( state, prop ) || ! slots.some( ( p ) => look[ LOOSE( p ) ]?.has( prop ) ) || ( ! rest[ prop ] && read( prop ) ) ) {
				continue;
			}
			const from = follows( state, prop );
			if ( from ) {
				out.held.push( { node: ref, slot: target.slot, prop, state, reason: `default-state: ${ prop } follows ${ from.slot || 'the root' }, whose ${ state } look the draft declares, so the element changes with it` } );
				continue;
			}
			const gap = ! rest[ prop ] ? `the draft's resting ${ prop } was not read on this element` : stateGap( state, held );
			plan.push( { prop, res: gap ? { status: 'gap', gap } : resolveProperty( { node, block: rec.name, prop, draft: rest[ prop ], baseline: () => undefined, slots, calibration: cal, db, snapshot, log: [], state, siblings: ctx.siblings, rest: restValue( reads, target.id, prop ) } ) } );
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

// Writes every state look of every node into the tree in place. opts: { tree, nodes (skeletonNodes), reads, calFor,
// db, snapshot, rawSnapshot (the client's theme-snapshot.json as read, for its motion tokens) }. Returns { writes, unmapped, held, patch, patchEntries }: held lists the looks another setting already
// gives (focus as hover); patch is the theme-snapshot.json patch (settings.custom.focus, settings.custom.buttonPresets,
// styles.elements.link) with patchEntries listing each key it set.
export function fillStates( { tree, nodes, reads, calFor, db, snapshot, rawSnapshot = null } ) {
	const flat = [];
	walk( tree, ( n, i ) => {
		flat[ i ] = n;
	} );
	const sink = createPatch();
	const snapOf = ( target ) => targetSnap( reads, target );
	// `ledger`: the state looks this pass ends with no write, unmapped or held row (lib/run-ledger-fill.mjs writes them to the
	// run ledger): { node, block, slot, property, state, value, kind: 'dropped' | 'judged-equal', reason }.
	const out = { writes: [], unmapped: [], held: [], ledger: [] };
	// The focus-shares-hover rows and the focus looks painted as hover, per node (lib/fill-state-focus.mjs::settleFocusRests).
	const shares = [];
	const painted = new Map();
	const interaction = interactionStates( db );
	let ctxOf = null;
	// The motion context (token types, the client's tokens), built on first use; null where the motion schema cannot be read.
	const motionCtx = () => {
		try {
			return ( ctxOf ??= { types: tokenTypes( loadMotionSchema() ), tokens: clientTokens( rawSnapshot ) } );
		} catch {
			return null;
		}
	};
	let mdb = null;
	try {
		mdb = motionDb( db );
	} catch {
		mdb = null;
	}
	// Every look of a target this pass leaves without a record, as a ledger row with its reason.
	const silent = ( rec, target, reason ) => stateDrafts( reads, target.id ).forEach( ( d ) => out.ledger.push( { node: refOf( flat[ rec.index ] ), block: rec.name, slot: `${ target.slot }${ d.pseudo }`, property: d.prop, state: d.state, value: JSON.stringify( d.perWidth ), kind: 'dropped', reason } ) );
	for ( const rec of nodes ) {
		const cal = rec.targets.length ? calFor( rec.name ) : null;
		if ( ! cal ) {
			rec.targets.forEach( ( t ) => silent( rec, t, `${ rec.name } has no calibration, so no state setting is resolved` ) );
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
				silent( rec, target, `"${ target.slot }" is no calibrated path of ${ rec.name }, so its state looks are not resolved` );
				continue;
			}
			// Transition timings follow CSS direction semantics (lib/fill-timing.mjs), not the one-look-one-state rule below.
			// The paint-only hover layer the motion writer gives the element, decided as it decides it.
			const paintOnly = Boolean( mdb && paintOnlyLayer( { reads, id: target.id, holds: () => motionHolds( mdb, rec, target, ( el ) => exactHome( db, rec.name, cal, el ) ), mdb, ctx: motionCtx } ) );
			const timing = timingWrites( { node, ref, rec, target, cal, db, snapshot, reads, held, paintOnly } );
			out.writes.push( ...timing.writes );
			out.unmapped.push( ...timing.unmapped );
			const drafts = stateDrafts( reads, target.id );
			const ctx = stateContext( reads, target.id );
			const hidden = SURFACE_BLOCKS.includes( rec.name ) && hiddenAtRest( reads, target.id );
			const tokenLooks = {};
			// A link whose underline is the block's `sweep` (lib/fill-underline-sweep.mjs): the looks its hover grows are the setting's own,
			// so they are settled as held by it, never written to another setting or raised as a gap.
			const snaps = Object.fromEntries( READ_WIDTHS.map( ( w ) => [ w, reads.widths?.[ w ]?.[ target.id ] ] ).filter( ( [ , s ] ) => s && ! s.missing ) );
			const sweep = Object.keys( snaps ).length && ! hidden ? sweepResult( { db, cal, block: rec.name, slot: target.slot, snaps, reads, id: target.id } ) : null;
			for ( const { state, prop, pseudo, perWidth, read, draftDefect, script } of drafts.values() ) {
				if ( sweep && 'hover' === state && ( pseudo ? sweep.kinds.includes( 'layer' ) : sweep.kinds.includes( 'background' ) && [ 'background-size', 'background-image', 'background-position' ].includes( prop ) ) ) {
					out.ledger.push( { node: ref, block: rec.name, slot: `${ target.slot }${ pseudo }`, property: prop, state, value: JSON.stringify( perWidth ), kind: 'judged-equal', reason: `held-by-setting: ${ sweep.writes[ 0 ].attr } sweep draws this look (its line grows on hover)` } );
					continue;
				}
				// A pseudo-element look goes to that layer's calibrated path, as the resting writer sends it
				// (lib/fill-resolve.mjs), and never to a theme token: the site ring and press tokens paint the element.
				const slot = `${ target.slot }${ pseudo }`;
				if ( pseudo && ! knownPaths( cal ).map( LOOSE ).includes( LOOSE( slot ) ) ) {
					out.unmapped.push( { node: ref, block: rec.name, slot, property: prop, state, value: JSON.stringify( perWidth ), reason: `unmapped-element: the draft paints ${ pseudo } under ${ state } on "${ target.slot }" and ${ rec.name } has no calibrated ${ pseudo } there` } );
					continue;
				}
				if ( mdb && 'hover' === state && ! pseudo && MOTION_STATE_PROPS.includes( prop ) && motionHolds( mdb, rec, target, ( el ) => exactHome( db, rec.name, cal, el ) ) ) {
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
					( painted.get( ref ) || painted.set( ref, [] ).get( ref ) ).push( prop );
					continue;
				}
				if ( ! pseudo && tokenRoute( { state, prop, held, block: rec.name, node, slot: target.slot, tag: snapOf( target ).tag, role: snapOf( target ).role } ) ) {
					( tokenLooks[ state ] ??= {} )[ prop ] = pickValue( perWidth );
					continue;
				}
				const atRest = 'open' === state && hidden && ! held.has( state );
				// An opener's open-panel look the block holds no open setting for is the look its hover setting holds
				// (lib/fill-state-script.mjs::openAsHover); the write is then a hover write.
				const asHover = ! atRest && ! pseudo && openAsHover( { script, state, held, hasHover: candidates( db, rec.name, prop, 'hover' ).length > 0, hasOpen: candidates( db, rec.name, prop, 'open' ).length > 0, hoverLook: drafts.has( `hover|${ pseudo }|${ prop }` ) } );
				const writeState = asHover ? 'hover' : state;
				const gap = atRest ? null : stateGap( writeState, held );
				// A resting setting whose value paints this look in this state (linkUnderline: hover) answers before the state settings do.
				const chosen = pseudo || atRest || asHover || ! [ 'hover', 'focus' ].includes( state ) ? null : stateChoice( { cal, slot, prop, rest: restValue( reads, target.id, prop ), draft: perWidth, state } );
								const choice = chosen && chosen.writes.map( ( w ) => choiceConflict( { setting: cal.settings?.[ w.attr ], attr: w.attr, prop, rest: restValue( reads, target.id, prop ), value: w.value, current: node.attributes?.[ w.attr ], owner: ownerOf( node, w.attr ), taken: taken.get( w.attr ), slot: target.slot } ) ).find( Boolean );
				const res = choice ? { status: 'gap', gap: 'conflict', detail: choice } : chosen ?? ( gap ? { status: 'gap', gap } : resolveProperty( { node, block: rec.name, prop, draft: perWidth, baseline: () => undefined, slots: [ slot, ...( atRest || asHover ? [] : openSlots( cal, prop, slot, state ) ) ].concat( atRest ? [] : partStateSlots( { db, cal, block: rec.name, prop, slot, state: writeState } ) ), calibration: cal, db, snapshot, log: [], state: atRest ? null : writeState, siblings: ctx.siblings, rest: pseudo ? undefined : restValue( reads, target.id, prop ) } ) );
				if ( 'written' === res.status ) {
					for ( const w of res.writes ) {
						const { before, after } = setAttr( node, w );
						atRest || taken.set( w.attr, w.value );
						out.writes.push( { node: ref, index: rec.index, block: rec.name, slot, prop, state: writeState, attr: w.attr, before, after, widths: Object.keys( res.included || {} ).map( Number ), how: 'fill-state', ...( 'code' === read ? { read } : {} ), ...( draftDefect ? { draftDefect } : {} ), ...( script ? { script: script.kind } : {} ), ...( atRest ? { surface: 'open look written as the resting look' } : {} ), ...( asHover ? { via: 'the draft shows this while the panel is open; the block holds no open setting for it, so its hover setting takes it' } : {} ) } );
					}
					const shared = 'hover' === state ? focusSharesHover( { drafts, pseudo, prop, snap: snapOf( target ), attrs: res.writes.map( ( w ) => w.attr ) } ) : null;
					shared && shares.push( { node, ref, rec, row: { node: ref, block: rec.name, slot, property: prop, state: 'focus', value: JSON.stringify( perWidth ), reason: shared } } );
				} else if ( 'equal' === res.status ) {
					out.ledger.push( { node: ref, block: rec.name, slot, property: prop, state, value: JSON.stringify( perWidth ), kind: 'judged-equal', reason: `lib/fill-prop.mjs::resolveProperty returned equal: no tier of the draft's ${ state } value differs from what the node shows (lib/fill-prop.mjs::tiersDiffering), so nothing is written` } );
				} else if ( 'gap' === res.status ) {
					out.unmapped.push( { node: ref, block: rec.name, slot: target.slot, property: prop, state, value: JSON.stringify( perWidth ), reason: scriptGapReason( script, state, `${ asHover ? 'tried as the hover setting: ' : '' }${ res.detail ? `${ res.gap }: ${ res.detail }` : res.gap }` ) } );
				}
			}
			if ( ! hidden ) {
				const hold = holdDefaults( { node, ref, rec, target, cal, db, snapshot, reads, drafts, held, interaction, taken } );
				out.writes.push( ...hold.writes );
				out.unmapped.push( ...hold.unmapped );
				out.held.push( ...hold.held );
			}
			const ring = ringLook( { drafts, reads, id: target.id, snap: snapOf( target ), focus: tokenLooks.focus } );
			ring?.looks && Object.assign( tokenLooks, ring.looks );
			tokenLooks.focus && ( tokenLooks.focusRest = restShadow( reads, target.id ) );
			ring?.gap && out.unmapped.push( { node: ref, block: rec.name, slot: target.slot, ...ring.gap } );
			if ( Object.keys( tokenLooks ).length ) {
				const snap = snapOf( target );
				const from = { node: ref, block: rec.name, slot: target.slot, index: rec.index };
				out.unmapped.push( ...applyTokenLooks( { looks: tokenLooks, sink, from, target: { tag: snap.tag, href: snap.href, role: snap.role, className: snap.className, pressRoot: '' === target.slot && null !== pressVariant( rec.name, node ) }, variant: pressVariant( rec.name, node ), owned: ownedBySetting( cal, target.slot ) } ) );
			}
		}
	}
	const rests = settleFocusRests( { rows: shares, painted, db } );
	out.writes.push( ...rests.writes );
	out.unmapped.push( ...rests.unmapped, ...sink.conflicts.map( conflictRow ) );
	return { ...out, patch: sink.patch, patchEntries: sink.entries };
}
