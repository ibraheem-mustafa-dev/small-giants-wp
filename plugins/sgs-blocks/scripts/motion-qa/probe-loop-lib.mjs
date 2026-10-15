/**
 * Shared helpers for the looping-effect probes (Spec 38A FR-38A-37, 44 and 52): the CSS cubic-bezier curve, a Web
 * Animations loop's iteration progress at a given time, and the stored layers of a fixture tree. Pure functions, so the
 * probes' `--self-test` runs exercise them offline.
 *
 * @package SGS\Blocks
 */

/**
 * The CSS `cubic-bezier( x1, y1, x2, y2 )` timing function.
 *
 * @param {number} x1 First control point x.
 * @param {number} y1 First control point y.
 * @param {number} x2 Second control point x.
 * @param {number} y2 Second control point y.
 * @return {Function} `( progress ) => eased progress`.
 */
export function cubicBezier( x1, y1, x2, y2 ) {
	const at = ( a, b, t ) => ( ( ( 1 - 3 * b + 3 * a ) * t + ( 3 * b - 6 * a ) ) * t + 3 * a ) * t;
	const slope = ( a, b, t ) => 3 * ( 1 - 3 * b + 3 * a ) * t * t + 2 * ( 3 * b - 6 * a ) * t + 3 * a;
	return ( x ) => {
		if ( x <= 0 ) return 0;
		if ( x >= 1 ) return 1;
		let t = x;
		for ( let i = 0; i < 8; i++ ) {
			const err = at( x1, x2, t ) - x;
			const d = slope( x1, x2, t );
			if ( Math.abs( err ) < 1e-7 ) break;
			if ( Math.abs( d ) < 1e-6 ) break;
			t -= err / d;
		}
		let lo = 0;
		let hi = 1;
		for ( let i = 0; i < 40 && Math.abs( at( x1, x2, t ) - x ) > 1e-7; i++ ) {
			if ( at( x1, x2, t ) < x ) lo = t;
			else hi = t;
			t = ( lo + hi ) / 2;
		}
		return at( y1, y2, t );
	};
}

/**
 * An infinite Web Animations loop's directed iteration progress (0 to 1, before easing) at a current time.
 *
 * @param {number} currentTime The animation's `currentTime` in ms.
 * @param {number} period      The iteration duration in ms.
 * @param {number} phase       The stored phase in ms (the animation's delay is minus this).
 * @param {string} direction   `normal`, `reverse`, `alternate` or `alternate-reverse`.
 * @return {number} Progress.
 */
export function loopProgress( currentTime, period, phase, direction ) {
	const active = Math.max( 0, currentTime + phase );
	const iteration = Math.floor( active / period );
	const frac = active / period - iteration;
	const odd = 1 === iteration % 2;
	if ( 'reverse' === direction ) return 1 - frac;
	if ( 'alternate' === direction ) return odd ? 1 - frac : frac;
	if ( 'alternate-reverse' === direction ) return odd ? frac : 1 - frac;
	return frac;
}

/**
 * Every stored layer of one effect in a block tree, with the marker class of the block that holds it.
 *
 * @param {Object[]} blocks A wp-build-page.js tree.
 * @param {string}   effect The effect slug.
 * @param {Object[]} [out]  Accumulator.
 * @return {{className: string, element: string, layer: Object}[]} The layers in tree order.
 */
export function storedLayers( blocks, effect, out = [] ) {
	for ( const block of blocks || [] ) {
		const attrs = block.attributes || {};
		const elements = ( attrs.sgsMotion && attrs.sgsMotion.elements ) || {};
		for ( const [ element, node ] of Object.entries( elements ) ) {
			const lists = [ node.effects, node.entrance && node.entrance.text ];
			for ( const list of lists ) {
				for ( const layer of Array.isArray( list ) ? list : [] ) {
					if ( layer.effect === effect ) out.push( { className: ( attrs.className || '' ).split( /\s+/ )[ 0 ], element, layer } );
				}
			}
		}
		storedLayers( block.innerBlocks, effect, out );
	}
	return out;
}

/**
 * Playwright launch options: headless unless `SGS_HEADED=1` (the host's edge challenges a headless browser under load;
 * a headed Chromium runs as installed Chrome, as the other motion probes do).
 *
 * @param {string} engine `chromium`, `firefox` or `webkit`.
 * @return {Object} Launch options.
 */
export function launchOptions( engine ) {
	const headed = Boolean( process.env.SGS_HEADED );
	return { headless: ! headed, ...( headed && 'chromium' === engine && { channel: 'chrome' } ) };
}

/**
 * Wait until the host's "Checking your browser" challenge page has handed over to the real page (it reloads itself).
 *
 * @param {Object} page A Playwright page.
 * @return {Promise<boolean>} True when the real page is showing.
 */
export async function passChallenge( page ) {
	try {
		await page.waitForFunction( () => ! /checking your browser/i.test( document.title ) && document.body && document.body.childElementCount > 0, null, { timeout: 30000 } );
		await page.waitForLoadState( 'load' );
		return true;
	} catch {
		return false;
	}
}
