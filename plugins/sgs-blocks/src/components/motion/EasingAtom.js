/**
 * EasingAtom: the one easing control, and the one master easing list every easing option is a view of
 * (Spec 38A FR-38A-54).
 *
 * MASTER LIST. The curves, their vocabulary tags and every derived option view live in `./easing-master-list` and are
 * re-exported here for the existing importers.
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
import { fieldCss, isValidCubicBezier, validateField } from './field-types';
import { textDraft, useAtomField } from './atom-utils';
import AtomFrame from './AtomFrame';
import NamedEasing from './NamedEasing';
import {
	SCHEMA_EASING_OPTIONS,
	easingEntry,
	easingView,
} from './easing-master-list';

export {
	MOTION_EASING_OPTIONS,
	EASING_VOCABULARIES,
	NAV_EASING_OPTIONS,
	THEME_EASING_OPTIONS,
	CSS_EASING_OPTIONS,
	GSAP_EASING_OPTIONS,
	SCHEMA_EASING_OPTIONS,
	easingView,
	easingEntry,
} from './easing-master-list';

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

/**
 * The CSS timing function for a named nav easing, the JS twin of `sgs_motion_easing_css()`
 * (includes/helpers-motion-easing.php), for editor canvas previews.
 *
 * @param {string} value    The named easing.
 * @param {string} custom   The custom curve, read when value is `custom`.
 * @param {string} fallback CSS used for an unknown value or an invalid curve.
 * @return {string} A CSS timing function.
 */
export function motionEasingCss( value, custom = '', fallback = 'ease' ) {
	const named = easingCssFor( 'nav', value );
	if ( named ) {
		return named;
	}
	if ( 'custom' === value && isValidCubicBezier( ( custom || '' ).trim() ) ) {
		return custom.trim();
	}
	return fallback;
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
