/**
 * SgsFreeTextField — the SGS standard FREE-TEXT / BARE-NUMBER control
 * (golden-controls.json goldens/input.json `free-text` row, Bean-approved
 * live 2026-08-19).
 *
 * A thin wrapper selecting between core's four raw primitives —
 * `TextControl` (short single-line), `TextareaControl` (long-form),
 * `NumberControl` (unbounded/precision number), `RangeControl` (coarse
 * bounded number) — via one `type` prop, so a consumer picks the shape
 * once instead of importing and hand-configuring whichever primitive
 * directly. Unifies the two sizing/spacing conventions every consumer in
 * this codebase already sets by hand on every mount
 * (`__nextHasNoMarginBottom`, `__next40pxDefaultSize`) so a future
 * convention change is one file, not ~190 call sites.
 *
 * Raw consumers move onto this wrapper as their setting converts (see the
 * `free-text` row's `migrationNote` in `goldens/input.json`).
 *
 * `type="rich"` (Bean 2026-10-30) is the control for every setting whose words the author types and the page prints
 * as inline HTML: a RichText input in the inspector that takes exactly bold, italic, strikethrough and a link
 * (`RICH_TEXT_FREE_TEXT`), plus a line break (Enter or Shift+Enter inserts `<br>`; `multiline` only makes the box
 * taller). Props: `label`, `value` (HTML string), `onChange` (receives the HTML string), `help`, `placeholder`,
 * `multiline` (boolean, default false: a one-line-high box that grows with its text), and `noLink` (boolean: drop
 * the link format when the text prints inside an `<a>`, `<button>` or `<summary>`). It is labelled by a visible label,
 * shows the admin-colour focus ring, and is 40px tall at least. The render side prints the value through
 * `sgs_rich_text_kses()` (page content) or `sgs_authored_text_plain()` (an HTML attribute or a JS string).
 *
 * @package SGS\Blocks
 */
import { TextControl, TextareaControl, RangeControl, BaseControl } from '@wordpress/components';
import { RichText } from '@wordpress/block-editor';
import { useInstanceId } from '@wordpress/compose';
import { RICH_TEXT_FREE_TEXT, RICH_TEXT_FREE_TEXT_NO_LINK } from '../utils/rich-text-formats';
import './SgsFreeTextField.css';
// NumberControl is __experimentalNumberControl at runtime (confirmed 2026-08-19
// against the live wp.components bundle; bare `NumberControl` does not exist) —
// this codebase routes every __experimental* import through the compat barrel
// (src/components/primitives/index.js), enforced by a prebuild gate
// (survey-experimental-imports.js --check). Importing it bare from
// '@wordpress/components' here would resolve to undefined and fail the build.
import { NumberControl } from './primitives';

// Two mounts, one per format list, so the formats survey reads each RichText's list as a constant.
function RichInput( { value: html, onChange, labelId, placeholder, multiline } ) {
	return (
		<RichText
			identifier="sgs-free-text"
			tagName="div"
			className="sgs-free-text-field__input"
			aria-labelledby={ labelId }
			aria-multiline={ multiline ? 'true' : 'false' }
			data-multiline={ multiline ? 'true' : undefined }
			value={ html || '' }
			onChange={ onChange }
			placeholder={ placeholder }
			allowedFormats={ RICH_TEXT_FREE_TEXT }
		/>
	);
}

function RichInputNoLink( { value: htmlText, onChange, labelId, placeholder, multiline } ) {
	return (
		<RichText
			identifier="sgs-free-text"
			tagName="div"
			className="sgs-free-text-field__input"
			aria-labelledby={ labelId }
			aria-multiline={ multiline ? 'true' : 'false' }
			data-multiline={ multiline ? 'true' : undefined }
			value={ htmlText || '' }
			onChange={ onChange }
			placeholder={ placeholder }
			allowedFormats={ RICH_TEXT_FREE_TEXT_NO_LINK }
		/>
	);
}

/**
 * @param {Object}   props
 * @param {'text'|'textarea'|'number'|'range'|'rich'} [props.type='text'] Which
 *   primitive to render.
 * @param {string}   props.label     Control label.
 * @param {*}        props.value     Current value (string for text/textarea,
 *   number for number/range).
 * @param {Function} props.onChange  Receives the next value.
 * @param {string}   [props.help]    Help text.
 * @param {Object}   [props.rest]    Any other prop is passed straight through
 *   to the underlying primitive (min/max/step for range/number, rows for
 *   textarea, etc.).
 */
export default function SgsFreeTextField( { type = 'text', label, value, onChange, help, ...rest } ) {
	const instanceId = useInstanceId( SgsFreeTextField, 'sgs-free-text' );
	if ( 'rich' === type ) {
		const { noLink = false, multiline = false, placeholder } = rest;
		const labelId = `${ instanceId }-label`;
		const Input = noLink ? RichInputNoLink : RichInput;
		return (
			<BaseControl
				id={ instanceId }
				className="sgs-free-text-field"
				help={ help }
				__nextHasNoMarginBottom
			>
				<span id={ labelId } className="sgs-free-text-field__label components-base-control__label">
					{ label }
				</span>
				<Input value={ value } onChange={ onChange } labelId={ labelId } placeholder={ placeholder } multiline={ multiline } />
			</BaseControl>
		);
	}
	// __nextHasNoMarginBottom/__next40pxDefaultSize are written literally on
	// each control below rather than spread from a shared object —
	// survey-control-parity.py's gate (`surveys-survey-control-parity`) verifies these
	// props via a static JSX scan and cannot trace a value passed through `{...spread}`,
	// so a spread here would pass at runtime but fail the build (confirmed
	// 2026-08-19: the gate flagged all three controls when this used a
	// `common` spread object; it clears once each prop is a literal
	// attribute, matching how every other control in this codebase writes
	// them).
	if ( 'textarea' === type ) {
		return (
			<TextareaControl
				label={ label }
				value={ value }
				onChange={ onChange }
				help={ help }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				{ ...rest }
			/>
		);
	}
	if ( 'number' === type ) {
		return (
			<NumberControl
				label={ label }
				value={ value }
				onChange={ onChange }
				help={ help }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				{ ...rest }
			/>
		);
	}
	if ( 'range' === type ) {
		return (
			<RangeControl
				label={ label }
				value={ value }
				onChange={ onChange }
				help={ help }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
				{ ...rest }
			/>
		);
	}
	return (
		<TextControl
			label={ label }
			value={ value }
			onChange={ onChange }
			help={ help }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
			{ ...rest }
		/>
	);
}
