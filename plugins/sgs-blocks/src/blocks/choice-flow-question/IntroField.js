/**
 * "Intro" field for `sgs/choice-flow-question` (FR-43-24) — an optional
 * short paragraph shown under the question title, in both the `compact` and
 * `showcase` layouts (rendered by `includes/choice-flow-showcase.php`'s
 * `sgs_choice_flow_question_intro_html()`; style.css caps its width to
 * about 56 characters only in `showcase`).
 *
 * A bare field (no own PanelBody) — the main thread mounts it inside the
 * existing "Title" panel in edit.js, next to the question-weight control,
 * matching the `TitlePanel` precedent already set in this directory.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { TextareaControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block attribute setter.
 */
export default function IntroField( { attributes, setAttributes } ) {
	const { intro } = attributes;

	return (
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
	);
}
