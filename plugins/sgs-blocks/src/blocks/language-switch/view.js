/**
 * SGS Language Switch — frontend interactivity (disclosure mode only).
 *
 * inline and single-link modes need no script — every link is already in the
 * page HTML. disclosure mode renders its list fully visible (no `hidden`,
 * `aria-expanded="true"`) so a no-JS visitor still reaches every language;
 * this module then closes it, wires the toggle, and adds Escape-to-close +
 * outside-click-to-close.
 *
 * @package SGS\Blocks
 */

function initDisclosure( root ) {
	const trigger = root.querySelector( '.sgs-language-switch__trigger' );
	const panel = root.querySelector( '.sgs-language-switch__panel' );
	const list = root.querySelector( '.sgs-language-switch__list' );

	if ( ! trigger || ! panel || ! list ) {
		return;
	}

	// Collapse now that JS has taken over.
	list.hidden = true;
	trigger.setAttribute( 'aria-expanded', 'false' );

	function open() {
		list.hidden = false;
		trigger.setAttribute( 'aria-expanded', 'true' );
	}

	function close( { returnFocus = false } = {} ) {
		if ( list.hidden ) {
			return;
		}
		list.hidden = true;
		trigger.setAttribute( 'aria-expanded', 'false' );
		if ( returnFocus ) {
			trigger.focus();
		}
	}

	trigger.addEventListener( 'click', () => {
		if ( list.hidden ) {
			open();
		} else {
			close();
		}
	} );

	document.addEventListener( 'keydown', ( event ) => {
		if ( 'Escape' !== event.key || list.hidden ) {
			return;
		}
		close( { returnFocus: true } );
	} );

	document.addEventListener( 'click', ( event ) => {
		if ( list.hidden ) {
			return;
		}
		if ( root.contains( event.target ) ) {
			return;
		}
		close();
	} );
}

function initLanguageSwitchers() {
	document
		.querySelectorAll( '.sgs-language-switch--disclosure' )
		.forEach( initDisclosure );
}

if ( 'loading' === document.readyState ) {
	document.addEventListener( 'DOMContentLoaded', initLanguageSwitchers );
} else {
	initLanguageSwitchers();
}
