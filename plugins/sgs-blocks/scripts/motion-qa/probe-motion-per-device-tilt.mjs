/**
 * FR-38A-42 checks for probe-motion-per-device.mjs: tilted cards that each rest at their own angle and straighten on
 * hover and focus, the polaroid frame, hover isolation between cards, and reduced motion. The stored angles, offsets and
 * easing are read from the fixture tree (`loadExpectations`), never restated here.
 *
 * @package SGS\Blocks
 */

import { isRest } from './probe-motion-model-lib.mjs';
import { judgeEase, judgeRotate, judgeTranslate } from './probe-motion-per-device-lib.mjs';
import { READ_MOTION, hoverRead, settleInView } from './probe-motion-per-device-page.mjs';

/** The tilt state of one reading: rotate, translate, and whether the element is stamped for hover motion. */
const view = ( r ) => ( { rotate: r.rotate, translate: r.translate, stamped: r.stamped } );

/** True when a reading is at the element's own stored hover result: angle 0 and translate (x, y). */
const straightened = ( r, t ) => judgeRotate( r.rotate, t.hover ) && judgeTranslate( r.translate, t.x, t.y );

/** Focus the first link inside a card (the root flag follows :focus-within, which does not depend on the engine's Tab-to-links setting) and read the card, then blur. Returns null when the card has no link. */
async function focusRead( page, sel ) {
	const link = `${ sel } a[href]`;
	if ( ! await page.$( link ) ) return null;
	await settleInView( page, sel );
	await page.focus( link );
	await page.waitForTimeout( 800 );
	const reading = await page.evaluate( READ_MOTION, sel );
	reading.focusInside = await page.evaluate( ( s ) => document.querySelector( s ).contains( document.activeElement ) && document.activeElement !== document.body, sel );
	await page.evaluate( () => document.activeElement && document.activeElement.blur() );
	await page.waitForTimeout( 100 );
	return reading;
}

export async function tiltChecks( ctx, ex ) {
	const { rep, page } = ctx;
	const targets = [ ...ex.cards, ex.polaroid ];
	const missing = [];
	for ( const t of targets ) if ( ! await page.$( t.sel ) ) missing.push( t.sel );
	if ( missing.length ) {
		rep.check( 'tilt-rest-and-hover', { selector: missing.join( ', ' ), pass: null, why: 'selector not on the page: build the fixture and pass its id' } );
		return;
	}
	const rests = {};
	for ( const t of targets ) {
		const name = t.sel.replace( '.m39-tilt-', '' ).replace( '.m39-', '' );
		const { before, after } = await hoverRead( page, t.sel, [ t.sel ] );
		const b = before[ t.sel ];
		const a = after[ t.sel ];
		rests[ t.sel ] = b.rotate;
		const focus = t === ex.polaroid ? null : await focusRead( page, t.sel );
		const focusOk = focus === null ? true : focus.focusInside && straightened( focus, t );
		rep.check( `tilt-rest-and-hover:${ name }`, {
			selector: t.sel,
			property: 'rotate / translate / transition-timing-function',
			measured: { rest: view( b ), hover: view( a ), focus: focus ? view( focus ) : 'no focusable child', ease: b.ease },
			expected: `rest ${ t.rest }deg; hover ${ t.hover }deg with translate (${ t.x }px, ${ t.y }px)${ focus === null ? '' : ' and the same on focus' }; easing ${ t.easing }`,
			pass: judgeRotate( b.rotate, t.rest ) && isRest( b.translate ) && straightened( a, t ) && focusOk && judgeEase( b.ease, t.easing ),
		} );
		const other = targets.filter( ( o ) => o !== t ).sort( ( x, y ) => Math.abs( y.rest - t.rest ) - Math.abs( x.rest - t.rest ) )[ 0 ];
		rep.control( `tilt-rest-and-hover:${ name }`, { selector: t.sel, property: 'rotate', measured: b.rotate, expected: `another card's stored angle (${ other.rest }deg) is judged red`, red: ! judgeRotate( b.rotate, other.rest ) } );
	}

	const [ first, ...others ] = ex.cards;
	await settleInView( page, first.sel );
	await page.hover( first.sel );
	await page.waitForTimeout( 800 );
	const during = await Promise.all( ex.cards.map( async ( c ) => [ c, await page.evaluate( READ_MOTION, c.sel ) ] ) );
	await page.mouse.move( 0, 0 );
	const hoveredOk = straightened( during[ 0 ][ 1 ], first );
	const othersOk = during.slice( 1 ).every( ( [ c, r ] ) => judgeRotate( r.rotate, c.rest ) && isRest( r.translate ) );
	rep.check( 'tilt-hover-isolated', { selector: ex.cards.map( ( c ) => c.sel ).join( ', ' ), property: 'rotate / translate while the first card is hovered', measured: during.map( ( [ c, r ] ) => ( { card: c.sel, ...view( r ) } ) ), expected: `${ first.sel } straight; ${ others.map( ( c ) => `${ c.sel } at ${ c.rest }deg` ).join( ', ' ) }`, pass: hoveredOk && othersOk } );
	const wrongOthers = during.slice( 1 ).every( ( [ , r ] ) => judgeRotate( r.rotate, 0 ) );
	rep.control( 'tilt-hover-isolated', { selector: others.map( ( c ) => c.sel ).join( ', ' ), property: 'rotate', measured: during.slice( 1 ).map( ( [ , r ] ) => r.rotate ), expected: 'the un-hovered cards judged as if straightened is red', red: ! wrongOthers } );

	const reduced = await ctx.open( { reducedMotion: 'reduce' } );
	try {
		const { before, after } = await hoverRead( reduced.page, first.sel, [ first.sel ] );
		const b = before[ first.sel ];
		const a = after[ first.sel ];
		rep.check( 'tilt-reduced-motion', { selector: first.sel, property: 'rotate / translate', measured: { rest: view( b ), hover: view( a ) }, expected: `rest ${ first.rest }deg stays on hover; translate stays at rest`, pass: judgeRotate( b.rotate, first.rest ) && judgeRotate( a.rotate, first.rest ) && isRest( a.translate ) } );
		rep.control( 'tilt-reduced-motion', { selector: first.sel, property: 'rotate (no-preference hover)', measured: during[ 0 ][ 1 ].rotate, expected: 'with no reduced-motion preference the same hover leaves the rest angle, so the judge above can see movement', red: ! judgeRotate( during[ 0 ][ 1 ].rotate, first.rest ) } );
	} finally {
		await reduced.close();
	}
}
