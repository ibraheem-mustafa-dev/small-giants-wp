/**
 * SGS WhatsApp CTA — floating button visibility logic.
 *
 * Shows the floating WhatsApp button after the user scrolls past a
 * per-instance threshold (render.php's `data-scroll-threshold`, sourced from
 * the `floatingScrollThreshold` attribute). 0 = always visible (the default,
 * so an existing floating button with no threshold configured is unaffected).
 *
 * Step-aside-near-inline (`floatingHideNearInline`, default true): while any
 * non-floating sgs/whatsapp-cta (inline/banner/card) is on screen, the
 * floating button steps aside (`sgs-whatsapp-cta--stepped-aside`, CSS in
 * style.css) so the same WhatsApp CTA never shows twice at once. It also
 * leaves the tab order and accessibility tree (`inert`) while stepped aside,
 * matching the "hidden below scroll threshold" precondition already applied
 * via `visibility:hidden` above. If the page has no inline CTA, the observer
 * is never created and the floating button's existing behaviour is
 * untouched (degrade to more content: a script failure/absence just leaves
 * the bubble visible, never hidden with no way back).
 *
 * Stacking: a fixed button is ranked by the layer it sits in. Every direct child of a container is a
 * z-index:1 stacking context and the layer holding keyboard focus rises to 2, so a button left inside a
 * footer layer is painted over by a focused form above it. On load each floating button moves to the end of
 * `<body>`, outside every layer, so its own z-index ranks against the whole page.
 *
 * Loaded as a viewScriptModule (ES module, frontend only).
 */

const floatingBtns = document.querySelectorAll(
	'.sgs-whatsapp-cta--floating'
);

if ( floatingBtns.length ) {
	floatingBtns.forEach( ( btn ) => {
		if ( btn.parentElement !== document.body ) {
			document.body.appendChild( btn );
		}
	} );

	const toggleVisibility = () => {
		floatingBtns.forEach( ( btn ) => {
			const threshold = parseInt( btn.dataset.scrollThreshold, 10 ) || 0;
			const scrolled = threshold === 0 || window.scrollY > threshold;
			btn.classList.toggle( 'sgs-whatsapp-cta--visible', scrolled );
		} );
	};

	/* Initial check */
	toggleVisibility();

	/* Throttled scroll listener */
	let ticking = false;
	window.addEventListener(
		'scroll',
		() => {
			if ( ! ticking ) {
				requestAnimationFrame( () => {
					toggleVisibility();
					ticking = false;
				} );
				ticking = true;
			}
		},
		{ passive: true }
	);

	/* Step aside while an inline/banner/card CTA is on screen. */
	const stepAsideBtns = Array.from( floatingBtns ).filter(
		( btn ) => btn.dataset.sgsWaHideNearInline !== undefined
	);
	const inlineCtas = document.querySelectorAll(
		'.wp-block-sgs-whatsapp-cta:not(.sgs-whatsapp-cta--floating)'
	);

	if (
		stepAsideBtns.length &&
		inlineCtas.length &&
		'IntersectionObserver' in window
	) {
		const setSteppedAside = ( steppedAside ) => {
			stepAsideBtns.forEach( ( btn ) => {
				btn.classList.toggle(
					'sgs-whatsapp-cta--stepped-aside',
					steppedAside
				);
				/* Stepped aside: out of the tab order and a11y tree, same as
				 * the below-threshold hidden state above. */
				if ( steppedAside ) {
					btn.setAttribute( 'inert', '' );
				} else {
					btn.removeAttribute( 'inert' );
				}
			} );
		};

		const visibleInlineCtas = new Set();
		const observer = new IntersectionObserver( ( entries ) => {
			entries.forEach( ( entry ) => {
				if ( entry.isIntersecting ) {
					visibleInlineCtas.add( entry.target );
				} else {
					visibleInlineCtas.delete( entry.target );
				}
			} );
			setSteppedAside( visibleInlineCtas.size > 0 );
		} );

		inlineCtas.forEach( ( cta ) => observer.observe( cta ) );
	}
}
