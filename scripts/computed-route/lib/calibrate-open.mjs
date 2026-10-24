// The Open state of a calibration instance (css_state 'open'): a disclosure the instance owns shown open. A fixture
// that renders the state at rest (an accordion item saved open, a details[open]) is read as it is; otherwise the
// instance's first closed toggle whose panel sits inside it (a nav item's dropdown or mega trigger, never a burger
// whose drawer lives elsewhere) or, failing that, its first closed <details> summary is opened through the block's own
// handler. A toggle that cannot take the open at this width (hidden below the collapse point) is forced open in the
// page (aria-expanded="true", or the open attribute on its details), the markers the block's open-state rules key on;
// after the read the disclosure is closed with Escape, the markers set back, and a toggle still expanded is clicked
// shut. An instance with no disclosure at all is a miss (the caller reports it), never a rest read.

// In-page: marks the toggle to open with data-cr-toggle. Returns null when the instance is absent, else
// { expanded } (the fixture renders an open toggle or details already), { toggle } (whether a closed one was marked).
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
	if ( toggles.some( ( b ) => 'true' === b.getAttribute( 'aria-expanded' ) ) || root.querySelector( 'details[open]' ) ) {
		return { expanded: true };
	}
	const toggle = toggles.find( ( b ) => 'false' === b.getAttribute( 'aria-expanded' ) ) || root.querySelector( 'details:not([open]) > summary' );
	toggle && toggle.setAttribute( 'data-cr-toggle', '1' );
	return { toggle: !! toggle };
}

// In-page: whether the marked toggle is expanded (a summary by its details' open attribute, else by aria-expanded).
const markedState = () => {
	const t = document.querySelector( '[data-cr-toggle]' );
	return t ? ( 'SUMMARY' === t.tagName ? !! t.parentElement?.open : 'true' === t.getAttribute( 'aria-expanded' ) ) : null;
};

// Opens the marked toggle (openToggle: the block's own handler) and, when it is still shut, forces it open. Returns a
// function that closes it again.
export async function openOwnToggle( page, openToggle ) {
	await openToggle( page );
	await page.waitForTimeout( 500 );
	const forced = await page.evaluate( ( state ) => {
		const t = document.querySelector( '[data-cr-toggle]' );
		if ( ! t || ( new Function( `return (${ state })()` ) )() ) {
			return false;
		}
		'SUMMARY' === t.tagName ? t.parentElement?.setAttribute( 'open', '' ) : t.setAttribute( 'aria-expanded', 'true' );
		return true;
	}, markedState.toString() );
	forced && await page.waitForTimeout( 300 );
	return async () => {
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 200 );
		// Escape closes a popover disclosure but not a details or accordion: a toggle still expanded is clicked again so
		// the block's own handler shuts it (a toggle forced open never opened the block, so only its markers are cleared).
		if ( ! forced && await page.evaluate( markedState ) ) {
			await page.locator( '[data-cr-toggle]' ).first().evaluate( ( el ) => el.click() );
			await page.waitForTimeout( 200 );
		}
		await page.evaluate( () => {
			document.activeElement?.blur();
			const t = document.querySelector( '[data-cr-toggle]' );
			t?.closest( 'details' )?.removeAttribute( 'open' );
			'true' === t?.getAttribute( 'aria-expanded' ) && t.setAttribute( 'aria-expanded', 'false' );
		} );
		await page.waitForTimeout( 300 );
	};
}
