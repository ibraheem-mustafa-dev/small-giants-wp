/**
 * 3D Tilt on Hover Effect.
 *
 * Writes the cursor angle to two custom properties, `--sgs-tilt-x` and `--sgs-tilt-y`, on the tilted element.
 * The `.sgs-has-tilt-3d` rule in extensions.css composes the transform from them; this script never writes
 * `style.transform`. Reduced motion is read live: a change to the preference removes the listeners and the
 * written properties without a reload.
 *
 * @package SGS\Blocks
 */
( function () {
	const MAX_TILT_DEG = 6;
	const PROP_X = '--sgs-tilt-x';
	const PROP_Y = '--sgs-tilt-y';
	const QUERY = '(prefers-reduced-motion: reduce)';

	function init() {
		const tiltElements = document.querySelectorAll( '.sgs-has-tilt-3d' );
		if ( tiltElements.length === 0 ) {
			return;
		}

		const reducedQuery = typeof window.matchMedia === 'function' ? window.matchMedia( QUERY ) : null;
		const controllers = Array.from( tiltElements, bindTilt );

		const apply = () => {
			const reduced = reducedQuery !== null && reducedQuery.matches;
			controllers.forEach( ( controller ) => ( reduced ? controller.stop() : controller.start() ) );
		};

		apply();
		if ( reducedQuery !== null ) {
			if ( typeof reducedQuery.addEventListener === 'function' ) {
				reducedQuery.addEventListener( 'change', apply );
			} else if ( typeof reducedQuery.addListener === 'function' ) {
				reducedQuery.addListener( apply );
			}
		}
	}

	function bindTilt( el ) {
		let frameId = null;
		let running = false;

		const clear = () => {
			if ( frameId ) {
				cancelAnimationFrame( frameId );
				frameId = null;
			}
			el.style.removeProperty( PROP_X );
			el.style.removeProperty( PROP_Y );
		};

		const onMove = ( e ) => {
			if ( frameId ) {
				cancelAnimationFrame( frameId );
			}
			frameId = requestAnimationFrame( () => {
				frameId = null;
				const rect = el.getBoundingClientRect();
				const centerX = rect.width / 2;
				const centerY = rect.height / 2;
				if ( centerX === 0 || centerY === 0 ) {
					return;
				}
				const rotateY = ( ( e.clientX - rect.left - centerX ) / centerX ) * MAX_TILT_DEG;
				const rotateX = -( ( e.clientY - rect.top - centerY ) / centerY ) * MAX_TILT_DEG;

				el.style.setProperty( PROP_X, rotateX.toFixed( 2 ) + 'deg' );
				el.style.setProperty( PROP_Y, rotateY.toFixed( 2 ) + 'deg' );
			} );
		};

		return {
			start() {
				if ( running ) {
					return;
				}
				running = true;
				el.addEventListener( 'mousemove', onMove );
				el.addEventListener( 'mouseleave', clear );
			},
			stop() {
				running = false;
				el.removeEventListener( 'mousemove', onMove );
				el.removeEventListener( 'mouseleave', clear );
				clear();
			},
		};
	}

	if ( document.readyState === 'loading' ) {
		document.addEventListener( 'DOMContentLoaded', init );
	} else {
		init();
	}
}() );
