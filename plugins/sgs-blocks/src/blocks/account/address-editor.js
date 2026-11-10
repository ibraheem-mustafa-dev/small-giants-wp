/**
 * sgs/account — the inline address editor (addressEditor on).
 *
 * Each address card prints its read view and its form; the form is hidden until Edit is pressed. Edit opens that
 * card's form (and shuts any other), sets aria-expanded and moves focus to the first field; Cancel shuts it and
 * returns focus to Edit. Without this module both are plain links: Edit to WooCommerce's edit URL, which prints the
 * same card open, and Cancel back to the list.
 */

const CARD = '[data-sgs-addr]';

/**
 * @param {Element} card The address card.
 * @param {boolean} open Whether its form is open.
 */
function setOpen( card, open ) {
	const edit = card.querySelector( '[data-sgs-addr-edit]' );
	const form = card.querySelector( '[data-sgs-addr-form]' );
	const read = card.querySelector( '[data-sgs-addr-read]' );
	if ( ! edit || ! form ) {
		return;
	}
	form.hidden = ! open;
	if ( read ) {
		read.hidden = open;
	}
	edit.hidden = open;
	edit.setAttribute( 'aria-expanded', open ? 'true' : 'false' );
	if ( open ) {
		const first = form.querySelector( 'input:not([type="hidden"]), select, textarea' );
		if ( first ) {
			first.focus();
		}
	} else {
		edit.focus();
	}
}

/**
 * @param {Event} event Click inside the account content.
 */
function onClick( event ) {
	if ( ! ( event.target instanceof Element ) ) {
		return;
	}
	const edit = event.target.closest( '[data-sgs-addr-edit]' );
	const cancel = event.target.closest( '[data-sgs-addr-cancel]' );
	const trigger = edit || cancel;
	const card = trigger ? trigger.closest( CARD ) : null;
	if ( ! card ) {
		return;
	}
	event.preventDefault();
	if ( edit ) {
		document.querySelectorAll( CARD ).forEach( ( other ) => {
			if ( other !== card ) {
				const form = other.querySelector( '[data-sgs-addr-form]' );
				if ( form && ! form.hidden ) {
					setOpen( other, false );
				}
			}
		} );
	}
	setOpen( card, !! edit );
}

/** Bind the editor once for the page. */
export function initAddressEditors() {
	if ( document.body.dataset.sgsAddrBound === '1' || ! document.querySelector( CARD ) ) {
		return;
	}
	document.body.dataset.sgsAddrBound = '1';
	document.addEventListener( 'click', onClick );
}

initAddressEditors();
