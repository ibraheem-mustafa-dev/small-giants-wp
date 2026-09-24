/**
 * SGS Mega disclosure — frontend interactivity for the desktop mega/dropdown panel.
 *
 * A SEPARATE Interactivity store from the drawer's `store('sgs/nav')` (CF-3,
 * BUILD-SPEC §0.5): the drawer is a full-screen MODAL engine (focus-trap,
 * scroll-lock, body-reparent, `showModal`); the mega is a POSITIONED DISCLOSURE
 * (anchored under its trigger, content-sized, NOT scroll-locked, NOT `inert`,
 * NOT top-layer). Sharing a store would couple the two and risk regressing the
 * live drawer, so this module registers its own `store('sgs/mega')` and shares
 * NONE of the drawer orchestration.
 *
 * This module is deliberately self-contained — it does NOT import from
 * `store.js`, which exports only `{ actions, FOCUSABLE_SELECTOR }`;
 * `getFocusable`/`prefersReducedMotion` are declared but
 * NOT exported. Importing even the one exported constant would pull store.js's
 * `store('sgs/nav')` registration into this block's bundle, re-coupling the two.
 * The three tiny pure helpers are therefore re-implemented locally, keeping the
 * drawer store untouched (CF-3).
 *
 * Handles: hover-intent open (300ms, non-touch) / tap (touch) / keyboard
 * throughout; a bar+panel hover BRIDGE with a 170ms close-grace + cancel-on-
 * re-enter (CF-13 — the deterministic fallback core) PLUS a geometric safe
 * triangle (FR-36-4) layered in front of it: while the pointer is tracking
 * into the currently-open panel, hover-open on any OTHER trigger is deferred
 * rather than firing early just because the pointer's screen path happened to
 * cross that trigger's bounding box on the way. The triangle is additive —
 * whenever its geometry is unavailable (no panel open, no pointer samples yet)
 * behaviour falls straight through to the unchanged 170ms bridge; edge-overflow
 * reposition via CSS-var VALUES only (no inline `style=""` declaration,
 * Spec 32); single-open; ESC + focus-return; WCAG 1.4.13
 * (dismissible/hoverable/persistent).
 *
 * Markup contract (emitted by sgs/nav-bar-menu via `nav-menu-markup.php`), decoupled from BEM:
 *   - the disclosure ROOT carries `data-wp-interactive="sgs/mega"` + a context
 *     `{ isOpen, megaId, intentDelay, closeGrace }` and wraps BOTH the trigger
 *     and the panel (so moving the pointer trigger→panel never leaves the root —
 *     that IS the hover bridge);
 *   - the trigger button carries `[data-sgs-mega-trigger]` + `aria-expanded`;
 *   - the panel carries `[data-sgs-mega-panel]`.
 *
 * @package SGS\Blocks
 */

import { store, getContext, getElement } from '@wordpress/interactivity';
import {
	boundsFromHeaderRect,
	viewportBounds,
	placePanel,
	PANEL_ALIGNS,
} from './panel-bounds';

/** Focusable-elements selector — inlined (see file header). */
const FOCUSABLE_SELECTOR =
	'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** True when the visitor asked the OS to reduce motion. Inlined (see file header). */
function prefersReducedMotion() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(prefers-reduced-motion: reduce)' ).matches
	);
}

/** True on a device with a real hover-capable pointer (desktop) — gates hover-intent. */
function canHover() {
	return (
		typeof window !== 'undefined' &&
		typeof window.matchMedia === 'function' &&
		window.matchMedia( '(hover: hover) and (pointer: fine)' ).matches
	);
}

/** Ordered focusable descendants of a container. Inlined (see file header). */
function getFocusable( container ) {
	if ( ! container ) {
		return [];
	}
	return Array.from( container.querySelectorAll( FOCUSABLE_SELECTOR ) ).filter(
		( el ) => el.offsetParent !== null || el === document.activeElement
	);
}

/**
 * Per-disclosure open-intent / close-grace timers, keyed by megaId. Kept at
 * module scope (not on the reactive context) because a timer handle is not
 * reactive state.
 *
 * @type {Map<string,{open:number|null,close:number|null}>}
 */
const timers = new Map();

/** Get (or create) the timer record for a disclosure. */
function timersFor( megaId ) {
	let rec = timers.get( megaId );
	if ( ! rec ) {
		rec = { open: null, close: null };
		timers.set( megaId, rec );
	}
	return rec;
}

/** Clear any pending open-intent timer for a disclosure. */
function clearOpenTimer( megaId ) {
	const rec = timersFor( megaId );
	if ( rec.open !== null ) {
		window.clearTimeout( rec.open );
		rec.open = null;
	}
}

/** Clear any pending close-grace timer for a disclosure. */
function clearCloseTimer( megaId ) {
	const rec = timersFor( megaId );
	if ( rec.close !== null ) {
		window.clearTimeout( rec.close );
		rec.close = null;
	}
}

/** The disclosure ROOT for the currently-directed element. */
function rootFor( ref ) {
	return ref.closest( '[data-wp-interactive="sgs/mega"]' ) || ref;
}

/**
 * Safe-triangle state (FR-36-4). Kept at module scope, mirroring the
 * `timers` Map above — none of it is reactive state, so it does not belong
 * on the Interactivity context.
 *
 * `activePanelRect` is a snapshot of the currently-open panel's bounding box,
 * refreshed by `repositionPanel()` every time a disclosure opens (reusing
 * that existing measurement rather than taking a second one). `triangleLast`/
 * `triangleCurrent` are the two most recent pointer samples, rAF-throttled so
 * a fast-moving mouse cannot spam this module with dozens of samples a
 * second.
 */
let activePanelRect = null;
let triangleLast = null;
let triangleCurrent = null;
let triangleRaf = null;
let triangleMoveHandler = null;

/** How often a suppressed hover-open re-polls the triangle geometry. */
const TRIANGLE_RECHECK_MS = 60;

/**
 * rAF-throttled `mousemove` sampler — keeps only the last two points.
 *
 * @param {MouseEvent} event The document-level mousemove event.
 */
function onTriangleMove( event ) {
	if ( triangleRaf !== null ) {
		return;
	}
	const point = { x: event.clientX, y: event.clientY };
	triangleRaf = window.requestAnimationFrame( () => {
		triangleRaf = null;
		triangleLast = triangleCurrent;
		triangleCurrent = point;
	} );
}

/**
 * Attach/detach the document-level pointer sampler, gated strictly on
 * whether ANY disclosure is open. Idempotent — safe to call after every
 * `state.openMegaId` mutation so the listener never outlives an open panel
 * (a leaked document-level `mousemove` would be a defect, not a feature).
 */
function syncTriangleWatcher() {
	if ( state.openMegaId && ! triangleMoveHandler ) {
		triangleMoveHandler = onTriangleMove;
		document.addEventListener( 'mousemove', triangleMoveHandler, {
			passive: true,
		} );
	} else if ( ! state.openMegaId && triangleMoveHandler ) {
		document.removeEventListener( 'mousemove', triangleMoveHandler );
		triangleMoveHandler = null;
		if ( triangleRaf !== null ) {
			window.cancelAnimationFrame( triangleRaf );
			triangleRaf = null;
		}
		triangleLast = null;
		triangleCurrent = null;
		activePanelRect = null;
	}
}

/**
 * Signed area helper for the point-in-triangle test below.
 *
 * @param {{x:number,y:number}} p1 First point.
 * @param {{x:number,y:number}} p2 Second point.
 * @param {{x:number,y:number}} p3 Third point.
 */
function triangleSign( p1, p2, p3 ) {
	return (
		( p1.x - p3.x ) * ( p2.y - p3.y ) - ( p2.x - p3.x ) * ( p1.y - p3.y )
	);
}

/**
 * True when point `pt` falls inside triangle `a`-`b`-`c`.
 *
 * @param {{x:number,y:number}} pt The point to test.
 * @param {{x:number,y:number}} a  Triangle vertex one.
 * @param {{x:number,y:number}} b  Triangle vertex two.
 * @param {{x:number,y:number}} c  Triangle vertex three.
 */
function pointInTriangle( pt, a, b, c ) {
	const d1 = triangleSign( pt, a, b );
	const d2 = triangleSign( pt, b, c );
	const d3 = triangleSign( pt, c, a );
	const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
	const hasPos = d1 > 0 || d2 > 0 || d3 > 0;
	return ! ( hasNeg && hasPos );
}

/**
 * True when the pointer's last two samples are heading INTO the currently-
 * open OTHER panel — i.e. the trajectory from `triangleLast` to
 * `triangleCurrent` falls inside the triangle formed with that panel's two
 * top corners (the edge nearest the trigger bar, since panels are anchored
 * below it). False whenever any input is unavailable, which is exactly the
 * "geometry cannot be computed" fallback case — the caller then behaves
 * identically to the pre-existing 170ms bridge.
 *
 * @param {Object} ctx The calling disclosure's Interactivity context.
 */
function isHeadingIntoOpenPanel( ctx ) {
	if ( ! state.openMegaId || state.openMegaId === ctx.megaId ) {
		return false;
	}
	if ( ! activePanelRect || ! triangleLast || ! triangleCurrent ) {
		return false;
	}
	const topLeft = { x: activePanelRect.left, y: activePanelRect.top };
	const topRight = { x: activePanelRect.right, y: activePanelRect.top };
	return pointInTriangle( triangleCurrent, triangleLast, topLeft, topRight );
}

/**
 * Schedule (or re-poll) an intent-delayed open, gated by the safe triangle.
 * Reuses the SAME `rec.open` timer record the pre-existing bridge already
 * used — never a third timer channel. When the geometry says the pointer is
 * heading into another already-open panel, the open is deferred and re-
 * checked every `TRIANGLE_RECHECK_MS`; the moment that stops being true (or
 * no panel is open / no samples exist yet) this opens on the very next tick,
 * so the worst case beyond the declared `delay` is one short poll interval.
 *
 * @param {Object}      ctx   The disclosure's Interactivity context.
 * @param {HTMLElement} root  The disclosure root.
 * @param {number}      delay Milliseconds until the next check/open.
 */
function scheduleIntentOpen( ctx, root, delay ) {
	const rec = timersFor( ctx.megaId );
	rec.open = window.setTimeout( () => {
		rec.open = null;
		if ( isHeadingIntoOpenPanel( ctx ) ) {
			scheduleIntentOpen( ctx, root, TRIANGLE_RECHECK_MS );
			return;
		}
		ctx.isOpen = true;
		state.openMegaId = ctx.megaId;
		syncTriangleWatcher();
		syncOutsideClickWatcher();
		repositionPanel( root );
	}, delay );
}

/**
 * The box a panel is positioned against, measured.
 *
 * Returns the viewport for every header shipping today, so the arithmetic in
 * `repositionPanel` below is unchanged for them. A header that renders as a
 * floating pill — `data-sgs-header-float` present AND genuinely inset at the
 * visitor's current width — returns the pill's own box instead.
 *
 * The attribute is only a hint that measuring is worthwhile: float can be on
 * for one device tier and off for another, and the collapse breakpoint turns
 * the pill back into a full-width bar, so the rect decides.
 *
 * @param {HTMLElement} root The disclosure root.
 * @return {{left: number, right: number, floating: boolean}} Bounding box.
 */
function panelBounds( root ) {
	/*
	 * The page's visible width, not `window.innerWidth`: innerWidth includes a
	 * classic scrollbar, so a panel centred on it sat half a scrollbar (7px on
	 * desktop Windows Chrome) right of the page's centre, measured live on
	 * /qa-scrim/ (2026-09-25). `documentElement.clientWidth` is the width the
	 * page is laid out in on every platform, and equals innerWidth wherever
	 * scrollbars overlay.
	 */
	const pageWidth = document.documentElement.clientWidth;
	const header = root.closest( 'header.sgs-site-header[data-sgs-header-float]' );
	if ( ! header ) {
		return viewportBounds( pageWidth );
	}
	return boundsFromHeaderRect( header.getBoundingClientRect(), pageWidth );
}

/**
 * Reposition a panel that overflows the right viewport edge — expressed purely
 * as CSS custom-property VALUES (`--sgs-mm-overflow-left/-right`), never a
 * direct `.style.left/.style.right` assignment (Spec 32 no-inline). style.css
 * reads this pair, so clearing the vars restores the default alignment.
 *
 * TWO KINDS, ONE FUNCTION. A MEGA panel centres on the viewport;
 * a DROPDOWN aligns to its own trigger. The kind is read from the disclosure
 * root's `data-sgs-nav-disclosure` attribute rather than passed in as an
 * argument, and that is deliberate: this function is called from FIVE separate
 * open paths, and a parameter would have to be set correctly at every one of
 * them or three would centre while two did not. Reading it from the DOM makes
 * the five call sites identical and removes the divergence risk
 * entirely — the element itself carries what it is.
 *
 * `activePanelRect` is captured BEFORE either branch and re-captured after the
 * geometry write, on both paths. The safe-triangle (FR-36-4) depends on that
 * snapshot, so a branch that skipped it would silently disable hover-intent
 * rather than fail visibly.
 *
 * @param {HTMLElement} root The disclosure root.
 */
function repositionPanel( root ) {
	const panel = root.querySelector( '[data-sgs-mega-panel]' );
	if ( ! panel ) {
		return;
	}
	panel.style.removeProperty( '--sgs-mm-overflow-left' );
	panel.style.removeProperty( '--sgs-mm-overflow-right' );
	panel.style.removeProperty( '--sgs-mm-tx' );
	window.requestAnimationFrame( () => {
		/*
		 * Centre the panel on the BAR, clamped to the viewport. The CSS
		 * `left:50% / translateX(-50%)` default
		 * CANNOT do this: every `.sgs-nav-bar-menu__item` is position:relative
		 * (style.css — required so links paint above the indicator pill), so
		 * the wrap's containing block is the ~100px MENU ITEM, the centred
		 * rect always overflows, and an edge-pin would glue the panel to the
		 * item's own left/right edge — visibly off-centre. The panel can only
		 * ever OPEN with JS (the store flips
		 * aria-expanded), so JS owns the geometry: place it per the operator's
		 * alignment, clamp with the draft's 28px gutters, and express the
		 * result purely as CSS-var VALUES relative to the wrap's offsetParent
		 * (Spec 32 — never a direct style.left write).
		 *
		 * A dropdown sizes to its own content, so a width left over from a
		 * `full-width` open at another tier is cleared before it is measured.
		 */
		if ( root.dataset.sgsNavDisclosure === 'dropdown' ) {
			panel.style.removeProperty( '--sgs-mm-panel-width' );
		}
		const rect = panel.getBoundingClientRect();
		// Safe-triangle (FR-36-4): reuse this existing measurement as the
		// snapshot other triggers check their pointer trajectory against —
		// no second layout read.
		activePanelRect = rect;

		/*
		 * VERTICAL BOUND — publish the panel's own available height as a custom-
		 * property VALUE (Spec 32; a direct `style.maxHeight` write is a property
		 * declaration and is not permitted). `nav-menu/render.php`'s
		 * `.sgs-nav-bar-menu__mega-panel-wrap` and `.sgs-nav-bar-menu__submenu-wrap` rules
		 * read `--sgs-mm-panel-max-h`, keeping the older header-derived expression
		 * behind it as the no-JS / pre-first-open floor.
		 *
		 * MEASURED, never derived. The bound must NOT come from
		 * `--sgs-header-height`: that is a scroll-padding token, and
		 * `header-behaviours/view.js::publishHeight` is called as
		 * `publishHeight( isHeaderPinned( header ) ? measuredHeight : 0 )`, writing
		 * INLINE on documentElement/body — which outranks the theme's static
		 * `:root` value. `sgs/site-header`'s `block.json::attributes.headerSticky`
		 * defaults to `{}`, so a NON-STICKY header is the framework default and the
		 * token resolves to `0px`. A derived bound therefore collapsed to
		 * `calc(100dvh - 16px)` while the panel's top edge still sat a header-height
		 * down the viewport, and the panel overflowed the bottom again — the very
		 * defect the bound was added to fix. It passed live verification only
		 * because the canary's header IS sticky.
		 *
		 * Cause-agnostic: asking the panel where its own top edge actually is holds
		 * for a sticky, static, tall, short, hidden or absent header, and for a
		 * non-SGS theme too.
		 *
		 * MEASURED FROM WHERE THE PANEL WILL BE, NOT WHERE IT IS. `rect.top` is
		 * the panel's CURRENT top — the stylesheet's `top: 100%` off its own
		 * menu item. For a full-width header that is also its final top, so the
		 * expression is the shipped one. Under a floating pill it is NOT: the
		 * mega branch below republishes `--sgs-mm-panel-top` as the PILL's
		 * bottom edge, which sits below the menu item by the header's bottom
		 * padding, and the panel then drops by that difference while a max-height
		 * derived from the old top stays put. The panel's bottom lands at
		 * `innerHeight - GUTTER + ( bounds.bottom - rect.top )` — it eats the
		 * gutter first and runs past the viewport bottom once the difference
		 * exceeds it. (`--sgs-mm-panel-top` is not cleared between opens, so a
		 * re-open measured correctly and only the first open was wrong, which is
		 * what made it easy to miss.)
		 *
		 * A dropdown is unaffected and must stay so: it keeps `top: 100%` off its
		 * own trigger, so nothing republishes its top edge.
		 *
		 * GUTTER matches render.php's fallback expression; MIN_PANEL_MAX_H keeps
		 * an oddly-measured panel usable rather than collapsing it to nothing.
		 */
		const GUTTER = 16;
		const MIN_PANEL_MAX_H = 200;
		const isDropdown = root.dataset.sgsNavDisclosure === 'dropdown';
		/*
		 * The box everything below is positioned against — the viewport for a
		 * full-width header, the pill's own box for a floating one. Every
		 * expression reduces to the shipped arithmetic when this is the
		 * viewport; `scripts/tests/test-panel-bounds.mjs` proves that on a grid
		 * of inputs rather than leaving it to a reading.
		 */
		const bounds = panelBounds( root );
		const parent = panel.offsetParent;
		if ( ! parent ) {
			return;
		}
		const parentRect = parent.getBoundingClientRect();
		const anchor = root.getBoundingClientRect();

		/*
		 * TOP EDGE — the header's bottom, for both kinds (Spec 36 FR-36-4 "Gap
		 * below the header"; the offset is added in CSS as
		 * `calc(var(--sgs-mm-panel-top, 100%) + <submenuTopOffset>)`). Every
		 * reference measures the gap from the header, not from the menu item.
		 * A floating pill publishes its own bottom; a bar in no header keeps the
		 * stylesheet's `100%`.
		 */
		const headerBottom = panelTopEdge( root, bounds );
		if ( null !== headerBottom ) {
			panel.style.setProperty(
				'--sgs-mm-panel-top',
				`${ ( headerBottom - parentRect.top ).toFixed( 2 ) }px`
			);
		} else {
			panel.style.removeProperty( '--sgs-mm-panel-top' );
		}

		/*
		 * PLACEMENT — one vocabulary for both kinds (panel-bounds.js::placePanel):
		 * a dropdown reads `data-sgs-nav-submenu-align` (`submenuAlign`), a mega
		 * panel reads `--sgs-nbm-mega-align`, the per-tier `megaAlign` written by
		 * render.php as a custom-property value. Collision clamping is always on
		 * and structural, never a client toggle: the alignment is a preference,
		 * overridden only where the panel would actually be clipped.
		 */
		const align = isDropdown
			? root.dataset.sgsNavSubmenuAlign || 'start'
			: readMegaAlign( root );
		const placed = placePanel( {
			align: PANEL_ALIGNS.includes( align ) ? align : ( isDropdown ? 'start' : 'page-centred' ),
			isDropdown,
			anchorLeft: anchor.left,
			anchorWidth: anchor.width,
			width: rect.width,
			bounds,
			gutter: 28,
		} );
		if ( null !== placed.width ) {
			panel.style.setProperty( '--sgs-mm-panel-width', `${ placed.width.toFixed( 2 ) }px` );
		} else {
			panel.style.removeProperty( '--sgs-mm-panel-width' );
		}
		panel.style.setProperty( '--sgs-mm-tx', '0px' );
		panel.style.setProperty(
			'--sgs-mm-overflow-left',
			`${ ( placed.left - parentRect.left ).toFixed( 2 ) }px`
		);

		/*
		 * Measured AFTER the moves above, so both values describe where the
		 * panel now is.
		 *
		 * VERTICAL BOUND — the panel's own available height, published as a
		 * custom-property VALUE (Spec 32; a direct `style.maxHeight` write would
		 * be a property declaration). MEASURED, never derived from
		 * `--sgs-header-height`: that is a scroll-padding token that resolves to
		 * 0 on a non-sticky header (the framework default), so a derived bound
		 * let the panel overflow the viewport bottom. Asking the panel where its
		 * top edge is holds for any header, sticky, static, tall, hidden or
		 * absent. MIN_PANEL_MAX_H keeps an oddly-measured panel usable.
		 *
		 * HOVER BRIDGE — the distance from the menu item's bottom to the panel's
		 * top (the header's bottom padding plus the offset), which the pointer
		 * crosses over neither element. The disclosure root's `::after` (published
		 * on the root, the element that owns the hover) takes this height so
		 * the parent item keeps its hover PAINT across it (Spec 41 FR-41-11);
		 * openness is the close grace's job, not the bridge's.
		 */
		const placedRect = panel.getBoundingClientRect();
		/*
		 * The panel's RESTING top, from its computed `top` (the header bottom plus
		 * the offset), never from the rect: an entry animation (U-5's fade-lift
		 * starts 8px up) moves the rect, and a bridge sized from the rect then left
		 * an 8px dead strip above the panel (measured live, 2026-09-25).
		 */
		const restingTop =
			parentRect.top + ( parseFloat( window.getComputedStyle( panel ).top ) || 0 );
		panel.style.setProperty(
			'--sgs-mm-panel-max-h',
			`${ Math.max(
				window.innerHeight - restingTop - GUTTER,
				MIN_PANEL_MAX_H
			).toFixed( 2 ) }px`
		);
		root.style.setProperty(
			'--sgs-mm-bridge-h',
			`${ Math.max( 0, restingTop - anchor.bottom ).toFixed( 2 ) }px`
		);
		// Re-snapshot for the safe-triangle (FR-36-4) now the panel has moved.
		activePanelRect = placedRect;
		reparentPanelIfNeeded( root, panel, state.openMegaId );
	} );
}

/**
 * The top edge a panel hangs from: a floating pill's own bottom, else the
 * header's bottom, else the bar's header row's bottom, else null (the
 * stylesheet's `100%` holds).
 *
 * @param {HTMLElement} root   The disclosure root.
 * @param {Object}      bounds The bounding box from panelBounds().
 * @return {number|null} Viewport y of the edge, or null.
 */
function panelTopEdge( root, bounds ) {
	if ( bounds.floating && null !== bounds.bottom ) {
		return bounds.bottom;
	}
	const host =
		root.closest( '.sgs-site-header' ) || root.closest( '.sgs-site-header-row' );
	if ( ! host ) {
		return null;
	}
	const hostRect = host.getBoundingClientRect();
	return hostRect.height > 0 ? hostRect.bottom : null;
}

/**
 * The mega panel's placement at the visitor's current tier: render.php writes
 * the per-tier `megaAlign` as `--sgs-nbm-mega-align`, so the browser has
 * already resolved the tier.
 *
 * @param {HTMLElement} root The disclosure root.
 * @return {string} A PANEL_ALIGNS value (unset: `page-centred`).
 */
function readMegaAlign( root ) {
	const value = window
		.getComputedStyle( root )
		.getPropertyValue( '--sgs-nbm-mega-align' )
		.trim();
	return PANEL_ALIGNS.includes( value ) ? value : 'page-centred';
}

/**
 * Panels currently reparented to `<body>` for the sticky-header stacking fix,
 * keyed by megaId so
 * `watchOpenState` — which only ever sees the reactive `ctx`, never the DOM
 * — can find and reverse the move on close. Per-open/per-close, unlike the
 * drawer's PERMANENT `reparented` WeakSet in store.js: a disclosure
 * panel must return to its rendered position once closed, not live in
 * `<body>` forever, since it is a normal in-flow part of the page for the
 * vast majority of instances (the header placement never reparents at all).
 *
 * @type {Map<string,{panel:HTMLElement,root:HTMLElement,originalParent:Node,originalNextSibling:Node|null,focusHandler:Function}>}
 */
const reparentedPanels = new Map();

/**
 * `:has()` ancestor-highlight rescue. `reparentPanelIfNeeded()` below moves the panel
 * (the `[data-sgs-mega-panel]` wrap, containing `ul.sgs-nav-bar-menu__submenu`)
 * OUT of `.sgs-nav-bar-menu__submenu-root` while open — but two `nav-menu-css.php`
 * rules key off that exact containment via `:has(ul.sgs-nav-bar-menu__submenu …)`
 * anchored on the still-in-place `.sgs-nav-bar-menu__submenu-root`: the
 * current-PAGE ancestor highlight (`a[aria-current="page"]` descendant, a
 * STATIC per-page-load fact) and the keyboard-focus ancestor highlight
 * (`:focus-visible` descendant, a LIVE fact that changes as focus moves).
 * `:has()` cannot see a descendant that is no longer a descendant, so both
 * rules go dark for exactly as long as the panel is reparented.
 *
 * Fix: while reparented, mirror each fact onto `root` (which never moves) as
 * a data-attribute CSS can key on directly instead of `:has()`. The static
 * fact is computed once at reparent-time; the live one is kept in sync via a
 * `focusin`/`focusout` listener on the panel for the duration of the
 * reparent, then torn down in `revertReparent()`. Both flags are removed on
 * revert — once the panel returns to the DOM, `:has()` alone is authoritative
 * again, so leaving a stale flag behind would risk shadowing a future,
 * genuinely-different `:has()` result.
 *
 * One shared mechanism for both `nav-menu-css.php` rules and both the
 * bar-hover and keyboard-focus open paths (this fires from the same
 * `reparentPanelIfNeeded()` call regardless of how the panel was opened).
 *
 * @param {HTMLElement} panel The reparented panel.
 * @param {HTMLElement} root  The disclosure root (`.sgs-nav-bar-menu__submenu-root`).
 * @return {Function} The `focusin`/`focusout` handler to remove on revert.
 */
function attachAncestorFlagWatcher( panel, root ) {
	if ( panel.querySelector( 'a[aria-current="page"]' ) ) {
		root.setAttribute( 'data-sgs-nav-has-current', '' );
	}
	const syncFocusFlag = () => {
		const focused =
			panel.contains( document.activeElement ) &&
			document.activeElement.matches( ':focus-visible' );
		root.toggleAttribute( 'data-sgs-nav-has-focus', focused );
	};
	panel.addEventListener( 'focusin', syncFocusFlag );
	panel.addEventListener( 'focusout', syncFocusFlag );
	syncFocusFlag();
	return syncFocusFlag;
}

/**
 * Reverse `attachAncestorFlagWatcher()` — drop both flags and the listener.
 *
 * @param {HTMLElement} panel       The panel being un-reparented.
 * @param {HTMLElement} root        The disclosure root.
 * @param {Function}    focusHandler The handler returned by the attach call.
 */
function detachAncestorFlagWatcher( panel, root, focusHandler ) {
	panel.removeEventListener( 'focusin', focusHandler );
	panel.removeEventListener( 'focusout', focusHandler );
	root.removeAttribute( 'data-sgs-nav-has-current' );
	root.removeAttribute( 'data-sgs-nav-has-focus' );
}

/**
 * True when this disclosure sits inside page content rather than the site
 * header. The header's own dropdowns never need this fix — the header
 * template part is `position:sticky;z-index:100` and already outranks page
 * content by construction — whereas a page-embedded disclosure sits inside
 * `sgs/container`'s child-lift rule (`container/style.css`, load-bearing,
 * NOT to be touched), which creates a stacking context capping the panel
 * below the header regardless of the panel's own z-index.
 *
 * @param {HTMLElement} root The disclosure root.
 * @return {boolean} True if this disclosure needs the body-reparent fix.
 */
function needsStackingFix( root ) {
	return ! root.closest( '.sgs-site-header' );
}

/**
 * Attach/detach a single document-level scroll+resize listener, gated
 * strictly on whether ANY panel is currently reparented — mirroring
 * `syncTriangleWatcher()`'s idempotent attach/detach shape immediately
 * above. A reparented panel is frozen at a MEASURED screen position (see
 * `reparentPanelIfNeeded()`); scrolling or resizing invalidates that
 * measurement, so rather than tracking it live (no header/page layout needs
 * that fidelity for a transient disclosure) the panel simply closes, same
 * as most comparable dropdown/mega-menu implementations. Closing routes
 * through `state.openMegaId = null`, which every open disclosure's own
 * `watchOpenState` callback already reacts to (single-open mechanism,
 * unchanged) — no new close path, just a new trigger for the existing one.
 */
let fixedScrollHandler = null;
function syncFixedScrollWatcher() {
	if ( reparentedPanels.size && ! fixedScrollHandler ) {
		fixedScrollHandler = () => {
			state.openMegaId = null;
		};
		window.addEventListener( 'scroll', fixedScrollHandler, { passive: true } );
		window.addEventListener( 'resize', fixedScrollHandler, { passive: true } );
	} else if ( ! reparentedPanels.size && fixedScrollHandler ) {
		window.removeEventListener( 'scroll', fixedScrollHandler );
		window.removeEventListener( 'resize', fixedScrollHandler );
		fixedScrollHandler = null;
	}
}

/**
 * Reparent an open panel to `<body>` and freeze it at its own already-
 * computed screen position — a DISCLOSURE-scoped reparent (FR-36-10), never
 * the DIALOG reparent `store.js::reparentToBody` does for the drawer: no
 * scroll-lock, no focus trap, no backdrop, and it reverses itself on close
 * (see `revertReparent()`).
 *
 * Called AFTER `repositionPanel()`'s existing alignment/collision/centring
 * math has already run and settled the panel into its correct
 * `position:absolute` layout for this open — `getBoundingClientRect()` at
 * that point already IS the correct screen position (viewport-relative
 * regardless of `position:absolute` vs `fixed`), so this needs no second
 * geometry pass and cannot drift from what `repositionPanel()` decided.
 *
 * No-op for a header-placed disclosure (`needsStackingFix()` false) and a
 * no-op if this megaId is already reparented (idempotent, matching
 * `reparentToBody`'s own idempotency guard in store.js).
 *
 * @param {HTMLElement} root   The disclosure root.
 * @param {HTMLElement} panel  The panel element (`[data-sgs-mega-panel]`).
 * @param {string}      megaId This disclosure's megaId.
 */
function reparentPanelIfNeeded( root, panel, megaId ) {
	if ( ! needsStackingFix( root ) || reparentedPanels.has( megaId ) ) {
		return;
	}
	const rect = panel.getBoundingClientRect();
	// Snapshot the `:has()` ancestor facts onto `root` BEFORE the move, while
	// the panel is still a descendant and both facts are still cheap/correct
	// to read straight off the live DOM (see `attachAncestorFlagWatcher()`).
	const focusHandler = attachAncestorFlagWatcher( panel, root );
	reparentedPanels.set( megaId, {
		panel,
		root,
		originalParent: panel.parentNode,
		originalNextSibling: panel.nextSibling,
		focusHandler,
	} );
	// CSS-var VALUES only (Spec 32 no-inline) — style.css's
	// `[data-sgs-nav-fixed]` rule reads these two and switches the panel to
	// `position:fixed`.
	panel.style.setProperty( '--sgs-mm-fixed-top', `${ rect.top.toFixed( 2 ) }px` );
	panel.style.setProperty( '--sgs-mm-fixed-left', `${ rect.left.toFixed( 2 ) }px` );
	panel.setAttribute( 'data-sgs-nav-fixed', '' );
	document.body.appendChild( panel );
	syncFixedScrollWatcher();
}

/**
 * Reverse `reparentPanelIfNeeded()` — move the panel back to exactly where
 * it originally rendered and drop the fixed-mode markers, so it returns to
 * its normal `position:absolute` layout the next time it opens. A no-op
 * when this megaId was never reparented (the common case: every header
 * placement, or a page-content one that never opened).
 *
 * @param {string} megaId The disclosure's megaId.
 */
function revertReparent( megaId ) {
	const rec = reparentedPanels.get( megaId );
	if ( ! rec ) {
		return;
	}
	reparentedPanels.delete( megaId );
	const { panel, root, originalParent, originalNextSibling, focusHandler } = rec;
	detachAncestorFlagWatcher( panel, root, focusHandler );
	if ( originalParent ) {
		originalParent.insertBefore( panel, originalNextSibling );
	}
	panel.removeAttribute( 'data-sgs-nav-fixed' );
	panel.style.removeProperty( '--sgs-mm-fixed-top' );
	panel.style.removeProperty( '--sgs-mm-fixed-left' );
	syncFixedScrollWatcher();
}

/**
 * Close the currently-open disclosure when a click lands outside both its
 * root and its panel — the dismissal path on touch devices. Without this,
 * once a panel is
 * open on touch the ONLY way to dismiss it is re-tapping the same trigger —
 * ESC is unavailable and there is no hover to leave.
 *
 * Deliberately `closest()`-based rather than a stored root/panel reference —
 * mirrors `rootFor()`'s own idiom above. A click landing inside ANY
 * `[data-wp-interactive="sgs/mega"]` root is treated as "inside" regardless
 * of WHICH disclosure that root belongs to: clicking a different trigger
 * while this one is open is a legitimate "switch dropdown" interaction
 * already handled by the existing single-open mechanism (`watchOpenState`
 * above), not by this listener, so doing nothing here for that click is
 * correct, not a gap. A REPARENTED panel (`reparentPanelIfNeeded()`) is no
 * longer a DOM descendant of its root once moved to `<body>`, so it is
 * checked separately via the same `[data-sgs-mega-panel][data-sgs-nav-fixed]`
 * marker pair that function already sets — no new state needed.
 *
 * Bubble-phase `click`, matching the drawer's own `onBackdropClick` idiom in
 * `store.js`, NOT `pointerdown`: a trigger's own `data-wp-on--click` handler
 * runs first (target-to-root, before this document-level listener reaches
 * the end of the SAME bubble), so by the time this runs on a tap that just
 * OPENED a panel, `ctx.isOpen`/`state.openMegaId` are already set and the
 * trigger itself is inside its own root — `closest()` finds it and this
 * function returns early. That ordering is what prevents the open-then-
 * immediately-closes-itself race: this listener never sees "outside" on the
 * very click that opened the panel.
 *
 * @param {MouseEvent} event The document-level click event.
 */
function onOutsideClick( event ) {
	const target = event.target;
	if (
		target.closest &&
		( target.closest( '[data-wp-interactive="sgs/mega"]' ) ||
			target.closest( '[data-sgs-mega-panel][data-sgs-nav-fixed]' ) )
	) {
		return;
	}
	if ( state.openMegaId ) {
		state.openMegaId = null;
		syncTriangleWatcher();
		syncOutsideClickWatcher();
	}
}

/** The currently-attached document-level outside-click listener, or null. */
let outsideClickHandler = null;

/** The currently-attached document-level Escape listener, or null. */
let escapeHandler = null;

/**
 * Escape anywhere on the page closes an open panel. A panel opened by hover
 * leaves keyboard focus wherever it was (usually the page body), so the
 * trigger's and panel's own keydown handlers never see the key. Presses inside
 * a disclosure are left to those handlers, which also return focus.
 *
 * @param {KeyboardEvent} event The document-level keydown event.
 */
function onDocumentEscape( event ) {
	if ( event.key !== 'Escape' && event.key !== 'Esc' ) {
		return;
	}
	const target = event.target;
	if (
		target &&
		target.closest &&
		( target.closest( '[data-wp-interactive="sgs/mega"]' ) ||
			target.closest( '[data-sgs-mega-panel][data-sgs-nav-fixed]' ) )
	) {
		return;
	}
	if ( state.openMegaId ) {
		state.openMegaId = null;
		syncTriangleWatcher();
		syncOutsideClickWatcher();
	}
}

/**
 * Attach/detach the document-level outside-click listener, gated strictly on
 * whether ANY disclosure is open — mirrors `syncTriangleWatcher()`'s and
 * `syncFixedScrollWatcher()`'s idempotent attach/detach shape above. Called
 * at every call site that already calls `syncTriangleWatcher()` (the two
 * share the exact same gating condition — `state.openMegaId` truthy/falsy —
 * so they are kept in lock-step rather than introducing a second, divergent
 * source of truth for "is anything open").
 */
function syncOutsideClickWatcher() {
	if ( state.openMegaId && ! outsideClickHandler ) {
		outsideClickHandler = onOutsideClick;
		document.addEventListener( 'click', outsideClickHandler );
	} else if ( ! state.openMegaId && outsideClickHandler ) {
		document.removeEventListener( 'click', outsideClickHandler );
		outsideClickHandler = null;
	}
	// The page-level Escape listener shares the same "anything open" gate.
	if ( state.openMegaId && ! escapeHandler ) {
		escapeHandler = onDocumentEscape;
		document.addEventListener( 'keydown', escapeHandler );
	} else if ( ! state.openMegaId && escapeHandler ) {
		document.removeEventListener( 'keydown', escapeHandler );
		escapeHandler = null;
	}
}

/** Move keyboard focus to the first focusable element inside the open panel. */
function focusFirstInPanel( root ) {
	const panel = root.querySelector( '[data-sgs-mega-panel]' );
	if ( ! panel ) {
		return;
	}
	window.requestAnimationFrame( () => {
		const first = panel.querySelector( FOCUSABLE_SELECTOR );
		if ( first ) {
			first.focus( { preventScroll: prefersReducedMotion() } );
		}
	} );
}

/** Return focus to the disclosure's trigger button. */
function focusTrigger( root ) {
	const trigger = root.querySelector( '[data-sgs-mega-trigger]' );
	if ( trigger ) {
		trigger.focus( { preventScroll: prefersReducedMotion() } );
	}
}

const { state } = store( 'sgs/mega', {
	state: {
		/** The megaId of the single currently-open disclosure, or null. */
		openMegaId: null,
	},
	actions: {
		/** Open this disclosure now (shared by hover-intent, tap and keyboard). */
		open() {
			const ctx = getContext();
			const { ref } = getElement();
			ctx.isOpen = true;
			state.openMegaId = ctx.megaId;
			syncTriangleWatcher();
			syncOutsideClickWatcher();
			repositionPanel( rootFor( ref ) );
		},

		/** Close this disclosure (does not move focus). */
		close() {
			const ctx = getContext();
			ctx.isOpen = false;
			if ( state.openMegaId === ctx.megaId ) {
				state.openMegaId = null;
				syncTriangleWatcher();
				syncOutsideClickWatcher();
			}
		},

		/** Toggle on click/tap. On touch (no hover) this is the sole open path. */
		toggle( event ) {
			if ( event ) {
				event.preventDefault();
			}
			const ctx = getContext();
			const { ref } = getElement();
			const root = rootFor( ref );
			clearOpenTimer( ctx.megaId );
			clearCloseTimer( ctx.megaId );
			if ( ctx.isOpen ) {
				ctx.isOpen = false;
				if ( state.openMegaId === ctx.megaId ) {
					state.openMegaId = null;
					syncTriangleWatcher();
					syncOutsideClickWatcher();
				}
			} else {
				ctx.isOpen = true;
				state.openMegaId = ctx.megaId;
				syncTriangleWatcher();
				syncOutsideClickWatcher();
				repositionPanel( root );
				focusFirstInPanel( root );
			}
		},

		/**
		 * Pointer entered the bridge (trigger OR panel). Cancel any pending
		 * close, and on a hover-capable device schedule an intent-delayed open —
		 * gated by the safe triangle (FR-36-4): if another panel is already
		 * open AND the pointer is currently tracking into it, the open is
		 * deferred and re-polled rather than firing early.
		 *
		 * The delay is the operator's `submenuIntentDelay` (default 80ms), carried in
		 * the context as `intentDelay`. It is not just an open-panel delay: the chevron
		 * flip (`nav-menu-submenu-css.php`'s `[aria-expanded="true"] .sgs-nav-bar-menu__caret`
		 * rule) and the panel's own `display:block` are BOTH keyed off the SAME
		 * `aria-expanded`/`context.isOpen` value this timer sets. 80ms swallows a fast
		 * mouse-sweep across the bar (a ~100px item is crossed in well under 80ms)
		 * while feeling instant to a pointer that stops on an item, the classic
		 * hover-intent range (~80-150ms).
		 *
		 * In `click` open mode (`ctx.openOn`) hover never opens: the trigger's click
		 * (`toggle`) is the open path, exactly as on touch.
		 */
		enterBridge() {
			const ctx = getContext();
			clearCloseTimer( ctx.megaId );
			if ( ! canHover() || ctx.isOpen || 'click' === ctx.openOn ) {
				return;
			}
			const { ref } = getElement();
			const root = rootFor( ref );
			clearOpenTimer( ctx.megaId );
			const delay = Number.isFinite( ctx.intentDelay )
				? ctx.intentDelay
				: 80;
			scheduleIntentOpen( ctx, root, delay );
		},

		/**
		 * Pointer left the bridge. Cancel any pending open, and schedule a
		 * grace-delayed close so a diagonal trigger→panel path does not slam it
		 * shut. Not in `click` open mode: a click-opened panel stays open until it is
		 * clicked again, dismissed with Escape, or a click lands outside it.
		 */
		leaveBridge() {
			const ctx = getContext();
			if ( ! canHover() || 'click' === ctx.openOn ) {
				return;
			}
			clearOpenTimer( ctx.megaId );
			const rec = timersFor( ctx.megaId );
			clearCloseTimer( ctx.megaId );
			const grace = Number.isFinite( ctx.closeGrace ) ? ctx.closeGrace : 170;
			rec.close = window.setTimeout( () => {
				rec.close = null;
				ctx.isOpen = false;
				if ( state.openMegaId === ctx.megaId ) {
					state.openMegaId = null;
					syncTriangleWatcher();
					syncOutsideClickWatcher();
				}
			}, grace );
		},

		/** Keyboard on the trigger: Enter/Space toggle, ArrowDown/Down opens. */
		triggerKeydown( event ) {
			const ctx = getContext();
			const { ref } = getElement();
			const root = rootFor( ref );
			const key = event.key;

			if ( key === 'Enter' || key === ' ' || key === 'Spacebar' ) {
				event.preventDefault();
				clearOpenTimer( ctx.megaId );
				clearCloseTimer( ctx.megaId );
				ctx.isOpen = ! ctx.isOpen;
				state.openMegaId = ctx.isOpen ? ctx.megaId : null;
				syncTriangleWatcher();
				syncOutsideClickWatcher();
				if ( ctx.isOpen ) {
					repositionPanel( root );
					focusFirstInPanel( root );
				}
				return;
			}

			if ( key === 'ArrowDown' || key === 'Down' ) {
				event.preventDefault();
				if ( ! ctx.isOpen ) {
					ctx.isOpen = true;
					state.openMegaId = ctx.megaId;
					syncTriangleWatcher();
					syncOutsideClickWatcher();
					repositionPanel( root );
				}
				focusFirstInPanel( root );
				return;
			}

			if ( key === 'Escape' || key === 'Esc' ) {
				event.preventDefault();
				ctx.isOpen = false;
				state.openMegaId = null;
				syncTriangleWatcher();
				syncOutsideClickWatcher();
			}
		},

		/**
		 * Keyboard inside the panel: Escape closes + returns focus; Tab off the
		 * last (or Shift+Tab off the first) focusable closes and returns focus,
		 * so the disclosure never traps (FR-36-10 — NOT a modal).
		 */
		panelKeydown( event ) {
			const ctx = getContext();
			const { ref } = getElement();
			const root = rootFor( ref );

			if ( event.key === 'Escape' || event.key === 'Esc' ) {
				event.preventDefault();
				ctx.isOpen = false;
				state.openMegaId = null;
				syncTriangleWatcher();
				syncOutsideClickWatcher();
				focusTrigger( root );
				return;
			}

			if ( event.key === 'Tab' ) {
				const panel = root.querySelector( '[data-sgs-mega-panel]' );
				const focusables = getFocusable( panel );
				if ( ! focusables.length ) {
					return;
				}
				const isLast = event.target === focusables[ focusables.length - 1 ];
				const isFirst = event.target === focusables[ 0 ];
				if ( ( ! event.shiftKey && isLast ) || ( event.shiftKey && isFirst ) ) {
					ctx.isOpen = false;
					state.openMegaId = null;
					syncTriangleWatcher();
					syncOutsideClickWatcher();
					// Let focus continue naturally to the next/previous element
					// outside the panel; only sync the disclosure state.
				}
			}
		},
	},
	callbacks: {
		/**
		 * Single-open: closes this disclosure whenever its own `isOpen`
		 * disagrees with the shared `state.openMegaId` — both "another
		 * disclosure opened" and "nothing is open any
		 * more" (`state.openMegaId === null`), which is exactly the state the
		 * `pageshow`/bfcache reset below produces.
		 */
		watchOpenState() {
			const ctx = getContext();
			if ( ctx.isOpen && state.openMegaId !== ctx.megaId ) {
				ctx.isOpen = false;
				clearOpenTimer( ctx.megaId );
				clearCloseTimer( ctx.megaId );
			}
			// Funnels EVERY close path through one reversal, not just this
			// branch's forced-close: self-initiated closes (close(), the
			// toggle() close branch, Escape/Tab in triggerKeydown/
			// panelKeydown) already set `ctx.isOpen = false` themselves
			// before this callback re-runs (data-wp-watch re-fires on any
			// tracked dependency change, including one this same callback
			// just wrote above), and the scroll/resize close
			// (`syncFixedScrollWatcher`) only ever sets
			// `state.openMegaId = null`, relying entirely on this callback
			// to close + revert. `revertReparent()` is a no-op for a
			// disclosure that was never reparented (every header
			// placement), so this costs nothing for the common case.
			if ( ! ctx.isOpen ) {
				revertReparent( ctx.megaId );
			}
		},
	},
} );

/**
 * bfcache (`pageshow`) reset — registered ONCE at module scope, never per
 * disclosure instance (a page can host several nav instances; N duplicate
 * listeners would be a leak).
 *
 * The back/forward cache restores the JS heap EXACTLY as it was frozen
 * (web.dev bfcache docs; real breakage recorded in Hyvä's Magento docs), so a
 * mega panel left open when the visitor navigated away would come back open
 * on Back/Forward — nothing errors, it just looks broken. A normal load
 * fires `pageshow` with `event.persisted === false`, so this is a strict
 * no-op on every ordinary page load.
 *
 * Reuses the SAME teardown primitives every other close path already uses
 * (`clearOpenTimer`/`clearCloseTimer`/`syncTriangleWatcher`) rather than a
 * second, parallel cleanup routine. Resetting `state.openMegaId` to null then
 * lets the existing `watchOpenState` callback above close each disclosure's
 * own `ctx.isOpen` on its next reactive tick — exactly the mechanism it
 * already uses when a different disclosure takes over as the open one.
 */
if ( typeof window !== 'undefined' ) {
	window.addEventListener( 'pageshow', ( event ) => {
		if ( ! event.persisted ) {
			return;
		}
		timers.forEach( ( rec, megaId ) => {
			clearOpenTimer( megaId );
			clearCloseTimer( megaId );
		} );
		if ( triangleRaf !== null ) {
			window.cancelAnimationFrame( triangleRaf );
			triangleRaf = null;
		}
		triangleLast = null;
		triangleCurrent = null;
		activePanelRect = null;
		state.openMegaId = null;
		syncTriangleWatcher();
		syncOutsideClickWatcher();
		// Defensive, ahead of the reactive watchOpenState path above: a
		// bfcache restore replays the JS heap exactly as frozen (see the
		// module docblock), so a panel reparented to <body> when the
		// visitor navigated away would otherwise still be sitting there —
		// revert every one immediately rather than waiting a reactive tick.
		Array.from( reparentedPanels.keys() ).forEach( revertReparent );
	} );
}
