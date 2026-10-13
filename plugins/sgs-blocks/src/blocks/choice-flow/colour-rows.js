/**
 * sgs/choice-flow — every colour row, for the block's one Styles-tab
 * SgsColourPanel (Spec 35 PART O §1 field 4(a) and 9e): progress, Back
 * button, stage and help note, header step name, the option cards' '?'
 * toggle, and the summary panel's help note. The panels that set the rest of
 * each element live on the Settings tab, where a nested Styles fill never
 * renders. A row whose element is not shown is omitted.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { fillRow, textRow } from '../../components';

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {Array} Colour rows for SgsColourPanel.
 */
export default function choiceFlowColourRows( { attributes, setAttributes } ) {
	return [
		fillRow( {
			key: 'progress-fill',
			heading: __( 'Progress', 'sgs-blocks' ),
			label: __( 'Progress bar fill', 'sgs-blocks' ),
			attrs: { base: 'progressColour', gradient: 'progressColourGradient' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'stepper',
			label: __( 'Numbered steps (not yet reached)', 'sgs-blocks' ),
			attrs: { base: 'stepperColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'stepper-active',
			label: __( 'Numbered steps (current and done)', 'sgs-blocks' ),
			attrs: { base: 'stepperActiveColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'progress-badge',
			label: __( 'Step-count badge text', 'sgs-blocks' ),
			attrs: { base: 'progressBadgeColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'eyebrow',
			label: __( 'Header step name', 'sgs-blocks' ),
			attrs: { base: 'headerEyebrowColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'back-fill',
			heading: __( 'Back button', 'sgs-blocks' ),
			label: __( 'Back button background', 'sgs-blocks' ),
			attrs: {
				base: 'backColourBackground',
				hover: 'backColourBackgroundHover',
			},
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'back-text',
			label: __( 'Back button text', 'sgs-blocks' ),
			attrs: {
				base: 'backColourText',
				hover: 'backColourTextHover',
			},
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'stage',
			heading: __( 'Stage and help note', 'sgs-blocks' ),
			label: __( 'Stage and chosen card', 'sgs-blocks' ),
			attrs: { base: 'stageColour', gradient: 'stageColourGradient' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'note-icon',
			label: __( 'Help note icon', 'sgs-blocks' ),
			attrs: { base: 'stageNoteIconColour', gradient: 'stageNoteIconColourGradient' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'note-border',
			label: __( 'Help note border', 'sgs-blocks' ),
			attrs: { base: 'stageNoteBorderColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'note-hover',
			label: __( 'Help note on hover', 'sgs-blocks' ),
			attrs: { base: 'stageNoteHoverColour', gradient: 'stageNoteHoverColourGradient' },
			attributes,
			setAttributes,
		} ),
		!! attributes.showPricePanel &&
			textRow( {
				key: 'summary-note',
				label: __( 'Help note text', 'sgs-blocks' ),
				attrs: { base: 'summaryNoteColour' },
				attributes,
				setAttributes,
			} ),
		textRow( {
			key: 'toggle',
			heading: __( 'Option cards', 'sgs-blocks' ),
			label: __( 'Option ’?’ toggle', 'sgs-blocks' ),
			attrs: { base: 'infoToggleColour' },
			attributes,
			setAttributes,
		} ),
		fillRow( {
			key: 'toggle-border',
			label: __( 'Option ’?’ toggle border', 'sgs-blocks' ),
			attrs: { base: 'infoToggleBorderColour' },
			attributes,
			setAttributes,
		} ),
	];
}
