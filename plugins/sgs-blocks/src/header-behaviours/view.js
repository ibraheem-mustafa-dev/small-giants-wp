/**
 * Header Behaviours — frontend view script (F1 + F2, Spec 37 FR-37-13; per-row Phase 1).
 *
 * Responsibilities:
 *   1. Publishes `--sgs-header-height` CSS custom property on :root and body
 *      via ResizeObserver so sticky headers don't obscure anchor targets
 *      (WCAG 2.4.11 — scroll-padding-top picks this up via CSS).
 *      The published number is the header's pinned BOTTOM EDGE: its `top`
 *      offset plus its height, the distance from the top of the viewport to the
 *      lowest point it occupies while pinned. Every consumer wants that
 *      distance, not the height; the two are the same number only while the
 *      header sits at `top: 0`, which a floating ("pill") header deliberately
 *      does not. Computed from the declared offset, not from where the header
 *      is on screen at the moment of measuring, so the value does not change
 *      with scroll position, a hide-on-scroll translation or an element above
 *      the header. The NAME is kept because the property is a published
 *      contract read by the theme, the plugin stylesheets and two block render
 *      paths.
 *      GATED (FR-37-40, 2026-07-26): the value is published ONLY while the
 *      header is actually PINNED; otherwise an explicit `0px`. See
 *      isHeaderPinned() for why this is measured, not inferred.
 *   2. Toggles scroll-STATE classes on the HEADER ELEMENT itself (NOT body —
 *      changed at Spec 35 T1.4 / FR-37-14, 2026-07-28, when the four header
 *      behaviours reshaped to tri-state {desktop,tablet,mobile} objects):
 *      is-header-scrolled / is-header-shrunk / is-header-scrolling-down.
 *      GATING moved server-side: sgs/site-header/render.php resolves each
 *      behaviour PER TIER via sgs_resolve_tier()/sgs_emit_tier_rules() and
 *      emits the CSS that gives these classes any visual effect ONLY inside
 *      the @media block for the tiers where that behaviour is ON — so this
 *      script can toggle all three classes UNCONDITIONALLY on scroll and let
 *      the per-instance scoped CSS decide whether anything happens at the
 *      current viewport width. This mirrors the per-row mechanism's OUTCOME
 *      (tier-correct behaviour) via a different, simpler ROUTE (CSS @media
 *      gating instead of JS matchMedia + data-attr scanning), because a
 *      header behaviour's "resting" state (sticky's position, transparent's
 *      position/background, shrink's transition setup) is fully static per
 *      tier and needs no runtime JS decision — only the SCROLL trigger does.
 *   3. The scroll listener is skipped entirely when the header carries no
 *      `data-sgs-header-scroll-behaviours` attr (emitted server-side only
 *      when at least one of transparent/shrink/hide-on-scroll resolves ON at
 *      ANY tier) — zero event overhead on headers without active behaviours.
 *   4. PER-ROW (Phase 1, additive, does NOT replace #2/#3 above): scans every
 *      `.sgs-row-behaviour` element (emitted by sgs/site-header-row +
 *      sgs/site-footer-row render.php when rowTransparent/rowHideOnScroll is
 *      ON for at least one device tier) and toggles ITS OWN state classes
 *      (is-row-scrolled / is-row-hidden) independently of every other row and
 *      of the header-level body-class path. Device tier is resolved via
 *      matchMedia at the project's 768/1024 breakpoints and re-evaluated on
 *      resize, so a row can be transparent on desktop only, for example.
 *   5. COLLAPSE-WHEN-PINNED (FR-37-40): while the header is measured as
 *      actually pinned, a header row hiding on scroll COLLAPSES to height 0
 *      instead of translating, so the header genuinely shrinks with no gap.
 *      When the header is not pinned the shipped translateY path is used
 *      unchanged — that byte-identical fallback is the regression test.
 *      Footer rows never collapse (footer rows get no sticky, D390).
 *
 * State classes for #2/#3 are toggled on document.body; CSS descends from
 * body. State classes for #4 are toggled on the ROW element itself; CSS
 * descends from the row's own class/uid (header-behaviours.css).
 *
 * Single shared passive scroll listener + requestAnimationFrame coalesce
 * throttle serves BOTH the header-level (#2/#3) and per-row (#4) paths.
 *
 * @package SGS\Blocks
 */

/* global ResizeObserver */

import { decideSectionTone } from './header-ink-tone.js';

( function () {
	'use strict';

	/**
	 * Section-adaptive header ink (Wave 3C U-13, §4.2) — exclusion selectors.
	 * Never look inside another header, a `<dialog>` (the drawer), the mega
	 * panel (a plain `div`, not a popover — cannot be excluded via `:popover-open`)
	 * or the detached burger chip (`.sgs-nav-bar-menu__detach`, printed at
	 * wp_footer by includes/nav-detach-chip.php).
	 */
	const SGS_INK_EXCLUDED_SELECTOR =
		'header.sgs-site-header, dialog, .wp-block-sgs-mega-panel, .sgs-nav-bar-menu__detach';

	/**
	 * Build a plain tone-decision descriptor from a real DOM element — the
	 * only place `getComputedStyle()`/`classList` are read for this feature,
	 * so `decideSectionTone()` itself stays pure and unit-testable.
	 *
	 * @param {Element} el
	 * @return {Object} See header-ink-tone.js::classifyStackElement().
	 */
	function sgsInkDescribeElement( el ) {
		const cs = window.getComputedStyle( el );
		return {
			tagName: el.tagName,
			hasToneClassDark: el.classList.contains( 'sgs-on-dark' ),
			hasToneClassLight: el.classList.contains( 'sgs-on-light' ),
			hasBackgroundImage: 'none' !== cs.backgroundImage,
			backgroundColor: cs.backgroundColor,
		};
	}

	/**
	 * Read the section behind ONE point and decide its tone, per §4.2.
	 *
	 * @param {number} x Viewport x.
	 * @param {number} y Viewport y.
	 * @return {'dark'|'light'|'unknown'|null}
	 */
	function sgsResolveSectionToneAt( x, y ) {
		if ( 'function' !== typeof document.elementsFromPoint ) {
			return null;
		}
		const stack = document
			.elementsFromPoint( x, y )
			.filter( function ( el ) {
				return ! el.closest || ! el.closest( SGS_INK_EXCLUDED_SELECTOR );
			} )
			.map( sgsInkDescribeElement );
		return decideSectionTone( stack );
	}

	/**
	 * Wire up section-adaptive ink for ONE header (Wave 3C U-13, §4.2).
	 *
	 * Its OWN listener start — deliberately NOT gated by
	 * `data-sgs-header-scroll-behaviours` (that attr is emitted only for
	 * Transparent/Shrink/Hide-on-scroll), so a header using section ink alone
	 * still gets its tone read. Skipped entirely when the header carries no
	 * `data-sgs-header-ink` (emitted server-side only when some tier resolves
	 * `adapt` — `blend` needs no JS at all).
	 *
	 * rAF-coalesced scroll/resize/load, and skips a tick when `scrollY` has
	 * moved under 4px since the last measurement (the section under a fixed
	 * point rarely changes on a sub-pixel scroll, and this keeps the
	 * `elementsFromPoint()` cost off every single scroll frame).
	 *
	 * @param {HTMLElement} header
	 */
	function initSectionInk( header ) {
		const liveAttr = header.dataset.sgsHeaderInk;
		if ( ! liveAttr ) {
			return;
		}

		// `<tier>:<always|rest|scrolled>` pairs (render.php, from
		// sgs_header_ink_live_state()): where and in which scroll state the
		// tone classes may be set. Outside that window both classes are
		// removed, so the ink, the tone fill and the logo's ground response
		// all stand down together.
		const liveByTier = {};
		liveAttr.split( /\s+/ ).forEach( function ( pair ) {
			const parts = pair.split( ':' );
			if ( 2 === parts.length ) {
				liveByTier[ parts[ 0 ] ] = parts[ 1 ];
			}
		} );

		function isLive() {
			const state = liveByTier[ getCurrentDeviceTier() ];
			if ( 'always' === state ) {
				return true;
			}
			const scrolled = header.classList.contains( 'is-header-scrolled' );
			return ( 'rest' === state && ! scrolled ) || ( 'scrolled' === state && scrolled );
		}

		let rafScheduled = false;
		let lastMeasuredScrollY = null;

		function apply() {
			let tone = '';
			if ( isLive() ) {
				const rect = header.getBoundingClientRect();
				// The switch point is the header's OWN vertical midpoint (§4.2),
				// where its ink sits.
				tone = sgsResolveSectionToneAt(
					rect.left + rect.width / 2,
					rect.top + rect.height / 2
				);
			}
			header.classList.toggle( 'is-header-on-dark', 'dark' === tone );
			header.classList.toggle( 'is-header-on-light', 'light' === tone );
		}

		function tick() {
			rafScheduled = false;
			const scrollY = window.scrollY;
			if (
				null !== lastMeasuredScrollY &&
				Math.abs( scrollY - lastMeasuredScrollY ) < 4
			) {
				return;
			}
			lastMeasuredScrollY = scrollY;
			apply();
		}

		function schedule() {
			if ( ! rafScheduled ) {
				rafScheduled = true;
				window.requestAnimationFrame( tick );
			}
		}

		function forceSchedule() {
			// A resize or a scroll-state flip changes the answer without the
			// page moving, so it bypasses the 4px skip.
			lastMeasuredScrollY = null;
			schedule();
		}

		window.addEventListener( 'scroll', schedule, { passive: true } );
		window.addEventListener( 'resize', forceSchedule, { passive: true } );
		window.addEventListener( 'load', apply );

		// `is-header-scrolled` is toggled by initScrollBehaviours() in its own
		// frame; a 'rest' or 'scrolled' window must re-check when it flips.
		let wasScrolled = header.classList.contains( 'is-header-scrolled' );
		new window.MutationObserver( function () {
			const scrolled = header.classList.contains( 'is-header-scrolled' );
			if ( scrolled !== wasScrolled ) {
				wasScrolled = scrolled;
				forceSchedule();
			}
		} ).observe( header, { attributes: true, attributeFilter: [ 'class' ] } );

		// Run once immediately — a page loaded mid-scroll (browser
		// back-navigation) or a resize-only layout shift must not wait for a
		// scroll event that may never come.
		apply();
	}

	/**
	 * Locate EVERY header element on the page, in document order.
	 *
	 * `sgs/site-header` carries no `parent`/`ancestor` restriction and is not
	 * hidden from the inserter, so a second instance is reachable: an operator
	 * can place one in page content beside the one the header engine renders,
	 * and site-header/render.php's own header note records the case of a
	 * template resolving the header slot twice. Each instance emits its own
	 * uid-scoped CSS and its own `data-sgs-header-*` attrs, so each needs its
	 * own state classes — a first-match-only lookup leaves every later header
	 * with CSS that nothing ever activates.
	 *
	 * @return {HTMLElement[]}
	 */
	function getHeaderEls() {
		return Array.prototype.slice.call(
			document.querySelectorAll( 'header.sgs-site-header' )
		);
	}

	/**
	 * Publish `--sgs-header-height` (integer px) to :root and body.
	 *
	 * @param {number} bottomEdge Px from the viewport top to the pinned header's
	 *                            lowest point, or 0 when it is not pinned.
	 */
	function publishHeight( bottomEdge ) {
		const value = Math.round( bottomEdge ) + 'px';
		document.documentElement.style.setProperty( '--sgs-header-height', value );
		document.body.style.setProperty( '--sgs-header-height', value );
	}

	/**
	 * Is the header ACTUALLY pinned to the viewport right now?
	 *
	 * MEASURED from the computed `position`, never inferred from the header's
	 * `headerSticky` setting or its `data-sgs-header-sticky` attribute. Those state
	 * intent for the header as a whole; the computed value states reality for the
	 * viewport tier in front of the visitor. `site-header/render.php` emits
	 * the `position` rule per tier through `sgs_merge_tri_state_declarations()`,
	 * so a header set to stick on desktop only computes an unpinned position on mobile, and
	 * a header set both sticky and transparent for one tier receives a single
	 * `position` declaration (sticky wins). Measuring also picks up a theme or
	 * CPT rule that pins the header by some other route.
	 *
	 * `fixed` counts as pinned for the same reason `sticky` does: the element
	 * occupies the top of the viewport when an anchor target lands.
	 *
	 * @param {HTMLElement} header
	 * @return {boolean} True when the header occupies the viewport top.
	 */
	function isHeaderPinned( header ) {
		const position = window.getComputedStyle( header ).position;
		return position === 'sticky' || position === 'fixed';
	}

	/**
	 * Find an ancestor that SILENTLY breaks `position: sticky` on the header.
	 *
	 * Any ancestor with `overflow` other than `visible`, or with
	 * `transform`/`perspective`/`filter` set, becomes the sticky element's
	 * containing block or scroll container — the header then pins to THAT
	 * instead of the viewport, or stops pinning altogether. There is no error
	 * and no visual tell until a visitor scrolls, which is why this is worth
	 * detecting rather than leaving to chance (FR-37-40 silent-failure guard).
	 *
	 * This also bounds what isHeaderPinned() can honestly claim: a header
	 * broken this way still COMPUTES `position: sticky`, so the measurement is
	 * accurate but misleading. We warn rather than changing the published
	 * value — an `overflow` ancestor may still be the page's own scroll
	 * container, in which case sticky works fine, and silently zeroing the
	 * height on an inferred cause would be a fix for an unproven diagnosis.
	 *
	 * @param {HTMLElement} header
	 * @return {{el: HTMLElement, property: string, value: string}|null} The
	 *     first breaking ancestor found, or null when none breaks sticky.
	 */
	function findStickyBreakingAncestor( header ) {
		let node = header.parentElement;
		while ( node && node !== document.documentElement ) {
			const cs = window.getComputedStyle( node );
			if ( 'none' !== cs.transform ) {
				return { el: node, property: 'transform', value: cs.transform };
			}
			if ( 'none' !== cs.perspective ) {
				return {
					el: node,
					property: 'perspective',
					value: cs.perspective,
				};
			}
			if ( 'none' !== cs.filter ) {
				return { el: node, property: 'filter', value: cs.filter };
			}
			for ( const prop of [ 'overflow', 'overflowX', 'overflowY' ] ) {
				if ( cs[ prop ] && 'visible' !== cs[ prop ] ) {
					return { el: node, property: prop, value: cs[ prop ] };
				}
			}
			node = node.parentElement;
		}
		return null;
	}

	/**
	 * Warn (console only, once) when the operator has asked for a sticky
	 * header that an ancestor silently prevents from pinning.
	 *
	 * Advisory, never a gate — consistent with the project rule that
	 * operator-facing feedback is informational (FR-37-40 / D4). It runs only
	 * when sticky was actually requested, so a non-sticky site stays silent.
	 *
	 * @param {HTMLElement} header
	 */
	function warnIfStickyIsSilentlyBroken( header ) {
		// "Float over the page" is position:fixed, which a transformed or
		// filtered ancestor breaks the same way, so it gets the same advisory.
		if (
			header.dataset.sgsHeaderSticky !== '1' &&
			header.dataset.sgsHeaderPassThrough !== '1'
		) {
			return;
		}
		const breaker = findStickyBreakingAncestor( header );
		if ( ! breaker ) {
			return;
		}
		// eslint-disable-next-line no-console
		console.warn(
			'[SGS] This header is set to stick, but an ancestor element prevents it: ' +
				'<' +
				breaker.el.tagName.toLowerCase() +
				( breaker.el.className
					? ' class="' + breaker.el.className + '"'
					: '' ) +
				'> has ' +
				breaker.property +
				': ' +
				breaker.value +
				'. Remove that property from the ancestor, or the header will not pin.'
		);
	}

	/**
	 * Wire up ResizeObserver for F1 (header-height publisher).
	 *
	 * ⚠ The published value is GATED on isHeaderPinned(). Publishing the height
	 * unconditionally (what shipped before FR-37-40) injected the full header
	 * height as dead space into EVERY scroll-into-view on pages whose header
	 * is not pinned — in-page anchor links, fragment navigation on load,
	 * find-in-page, `element.scrollIntoView()`, keyboard focus scrolling and
	 * scroll-snap all consume `:root { scroll-padding-top }`.
	 *
	 * The zero MUST be published EXPLICITLY. The CSS fallback in
	 * `var( --sgs-header-height, 0px )` fires only while the property is
	 * UNDEFINED — it does nothing once the property is defined, so simply
	 * skipping the write would leave a stale non-zero value in place.
	 *
	 * The pinned `top` offset is read from the computed style (`top` resolves to
	 * px; `auto` is not a number and counts as 0), so a floating header pinned
	 * `top: 1rem` below the viewport edge publishes 16 + its height.
	 *
	 * @param {HTMLElement} header
	 */
	function initHeightPublisher( header ) {
		// Last MEASURED border-box height, independent of the pinned gate, so
		// a pinned/unpinned flip can republish without waiting for a resize.
		let measuredHeight = header.getBoundingClientRect().height;

		// The published number is a BOTTOM EDGE, so the clamp belongs on the
		// SUM. Clamping the offset alone turns a negative `top` into 0 and then
		// adds the full height on top of it: a header pinned at `top: -20px`
		// with an 80px height has its bottom edge at 60, and clamping first
		// publishes 80 — 20px of dead space injected into every
		// scroll-into-view. A header pinned entirely above the viewport is the
		// case the clamp exists for, and that one still publishes 0.
		function pinnedBottomOffset() {
			const top = parseFloat( window.getComputedStyle( header ).top );
			return Math.max(
				0,
				( Number.isFinite( top ) ? top : 0 ) + measuredHeight
			);
		}

		function publishGated() {
			publishHeight( isHeaderPinned( header ) ? pinnedBottomOffset() : 0 );
		}

		if ( typeof ResizeObserver === 'undefined' ) {
			// Graceful degradation: publish once, still gated.
			publishGated();
			return;
		}

		const ro = new ResizeObserver( function ( entries ) {
			for ( const entry of entries ) {
				measuredHeight =
					entry.borderBoxSize && entry.borderBoxSize[ 0 ]
						? entry.borderBoxSize[ 0 ].blockSize
						: entry.contentRect.height;
			}
			publishGated();
		} );
		ro.observe( header );

		// A viewport resize can cross a breakpoint that changes the header's
		// `position` without changing its border-box height, so the observer
		// alone is not sufficient. rAF-coalesced; the getComputedStyle read
		// sits after layout, so it forces no extra reflow.
		let rafScheduled = false;
		window.addEventListener(
			'resize',
			function () {
				if ( ! rafScheduled ) {
					rafScheduled = true;
					window.requestAnimationFrame( function () {
						rafScheduled = false;
						measuredHeight = header.getBoundingClientRect().height;
						publishGated();
					} );
				}
			},
			{ passive: true }
		);

		// Initial publish — the observer fires on observe(), but publish now so
		// a fragment navigation on load reads a correct value immediately.
		publishGated();
	}

	/**
	 * Wire up the scroll listener for F2 behaviour state classes, toggled on
	 * the HEADER ELEMENT (not body — Spec 35 T1.4). All three classes are
	 * toggled UNCONDITIONALLY on every tick; the per-instance scoped CSS
	 * (site-header/render.php, sgs_emit_tier_rules()) decides per @media tier
	 * whether any of them has a visible effect, so this function needs no
	 * per-behaviour or per-tier branching — it just reflects scroll state.
	 * Skipped entirely when the header carries no
	 * `data-sgs-header-scroll-behaviours` attr (no tier of any behaviour is
	 * active), matching the previous getActiveBehaviours() perf gate.
	 *
	 * @param {HTMLElement} header
	 */
	function initScrollBehaviours( header ) {
		if ( header.dataset.sgsHeaderScrollBehaviours !== '1' ) {
			return;
		}

		let rafScheduled = false;
		let prevScrollY = window.scrollY;

		function onScrollTick() {
			rafScheduled = false;
			const scrollY = window.scrollY;

			// Transparent → opaque transition.
			header.classList.toggle( 'is-header-scrolled', scrollY > 50 );

			// Shrink — same threshold, own state class, independent CSS rule.
			header.classList.toggle( 'is-header-shrunk', scrollY > 50 );

			// Hide on scroll down — smart reveal (FR-37-13).
			if ( scrollY > 100 && scrollY > prevScrollY ) {
				header.classList.add( 'is-header-scrolling-down' );
			} else if ( scrollY <= prevScrollY ) {
				header.classList.remove( 'is-header-scrolling-down' );
			}

			prevScrollY = scrollY;
		}

		window.addEventListener(
			'scroll',
			function () {
				if ( ! rafScheduled ) {
					rafScheduled = true;
					window.requestAnimationFrame( onScrollTick );
				}
			},
			{ passive: true }
		);

		// Run once on load to set correct initial state (e.g. page loaded
		// mid-scroll after browser back-navigation).
		onScrollTick();
	}

	/**
	 * Resolve the CURRENT device tier via matchMedia, at the project's
	 * canonical 768/1024 breakpoints (SGS_BREAKPOINTS — mirrors
	 * utils/responsive.js MOBILE_MAX 767 / TABLET_MAX 1023; do not hardcode a
	 * second pair).
	 *
	 * @return {'desktop'|'tablet'|'mobile'}
	 */
	function getCurrentDeviceTier() {
		if ( window.matchMedia( '(max-width: 767px)' ).matches ) {
			return 'mobile';
		}
		if ( window.matchMedia( '(max-width: 1023px)' ).matches ) {
			return 'tablet';
		}
		return 'desktop';
	}

	/**
	 * Parse a space-separated tier-list data-attr value (e.g. "desktop
	 * tablet") into an array. Absent/empty attr → [] (behaviour off at every
	 * tier for this row).
	 *
	 * @param {string|undefined} value
	 * @return {string[]}
	 */
	function parseTierList( value ) {
		return ( value || '' ).split( ' ' ).filter( Boolean );
	}

	/**
	 * PER-ROW behaviour path (Phase 1). NEW parallel mechanism, additive to
	 * the header-level body-class path above (#2/#3) — does not read or write
	 * document.body state, and is skipped entirely when no row on the page
	 * carries `.sgs-row-behaviour` (zero overhead on pages without per-row
	 * behaviours). Each row's data-sgs-row-transparent /
	 * data-sgs-row-hide-on-scroll attrs list the tiers where that behaviour is
	 * ON (emitted by sgs/site-header-row + sgs/site-footer-row render.php via
	 * sgs_resolve_on_tiers(), Spec 35 T1.4). Toggles `is-row-scrolled` /
	 * `is-row-hidden` / `is-row-shrunk` (Phase 2) on the ROW element itself,
	 * independently per row.
	 */
	function initRowBehaviours() {
		const rows = document.querySelectorAll( '.sgs-row-behaviour' );
		if ( ! rows.length ) {
			return;
		}

		const rowData = Array.prototype.map.call( rows, function ( row ) {
			return {
				el: row,
				// The row's OWN header, not the page's first one — a row
				// belongs to whichever header contains it, and a footer row
				// resolves null here (footer rows never collapse, D390).
				headerEl: row.closest( 'header.sgs-site-header' ),
				transparentTiers: parseTierList(
					row.dataset.sgsRowTransparent
				),
				hideOnScrollTiers: parseTierList(
					row.dataset.sgsRowHideOnScroll
				),
				shrinkTiers: parseTierList( row.dataset.sgsRowShrink ),
				// Collapse bookkeeping (FR-37-40). `collapsed` is null until
				// the first collapse decision, so the very first tick does not
				// write an inline height onto a row that is already correct.
				collapsed: null,
				collapseTimer: null,
			};
		} );

		/**
		 * Is this row eligible to COLLAPSE rather than translate?
		 *
		 * True only while the row's OWN header is MEASURED as pinned. Footer
		 * rows are never eligible (they resolve no header — footer rows get no
		 * sticky, D390), and neither is a row whose header is not pinned, which
		 * is what keeps the shipped translate path byte-identical (the FR-37-40
		 * regression test).
		 *
		 * @param {Object} row
		 * @return {boolean} True when the collapse path applies.
		 */
		function rowCollapsesWhenHidden( row ) {
			return !! row.headerEl && isHeaderPinned( row.headerEl );
		}

		/**
		 * Read the transition duration the stylesheet actually declares, in ms.
		 *
		 * Never hardcoded: `prefers-reduced-motion` strips the transition, in
		 * which case this returns 0 and the inline height is cleared on the
		 * next frame instead of waiting for a `transitionend` that will never
		 * fire. Same fail-safe discipline as the drawer's exit animation
		 * (STOP-DIALOG-CLOSE-KILLS-THE-EXIT-ANIMATION).
		 *
		 * @param {HTMLElement} el
		 * @return {number} Duration in milliseconds; 0 when there is none.
		 */
		function transitionMs( el ) {
			const raw = window
				.getComputedStyle( el )
				.transitionDuration.split( ',' )[ 0 ]
				.trim();
			if ( raw.endsWith( 'ms' ) ) {
				return parseFloat( raw ) || 0;
			}
			return ( parseFloat( raw ) || 0 ) * 1000;
		}

		/**
		 * Drive a row between its natural height and zero.
		 *
		 * A browser cannot animate from `height: auto`, so the row's REAL
		 * height is measured and written as the animation's start value before
		 * the target is applied. The inline height is transient — it exists
		 * only for the duration of the transition and is cleared afterwards so
		 * the row returns to `auto` and keeps reflowing with its content (a
		 * left-behind fixed height would freeze the row at whatever size it
		 * had when a font swapped or the viewport changed).
		 *
		 * @param {Object}  row      Row bookkeeping object.
		 * @param {boolean} collapse True to collapse, false to restore.
		 */
		function setRowCollapsed( row, collapse ) {
			const el = row.el;
			if ( row.collapsed === collapse ) {
				return;
			}
			row.collapsed = collapse;
			window.clearTimeout( row.collapseTimer );

			if ( collapse ) {
				// Measure BEFORE the class lands — afterwards the padding is
				// already zeroed and the reading would be short.
				el.style.blockSize = el.getBoundingClientRect().height + 'px';
				// Force a style flush so the browser has a start value to
				// animate FROM; without it both writes coalesce into one frame
				// and the row snaps.
				void el.offsetHeight;
				el.classList.add( 'is-row-hidden' );
				el.style.blockSize = '0px';
			} else {
				el.classList.remove( 'is-row-hidden' );
				// The padding comes back with the class, so measuring now
				// would still read 0. Let the row lay itself out at its
				// natural size, capture that, then animate to it from 0.
				el.style.blockSize = '';
				const natural = el.getBoundingClientRect().height;
				el.style.blockSize = '0px';
				void el.offsetHeight;
				el.style.blockSize = natural + 'px';
			}

			// Hand the row back to `auto` once the animation has finished.
			row.collapseTimer = window.setTimeout(
				function () {
					if ( ! row.collapsed ) {
						el.style.blockSize = '';
					}
				},
				transitionMs( el ) + 50
			);
		}

		/**
		 * Remove every trace of the collapse path from a row.
		 *
		 * Called when a row stops being collapse-eligible — the header was
		 * unpinned, or the row's hide-on-scroll turned off at this tier. The
		 * inline height MUST go, or the row would stay frozen at a pixel size
		 * while the CSS-only translate path takes back over.
		 *
		 * @param {Object} row
		 */
		function clearCollapse( row ) {
			window.clearTimeout( row.collapseTimer );
			row.collapsed = null;
			row.el.style.blockSize = '';
			row.el.classList.remove( 'is-row-collapse-mode' );
		}

		let rafScheduled = false;
		let prevScrollY = window.scrollY;

		function onScrollTick() {
			rafScheduled = false;
			const scrollY = window.scrollY;
			const tier = getCurrentDeviceTier();
			const scrollingDown = scrollY > 100 && scrollY > prevScrollY;
			const scrollingUp = scrollY <= prevScrollY;

			rowData.forEach( function ( row ) {
				// Transparent → opaque, own state classes per row. The
				// resting-transparent CSS is keyed on `is-row-transparent-active`
				// (added ONLY on a tier where this row's transparent behaviour is
				// ON) — NOT on the data-attr's mere presence — so a row set
				// "transparent on desktop only" is NOT transparent on mobile/tablet.
				if ( row.transparentTiers.indexOf( tier ) !== -1 ) {
					row.el.classList.add( 'is-row-transparent-active' );
					row.el.classList.toggle(
						'is-row-scrolled',
						scrollY > 50
					);
				} else {
					row.el.classList.remove( 'is-row-transparent-active' );
					row.el.classList.remove( 'is-row-scrolled' );
				}

				// Hide on scroll down — smart reveal, own state class per row.
				//
				// TWO PATHS, chosen per tick (FR-37-40):
				//   • header NOT pinned → the shipped translateY path,
				//     untouched. No inline height is ever written, so this
				//     renders byte-identically to before this feature.
				//   • header IS pinned  → collapse to height 0 instead, so the
				//     header genuinely shrinks. `transform` never reclaims
				//     space, so translating here would leave a gap exactly the
				//     size of the hidden row.
				// The choice is re-made every tick because pinning can change
				// under the visitor (a breakpoint, or the operator toggling
				// sticky in the editor preview).
				if ( row.hideOnScrollTiers.indexOf( tier ) !== -1 ) {
					if ( rowCollapsesWhenHidden( row ) ) {
						row.el.classList.add( 'is-row-collapse-mode' );
						if ( scrollingDown ) {
							setRowCollapsed( row, true );
						} else if ( scrollingUp ) {
							setRowCollapsed( row, false );
						}
					} else {
						// Leaving collapse mode: drop the inline height first,
						// or the row stays frozen at a pixel size while the
						// translate path takes over.
						if ( null !== row.collapsed ) {
							clearCollapse( row );
						}
						if ( scrollingDown ) {
							row.el.classList.add( 'is-row-hidden' );
						} else if ( scrollingUp ) {
							row.el.classList.remove( 'is-row-hidden' );
						}
					}
				} else {
					if ( null !== row.collapsed ) {
						clearCollapse( row );
					}
					row.el.classList.remove( 'is-row-hidden' );
				}

				// Shrink (Phase 2) — own state classes per row, same
				// tier-gating discipline as transparent: the resting
				// (shrinkable) CSS is keyed on `is-row-shrink-active`, added
				// ONLY on a tier where this row's shrink is ON, so a row set
				// "shrink on desktop only" does not shrink on mobile.
				// `is-row-shrunk` additionally drives the chosen child's
				// display:none rule emitted by render.php.
				if ( row.shrinkTiers.indexOf( tier ) !== -1 ) {
					row.el.classList.add( 'is-row-shrink-active' );
					row.el.classList.toggle( 'is-row-shrunk', scrollY > 50 );
				} else {
					row.el.classList.remove( 'is-row-shrink-active' );
					row.el.classList.remove( 'is-row-shrunk' );
				}
			} );

			prevScrollY = scrollY;
		}

		function onScrollOrResize() {
			if ( ! rafScheduled ) {
				rafScheduled = true;
				window.requestAnimationFrame( onScrollTick );
			}
		}

		window.addEventListener( 'scroll', onScrollOrResize, {
			passive: true,
		} );
		// Re-evaluate on resize too — a row's active tier can change
		// (desktop→tablet→mobile) without a scroll event firing.
		window.addEventListener( 'resize', onScrollOrResize, {
			passive: true,
		} );

		// Run once on load to set correct initial per-row state.
		onScrollTick();
	}

	/**
	 * Boot F1, F2 (header-level) and per-row behaviours after the DOM is ready.
	 */
	function boot() {
		const headers = getHeaderEls();

		headers.forEach( function ( header, index ) {
			// F1 — publish header height for scroll-padding-top, GATED on the
			// header actually being pinned (FR-37-40). Publishes an explicit
			// `0px` when it is not; see initHeightPublisher().
			//
			// FIRST header only. `--sgs-header-height` is a SINGLE property on
			// :root serving scroll-padding-top, so a second publisher would
			// race the first and the winner would depend on resize order. The
			// banner landmark is the header at the top of the document, which
			// is the one an anchor target has to clear.
			if ( 0 === index ) {
				initHeightPublisher( header );
			}

			// F2 — scroll behaviour state; only active when a relevant flag
			// exists. Per instance: each header reads its own data-attr and
			// keeps its own scroll bookkeeping inside the call.
			initScrollBehaviours( header );

			// Section-adaptive ink (Wave 3C U-13) — its own independent listener
			// start; only active when the header carries `data-sgs-header-ink`.
			initSectionInk( header );

			// FR-37-40 silent-failure guard — advisory console warning only,
			// never a gate, and silent unless sticky was actually requested.
			warnIfStickyIsSilentlyBroken( header );
		} );

		// Per-row (Phase 1) — independent of header presence; also serves
		// footer rows. No-ops when no `.sgs-row-behaviour` row exists.
		initRowBehaviours();
	}

	if (
		document.readyState === 'complete' ||
		document.readyState === 'interactive'
	) {
		boot();
	} else {
		document.addEventListener( 'DOMContentLoaded', boot );
	}
} )();
