/**
 * The easing master list (Spec 38A FR-38A-54): every curve named once, tagged by the vocabularies that can store it, and
 * every easing option list in the plugin is a derived view of it. `scripts/migrate-easing-option-lists.js --check` fails
 * on an easing option list defined anywhere else and proves each view equals the `block.json` enum it feeds.
 *
 * Vocabularies, under each entry's `values`:
 *   - `schema`  what `sgsMotion` stores: a CSS keyword, a `cubic-bezier()` literal or a `token:easing.*` reference.
 *   - `nav`     the named curves the nav, cart, icon and header attributes store (the `block.json` enums that mirror
 *               `includes/helpers-motion-easing.php::sgs_motion_easing_values`), ending in `custom`.
 *   - `theme`   the theme token keys the hover and entrance attributes store, ending in `custom`.
 *   - `css`     the plain CSS keywords the block-private enums store.
 *   - `gsap`    the GSAP ease names the scroll-driven effects store, verified against the installed GSAP core
 *               (`node_modules/gsap/src/gsap-core.js`); labels are plain English because a client picks a feel, not an
 *               ease-family name. An empty value is GSAP's own default; `none` is its "no easing".
 * `labels` holds a label that differs per vocabulary; the entry's own `label` is used otherwise. A vocabulary is the set
 * of entries with a value under its key, so a new vocabulary adds a key, not a second list. The CSS an entry paints comes
 * from its `schema` value through the field type and is never restated.
 *
 * This file imports nothing but `__`, so the migration script can evaluate it outside the editor.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';

export const MOTION_EASING_OPTIONS = [
	{
		id: 'ease',
		label: __( 'Standard', 'sgs-blocks' ),
		labels: { css: __( 'Ease', 'sgs-blocks' ) },
		values: { nav: 'ease', css: 'ease', schema: 'ease' },
	},
	{
		id: 'css-ease-in',
		label: __( 'Ease in', 'sgs-blocks' ),
		labels: { schema: __( 'Ease in (CSS)', 'sgs-blocks' ) },
		values: { css: 'ease-in', schema: 'ease-in' },
	},
	{
		id: 'css-ease-out',
		label: __( 'Ease out', 'sgs-blocks' ),
		labels: { schema: __( 'Ease out (CSS)', 'sgs-blocks' ) },
		values: { nav: 'ease-out-css', css: 'ease-out', schema: 'ease-out' },
	},
	{
		id: 'ease-in-out',
		label: __( 'Ease in and out', 'sgs-blocks' ),
		labels: { css: __( 'Ease in-out', 'sgs-blocks' ) },
		values: {
			nav: 'ease-in-out',
			css: 'ease-in-out',
			schema: 'ease-in-out',
		},
	},
	{
		id: 'smooth',
		label: __( 'Smooth', 'sgs-blocks' ),
		labels: { theme: __( 'Default (Material)', 'sgs-blocks' ) },
		values: {
			nav: 'default',
			theme: 'default',
			schema: 'token:easing.default',
		},
	},
	{
		id: 'expo-out',
		label: __( 'Expo out', 'sgs-blocks' ),
		labels: { theme: __( 'Ease out', 'sgs-blocks' ) },
		values: {
			nav: 'ease-out',
			theme: 'ease-out',
			schema: 'token:easing.emphasised',
		},
	},
	{
		id: 'quart-out',
		label: __( 'Quart out', 'sgs-blocks' ),
		values: {
			nav: 'quart-out',
			schema: 'cubic-bezier(0.165, 0.84, 0.44, 1)',
		},
	},
	{
		id: 'material-standard',
		label: __( 'Material standard', 'sgs-blocks' ),
		values: { nav: 'standard', schema: 'cubic-bezier(0.4, 0, 0.2, 1)' },
	},
	{
		id: 'soft-settle',
		label: __( 'Soft settle', 'sgs-blocks' ),
		values: { nav: 'drafts', schema: 'cubic-bezier(0.16, 0.84, 0.32, 1)' },
	},
	{
		id: 'theme-ease-in',
		label: __( 'Ease in', 'sgs-blocks' ),
		labels: { schema: __( 'Ease in (theme)', 'sgs-blocks' ) },
		values: {
			nav: 'ease-in',
			theme: 'ease-in',
			schema: 'token:easing.ease-in',
		},
	},
	{
		id: 'spring',
		label: __( 'Spring', 'sgs-blocks' ),
		values: {
			nav: 'spring',
			theme: 'spring',
			schema: 'token:easing.spring',
		},
	},
	{
		id: 'linear',
		label: __( 'Linear', 'sgs-blocks' ),
		values: { nav: 'linear', css: 'linear', schema: 'linear' },
	},
	{
		id: 'theme-linear',
		label: __( 'Linear', 'sgs-blocks' ),
		labels: { schema: __( 'Linear (theme)', 'sgs-blocks' ) },
		values: { theme: 'linear', schema: 'token:easing.linear' },
	},
	{
		id: 'spring-gentle',
		label: __( 'Gentle spring', 'sgs-blocks' ),
		values: { schema: 'token:easing.spring-gentle' },
	},
	{
		id: 'spring-bouncy',
		label: __( 'Bouncy spring', 'sgs-blocks' ),
		values: { schema: 'token:easing.spring-bouncy' },
	},
	{
		id: 'entrance-default',
		label: __( 'Entrance default', 'sgs-blocks' ),
		values: { schema: 'token:entrance.easing' },
	},
	{
		id: 'custom',
		label: __( 'Custom curve…', 'sgs-blocks' ),
		values: { nav: 'custom', theme: 'custom' },
	},
	{
		id: 'gsap-standard',
		label: __( 'Standard (default)', 'sgs-blocks' ),
		values: { gsap: '' },
	},
	{
		id: 'gsap-none',
		label: __( 'Constant speed, no easing', 'sgs-blocks' ),
		values: { gsap: 'none' },
	},
	{
		id: 'gsap-gentle-start',
		label: __( 'Gentle start', 'sgs-blocks' ),
		values: { gsap: 'power1.out' },
	},
	{
		id: 'gsap-smooth',
		label: __( 'Smooth start and finish', 'sgs-blocks' ),
		values: { gsap: 'power2.inOut' },
	},
	{
		id: 'gsap-strong-finish',
		label: __( 'Strong finish', 'sgs-blocks' ),
		values: { gsap: 'power3.out' },
	},
	{
		id: 'gsap-overshoot',
		label: __( 'Overshoot and settle', 'sgs-blocks' ),
		values: { gsap: 'back.out' },
	},
	{
		id: 'gsap-bounce',
		label: __( 'Bounce', 'sgs-blocks' ),
		values: { gsap: 'bounce.out' },
	},
	{
		id: 'gsap-elastic',
		label: __( 'Elastic wobble', 'sgs-blocks' ),
		values: { gsap: 'elastic.out(1,0.5)' },
	},
];

/** The vocabularies the master list serves. */
export const EASING_VOCABULARIES = Object.freeze( [
	...new Set(
		MOTION_EASING_OPTIONS.flatMap( ( entry ) =>
			Object.keys( entry.values )
		)
	),
] );

/**
 * A derived view of the master list: the `{ label, value }` options of one vocabulary.
 *
 * @param {string}                 vocabulary       One of `EASING_VOCABULARIES`.
 * @param {Object}                 [options]
 * @param {string[]}               [options.order]  Values to keep, in this order (a consumer whose enum lists them differently).
 * @param {Object<string, string>} [options.labels] Label overrides, keyed by value.
 * @return {Array<{label: string, value: string}>} The options.
 */
export function easingView( vocabulary, { order, labels = {} } = {} ) {
	const all = MOTION_EASING_OPTIONS.filter(
		( entry ) => entry.values[ vocabulary ] !== undefined
	).map( ( entry ) => {
		const value = entry.values[ vocabulary ];
		return {
			label:
				labels[ value ] ?? entry.labels?.[ vocabulary ] ?? entry.label,
			value,
		};
	} );
	if ( ! order ) {
		return all;
	}
	return order
		.map( ( value ) => all.find( ( option ) => option.value === value ) )
		.filter( Boolean );
}

/**
 * The master entry for a value in a vocabulary.
 *
 * @param {string} vocabulary One of `EASING_VOCABULARIES`.
 * @param {string} value      The stored value.
 * @return {Object|undefined} The entry, or undefined for a value the vocabulary does not hold.
 */
export function easingEntry( vocabulary, value ) {
	return MOTION_EASING_OPTIONS.find(
		( entry ) => entry.values[ vocabulary ] === value
	);
}


// The default views, one per vocabulary.
export const NAV_EASING_OPTIONS = easingView( 'nav' );
export const THEME_EASING_OPTIONS = easingView( 'theme' );
export const CSS_EASING_OPTIONS = easingView( 'css' );
export const GSAP_EASING_OPTIONS = easingView( 'gsap' );
export const SCHEMA_EASING_OPTIONS = easingView( 'schema' );

// The CSS keywords with Ease in-out first, the order the card grid, info box and team member lists offer.
export const CSS_EASING_OPTIONS_IN_OUT_FIRST = easingView( 'css', {
	order: [ 'ease-in-out', 'ease', 'ease-in', 'ease-out', 'linear' ],
} );

// The animation control: the theme curves with plain-English hints, then the CSS default curve.
export const ANIMATION_EASING_OPTIONS = [
	...easingView( 'theme', {
		order: [ 'default', 'ease-out', 'ease-in', 'spring', 'linear' ],
		labels: {
			'ease-out': __( 'Ease out (snappy)', 'sgs-blocks' ),
			'ease-in': __( 'Ease in (gentle)', 'sgs-blocks' ),
			spring: __( 'Spring (bouncy)', 'sgs-blocks' ),
			linear: __( 'Linear (constant)', 'sgs-blocks' ),
		},
	} ),
	...easingView( 'css', {
		order: [ 'ease' ],
		labels: { ease: __( 'Ease (CSS default curve)', 'sgs-blocks' ) },
	} ),
];
