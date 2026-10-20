// Fill's theme-token writes (Spec 48 FR-48-81, Spec 32 FR-32-19): three state looks live in the client's
// theme-snapshot.json, not in a block setting, so Fill collects them into one patch beside the filled tree:
//   focus   a keyboard-focus look unlike the hover look → settings.custom.focus (source "draft": the draft's styling wins
//           over the 3:1 contrast rule; lib/snapshot-tokens.mjs::focusTokens)
//   press   an :active look on a block that reads buttonPresets → settings.custom.buttonPresets.<variant>.active-*
//           (lib/snapshot-tokens.mjs::pressTokens)
//   link    a :link, :any-link or :visited look on a plain content link → styles.elements.link[':<state>']
//           (lib/snapshot-tokens.mjs::linkStateTokens, judged by isThemeLink)
// The patch has theme-snapshot.json's own shape and is written beside Fill's other outputs; Fill never edits the
// client's snapshot. One key set by two targets keeps the first value; the later one is reported as a conflict.

import { focusTokens, pressTokens, linkStateTokens } from './snapshot-tokens.mjs';
import { LOOSE } from './resolve.mjs';

// The declared properties a focus look feeds into settings.custom.focus.
export const FOCUS_PROPS = [ 'outline-width', 'outline-color', 'outline-style', 'outline-offset', 'box-shadow' ];
// The declared properties a pressed look feeds into buttonPresets (the two painted ones, and the colours pressTokens names as gaps).
export const PRESS_PROPS = [ 'transform', 'box-shadow', 'background-color', 'color', 'border-color', 'border-top-color' ];
// The states a theme link takes from styles.elements.link.
export const LINK_STATES = [ 'visited', 'link', 'any-link' ];
// The blocks that paint buttonPresets' pressed tokens (includes/helpers-button-press.php), with the preset variant each uses.
const PRESS_BLOCKS = { 'sgs/button': ( attrs ) => attrs.inheritStyle || 'primary', 'sgs/whatsapp-cta': () => 'default' };

// The preset variant a block's pressed look goes to, or null when the block does not read buttonPresets.
export const pressVariant = ( block, node ) => PRESS_BLOCKS[ block ]?.( node?.attributes || {} ) ?? null;

// The elements that take the site-wide focus ring: links, buttons, summaries and the interactive roles. A form control paints
// its own focus look.
const RING_TAGS = [ 'a', 'button', 'summary' ];
const RING_ROLES = [ 'button', 'tab', 'link', 'menuitem' ];
const takesRing = ( tag, role ) => RING_TAGS.includes( String( tag || '' ).toLowerCase() ) || RING_ROLES.includes( String( role || '' ).toLowerCase() );

// Whether a focus look on this element feeds the ring: never a form control, always an element that takes the ring or whose
// look is outline-only. An element the read did not identify (no tag and no role at any read width) feeds nothing: the
// route is null, a named gap.
const ringFocus = ( { prop, tag, role } ) => {
	if ( [ 'input', 'select', 'textarea' ].includes( String( tag || '' ).toLowerCase() ) ) {
		return false;
	}
	return ( !! tag || !! role ) && ( takesRing( tag, role ) || prop.startsWith( 'outline' ) );
};

// The theme token a state look feeds ('focus', 'press' or 'link'), or null when it goes to a setting. A state the block's own
// settings hold (held) is never a token. A focus look goes to the ring only from an element that takes it (tag and role are
// the target's own; a read with neither, or an outline-only look, is the ring's); a press look only from the block's root
// element (slot ''), since a descendant's pressed look is not the whole button's.
export function tokenRoute( { state, prop, held, block, node, slot = '', tag = null, role = null } ) {
	if ( held.has( state ) ) {
		return null;
	}
	if ( 'focus' === state && FOCUS_PROPS.includes( prop ) ) {
		return ringFocus( { prop, tag, role } ) ? 'focus' : null;
	}
	if ( 'active' === state && '' === slot && PRESS_PROPS.includes( prop ) && null !== pressVariant( block, node ) ) {
		return 'press';
	}
	return LINK_STATES.includes( state ) ? 'link' : null;
}

const ROOT_FIRST = [ 1440, 768, 375 ];
// The value a token reads from a look's per-width values: the widest read width that has one.
export const pickValue = ( perWidth ) => perWidth[ ROOT_FIRST.find( ( w ) => undefined !== perWidth[ w ] ) ];

// The snapshot patch under construction: { patch, entries, conflicts, set( path, value, from ) }. `set` writes one leaf by
// its key path; a key already set to another value keeps the first and records the conflict.
export function createPatch() {
	const patch = {};
	const entries = [];
	const conflicts = [];
	const set = ( path, value, from ) => {
		let at = patch;
		for ( const k of path.slice( 0, -1 ) ) {
			at = at[ k ] ??= {};
		}
		const key = path[ path.length - 1 ];
		const name = path.join( '.' );
		if ( key in at ) {
			if ( JSON.stringify( at[ key ] ) !== JSON.stringify( value ) ) {
				conflicts.push( { path: name, kept: at[ key ], dropped: value, from, keptFrom: entries.find( ( e ) => e.path === name ) } );
			}
			return;
		}
		at[ key ] = value;
		entries.push( { path: name, value, ...from } );
	};
	return { patch, entries, conflicts, set };
}

const gapRow = ( from, gap, state, value ) => ( { node: from.node, block: from.block, slot: from.slot, property: gap.split( ':' )[ 0 ], state, value, reason: gap } );

// Flattens { group: { prop: value } } under `base` into leaf sets.
function setLeaves( sink, base, value, from ) {
	for ( const [ k, v ] of Object.entries( value ) ) {
		if ( v && 'object' === typeof v ) {
			setLeaves( sink, [ ...base, k ], v, from );
		} else {
			sink.set( [ ...base, k ], v, from );
		}
	}
}

// Whether a block setting at the target's element already holds a state look (hover, focus, visited), which makes the
// element that setting's own look rather than a theme link: the calibration lists each setting's state and reach.
export function ownedBySetting( cal, slot ) {
	return Object.values( cal?.settings || {} ).some( ( s ) => null != s.state && ( s.reaches || s.slots || [] ).map( LOOSE ).includes( LOOSE( slot ) ) );
}

// Applies one target's token looks. looks: { focus?, active? (the press look), <link state>? }, each a declared map
// (each from the state's drafts, one value per property). from: { node, block, slot, index }. target: { tag, href, role,
// className }. variant: the press variant or null. Writes into `sink` (createPatch) and returns the unmapped rows.
export function applyTokenLooks( { looks, sink, from, target, variant, owned } ) {
	const unmapped = [];
	const asJson = ( d ) => JSON.stringify( d );
	if ( looks.focus ) {
		const { focus, gaps } = focusTokens( { declared: looks.focus } );
		for ( const [ k, v ] of Object.entries( focus || {} ) ) {
			sink.set( [ 'settings', 'custom', 'focus', k ], v, { ...from, state: 'focus' } );
		}
		unmapped.push( ...gaps.map( ( g ) => gapRow( from, g, 'focus', asJson( looks.focus ) ) ) );
	}
	if ( looks.active ) {
		const { tokens, gaps } = pressTokens( { declared: looks.active }, variant );
		for ( const [ k, v ] of Object.entries( tokens ) ) {
			sink.set( [ 'settings', 'custom', 'buttonPresets', variant, k ], v, { ...from, state: 'active' } );
		}
		unmapped.push( ...gaps.map( ( g ) => gapRow( from, g, 'active', asJson( looks.active ) ) ) );
	}
	for ( const state of LINK_STATES.filter( ( s ) => looks[ s ] ) ) {
		const { state: key, value, gaps } = linkStateTokens( { declared: looks[ state ] }, state, { ...target, ownedBySetting: owned } );
		if ( value ) {
			setLeaves( sink, [ 'styles', 'elements', 'link', key ], value, { ...from, state } );
		}
		unmapped.push( ...gaps.map( ( g ) => gapRow( from, g, state, asJson( looks[ state ] ) ) ) );
	}
	return unmapped;
}

// A conflict as an unmapped row.
export const conflictRow = ( c ) => ( { node: c.from.node, block: c.from.block, slot: c.from.slot, property: c.path, state: c.from.state, value: JSON.stringify( c.dropped ), reason: `conflict: ${ c.keptFrom ? `${ c.keptFrom.node } ${ c.keptFrom.slot || 'root' }` : 'an earlier target' } already set ${ c.path } to ${ JSON.stringify( c.kept ) }; ${ c.from.node } ${ c.from.slot || 'root' } wanted ${ JSON.stringify( c.dropped ) }; the first value is kept` } );
