// The live page's block boxes at 1440 and at 375 (the width a block hidden on desktop, such as a drawer's, shows at), for the
// pairing rule that gives a draft element to the outermost block whose box it has (lib/pair-wrappers.mjs). One read per surface,
// in the opening state, through the surface's own walker config.
//   readLiveBoxes( { cfg, chromium } ) -> { ref: { 1440: { x, w, h }, 375: { x, w, h } } }
// A block that paints no box at a width (display: none, a zero size) has no entry for it. x is the page-left offset, w and h the
// border box in px.
import { openLive } from './pairs-page.mjs';

export const PAIR_WIDTHS = [ 1440, 375 ];

export async function readLiveBoxes( { cfg, chromium } ) {
	const browser = await chromium.launch( { headless: true } );
	const out = {};
	try {
		for ( const width of PAIR_WIDTHS ) {
			const page = await openLive( browser, cfg, width );
			const boxes = await page.evaluate( () => {
				const refOf = ( el ) => [ ...el.classList ].find( ( c ) => /^cr-ref-[\w-]+$/.test( c ) );
				const found = {};
				document.querySelectorAll( '[class*="cr-ref-"]' ).forEach( ( el ) => {
					const ref = refOf( el );
					const b = el.getBoundingClientRect();
					if ( ref && ! ( ref in found ) && b.width > 0 && b.height > 0 ) {
						found[ ref ] = { x: Math.round( b.x * 10 ) / 10, w: Math.round( b.width * 10 ) / 10, h: Math.round( b.height * 10 ) / 10 };
					}
				} );
				return found;
			} );
			await page.close();
			for ( const [ ref, box ] of Object.entries( boxes ) ) {
				out[ ref ] = { ...out[ ref ], [ width ]: box };
			}
		}
		return out;
	} finally {
		await browser.close();
	}
}
