// The Open state of a calibration instance (css_state 'open'): a disclosure the instance owns shown open. A fixture
// that renders the state at rest (an accordion item saved open) holds an expanded toggle already and is read as it is;
// otherwise the instance's first closed toggle whose panel sits inside it (a nav item's dropdown or mega trigger, never
// a burger whose drawer lives elsewhere) is opened through the block's own handler. A toggle that cannot take the
// open at this width (hidden below the collapse point) is set aria-expanded="true" in the page, the attribute the
// block's open-state rules key on; after the read the toggle is closed with Escape and its aria-expanded set back.

// In-page: marks the toggle to open with data-cr-toggle. Returns null when the instance is absent, else
// { expanded } (the fixture renders an open toggle already) or { toggle } (whether a closed one was marked).
export function markOpenToggleInPage( [ prefix, n ] ) {
	document.querySelectorAll( '[data-cr-toggle]' ).forEach( ( e ) => e.removeAttribute( 'data-cr-toggle' ) );
	const root = document.querySelector( `.${ prefix }${ n }` );
	if ( ! root ) {
		return null;
	}
	const owns = ( b ) => ( b.getAttribute( 'aria-controls' ) || '' ).split( /\s+/ ).some( ( id ) => {
		const panel = id && document.getElementById( id );
		return panel && root.contains( panel );
	} );
	const toggles = [ ...root.querySelectorAll( '[aria-controls][aria-expanded]' ) ].filter( owns );
	if ( toggles.some( ( b ) => 'true' === b.getAttribute( 'aria-expanded' ) ) ) {
		return { expanded: true };
	}
	const toggle = toggles.find( ( b ) => 'false' === b.getAttribute( 'aria-expanded' ) );
	toggle && toggle.setAttribute( 'data-cr-toggle', '1' );
	return { toggle: !! toggle };
}

// Opens the marked toggle (openToggle: the block's own handler) and, when it is still shut, sets its aria-expanded.
// Returns a function that closes it again.
export async function openOwnToggle( page, openToggle ) {
	await openToggle( page );
	await page.waitForTimeout( 500 );
	const forced = await page.evaluate( () => {
		const t = document.querySelector( '[data-cr-toggle]' );
		if ( ! t || 'true' === t.getAttribute( 'aria-expanded' ) ) {
			return false;
		}
		t.setAttribute( 'aria-expanded', 'true' );
		return true;
	} );
	forced && await page.waitForTimeout( 300 );
	return async () => {
		await page.keyboard.press( 'Escape' );
		await page.evaluate( () => {
			document.activeElement?.blur();
			document.querySelector( '[data-cr-toggle][aria-expanded="true"]' )?.setAttribute( 'aria-expanded', 'false' );
		} );
		await page.waitForTimeout( 300 );
	};
}
