/**
 * Keyboard-focus open for a bar disclosure (the bar's `submenuOpenOnFocus`).
 *
 * Pure decisions, so they can be tested without the Interactivity runtime:
 * mega-disclosure.js reads the DOM state, asks these two functions, and does
 * the opening and closing itself.
 *
 * @package
 */

/**
 * Whether focus arriving inside a disclosure root should open its panel.
 *
 * Only keyboard-style focus (`:focus-visible`) on the item itself counts: a
 * mouse press also focuses a link or button, and the click that follows would
 * close the panel again. Focus already inside the panel changes nothing.
 *
 * @param {Object}  args
 * @param {Element} args.target       The element that received focus.
 * @param {Element} args.root         The disclosure root.
 * @param {Element} args.panel        The disclosure's panel (it may be reparented out of the root).
 * @param {boolean} args.isOpen       Whether the panel is already open.
 * @param {boolean} args.refocusing   True while focus is being handed back after Escape.
 * @param {boolean} args.focusVisible Whether the target matches `:focus-visible`.
 * @return {'open'|'mark'|'none'} `open` opens it and marks it focus-opened; `mark` is already open, so only marks it; `none` does nothing.
 */
export function focusInDecision( {
	target,
	root,
	panel,
	isOpen,
	refocusing,
	focusVisible,
} ) {
	if ( ! target || ! root || ! root.contains( target ) ) {
		return 'none';
	}
	if ( panel && panel.contains( target ) ) {
		return 'none';
	}
	if ( refocusing || ! focusVisible ) {
		return 'none';
	}
	return isOpen ? 'mark' : 'open';
}

/**
 * Whether focus leaving a disclosure root should close a focus-opened panel.
 *
 * Focus moving to another part of the same disclosure (link to chevron, link
 * into the panel) keeps it open, and so does a pointer resting over it: a
 * panel the visitor is pointing at is not taken away.
 *
 * @param {Object}   args
 * @param {boolean}  args.openedByFocus Whether this panel was opened by focus.
 * @param {boolean}  args.isOpen        Whether the panel is open.
 * @param {?Element} args.related       Where focus went (`relatedTarget`), or null.
 * @param {Element}  args.root          The disclosure root.
 * @param {?Element} args.panel         The disclosure's panel.
 * @param {boolean}  args.pointerInside Whether the pointer is over the root or the panel.
 * @return {boolean} True when the panel should close.
 */
export function focusOutShouldClose( {
	openedByFocus,
	isOpen,
	related,
	root,
	panel,
	pointerInside,
} ) {
	if ( ! openedByFocus || ! isOpen || pointerInside ) {
		return false;
	}
	if (
		related &&
		( root.contains( related ) || ( panel && panel.contains( related ) ) )
	) {
		return false;
	}
	return true;
}
