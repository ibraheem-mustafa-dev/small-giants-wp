/**
 * Per-option "polish" fields — Spec 43 §5 (Option polish): `isDefault`,
 * `badge` and `description`, plus FR-43-24's `summaryText` (the summary's
 * wording for this answer) and `stageEffect` (a photo treatment the stage
 * shows while this option is chosen). Extracted out of edit.js's options.map() (which
 * is at its 250-line cap per the choice-flow contract's size rule) so the
 * main thread can mount it as a sibling field block without adding lines to
 * that file's own JSX body.
 *
 * Matches the SAME `updateOption( index, key, value )` contract edit.js
 * already uses for every other per-option field (label, value, nextStepId,
 * tags, image, helpText, addToBagNow) — this component never reads or
 * writes `options[]` itself, it only calls the `onChange` the caller passes
 * in, keeping option state ownership in one place (edit.js).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, ToggleControl, TextControl, TextareaControl } from '@wordpress/components';

const BADGE_MAX_LENGTH = 20;
const DESCRIPTION_MAX_LENGTH = 140;

/**
 * @param {Object}   props
 * @param {Object}   props.option  The option row being edited (reads
 *                                 `isDefault`/`badge`/`description`).
 * @param {number}   props.index   This option's index in `options[]` —
 *                                 forwarded to `onChange` unchanged so the
 *                                 caller's own `updateOption` can locate it.
 * @param {Function} props.onChange `( index, key, value ) => void` — the
 *                                 same signature as edit.js's `updateOption`.
 * @return {JSX.Element} The three polish controls for one option.
 */
export default function OptionPolishFields( { option, index, onChange } ) {
	return (
		<>
			<ToggleControl
				label={ __( 'Selected by default', 'sgs-blocks' ) }
				checked={ !! option.isDefault }
				onChange={ ( val ) => onChange( index, 'isDefault', val ) }
				help={ __(
					'Pre-selects this option when the step loads — the shopper still has to click to advance. Only the first option flagged this way across the step is used.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Badge', 'sgs-blocks' ) }
				value={ option.badge || '' }
				onChange={ ( val ) => onChange( index, 'badge', val.slice( 0, BADGE_MAX_LENGTH ) ) }
				maxLength={ BADGE_MAX_LENGTH }
				help={ __(
					'Optional. A short pill shown on the card, e.g. "EASIEST". Leave blank for no badge.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextareaControl
				label={ __( 'Description', 'sgs-blocks' ) }
				value={ option.description || '' }
				onChange={ ( val ) => onChange( index, 'description', val.slice( 0, DESCRIPTION_MAX_LENGTH ) ) }
				maxLength={ DESCRIPTION_MAX_LENGTH }
				help={ __(
					'Optional. One line shown under the option label. Leave blank for none.',
					'sgs-blocks'
				) }
				rows={ 2 }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Summary wording', 'sgs-blocks' ) }
				value={ option.summaryText || '' }
				onChange={ ( val ) => onChange( index, 'summaryText', val ) }
				help={ __( 'Optional. How the summary shows this answer, e.g. "Sending it later". Leave blank for the label.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<SelectControl
				label={ __( 'Photo treatment while chosen', 'sgs-blocks' ) }
				value={ option.stageEffect || '' }
				options={ [
					{ label: __( 'None', 'sgs-blocks' ), value: '' },
					{ label: __( 'Dim (a matched tint)', 'sgs-blocks' ), value: 'dim' },
					{ label: __( 'Deepen (richer, darker)', 'sgs-blocks' ), value: 'deepen' },
					{ label: __( 'Soften (a touch lighter)', 'sgs-blocks' ), value: 'soften' },
					{ label: __( 'Brighten (clear)', 'sgs-blocks' ), value: 'brighten' },
				] }
				onChange={ ( val ) => onChange( index, 'stageEffect', val ) }
				help={ __( 'The full-screen stage shows the product photo this way while this option is chosen, e.g. a lens finish.', 'sgs-blocks' ) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
		</>
	);
}
