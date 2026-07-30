/**
 * Horizontal-panel travel probe — Spec 38 FR-38-8.
 *
 * WHAT IT ASSERTS
 * At the end of the pin, the LAST panel's left edge sits where the FIRST
 * panel's left edge sat before any travel (Bean's stated requirement, approved
 * 2026-07-30). Plus the reachability invariant: the last panel's right edge
 * must still be inside the host at that moment.
 *
 * WHY IT IS SHAPED THIS WAY — three traps this probe exists to avoid, each of
 * which has already produced a wrong answer on this defect:
 *
 *   1. `scroll-behavior: smooth` is set on <html> on this site. A probe that
 *      scrolls and samples two frames later reads a page still in flight, so
 *      every sample returns the same stale frame. A sweep taken that way
 *      reported "no travel at all" on an effect that demonstrably travels.
 *      This probe forces `scroll-behavior: auto` for the duration.
 *   2. The pin does NOT begin at translate 0. `resolveStart()` offsets the
 *      start by the sticky header's measured height, so by the time the
 *      pin-spacer's top reaches the viewport the tween has already moved.
 *      Anchoring "panel 1's start position" to the first sample therefore
 *      overstates the gap (it reported 225 when the true figure is 100).
 *      The reference is taken at translate x === 0, found explicitly.
 *   3. Asserting that the row MOVED, or that it moved FURTHER than before,
 *      passes while still being wrong by a fixed amount — which is how this
 *      defect survived earlier fixes. The assertion below is on the FINAL
 *      value against the REQUIRED value.
 *
 * USAGE — paste the exported body into a Playwright/CDP `evaluate` call, or
 * run via the runner in this directory. Returns a verdict object; `pass` is
 * the gate.
 *
 * @package SGS\Blocks
 */

/* eslint-env browser */

/**
 * Measure the horizontal panel's travel against its required travel.
 *
 * @param {number} tolerancePx Allowed deviation in px (default 4).
 * @return {Promise<Object>} Verdict object.
 */
export async function probeHorizontalPanel( tolerancePx = 4 ) {
	const html = document.documentElement;
	const previousBehaviour = html.style.scrollBehavior;
	html.style.scrollBehavior = 'auto';

	const restore = () => {
		html.style.scrollBehavior = previousBehaviour;
	};

	try {
		const host = document.querySelector( '[data-sgs-fx="horizontal-panel"]' );
		if ( ! host ) {
			return { pass: false, reason: 'NO_HOST', detail: 'No [data-sgs-fx="horizontal-panel"] on the page.' };
		}

		const marked = host.querySelector( ':scope > [data-sgs-fx-track]' );
		if ( ! marked ) {
			return { pass: false, reason: 'NO_TRACK_MARK', detail: 'Wrapper emitted no data-sgs-fx-track element.' };
		}
		const track = marked.querySelector( ':scope > .wp-block-sgs-container' ) || marked;

		// Same node filter the effect module uses — laid-out elements only.
		const panels = Array.from( track.children ).filter(
			( n ) => n.nodeType === 1 && ( n.offsetWidth > 0 || n.offsetParent !== null )
		);

		// NON-VACUOUS GUARD: `.every()` on an empty array returns true, and a
		// one-panel row would "pass" every geometric assertion trivially.
		if ( panels.length < 2 ) {
			return {
				pass: false,
				reason: 'VACUOUS',
				detail: `Only ${ panels.length } laid-out panel(s); the assertions below cannot fail and prove nothing.`,
			};
		}

		if ( panels[ 0 ].offsetParent !== panels[ panels.length - 1 ].offsetParent ) {
			return {
				pass: false,
				reason: 'OFFSETPARENT_MISMATCH',
				detail: 'First and last panel do not share an offsetParent; offsetLeft values are not comparable.',
			};
		}

		const spacer = host.closest( '.pin-spacer' );
		if ( ! spacer ) {
			return { pass: false, reason: 'NOT_PINNED', detail: 'No .pin-spacer — the effect did not engage.' };
		}

		const settle = async ( y ) => {
			window.scrollTo( 0, y );
			for ( let i = 0; i < 6; i++ ) {
				await new Promise( ( r ) => requestAnimationFrame( r ) );
			}
			await new Promise( ( r ) => setTimeout( r, 60 ) );
			for ( let i = 0; i < 4; i++ ) {
				await new Promise( ( r ) => requestAnimationFrame( r ) );
			}
		};

		const translateX = () =>
			new DOMMatrixReadOnly( getComputedStyle( track ).transform ).m41;

		const spacerTop = spacer.getBoundingClientRect().top + window.scrollY;
		const spacerHeight = spacer.offsetHeight;

		// --- Reference: panel 1's left edge at translate 0 --------------------
		// Walk BACK from the pin start until the transform is genuinely 0,
		// rather than assuming the first in-range sample is untranslated
		// (trap 2 above).
		let referenceLeft = null;
		for ( let back = 0; back <= 400; back += 50 ) {
			await settle( Math.max( 0, Math.round( spacerTop - back ) ) );
			if ( Math.abs( translateX() ) < 0.5 ) {
				referenceLeft = panels[ 0 ].getBoundingClientRect().left;
				break;
			}
		}
		if ( null === referenceLeft ) {
			return {
				pass: false,
				reason: 'NO_ZERO_REFERENCE',
				detail: 'Could not find a scroll position where the track transform is 0.',
			};
		}

		// --- End of pin -------------------------------------------------------
		await settle( Math.round( spacerTop + spacerHeight ) );
		const endLeft = panels[ panels.length - 1 ].getBoundingClientRect().left;
		const endRight = panels[ panels.length - 1 ].getBoundingClientRect().right;
		const observedTravel = Math.abs( translateX() );
		const hostRight = host.getBoundingClientRect().right;

		const landingError = endLeft - referenceLeft;
		const landsCorrectly = Math.abs( landingError ) <= tolerancePx;
		const reachable = endRight <= hostRight + 1;

		return {
			pass: landsCorrectly && reachable,
			landsCorrectly,
			reachable,
			panelCount: panels.length,
			requiredTravel: panels[ panels.length - 1 ].offsetLeft - panels[ 0 ].offsetLeft,
			observedTravel,
			panel1LeftAtZero: +referenceLeft.toFixed( 1 ),
			panel4LeftAtEnd: +endLeft.toFixed( 1 ),
			landingErrorPx: +landingError.toFixed( 1 ),
			panel4RightAtEnd: +endRight.toFixed( 1 ),
			hostRight: +hostRight.toFixed( 1 ),
			tolerancePx,
		};
	} finally {
		restore();
	}
}
