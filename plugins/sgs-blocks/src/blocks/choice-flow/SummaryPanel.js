/**
 * "Summary panel" inspector controls for `sgs/choice-flow` — Spec 43 D4 +
 * FR-43-24 (v1.8.0). Extracted into its own file rather than growing
 * edit.js or `PricingSettingsPanel.js` (both already at or near this
 * codebase's 250-line JS guideline).
 *
 * `showPricePanel` (Pricing's own toggle) still gates the whole panel —
 * unchanged meaning, "show the panel" — so this settings group only shows
 * once that's on, same pattern `PricingSettingsPanel.js` itself uses for its
 * own conditional fields. `stageNote`/`stageNoteLink` are FR-43-24's help
 * note for the `showcase` full-screen layout's stage, but stored on the same
 * root attributes the `compact` layout's panel here also renders into (one
 * settings surface for both).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { PanelBody, ToggleControl, SelectControl, TextControl } from '@wordpress/components';

/**
 * @param {Object}   props
 * @param {boolean}  props.showPricePanel   Current `showPricePanel` attribute (Pricing panel's own toggle).
 * @param {boolean}  props.summaryShowImage Current `summaryShowImage` attribute.
 * @param {string}   props.summaryPosition  Current `summaryPosition` attribute ('start'|'end').
 * @param {string}   props.summaryBaseLabel Current `summaryBaseLabel` attribute (FIXES item 4).
 * @param {string}   props.stageNote        Current `stageNote` attribute.
 * @param {Object}   props.stageNoteLink    Current `stageNoteLink` attribute ({url,text}).
 * @param {Function} props.setAttributes    Block attribute setter.
 */
export default function SummaryPanel( {
	showPricePanel,
	summaryShowImage,
	summaryPosition,
	summaryBaseLabel,
	stageNote,
	stageNoteLink,
	setAttributes,
} ) {
	if ( ! showPricePanel ) {
		return null;
	}

	const link = stageNoteLink && 'object' === typeof stageNoteLink ? stageNoteLink : {};

	return (
		<PanelBody title={ __( 'Summary panel', 'sgs-blocks' ) } initialOpen={ false }>
			<ToggleControl
				label={ __( 'Show product image', 'sgs-blocks' ) }
				checked={ !! summaryShowImage }
				onChange={ ( val ) => setAttributes( { summaryShowImage: val } ) }
				help={ __(
					'The resolved variation’s photo once one is chosen, else the product’s own featured image.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
			/>
			<SelectControl
				label={ __( 'Panel position (desktop)', 'sgs-blocks' ) }
				value={ summaryPosition || 'start' }
				options={ [
					{ label: __( 'Left of the steps', 'sgs-blocks' ), value: 'start' },
					{ label: __( 'Right of the steps', 'sgs-blocks' ), value: 'end' },
				] }
				onChange={ ( val ) => setAttributes( { summaryPosition: val } ) }
				help={ __(
					'Below 1024px the panel is a collapsible "Your box" row above the steps either way.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Base price label', 'sgs-blocks' ) }
				value={ summaryBaseLabel || '' }
				onChange={ ( val ) => setAttributes( { summaryBaseLabel: val } ) }
				help={ __(
					'FIXES item 4: the running lines’ first row label — default "Base price"; e.g. "Frame" for an eyewear flow.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			<TextControl
				label={ __( 'Help note', 'sgs-blocks' ) }
				value={ stageNote || '' }
				onChange={ ( val ) => setAttributes( { stageNote: val } ) }
				help={ __(
					'FR-43-24: shown in the full-screen "showcase" stage, e.g. "Not sure which to pick? Message me". Leave blank for none.',
					'sgs-blocks'
				) }
				__nextHasNoMarginBottom
				__next40pxDefaultSize
			/>
			{ stageNote && (
				<>
					<TextControl
						label={ __( 'Note link text', 'sgs-blocks' ) }
						value={ link.text || '' }
						onChange={ ( val ) => setAttributes( { stageNoteLink: { ...link, text: val } } ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
					<TextControl
						label={ __( 'Note link URL', 'sgs-blocks' ) }
						value={ link.url || '' }
						onChange={ ( val ) => setAttributes( { stageNoteLink: { ...link, url: val } } ) }
						help={ __( 'Both text and URL are needed for the link to show.', 'sgs-blocks' ) }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</>
			) }
		</PanelBody>
	);
}
