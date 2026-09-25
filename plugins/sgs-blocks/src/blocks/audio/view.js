/**
 * SGS Audio — frontend player + Web Audio visualisers (viewScriptModule, vanilla ES module).
 *
 * Progressive enhancement: render.php server-renders a native <audio controls> inside
 * `.sgs-audio`. With no JavaScript that native player works. This module UPGRADES each
 * instance to its `playerStyle`: a custom accessible transport + (for the reactive styles)
 * a Web Audio `AnalyserNode` that reacts to the REAL audio.
 *
 * Styles: minimal | waveform | spectrum | radial | oscilloscope | gradient-pulse | hidden | toggle.
 * `hidden` is left as-is (native element plays; no visible player).
 * `toggle` builds a compact sound on/off `<button class="sgs-audio__toggle">`
 * that plays/pauses THIS track and, via `localStorage['sgs-sound']`, mutes or
 * unmutes every OTHER `<audio>`/`<video>` on the page — see enhance()'s
 * `toggle` branch for the full contract.
 *
 * Web Audio notes:
 *  - `createMediaElementSource` may be called only ONCE per element (guarded) and routes
 *    the audio THROUGH the graph — so the analyser is connected to the destination.
 *  - The context is created on the first play gesture (autoplay-policy safe).
 *  - Cross-origin audio without CORS headers taints the analyser (silent data); the audio
 *    still plays and the non-reactive parts still work — the visualiser just idles.
 *  - `prefers-reduced-motion` freezes the reactive draw to a single static frame.
 *
 * No jQuery. No dependencies.
 */

const REACTIVE = new Set( [ 'spectrum', 'oscilloscope', 'gradient-pulse', 'radial' ] );
const reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

/**
 * A 0-100 "Reactivity" slider value → AnalyserNode params. 50 reproduces the
 * exact values this block shipped with before the control existed (512 / 0.8),
 * so any existing published instance (no `data-reactive-sensitivity`, or an
 * unparseable value) renders byte-identically to before.
 *
 * `fftSize` must be a power of 2 (Web Audio API constraint) so it's stepped
 * in thirds rather than continuous; `smoothingTimeConstant` (the dominant
 * "feel" — higher = calmer, lower = snappier) is a straight linear map, which
 * is what makes the slider actually feel continuous while dragging.
 */
function sensitivityParams( raw ) {
	let v = parseFloat( raw );
	if ( ! isFinite( v ) ) {
		v = 50;
	}
	v = Math.max( 0, Math.min( 100, v ) );
	const fftSize = v < 34 ? 256 : v <= 66 ? 512 : 1024;
	const smoothing = 0.95 - ( v / 100 ) * 0.3;
	return { fftSize, smoothing };
}

let sharedCtx = null;
function audioCtx() {
	const AC = window.AudioContext || window.webkitAudioContext;
	if ( ! sharedCtx && AC ) {
		sharedCtx = new AC();
	}
	return sharedCtx;
}

function fmt( s ) {
	if ( ! isFinite( s ) || s < 0 ) {
		s = 0;
	}
	s = Math.floor( s );
	return Math.floor( s / 60 ) + ':' + String( s % 60 ).padStart( 2, '0' );
}
function cvar( el, name, fallback ) {
	const v = getComputedStyle( el ).getPropertyValue( name ).trim();
	return v || fallback;
}
/**
 * Resolve a CSS custom property to a CONCRETE colour (rgb) the canvas can paint.
 * The property may hold a `var(--wp--preset--color--…)` reference which
 * getComputedStyle does NOT resolve on the property itself — so probe via `color`.
 */
function resolveColour( root, name, fallback ) {
	const probe = document.createElement( 'span' );
	probe.style.cssText = 'position:absolute;width:0;height:0;color:var(' + name + ', ' + fallback + ')';
	root.appendChild( probe );
	const c = getComputedStyle( probe ).color || fallback;
	probe.remove();
	return c;
}

const ICON_PLAY = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>';
const ICON_PAUSE = '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>';
const ICON_TOGGLE_BARS = '<span class="sgs-audio__toggle-bar"></span><span class="sgs-audio__toggle-bar"></span><span class="sgs-audio__toggle-bar"></span>';
const ICON_SPEAKER_ON = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M16.5 12c0-1.77-.77-3.29-2-4.24v8.48c1.23-.95 2-2.47 2-4.24z" fill="currentColor"/><path d="M14.5 4.6v2.09c2.89 1.02 5 3.77 5 7.31s-2.11 6.29-5 7.31v2.09c4.01-1.06 7-4.7 7-9.4s-2.99-8.34-7-9.4z" fill="currentColor"/></svg>';
const ICON_SPEAKER_OFF = '<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M19.5 5.5 18.44 4.44 4.44 18.44 5.5 19.5l3.2-3.2L14 21V13.7l3.83 3.83c-.44.37-.94.68-1.5.92v2.1c1.03-.32 1.96-.86 2.75-1.56L21.5 21.5l1.06-1.06L19.5 17.4V5.5Zm-1.83 1.83L15.83 9.17c.42.7.67 1.5.67 2.33 0 .34-.05.67-.13.98l1.5 1.5c.29-.75.46-1.6.46-2.48 0-2.07-.94-3.93-2.66-5.17Z" fill="currentColor"/></svg>';

/** Build the shared analyser graph for one audio element (once). */
function buildGraph( audio, sensitivity ) {
	const ctx = audioCtx();
	if ( ! ctx ) {
		return null;
	}
	if ( audio._sgsGraph ) {
		return audio._sgsGraph;
	}
	try {
		const params = sensitivityParams( sensitivity );
		const src = ctx.createMediaElementSource( audio );
		const analyser = ctx.createAnalyser();
		analyser.fftSize = params.fftSize;
		analyser.smoothingTimeConstant = params.smoothing;
		src.connect( analyser );
		analyser.connect( ctx.destination );
		audio._sgsGraph = {
			analyser,
			freq: new Uint8Array( analyser.frequencyBinCount ),
			time: new Uint8Array( analyser.fftSize ),
		};
		return audio._sgsGraph;
	} catch ( e ) {
		// createMediaElementSource can throw if already created or CORS-blocked.
		return null;
	}
}

/** A play/pause <button> wired to the audio element. */
function makePlayButton( audio, label ) {
	const b = document.createElement( 'button' );
	b.type = 'button';
	b.className = 'sgs-audio__play';
	b.setAttribute( 'aria-label', 'Play ' + label );
	b.setAttribute( 'aria-pressed', 'false' );
	b.innerHTML = ICON_PLAY;
	b.addEventListener( 'click', () => {
		if ( audio.paused ) {
			const ctx = audioCtx();
			if ( ctx && ctx.state === 'suspended' ) {
				ctx.resume();
			}
			audio.play();
		} else {
			audio.pause();
		}
	} );
	audio.addEventListener( 'play', () => {
		b.innerHTML = ICON_PAUSE;
		b.setAttribute( 'aria-pressed', 'true' );
		b.setAttribute( 'aria-label', 'Pause ' + label );
	} );
	audio.addEventListener( 'pause', () => {
		b.innerHTML = ICON_PLAY;
		b.setAttribute( 'aria-pressed', 'false' );
		b.setAttribute( 'aria-label', 'Play ' + label );
	} );
	return b;
}

/** A tabular timecode element that updates as the audio plays. */
function makeTime( audio ) {
	const t = document.createElement( 'span' );
	t.className = 'sgs-audio__time';
	const paint = () => {
		t.textContent = fmt( audio.currentTime ) + ' / ' + fmt( audio.duration );
	};
	audio.addEventListener( 'timeupdate', paint );
	audio.addEventListener( 'loadedmetadata', paint );
	paint();
	return t;
}

/** An accessible range slider for seeking. */
function makeSeek( audio, cls ) {
	const r = document.createElement( 'input' );
	r.type = 'range';
	r.className = cls;
	r.min = '0';
	r.max = '1000';
	r.value = '0';
	r.setAttribute( 'aria-label', 'Seek' );
	let seeking = false;
	r.addEventListener( 'input', () => {
		seeking = true;
		if ( audio.duration ) {
			r.style.setProperty( '--sgs-progress', ( r.value / 10 ) + '%' );
		}
	} );
	r.addEventListener( 'change', () => {
		if ( audio.duration ) {
			audio.currentTime = ( r.value / 1000 ) * audio.duration;
		}
		seeking = false;
	} );
	audio.addEventListener( 'timeupdate', () => {
		if ( seeking || ! audio.duration ) {
			return;
		}
		const p = audio.currentTime / audio.duration;
		r.value = String( Math.round( p * 1000 ) );
		r.style.setProperty( '--sgs-progress', ( p * 100 ) + '%' );
	} );
	return r;
}

/**
 * Reactive RAF loop — runs ONLY while (a) playing, (b) not reduced-motion, and
 * (c) the block is on-screen (IntersectionObserver). This keeps an off-screen or
 * paused player at zero CPU — the visualiser costs nothing when it isn't seen.
 */
function runReactive( root, audio, drawFn, sensitivity ) {
	let raf = 0;
	let onScreen = true;
	const running = () => ! audio.paused && ! reduceMotion && onScreen;
	const loop = () => {
		const g = audio._sgsGraph;
		if ( g ) {
			g.analyser.getByteFrequencyData( g.freq );
			g.analyser.getByteTimeDomainData( g.time );
			let sum = 0;
			for ( let i = 0; i < g.freq.length; i++ ) {
				sum += g.freq[ i ];
			}
			drawFn( g.freq, g.time, sum / g.freq.length / 255 );
		}
		raf = running() ? requestAnimationFrame( loop ) : 0;
	};
	const start = () => {
		buildGraph( audio, sensitivity );
		if ( ! raf && running() ) {
			loop();
		}
	};
	audio.addEventListener( 'play', start, { passive: true } );
	audio.addEventListener( 'pause', () => {
		cancelAnimationFrame( raf );
		raf = 0;
	}, { passive: true } );
	if ( 'IntersectionObserver' in window ) {
		new IntersectionObserver( ( entries ) => {
			onScreen = entries[ 0 ].isIntersecting;
			if ( onScreen ) {
				start();
			} else {
				cancelAnimationFrame( raf );
				raf = 0;
			}
		}, { threshold: 0 } ).observe( root );
	}
	// one static frame at rest (also the reduced-motion representation)
	drawFn( null, null, 0 );
}

function fitCanvas( cv ) {
	const dpr = Math.min( 2, window.devicePixelRatio || 1 );
	cv.width = cv.clientWidth * dpr;
	cv.height = cv.clientHeight * dpr;
	return dpr;
}

function enhance( root ) {
	const style = root.getAttribute( 'data-player-style' ) || 'minimal';
	const sensitivity = root.getAttribute( 'data-reactive-sensitivity' ) || '50';
	const audio = root.querySelector( '.sgs-audio__native' );
	const viz = root.querySelector( '.sgs-audio__viz' );
	if ( ! audio || style === 'hidden' ) {
		return;
	}
	root.classList.add( 'is-enhanced' );
	const label = audio.getAttribute( 'aria-label' ) || 'audio';
	// Concrete rgb for the canvas fills (var() references won't paint on canvas).
	const accent = resolveColour( root, '--sgs-audio-accent', '#c9821f' );
	const spectrum = resolveColour( root, '--sgs-audio-spectrum', '#1c9a93' );
	if ( ! viz ) {
		return;
	}

	const play = makePlayButton( audio, label );
	const time = makeTime( audio );

	if ( style === 'minimal' ) {
		const seek = makeSeek( audio, 'sgs-audio__seek' );
		viz.append( play, seek, time );
		return;
	}

	if ( style === 'toggle' ) {
		const toggleLabel = root.getAttribute( 'data-toggle-label' ) || 'Sound';
		const toggleIcon = root.getAttribute( 'data-toggle-icon' ) === 'speaker' ? 'speaker' : 'bars';

		const btn = document.createElement( 'button' );
		btn.type = 'button';
		btn.className = 'sgs-audio__toggle';
		btn.setAttribute( 'aria-pressed', 'false' );
		btn.setAttribute( 'aria-label', toggleLabel );

		const iconWrap = document.createElement( 'span' );
		iconWrap.className = 'sgs-audio__toggle-icon';
		iconWrap.setAttribute( 'aria-hidden', 'true' );
		iconWrap.innerHTML = toggleIcon === 'speaker' ? ICON_SPEAKER_OFF : ICON_TOGGLE_BARS;

		const labelSpan = document.createElement( 'span' );
		labelSpan.className = 'sgs-audio__toggle-label';
		labelSpan.textContent = toggleLabel;

		btn.append( iconWrap, labelSpan );
		viz.append( btn );

		// Mute/unmute every OTHER <audio>/<video> on the page (never this
		// block's own element) — the toggle is a page-wide "sound" switch,
		// not just a transport for its own track.
		const setOthersMuted = ( muted ) => {
			document.querySelectorAll( 'audio, video' ).forEach( ( el ) => {
				if ( el !== audio ) {
					el.muted = muted;
				}
			} );
		};

		const syncPressed = ( playing ) => {
			btn.setAttribute( 'aria-pressed', playing ? 'true' : 'false' );
			if ( toggleIcon === 'speaker' ) {
				iconWrap.innerHTML = playing ? ICON_SPEAKER_ON : ICON_SPEAKER_OFF;
			}
		};

		btn.addEventListener( 'click', () => {
			if ( audio.paused ) {
				const ctx = audioCtx();
				if ( ctx && ctx.state === 'suspended' ) {
					ctx.resume();
				}
				audio.play();
			} else {
				audio.pause();
			}
		} );

		audio.addEventListener( 'play', () => {
			syncPressed( true );
			try {
				window.localStorage.setItem( 'sgs-sound', 'on' );
			} catch ( e ) {
				// Storage blocked (private mode / disabled) — state just won't persist.
			}
			setOthersMuted( false );
			window.dispatchEvent( new CustomEvent( 'sgs-sound-change', { detail: { on: true } } ) );
		} );
		audio.addEventListener( 'pause', () => {
			syncPressed( false );
			try {
				window.localStorage.setItem( 'sgs-sound', 'off' );
			} catch ( e ) {
				// Storage blocked (private mode / disabled) — state just won't persist.
			}
			setOthersMuted( true );
			window.dispatchEvent( new CustomEvent( 'sgs-sound-change', { detail: { on: false } } ) );
		} );

		// Init: NEVER autoplay (render.php also forces audioAutoplay off for
		// this style) — this track stays paused until pressed. The stored
		// global preference only decides the mute state applied to every
		// OTHER media element already on the page at this point.
		let storedOn = false;
		try {
			storedOn = window.localStorage.getItem( 'sgs-sound' ) === 'on';
		} catch ( e ) {
			// Storage blocked — default to muted-others (safe: no surprise sound).
		}
		setOthersMuted( ! storedOn );
		syncPressed( false );

		if ( toggleIcon === 'bars' ) {
			// Bars animate only while playing — runReactive() itself gates on
			// playing / reduced-motion / on-screen, and paints one static
			// frame at rest (also the reduced-motion representation).
			const bars = Array.from( iconWrap.querySelectorAll( '.sgs-audio__toggle-bar' ) );
			runReactive( root, audio, ( freq ) => {
				bars.forEach( ( bar, i ) => {
					const v = freq ? freq[ i * 4 ] / 255 : 0.15;
					bar.style.setProperty( '--sgs-bar-scale', String( Math.max( 0.15, v ) ) );
				} );
			}, sensitivity );
		}
		return;
	}

	if ( style === 'waveform' ) {
		const cv = document.createElement( 'canvas' );
		cv.className = 'sgs-audio__wave-canvas';
		viz.append( play, cv, time );
		const peaks = Array.from( { length: 72 }, ( _, i ) => 0.22 + 0.78 * Math.abs( Math.sin( i * 0.5 ) * Math.cos( i * 0.17 ) + 0.3 * Math.sin( i * 1.3 ) ) );
		const track = resolveColour( root, '--sgs-audio-track', '#e2dcd2' );
		let dpr = fitCanvas( cv ); // fit only on resize — NOT every frame (canvas resize clears + reallocates).
		const paint = () => {
			const c = cv.getContext( '2d' );
			const W = cv.clientWidth, H = cv.clientHeight;
			c.setTransform( dpr, 0, 0, dpr, 0, 0 );
			c.clearRect( 0, 0, W, H );
			const prog = audio.duration ? audio.currentTime / audio.duration : 0;
			const bw = W / peaks.length;
			peaks.forEach( ( pk, i ) => {
				const h = pk * H * 0.9, x = i * bw, y = ( H - h ) / 2;
				c.fillStyle = ( i / peaks.length <= prog ) ? accent : track;
				c.beginPath();
				c.roundRect( x + bw * 0.15, y, bw * 0.7, h, 1.5 );
				c.fill();
			} );
		};
		cv.addEventListener( 'click', ( e ) => {
			if ( audio.duration ) {
				audio.currentTime = ( e.offsetX / cv.clientWidth ) * audio.duration;
			}
		} );
		new ResizeObserver( () => { dpr = fitCanvas( cv ); paint(); } ).observe( cv );
		audio.addEventListener( 'timeupdate', paint, { passive: true } );
		requestAnimationFrame( paint );
		return;
	}

	if ( style === 'radial' ) {
		viz.classList.add( 'sgs-audio__viz--radial' );
		const ring = document.createElement( 'div' );
		ring.className = 'sgs-audio__ring';
		// Static markup only — colours come from CSS custom properties (no interpolation).
		ring.innerHTML =
			'<span class="sgs-audio__glow" aria-hidden="true"></span>' +
			'<svg viewBox="0 0 92 92" aria-hidden="true" focusable="false"><circle cx="46" cy="46" r="40" fill="none" stroke="var(--sgs-audio-track, #e2dcd2)" stroke-width="5"/>' +
			'<circle class="sgs-audio__arc" cx="46" cy="46" r="40" fill="none" stroke="var(--sgs-audio-accent, #c9821f)" stroke-width="5" stroke-linecap="round"/></svg>';
		ring.appendChild( play );
		const meta = document.createElement( 'div' );
		meta.className = 'sgs-audio__radial-meta';
		meta.append( time );
		viz.append( ring, meta );
		const arc = ring.querySelector( '.sgs-audio__arc' );
		const glow = ring.querySelector( '.sgs-audio__glow' );
		const C = 2 * Math.PI * 40;
		// Progress ring — write CSS custom-property VALUES, never raw properties
		// (no-inline contract: a --var write is allowed, a direct .style.strokeDasharray
		// write is a forbidden inline property declaration). Consumed by the
		// `.sgs-audio__arc` stylesheet rule in style.css.
		arc.style.setProperty( '--sgs-arc-dash', String( C ) );
		arc.style.setProperty( '--sgs-arc-offset', String( C ) );
		audio.addEventListener( 'timeupdate', () => {
			const p = audio.duration ? audio.currentTime / audio.duration : 0;
			arc.style.setProperty( '--sgs-arc-offset', String( C * ( 1 - p ) ) );
		} );
		runReactive( root, audio, ( f, t, level ) => {
			glow.style.setProperty( '--sgs-glow-opacity', String( Math.min( 1, level * 2.2 ) ) );
			glow.style.setProperty( '--sgs-glow-scale', String( 1 + level * 0.5 ) );
		}, sensitivity );
		return;
	}

	// spectrum | oscilloscope | gradient-pulse — a transport row + a canvas/body.
	const transport = document.createElement( 'div' );
	transport.className = 'sgs-audio__transport';
	transport.append( play, time );

	if ( style === 'gradient-pulse' ) {
		viz.classList.add( 'sgs-audio__viz--pulse' );
		viz.append( transport );
		runReactive( root, audio, ( freq, t, level ) => {
			if ( ! freq ) {
				// Quiet: remove the override so the CSS default (color-mix background,
				// style.css `.sgs-audio__viz--pulse`) shows through — never a raw
				// `.style.background` write (no-inline contract).
				viz.style.removeProperty( '--sgs-viz-bg' );
				return;
			}
			let lo = 0, hi = 0;
			for ( let i = 0; i < freq.length; i++ ) {
				( i < freq.length / 3 ? ( lo += freq[ i ] ) : ( hi += freq[ i ] ) );
			}
			const bias = hi / ( lo + hi + 1 );
			const hue = 190 - bias * 150;
			const light = 24 + level * 44;
			const sat = 55 + level * 20;
			viz.style.setProperty(
				'--sgs-viz-bg',
				'linear-gradient(135deg, hsl(' + hue + ' ' + sat + '% ' + light + '%), hsl(' + ( hue + 24 ) + ' ' + sat + '% ' + Math.max( 14, light - 14 ) + '%))'
			);
		}, sensitivity );
		return;
	}

	const cv = document.createElement( 'canvas' );
	cv.className = style === 'spectrum' ? 'sgs-audio__spectrum-canvas' : 'sgs-audio__scope-canvas';
	viz.append( transport, cv );

	if ( style === 'spectrum' ) {
		let dpr = fitCanvas( cv );
		new ResizeObserver( () => ( dpr = fitCanvas( cv ) ) ).observe( cv );
		runReactive( root, audio, ( freq ) => {
			const c = cv.getContext( '2d' );
			const W = cv.clientWidth, H = cv.clientHeight;
			c.setTransform( dpr, 0, 0, dpr, 0, 0 );
			c.clearRect( 0, 0, W, H );
			const N = 32, bw = W / N;
			for ( let i = 0; i < N; i++ ) {
				const v = freq ? freq[ i * 2 ] / 255 : 0.02;
				const h = Math.max( 2, v * H * 0.94 ), x = i * bw, y = H - h;
				const grad = c.createLinearGradient( 0, H, 0, y );
				grad.addColorStop( 0, spectrum );
				grad.addColorStop( 1, accent );
				c.fillStyle = grad;
				c.beginPath();
				c.roundRect( x + bw * 0.18, y, bw * 0.64, h, 3 );
				c.fill();
			}
		}, sensitivity );
	} else {
		let dpr = fitCanvas( cv );
		new ResizeObserver( () => ( dpr = fitCanvas( cv ) ) ).observe( cv );
		runReactive( root, audio, ( f, time2 ) => {
			const c = cv.getContext( '2d' );
			const W = cv.clientWidth, H = cv.clientHeight;
			c.setTransform( dpr, 0, 0, dpr, 0, 0 );
			c.clearRect( 0, 0, W, H );
			c.lineWidth = 2.2;
			c.strokeStyle = spectrum;
			c.shadowBlur = 8;
			c.shadowColor = spectrum;
			c.beginPath();
			if ( time2 ) {
				const step = W / time2.length;
				for ( let i = 0; i < time2.length; i++ ) {
					const v = time2[ i ] / 128 - 1, x = i * step, y = H / 2 + v * H * 0.42;
					i === 0 ? c.moveTo( x, y ) : c.lineTo( x, y );
				}
			} else {
				c.moveTo( 0, H / 2 );
				c.lineTo( W, H / 2 );
			}
			c.stroke();
			c.shadowBlur = 0;
		}, sensitivity );
	}
}

function init() {
	document.querySelectorAll( '.sgs-audio' ).forEach( ( root ) => {
		if ( ! root._sgsInit ) {
			root._sgsInit = true;
			enhance( root );
		}
	} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
