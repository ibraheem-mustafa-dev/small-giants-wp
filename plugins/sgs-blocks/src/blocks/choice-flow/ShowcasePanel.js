/**
 * sgs/choice-flow — the full-screen flow's finishing settings (Spec 43
 * FR-43-19, FR-43-24): how progress counts, the position line's wording,
 * the logo's height, the stage and help-note colours, the note's icon, the
 * stage's placeholder line and the footer's skip link.
 *
 * Its own component: edit.js is over its size cap, so it mounts this with
 * one import and one render line (the ChromePanel/FlowLayoutPanel pattern).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl, TextControl } from '@wordpress/components';
import { SgsColourPanel } from '../../components';
import fillRow from '../../components/colour-variants/fillRow';

/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panels, mounted inside their own InspectorControls.
 */
export default function ShowcasePanel( { attributes, setAttributes } ) {
	const { progressCounts, headerLogoHeight, summaryPendingLabel, stageNoteIcon } = attributes;
	const text = ( key, label, help ) => (
		<TextControl
			label={ label }
			value={ attributes[ key ] || '' }
			onChange={ ( val ) => setAttributes( { [ key ]: val } ) }
			help={ help }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);

	return (
		<InspectorControls>
			<PanelBody title={ __( 'Progress and steps', 'sgs-blocks' ) } initialOpen={ false }>
				<SelectControl
					label={ __( 'Progress line counts', 'sgs-blocks' ) }
					value={ progressCounts || 'finished' }
					options={ [
						{ label: __( 'Questions answered', 'sgs-blocks' ), value: 'finished' },
						{ label: __( 'The question on screen', 'sgs-blocks' ), value: 'current' },
					] }
					onChange={ ( val ) => setAttributes( { progressCounts: val } ) }
					help={ __( 'Answered: empty on the first question. On screen: the first of four questions fills a quarter.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ text(
					'stepCountLabel',
					__( 'Position word', 'sgs-blocks' ),
					__( 'The word before the position, e.g. "Question" gives "Question 1 of 3". A question with its own eyebrow shows that instead and is not counted.', 'sgs-blocks' )
				) }
				<RangeControl
					label={ __( 'Header logo height (px)', 'sgs-blocks' ) }
					value={ headerLogoHeight ?? 32 }
					onChange={ ( val ) => setAttributes( { headerLogoHeight: val ?? 32 } ) }
					min={ 12 }
					max={ 80 }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				{ text(
					'skipPrompt',
					__( 'Skip link lead-in', 'sgs-blocks' ),
					__( 'Shown before the skip link on the first question, e.g. "Frame only?".', 'sgs-blocks' )
				) }
				{ text(
					'skipLabel',
					__( 'Skip link', 'sgs-blocks' ),
					__( 'e.g. "Skip the lenses". It takes the route of the option set to add to the bag with no add-ons; with no such option it does not show. Leave blank for none.', 'sgs-blocks' )
				) }
			</PanelBody>

			<PanelBody title={ __( 'Stage', 'sgs-blocks' ) } initialOpen={ false }>
				{ text(
					'summaryPendingLabel',
					__( 'Placeholder line', 'sgs-blocks' ),
					__( 'Shown until the first priced choice, e.g. "Lenses". Leave blank for none.', 'sgs-blocks' )
				) }
				{ summaryPendingLabel && text( 'summaryPendingText', __( 'Placeholder value', 'sgs-blocks' ), '' ) }
				<SelectControl
					label={ __( 'Help note icon', 'sgs-blocks' ) }
					value={ stageNoteIcon || 'none' }
					options={ [
						{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
						{ label: __( 'WhatsApp', 'sgs-blocks' ), value: 'whatsapp' },
						{ label: __( 'Phone', 'sgs-blocks' ), value: 'phone' },
						{ label: __( 'Email', 'sgs-blocks' ), value: 'email' },
						{ label: __( 'Chat', 'sgs-blocks' ), value: 'chat' },
					] }
					onChange={ ( val ) => setAttributes( { stageNoteIcon: val } ) }
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				/>
				<SgsColourPanel
					rows={ [
						fillRow( {
							key: 'stage',
							label: __( 'Stage and chosen card', 'sgs-blocks' ),
							attrs: { base: 'stageColour' },
							attributes,
							setAttributes,
						} ),
						fillRow( {
							key: 'note-icon',
							label: __( 'Help note icon', 'sgs-blocks' ),
							attrs: { base: 'stageNoteIconColour' },
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
							attrs: { base: 'stageNoteHoverColour' },
							attributes,
							setAttributes,
						} ),
					] }
				/>
			</PanelBody>
		</InspectorControls>
	);
}
