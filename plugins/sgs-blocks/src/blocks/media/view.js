/**
 * SGS Media — branded video player chrome (viewScriptModule, vanilla ES module).
 *
 * Progressive enhancement: render.php SSRs a native `<video controls>` for direct
 * video files (MP4/WebM/internal). With no JavaScript that native player works. This
 * module replaces the native chrome with a branded control bar — centre play overlay,
 * hover-reveal bottom bar (play/pause, scrubber, timecode, mute + volume, fullscreen),
 * theme-tokened to the client's palette, fully keyboard-operable.
 *
 * YouTube/Vimeo embeds render as <iframe> and are left untouched (cross-origin chrome
 * cannot be skinned). Only direct `<video>` elements are enhanced.
 *
 * No jQuery. No dependencies.
 */

const reduceMotion = window.matchMedia && window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches;

const ICON = {
	play: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M8 5v14l11-7z" fill="currentColor"/></svg>',
	pause: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M7 5h4v14H7zM13 5h4v14h-4z" fill="currentColor"/></svg>',
	volume: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M16 8a4 4 0 010 8" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
	muted: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9v6h4l5 5V4L8 9H4z" fill="currentColor"/><path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" stroke-width="2"/></svg>',
	fsIn: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
	fsOut: '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" fill="none" stroke="currentColor" stroke-width="2"/></svg>',
};

function fmt( s ) {
	if ( ! isFinite( s ) || s < 0 ) {
		s = 0;
	}
	s = Math.floor( s );
	return Math.floor( s / 60 ) + ':' + String( s % 60 ).padStart( 2, '0' );
}
function el( tag, cls, html ) {
	const e = document.createElement( tag );
	if ( cls ) {
		e.className = cls;
	}
	if ( html != null ) {
		e.innerHTML = html;
	}
	return e;
}

function enhance( video ) {
	if ( video._sgsVideo || video.tagName !== 'VIDEO' ) {
		return;
	}
	video._sgsVideo = true;
	video.removeAttribute( 'controls' );
	video.setAttribute( 'playsinline', '' );

	// Wrap the video so the chrome can overlay it.
	const wrap = el( 'div', 'sgs-video' );
	video.parentNode.insertBefore( wrap, video );
	wrap.appendChild( video );

	// Centre play button (paused state).
	const centre = el( 'button', 'sgs-video__centre', ICON.play );
	centre.type = 'button';
	centre.setAttribute( 'aria-label', 'Play video' );
	wrap.appendChild( centre );

	// Bottom control bar.
	const bar = el( 'div', 'sgs-video__bar' );
	const playBtn = el( 'button', 'sgs-video__btn sgs-video__play', ICON.play );
	playBtn.type = 'button';
	playBtn.setAttribute( 'aria-label', 'Play' );
	playBtn.setAttribute( 'aria-pressed', 'false' );

	const scrub = el( 'input', 'sgs-video__scrub' );
	scrub.type = 'range';
	scrub.min = '0';
	scrub.max = '1000';
	scrub.value = '0';
	scrub.setAttribute( 'aria-label', 'Seek' );

	const time = el( 'span', 'sgs-video__time', '0:00 / 0:00' );

	const muteBtn = el( 'button', 'sgs-video__btn sgs-video__mute', ICON.volume );
	muteBtn.type = 'button';
	muteBtn.setAttribute( 'aria-label', 'Mute' );
	muteBtn.setAttribute( 'aria-pressed', 'false' );

	const vol = el( 'input', 'sgs-video__vol' );
	vol.type = 'range';
	vol.min = '0';
	vol.max = '100';
	vol.value = '100';
	vol.setAttribute( 'aria-label', 'Volume' );

	const fsBtn = el( 'button', 'sgs-video__btn sgs-video__fs', ICON.fsIn );
	fsBtn.type = 'button';
	fsBtn.setAttribute( 'aria-label', 'Full screen' );

	bar.append( playBtn, scrub, time, muteBtn, vol, fsBtn );
	wrap.appendChild( bar );

	// ---- wiring ----
	const setProgress = ( p ) => scrub.style.setProperty( '--sgs-progress', ( p * 100 ) + '%' );
	const togglePlay = () => ( video.paused ? video.play() : video.pause() );

	centre.addEventListener( 'click', togglePlay );
	playBtn.addEventListener( 'click', togglePlay );

	video.addEventListener( 'play', () => {
		playBtn.innerHTML = ICON.pause;
		playBtn.setAttribute( 'aria-label', 'Pause' );
		playBtn.setAttribute( 'aria-pressed', 'true' );
		centre.setAttribute( 'aria-label', 'Pause video' );
		wrap.classList.add( 'is-playing' );
	} );
	video.addEventListener( 'pause', () => {
		playBtn.innerHTML = ICON.play;
		playBtn.setAttribute( 'aria-label', 'Play' );
		playBtn.setAttribute( 'aria-pressed', 'false' );
		centre.setAttribute( 'aria-label', 'Play video' );
		wrap.classList.remove( 'is-playing' );
	} );

	let scrubbing = false;
	video.addEventListener( 'timeupdate', () => {
		if ( scrubbing || ! video.duration ) {
			return;
		}
		const p = video.currentTime / video.duration;
		scrub.value = String( Math.round( p * 1000 ) );
		setProgress( p );
		time.textContent = fmt( video.currentTime ) + ' / ' + fmt( video.duration );
	} );
	video.addEventListener( 'loadedmetadata', () => {
		time.textContent = fmt( video.currentTime ) + ' / ' + fmt( video.duration );
	} );
	scrub.addEventListener( 'input', () => {
		scrubbing = true;
		setProgress( scrub.value / 1000 );
	} );
	scrub.addEventListener( 'change', () => {
		if ( video.duration ) {
			video.currentTime = ( scrub.value / 1000 ) * video.duration;
		}
		scrubbing = false;
	} );

	const applyMuteIcon = () => {
		const off = video.muted || video.volume === 0;
		muteBtn.innerHTML = off ? ICON.muted : ICON.volume;
		muteBtn.setAttribute( 'aria-label', off ? 'Unmute' : 'Mute' );
		muteBtn.setAttribute( 'aria-pressed', off ? 'true' : 'false' );
	};
	muteBtn.addEventListener( 'click', () => {
		video.muted = ! video.muted;
		if ( ! video.muted && video.volume === 0 ) {
			video.volume = 1;
			vol.value = '100';
		}
	} );
	vol.addEventListener( 'input', () => {
		video.volume = vol.value / 100;
		video.muted = video.volume === 0;
	} );
	video.addEventListener( 'volumechange', () => {
		vol.value = String( Math.round( ( video.muted ? 0 : video.volume ) * 100 ) );
		applyMuteIcon();
	} );

	const inFs = () => document.fullscreenElement === wrap;
	fsBtn.addEventListener( 'click', () => {
		if ( inFs() ) {
			document.exitFullscreen && document.exitFullscreen();
		} else {
			wrap.requestFullscreen && wrap.requestFullscreen();
		}
	} );
	document.addEventListener( 'fullscreenchange', () => {
		const on = inFs();
		fsBtn.innerHTML = on ? ICON.fsOut : ICON.fsIn;
		fsBtn.setAttribute( 'aria-label', on ? 'Exit full screen' : 'Full screen' );
		wrap.classList.toggle( 'is-fullscreen', on );
	} );

	// Keyboard (when the player has focus): space/k play, arrows seek/volume, m, f.
	wrap.tabIndex = 0;
	wrap.setAttribute( 'role', 'group' );
	wrap.setAttribute( 'aria-label', video.getAttribute( 'aria-label' ) || 'Video player' );
	wrap.addEventListener( 'keydown', ( e ) => {
		// Only handle shortcuts when the WRAPPER itself has focus. When a child
		// control (range slider / button) has focus, let it handle its own keys —
		// otherwise arrow keys would both seek AND move the slider, and Space would
		// both click the button AND toggle play.
		if ( e.target !== wrap ) {
			return;
		}
		switch ( e.key ) {
			case ' ':
			case 'k':
				e.preventDefault();
				togglePlay();
				break;
			case 'ArrowLeft':
				e.preventDefault();
				video.currentTime = Math.max( 0, video.currentTime - 5 );
				break;
			case 'ArrowRight':
				e.preventDefault();
				video.currentTime = Math.min( video.duration || 0, video.currentTime + 5 );
				break;
			case 'ArrowUp':
				e.preventDefault();
				video.volume = Math.min( 1, video.volume + 0.1 );
				break;
			case 'ArrowDown':
				e.preventDefault();
				video.volume = Math.max( 0, video.volume - 0.1 );
				break;
			case 'm':
				video.muted = ! video.muted;
				break;
			case 'f':
				fsBtn.click();
				break;
			default:
				return;
		}
	} );

	applyMuteIcon();
	setProgress( 0 );
	if ( reduceMotion ) {
		wrap.classList.add( 'is-reduced-motion' );
	}
}

function init() {
	document.querySelectorAll( 'video.sgs-media__video' ).forEach( enhance );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
