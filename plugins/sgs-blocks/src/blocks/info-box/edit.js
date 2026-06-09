import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
} from '@wordpress/components';
// WS-4: shared sgs/container wrapper editor controls (content kind = width/spacing only).
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';

/**
 * FR-22-6 migration: all card content (icon/media, heading, subtitle,
 * description, and button) is now rendered as InnerBlocks child blocks.
 * RichText inline editing of heading/description/subtitle has been removed —
 * those elements are now editable as child blocks in the InnerBlocks slot.
 *
 * Inspector controls cover only WRAPPER-level styling/layout that render.php
 * actually consumes:
 *   - cardStyle, hoverEffect, iconPosition (drive wrapper BEM classes)
 *   - the shared sgs/container wrapper controls (width/spacing, content kind)
 *
 * HC2 cleanup (2026-06-08): the per-element colour / font-size / icon-size and
 * legacy-link controls were removed. They were dead — the child blocks
 * (sgs/icon, sgs/heading, sgs/text, sgs/multi-button) own their own colour,
 * font size and link, so the parent controls set attributes render.php never
 * read. The removed attrs survive only in deprecated.js for back-compat.
 */

const CARD_STYLE_OPTIONS = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const HOVER_EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Lift', 'sgs-blocks' ), value: 'lift' },
	{ label: __( 'Border accent', 'sgs-blocks' ), value: 'border-accent' },
	{ label: __( 'Glow', 'sgs-blocks' ), value: 'glow' },
];

const ICON_POSITION_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'top' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'left' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'right' },
];

/**
 * Default InnerBlocks template for a new info-box.
 * Produces: icon → heading → description paragraph → button.
 * Operators customise the child blocks in place in the editor.
 */
const INFO_BOX_TEMPLATE = [
	[ 'sgs/icon', { icon: 'star-filled', iconColour: 'primary', iconBackgroundColour: 'accent-light', iconSize: 'medium' } ],
	[ 'sgs/heading', { level: 'h3', headingRole: 'heading', content: __( 'Feature heading', 'sgs-blocks' ) } ],
	[ 'sgs/text', { text: __( 'Describe the feature or benefit here.', 'sgs-blocks' ) } ],
	[
		'sgs/multi-button',
		{},
		[ [ 'sgs/button', { inheritStyle: 'primary', label: __( 'Learn More', 'sgs-blocks' ) } ] ],
	],
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		cardStyle,
		hoverEffect,
		iconPosition,
	} = attributes;

	const className = [
		'sgs-info-box',
		`sgs-info-box--${ cardStyle }`,
		`sgs-info-box--hover-${ hoverEffect }`,
		`sgs-info-box--media-${ iconPosition }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	// FR-22-6: single InnerBlocks slot covers ALL card content.
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template:     INFO_BOX_TEMPLATE,
		// Open: converter injects varied child block combinations.
		// Do not lock allowedBlocks so the editor remains flexible.
	} );

	return (
		<>
			<InspectorControls>
				{ /* WS-4: mirrored sgs/container wrapper controls (content kind = width/spacing). */ }
				<ContainerWrapperControls
					attributes={ attributes }
					setAttributes={ setAttributes }
					kind="content"
				/>
				{ /* ===== Card Style ===== */ }
				<PanelBody title={ __( 'Card Style', 'sgs-blocks' ) } initialOpen={ true }>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLE_OPTIONS }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Hover effect', 'sgs-blocks' ) }
						value={ hoverEffect }
						options={ HOVER_EFFECT_OPTIONS }
						onChange={ ( val ) => setAttributes( { hoverEffect: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				{ /* ===== Layout ===== */ }
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Media position', 'sgs-blocks' ) }
						value={ iconPosition }
						options={ ICON_POSITION_OPTIONS }
						onChange={ ( val ) => setAttributes( { iconPosition: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

			</InspectorControls>

			{ /* FR-22-6: innerBlocksProps spread onto the wrapper div — the
			     InnerBlocks slot IS the card content area. */ }
			<div { ...innerBlocksProps } />
		</>
	);
}
