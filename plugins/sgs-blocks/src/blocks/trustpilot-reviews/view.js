/**
 * Trustpilot Reviews -- Frontend Interactivity
 *
 * The carousel (arrows, dots, loop, autoplay and its pause) is the shared runtime, `src/shared/carousel`; this file only
 * names the block's own classes and settings. Looping: when `data-sgs-loop="1"` is on the track, `fx-carousel-loop.js`
 * clones the cards and an arrow press continues past the last card into the first. A block that does not loop clamps at
 * either end.
 *
 * @package SGS\Blocks
 */

import { createCarousel, realItems } from '../../shared/carousel/index.js';

const initCarousel = ( root ) => {
	const variant = root.getAttribute( 'data-variant' );
	if ( variant !== 'carousel' && variant !== 'mini-carousel' ) {
		return;
	}
	const track = root.querySelector( '.sgs-trustpilot-reviews__track' );
	if ( realItems( track, '.sgs-trustpilot-reviews__card' ).length < 2 ) {
		return;
	}
	const autoplay = root.getAttribute( 'data-autoplay' ) === 'true';
	createCarousel( {
		root,
		track,
		itemSelector: '.sgs-trustpilot-reviews__card',
		prev: root.querySelector( '.sgs-trustpilot-reviews__arrow--prev' ),
		next: root.querySelector( '.sgs-trustpilot-reviews__arrow--next' ),
		moveBy: 'card',
		dots: root.querySelectorAll( '.sgs-trustpilot-reviews__dot' ),
		autoplay: autoplay
			? {
					speed:
						parseInt(
							root.getAttribute( 'data-autoplay-speed' ),
							10
						) || 5000,
					wrap: false,
			  }
			: null,
	} );
};

const init = () => {
	document
		.querySelectorAll( '.wp-block-sgs-trustpilot-reviews' )
		.forEach( initCarousel );
};

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
