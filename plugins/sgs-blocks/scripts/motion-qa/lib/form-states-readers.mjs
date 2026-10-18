/**
 * Page actions and reads for `probe-motion-form-states.mjs`: animation tagging, the shake and slide readers.
 *
 * @package
 */

import { FORM } from './form-states-judges.mjs';

/** Number every animation the page creates, so two samples can be told apart. */
export const TAG_ANIMATIONS = () => {
	let next = 0;
	window.__sgsAnimId = new WeakMap();
	window.__sgsIdOf = ( a ) => {
		if ( ! window.__sgsAnimId.has( a ) ) {
			window.__sgsAnimId.set( a, ++next );
		}
		return window.__sgsAnimId.get( a );
	};
};

/**
 * The shake now running on the form's `invalid` keyframes target, or a null sample.
 * @param page
 */
export async function readShake( page ) {
	return page.evaluate( ( sel ) => {
		const root = document.querySelector( sel );
		const target =
			root &&
			[
				...root.querySelectorAll(
					'[data-sgs-me~="state"][data-sgs-me-keyframes]'
				),
				root,
			].find(
				( el ) =>
					el.matches( '[data-sgs-me-keyframes]' ) &&
					'invalid' ===
						getComputedStyle( el )
							.getPropertyValue( '--sgs-mt-kf' )
							.trim()
			);
		if ( ! target ) {
			return { found: false, id: null, duration: 0, tx: [], count: 0 };
		}
		const runs = target
			.getAnimations()
			.filter(
				( a ) =>
					a.effect &&
					a.effect.getKeyframes().some( ( k ) => '--sgs-me-tx' in k )
			);
		const run = runs[ runs.length - 1 ];
		return {
			found: true,
			count: runs.length,
			id: run ? window.__sgsIdOf( run ) : null,
			duration: run ? Number( run.effect.getTiming().duration ) : 0,
			tx: run
				? run.effect.getKeyframes().map( ( k ) => k[ '--sgs-me-tx' ] )
				: [],
			styled: target.hasAttribute( 'style' ),
		};
	}, FORM );
}

/**
 * The translate a running state slide under the root computes at its start. The run is paused at 0, read and then
 * cancelled: resuming it with play() leaves it under script control, and Chromium then keeps it alive beside the next
 * step's animation, so the next reading would be wrong. The curve is the element's animation-timing-function (a CSS
 * animation's effect timing reports linear; the curve applies per keyframe), read at the running animation's slot in the list.
 * @param page
 * @param rootSel
 */
export async function readSlide( page, rootSel ) {
	return page.evaluate( ( sel ) => {
		const root = document.querySelector( sel );
		const targets = root
			? [
					root,
					...root.querySelectorAll( '[data-sgs-me~="state"]' ),
			  ].filter( ( el ) => el.matches( '[data-sgs-me~="state"]' ) )
			: [];
		for ( const el of targets ) {
			const run = el
				.getAnimations()
				.find( ( a ) =>
					/^(sgs-me-translate|sgs-mt-translate-back)$/.test(
						a.animationName || ''
					)
				);
			if ( ! run ) {
				continue;
			}
			run.pause();
			run.currentTime = 0;
			const cs = getComputedStyle( el );
			const translate = cs.translate;
			// The element carries one entry per animation slot (eight, most of them `none`); the curve is the entry
			// at the running animation's own slot.
			const list = ( text ) => text.split( /,(?![^(]*\))/ ).map( ( part ) => part.trim() );
			const slot = Math.max( 0, list( cs.animationName ).indexOf( run.animationName ) );
			const easing = list( cs.animationTimingFunction )[ slot ] ?? '';
			const duration = Number( run.effect.getTiming().duration );
			const name = run.animationName;
			run.cancel();
			return {
				translate,
				duration,
				easing,
				name,
				styled: el.hasAttribute( 'style' ),
			};
		}
		return {
			translate: null,
			duration: 0,
			easing: '',
			name: null,
			styled: false,
		};
	}, rootSel );
}

/**
 * Fill the first step's required fields with harmless values, so Continue is accepted.
 * @param page
 */
