/**
 * Lottie ADAPTER — the only file that touches `lottie-web` directly.
 *
 * `fx-lottie.js` (the boot module the motion registry enqueues) never calls
 * `lottie-web`'s own API — it calls this adapter's `init`/`play`/`pause`/
 * `seek`/`destroy` instead. That means ThorVG (the sw-lite renderer named as
 * lottie-web's eventual replacement — design §4.2) is a ONE-FILE swap: a
 * future adapter with the same five-function shape, no change needed in
 * `fx-lottie.js` or anywhere else.
 *
 * @package SGS\Blocks
 */

/**
 * @typedef {Object} SgsLottieInstance
 * @property {Function} play    Resume playback.
 * @property {Function} pause   Pause playback.
 * @property {Function} seek    (progress:number) => void — 0..1 of total frames.
 * @property {Function} destroy Tear down the player and detach it from the DOM.
 * @property {Function} getDuration (inFrames?:boolean) => number.
 * @property {Function} setSpeed (speed:number) => void.
 * @property {Function} setLoop  (loop:boolean) => void.
 */

/**
 * Create a player instance bound to a container element.
 *
 * Dynamically imports `@sgs/lottie-web` (the vendor shim,
 * `src/vendor-modules/lottie-light.js`) — this import only resolves once
 * this function is actually called, which `fx-lottie.js` only does after
 * its own reduced-motion gate has already passed, so the player bytes never
 * load for a reduced-motion visitor.
 *
 * @param {Object}  options
 * @param {Element} options.container    Element the SVG is rendered into.
 * @param {Object}  options.animationData Parsed Lottie JSON.
 * @param {boolean} [options.loop]       Whether playback loops. Default false.
 * @param {number}  [options.speed]      Playback speed, 0.25–3. Default 1.
 * @return {Promise<SgsLottieInstance>} The player instance.
 */
export async function init( { container, animationData, loop = false, speed = 1 } ) {
	const { default: lottie } = await import(
		/* webpackChunkName: "lottie-web" */ '@sgs/lottie-web'
	);

	const player = lottie.loadAnimation( {
		container,
		renderer: 'svg',
		loop: !! loop,
		autoplay: false,
		animationData,
		rendererSettings: {
			progressiveLoad: false,
			preserveAspectRatio: 'xMidYMid meet',
		},
	} );

	player.setSpeed( clampSpeed( speed ) );

	// The injected <svg> is always decorative — the accessible name (or its
	// deliberate absence) lives on the wrapper `sgs_render_lottie()` already
	// rendered, never on the player's own markup.
	const svg = container.querySelector( 'svg' );
	if ( svg ) {
		svg.setAttribute( 'aria-hidden', 'true' );
		svg.setAttribute( 'focusable', 'false' );
	}

	return {
		play: () => player.play(),
		pause: () => player.pause(),
		seek: ( progress ) => {
			const total = player.totalFrames || 0;
			player.goToAndStop( clamp01( progress ) * total, true );
		},
		destroy: () => player.destroy(),
		getDuration: ( inFrames = false ) => player.getDuration( inFrames ),
		setSpeed: ( value ) => player.setSpeed( clampSpeed( value ) ),
		setLoop: ( value ) => {
			player.loop = !! value;
		},
	};
}

/**
 * @param {number} value Raw speed.
 * @return {number} Clamped to the atom's 0.25–3 range.
 */
function clampSpeed( value ) {
	const num = Number( value );
	if ( ! Number.isFinite( num ) ) {
		return 1;
	}
	return Math.min( 3, Math.max( 0.25, num ) );
}

/**
 * @param {number} value Raw progress.
 * @return {number} Clamped to 0..1.
 */
function clamp01( value ) {
	const num = Number( value );
	if ( ! Number.isFinite( num ) ) {
		return 0;
	}
	return Math.min( 1, Math.max( 0, num ) );
}
