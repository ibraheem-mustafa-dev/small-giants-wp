/**
 * EasingAtom: the one easing control, and the one master easing list every easing option is a view of
 * (Spec 38A FR-38A-54).
 *
 * MASTER LIST. `MOTION_EASING_OPTIONS` names each curve once and carries its value in every vocabulary that can store
 * it, under `values`:
 *   - `schema`  what `sgsMotion` stores: a CSS keyword, a `cubic-bezier()` literal or a `token:easing.*` reference.
 *   - `nav`     the named curves the nav, cart, icon and header attributes store (the `block.json` enums that mirror
 *               `includes/helpers-motion-easing.php::sgs_motion_easing_values`), ending in `custom`.
 *   - `theme`   the theme token keys the hover and entrance attributes store, ending in `custom`.
 *   - `css`     the plain CSS keywords the block-private enums store.
 *   - `gsap`    the GSAP ease names the scroll-driven effects store.
 * `labels` holds a label that differs per vocabulary; the entry's own `label` is used otherwise. A vocabulary is the
 * set of entries with a value under its key, so a new vocabulary adds a key, not a second list. The CSS an entry paints
 * comes from its `schema` value through the field type and is never restated.
 *
 * VIEWS. `easingView( vocabulary, { order, labels } )` derives the `{ label, value }` options one consumer needs;
 * `NAV_EASING_OPTIONS`, `THEME_EASING_OPTIONS`, `CSS_EASING_OPTIONS`, `GSAP_EASING_OPTIONS` and `SCHEMA_EASING_OPTIONS`
 * are the default views.
 *
 * COMPONENT. With no `vocab` it edits a stored `sgsMotion` easing: a list of curves plus a custom curve (`cubic-bezier()`
 * or `linear()`), and only schema-valid values leave it. With `vocab="nav"` (or `theme`) it edits a named curve and its
 * separate custom-curve attribute, the shape the nav, cart, icon and header attributes use.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { SelectControl, TextControl } from '@wordpress/components';
import { fieldCss, validateField } from './field-types';
import { textDraft, useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';
import NamedEasing from './NamedEasing';

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
			schema: 'token:easing.ease-out',
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

export const NAV_EASING_OPTIONS = easingView( 'nav' );
export const THEME_EASING_OPTIONS = easingView( 'theme' );
export const CSS_EASING_OPTIONS = easingView( 'css' );
export const GSAP_EASING_OPTIONS = easingView( 'gsap' );
export const SCHEMA_EASING_OPTIONS = easingView( 'schema' );

/**
 * The CSS timing function a named value paints, derived from the entry's `schema` value.
 *
 * @param {string} vocabulary One of `EASING_VOCABULARIES`.
 * @param {string} value      The stored value.
 * @return {string|null} The CSS, or null for a value with no CSS (`custom`, a GSAP name, an unknown value).
 */
export function easingCssFor( vocabulary, value ) {
	const schemaValue = easingEntry( vocabulary, value )?.values.schema;
	if ( schemaValue === undefined ) {
		return null;
	}
	const css = fieldCss( 'easing', schemaValue );
	return css.ok ? css.css : null;
}

const CUSTOM = '__custom__';
const CURVE_PLACEHOLDER = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

// A hand-typed curve is trimmed before it is checked, so surrounding spaces never make a valid curve invalid.
const parseCurve = ( raw ) => String( raw ).trim();

/**
 * The easing atom.
 *
 * @param {Object}      props
 * @param {string}      props.label            Select label.
 * @param {unknown}     props.value            Schema mode: the stored easing. Named mode: the named curve.
 * @param {Function}    props.onChange         Schema mode: receives a schema-valid easing, or undefined to clear.
 * @param {string}      [props.vocab]          `nav` or `theme` for the named-curve shape; omit for schema mode.
 * @param {string}      [props.custom]         Named mode: the custom curve.
 * @param {Function}    [props.onCustomChange] Named mode: receives a valid custom curve.
 * @param {string}      [props.fallback]       Named mode: the named value used when the stored one is empty.
 * @param {Object|null} [props.fieldNode]      Schema mode: the field's schema node.
 * @param {unknown}     [props.presetValue]    Schema mode: the preset's stamped value.
 * @param {string}      [props.emptyLabel]     Schema mode: the label of the unset option.
 * @param {string}      [props.help]           Schema mode: hint text.
 * @return {Element} The control.
 */
export default function EasingAtom( {
	vocab,
	label,
	value,
	onChange,
	custom = '',
	onCustomChange,
	fallback = 'ease',
	fieldNode = null,
	presetValue,
	emptyLabel = __( 'Not set', 'sgs-blocks' ),
	help,
} ) {
	const options = SCHEMA_EASING_OPTIONS.filter(
		( option ) => validateField( 'easing', option.value, fieldNode ).ok
	);
	const inList =
		typeof value === 'string' &&
		options.some( ( option ) => option.value === value );
	const [ customMode, setCustomMode ] = useState(
		typeof value === 'string' && ! inList
	);
	const field = useAtomField( {
		type: 'easing',
		fieldNode,
		value,
		onChange,
		presetValue,
		toDraft: textDraft,
		parse: parseCurve,
		message: __(
			'Not saved. Use a keyword, cubic-bezier(x1, y1, x2, y2) with x1 and x2 from 0 to 1, or linear(0, 1.05 60%, 1).',
			'sgs-blocks'
		),
	} );

	if ( vocab && vocab !== 'schema' ) {
		return (
			<NamedEasing
				options={ easingView( vocab ) }
				label={ label }
				value={ value }
				custom={ custom }
				fallback={ fallback }
				onChange={ onChange }
				onCustomChange={ onCustomChange }
			/>
		);
	}

	let mode = '';
	if ( customMode ) {
		mode = CUSTOM;
	} else if ( inList ) {
		mode = value;
	} else if ( value !== undefined ) {
		mode = CUSTOM;
	}

	const choose = ( next ) => {
		if ( next === CUSTOM ) {
			setCustomMode( true );
			field.setDraft(
				typeof value === 'string' && ! inList ? value : ''
			);
			return;
		}
		setCustomMode( false );
		field.setDraft( '' );
		field.commit( next === '' ? undefined : next );
	};

	return (
		<AtomFrame
			kind="easing"
			label={ label }
			help={ help }
			error={ field.error }
			customised={ field.customised }
			onReset={ field.reset }
		>
			<SelectControl
				label={ label }
				value={ mode }
				options={ [
					{ label: emptyLabel, value: '' },
					...options,
					{
						label: __( 'Custom curve…', 'sgs-blocks' ),
						value: CUSTOM,
					},
				] }
				onChange={ choose }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ mode === CUSTOM && (
				<TextControl
					label={ __( 'Custom curve', 'sgs-blocks' ) }
					value={ field.draft }
					onChange={ field.edit }
					placeholder={ CURVE_PLACEHOLDER }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</AtomFrame>
	);
}
