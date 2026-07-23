/**
 * SGS Cart — flyout (DISCLOSURE) open/close/focus (FR-36-19 Phase 2).
 *
 * FR-36-10 draws a hard line between DISCLOSURE (dropdowns/mega — a
 * `<button aria-expanded>`, Tab through, NO trap, Escape closes + returns
 * focus, the rest of the page stays usable) and DIALOG (the drawer — a
 * native `<dialog showModal>`, reparented to <body>, scroll-locked,
 * background-inerted). The shared `store('sgs/nav')`
 * (`src/shared/nav-interactivity/store.js`) implements ONLY the dialog
 * pattern — its `openDrawerFor()` unconditionally reparents to <body>,
 * locks body scroll and freezes the rest of the page (`freezeBackground()`),
 * which is exactly the "dim/block the page" behaviour FR-36-10 says a
 * disclosure must NOT have. Reusing it for the flyout would violate the
 * contract it exists to enforce, not honour it.
 *
 * This module is therefore the flyout's own — much smaller — toggle:
 * no reparent, no scroll-lock, no background freeze, no focus trap. It is
 * NOT a second dialog utility (R-31-9 is about not re-deriving the SAME
 * mechanism twice); it is the disclosure pattern the shared store does not
 * (yet) provide, scoped to this one block, per the file-scope constraint on
 * this build (`plugins/sgs-blocks/src/blocks/cart/**` only — the shared
 * store cannot be extended here). A future FR-36-4 dropdown/mega build is
 * the natural place to promote this into shared plumbing if it turns out
 * more than one block needs it.
 *
 * @package
 */

/**
 * Wire one flyout instance.
 *
 * @param {HTMLElement} root The `.wp-block-sgs-cart` root element.
 * @return {Object|null} A `{ open, close, isOpenNow, setOnOpen }` controller,
 *                        or null if the required markup is absent.
 */
export function initFlyout( root ) {
	const trigger = root.querySelector( '[data-sgs-cart-flyout-trigger]' );
	const panel = root.querySelector(
		'[data-sgs-cart-panel][data-sgs-cart-mode="flyout"]'
	);

	if ( ! trigger || ! panel ) {
		return null;
	}

	let isOpen = false;
	let onOpenCallback = null;

	/**
	 * Close the flyout if a click landed outside both the trigger and panel.
	 *
	 * @param {MouseEvent} event The document-level click event.
	 */
	function onDocumentClick( event ) {
		if (
			panel.contains( event.target ) ||
			trigger.contains( event.target )
		) {
			return;
		}
		close( { returnFocus: false } );
	}

	/**
	 * Escape closes + returns focus (FR-36-10). Tab is NEVER intercepted —
	 * no trap — but per standard disclosure UX, if focus moves outside both
	 * the trigger and the panel the flyout auto-closes (checked on the next
	 * tick so `document.activeElement` reflects the tab's new target).
	 *
	 * @param {KeyboardEvent} event The document-level keydown event.
	 */
	function onDocumentKeydown( event ) {
		if ( 'Escape' === event.key ) {
			close();
			return;
		}
		if ( 'Tab' === event.key ) {
			window.setTimeout( () => {
				const active = panel.ownerDocument.activeElement;
				if ( ! panel.contains( active ) && active !== trigger ) {
					close( { returnFocus: false } );
				}
			}, 0 );
		}
	}

	/**
	 * Open the flyout.
	 */
	function open() {
		if ( isOpen ) {
			return;
		}
		isOpen = true;
		panel.hidden = false;
		trigger.setAttribute( 'aria-expanded', 'true' );
		document.addEventListener( 'click', onDocumentClick, true );
		document.addEventListener( 'keydown', onDocumentKeydown );
		if ( 'function' === typeof onOpenCallback ) {
			onOpenCallback();
		}
	}

	/**
	 * Close the flyout.
	 *
	 * @param {Object}  [opts]             Options.
	 * @param {boolean} [opts.returnFocus] Whether to return focus to the trigger (default true).
	 */
	function close( { returnFocus = true } = {} ) {
		if ( ! isOpen ) {
			return;
		}
		isOpen = false;
		panel.hidden = true;
		trigger.setAttribute( 'aria-expanded', 'false' );
		document.removeEventListener( 'click', onDocumentClick, true );
		document.removeEventListener( 'keydown', onDocumentKeydown );
		if ( returnFocus ) {
			trigger.focus();
		}
	}

	trigger.addEventListener( 'click', () => {
		if ( isOpen ) {
			close();
		} else {
			open();
		}
	} );

	return {
		open,
		close,
		isOpenNow: () => isOpen,
		/**
		 * Register a callback fired every time the flyout opens (used to
		 * (re)fetch + render the live cart contents).
		 *
		 * @param {Function} fn The callback.
		 */
		setOnOpen: ( fn ) => {
			onOpenCallback = fn;
		},
	};
}
