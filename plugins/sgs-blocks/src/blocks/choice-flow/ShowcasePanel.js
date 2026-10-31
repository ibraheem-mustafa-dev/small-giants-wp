/**
 * sgs/choice-flow — the full-screen flow's finishing settings (Spec 43
 * FR-43-19, FR-43-24): how progress counts, the position line's wording,
 * the logo's height, the note's icon, the stage's placeholder line, the
 * footer's skip link and the option cards' picture size (OptionCardsPanel).
 * The stage, help-note, header step-name and '?' toggle colours are rows in
 * the block's Styles-tab colour panel (`colour-rows.js`).
 *
 * Its own component: edit.js is over its size cap, so it mounts this with
 * one import and one render line (the ChromePanel/FlowLayoutPanel pattern).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { InspectorControls } from '@wordpress/block-editor';
import { PanelBody, RangeControl, SelectControl, TextControl, ToggleControl } from '@wordpress/components';
import OptionCardsPanel from './OptionCardsPanel';

import SgsFreeTextField from '../../components/SgsFreeTextField';
/**
 * @param {Object}   o
 * @param {Object}   o.attributes    Block attributes.
 * @param {Function} o.setAttributes Block setAttributes.
 * @return {JSX.Element} The panels, mounted inside their own InspectorControls.
 */
export default function ShowcasePanel( { attributes, setAttributes } ) {
	const { progressCounts, headerLogoHeight, summaryPendingLabel, stageNoteIcon, skipAddsToBag } = attributes;
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
				<SgsFreeTextField
	type="rich"
	label={ __( 'Skip link lead-in', 'sgs-blocks' ) }
	help={ __( 'Shown before the skip link on the first question, e.g. "Frame only?".', 'sgs-blocks' ) }
	value={ attributes.skipPrompt || '' }
	onChange={ ( val ) => setAttributes( { skipPrompt: val } ) }
/>
				<SgsFreeTextField
	type="rich" noLink
	label={ __( 'Skip link', 'sgs-blocks' ) }
	help={ __( 'e.g. "Skip the lenses". It takes the route of the option set to add to the bag with no add-ons; with no such option it does not show. Leave blank for none.', 'sgs-blocks' ) }
	value={ attributes.skipLabel || '' }
	onChange={ ( val ) => setAttributes( { skipLabel: val } ) }
/>
				<ToggleControl
					label={ __( 'Skip adds the frame to the bag', 'sgs-blocks' ) }
					checked={ !! skipAddsToBag }
					onChange={ ( val ) => setAttributes( { skipAddsToBag: val } ) }
					help={ __( 'The skip link adds the product, with its chosen variation and no add-ons, to the bag, then closes the pop-up. Off: it goes to the ending of the no add-ons option.', 'sgs-blocks' ) }
					__nextHasNoMarginBottom
				/>
			</PanelBody>

			<PanelBody title={ __( 'Stage', 'sgs-blocks' ) } initialOpen={ false }>
				<SgsFreeTextField
	type="rich" noLink
	label={ __( 'Placeholder line', 'sgs-blocks' ) }
	help={ __( 'Shown until the first priced choice, e.g. "Lenses". Leave blank for none.', 'sgs-blocks' ) }
	value={ attributes.summaryPendingLabel || '' }
	onChange={ ( val ) => setAttributes( { summaryPendingLabel: val } ) }
/>
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
			</PanelBody>

			<OptionCardsPanel attributes={ attributes } setAttributes={ setAttributes } />
		</InspectorControls>
	);
}
