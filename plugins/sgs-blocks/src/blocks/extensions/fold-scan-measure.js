/**
 * Fold scan: loading the public page in hidden same-origin iframes and counting its first-screen sections.
 */
import {
	FOLD_SCAN_SIZES,
	countSectionsAboveFold,
	largestCount,
} from './fold-scan-count';

const LOAD_TIMEOUT_MS = 20000;

function nextFrames( win, frames ) {
	return new Promise( ( resolve ) => {
		const step = ( left ) =>
			left === 0
				? resolve()
				: win.requestAnimationFrame( () => step( left - 1 ) );
		step( frames );
	} );
}

function measureAtSize( url, size ) {
	return new Promise( ( resolve, reject ) => {
		const frame = document.createElement( 'iframe' );
		const done = ( settle, value ) => {
			clearTimeout( timer );
			frame.remove();
			settle( value );
		};
		const timer = setTimeout(
			() => done( reject, new Error( 'fold scan timed out' ) ),
			LOAD_TIMEOUT_MS
		);
		const set = ( name, value ) => frame.style.setProperty( name, value );
		frame.setAttribute( 'aria-hidden', 'true' );
		frame.setAttribute( 'tabindex', '-1' );
		set( 'position', 'fixed' );
		set( 'left', '-20000px' );
		set( 'top', '0' );
		set( 'width', size.width + 'px' );
		set( 'height', size.height + 'px' );
		set( 'border', '0' );
		set( 'pointer-events', 'none' );
		frame.addEventListener( 'load', async () => {
			try {
				const win = frame.contentWindow;
				const doc = frame.contentDocument;
				if ( doc.fonts && doc.fonts.ready ) {
					await doc.fonts.ready;
				}
				await nextFrames( win, 2 );
				done( resolve, countSectionsAboveFold( doc, size.height ) );
			} catch ( error ) {
				done( reject, error );
			}
		} );
		frame.src = url;
		document.body.appendChild( frame );
	} );
}

/**
 * Measure the page at the three sizes, one after another.
 *
 * @param {string} permalink The post's public URL.
 * @return {Promise<number>} The largest count across sizes, at least 1.
 */
export async function measureFold( permalink ) {
	const url = new URL( permalink, window.location.href );
	url.searchParams.set( 'sgs-fold-scan', String( Date.now() ) );
	const counts = [];
	for ( const size of FOLD_SCAN_SIZES ) {
		counts.push( await measureAtSize( url.toString(), size ) );
	}
	return largestCount( counts );
}
