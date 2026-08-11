/**
 * Global device toggle — ONE device switcher for the whole inspector.
 *
 * Replaces ~192 per-control Desktop/Tablet/Mobile strips (68 <ResponsiveControl>
 * JSX call sites across 31 files), every one of which read and wrote the SAME
 * WordPress state: `core/editor`'s getDeviceType/setDeviceType. This renders that
 * state once, DOCKED AT THE BOTTOM EDGE of the block inspector, and drives the
 * canvas preview.
 *
 * ⚑ Two corrections to this paragraph, both found by a QC council (2026-08-10):
 * it said "at the top", which the shipped code contradicts — Bean rejected the
 * top dock on sight because it pushes the controls a client actually uses further
 * down on every edit. And "73 call sites across 32 files" was a RAW GREP LINE
 * COUNT quoted as a call-site count; 5 of those lines are JSDoc prose. The real
 * figures are 68 / 31.
 *
 * Design + the probe evidence behind every decision below:
 *   .claude/plans/2026-08-10-global-device-toggle-design.md
 *
 * Three things here look like over-engineering and are not. Each was measured on
 * the canary (WP 7.0.2, both editors, 2026-08-10):
 *
 *   1. MutationObserver on `.interface-interface-skeleton` (D2 / probe P4).
 *      A store-only trigger is INCOMPLETE. Toggling distraction-free DESTROYS and
 *      recreates `.block-editor-block-inspector` while
 *      `getActiveComplementaryArea` never changes — so a useSelect-driven
 *      re-render never fires and the portal orphans permanently. Enumerating
 *      events was proven to be whack-a-mole; observing the one ancestor that
 *      survives every measured state is complete by construction.
 *      Cost is low: the canvas is a separate IFRAME document, so typing never
 *      reaches this observer — only sidebar/header chrome does.
 *
 *   2. document.body.contains() before reusing a cached node (D2 / probe P3).
 *      The detached node was measured returning false. A cached ref goes stale on
 *      a Page/Block tab switch, a sidebar close, and a distraction-free toggle.
 *
 *   3. A bounded rAF retry (D2). The replacement node arrives on a LATER React
 *      commit than the event that destroyed it, so one synchronous query can run
 *      a tick early and find nothing. Self-terminating — NOT a second observer.
 *
 * ⛔ NOT placed in conditional-visibility.js: that file is wrapped end-to-end in a
 *    window.__sgsConditionalVisibilityRegistered guard (:64-65 … :630). If that
 *    guard trips, this toggle would vanish product-wide and every responsive
 *    control would lose its switcher — a runtime failure no source-reading gate
 *    can see.
 *
 * ⛔ role="tablist" is NOT used (D3). DeviceTabs renders role="tab"/aria-selected
 *    with no tabpanel and no aria-controls. For a per-setting strip that is a
 *    tolerated stretch; for a control that changes what every OTHER control means
 *    it is a WCAG 4.1.2 defect — the role promises content-switching. This is a
 *    radio group, which is what ToggleGroupControl renders. Spec 35 Part H names
 *    ToggleGroupControl canonical for segmented choice.
 *
 * ⛔ NO persistence (D4, Bean-decided 2026-08-10). Every fresh editor load starts
 *    on Desktop. A deliberate deviation from GenerateBlocks' localStorage: it
 *    makes "editing in Tablet unaware" structurally unreachable, because the
 *    client can only be in Tablet if they chose it in that sitting. Do NOT
 *    "restore" localStorage as a missing feature.
 *
 * @package SGS\Blocks
 */
import { registerPlugin } from '@wordpress/plugins';
import { useSelect, useDispatch } from '@wordpress/data';
import { useState, useEffect, useRef, createPortal } from '@wordpress/element';
import {
	// ⛔ The `__experimental` prefix is REQUIRED on this WordPress version, and
	// aliasing it is the established pattern in every one of this plugin's five
	// other callers (nav-menu/edit.js:38-39, ContainerWrapperControls.js:51-52,
	// fx.js:39-40, before-after/BooleanResponsiveControl.js:44-45). The
	// unprefixed names are NOT exported: `wp.components.ToggleGroupControl` is
	// literally `undefined` at runtime, which React reports only as minified
	// error #130 ("element type is invalid… got: undefined") — it builds clean,
	// passes every prebuild gate, and fails silently in the browser.
	VisuallyHidden,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * Guard against double registration.
 *
 * registerPlugin warns-and-no-ops on a duplicate name rather than throwing, so
 * "renders once by construction" holds only while this file is imported from
 * exactly one place. That invariant has been broken in this repo before — a
 * direct block-level import of animation.js once produced two Animation panels
 * on every block (D148). Matches the identical pattern in animation.js:109,
 * parallax.js:49, responsive-visibility.js and conditional-visibility.js:64.
 */
if ( ! window.__sgsResponsiveDeviceToggleRegistered ) {
window.__sgsResponsiveDeviceToggleRegistered = true;

/**
 * The device tiers, in the casing `setDeviceType()` expects.
 *
 * ⛔ Capitalised deliberately. WordPress's own getDeviceType() returns
 * 'Desktop'/'Tablet'/'Mobile' (verified live). The nearest in-repo precedent —
 * nav-menu/edit.js:613 — uses lowercase values for its OWN block attribute;
 * copying that casing here silently breaks the core API call.
 */
const DEVICES = [
	{ value: 'Desktop', label: __( 'Desktop', 'sgs-blocks' ) },
	{ value: 'Tablet', label: __( 'Tablet', 'sgs-blocks' ) },
	{ value: 'Mobile', label: __( 'Mobile', 'sgs-blocks' ) },
];

/**
 * Plain-English warning shown while the client is editing a non-desktop tier.
 *
 * Needed because core surfaces NO persistent device indicator anywhere: the
 * header's View button is byte-identical in Desktop and Tablet (same aria-label,
 * same classes, same single <svg>, no text), and <body> carries no device class.
 * The device state lives only inside a collapsed dropdown. Measured, both
 * editors — see design doc P2.
 */
const CUE_TEXT = {
	Tablet: __(
		"You're editing the tablet view — changes here won't show on desktop.",
		'sgs-blocks'
	),
	Mobile: __(
		"You're editing the mobile view — changes here won't show on desktop or tablet.",
		'sgs-blocks'
	),
};

/**
 * The one ancestor that survives every measured editor state.
 *
 * Measured 2026-08-10: `.interface-interface-skeleton__sidebar` is ABSENT in
 * distraction-free mode and REPLACED when leaving it, while this node is the
 * same object throughout. Observing it is therefore complete regardless of which
 * event caused the inspector to be rebuilt.
 */
const OBSERVE_ROOT_SELECTOR = '.interface-interface-skeleton';

/**
 * The sidebar SHELL — where the toggle docks.
 *
 * ⚑ Not the block inspector. Docking inside the inspector meant the toggle only
 * reached the bottom edge when the panel content happened to be taller than the
 * viewport; on a block with few settings it sat directly beneath the last panel,
 * adding to the visual noise instead of separating from it (Bean, 2026-08-10).
 *
 * This shell is `position: relative` and full-height already (measured: 866px,
 * `overflow: hidden`, one child), so a child can be absolutely pinned to its
 * bottom edge with NO override of core layout — no flex rewrite of the panel
 * chain, no min-height arithmetic against the header.
 */
const SIDEBAR_SHELL_SELECTOR = '.interface-interface-skeleton__sidebar';

/** The scroll container, used only to decide whether the sidebar is open. */
const SIDEBAR_SCROLLER_SELECTOR = '.interface-complementary-area';

/**
 * The editor's bottom breadcrumb strip ("Page › SGS Container › Label").
 *
 * The cue lives HERE rather than floating over the canvas. Measured
 * 2026-08-10: `display:flex`, 25px tall, white, one child (the breadcrumb), so
 * appending a second flex child with `margin-left:auto` right-aligns it against
 * existing chrome instead of covering the design. A centred floating pill was
 * the first attempt and obscured the bottom of the tablet/mobile canvas — the
 * exact area being reviewed.
 */
const FOOTER_SELECTOR = '.interface-interface-skeleton__footer';

/** Max rAF attempts when re-acquiring the portal target. */
const MAX_ACQUIRE_FRAMES = 5;

/**
 * Resolve the sidebar shell to dock into — but ONLY while the sidebar is
 * actually open.
 *
 * The shell itself survives the sidebar being closed (measured: same node
 * throughout), so its presence alone is not a visibility signal. The scroller
 * having real width is: when the client closes the sidebar it collapses to zero.
 * Without this check the toggle would render into a zero-width shell and either
 * vanish silently or bleed over the canvas.
 *
 * @return {HTMLElement|null} The shell when the sidebar is open, else null.
 */
function findDockTarget() {
	const shell = document.querySelector( SIDEBAR_SHELL_SELECTOR );
	if ( ! shell || ! document.body.contains( shell ) ) {
		return null;
	}
	const scroller = shell.querySelector( SIDEBAR_SCROLLER_SELECTOR );
	if ( ! scroller || scroller.getBoundingClientRect().width < 40 ) {
		return null;
	}
	return shell;
}

/**
 * Maintain a host element pinned to the bottom edge of the sidebar shell.
 *
 * ⚑ Two placements were tried and rejected before this one, both by Bean on
 * sight rather than by any assertion:
 *   1. TOP of the inspector — pushed every control the client actually came to
 *      use further down the page, on every edit, for a control touched rarely.
 *   2. BOTTOM of the inspector — only reached the bottom edge when the panel
 *      content happened to overflow. On a block with few settings it sat right
 *      under the last panel, adding noise instead of separating from it.
 * Docking to the shell pins it to the bottom edge unconditionally.
 *
 * @return {HTMLElement|null} The host to portal into, or null when the sidebar
 *                            is closed or its chrome is removed
 *                            (distraction-free mode).
 */
function useInspectorPortalHost() {
	const [ host, setHost ] = useState( null );
	const frameRef = useRef( null );
	const hostRef = useRef( null );

	useEffect( () => {
		let cancelled = false;
		let attempts = 0;

		if ( ! hostRef.current ) {
			hostRef.current = document.createElement( 'div' );
			hostRef.current.className = 'sgs-device-toggle-host';
		}
		const hostEl = hostRef.current;

		/** @return {boolean} True when the host is already correctly placed. */
		const isSettled = () => {
			const dock = findDockTarget();
			return !! dock && dock.lastChild === hostEl;
		};

		// The replacement inspector arrives on a LATER React commit than the
		// mutation that removed the old one, so one query can run a tick early.
		const acquire = () => {
			if ( cancelled ) {
				return;
			}
			const dock = findDockTarget();
			if ( dock ) {
				if ( dock.lastChild !== hostEl ) {
					dock.appendChild( hostEl );
				}
				attempts = 0;
				setHost( ( current ) =>
					current === hostEl ? current : hostEl
				);
				return;
			}
			if ( attempts++ < MAX_ACQUIRE_FRAMES ) {
				frameRef.current = window.requestAnimationFrame( acquire );
				return;
			}
			// Genuinely absent, not merely late.
			attempts = 0;
			if ( hostEl.parentElement ) {
				hostEl.remove();
			}
			setHost( ( current ) => ( current === null ? current : null ) );
		};

		const schedule = () => {
			if ( frameRef.current ) {
				window.cancelAnimationFrame( frameRef.current );
			}
			attempts = 0;
			frameRef.current = window.requestAnimationFrame( acquire );
		};

		// Ignore mutations we caused ourselves, and React's renders INTO the
		// host — otherwise every keystroke of our own output re-schedules work.
		const onMutate = () => {
			if ( isSettled() ) {
				return;
			}
			schedule();
		};

		const root =
			document.querySelector( OBSERVE_ROOT_SELECTOR ) || document.body;
		const observer = new window.MutationObserver( onMutate );
		observer.observe( root, { childList: true, subtree: true } );

		// Initial acquisition — the observer only fires on CHANGE.
		schedule();

		return () => {
			cancelled = true;
			observer.disconnect();
			if ( frameRef.current ) {
				window.cancelAnimationFrame( frameRef.current );
			}
			if ( hostEl.parentElement ) {
				hostEl.remove();
			}
		};
	}, [] );

	return host;
}

/**
 * Track the editor's bottom breadcrumb strip, which the cue portals into.
 *
 * Tracked rather than queried once for the same reason as the inspector: the
 * strip is chrome, and chrome is removed in distraction-free mode. When it is
 * absent the cue simply does not render — the screen-reader announcement is
 * mounted separately to <body> and is unaffected.
 *
 * @return {HTMLElement|null} The footer element, or null when it is not present.
 */
function useFooterStrip() {
	const [ footer, setFooter ] = useState( () =>
		document.querySelector( FOOTER_SELECTOR )
	);

	useEffect( () => {
		const read = () => {
			const node = document.querySelector( FOOTER_SELECTOR );
			const live = node && document.body.contains( node ) ? node : null;
			setFooter( ( current ) => ( current === live ? current : live ) );
		};

		const root =
			document.querySelector( OBSERVE_ROOT_SELECTOR ) || document.body;
		const observer = new window.MutationObserver( read );
		observer.observe( root, { childList: true, subtree: true } );
		read();

		return () => observer.disconnect();
	}, [] );

	return footer;
}

/**
 * Read the current device tier and a setter, from the one store that answers in
 * BOTH the post editor and the site editor.
 *
 * `core/editor`'s getDeviceType/setDeviceType are STABLE (not __experimental);
 * the old per-editor __experimentalGetPreviewDeviceType APIs are formally
 * deprecated *to* these since WP 6.5. Verified answering in both editors.
 *
 * @return {{device: string, setDevice: Function}} Current tier and its setter.
 */
function useDeviceType() {
	const device = useSelect( ( select ) => {
		const editor = select( 'core/editor' );
		return editor && typeof editor.getDeviceType === 'function'
			? editor.getDeviceType()
			: 'Desktop';
	}, [] );

	const { setDeviceType } = useDispatch( 'core/editor' ) || {};

	return {
		device: device || 'Desktop',
		setDevice: ( next ) => {
			if ( typeof setDeviceType === 'function' ) {
				setDeviceType( next );
			}
		},
	};
}

/**
 * The toggle itself, portalled to the top of the block inspector.
 *
 * @return {JSX.Element|null} The portalled control, or null when there is no
 *                            inspector to portal into.
 */
function DeviceTogglePortal() {
	const target = useInspectorPortalHost();
	const { device, setDevice } = useDeviceType();

	// createPortal( children, null ) throws — never call it without a target.
	if ( ! target ) {
		return null;
	}

	return createPortal(
		<div
			className="sgs-device-toggle"
			data-sgs-device-toggle="mounted"
		>
			<ToggleGroupControl
				label={ __( 'Currently Editing', 'sgs-blocks' ) }
				value={ device }
				isBlock
				__nextHasNoMarginBottom
				onChange={ ( value ) => setDevice( value ) }
			>
				{ DEVICES.map( ( { value, label } ) => (
					<ToggleGroupControlOption
						key={ value }
						value={ value }
						label={ label }
					/>
				) ) }
			</ToggleGroupControl>
		</div>,
		target
	);
}

/**
 * The persistent cue + the screen-reader announcement.
 *
 * Mounted straight to document.body, NOT into the inspector — deliberately. The
 * inspector is destroyed by a Page-tab switch, a closed sidebar and
 * distraction-free mode, and a cue that disappears in exactly those states fails
 * at the one job it has. There is no core Slot that survives all of them.
 *
 * @return {JSX.Element|null} The portalled cue, or null on Desktop.
 */
function DeviceCuePortal() {
	const { device } = useDeviceType();

	// ⚑ Dismissal is PER TIER, not per page (Bean, 2026-08-10). Dismissing once
	// for the whole page would let a client silence the Tablet cue, later switch
	// to Mobile, and edit on unwarned — reintroducing exactly the failure the cue
	// exists to prevent. Keyed by tier, each warns once and then stays quiet.
	// Still in-memory only, so it resets on reload or page change, matching the
	// device tier's own reset rule (D4).
	const [ dismissedTiers, setDismissedTiers ] = useState( {} );
	const footer = useFooterStrip();
	const message = CUE_TEXT[ device ] || null;
	const dismissed = !! dismissedTiers[ device ];

	// The announcement is mounted to <body> unconditionally: it must fire even
	// when the footer strip is absent (distraction-free hides the chrome).
	const announcement = createPortal(
		/* WCAG 4.1.3 Status Messages — the tier changes with no focus move, so
		   without this a screen-reader user learns only that a button became
		   pressed, not that every other control now means something different.
		   polite, never assertive. */
		<VisuallyHidden aria-live="polite" aria-atomic="true">
			{ sprintf(
				/* translators: %s: device tier name, e.g. tablet. */
				__( 'Now editing the %s view.', 'sgs-blocks' ),
				device.toLowerCase()
			) }
		</VisuallyHidden>,
		document.body
	);

	if ( ! message || dismissed || ! footer ) {
		return announcement;
	}

	return (
		<>
			{ announcement }
			{ createPortal(
				/* aria-hidden: the announcement above already conveys this to a
				   screen reader. Without it the tier change is spoken twice. */
				<div className="sgs-device-cue" aria-hidden="true">
					<span className="sgs-device-cue__text">{ message }</span>
					<button
						type="button"
						className="sgs-device-cue__dismiss"
						onClick={ () =>
							setDismissedTiers( ( current ) => ( {
								...current,
								[ device ]: true,
							} ) )
						}
						aria-label={ __( 'Dismiss', 'sgs-blocks' ) }
					>
						×
					</button>
				</div>,
				footer
			) }
		</>
	);
}

registerPlugin( 'sgs-responsive-device-toggle', {
	render: () => (
		<>
			<DeviceTogglePortal />
			<DeviceCuePortal />
		</>
	),
} );

} // end guard: window.__sgsResponsiveDeviceToggleRegistered
