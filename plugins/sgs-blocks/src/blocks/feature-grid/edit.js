import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
} from '@wordpress/block-editor';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { ResponsiveControl } from '../../components';

const LAYOUT_MODE_OPTIONS = [
	{
		label: __( 'Auto-flex (responsive wrap)', 'sgs-blocks' ),
		value: 'auto-flex',
	},
	{
		label: __( 'Fixed columns', 'sgs-blocks' ),
		value: 'fixed-columns',
	},
];

// Units for the "Min item width" control (NOT the gap — gap is now the shared
// ContainerWrapperControls control). Restored after the gap-unit removal over-deleted it.
const UNIT_OPTIONS = [
	{ label: 'px', value: 'px' },
	{ label: 'em', value: 'em' },
	{ label: 'rem', value: 'rem' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
	{ label: __( 'Start', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'End', 'sgs-blocks' ), value: 'end' },
];

const TEMPLATE = [
	[ 'sgs/info-box', { showMedia: true, showTitle: true, showText: true } ],
	[ 'sgs/info-box', { showMedia: true, showTitle: true, showText: true } ],
	[ 'sgs/info-box', { showMedia: true, showTitle: true, showText: true } ],
	[ 'sgs/info-box', { showMedia: true, showTitle: true, showText: true } ],
];

/**
 * Build the live grid CSS for the editor preview.
 *
 * Mirrors the logic in render.php so what you see in the editor
 * matches the frontend output.
 *
 * gap is now a full CSS value string (e.g. "24px", "40" for preset slug).
 * Preset slugs (bare digits) are wrapped in a spacing-preset var on the
 * frontend; the editor preview passes the value through directly which is
 * good enough for layout preview purposes.
 *
 * @param {Object} attributes Block attributes.
 * @return {Object} React inline style object.
 */
function buildGridStyle( attributes ) {
	const {
		layoutMode,
		columnsDesktop,
		minItemWidth,
		minItemWidthUnit,
		gap,
		alignItems,
		justifyItems,
	} = attributes;

	// For editor preview: if gap looks like a bare slug (digits only), render
	// it as a spacing-preset CSS var; otherwise pass through as-is.
	const gapCss = gap && /^\d+$/.test( String( gap ) )
		? `var(--wp--preset--spacing--${ gap })`
		: ( gap || '24px' );

	if ( 'auto-flex' === layoutMode ) {
		return {
			display: 'grid',
			gridTemplateColumns: `repeat(auto-fill, minmax(${ minItemWidth }${ minItemWidthUnit }, 1fr))`,
			gap: gapCss,
			alignItems,
			justifyItems,
		};
	}

	return {
		display: 'grid',
		gridTemplateColumns: `repeat(${ columnsDesktop }, 1fr)`,
		gap: gapCss,
		alignItems,
		justifyItems,
	};
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		layoutMode,
		columnsDesktop,
		columnsTablet,
		columnsMobile,
		minItemWidth,
		minItemWidthUnit,
		gap,
		alignItems,
		justifyItems,
	} = attributes;

	const blockProps = useBlockProps( {
		className: `sgs-feature-grid sgs-feature-grid--${ layoutMode }`,
		style: buildGridStyle( attributes ),
	} );

	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		allowedBlocks: [ 'sgs/info-box' ],
		template: TEMPLATE,
		templateLock: false,
		orientation: 'horizontal',
	} );

	return (
		<>
			<InspectorControls>
				<ContainerWrapperControls attributes={ attributes } setAttributes={ setAttributes } kind="layout" />
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Layout mode', 'sgs-blocks' ) }
						value={ layoutMode }
						options={ LAYOUT_MODE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { layoutMode: val } )
						}
						help={
							'auto-flex' === layoutMode
								? __(
										'Items wrap automatically when there is not enough space for another at the minimum width.',
										'sgs-blocks'
								  )
								: __(
										'Items fill an exact number of columns per breakpoint.',
										'sgs-blocks'
								  )
						}
						__nextHasNoMarginBottom
					/>

					{ 'auto-flex' === layoutMode && (
						<UnitControl
							label={ __( 'Min item width', 'sgs-blocks' ) }
							value={ `${ minItemWidth }${ minItemWidthUnit || 'px' }` }
							units={ [
								{ value: 'px',  label: 'px',  default: 200 },
								{ value: 'em',  label: 'em',  default: 10 },
								{ value: 'rem', label: 'rem', default: 10 },
							] }
							onChange={ ( val ) => {
								const unit = val?.replace( /[\d.]+/, '' ) || 'px';
								const num  = parseFloat( val ) || 120;
								setAttributes( { minItemWidth: num, minItemWidthUnit: unit } );
							} }
							__nextHasNoMarginBottom
						/>
					) }

					{ 'fixed-columns' === layoutMode && (
						<ResponsiveControl label={ __( 'Columns', 'sgs-blocks' ) }>
							{ ( breakpoint ) => {
								const attrMap = {
									desktop: 'columnsDesktop',
									tablet:  'columnsTablet',
									mobile:  'columnsMobile',
								};
								const maxMap = { desktop: 6, tablet: 4, mobile: 2 };
								const attr = attrMap[ breakpoint ];
								return (
									<RangeControl
										value={ attributes[ attr ] }
										onChange={ ( val ) =>
											setAttributes( { [ attr ]: val } )
										}
										min={ 1 }
										max={ maxMap[ breakpoint ] }
										__nextHasNoMarginBottom
									/>
								);
							} }
						</ResponsiveControl>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Alignment', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Align items (cross-axis)', 'sgs-blocks' ) }
						value={ alignItems }
						options={ ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { alignItems: val } )
						}
						help={ __(
							'Controls vertical alignment of items within each row.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __(
							'Justify items (inline-axis)',
							'sgs-blocks'
						) }
						value={ justifyItems }
						options={ ALIGN_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { justifyItems: val } )
						}
						help={ __(
							'Controls horizontal alignment of items within their grid cell.',
							'sgs-blocks'
						) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
