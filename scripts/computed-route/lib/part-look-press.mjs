// Whether a row of pressable chips presses one chip at a time (the shop chips block's one-at-a-time switch, shop investigation F-6).
// A static read cannot tell: a row with exactly one chip pressed is a single choice and a multi-select that opens on one chip alike. So the
// probe presses a chip that is not pressed on the open draft page and reads the chip that was pressed: it is released at once when the
// draft's logic replaces its choice (a single choice), and still pressed when the logic adds to it (several at a time). The probe is
// positive evidence either way; a press that changed nothing (no chip became pressed) reads neither, and the setting is left alone.
// Each instance of `chip-selected` and `chip` in `found` carries its `key` (lib/fill-part-look-page.mjs::findPartsInPage's pathOf).
import { selectorOfKey } from './part-look-hover.mjs';

const pressedOf = ( selector ) => {
	const el = document.querySelector( selector );
	if ( ! el ) {
		return null;
	}
	return [ 'aria-pressed', 'aria-checked', 'aria-selected' ].some( ( a ) => 'true' === el.getAttribute( a ) );
};

// Adds `chip-single` (one instance) or `chip-multiple` (one instance) to `found` when the press proved it; `found` is changed in place.
// The page is left pressed, so the caller reads nothing else from it afterwards. Returns 'single', 'multiple' or null.
export async function readPress( { page, found, settleMs = 350, log = () => {} } ) {
	const chosen = found[ 'chip-selected' ]?.[ 0 ];
	const other = found.chip?.[ 0 ];
	const chosenSel = chosen && selectorOfKey( chosen.key );
	const otherSel = other && selectorOfKey( other.key );
	if ( ! chosenSel || ! otherSel ) {
		return null;
	}
	try {
		await page.locator( otherSel ).first().click( { timeout: 4000 } );
		await page.waitForTimeout( settleMs );
		const [ pressedNow, wasPressed ] = await Promise.all( [ page.evaluate( pressedOf, otherSel ), page.evaluate( pressedOf, chosenSel ) ] );
		if ( ! pressedNow ) {
			return null;
		}
		const verdict = wasPressed ? 'multiple' : 'single';
		found[ `chip-${ verdict }` ] = [ { key: chosen.key, tag: chosen.tag, text: verdict, box: chosen.box, styles: {} } ];
		return verdict;
	} catch ( e ) {
		log( `press of the chip (${ other.key }) not read: ${ e.message.split( '\n' )[ 0 ] }` );
		return null;
	}
}
