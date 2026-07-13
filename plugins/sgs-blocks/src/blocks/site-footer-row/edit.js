import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import { PanelBody, SelectControl, RangeControl } from '@wordpress/components';
import { ResponsiveControl, SpacingControl } from '../../components';
import { ResponsiveSpacingPanel } from '../container/components/ContainerWrapperControls';

const ALLOWED_BLOCKS = [
	'core/group',
	'sgs/responsive-logo',
	'core/site-logo',
	'core/site-title',
	'core/heading',
	'core/paragraph',
	'core/list',
	'core/social-links',
	'core/html',
	'sgs/business-info',
	'sgs/button',
	'core/buttons',
];

// Distribution maps to the shared wrapper's justifyContent attr (flex rows only).
const DISTRIBUTION_OPTIONS = [
	{ label: __( '— default (left) —', 'sgs-blocks' ), value: '' },
	{ label: __( 'Left', 'sgs-blocks' ), value: 'flex-start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Right', 'sgs-blocks' ), value: 'flex-end' },
	{ label: __( 'Spread apart', 'sgs-blocks' ), value: 'space-between' },
];

const ROW_LABELS = {
	top: __( 'Top row — CTA / newsletter strip', 'sgs-blocks' ),
	columns: __( 'Columns row — up to 6 columns (collapse to 1 on mobile)', 'sgs-blocks' ),
	bottom: __( 'Bottom bar — copyright / legal / attribution', 'sgs-blocks' ),
};

export default function Edit( { attributes, setAttributes } ) {
	const {
		rowSlot,
		layout,
		columns,
		gap,
		justifyContent,
	} = attributes;

	const isGrid = 'grid' === layout;

	// Editor preview mirrors the frontend: grid rows preview as a column grid,
	// flex rows as a wrapping cluster. The never-overflow guarantee (min-width:0)
	// comes from style.css; this inline preview just aids editing.
	const previewStyle = isGrid
		? {
				display: 'grid',
				gridTemplateColumns:
					attributes.gridTemplateColumns ||
					`repeat(${ Math.max( 1, columns || 1 ) }, 1fr)`,
				gap: gap || '48px',
		  }
		: {
				display: 'flex',
				flexWrap: 'wrap',
				alignItems: 'center',
				gap: gap || 'clamp(0.5rem, 2vw, 1.5rem)',
				justifyContent: justifyContent || 'flex-start',
		  };

	const blockProps = useBlockProps( {
		className: `sgs-site-footer-row${ rowSlot ? ` sgs-site-footer-row--${ rowSlot }` : '' }`,
		style: previewStyle,
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		templateLock: false,
		orientation: isGrid ? 'horizontal' : 'horizontal',
		renderAppender: undefined,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Footer row', 'sgs-blocks' ) }>
					{ rowSlot && (
						<p className="components-base-control__help">
							{ ROW_LABELS[ rowSlot ] || rowSlot }
						</p>
					) }

					{ isGrid && (
						<>
							<RangeControl
								label={ __( 'Columns (desktop)', 'sgs-blocks' ) }
								value={ columns || 1 }
								onChange={ ( val ) =>
									setAttributes( { columns: val } )
								}
								min={ 1 }
								max={ 6 }
								help={ __(
									'Up to 6 columns. Columns collapse to a single column below the mobile breakpoint.',
									'sgs-blocks'
								) }
								__nextHasNoMarginBottom
							/>
							<ResponsiveControl label={ __( 'Columns per device', 'sgs-blocks' ) }>
								{ ( breakpoint ) => {
									const attrMap = {
										desktop: 'columns',
										tablet: 'columnsTablet',
										mobile: 'columnsMobile',
									};
									const attr = attrMap[ breakpoint ];
									const max = 'mobile' === breakpoint ? 3 : 'tablet' === breakpoint ? 4 : 6;
									return (
										<RangeControl
											value={ attributes[ attr ] || 1 }
											onChange={ ( val ) =>
												setAttributes( { [ attr ]: val } )
											}
											min={ 1 }
											max={ max }
											__nextHasNoMarginBottom
										/>
									);
								} }
							</ResponsiveControl>
						</>
					) }

					{ ! isGrid && (
						<SelectControl
							label={ __( 'Distribution', 'sgs-blocks' ) }
							value={ justifyContent || '' }
							options={ DISTRIBUTION_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { justifyContent: val } )
							}
							help={ __(
								'How elements spread across the row. Elements always wrap to a new line rather than overflowing.',
								'sgs-blocks'
							) }
							__nextHasNoMarginBottom
						/>
					) }

					<ResponsiveControl label={ __( 'Gap', 'sgs-blocks' ) }>
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
									onChange={ ( val ) =>
										setAttributes( { [ attr ]: val } )
									}
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
