import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
} from '@wordpress/components';
import { ResponsiveControl, SpacingControl, DesignTokenPicker } from '../../components';
import { spacingVar, shadowVar } from '../../utils';

const SHAPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: '' },
	{ label: __( 'Wave', 'sgs-blocks' ), value: 'wave' },
	{ label: __( 'Wave (Smooth)', 'sgs-blocks' ), value: 'wave-smooth' },
	{ label: __( 'Triangle', 'sgs-blocks' ), value: 'triangle' },
	{ label: __( 'Triangle (Asymmetric)', 'sgs-blocks' ), value: 'triangle-asymmetric' },
	{ label: __( 'Curve', 'sgs-blocks' ), value: 'curve' },
	{ label: __( 'Curve (Asymmetric)', 'sgs-blocks' ), value: 'curve-asymmetric' },
	{ label: __( 'Zigzag', 'sgs-blocks' ), value: 'zigzag' },
	{ label: __( 'Cloud', 'sgs-blocks' ), value: 'cloud' },
	{ label: __( 'Slant', 'sgs-blocks' ), value: 'slant' },
	{ label: __( 'Slant (Gentle)', 'sgs-blocks' ), value: 'slant-gentle' },
	{ label: __( 'Mountains', 'sgs-blocks' ), value: 'mountains' },
	{ label: __( 'Drops', 'sgs-blocks' ), value: 'drops' },
];

const LAYOUT_OPTIONS = [
	{ label: __( 'Stack', 'sgs-blocks' ), value: 'stack' },
	{ label: __( 'Flex', 'sgs-blocks' ), value: 'flex' },
	{ label: __( 'Grid', 'sgs-blocks' ), value: 'grid' },
];

const TAG_OPTIONS = [
	{ label: 'section', value: 'section' },
	{ label: 'div', value: 'div' },
	{ label: 'article', value: 'article' },
	{ label: 'aside', value: 'aside' },
	{ label: 'main', value: 'main' },
];

const WIDTH_OPTIONS = [
	{ label: __( 'Content', 'sgs-blocks' ), value: 'content' },
	{ label: __( 'Wide', 'sgs-blocks' ), value: 'wide' },
	{ label: __( 'Full', 'sgs-blocks' ), value: 'full' },
];

const ALIGN_OPTIONS = [
	{ label: __( 'Top', 'sgs-blocks' ), value: 'start' },
	{ label: __( 'Centre', 'sgs-blocks' ), value: 'center' },
	{ label: __( 'Bottom', 'sgs-blocks' ), value: 'end' },
	{ label: __( 'Stretch', 'sgs-blocks' ), value: 'stretch' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		layout,
		columns,
		gap,
		backgroundImage,
		backgroundOverlayColour,
		backgroundOverlayOpacity,
		shadow,
		maxWidth,
		minHeight,
		verticalAlign,
	} = attributes;

	const style = {
		gap: spacingVar( gap ),
		minHeight: minHeight || undefined,
		...( shadow && { boxShadow: shadowVar( shadow ) } ),
		...( backgroundImage?.url && {
			backgroundImage: `url(${ backgroundImage.url })`,
			backgroundSize: 'cover',
			backgroundPosition: 'center',
		} ),
	};

	if ( layout === 'grid' ) {
		style.display = 'grid';
		style.gridTemplateColumns = `repeat(${ columns }, 1fr)`;
		style.alignItems = verticalAlign;
	} else if ( layout === 'flex' ) {
		style.display = 'flex';
		style.flexWrap = 'wrap';
		style.alignItems = verticalAlign;
	}

	const className = [
		'sgs-container',
		`sgs-container--${ layout }`,
		`sgs-container--width-${ maxWidth }`,
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( { className, style } );
	const innerBlocksProps = useInnerBlocksProps( blockProps, {
		orientation: layout === 'stack' ? 'vertical' : undefined,
	} );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Layout', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Layout type', 'sgs-blocks' ) }
						value={ layout }
						options={ LAYOUT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { layout: val } )
						}
						__nextHasNoMarginBottom
					/>

					{ layout === 'grid' && (
						<ResponsiveControl
							label={ __( 'Columns', 'sgs-blocks' ) }
						>
							{ ( breakpoint ) => {
								const attrMap = {
									desktop: 'columns',
									tablet: 'columnsTablet',
									mobile: 'columnsMobile',
								};
								const attr = attrMap[ breakpoint ];
								return (
									<RangeControl
										value={ attributes[ attr ] }
										onChange={ ( val ) =>
											setAttributes( {
												[ attr ]: val,
											} )
										}
										min={ 1 }
										max={
											breakpoint === 'mobile' ? 3 : 6
										}
										__nextHasNoMarginBottom
									/>
								);
							} }
						</ResponsiveControl>
					) }

					<SpacingControl
						label={ __( 'Gap', 'sgs-blocks' ) }
						value={ gap }
						onChange={ ( val ) =>
							setAttributes( { gap: val } )
						}
					/>

					<ToggleGroupControl
						label={ __( 'Max width', 'sgs-blocks' ) }
						value={ maxWidth }
						onChange={ ( val ) =>
							setAttributes( { maxWidth: val } )
						}
						isBlock
						__nextHasNoMarginBottom
					>
						{ WIDTH_OPTIONS.map( ( opt ) => (
							<ToggleGroupControlOption
								key={ opt.value }
								value={ opt.value }
								label={ opt.label }
							/>
						) ) }
					</ToggleGroupControl>

					{ ( layout === 'flex' || layout === 'grid' ) && (
						<SelectControl
							label={ __(
								'Vertical alignment',
								'sgs-blocks'
							) }
							value={ verticalAlign }
							options={ ALIGN_OPTIONS }
							onChange={ ( val ) =>
								setAttributes( { verticalAlign: val } )
							}
							__nextHasNoMarginBottom
						/>
					) }

					<SelectControl
						label={ __( 'Min height', 'sgs-blocks' ) }
						value={ minHeight || '' }
						options={ [
							{
								label: __( 'Auto', 'sgs-blocks' ),
								value: '',
							},
							{ label: '200px', value: '200px' },
							{ label: '400px', value: '400px' },
							{ label: '600px', value: '600px' },
							{ label: '100vh', value: '100vh' },
						] }
						onChange={ ( val ) =>
							setAttributes( { minHeight: val } )
						}
						__nextHasNoMarginBottom
					/>

					<SelectControl
						label={ __( 'HTML tag', 'sgs-blocks' ) }
						value={ attributes.htmlTag }
						options={ TAG_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { htmlTag: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Background Image', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) =>
								setAttributes( {
									backgroundImage: {
										id: media.id,
										url: media.url,
										alt: media.alt,
									},
								} )
							}
							allowedTypes={ [ 'image' ] }
							value={ backgroundImage?.id }
							render={ ( { open } ) => (
								<div>
									{ backgroundImage?.url ? (
										<>
											<img
												src={ backgroundImage.url }
												alt=""
												style={ {
													maxWidth: '100%',
													marginBottom: '8px',
												} }
											/>
											<Button
												variant="secondary"
												onClick={ () =>
													setAttributes( {
														backgroundImage:
															undefined,
													} )
												}
												isDestructive
											>
												{ __(
													'Remove image',
													'sgs-blocks'
												) }
											</Button>
										</>
									) : (
										<Button
											variant="secondary"
											onClick={ open }
										>
											{ __(
												'Select image',
												'sgs-blocks'
											) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>

					{ backgroundImage?.url && (
						<>
							<DesignTokenPicker
								label={ __(
									'Overlay colour',
									'sgs-blocks'
								) }
								value={ backgroundOverlayColour }
								onChange={ ( val ) =>
									setAttributes( {
										backgroundOverlayColour: val,
									} )
								}
							/>
							<RangeControl
								label={ __(
									'Overlay opacity (%)',
									'sgs-blocks'
								) }
								value={ backgroundOverlayOpacity }
								onChange={ ( val ) =>
									setAttributes( {
										backgroundOverlayOpacity: val,
									} )
								}
								min={ 0 }
								max={ 100 }
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Shadow', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Shadow', 'sgs-blocks' ) }
						value={ shadow || '' }
						options={ [
							{
								label: __( 'None', 'sgs-blocks' ),
								value: '',
							},
							{ label: 'Small', value: 'sm' },
							{ label: 'Medium', value: 'md' },
							{ label: 'Large', value: 'lg' },
							{ label: 'Glow', value: 'glow' },
						] }
						onChange={ ( val ) =>
							setAttributes( { shadow: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Shape Dividers', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '8px' } }>
						{ __( 'Top Divider', 'sgs-blocks' ) }
					</p>
					<SelectControl
						label={ __( 'Shape', 'sgs-blocks' ) }
						value={ attributes.shapeDividerTop || '' }
						options={ SHAPE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { shapeDividerTop: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ attributes.shapeDividerTop && (
						<>
							<DesignTokenPicker
								label={ __( 'Colour', 'sgs-blocks' ) }
								value={ attributes.shapeDividerTopColour }
								onChange={ ( val ) =>
									setAttributes( { shapeDividerTopColour: val } )
								}
							/>
							<RangeControl
								label={ __( 'Height (px)', 'sgs-blocks' ) }
								value={ attributes.shapeDividerTopHeight }
								onChange={ ( val ) =>
									setAttributes( { shapeDividerTopHeight: val } )
								}
								min={ 20 }
								max={ 300 }
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Flip horizontally', 'sgs-blocks' ) }
								checked={ attributes.shapeDividerTopFlip }
								onChange={ ( val ) =>
									setAttributes( { shapeDividerTopFlip: val } )
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Invert vertically', 'sgs-blocks' ) }
								checked={ attributes.shapeDividerTopInvert }
								onChange={ ( val ) =>
									setAttributes( { shapeDividerTopInvert: val } )
								}
								__nextHasNoMarginBottom
							/>
						</>
					) }

					<hr style={ { margin: '16px 0' } } />

					<p className="components-base-control__label" style={ { fontWeight: 600, marginBottom: '8px' } }>
						{ __( 'Bottom Divider', 'sgs-blocks' ) }
					</p>
					<SelectControl
						label={ __( 'Shape', 'sgs-blocks' ) }
						value={ attributes.shapeDividerBottom || '' }
						options={ SHAPE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { shapeDividerBottom: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ attributes.shapeDividerBottom && (
						<>
							<DesignTokenPicker
								label={ __( 'Colour', 'sgs-blocks' ) }
								value={ attributes.shapeDividerBottomColour }
								onChange={ ( val ) =>
									setAttributes( { shapeDividerBottomColour: val } )
								}
							/>
							<RangeControl
								label={ __( 'Height (px)', 'sgs-blocks' ) }
								value={ attributes.shapeDividerBottomHeight }
								onChange={ ( val ) =>
									setAttributes( { shapeDividerBottomHeight: val } )
								}
								min={ 20 }
								max={ 300 }
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Flip horizontally', 'sgs-blocks' ) }
								checked={ attributes.shapeDividerBottomFlip }
								onChange={ ( val ) =>
									setAttributes( { shapeDividerBottomFlip: val } )
								}
								__nextHasNoMarginBottom
							/>
							<ToggleControl
								label={ __( 'Invert vertically', 'sgs-blocks' ) }
								checked={ attributes.shapeDividerBottomInvert }
								onChange={ ( val ) =>
									setAttributes( { shapeDividerBottomInvert: val } )
								}
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...innerBlocksProps } />
		</>
	);
}
