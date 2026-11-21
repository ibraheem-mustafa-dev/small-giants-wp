// The hovered look of located draft parts (the part-look reader's browser half for a built-in button, lib/fill-builtin-button.mjs).
// The pointer is put on each located element of the open draft page and the element's computed values are read once its transition
// has settled, so a hover the draft draws by a style rule and one it draws by script are both read as they render. Each instance
// gains `hover` (the computed HOVER_PROPS while hovered) and its resting `styles.transform` (a preset's hover lift is compared
// with it). An element the pointer cannot reach (covered, off the page) keeps no `hover`, which the preset matcher treats as unread.
import { HOVER_PROPS } from './fill-builtin-button.mjs';

// The CSS selector of an instance's key (lib/fill-part-look-page.mjs::findPartsInPage's pathOf: `tag:childIndex` from the body down).
export function selectorOfKey( key ) {
	const steps = String( key ).split( '>' ).map( ( s ) => /^([a-z][a-z0-9-]*):(\d+)$/.exec( s ) );
	return steps.length && steps.every( Boolean ) ? `body > ${ steps.map( ( [ , tag, i ] ) => `${ tag }:nth-child(${ Number( i ) + 1 })` ).join( ' > ' ) }` : null;
}

const computedOf = ( [ selector, props ] ) => {
	const el = document.querySelector( selector );
	if ( ! el ) {
		return null;
	}
	const style = getComputedStyle( el );
	return Object.fromEntries( props.map( ( p ) => [ p, style.getPropertyValue( p ) ] ) );
};

// Hovers every located instance of `parts` in `found` ({ part: [ instance ] }, changed in place) on `page`; settleMs waits for the transition.
export async function readHover( { page, found, parts, settleMs = 450, log = () => {} } ) {
	for ( const part of parts ) {
		for ( const instance of found[ part ] || [] ) {
			const selector = selectorOfKey( instance.key );
			if ( ! selector ) {
				continue;
			}
			try {
				const rest = await page.evaluate( computedOf, [ selector, [ 'transform' ] ] );
				rest && ( instance.styles.transform = rest.transform );
				await page.locator( selector ).first().hover( { timeout: 4000 } );
				await page.waitForTimeout( settleMs );
				const hovered = await page.evaluate( computedOf, [ selector, HOVER_PROPS ] );
				hovered && ( instance.hover = hovered );
			} catch ( e ) {
				log( `hover of ${ part } (${ instance.key }) not read: ${ e.message.split( '\n' )[ 0 ] }` );
			} finally {
				await page.mouse.move( 0, 0 ).catch( () => {} );
				await page.waitForTimeout( 60 );
			}
		}
	}
}
