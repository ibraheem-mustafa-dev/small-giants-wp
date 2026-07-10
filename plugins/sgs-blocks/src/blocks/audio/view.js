/**
 * SGS Audio — frontend player + Web Audio visualisers (viewScriptModule, vanilla ES module).
 *
 * Progressive enhancement: render.php server-renders a native <audio controls> inside
 * `.sgs-audio`. With no JavaScript that native player works. This module UPGRADES each
 * instance to its `playerStyle`: a custom accessible transport + (for the reactive styles)
 * a Web Audio `AnalyserNode` that reacts to the REAL audio.
 *
 * Styles: minimal | waveform | spectrum | radial | oscilloscope | gradient-pulse | hidden.
 * `hidden` is left as-is (native element plays; no visible player).
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

/** Build the shared analyser graph for one audio element (once). */
function buildGraph( audio ) {
	const ctx = audioCtx();
	if ( ! ctx ) {
		return null;
	}
	if ( audio._sgsGraph ) {
		return audio._sgsGraph;
	}
	try {
		const src = ctx.createMediaElementSource( audio );
		const analyser = ctx.createAnalyser();
		analyser.fftSize = 512;
		analyser.smoothingTimeConstant = 0.8;
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
function runReactive( root, audio, drawFn ) {
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
		buildGraph( audio );
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
		} );
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
		} );
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
		} );
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
		} );
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
