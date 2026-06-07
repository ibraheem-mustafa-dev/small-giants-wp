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
} from '@wordpress/components';

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
						<>
							<div
								style={ {
									display: 'flex',
									gap: '8px',
									alignItems: 'flex-end',
								} }
							>
								<div style={ { flex: 1 } }>
									<RangeControl
										label={ __(
											'Min item width',
											'sgs-blocks'
										) }
										value={ minItemWidth }
										onChange={ ( val ) =>
											setAttributes( {
												minItemWidth: val,
											} )
										}
										min={ 120 }
										max={ 400 }
										step={ 10 }
										__nextHasNoMarginBottom
									/>
								</div>
								<SelectControl
									label={ __( 'Unit', 'sgs-blocks' ) }
									value={ minItemWidthUnit }
									options={ UNIT_OPTIONS }
									onChange={ ( val ) =>
										setAttributes( {
											minItemWidthUnit: val,
										} )
									}
									style={ { width: '70px' } }
									__nextHasNoMarginBottom
								/>
							</div>
						</>
					) }

					{ 'fixed-columns' === layoutMode && (
						<>
							<RangeControl
								label={ __( 'Columns — desktop', 'sgs-blocks' ) }
								value={ columnsDesktop }
								onChange={ ( val ) =>
									setAttributes( { columnsDesktop: val } )
								}
								min={ 1 }
								max={ 6 }
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Columns — tablet', 'sgs-blocks' ) }
								value={ columnsTablet }
								onChange={ ( val ) =>
									setAttributes( { columnsTablet: val } )
								}
								min={ 1 }
								max={ 4 }
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Columns — mobile', 'sgs-blocks' ) }
								value={ columnsMobile }
								onChange={ ( val ) =>
									setAttributes( { columnsMobile: val } )
								}
								min={ 1 }
								max={ 2 }
								__nextHasNoMarginBottom
							/>
						</>
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
