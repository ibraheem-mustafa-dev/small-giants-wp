import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl } from '@wordpress/components';
import { ResponsiveControl, SpacingControl } from '../../components';
import { ResponsiveSpacingPanel } from '../container/components/ContainerWrapperControls';

const ALLOWED_BLOCKS = [
	'core/site-logo',
	'core/site-title',
	'core/navigation',
	'core/paragraph',
	'core/html',
	'core/social-links',
	'core/search',
	'sgs/mobile-nav-toggle',
	'sgs/button',
	'sgs/product-search',
	'sgs/business-info',
	'woocommerce/mini-cart',
];

// Distribution maps to the shared wrapper's justifyContent attr (consumed by
// SGS_Container_Wrapper). Curated to the four clients actually use.
const DISTRIBUTION_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Spread apart', 'sgs-blocks' ), value: 'space-between' },
];

const ROW_LABELS = {
	top: __( 'Top row — utility strip (contact, search, social)', 'sgs-blocks' ),
	middle: __( 'Middle row — logo, navigation, cart', 'sgs-blocks' ),
	bottom: __( 'Bottom row — message / business info', 'sgs-blocks' ),
};

export default function Edit( { attributes, setAttributes } ) {
	const { rowSlot, justifyContent, gap } = attributes;

	// Editor preview mirrors the frontend cluster so what you see matches the
	// deployed header. The never-overflow guarantee (flex-wrap + min-width:0)
	// comes from style.css; this inline preview just aids editing.
	const blockProps = useBlockProps( {
		className: `sgs-site-header-row${ rowSlot ? ` sgs-site-header-row--${ rowSlot }` : '' }`,
		style: {
			display: 'flex',
			flexWrap: 'wrap',
			alignItems: 'center',
			gap: gap || 'clamp(0.5rem, 2vw, 1.5rem)',
			justifyContent: justifyContent || 'flex-start',
		},
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		templateLock: false,
		orientation: 'horizontal',
		renderAppender: undefined,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Header row', 'sgs-blocks' ) }>
					{ rowSlot && (
						<p className="components-base-control__help">
							{ ROW_LABELS[ rowSlot ] || rowSlot }
						</p>
					) }
					<SelectControl
						label={ __( 'Distribution', 'sgs-blocks' ) }
						value={ justifyContent || '' }
						options={ DISTRIBUTION_OPTIONS }
						onChange={ ( val ) => setAttributes( { justifyContent: val } ) }
						help={ __(
							'How elements spread across the row. Elements always wrap to a new line rather than overflowing.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<ResponsiveControl label={ __( 'Gap between elements', 'sgs-blocks' ) }>
						{ ( breakpoint ) => {
							const attrMap = {
								desktop: 'gap',
								tablet: 'gapTablet',
								mobile: 'gapMobile',
							};
							const attr = attrMap[ breakpoint ];
							return (
								<SpacingControl
									freeInput
									value={ attributes[ attr ] || '' }
									onChange={ ( val ) => setAttributes( { [ attr ]: val } ) }
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>
				<ResponsiveSpacingPanel
					attributes={ attributes }
					setAttributes={ setAttributes }
				/>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
