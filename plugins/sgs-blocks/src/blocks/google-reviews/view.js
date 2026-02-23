/**
 * Google Reviews — Frontend Interactivity
 *
 * Handles slider autoplay and navigation for slider variant.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';

store( 'sgs/google-reviews', {
	callbacks: {
		/**
		 * Initialise slider on mount.
		 */
		init() {
			const ctx = getContext();
			const element = getElement();

			// Only init for slider variant with autoplay.
			if ( ! ctx.autoplay ) {
				return;
			}

			const slider = element.ref.querySelector( '.sgs-google-reviews__list' );
			if ( ! slider ) {
				return;
			}

			const reviews = slider.querySelectorAll( '.sgs-google-reviews__review' );
			if ( reviews.length <= 1 ) {
				return; // Nothing to slide.
			}

			let currentSlide = 0;

			const slideNext = () => {
				currentSlide = ( currentSlide + 1 ) % reviews.length;
				const scrollAmount = reviews[ currentSlide ].offsetLeft;
				slider.scrollTo( {
					left: scrollAmount,
					behavior: 'smooth',
				} );
			};

			// Start autoplay interval.
			setInterval( slideNext, parseInt( ctx.autoplaySpeed, 10 ) );
		},
	},
} );
