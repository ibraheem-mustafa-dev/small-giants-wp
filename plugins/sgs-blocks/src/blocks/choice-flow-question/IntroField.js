/**
 * "Intro" field for `sgs/choice-flow-question` (FR-43-24) — an optional
 * short paragraph shown under the question title, in both the `compact` and
 * `showcase` layouts (rendered by `includes/choice-flow-showcase.php`'s
 * `sgs_choice_flow_question_intro_html()`; style.css caps its width to
 * about 56 characters only in `showcase`).
 *
 * Also this question's eyebrow (replaces "Question N of M"), how its option
 * prices read ("+£30.00" or "from £59.00") and its stage line's label.
 *
 * Bare fields (no own PanelBody) — the main thread mounts it inside the
 * existing "Title" panel in edit.js, next to the question-weight control,
 * matching the `TitlePanel` precedent already set in this directory.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl, TextareaControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export default function IntroField( { attributes, setAttributes } ) {
	const { intro, eyebrow, pricePrefix, priceGroup, summaryLabel } = attributes;

	return (
		<>
			<TextareaControl
				label={ __( 'Intro text', 'sgs-blocks' ) }
				value={ intro || '' }
				onChange={ ( val ) => setAttributes( { intro: val } ) }
				help={ __(
					'An optional short line under the question title. Keep it brief — the showcase layout caps it to about 56 characters wide.',
					'sgs-blocks'
				) }
				rows={ 2 }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'Eyebrow', 'sgs-blocks' ) }
				value={ eyebrow || '' }
				onChange={ ( val ) => setAttributes( { eyebrow: val } ) }
				help={ __(
					'Replaces the "Question 1 of 3" line above this question, e.g. "Last bit, and it can wait". This question is then left out of the count. Leave blank for the count.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ priceGroup && (
				<SelectControl
					label={ __( 'Option prices read as', 'sgs-blocks' ) }
					value={ pricePrefix || 'plus' }
					options={ [
						{ label: __( 'An extra, e.g. +£30.00', 'sgs-blocks' ), value: 'plus' },
						{ label: __( 'A starting price, e.g. from £59.00', 'sgs-blocks' ), value: 'from' },
					] }
					onChange={ ( val ) => setAttributes( { pricePrefix: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
			{ ! priceGroup && (
				<TextControl
					label={ __( 'Summary line label', 'sgs-blocks' ) }
					value={ summaryLabel || '' }
					onChange={ ( val ) => setAttributes( { summaryLabel: val } ) }
					help={ __( 'How the summary names this answer, e.g. "Prescription". Leave blank for the step’s label.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
			) }
		</>
	);
}
