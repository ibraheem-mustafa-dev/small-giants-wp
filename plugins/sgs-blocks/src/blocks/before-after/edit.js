/**
 * Editor for sgs/before-after.
 *
 * Fully dynamic block: save() returns null, all output comes from
 * render.php. The canvas shows a live <ServerSideRender> preview so the
 * frame/labels/divider position reflect real render.php output — never a
 * hand-built editor-only approximation (ssr-fixes-hand-built-preview-drift).
 *
 * Spec 38 §9 editor canvas story for Draggable effects: STATIC (the
 * server-rendered CSS-only split at `startPosition`), with a Notice reading
 * "Drag interactions are live-site only" — view.js is a frontend-only
 * viewScriptModule and never runs in wp-admin, so there is nothing to fake
 * here; the static preview IS the truth.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	Button,
	TextControl,
	ToggleControl,
	RangeControl,
	SelectControl,
	Notice,
	Spinner,
	__experimentalUnitControl as UnitControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import ServerSideRender from '@wordpress/server-side-render';
import {
	DesignTokenPicker,
	TypographyControls,
	ResponsiveControl,
	ResponsiveBorderRadiusControl,
} from '../../components';

const HEIGHT_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: 'vh', label: 'vh' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
	{ value: '%', label: '%' },
];

const WIDTH_UNITS = [
	{ value: 'px', label: 'px' },
	{ value: '%', label: '%' },
	{ value: 'em', label: 'em' },
	{ value: 'rem', label: 'rem' },
];

/**
 * One before/after image picker row.
 *
 * @param {Object}   root0
 * @param {string}   root0.label
 * @param {string}   root0.url
 * @param {string}   root0.alt
 * @param {Function} root0.onSelect
 * @param {Function} root0.onAltChange
 * @param {Function} root0.onClear
 */
function ImagePickerRow( { label, url, alt, onSelect, onAltChange, onClear } ) {
	return (
		<div style={ { marginBottom: '16px' } }>
			<p style={ { marginBottom: '4px', fontWeight: 500 } }>{ label }</p>
			<MediaUploadCheck>
				<MediaUpload
					onSelect={ onSelect }
					allowedTypes={ [ 'image' ] }
					value={ url }
					render={ ( { open } ) => (
						<Button
							variant={ url ? 'secondary' : 'primary' }
							onClick={ open }
							style={ { marginBottom: '8px' } }
						>
							{ url
								? __( 'Replace image', 'sgs-blocks' )
								: __( 'Select image', 'sgs-blocks' ) }
						</Button>
					) }
				/>
			</MediaUploadCheck>
			{ url && (
				<>
					<img
						src={ url }
						alt=""
						style={ {
							display: 'block',
							width: '100%',
							maxHeight: '120px',
							objectFit: 'cover',
							borderRadius: '4px',
							marginBottom: '8px',
						} }
					/>
					<TextControl
						label={ __( 'Alt text', 'sgs-blocks' ) }
						help={ __(
							'Required — describes this image for screen-reader and no-JS visitors, who see both images without any comparison interaction.',
							'sgs-blocks'
						) }
						value={ alt }
						onChange={ onAltChange }
						__nextHasNoMarginBottom
					/>
					<Button
						variant="tertiary"
						isDestructive
						onClick={ onClear }
						style={ { marginTop: '4px' } }
					>
						{ __( 'Remove', 'sgs-blocks' ) }
					</Button>
				</>
			) }
		</div>
	);
}

export default function Edit( { attributes, setAttributes } ) {
	const blockProps = useBlockProps();

	const {
		beforeImageUrl,
		beforeImageAlt,
		afterImageUrl,
		afterImageAlt,
		showLabels,
		beforeLabel,
		afterLabel,
		labelColour,
		labelBackgroundColour,
		orientation,
		startPosition,
		fxDraggable,
		dividerColour,
		dividerWidth,
		handleColour,
		handleIconColour,
		heightUnit,
		boxShadow,
		style,
		borderRadiusTablet,
		borderRadiusMobile,
	} = attributes;

	const hasBothImages = !! beforeImageUrl && !! afterImageUrl;

	return (
		<>
			<InspectorControls group="settings">
				<PanelBody title={ __( 'Images', 'sgs-blocks' ) } initialOpen>
					<ImagePickerRow
						label={ __( 'Before image', 'sgs-blocks' ) }
						url={ beforeImageUrl }
						alt={ beforeImageAlt }
						onSelect={ ( media ) =>
							setAttributes( {
								beforeImageId: media.id,
								beforeImageUrl: media.url,
								beforeImageAlt:
									beforeImageAlt || media.alt || '',
							} )
						}
						onAltChange={ ( val ) =>
							setAttributes( { beforeImageAlt: val } )
						}
						onClear={ () =>
							setAttributes( {
								beforeImageId: null,
								beforeImageUrl: '',
								beforeImageAlt: '',
							} )
						}
					/>
					<ImagePickerRow
						label={ __( 'After image', 'sgs-blocks' ) }
						url={ afterImageUrl }
						alt={ afterImageAlt }
						onSelect={ ( media ) =>
							setAttributes( {
								afterImageId: media.id,
								afterImageUrl: media.url,
								afterImageAlt: afterImageAlt || media.alt || '',
							} )
						}
						onAltChange={ ( val ) =>
							setAttributes( { afterImageAlt: val } )
						}
						onClear={ () =>
							setAttributes( {
								afterImageId: null,
								afterImageUrl: '',
								afterImageAlt: '',
							} )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Divider', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<SelectControl
						label={ __( 'Orientation', 'sgs-blocks' ) }
						value={ orientation }
						options={ [
							{
								value: 'horizontal',
								label: __(
									'Horizontal (left/right)',
									'sgs-blocks'
								),
							},
							{
								value: 'vertical',
								label: __(
									'Vertical (top/bottom)',
									'sgs-blocks'
								),
							},
						] }
						onChange={ ( val ) =>
							setAttributes( { orientation: val } )
						}
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Default split position', 'sgs-blocks' ) }
						help={ __(
							'Where the divider sits before a visitor drags it — also the ENTIRE comparison a no-JS visitor sees.',
							'sgs-blocks'
						) }
						value={ startPosition }
						onChange={ ( val ) =>
							setAttributes( { startPosition: val ?? 50 } )
						}
						min={ 0 }
						max={ 100 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Free drag on image', 'sgs-blocks' ) }
						help={ __(
							'Adds pointer drag anywhere on the image (GSAP Draggable), layered on top of the always-available keyboard/touch slider. Turning this off still leaves the divider fully operable via the slider handle and arrow keys.',
							'sgs-blocks'
						) }
						checked={ !! fxDraggable }
						onChange={ ( val ) =>
							setAttributes( { fxDraggable: val } )
						}
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Divider colour', 'sgs-blocks' ) }
						value={ dividerColour }
						onChange={ ( val ) =>
							setAttributes( { dividerColour: val } )
						}
					/>
					<RangeControl
						label={ __( 'Divider thickness (px)', 'sgs-blocks' ) }
						value={ dividerWidth }
						onChange={ ( val ) =>
							setAttributes( { dividerWidth: val ?? 3 } )
						}
						min={ 1 }
						max={ 12 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Handle colour', 'sgs-blocks' ) }
						value={ handleColour }
						onChange={ ( val ) =>
							setAttributes( { handleColour: val } )
						}
					/>
					<DesignTokenPicker
						label={ __( 'Handle icon colour', 'sgs-blocks' ) }
						value={ handleIconColour }
						onChange={ ( val ) =>
							setAttributes( { handleIconColour: val } )
						}
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Labels', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Show labels', 'sgs-blocks' ) }
						checked={ !! showLabels }
						onChange={ ( val ) =>
							setAttributes( { showLabels: val } )
						}
						__nextHasNoMarginBottom
					/>
					{ showLabels && (
						<>
							<TextControl
								label={ __( 'Before label', 'sgs-blocks' ) }
								value={ beforeLabel }
								onChange={ ( val ) =>
									setAttributes( { beforeLabel: val } )
								}
								__nextHasNoMarginBottom
							/>
							<TextControl
								label={ __( 'After label', 'sgs-blocks' ) }
								value={ afterLabel }
								onChange={ ( val ) =>
									setAttributes( { afterLabel: val } )
								}
								__nextHasNoMarginBottom
							/>
							<DesignTokenPicker
								label={ __(
									'Label text colour',
									'sgs-blocks'
								) }
								value={ labelColour }
								onChange={ ( val ) =>
									setAttributes( { labelColour: val } )
								}
							/>
							<DesignTokenPicker
								label={ __(
									'Label background colour',
									'sgs-blocks'
								) }
								value={ labelBackgroundColour }
								onChange={ ( val ) =>
									setAttributes( {
										labelBackgroundColour: val,
									} )
								}
							/>
							<TypographyControls
								attributes={ attributes }
								setAttributes={ setAttributes }
								prefix="label"
								showLetterSpacing={ false }
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Frame size', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ResponsiveControl label={ __( 'Height', 'sgs-blocks' ) }>
						{ ( bp ) => {
							const key = {
								desktop: 'height',
								tablet: 'heightTablet',
								mobile: 'heightMobile',
							}[ bp ];
							const val = attributes[ key ];
							return (
								<UnitControl
									value={
										null === val || undefined === val
											? ''
											: `${ val }${ heightUnit }`
									}
									onChange={ ( v ) => {
										if ( ! v ) {
											setAttributes( { [ key ]: null } );
											return;
										}
										const parsed = Number.parseFloat( v );
										const unitMatch = /[a-z%]+$/i.exec(
											String( v )
										);
										setAttributes( {
											[ key ]: Number.isFinite( parsed )
												? parsed
												: null,
											...( 'desktop' === bp && unitMatch
												? { heightUnit: unitMatch[ 0 ] }
												: {} ),
										} );
									} }
									units={ HEIGHT_UNITS }
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveControl>
					<ResponsiveControl
						label={ __( 'Max width', 'sgs-blocks' ) }
					>
						{ ( bp ) => {
							const key = {
								desktop: 'maxWidth',
								tablet: 'maxWidthTablet',
								mobile: 'maxWidthMobile',
							}[ bp ];
							return (
								<UnitControl
									value={ attributes[ key ] || '' }
									onChange={ ( v ) =>
										setAttributes( { [ key ]: v || null } )
									}
									units={ WIDTH_UNITS }
									__next40pxDefaultSize
								/>
							);
						} }
					</ResponsiveControl>
				</PanelBody>
			</InspectorControls>

			<InspectorControls group="styles">
				<ToolsPanel
					label={ __( 'Frame styling', 'sgs-blocks' ) }
					resetAll={ () =>
						setAttributes( {
							boxShadow: '',
							style: {
								...style,
								border: { ...style?.border, radius: {} },
							},
							borderRadiusTablet: {},
							borderRadiusMobile: {},
						} )
					}
				>
					<ToolsPanelItem
						label={ __( 'Shadow', 'sgs-blocks' ) }
						hasValue={ () => !! boxShadow }
						onDeselect={ () => setAttributes( { boxShadow: '' } ) }
						isShownByDefault
					>
						<TextControl
							label={ __( 'Box shadow', 'sgs-blocks' ) }
							help={ __(
								'CSS box-shadow value, e.g. "0 4px 12px rgba(0,0,0,0.15)".',
								'sgs-blocks'
							) }
							value={ boxShadow }
							onChange={ ( val ) =>
								setAttributes( { boxShadow: val } )
							}
							__nextHasNoMarginBottom
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={ __( 'Border radius', 'sgs-blocks' ) }
						hasValue={ () =>
							Object.keys( style?.border?.radius ?? {} ).length >
								0 ||
							Object.keys( borderRadiusTablet ?? {} ).length >
								0 ||
							Object.keys( borderRadiusMobile ?? {} ).length > 0
						}
						onDeselect={ () =>
							setAttributes( {
								style: {
									...style,
									border: { ...style?.border, radius: {} },
								},
								borderRadiusTablet: {},
								borderRadiusMobile: {},
							} )
						}
						isShownByDefault
					>
						<ResponsiveBorderRadiusControl
							label={ __( 'Border radius', 'sgs-blocks' ) }
							values={ {
								base: style?.border?.radius ?? {},
								tablet: borderRadiusTablet ?? {},
								mobile: borderRadiusMobile ?? {},
							} }
							onChange={ ( tier, next ) => {
								if ( 'base' === tier ) {
									setAttributes( {
										style: {
											...style,
											border: {
												...style?.border,
												radius: next,
											},
										},
									} );
								} else {
									setAttributes( {
										[ `borderRadius${
											'tablet' === tier
												? 'Tablet'
												: 'Mobile'
										}` ]: next,
									} );
								}
							} }
						/>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! hasBothImages ? (
					<div className="wp-block-sgs-before-after-editor__placeholder">
						<p>
							{ __(
								'Select a Before image and an After image to preview the comparison slider.',
								'sgs-blocks'
							) }
						</p>
					</div>
				) : (
					<>
						<Notice
							status="info"
							isDismissible={ false }
							className="wp-block-sgs-before-after-editor__notice"
						>
							{ __(
								'Drag interactions are live-site only — this preview shows the default split position.',
								'sgs-blocks'
							) }
						</Notice>
						<ServerSideRender
							block="sgs/before-after"
							attributes={ attributes }
							LoadingResponsePlaceholder={ () => (
								<div
									style={ {
										padding: '2rem',
										textAlign: 'center',
									} }
								>
									<Spinner />
								</div>
							) }
							ErrorResponsePlaceholder={ ( { response } ) => (
								<Notice status="error" isDismissible={ false }>
									{ response?.errorMsg ||
										__(
											'Preview failed to load.',
											'sgs-blocks'
										) }
								</Notice>
							) }
						/>
					</>
				) }
			</div>
		</>
	);
}
