// The browser side of calibration: reads every element of each calibration instance at each width, at rest and
// under its state trigger. Element keys are elementPath() keys from the instance root; a pseudo-element layer is its
// element's key plus `::before`, `::after`, `::placeholder` or `::first-letter`; a panel the instance controls through
// aria-controls (a cart dialog moved to <body>, a drawer) is keyed `@controls > <path>` (`@controls:2` for a second).
import { WIDTHS, CAL_PREFIX, READ_PROPS, CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, OWN_INHERITED } from './calibrate-props.mjs';
import { elementPath } from '../../parity/lib/ref-trace.mjs';
import { EDITOR_TIMEOUT_MS } from './calibrate-chunk.mjs';
import { probeState, probeMechanisms } from './calibrate-probe.mjs';
import { listedProperties } from './db.mjs';
import { markOpenToggleInPage, openOwnToggle } from './calibrate-open.mjs';

export const SCROLL_Y = 600;

// In-page: every element of each instance (or only the instance `only`), its path and the read properties.
// Self-contained; pathSrc is elementPath's source. On the instances listed in ownAt (the default instances), an
// inherited property (ownProps) an element paints itself is recorded as `_own:<prop>`, with its font size as `_fs`, as is
// a minimum size the element declares (`_own:min-height`, `_own:min-width`), and the context a value is judged in beside
// it: the parent's display as `_parentDisplay` and the element's position as `_position` (lib/fill-prop.mjs::
// calibratedContext; its direction is a read property). A marked instance carries none of these, so the slot finder
// never takes them for a setting's change.
export function readInstancesInPage( [ count, prefix, props, pathSrc, pseudoProps, textPseudoProps, only, ownProps = [], ownAt = [] ] ) {
	// eslint-disable-next-line no-new-func
	const pathOf = new Function( `return (${ pathSrc });` )();
	const pick = ( cs, list ) => Object.fromEntries( list.map( ( p ) => [ p, cs.getPropertyValue( p ).trim() ] ) );
	// The inherited properties the element paints itself: a value that is neither its parent's nor, for a line height,
	// its parent's ratio of the font size carried to its own font size (a unitless line height inherits as that ratio).
	const ownOf = ( el, cs ) => {
		const parent = el.parentElement;
		if ( ! parent ) {
			return {};
		}
		const pcs = getComputedStyle( parent );
		const fs = parseFloat( cs.fontSize );
		const pfs = parseFloat( pcs.fontSize );
		const out = {};
		for ( const p of ownProps ) {
			const v = cs.getPropertyValue( p ).trim();
			const pv = pcs.getPropertyValue( p ).trim();
			if ( v === pv || ( 'line-height' === p && fs && pfs && Math.abs( parseFloat( v ) - ( parseFloat( pv ) / pfs ) * fs ) < 0.05 ) ) {
				continue;
			}
			out[ `_own:${ p }` ] = v;
		}
		return Object.keys( out ).length ? { ...out, _fs: cs.fontSize } : out;
	};
	// A minimum the block declares (`min-height: 0` included) as `_own:<prop>`: the computed style reads 0px for an unstyled
	// box off a flex or grid item and for a declared 0 alike, while the typed computed value keeps an undeclared minimum
	// `auto` (lib/fill-prop.mjs::inOwnContext leaves a declared one as it is).
	const declaredMinimum = ( el, cs ) => {
		const out = {};
		for ( const p of [ 'min-height', 'min-width' ] ) {
			const typed = el.computedStyleMap?.().get( p );
			if ( typed && 'auto' !== String( typed ).trim() ) {
				out[ `_own:${ p }` ] = cs.getPropertyValue( p ).trim();
			}
		}
		return out;
	};
	const contextOf = ( el, cs ) => ( { _parentDisplay: el.parentElement ? getComputedStyle( el.parentElement ).display : 'block', _position: cs.position } );
	const hasText = ( el ) => [ ...el.childNodes ].some( ( n ) => 3 === n.nodeType && n.textContent.trim() );
	const collect = ( els, top, keyPrefix, own ) => {
		for ( const el of [ top, ...top.querySelectorAll( '*' ) ] ) {
			const p = pathOf( el, top );
			const key = keyPrefix ? ( p ? `${ keyPrefix } > ${ p }` : keyPrefix ) : p;
			if ( key in els ) {
				continue;
			}
			// _tag: the element's tag, so a setting matched without :nth-of-type steps keeps an input apart from a textarea.
			const style = getComputedStyle( el );
			els[ key ] = { ...pick( style, props ), _tag: el.tagName.toLowerCase(), ...( own ? { ...ownOf( el, style ), ...declaredMinimum( el, style ), ...contextOf( el, style ) } : {} ) };
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
		const own = ownAt.includes( n );
		collect( els, root, '', own );
		const ids = [ ...new Set( [ root, ...root.querySelectorAll( '[aria-controls]' ) ].flatMap( ( e ) => ( e.getAttribute( 'aria-controls' ) || '' ).split( /\s+/ ) ).filter( Boolean ) ) ];
		ids.map( ( id ) => document.getElementById( id ) ).filter( ( t ) => t && ! root.contains( t ) ).forEach( ( t, i ) => collect( els, t, i ? `@controls:${ i + 1 }` : '@controls', own ) );
		// A companion the block prints outside its root (the detached burger chip, queued to wp_footer) carries the
		// root's per-instance uid class (sgs-<block>-<hex>), so it is read too, keyed @companion.
		const uid = [ ...root.classList ].find( ( c ) => /^sgs-[a-z0-9-]+-[0-9a-f]{8}$/.test( c ) );
		if ( uid ) {
			[ ...document.querySelectorAll( `.${ uid }` ) ].filter( ( c ) => ! root.contains( c ) && ! c.contains( root ) ).forEach( ( c, i ) => collect( els, c, i ? `@companion:${ i + 1 }` : '@companion', own ) );
			// The viewport scrim (helpers-scrim.php::sgs_scrim_render) is printed at wp_footer as a child of <body> carrying
			// `<uid>-scrim`, so it is read keyed @scrim (its tint layer @scrim::before). Its blur, tint and fade compute at
			// rest; only its own opacity waits for the owner to open.
			const scrim = document.querySelector( `.${ uid }-scrim` );
			scrim && ! root.contains( scrim ) && collect( els, scrim, '@scrim', own );
		}
		out.push( els );
	}
	return out;
}

// In-page: marks the element a state trigger acts on (the instance's styled element, searched in the instance and its
// controlled panels; the root when no selector is given) with data-cr-target, and says whether it is visible and whether
// the instance has a closed panel toggle it could open. A selector that matches nothing marks nothing and returns
// { missing: true }.
export function markTargetInPage( [ prefix, n, selector, companionClass ] ) {
	// Both marks are cleared: openToggle clicks the first [data-cr-toggle] on the page, so an earlier instance's toggle
	// left marked would be opened instead of this one's.
	document.querySelectorAll( '[data-cr-target]' ).forEach( ( e ) => e.removeAttribute( 'data-cr-target' ) );
	document.querySelectorAll( '[data-cr-toggle]' ).forEach( ( e ) => e.removeAttribute( 'data-cr-toggle' ) );
	const root = document.querySelector( `.${ prefix }${ n }` );
	if ( ! root ) {
		return null;
	}
	const panels = [ ...root.querySelectorAll( '[aria-controls]' ) ].map( ( e ) => document.getElementById( e.getAttribute( 'aria-controls' ) ) ).filter( Boolean );
	let el = ( selector && [ root, ...panels ].map( ( s ) => ( s.matches( selector ) ? s : s.querySelector( selector ) ) ).find( Boolean ) ) || null;
	if ( ! el && selector ) {
		// An element the block prints outside its root (a companion carrying the root's uid class, e.g. the detached
		// burger chip): the selector names its element, its BEM class may be a shorter prefix of it (detach-chip -> detach).
		const uid = [ ...root.classList ].find( ( c ) => /^sgs-[a-z0-9-]+-[0-9a-f]{8}$/.test( c ) );
		const [ base, token ] = selector.split( '__' );
		const parts = ( token || '' ).split( '-' );
		for ( let k = parts.length; uid && k > 0 && ! el; k-- ) {
			el = [ ...document.querySelectorAll( `.${ uid }` ) ].find( ( c ) => ! root.contains( c ) && ! c.contains( root ) && c.matches( `${ base }__${ parts.slice( 0, k ).join( '-' ) }` ) ) || null;
		}
		// The companion shows only in a state of its own (a class the block's script adds); the calibration adds it.
		el && companionClass && el.classList.add( companionClass );
	}
	if ( ! el && selector ) {
		// The named element is not in this instance: hovering the root instead would read whatever sits under its centre.
		return { visible: false, toggle: false, missing: true };
	}
	el = el || root;
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

// The longest a pass waits for its settle or settleGone selector.
const SETTLE_TIMEOUT_MS = 30000;

// Reads every instance at each width; state instances again under their trigger; scroll instances (and every default
// instance, their baseline) again with the window scrolled. Returns { width: [instanceReads] } plus
// { scrolled: { width: { n: read } }, scrollMissed: [n], hoverMissed: [n] (state instances read at no width),
// hoverWhy: { n: [ '<width>px: <why>' ] } (why each width's read failed: hidden, no instance, or the browser's error) }. The widths are read in parallel, each in its own page of the logged-in context.
export async function readAll( page, url, instances, { settle = null, settleGone = null } = {} ) {
	const out = {};
	const scrolled = {};
	const scrollMissed = [];
	const missedAtAWidth = [];
	const hoverHit = new Set();
	const hoverWhy = {};
	const ctx = page.context();
	await Promise.all( WIDTHS.map( async ( w ) => {
		const p = await ctx.newPage();
		try {
			await readWidth( p, url, instances, w, { out, scrolled, scrollMissed, hoverMissed: missedAtAWidth, hoverHit, hoverWhy, settle, settleGone } );
		} finally {
			await p.close();
		}
	} ) );
	// Missed means unreadable at EVERY width: an element that shows at one width only (the detached chip, below the
	// collapse point) is read there and keeps its one-width reach.
	const hoverMissed = missedAtAWidth.filter( ( n ) => ! hoverHit.has( n ) );
	scrollMissed.sort( ( a, b ) => a - b );
	hoverMissed.sort( ( a, b ) => a - b );
	hoverMissed.forEach( ( n ) => hoverWhy[ n ]?.sort( ( a, b ) => parseInt( a, 10 ) - parseInt( b, 10 ) ) );
	return Object.assign( out, { scrolled, scrollMissed, hoverMissed, hoverWhy: Object.fromEntries( hoverMissed.map( ( n ) => [ n, hoverWhy[ n ] || [] ] ) ) } );
}

// The untested-state reason for a state instance read at no width, from readAll's hoverWhy lines. Each width names
// its own failure: the element hidden even with its panel opened, the instance absent, or the browser's own error
// (an action Playwright could not complete), so a failure is never reported as hidden when it was not.
export function missedReason( whys = [] ) {
	const lines = [ ...new Set( whys ) ];
	if ( lines.length && lines.every( ( l ) => / hidden$/.test( l ) ) ) {
		return 'the element stays hidden with its panel opened, so the state cannot be triggered';
	}
	const missing = lines.map( ( l ) => l.match( /: no element matches (.+)$/ )?.[ 1 ] );
	if ( lines.length && missing.every( Boolean ) && 1 === new Set( missing ).size ) {
		return `no element in the instance matches ${ missing[ 0 ] }: the block.json element needs the selector its state rule paints`;
	}
	return lines.length ? `the state could not be triggered: ${ lines.join( '; ' ) }` : 'the state could not be triggered';
}

// Clicks the marked panel toggle. A toggle hidden at this width (a burger at desktop) cannot take a real click even
// forced, so it is clicked in the page: the block's own handler still runs, and a panel that stays shut leaves its
// target hidden (reported as missed) instead of failing the block. A link that is also its panel's trigger (a nav
// parent with its own page and no caret) follows its href on a click, which would leave the calibration page, so it is
// opened the keyboard's way: focus-visible focus, then ArrowDown while it is still shut.
export async function openToggle( page ) {
	const toggle = page.locator( '[data-cr-toggle]' ).first();
	if ( await toggle.evaluate( ( el ) => el.matches( 'a[href]' ) ) ) {
		await toggle.evaluate( ( el ) => el.focus( { focusVisible: true } ) );
		if ( 'true' !== await toggle.getAttribute( 'aria-expanded' ) ) {
			await toggle.press( 'ArrowDown' );
		}
		return;
	}
	if ( await toggle.isVisible() ) {
		await toggle.click( { force: true } );
		return;
	}
	await toggle.evaluate( ( el ) => el.click() );
}

// The reader's arguments: an inherited property's own paint is read on the default instances only, so a marked
// instance's read carries no `_own:` key for the slot finder to take as a change.
const args = ( instances, only ) => [ instances.length, CAL_PREFIX, READ_PROPS, elementPath.toString(), CAL_PSEUDO_PROPS, TEXT_PSEUDO_PROPS, only, OWN_INHERITED, instances.flatMap( ( inst, n ) => ( inst.isDefault ? [ n ] : [] ) ) ];

// One state instance under its trigger: hover or keyboard focus on the styled element (its panel opened first when
// it is hidden), the state's ancestor class added, or (open) the instance's own disclosure opened (lib/calibrate-open.mjs). A 'probe' state is entered by the first state-vocabulary
// mechanism that changes the setting's property (lib/calibrate-probe.mjs). Returns { read }, or { read: null, why } when it could not be read:
// why is 'hidden', 'no instance' or the error the browser raised.
async function readUnderTrigger( page, instances, n, inst ) {
	const one = async () => ( await page.evaluate( readInstancesInPage, args( instances, n ) ) )[ n ];
	if ( 'probe' === inst.trigger ) {
		const mark = await page.evaluate( markTargetInPage, [ CAL_PREFIX, n, inst.target, inst.companionClass ] );
		if ( ! mark || mark.missing ) {
			return { read: null, why: mark ? `no element matches ${ inst.target }` : 'no instance' };
		}
		const cdp = await page.context().newCDPSession( page );
		try {
			const r = await probeState( { page, cdp, read: one, rootSel: `.${ CAL_PREFIX }${ n }`, props: listedProperties( inst.row.css_property ), mechanisms: probeMechanisms( inst.row.css_state ) } );
			return r.read ? { read: r.read } : { read: null, why: r.why };
		} finally {
			await cdp.detach();
		}
	}
	if ( 'open' === inst.trigger ) {
		const mark = await page.evaluate( markOpenToggleInPage, [ CAL_PREFIX, n ] );
		if ( ! mark ) {
			return { read: null, why: 'no instance' };
		}
		if ( ! mark.toggle && ! mark.expanded ) {
			return { read: null, why: 'no disclosure to open' };
		}
		const close = mark.toggle ? await openOwnToggle( page, openToggle ) : null;
		const read = await one();
		close && await close();
		return read ? { read } : { read: null, why: 'no instance' };
	}
	if ( 'class' === inst.trigger ) {
		await page.evaluate( ( [ sel, cls ] ) => document.querySelector( sel )?.parentElement?.classList.add( cls ), [ `.${ CAL_PREFIX }${ n }`, inst.stateClass ] );
		await page.waitForTimeout( 400 );
		const read = await one();
		await page.evaluate( ( [ sel, cls ] ) => document.querySelector( sel )?.parentElement?.classList.remove( cls ), [ `.${ CAL_PREFIX }${ n }`, inst.stateClass ] );
		return read ? { read } : { read: null, why: 'no instance' };
	}
	let mark = await page.evaluate( markTargetInPage, [ CAL_PREFIX, n, inst.target, inst.companionClass ] );
	let opened = false;
	if ( mark && ! mark.visible && mark.toggle ) {
		await openToggle( page );
		await page.waitForTimeout( 500 );
		opened = true;
		mark = await page.evaluate( markTargetInPage, [ CAL_PREFIX, n, inst.target, inst.companionClass ] );
	}
	let read = null;
	let why = mark?.missing ? `no element matches ${ inst.target }` : ( mark ? 'hidden' : 'no instance' );
	if ( mark?.visible ) {
		const loc = page.locator( '[data-cr-target]' ).first();
		try {
			if ( 'focus' === inst.trigger ) {
				await loc.evaluate( ( el ) => el.focus( { focusVisible: true } ) );
			} else {
				await loc.scrollIntoViewIfNeeded();
				// A forced hover moves the real mouse to the target's centre without a hit test, so a fixed or sticky box
				// over that point (a sticky header, a site-wide footer banner) takes the hover and the read shows the rest
				// look. A covered target is scrolled to the middle of the viewport first.
				await loc.evaluate( ( el ) => {
					const r = el.getBoundingClientRect();
					const top = document.elementFromPoint( r.left + ( r.width / 2 ), r.top + ( r.height / 2 ) );
					if ( ! top || ! ( el === top || el.contains( top ) ) ) {
						el.scrollIntoView( { block: 'center', inline: 'center', behavior: 'instant' } );
					}
				} );
				await loc.hover( { force: true } );
			}
			await page.waitForTimeout( 500 );
			read = await one();
			why = read ? null : 'no instance';
		} catch ( e ) {
			// An element Playwright cannot scroll to or reach (it reported visible but sits where no scroll brings it into
			// view) leaves this instance unread, listed as missed with the browser's own error, instead of failing the
			// whole block's run.
			read = null;
			why = String( e?.message || e ).split( /\r?\n/ )[ 0 ].slice( 0, 200 );
		}
		await page.mouse.move( 0, 0 );
		await page.evaluate( () => document.activeElement?.blur() );
	}
	if ( opened ) {
		await page.keyboard.press( 'Escape' );
		await page.waitForTimeout( 300 );
	}
	if ( inst.companionClass ) {
		await page.evaluate( ( cls ) => document.querySelectorAll( `.${ cls }` ).forEach( ( e ) => e.classList.remove( cls ) ), inst.companionClass );
	}
	return read ? { read } : { read: null, why };
}

// One width of readAll: fills out[w], scrolled[w] and the missed lists.
async function readWidth( page, url, instances, w, { out, scrolled, scrollMissed, hoverMissed, hoverHit, hoverWhy = {}, settle = null, settleGone = null } ) {
	await page.setViewportSize( { width: w, height: 900 } );
	const response = await page.goto( `${ url }${ url.includes( '?' ) ? '&' : '?' }cb=${ Date.now() }`, { waitUntil: 'domcontentloaded', timeout: EDITOR_TIMEOUT_MS } );
	// Attached, not visible: a block may legitimately render hidden at a width (an empty header row), and its elements
	// are still read.
	try {
		await page.waitForSelector( `.${ CAL_PREFIX }0`, { state: 'attached', timeout: EDITOR_TIMEOUT_MS } );
	} catch {
		// The page loaded and the instance never appeared: the block rendered nothing (an early return in its render.php).
		const wrappers = await page.locator( '[class*="cr-cal-"]' ).count();
		// A server error is the page failing, not the build: a PHP fatal anywhere on it (a header block, a stale build)
		// renders no calibration wrapper either.
		if ( ! wrappers && response && response.status() >= 500 ) {
			throw new Error( `the calibration page at ${ w }px returned HTTP ${ response.status() } and holds none of the calibration wrappers (a server or PHP error on the page: check the site's PHP error log; a stale build/ synced to a mirror is one cause)` );
		}
		throw new Error( wrappers ? `the block rendered nothing inside its ${ wrappers } calibration wrapper(s) at ${ w }px (no .${ CAL_PREFIX }0 on the page)` : `the calibration page at ${ w }px holds none of the calibration wrappers (the build did not save, or the page is cached)` );
	}
	// A pass whose content a script builds after load (a fixture's wishlist rows, fetched over REST) names the element
	// it waits for (`settle`), and a block its script shows only after load (the wishlist panel prints `hidden` until its
	// REST reply) names what must be gone first (`settleGone`). A wait that times out leaves the read as it is rather
	// than failing the block.
	if ( settleGone ) {
		await page.waitForFunction( ( sel ) => ! document.querySelector( sel ), settleGone, { timeout: SETTLE_TIMEOUT_MS } ).catch( () => {} );
	}
	if ( settle ) {
		await page.waitForSelector( settle, { state: 'attached', timeout: SETTLE_TIMEOUT_MS } ).catch( () => {} );
	}
	await page.waitForTimeout( 800 );
	out[ w ] = await page.evaluate( readInstancesInPage, args( instances ) );
	const calibrationUrl = page.url();
	for ( const [ n, inst ] of instances.entries() ) {
		if ( ! [ 'hover', 'focus', 'class', 'probe', 'open' ].includes( inst.trigger ) ) {
			continue;
		}
		// Every state instance is read on this one loaded page, so a trigger that followed a link leaves each later
		// instance unread: the reason names the page it went to, not a missing instance.
		const left = page.url() !== calibrationUrl ? page.url() : null;
		const { read, why } = left
			? { read: null, why: `an earlier trigger left the calibration page for ${ left }` }
			: await readUnderTrigger( page, instances, n, inst );
		if ( read ) {
			out[ w ][ n ] = read;
			hoverHit.add( n );
		} else {
			( hoverWhy[ n ] ??= [] ).push( `${ w }px: ${ why }` );
			hoverMissed.includes( n ) || hoverMissed.push( n );
		}
	}
	if ( instances.some( ( i ) => 'scroll' === i.trigger ) ) {
		const readScrolled = async ( wait ) => {
			await page.evaluate( ( y ) => window.scrollTo( { top: y, behavior: 'instant' } ), SCROLL_Y );
			await page.waitForTimeout( wait );
			const all = await page.evaluate( readInstancesInPage, args( instances ) );
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
