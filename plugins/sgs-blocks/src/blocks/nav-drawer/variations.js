/**
 * SGS Nav Drawer — desktop-variant block variations (design gate 2026-07-28).
 *
 * Seven complete-clone presets, one per reference design measured in
 * `.claude/reports/2026-07-28-drawer-code-extraction/`. Each variation sets
 * DEFAULTS (geometry, panel treatment, menu look, child-block roster) and
 * hardcodes NOTHING — every value stays editable after insertion, every
 * child is deletable/reorderable, any block is insertable (Bean's binding
 * variant principle, design doc §"Approved shape").
 *
 * SCOPE (2026-08-27): each variation is `[ 'inserter', 'transform' ]`, not inserter-only.
 * Inserter-only meant the look was chosen ONCE at insertion and could never be changed --
 * `variantPreset` had no inspector control, no switcher, and neither drawer starter pattern
 * sets it, so a drawer created through the sgs_drawer CPT starter picker landed on the
 * block.json default with no route to the other six looks at all. That contradicted this
 * file's own binding principle above -- "every value stays editable after insertion" -- and
 * `21-render-without-control` was RIGHT to flag it (it was briefly mis-triaged as a false
 * positive on 2026-08-27 and corrected the same day). `transform` gives the native toolbar
 * switcher, which every variation already supports via its `isActive: [ 'variantPreset' ]`.
 * Zero custom UI -- the same principle the CPT starter picker leans on.
 *
 * Names are DESCRIPTIVE, never the source studio's name; provenance is
 * recorded in each `description`. Only the buildable-from-existing-SGS-blocks
 * looks are here — resn's WebGL menu is reference-only (documented, not
 * built) per the design doc's out-of-scope list.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';

/**
 * Shared vertical-list nav-menu defaults for a drawer's seeded menu — a
 * tighter stacked gap than the header bar's default reads better vertically.
 *
 * @param {Object} extra Extra nav-menu attribute overrides for this look.
 * @return {Array} A `[ 'sgs/nav-menu', attrs ]` InnerBlocks entry.
 */
function navMenu( extra = {} ) {
	return [ 'sgs/nav-menu', { gap: '4px', ...extra } ];
}

const variations = [
	{
		name: 'floating-capped-card',
		title: __( 'Floating capped card', 'sgs-blocks' ),
		description: __(
			'A small blurred card pinned near the trigger, capped at a comfortable reading width — not a full-viewport panel. Reference: a real-site corner-panel drawer measured 2026-07-28.',
			'sgs-blocks'
		),
		scope: [ 'inserter', 'transform' ],
		attributes: {
			anchor: { desktop: 'trigger' },
			panelSize: { desktop: '438px' },
			surfaceOpacity: 0.85,
			surfaceBlur: '4px',
			closeStyle: 'text-swap',
			drawerAlign: 'left',
			drawerBg: 'surface',
			variantPreset: 'floating-capped-card',
		},
		isActive: [ 'variantPreset' ],
		innerBlocks: [
			navMenu(),
			[ 'sgs/button', { label: __( 'Get in touch', 'sgs-blocks' ) } ],
		],
	},
	{
		name: 'anchored-card-stack',
		title: __( 'Anchored card stack', 'sgs-blocks' ),
		description: __(
			'A narrow top-right panel with the menu, a newsletter prompt and a promo card stacked as independent cards. Reference: a real-site anchored-dropdown drawer measured 2026-07-28.',
			'sgs-blocks'
		),
		scope: [ 'inserter', 'transform' ],
		attributes: {
			anchor: { desktop: 'trigger', tablet: 'full-screen' },
			panelSize: { desktop: '310px' },
			closeStyle: 'text-swap',
			drawerAlign: 'left',
			variantPreset: 'anchored-card-stack',
		},
		isActive: [ 'variantPreset' ],
		innerBlocks: [
			navMenu(),
			[ 'sgs/text', { text: __( 'Sign up for occasional news.', 'sgs-blocks' ) } ],
			[ 'sgs/button', { label: __( 'Subscribe', 'sgs-blocks' ) } ],
		],
	},
	{
		name: 'editorial-ghost-list',
		title: __( 'Editorial ghost list', 'sgs-blocks' ),
		description: __(
			'A full-screen panel over the dimmed page, a plain left-aligned link list and a social row. Reference: a real-site full-viewport editorial drawer measured 2026-07-28.',
			'sgs-blocks'
		),
		scope: [ 'inserter', 'transform' ],
		attributes: {
			surfaceOpacity: 0.55,
			closeStyle: 'separate-x',
			drawerAlign: 'left',
			variantPreset: 'editorial-ghost-list',
		},
		isActive: [ 'variantPreset' ],
		innerBlocks: [
			navMenu( { itemFontSize: { desktop: 45, mobile: 32 }, itemFontWeight: '200' } ),
			[ 'sgs/social-icons' ],
			[ 'sgs/text', { text: __( 'See our latest work.', 'sgs-blocks' ) } ],
		],
	},
	{
		name: 'centred-statement',
		title: __( 'Centred statement', 'sgs-blocks' ),
		description: __(
			'An opaque full-screen panel with a large centred link list and a tertiary row underneath. Reference: a real-site centred-statement drawer measured 2026-07-28.',
			'sgs-blocks'
		),
		scope: [ 'inserter', 'transform' ],
		attributes: {
			drawerBg: 'footer-bg',
			drawerAlign: 'center',
			closeStyle: 'separate-x',
			variantPreset: 'centred-statement',
		},
		isActive: [ 'variantPreset' ],
		innerBlocks: [
			navMenu( { itemFontSize: { desktop: 56, mobile: 36 } } ),
			[ 'sgs/icon-list' ],
			[ 'sgs/button', { label: __( 'Get started', 'sgs-blocks' ) } ],
		],
	},
	{
		name: 'solid-brand-light',
		title: __( 'Solid brand panel', 'sgs-blocks' ),
		description: __(
			'A full-screen brand-coloured panel, a right-weighted uppercase link list, and a footer row of copyright + social links. Reference: a real-site solid-brand-fill drawer measured 2026-07-28.',
			'sgs-blocks'
		),
		scope: [ 'inserter', 'transform' ],
		attributes: {
			drawerBg: 'primary',
			drawerAlign: 'right',
			closeStyle: 'separate-x',
			variantPreset: 'solid-brand-light',
		},
		isActive: [ 'variantPreset' ],
		innerBlocks: [
			navMenu( { itemFontWeight: '100' } ),
			[ 'sgs/social-icons' ],
			[ 'sgs/text', { text: __( '© Your Company', 'sgs-blocks' ) } ],
		],
	},
	{
		name: 'two-column-editorial',
		title: __( 'Two-column editorial', 'sgs-blocks' ),
		description: __(
			'A full-screen light panel with a large two-column link grid that merges to one column on smaller devices. Reference: a real-site 2-column editorial drawer measured 2026-07-28.',
			'sgs-blocks'
		),
		scope: [ 'inserter', 'transform' ],
		attributes: {
			drawerBg: 'surface',
			closeStyle: 'text-swap',
			variantPreset: 'two-column-editorial',
		},
		isActive: [ 'variantPreset' ],
		innerBlocks: [
			navMenu( { itemFontSize: { desktop: 64, mobile: 40 }, listColumns: { desktop: 2, mobile: 1 } } ),
			[ 'sgs/button', { label: __( "Let's talk", 'sgs-blocks' ) } ],
		],
	},
	{
		name: 'split-zone-serif',
		title: __( 'Split zone serif', 'sgs-blocks' ),
		description: __(
			'A full-screen dark panel: a serif link list plus tertiary links and a newsletter prompt on the left, and a repeatable promo-card rail alongside. Reference: a real-site split-zone drawer measured 2026-07-28.',
			'sgs-blocks'
		),
		scope: [ 'inserter', 'transform' ],
		attributes: {
			drawerBg: 'footer-bg',
			drawerAlign: 'left',
			closeStyle: 'separate-x',
			variantPreset: 'split-zone-serif',
		},
		isActive: [ 'variantPreset' ],
		innerBlocks: [
			navMenu(),
			[ 'sgs/icon-list' ],
			[ 'sgs/text', { text: __( 'Sign up for occasional news.', 'sgs-blocks' ) } ],
			[ 'sgs/social-icons' ],
			[ 'sgs/card-grid' ],
		],
	},
];

export default variations;
