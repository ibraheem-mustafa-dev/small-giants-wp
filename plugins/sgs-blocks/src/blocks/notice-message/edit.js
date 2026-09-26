import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	useInnerBlocksProps,
	BlockControls,
} from '@wordpress/block-editor';
import { PanelBody, TextControl, ToolbarGroup } from '@wordpress/components';
import { SgsColourPanel, fillRow, textRow } from '../../components';

/**
 * Default InnerBlocks template — mirrors sgs/notice-banner's own starter
 * (one sgs/text child), applied only on insert. No template lock (U-15
 * design §3.1) — an operator can add a button, icon or (once built)
 * sgs/local-time alongside or instead of the text.
 */
const NOTICE_MESSAGE_TEMPLATE = [
	[
		'sgs/text',
		{ text: __( 'Write your rotating message here.', 'sgs-blocks' ), tag: 'p' },
	],
];

export default function Edit( { attributes, setAttributes } ) {
	const { backgroundColour, backgroundColourGradient, textColour, textColourGradient, label } = attributes;

	const blockProps = useBlockProps( { className: 'sgs-notice-message' } );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: NOTICE_MESSAGE_TEMPLATE,
	} );

	return (
		<>
			<BlockControls>
				<ToolbarGroup>
					<div style={ { padding: '4px 8px' } }>
						<TextControl
							label={ __( 'List view label', 'sgs-blocks' ) }
							value={ label }
							onChange={ ( val ) => setAttributes( { label: val ?? '' } ) }
							placeholder={ __( 'e.g. Slide 1', 'sgs-blocks' ) }
							help={ __( 'Editor only — never rendered on the frontend.', 'sgs-blocks' ) }
							__nextHasNoMarginBottom
							__next40pxDefaultSize
						/>
					</div>
				</ToolbarGroup>
			</BlockControls>
			<SgsColourPanel
				rows={ [
					fillRow( {
						key: 'background',
						label: __( 'Background colour', 'sgs-blocks' ),
						attrs: {
							base: 'backgroundColour',
							gradient: 'backgroundColourGradient',
						},
						attributes,
						setAttributes,
					} ),
					textRow( {
						key: 'text',
						label: __( 'Text colour', 'sgs-blocks' ),
						attrs: {
							base: 'textColour',
							gradient: 'textColourGradient',
						},
						attributes,
						setAttributes,
					} ),
				] }
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Message', 'sgs-blocks' ) } initialOpen={ true }>
					{ ! backgroundColour && ! textColour && (
						<p>
							{ __(
								'No colours set — this message inherits the banner’s own colours.',
								'sgs-blocks'
							) }
						</p>
					) }
				</PanelBody>
			</InspectorControls>
			<div { ...innerBlocksProps } />
		</>
	);
}
