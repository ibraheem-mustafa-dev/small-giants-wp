/**
 * FocalPositionField — the SGS wrapper around WP-native `FocalPointPicker`
 * (golden-controls goldens/behaviour.json, `angle-position.canonical.position`,
 * 2026-08-19). Modelled on `LinkPopoverField`'s shape (LinkPopoverControl.js):
 * a thin, self-contained component owning `label`/`value`/`onChange` plus the
 * native primitive's quirks, rather than every consumer re-deriving them.
 *
 * BEFORE this component existed, two mounts used FocalPointPicker directly
 * with two DIFFERENT storage shapes for the same concept:
 *  - `extensions/image-controls.js` stores the picker's native {x,y} floats
 *    (0-1) straight into `sgsObjectPosition` — no conversion.
 *  - `hero/edit.js` stores a CSS `object-position` STRING (e.g. "center 20%")
 *    and hand-converted to/from {x,y} at the call site via
 *    `objectPositionToFocalPoint`/`focalPointToObjectPosition`.
 *
 * Both storage shapes are already load-bearing on their own PHP side (the
 * universal extension's PHP reads raw {x,y}; hero's render.php reads the CSS
 * string) — changing either would be a bigger, separate migration. This
 * wrapper instead OWNS the conversion so neither call site has to, via the
 * `format` prop:
 *   - `format="xy"` (default) — value/onChange use the picker's native
 *     {x,y} object directly. Matches image-controls.js's existing contract.
 *   - `format="css-string"` — value/onChange use a CSS object-position
 *     string. Matches hero's existing contract; the conversion happens
 *     inside this component instead of at every call site.
 *
 * @package SGS\Blocks
 */
import { FocalPointPicker } from '@wordpress/components';
import { objectPositionToFocalPoint, focalPointToObjectPosition } from '../utils';

/**
 * @param {Object}            props
 * @param {string}            [props.label]     BaseControl label (FocalPointPicker renders its own).
 * @param {string}            [props.help]      Help text.
 * @param {string}            [props.url]       Preview image URL — the picker renders as a plain
 *                                               x/y control with no thumbnail when omitted.
 * @param {Object|string}     props.value        {x,y} floats (format="xy") or a CSS object-position
 *                                               string (format="css-string").
 * @param {Function}          props.onChange     Receives the next value in the SAME shape as `value`
 *                                               (an {x,y} object or a CSS string) — the caller never
 *                                               sees the picker's native shape directly.
 * @param {'xy'|'css-string'} [props.format='xy'] Which storage shape `value`/`onChange` use.
 */
export default function FocalPositionField( {
	label,
	help,
	url,
	value,
	onChange,
	format = 'xy',
	disabled = false,
} ) {
	const isCssString = 'css-string' === format;
	const focalValue = isCssString ? objectPositionToFocalPoint( value ) : ( value || {} );

	// `FocalPointPicker` (core) takes no `disabled`, so the DISABLED disclosure
	// state is expressed with a native <fieldset disabled>, which blocks input on
	// every descendant. Default false, so the three existing mounts are unchanged.
	const picker = (
		<FocalPointPicker
			label={ label }
			help={ help }
			url={ url || '' }
			value={ focalValue }
			onChange={ ( next ) =>
				onChange( isCssString ? focalPointToObjectPosition( next ) : ( next || {} ) )
			}
			__nextHasNoMarginBottom
		/>
	);

	if ( ! disabled ) {
		return picker;
	}

	return (
		<fieldset disabled className="sgs-focal-position-field--disabled">
			{ picker }
		</fieldset>
	);
}
