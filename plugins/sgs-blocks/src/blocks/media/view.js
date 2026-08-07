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

// The locked SGS device standard: mobile < 768, tablet 768-1023,
// desktop >= 1024 (same constants as `src/blocks/container/view.js`).
// Block-local copy — see BooleanResponsiveControl.js's docblock for why this
// session keeps everything self-contained inside sgs/media's own directory
// rather than reaching for a new shared module (identical copy lives at
// `src/blocks/before-after/view.js`).
const SGS_TIER_MOBILE_BREAKPOINT = 768;
const SGS_TIER_TABLET_BREAKPOINT = 1024;

/**
 * The current device tier for the live viewport width.
 *
 * @return {'mobile'|'tablet'|'desktop'} Current tier.
 */
function getCurrentDeviceTier() {
	const width = window.innerWidth;
	if ( width < SGS_TIER_MOBILE_BREAKPOINT ) {
		return 'mobile';
	}
	if ( width < SGS_TIER_TABLET_BREAKPOINT ) {
		return 'tablet';
	}
	return 'desktop';
}

/**
 * Resolve one boolean per-device attribute family for the CURRENT viewport,
 * reading `data-{dataName}-tablet` / `data-{dataName}-mobile` overrides off
 * `el.dataset` (camelCased by the browser, e.g. `data-plays-inline-tablet`
 * -> `el.dataset.playsInlineTablet`). Falls back upward when a tier's own
 * override is absent — tablet inherits desktop, mobile inherits the resolved
 * tablet value — mirroring render.php's `sgs_media_resolve_tier_bool()`.
 *
 * @param {HTMLElement} node         Element carrying the data-* overrides.
 * @param {string}      dataName     camelCase data-attribute base (e.g. 'autoplay', 'playsInline').
 * @param {boolean}     desktopValue The SSR'd desktop value (read from the element's own real attribute/property by the caller).
 * @return {{tier: 'mobile'|'tablet'|'desktop', value: boolean}} Current tier + its effective value.
 */
function resolveTierBool( node, dataName, desktopValue ) {
	const tabletRaw = node.dataset[ `${ dataName }Tablet` ];
	const mobileRaw = node.dataset[ `${ dataName }Mobile` ];

	const tablet = tabletRaw !== undefined ? tabletRaw === '1' : desktopValue;
	const mobile = mobileRaw !== undefined ? mobileRaw === '1' : tablet;

	const tier = getCurrentDeviceTier();
	if ( tier === 'mobile' ) {
		return { tier, value: mobile };
	}
	if ( tier === 'tablet' ) {
		return { tier, value: tablet };
	}
	return { tier, value: desktopValue };
}

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

/**
 * Apply the CURRENT viewport's tier-resolved playback behaviour to one
 * enhanced video: loop / muted / plays-inline / lazy-load(preload) are
 * passive attribute/property writes; controls toggles the custom chrome's
 * visibility; autoplay drives an actual play()/pause() call, but ONLY when
 * the resolved tier has genuinely changed since the last call (mirrors
 * `sgs-container__video-bg--responsive`'s src-swap guard) — so a resize that
 * doesn't cross a breakpoint never fights a visitor's own play/pause click.
 *
 * MUTED + AUTOPLAY: browsers refuse to autoplay an unmuted video, so
 * whenever the resolved tier wants autoplay this forces the DOM PROPERTY
 * `video.muted = true` regardless of that tier's own muted setting — setting
 * only the `muted` ATTRIBUTE is not enough once the element already exists
 * in the DOM (the attribute merely seeds the initial property value; the
 * live property is what the playback engine actually reads, and toggling it
 * on an already-playing element behaves differently from toggling the
 * attribute). When the tier does not want autoplay, muted follows that
 * tier's own resolved value instead.
 *
 * @param {HTMLVideoElement} video The enhanced video element.
 * @param {HTMLElement}      wrap  The `.sgs-video` wrapper (for the controls-hide class).
 */
function applyTierPlayback( video, wrap ) {
	const baseLoop = video.hasAttribute( 'loop' );
	const baseMuted = video.hasAttribute( 'muted' );
	const baseControls = video._sgsControlsBase;
	const baseInline = video.hasAttribute( 'playsinline' );
	const baseLazy = 'none' === video.getAttribute( 'preload' );
	const baseAutoplay = video._sgsAutoplayBase;

	const loop = resolveTierBool( video, 'loop', baseLoop ).value;
	const controls = resolveTierBool( video, 'controls', baseControls ).value;
	const inline = resolveTierBool( video, 'playsInline', baseInline ).value;
	const lazy = resolveTierBool( video, 'lazy', baseLazy ).value;
	const { tier, value: autoplay } = resolveTierBool(
		video,
		'autoplay',
		baseAutoplay
	);

	video.loop = loop;
	video.toggleAttribute( 'playsinline', inline );
	// preload only affects loading behaviour BEFORE the browser has started
	// fetching — a best-effort hint on resize, not a guaranteed abort of
	// already-buffered data.
	video.preload = lazy ? 'none' : 'metadata';
	wrap.classList.toggle( 'sgs-video--no-controls', ! controls );

	if ( autoplay ) {
		video.muted = true;
	} else {
		video.muted = resolveTierBool( video, 'muted', baseMuted ).value;
	}

	// Only act on autoplay when the resolved TIER changed since last time —
	// avoids re-triggering play()/pause() on every resize event within the
	// same tier, which would fight a visitor's manual play/pause click.
	if ( video._sgsLastAutoplayTier !== tier ) {
		video._sgsLastAutoplayTier = tier;
		if ( autoplay ) {
			video.play().catch( () => {
				// Autoplay blocked by the browser (rare once muted, but
				// possible e.g. data-saver mode) — the play button below
				// remains fully functional.
			} );
		} else {
			video.pause();
		}
	}
}

function enhance( video ) {
	if ( video._sgsVideo || video.tagName !== 'VIDEO' ) {
		return;
	}
	video._sgsVideo = true;
	// Record the SSR'd desktop values BEFORE stripping them — the tier
	// resolver's desktop fallback needs them, and `controls`/`autoplay` are
	// about to be removed/never re-read as attributes below.
	video._sgsControlsBase = video.hasAttribute( 'controls' );
	video._sgsAutoplayBase = video.hasAttribute( 'autoplay' );
	video._sgsLastAutoplayTier = null;
	video.removeAttribute( 'controls' );

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

	// Initial tier-resolved playback behaviour, then track this wrap for the
	// shared resize listener below.
	applyTierPlayback( video, wrap );
	sgsEnhancedVideoWraps.push( { video, wrap } );
}

// One shared, debounced resize listener for every enhanced video on the page
// (mirrors the container block's responsive video-src swap) rather than one
// listener per instance.
const sgsEnhancedVideoWraps = [];
let sgsResizeTimer;
window.addEventListener( 'resize', function () {
	clearTimeout( sgsResizeTimer );
	sgsResizeTimer = setTimeout( function () {
		sgsEnhancedVideoWraps.forEach( ( { video, wrap } ) =>
			applyTierPlayback( video, wrap )
		);
		// Source tiers ride the SAME debounced listener — a rebuild is the most
		// expensive thing this file does, so it must never run per resize event.
		sgsTieredVideoNodes.forEach( applyTierSource );
	}, 200 );
} );

/**
 * Read the per-tier source spec off an element's dataset, with the same upward
 * fallback every other tier family in this codebase uses: mobile falls back to
 * tablet, tablet falls back to desktop.
 *
 * @param {HTMLElement} node Element carrying the data-src-* contract.
 * @param {'mobile'|'tablet'|'desktop'} tier Tier to resolve.
 * @return {{src: string, kind: string, type: string, poster: string}|null} Spec, or null when this block has no tiers.
 */
function resolveTierSource( node, tier ) {
	const d = node.dataset;
	if ( ! d.srcDesktop ) {
		return null;
	}
	const pick = ( base ) => {
		if ( tier === 'mobile' ) {
			return d[ `${ base }Mobile` ] || d[ `${ base }Tablet` ] || d[ `${ base }Desktop` ];
		}
		if ( tier === 'tablet' ) {
			return d[ `${ base }Tablet` ] || d[ `${ base }Desktop` ];
		}
		return d[ `${ base }Desktop` ];
	};
	return {
		src: pick( 'src' ) || '',
		kind: pick( 'srcKind' ) || 'file',
		type: pick( 'srcType' ) || '',
		poster: pick( 'poster' ) || '',
	};
}

/**
 * Build the element a tier's spec calls for — a <video> for a direct file, an
 * <iframe> for a YouTube/Vimeo embed.
 *
 * A tier may change the KIND as well as the URL (desktop MP4, mobile YouTube),
 * so the swap has to be able to replace the element, not just its src.
 *
 * @param {{src: string, kind: string, type: string, poster: string}} spec Resolved tier spec.
 * @param {HTMLElement} prev Element being replaced — its class/aria are carried over.
 * @return {HTMLElement} Freshly built node.
 */
function buildVideoNode( spec, prev ) {
	// The tier contract lives in data-* on the node itself, so EVERY rebuilt
	// node must carry it forward or the swap becomes one-way.
	//
	// ⚠ Found live, 2026-08-07: the iframe branch originally set only
	// `data-poster`, so the first desktop→mobile swap produced an iframe with no
	// data-src-* at all. resolveTierSource() then returned null forever and the
	// block was stuck on the mobile source even back at 1364px — a swap that
	// visibly "worked" once and was permanently broken after. Copying the
	// dataset is what makes it reversible.
	const carryDataset = ( node ) => {
		Object.keys( prev.dataset ).forEach( ( key ) => {
			node.dataset[ key ] = prev.dataset[ key ];
		} );
	};

	if ( spec.kind === 'youtube' || spec.kind === 'vimeo' ) {
		const frame = document.createElement( 'iframe' );
		frame.className = 'sgs-media__video';
		carryDataset( frame );
		frame.src = spec.src;
		frame.setAttribute( 'frameborder', '0' );
		frame.setAttribute( 'allowfullscreen', '' );
		frame.setAttribute(
			'allow',
			spec.kind === 'youtube'
				? 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
				: 'autoplay; fullscreen; picture-in-picture'
		);
		if ( spec.poster ) {
			frame.dataset.poster = spec.poster;
		}
		return frame;
	}

	const video = document.createElement( 'video' );
	video.className = 'sgs-media__video';
	// Carries the playback tier data-* too, so applyTierPlayback() still has its
	// contract on the new node.
	carryDataset( video );
	if ( spec.poster ) {
		video.poster = spec.poster;
	}
	const ariaLabel = prev.getAttribute( 'aria-label' );
	if ( ariaLabel ) {
		video.setAttribute( 'aria-label', ariaLabel );
	}
	const source = document.createElement( 'source' );
	source.src = spec.src;
	if ( spec.type ) {
		source.type = spec.type;
	}
	video.appendChild( source );
	return video;
}

// Every media block whose video carries tier sources, plus the tier its DOM is
// currently built for. Kept separate from sgsEnhancedVideoWraps because an
// embed <iframe> is never "enhanced" (the branded player only wraps a real
// <video>) yet still needs the source swap.
const sgsTieredVideoNodes = [];

/**
 * Swap one block's video to the source its current viewport tier asks for.
 *
 * ⚠ Bean-decided 2026-08-07, with the cost stated and accepted: for a
 * YouTube/Vimeo embed this REBUILDS the iframe, so a visitor who crosses a
 * breakpoint mid-watch loses their playback position. That is why the swap only
 * fires when the resolved tier's SOURCE genuinely differs from what is on
 * screen — a resize within one tier, or across tiers that resolve to the same
 * URL, must not tear the player down.
 *
 * @param {Object} entry Tracked entry { node, tier }.
 */
function applyTierSource( entry ) {
	const tier = getCurrentDeviceTier();
	const spec = resolveTierSource( entry.node, tier );
	if ( ! spec || ! spec.src ) {
		return;
	}

	const isFrame = entry.node.tagName === 'IFRAME';
	const currentSrc = isFrame
		? entry.node.getAttribute( 'src' )
		: entry.node.querySelector( 'source' )?.getAttribute( 'src' );
	const currentKind = isFrame ? 'embed' : 'file';
	const nextKind = spec.kind === 'file' ? 'file' : 'embed';

	if ( currentSrc === spec.src && currentKind === nextKind ) {
		entry.tier = tier;
		return;
	}

	// Same element kind and a direct file — swap in place, which preserves the
	// element (and the branded player wrapped around it).
	if ( currentKind === 'file' && nextKind === 'file' ) {
		const source = entry.node.querySelector( 'source' );
		if ( source ) {
			source.src = spec.src;
			if ( spec.type ) {
				source.type = spec.type;
			}
			if ( spec.poster ) {
				entry.node.poster = spec.poster;
			}
			entry.node.load();
			entry.tier = tier;
		}
		return;
	}

	// Kind changed, or an embed URL changed — replace the node outright.
	const next = buildVideoNode( spec, entry.node );
	entry.node.replaceWith( next );
	entry.node = next;
	entry.tier = tier;

	// A rebuilt direct-file <video> has lost the branded player that wrapped the
	// old node; re-enhance it so controls come back.
	if ( next.tagName === 'VIDEO' ) {
		enhance( next );
	}
}

function init() {
	document.querySelectorAll( 'video.sgs-media__video' ).forEach( enhance );

	// Tier sources apply to both <video> and embed <iframe>.
	document
		.querySelectorAll(
			'video.sgs-media__video[data-src-desktop], iframe.sgs-media__video[data-src-desktop]'
		)
		.forEach( ( node ) => {
			const entry = { node, tier: 'desktop' };
			sgsTieredVideoNodes.push( entry );
			applyTierSource( entry );
		} );
}

if ( document.readyState === 'loading' ) {
	document.addEventListener( 'DOMContentLoaded', init );
} else {
	init();
}
