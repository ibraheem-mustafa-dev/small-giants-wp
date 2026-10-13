/**
 * Hover, focus, tilt, reduced-motion and inline-style checks for probe-motion-model.mjs (Spec 38A unit M2.9).
 * Each exported function takes the shared context { browser, engine, width, markers, rep, newPage } and reports rows.
 *
 * @package SGS\Blocks
 */

import { judgeTransitionProperty, parseTranslate, isRest, near } from './probe-motion-model-lib.mjs';

const CARD = '.m29-hover-card[data-sgs-mh]';
const OWNERS = [ '--sgs-mh-ty', '--sgs-mh-s' ];
const FORBIDDEN = [ '--sgs-mh-rot', '--sgs-mh-tx', 'opacity' ];

/** Computed transform-family reading of one element. */
const READ = ( sel ) => {
	const el = document.querySelector( sel );
	if ( ! el ) return null;
	const cs = getComputedStyle( el );
	return { translate: cs.translate, scale: cs.scale, bg: cs.backgroundColor, afterBg: getComputedStyle( el, '::after' ).backgroundColor, tp: cs.transitionProperty, td: cs.transitionDuration, tdl: cs.transitionDelay };
};

/** Every transition-delay and animation-delay on the motion elements, as trimmed strings. */
const READ_DELAYS = () =>
	[ ...document.querySelectorAll( '[data-sgs-mh], [data-sgs-me]' ) ].flatMap( ( el ) => {
		const cs = getComputedStyle( el );
		return [ ...cs.transitionDelay.split( ',' ), ...cs.animationDelay.split( ',' ) ].map( ( d ) => d.trim() );
	} );

/** Elements under (and including) a root whose `style` attribute writes a transform-family property; mirrors styleWritesTransform in the lib. */
const SCAN_TRANSFORM_STYLES = ( root ) =>
	[ ...root.querySelectorAll( '*' ), root ]
		.filter( ( n ) => /(^|;|\s)(transform|translate|rotate|scale|opacity)\s*:/i.test( n.getAttribute( 'style' ) || '' ) )
		.map( ( n ) => `${ n.tagName.toLowerCase() }.${ n.className }` );

/** The tilt element's `--sgs-tilt-x` as a number of degrees (NaN when absent); the element is the selector match or the tilt descendant. */
const TILT_ANGLE = ( sel ) => {
	const root = document.querySelector( sel );
	const el = root && ( root.matches( '.sgs-has-tilt-3d' ) ? root : root.querySelector( '.sgs-has-tilt-3d' ) );
	return el ? parseFloat( getComputedStyle( el ).getPropertyValue( '--sgs-tilt-x' ) ) : NaN;
};

/** Scroll an element to the viewport centre and wait until smooth scrolling (Lenis) has stopped and its box is steady. */
async function settleInView( page, sel ) {
	await page.$eval( sel, ( el ) => el.scrollIntoView( { block: 'center', behavior: 'instant' } ) );
	await page.waitForFunction( ( s ) => {
		const top = document.querySelector( s ).getBoundingClientRect().top;
		const steady = window.__m29Top !== undefined && Math.abs( window.__m29Top - top ) < 0.5;
		window.__m29Top = top;
		return steady && ! document.documentElement.classList.contains( 'lenis-scrolling' );
	}, sel, { polling: 120, timeout: 5000 } ).catch( () => null );
	await page.evaluate( () => { delete window.__m29Top; } );
}

async function hoverRead( page, sel, settleMs = 500 ) {
	await settleInView( page, sel );
	const before = await page.evaluate( READ, sel );
	await page.hover( sel );
	await page.waitForTimeout( settleMs );
	const after = await page.evaluate( READ, sel );
	await page.mouse.move( 0, 0 );
	return { before, after };
}

/** H1 to H3 and the magnet-sum edge: transition-property, token duration, lift and scale, harness sum. */
export async function hoverChecks( ctx ) {
	const { rep, markers } = ctx;
	if ( ! markers[ '.m29-hover-card' ] ) {
		for ( const id of [ 'hover-transition-property', 'hover-duration-token', 'hover-lift-scale', 'hover-magnet-sum' ] ) {
			rep.check( id, { pass: null, why: 'no page with .m29-hover-card (hover-entrance fixture) given' } );
		}
		return;
	}
	const { page, close } = await ctx.newPage( markers[ '.m29-hover-card' ] );
	try {
		const { before, after } = await hoverRead( page, CARD );
		const list = before.tp.split( ',' );
		rep.check( 'hover-transition-property', { selector: CARD, property: 'transition-property', measured: list, expected: `only ${ OWNERS.join( ', ' ) } plus colour and shadow; not all`, pass: judgeTransitionProperty( list, OWNERS, FORBIDDEN ) } );
		const planted = await page.evaluate( () => {
			const mk = ( css ) => { const d = document.createElement( 'div' ); d.setAttribute( 'style', css ); document.body.appendChild( d ); const v = getComputedStyle( d ).transitionProperty; d.remove(); return v; };
			return { all: mk( 'transition: all 1s' ), unregistered: mk( 'transition: --sgs-mh-ty 1s, --sgs-mh-s 1s, --sgs-mh-rot 1s' ) };
		} );
		rep.control( 'hover-transition-property', { selector: 'planted div', property: 'transition-property', measured: planted, expected: 'both judged red', red: ! judgeTransitionProperty( planted.all.split( ',' ), OWNERS, FORBIDDEN ) && ! judgeTransitionProperty( planted.unregistered.split( ',' ), OWNERS, FORBIDDEN ) } );

		const tokens = await page.evaluate( () => {
			const mk = ( slug ) => { const d = document.createElement( 'div' ); d.setAttribute( 'style', `transition-duration: var(--wp--custom--duration--${ slug }, 0s)` ); document.body.appendChild( d ); const v = getComputedStyle( d ).transitionDuration; d.remove(); return v; };
			return { fast: mk( 'fast' ), slow: mk( 'slow' ) };
		} );
		rep.check( 'hover-duration-token', { selector: CARD, property: 'transition-duration', measured: before.td, expected: `${ tokens.fast } (token duration.fast)`, pass: tokens.fast === '0s' ? null : before.td.split( ',' ).every( ( d ) => d.trim() === tokens.fast ), why: tokens.fast === '0s' ? 'duration.fast did not resolve on this site' : '' } );
		const literal = await page.evaluate( () => { const d = document.createElement( 'div' ); d.setAttribute( 'style', 'transition-duration: 777ms' ); document.body.appendChild( d ); const v = getComputedStyle( d ).transitionDuration; d.remove(); return v; } );
		rep.control( 'hover-duration-token', { selector: 'planted div', property: 'transition-duration', measured: literal, expected: `a literal 777ms duration judged against ${ tokens.fast } (token duration.fast) is rejected`, red: tokens.fast === '0s' ? null : ! literal.split( ',' ).every( ( d ) => d.trim() === tokens.fast ) } );

		const t = parseTranslate( after.translate );
		const scale = parseFloat( after.scale );
		rep.check( 'hover-lift-scale', { selector: CARD, property: 'translate / scale', measured: { translate: after.translate, scale: after.scale, before: before.translate }, expected: 'translate y -6px (-3px at 375), scale 1.04 (1.02 at 768 and 375 only if devices set); none before hover', pass: isRest( before.translate ) && near( t.y, -6, 0.5 ) && near( scale, 1.04, 0.01 ) } );
		const plain = await hoverRead( page, '.m29-plain-card' );
		rep.control( 'hover-lift-scale', { selector: '.m29-plain-card', property: 'translate', measured: plain.after.translate, expected: 'none (a card with no motion)', red: isRest( plain.after.translate ) } );

		await page.$eval( CARD, ( el ) => el.style.setProperty( '--sgs-mag-x', '4px' ) );
		const mag = await hoverRead( page, CARD );
		await page.$eval( CARD, ( el ) => el.style.removeProperty( '--sgs-mag-x' ) );
		const m = parseTranslate( mag.after.translate );
		rep.check( 'hover-magnet-sum', { selector: CARD, property: 'translate', measured: mag.after.translate, expected: '4px -6px within 0.5px', pass: near( m.x, 4, 0.5 ) && near( m.y, -6, 0.5 ) } );
		await page.$eval( '.m29-plain-card', ( el ) => el.style.setProperty( '--sgs-mag-x', '4px' ) );
		const plainMag = await hoverRead( page, '.m29-plain-card' );
		await page.$eval( '.m29-plain-card', ( el ) => el.style.removeProperty( '--sgs-mag-x' ) );
		const pm = parseTranslate( plainMag.after.translate );
		rep.control( 'hover-magnet-sum', { selector: '.m29-plain-card', property: 'translate', measured: plainMag.after.translate, expected: 'a card with no motion fed the same --sgs-mag-x does not reach 4px -6px, so the sum judge rejects it', red: ! ( near( pm.x, 4, 0.5 ) && near( pm.y, -6, 0.5 ) ) } );
	} finally {
		await close();
	}
}

/** Edge: under hover:none a tap does not lift; :focus-visible gives the same transform. */
export async function touchAndFocusChecks( ctx ) {
	const { rep, markers } = ctx;
	if ( ! markers[ '.m29-hover-card' ] ) {
		rep.check( 'hover-none-tap', { pass: null, why: 'no .m29-hover-card page' } );
		rep.check( 'focus-visible-parity', { pass: null, why: 'no .m29-hover-card page' } );
		return;
	}
	const touch = await ctx.newPage( markers[ '.m29-hover-card' ], ctx.engine === 'firefox' ? { hasTouch: true } : { hasTouch: true, isMobile: true } );
	try {
		const canHover = await touch.page.evaluate( () => matchMedia( '(hover: hover)' ).matches );
		if ( canHover ) {
			rep.check( 'hover-none-tap', { pass: null, why: `${ ctx.engine } does not emulate hover: none with hasTouch` } );
		} else {
			await touch.page.$eval( CARD, ( el ) => el.scrollIntoView( { block: 'center' } ) );
			await touch.page.tap( CARD );
			await touch.page.waitForTimeout( 500 );
			const r = await touch.page.evaluate( READ, CARD );
			rep.check( 'hover-none-tap', { selector: CARD, property: 'translate', measured: r.translate, expected: 'none after a tap under hover: none', pass: isRest( r.translate ) } );
			const desk = await ctx.newPage( markers[ '.m29-hover-card' ] );
			try {
				const d = await hoverRead( desk.page, CARD );
				rep.control( 'hover-none-tap', { selector: CARD, property: 'translate', measured: d.after.translate, expected: 'a hover-capable pointer lifts (so "none" above is not vacuous)', red: ! isRest( d.after.translate ) } );
			} finally {
				await desk.close();
			}
		}
	} finally {
		await touch.close();
	}
	const { page, close } = await ctx.newPage( markers[ '.m29-hover-card' ] );
	try {
		const has = await page.evaluate( ( sel ) => !! document.querySelector( `${ sel } a[href], ${ sel } button` ), CARD );
		if ( ! has ) {
			rep.check( 'focus-visible-parity', { selector: CARD, pass: null, why: 'the card has no focusable child in this fixture' } );
			return;
		}
		await page.$eval( CARD, ( el ) => el.scrollIntoView( { block: 'center' } ) );
		await page.focus( `${ CARD } a[href], ${ CARD } button` );
		await page.keyboard.press( 'Shift+Tab' );
		await page.keyboard.press( 'Tab' );
		await page.waitForTimeout( 500 );
		const f = await page.evaluate( READ, CARD );
		await page.evaluate( () => document.activeElement && document.activeElement.blur() );
		await page.mouse.move( 0, 0 );
		await page.waitForTimeout( 500 );
		const rest = await page.evaluate( READ, CARD );
		const hov = await hoverRead( page, CARD );
		rep.check( 'focus-visible-parity', { selector: CARD, property: 'translate', measured: { focus: f.translate, hover: hov.after.translate }, expected: 'equal', pass: f.translate === hov.after.translate } );
		rep.control( 'focus-visible-parity', { selector: CARD, property: 'translate', measured: rest.translate, expected: 'blurred, un-hovered card is at rest while the focused one is not', red: isRest( rest.translate ) && ! isRest( f.translate ) } );
	} finally {
		await close();
	}
}

/** Fail group: reduce emulated, nothing moves, every delay 0s, colour hover still changes, mid-session switch applies without reload. */
export async function reducedMotionChecks( ctx ) {
	const { rep, markers } = ctx;
	if ( ! markers[ '.m29-hover-card' ] ) {
		rep.check( 'reduced-motion', { pass: null, why: 'no .m29-hover-card page' } );
		return;
	}
	const url = markers[ '.m29-hover-card' ];
	const reduce = await ctx.newPage( url, { reducedMotion: 'reduce' } );
	try {
		const flags = await reduce.page.evaluate( () => ( { mq: matchMedia( '(prefers-reduced-motion: reduce)' ).matches, ready: document.documentElement.classList.contains( 'sgs-motion-ready' ) } ) );
		const r = await hoverRead( reduce.page, CARD );
		rep.check( 'reduced-no-movement', { selector: CARD, property: 'translate', measured: { ...flags, translate: r.after.translate, scale: r.after.scale }, expected: 'reduce matches; translate none; scale none or 1', pass: flags.mq && isRest( r.after.translate ) && ( r.after.scale === 'none' || parseFloat( r.after.scale ) === 1 ) } );
		const delays = await reduce.page.evaluate( READ_DELAYS );
		rep.check( 'reduced-delays-zero', { selector: '[data-sgs-mh], [data-sgs-me]', property: 'transition-delay, animation-delay', measured: [ ...new Set( delays ) ], expected: [ '0s' ], pass: delays.length > 0 && delays.every( ( d ) => d === '0s' ) } );
		rep.check( 'reduced-colour-hover', { selector: CARD, property: '::after background-color', measured: { before: r.before.afterBg, after: r.after.afterBg }, expected: 'differs (the block paints its hover colour on ::after; colour hover still plays under reduce)', pass: r.before.afterBg !== r.after.afterBg } );
		const plainR = await hoverRead( reduce.page, '.m29-plain-card' ).catch( () => null );
		rep.control( 'reduced-colour-hover', { selector: '.m29-plain-card', property: '::after background-color', measured: plainR && { before: plainR.before.afterBg, after: plainR.after.afterBg }, expected: 'a card with no hover colour shows no change under reduce, so the same before/after judge rejects it', red: plainR ? plainR.before.afterBg === plainR.after.afterBg : null } );
	} finally {
		await reduce.close();
	}
	const pref = await ctx.newPage( url, { reducedMotion: 'no-preference' } );
	try {
		const p = await hoverRead( pref.page, CARD );
		rep.control( 'reduced-no-movement', { selector: CARD, property: 'translate', measured: p.after.translate, expected: 'no-preference arm moves (emulation is distinguishable)', red: ! isRest( p.after.translate ) } );
		const prefDelays = await pref.page.evaluate( READ_DELAYS );
		rep.control( 'reduced-delays-zero', { selector: '[data-sgs-mh], [data-sgs-me]', property: 'transition-delay, animation-delay', measured: [ ...new Set( prefDelays ) ], expected: 'the no-preference arm reads a non-zero stored delay, so the all-0s judge rejects it', red: ! prefDelays.every( ( d ) => d === '0s' ) } );
		await pref.page.emulateMedia( { reducedMotion: 'reduce' } );
		await pref.page.waitForTimeout( 300 );
		const s = await hoverRead( pref.page, CARD );
		rep.check( 'reduced-mid-session-switch', { selector: CARD, property: 'translate', measured: { beforeSwitch: p.after.translate, afterSwitch: s.after.translate }, expected: 'moves before the switch, none after, with no reload', pass: ! isRest( p.after.translate ) && isRest( s.after.translate ) } );
	} finally {
		await pref.close();
	}
	const still = await ctx.newPage( url, { reducedMotion: 'no-preference' } );
	try {
		const first = await hoverRead( still.page, CARD );
		await still.page.waitForTimeout( 300 );
		const second = await hoverRead( still.page, CARD );
		rep.control( 'reduced-mid-session-switch', { selector: CARD, property: 'translate', measured: { first: first.after.translate, second: second.after.translate }, expected: 'without the switch the card still moves on the second hover, so the moves-then-none judge rejects it', red: ! ( ! isRest( first.after.translate ) && isRest( second.after.translate ) ) } );
	} finally {
		await still.close();
	}
}

/** Tilt (legacy `.sgs-has-tilt-3d`) writes no inline transform; integration: no motion element carries a style attribute. */
export async function tiltAndInlineChecks( ctx ) {
	const { rep, markers } = ctx;
	if ( markers[ '.m29-tilt' ] ) {
		const { page, close } = await ctx.newPage( markers[ '.m29-tilt' ] );
		try {
			const sel = '.m29-tilt';
			await page.$eval( sel, ( el ) => el.scrollIntoView( { block: 'center' } ) );
			const box = await ( await page.$( sel ) ).boundingBox();
			await page.mouse.move( 0, 0 );
			await page.waitForTimeout( 150 );
			const angleAtRest = await page.evaluate( TILT_ANGLE, sel );
			await page.mouse.move( box.x + box.width * 0.25, box.y + box.height * 0.25 );
			await page.mouse.move( box.x + box.width * 0.75, box.y + box.height * 0.75, { steps: 6 } );
			await page.waitForTimeout( 300 );
			const angleMoved = await page.evaluate( TILT_ANGLE, sel );
			const tiltClass = await page.evaluate( ( s ) => !! ( document.querySelector( s ).matches( '.sgs-has-tilt-3d' ) || document.querySelector( `${ s } .sgs-has-tilt-3d` ) ), sel );
			const bad = await page.$eval( sel, SCAN_TRANSFORM_STYLES );
			rep.check( 'tilt-no-inline-transform', { selector: sel, property: 'style attribute', measured: { tiltClass, offenders: bad }, expected: 'tilt class present, --sgs-tilt-x a non-zero angle after the pointer move (tilt-3d.js ran), no style attribute writes a transform', pass: tiltClass && Number.isFinite( angleMoved ) && Math.abs( angleMoved ) > 0.01 && bad.length === 0 } );
			rep.control( 'tilt-no-inline-transform/ran', { selector: sel, property: '--sgs-tilt-x (before any pointer move)', measured: { atRest: angleAtRest, afterMove: angleMoved }, expected: 'empty or 0 before the pointer moves, so a non-zero reading after it proves the script wrote it', red: ( ! Number.isFinite( angleAtRest ) || Math.abs( angleAtRest ) < 0.01 ) && Number.isFinite( angleMoved ) && Math.abs( angleMoved ) > 0.01 } );
			const planted = await page.$eval( sel, ( root ) => { const d = document.createElement( 'div' ); d.setAttribute( 'style', 'transform: rotate(2deg)' ); root.appendChild( d ); return d.className; } );
			const caught = await page.$eval( sel, SCAN_TRANSFORM_STYLES );
			rep.control( 'tilt-no-inline-transform', { selector: sel, property: 'style attribute', measured: caught, expected: 'planted inline transform is detected', red: caught.length > 0, why: `planted ${ planted || 'div' }` } );
		} finally {
			await close();
		}
	} else {
		rep.check( 'tilt-no-inline-transform', { pass: null, why: 'no page with .m29-tilt (keyframes-tilt fixture) given' } );
	}
	for ( const marker of [ '.m29-hover-card', '.m29-fade-part', '.m29-kf' ] ) {
		if ( ! markers[ marker ] ) continue;
		const { page, close } = await ctx.newPage( markers[ marker ] );
		try {
			const offenders = await page.evaluate( () => [ ...document.querySelectorAll( '[data-sgs-mh], [data-sgs-me], [class*="sgs-m-"]' ) ].filter( ( n ) => n.hasAttribute( 'style' ) ).map( ( n ) => n.tagName.toLowerCase() ) );
			rep.check( `no-inline-style:${ marker }`, { selector: '[data-sgs-mh], [data-sgs-me]', property: 'style attribute', measured: offenders, expected: [], pass: offenders.length === 0 } );
			const caught = await page.evaluate( () => { const d = document.createElement( 'div' ); d.setAttribute( 'data-sgs-me', 'load' ); d.setAttribute( 'style', 'opacity:0' ); document.body.appendChild( d ); const n = [ ...document.querySelectorAll( '[data-sgs-mh], [data-sgs-me]' ) ].filter( ( x ) => x.hasAttribute( 'style' ) ).length; d.remove(); return n; } );
			rep.control( `no-inline-style:${ marker }`, { selector: '[data-sgs-me]', property: 'style attribute', measured: caught, expected: 'planted styled element is counted', red: caught > 0 } );
		} finally {
			await close();
		}
	}
}
