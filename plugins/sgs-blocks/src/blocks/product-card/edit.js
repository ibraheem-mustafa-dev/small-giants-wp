import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	Notice,
} from '@wordpress/components';

/**
 * FR-22-6 card template — all content as InnerBlocks.
 *
 * Document order: image → heading (name) → text (description) →
 * text (price) → label (badge/tag) → multi-button (CTA).
 *
 * templateLock: false so editors can reorder or remove items.
 * The pipeline emits these block types; this template matches that
 * emitted structure for new inserts from the editor.
 */
const CARD_TEMPLATE = [
	[ 'sgs/media', { mediaType: 'image' } ],
	[ 'core/heading', { level: 3, placeholder: __( 'Product name', 'sgs-blocks' ) } ],
	[ 'sgs/text', { placeholder: __( 'Short description…', 'sgs-blocks' ) } ],
	[ 'sgs/text', { placeholder: __( 'Price — e.g. £10.00 · 8-pack', 'sgs-blocks' ) } ],
	[ 'sgs/label', {} ],
	[ 'sgs/multi-button', {}, [
		[ 'sgs/button', { inheritStyle: 'primary', label: __( 'Shop Now', 'sgs-blocks' ) } ],
	] ],
];

const ALLOWED_BLOCKS = [
	'sgs/media',
	'core/heading',
	'sgs/text',
	'sgs/label',
	'sgs/multi-button',
	'sgs/button',
];

export default function Edit( { attributes, setAttributes } ) {
	const { variantStyle } = attributes;

	const isTrial    = variantStyle === 'trial';
	const isFeatured = variantStyle === 'featured';

	const blockProps = useBlockProps( {
		className: [
			'product-card',
			isTrial    ? 'trial-card'    : '',
			isFeatured ? 'featured-card' : '',
		].filter( Boolean ).join( ' ' ),
	} );

	// useInnerBlocksProps wires the InnerBlocks slot directly to the
	// wrapper div (correct SGS pattern per CLAUDE.md gotchas).
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		template: CARD_TEMPLATE,
		templateLock: false,
		allowedBlocks: ALLOWED_BLOCKS,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Card variant', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Variant style', 'sgs-blocks' ) }
						value={ variantStyle }
						options={ [
							{ value: 'standard', label: __( 'Standard', 'sgs-blocks' ) },
							{ value: 'trial',    label: __( 'Trial (dashed border + gradient)', 'sgs-blocks' ) },
							{ value: 'featured', label: __( 'Featured', 'sgs-blocks' ) },
						] }
						onChange={ ( v ) => setAttributes( { variantStyle: v } ) }
						__nextHasNoMarginBottom
					/>
					<Notice status="info" isDismissible={ false } style={ { marginTop: 8 } }>
						{ __(
							'Card content (image, name, description, price, badge, CTA) is now managed directly in the editor. Click any inner block to edit it.',
							'sgs-blocks'
						) }
					</Notice>
				</PanelBody>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
