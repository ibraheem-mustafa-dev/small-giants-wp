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
import { TextControl, TextareaControl, NumberControl, RangeControl } from '@wordpress/components';

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
	const common = {
		label,
		help,
		__nextHasNoMarginBottom: true,
		__next40pxDefaultSize: true,
		...rest,
	};

	if ( 'textarea' === type ) {
		return <TextareaControl value={ value } onChange={ onChange } { ...common } />;
	}
	if ( 'number' === type ) {
		return <NumberControl value={ value } onChange={ onChange } { ...common } />;
	}
	if ( 'range' === type ) {
		return <RangeControl value={ value } onChange={ onChange } { ...common } />;
	}
	return <TextControl value={ value } onChange={ onChange } { ...common } />;
}
