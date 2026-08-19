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
 * Existing raw consumers are NOT migrated onto this wrapper this session —
 * see the `free-text` row's `migrationNote` in `goldens/input.json`.
 *
 * @package SGS\Blocks
 */
import { TextControl, TextareaControl, RangeControl } from '@wordpress/components';
// NumberControl is __experimentalNumberControl at runtime (confirmed 2026-08-19
// against the live wp.components bundle; bare `NumberControl` does not exist) —
// this codebase routes every __experimental* import through the compat barrel
// (src/components/primitives/index.js), enforced by a prebuild gate
// (survey-experimental-imports.js --check). Importing it bare from
// '@wordpress/components' here would resolve to undefined and fail the build.
import { NumberControl } from './primitives';

/**
 * @param {Object}   props
 * @param {'text'|'textarea'|'number'|'range'} [props.type='text'] Which
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
	// __nextHasNoMarginBottom/__next40pxDefaultSize are written literally on
	// each control below rather than spread from a shared object —
	// check-control-parity-live.js's build gate verifies these props via a
	// static JSX scan and cannot trace a value passed through `{...spread}`,
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
