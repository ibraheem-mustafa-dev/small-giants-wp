// The browser side of calibration: reads every element of each calibration instance at each width, at rest and
// under its state trigger. Element keys are elementPath() keys from the instance root; a pseudo-element layer is its
// element's key plus `::before`, `::after`, `::placeholder` or `::first-letter`; a panel the instance controls through
// aria-controls (a cart dialog moved to <body>, a drawer) is keyed `@controls > <path>` (`@controls:2` for a second).
import { WIDTHS, CAL_PREFIX, READ_PROPS, PSEUDO_PROPS, TEXT_PSEUDO_PROPS } from './calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';
import { EDITOR_TIMEOUT_MS } from './calibrate-chunk.mjs';

export const SCROLL_Y = 600;

// In-page: every element of each instance (or only the instance `only`), its path and the read properties.
// Self-contained; pathSrc is elementPath's source.
export function readInstancesInPage( [ count, prefix, props, pathSrc, pseudoProps, textPseudoProps, only ] ) {
	// eslint-disable-next-line no-new-func
	const pathOf = new Function( `return (${ pathSrc });` )();
	const pick = ( cs, list ) => Object.fromEntries( list.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
	const hasText = ( el ) => [ ...el.childNodes ].some( ( n ) => 3 === n.nodeType && n.textContent.trim() );
	const collect = ( els, top, keyPrefix ) => {
		for ( const el of [ top, ...top.querySelectorAll( '*' ) ] ) {
			const p = pathOf( el, top );
			const key = keyPrefix ? ( p ? `${ keyPrefix } > ${ p }` : keyPrefix ) : p;
			if ( key in els ) {
				continue;
			}
			// _tag: the element's tag, so a setting matched without :nth-of-type steps keeps an input apart from a textarea.
			els[ key ] = { ...pick( getComputedStyle( el ), props ), _tag: el.tagName.toLowerCase() };
			for ( const ps of [ '::before', '::after' ] ) {
				const cs = getComputedStyle( el, ps );
				if ( ! [ 'none', 'normal', '' ].includes( cs.getPropertyValue( 'content' ) ) ) {
					els[ key + ps ] = pick( cs, pseudoProps );
				}
			}
			if ( /^(input|textarea)$/i.test( el.tagName ) ) {
				els[ `${ key }::placeholder` ] = pick( getComputedStyle( el, '::placeholder' ), textPseudoProps );
			} else if ( hasText( el ) ) {
				// Recorded only where a rule styles the first letter apart from its element.
				const own = pick( getComputedStyle( el ), textPseudoProps );
				const fl = pick( getComputedStyle( el, '::first-letter' ), textPseudoProps );
				if ( Object.keys( fl ).some( ( k ) => fl[ k ] !== own[ k ] ) ) {
					els[ `${ key }::first-letter` ] = fl;
				}
			}
		}
	};
	const out = [];
	for ( let n = 0; n < count; n++ ) {
		const root = undefined === only || only === n ? document.querySelector( `.${ prefix }${ n }` ) : null;
		if ( ! root ) {
			out.push( null );
			continue;
		}
		const els = {};
		collect( els, root, '' );
		const ids = [ ...new Set( [ root, ...root.querySelectorAll( '[aria-controls]' ) ].flatMap( ( e ) => ( e.getAttribute( 'aria-controls' ) || '' ).split( /\s+/ ) ).filter( Boolean ) ) ];
		ids.map( ( id ) => document.getElementById( id ) ).filter( ( t ) => t && ! root.contains( t ) ).forEach( ( t, i ) => collect( els, t, i ? `@controls:${ i + 1 }` : '@controls' ) );
		// A companion the block prints outside its root (the detached burger chip, queued to wp_footer) carries the
		// root's per-instance uid class (sgs-<block>-<hex>), so it is read too, keyed @companion.
		const uid = [ ...root.classList ].find( ( c ) => /^sgs-[a-z0-9-]+-[0-9a-f]{8}$/.test( c ) );
		if ( uid ) {
			[ ...document.querySelectorAll( `.${ uid }` ) ].filter( ( c ) => ! root.contains( c ) && ! c.contains( root ) ).forEach( ( c, i ) => collect( els, c, i ? `@companion:${ i + 1 }` : '@companion' ) );
		}
		out.push( els );
	}
	return out;
}

// In-page: marks the element a state trigger acts on (the instance's styled element, searched in the instance and its
// controlled panels, else the root) with data-cr-target, and says whether it is visible and whether the instance has a
// closed panel toggle it could open.
export function markTargetInPage( [ prefix, n, selector ] ) {
	document.querySelectorAll( '[data-cr-target]' ).forEach( ( e ) => e.removeAttribute( 'data-cr-target' ) );
	const root = document.querySelector( `.${ prefix }${ n }` );
	if ( ! root ) {
		return null;
	}
	const panels = [ ...root.querySelectorAll( '[aria-controls]' ) ].map( ( e ) => document.getElementById( e.getAttribute( 'aria-controls' ) ) ).filter( Boolean );
	const el = ( selector && [ root, ...panels ].map( ( s ) => ( s.matches( selector ) ? s : s.querySelector( selector ) ) ).find( Boolean ) ) || root;
	el.setAttribute( 'data-cr-target', '1' );
	const r = el.getBoundingClientRect();
	const visible = r.width > 0 && r.height > 0 && 'hidden' !== getComputedStyle( el ).visibility;
	let toggle = root.querySelector( '[aria-controls][aria-expanded="false"]' ) || ( root.matches( '[aria-controls][aria-expanded="false"]' ) ? root : null );
	if ( ! toggle ) {
		// The opener often sits outside the instance (a burger in the header opening a drawer instance): any closed
		// toggle on the page that controls the instance or an element inside it, never another instance's opener.
		const ids = new Set( [ root, ...root.querySelectorAll( '[id]' ), ...panels ].map( ( e ) => e.id ).filter( Boolean ) );
		toggle = [ ...document.querySelectorAll( '[aria-controls][aria-expanded="false"]' ) ].find( ( b ) => ! root.contains( b ) && b.getAttribute( 'aria-controls' ).split( /\s+/ ).some( ( id ) => ids.has( id ) ) ) || null;
	}
	toggle && toggle.setAttribute( 'data-cr-toggle', '1' );
	return { visible, toggle: !! toggle };
}

// Reads every instance at each width; state instances again under their trigger; scroll instances (and every default
// instance, their baseline) again with the window scrolled. Returns { width: [instanceReads] } plus
// { scrolled: { width: { n: read } }, scrollMissed: [n], hoverMissed: [n] (state instances whose element is hidden
// even with its panel opened) }. The widths are read in parallel, each in its own page of the logged-in context.
export async function readAll( page, url, instances ) {
	const out = {};
	const scrolled = {};
	const scrollMissed = [];
	const hoverMissed = [];
	const ctx = page.context();
	await Promise.all( WIDTHS.map( async ( w ) => {
		const p = await ctx.newPage();
		try {
			await readWidth( p, url, instances, w, { out, scrolled, scrollMissed, hoverMissed } );
		} finally {
			await p.close();
		}
	} ) );
	scrollMissed.sort( ( a, b ) => a - b );
	hoverMissed.sort( ( a, b ) => a - b );
	return Object.assign( out, { scrolled, scrollMissed, hoverMissed } );
}

// Clicks the marked panel toggle. A toggle hidden at this width (a burger at desktop) cannot take a real click even
// forced, so it is clicked in the page: the block's own handler still runs, and a panel that stays shut leaves its
// target hidden (reported as missed) instead of failing the block.
export async function openToggle( page ) {
	const toggle = page.locator( '[data-cr-toggle]' ).first();
	if ( await toggle.isVisible() ) {
		await toggle.click( { force: true } );
		return;
	}
	await toggle.evaluate( ( el ) => el.click() );
}

const args = ( count, only ) => [ count, CAL_PREFIX, READ_PROPS, elementPath.toString(), PSEUDO_PROPS, TEXT_PSEUDO_PROPS, only ];

// One state instance under its trigger: hover or keyboard focus on the styled element (its panel opened first when
// it is hidden), or the state's ancestor class added. Returns the read, or null when the element stays hidden.
async function readUnderTrigger( page, instances, n, inst ) {
	const one = async () => ( await page.evaluate( readInstancesInPage, args( instances.length, n ) ) )[ n ];
	if ( 'class' === inst.trigger ) {
		await page.evaluate( ( [ sel, cls ] ) => document.querySelector( sel )?.parentElement?.classList.add( cls ), [ `.${ CAL_PREFIX }${ n }`, inst.stateClass ] );
		await page.waitForTimeout( 400 );
		const read = await one();
		await page.evaluate( ( [ sel, cls ] ) => document.querySelector( sel )?.parentElement?.classList.remove( cls ), [ `.${ CAL_PREFIX }${ n }`, inst.stateClass ] );
		return read;
	}
	let mark = await page.evaluate( markTargetInPage, [ CAL_PREFIX, n, inst.target ] );
	let opened = false;
	if ( mark && ! mark.visible && mark.toggle ) {
		await openToggle( page );
		await page.waitForTimeout( 500 );
		opened = true;
		mark = await page.evaluate( markTargetInPage, [ CAL_PREFIX, n, inst.target ] );
	}
	let read = null;
	if ( mark?.visible ) {
		const loc = page.locator( '[data-cr-target]' ).first();
		try {
			if ( 'focus' === inst.trigger ) {
				await loc.evaluate( ( el ) => el.focus( { focusVisible: true } ) );
			} else {
				await loc.scrollIntoViewIfNeeded();
				await loc.hover( { force: true } );
			}
			await page.waitForTimeout( 500 );
			read = await one();
		} catch {
			// An element Playwright cannot scroll to or reach (it reported visible but sits where no scroll brings it into
			// view) leaves this instance unread, listed as missed, instead of failing the whole block's run.
			read = null;
		}
		await page.mouse.move( 0, 0 );
		await page.evaluate( () => document.activeElement?.blur() );
	}
	if ( opened ) {
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 300 );
	}
	return read;
}

// One width of readAll: fills out[w], scrolled[w] and the missed lists.
async function readWidth( page, url, instances, w, { out, scrolled, scrollMissed, hoverMissed } ) {
	await page.setViewportSize( { width: w, height: 900 } );
	await page.goto( `${ url }${ url.includes( '?' ) ? '&' : '?' }cb=${ Date.now() }`, { waitUntil: 'domcontentloaded', timeout: EDITOR_TIMEOUT_MS } );
	// Attached, not visible: a block may legitimately render hidden at a width (an empty header row), and its elements
	// are still read.
	try {
		await page.waitForSelector( `.${ CAL_PREFIX }0`, { state: 'attached', timeout: EDITOR_TIMEOUT_MS } );
	} catch {
		// The page loaded and the instance never appeared: the block rendered nothing (an early return in its render.php).
		const wrappers = await page.locator( '[class*="cr-cal-"]' ).count();
		throw new Error( wrappers ? `the block rendered nothing inside its ${ wrappers } calibration wrapper(s) at ${ w }px (no .${ CAL_PREFIX }0 on the page)` : `the calibration page at ${ w }px holds none of the calibration wrappers (the build did not save, or the page is cached)` );
	}
	await page.waitForTimeout( 800 );
	out[ w ] = await page.evaluate( readInstancesInPage, args( instances.length ) );
	for ( const [ n, inst ] of instances.entries() ) {
		if ( ! [ 'hover', 'focus', 'class' ].includes( inst.trigger ) ) {
			continue;
		}
		const read = await readUnderTrigger( page, instances, n, inst );
		if ( read ) {
			out[ w ][ n ] = read;
		} else if ( ! hoverMissed.includes( n ) ) {
			hoverMissed.push( n );
		}
	}
	if ( instances.some( ( i ) => 'scroll' === i.trigger ) ) {
		const readScrolled = async ( wait ) => {
			await page.evaluate( ( y ) => window.scrollTo( { top: y, behavior: 'instant' } ), SCROLL_Y );
			await page.waitForTimeout( wait );
			const all = await page.evaluate( readInstancesInPage, args( instances.length ) );
			const hit = await page.evaluate( ( [ count, prefix ] ) => [ ...Array( count ).keys() ].map( ( n ) => !! document.querySelector( `.${ prefix }${ n } .is-header-scrolled, .${ prefix }${ n }.is-header-scrolled` ) ), [ instances.length, CAL_PREFIX ] );
			return { all, hit };
		};
		let { all, hit } = await readScrolled( 900 );
		// The header's scroll handler can miss one programmatic jump; a second, slower scroll settles it.
		if ( instances.some( ( inst, n ) => 'scroll' === inst.trigger && ! hit[ n ] ) ) {
			await page.evaluate( () => window.scrollTo( { top: 0, behavior: 'instant' } ) );
			await page.waitForTimeout( 300 );
			( { all, hit } = await readScrolled( 1800 ) );
		}
		scrolled[ w ] = {};
		instances.forEach( ( inst, n ) => {
			if ( inst.isDefault || 'scroll' === inst.trigger ) {
				scrolled[ w ][ n ] = all[ n ];
			}
			if ( 'scroll' === inst.trigger && ! hit[ n ] && ! scrollMissed.includes( n ) ) {
				scrollMissed.push( n );
			}
		} );
		await page.evaluate( () => window.scrollTo( { top: 0, behavior: 'instant' } ) );
	}
}
