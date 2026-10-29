// The look of a draft modal's frame (Spec 48 FR-48-6, FR-48-57; register A1, Bean S8 2026-10-28): the draft dialog's backdrop, its
// panel and its close control are the `sgs/modal` frame's own settings (the scrim, the dialog and the close); only the dialog's
// inner content is the modal post. Read from the surface's inventory, never by a name:
//   dialog   the element that declares `role="dialog"` below the surface root;
//   scrim    a childless, wordless child of the root that is positioned absolutely or fixed and covers the root's box at every
//            width it shows (a layer holding the dialog or a control holds an element, so is none);
//   close    a control (the caller's closeKeysOf gives keys for a button or link only) inside the dialog whose click handler writes a falsy value to a state key the surface's own
//            surfaces.json states hold, at true or at the literal the modal opens on (lib/skeleton-handler-opens.mjs::handlerCloses and closesOn).
// The root and the dialog panel unwrap into the post's inner content; the scrim and the close are absorbed into the frame.
// The frame node (a `sgs/modal` carrying `modalFrame: true`) stands in the skeleton so Fill reads the three elements at the
// calibrated slots of the block's scrim, dialog and close parts; Fill lifts it out of the post's tree (lib/fill-modal-frame.mjs).
import { partSlots } from './skeleton-part-slots.mjs';

const WIDTHS = [ 375, 768, 1440 ];

// Whether `e` sits below `top` (not `top` itself).
function below( m, e, top ) {
	for ( let p = m.byKey[ e.parentKey ]; p; p = m.byKey[ p.parentKey ] ) {
		if ( p === top ) {
			return true;
		}
	}
	return false;
}

// Whether the element covers the root's box at every width it shows.
function coversRoot( m, e, root ) {
	const shown = WIDTHS.filter( ( w ) => e.visible?.[ w ] );
	return shown.length > 0 && shown.every( ( w ) => [ 'absolute', 'fixed' ].includes( e.position?.[ w ] ) && e.box?.[ w ] && root.box?.[ w ]
		&& [ 'x', 'y', 'w', 'h' ].every( ( k ) => Math.abs( e.box[ w ][ k ] - root.box[ w ][ k ] ) <= 1 ) );
}

// The parts of a modal surface's frame: { root, dialog, scrim, close } (scrim and close are null where the draft draws none),
// or null when the surface has no dialog element below its root. m: the inventory model; closeKeysOf( e ): the state keys the
// element's click handler closes (an empty Set for any other element); closes( keys ): whether clearing one of them closes the
// surface (lib/skeleton-handler-opens.mjs::closesOn).
export function modalFrameParts( { m, closeKeysOf, closes } ) {
	const root = m.root;
	const dialog = root ? m.els.find( ( e ) => e !== root && 'dialog' === e.attrs?.role && below( m, e, root ) ) : null;
	if ( ! dialog ) {
		return null;
	}
	const scrim = m.els.find( ( e ) => e.parentKey === root.key && ! m.words( e ) && ! m.kids( e ).length && coversRoot( m, e, root ) ) ?? null;
	const close = m.els.find( ( e ) => below( m, e, dialog ) && closes( closeKeysOf( e ) ) ) ?? null;
	return { root, dialog, scrim, close };
}

// The part elements of the frame, keyed by the framework DB `css_element` the rule names for each (rules.modalFrame.parts):
// [ { part, e } ] for the scrim, the dialog and the close that exist.
function framePartElements( { parts, names } ) {
	return [ [ 'scrim', parts.scrim ], [ 'dialog', parts.dialog ], [ 'close', parts.close ] ].filter( ( [ , e ] ) => e ).map( ( [ role, e ] ) => ( { role, part: names[ role ], e } ) );
}

// The frame node of a modal surface: the `sgs/modal` frame with no trigger of its own and the anchor its openers link to
// (`anchor`, null when the page map holds no row for the surface), measured at the surface root, with each part element as
// the draftSlots entry at the part's calibrated slot (lib/skeleton-part-slots.mjs::partSlots). Returns { node, notes }.
export function modalFrameNode( { db, block, cal, parts, names, anchor, m, finder } ) {
	const node = { name: block, attributes: { triggerStyle: 'none', ...( anchor ? { anchor } : {} ) }, draftRef: finder( parts.root ), draftFingerprint: m.fingerprint( parts.root ), draftSlots: {}, modalFrame: true, innerBlocks: [] };
	const notes = [];
	for ( const p of framePartElements( { parts, names } ) ) {
		const made = partSlots( { db, block, cal, part: p.part, opener: p.e, m, finder, subParts: 'close' === p.role } );
		Object.assign( node.draftSlots, made.slots );
		notes.push( ...made.notes );
	}
	return { node, notes };
}
