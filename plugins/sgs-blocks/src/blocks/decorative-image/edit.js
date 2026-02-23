import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	RangeControl,
	ToggleControl,
	Button,
	SelectControl,
} from '@wordpress/components';
import { ResponsiveControl } from '../../components';

const OVERFLOW_OPTIONS = [
	{ label: __( 'Visible', 'sgs-blocks' ), value: 'visible' },
	{ label: __( 'Hidden', 'sgs-blocks' ), value: 'hidden' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		imageId,
		imageUrl,
		imageAlt,
		positionX,
		positionY,
		width,
		maxWidthPercent,
		rotation,
		opacity,
		zIndex,
		flipX,
		parallaxStrength,
		overflow,
		positionXTablet,
		positionYTablet,
		widthTablet,
		rotationTablet,
		hideOnTablet,
		positionXMobile,
		positionYMobile,
		widthMobile,
		rotationMobile,
		hideOnMobile,
	} = attributes;

	const blockProps = useBlockProps( {
		className: 'sgs-decorative-image-editor',
	} );

	const onSelectImage = ( media ) => {
		setAttributes( {
			imageId: media.id,
			imageUrl: media.url,
			imageAlt: media.alt || '',
		} );
	};

	const onRemoveImage = () => {
		setAttributes( {
			imageId: null,
			imageUrl: '',
			imageAlt: '',
		} );
	};

	// Build preview styles for editor.
	const previewStyles = {
		position: 'absolute',
		left: `${ positionX }%`,
		top: `${ positionY }%`,
		width: `${ width }px`,
		maxWidth: `${ maxWidthPercent }%`,
		opacity: opacity / 100,
		zIndex,
		pointerEvents: 'none',
		transform: [
			'translate(-50%, -50%)',
			rotation !== 0 && `rotate(${ rotation }deg)`,
			flipX && 'scaleX(-1)',
		]
			.filter( Boolean )
			.join( ' ' ),
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Position', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Position X (%)', 'sgs-blocks' ) }
						help={ __( 'Horizontal position from left edge', 'sgs-blocks' ) }
						value={ positionX }
						onChange={ ( val ) => setAttributes( { positionX: val } ) }
						min={ 0 }
						max={ 100 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Position Y (%)', 'sgs-blocks' ) }
						help={ __( 'Vertical position from top edge', 'sgs-blocks' ) }
						value={ positionY }
						onChange={ ( val ) => setAttributes( { positionY: val } ) }
						min={ 0 }
						max={ 100 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Size', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Width (px)', 'sgs-blocks' ) }
						value={ width }
						onChange={ ( val ) => setAttributes( { width: val } ) }
						min={ 50 }
						max={ 800 }
						step={ 10 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Max Width (% of parent)', 'sgs-blocks' ) }
						value={ maxWidthPercent }
						onChange={ ( val ) => setAttributes( { maxWidthPercent: val } ) }
						min={ 0 }
						max={ 50 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Transform', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Rotation (degrees)', 'sgs-blocks' ) }
						value={ rotation }
						onChange={ ( val ) => setAttributes( { rotation: val } ) }
						min={ -180 }
						max={ 180 }
						step={ 5 }
						__nextHasNoMarginBottom
					/>
					<ToggleControl
						label={ __( 'Flip horizontally', 'sgs-blocks' ) }
						checked={ flipX }
						onChange={ ( val ) => setAttributes( { flipX: val } ) }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Opacity (%)', 'sgs-blocks' ) }
						value={ opacity }
						onChange={ ( val ) => setAttributes( { opacity: val } ) }
						min={ 0 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
					/>
					<RangeControl
						label={ __( 'Z-Index', 'sgs-blocks' ) }
						help={ __( 'Stacking order (above background, below content)', 'sgs-blocks' ) }
						value={ zIndex }
						onChange={ ( val ) => setAttributes( { zIndex: val } ) }
						min={ -1 }
						max={ 10 }
						step={ 1 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Effects', 'sgs-blocks' ) }>
					<RangeControl
						label={ __( 'Parallax Strength', 'sgs-blocks' ) }
						help={ __( '0 = disabled, 100 = strong scroll effect', 'sgs-blocks' ) }
						value={ parallaxStrength }
						onChange={ ( val ) => setAttributes( { parallaxStrength: val } ) }
						min={ 0 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Overflow', 'sgs-blocks' ) }
						help={ __( 'Whether image can extend beyond parent boundaries', 'sgs-blocks' ) }
						value={ overflow }
						options={ OVERFLOW_OPTIONS }
						onChange={ ( val ) => setAttributes( { overflow: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Responsive (Tablet)', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Hide on tablet', 'sgs-blocks' ) }
						checked={ hideOnTablet }
						onChange={ ( val ) => setAttributes( { hideOnTablet: val } ) }
						__nextHasNoMarginBottom
					/>

					{ ! hideOnTablet && (
						<>
							<RangeControl
								label={ __( 'Position X (tablet)', 'sgs-blocks' ) }
								help={ __( 'Leave empty to use desktop value', 'sgs-blocks' ) }
								value={ positionXTablet ?? '' }
								onChange={ ( val ) =>
									setAttributes( {
										positionXTablet: val === '' ? undefined : val,
									} )
								}
								min={ 0 }
								max={ 100 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Position Y (tablet)', 'sgs-blocks' ) }
								help={ __( 'Leave empty to use desktop value', 'sgs-blocks' ) }
								value={ positionYTablet ?? '' }
								onChange={ ( val ) =>
									setAttributes( {
										positionYTablet: val === '' ? undefined : val,
									} )
								}
								min={ 0 }
								max={ 100 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Width (tablet, px)', 'sgs-blocks' ) }
								help={ __( 'Leave empty to use desktop value', 'sgs-blocks' ) }
								value={ widthTablet ?? '' }
								onChange={ ( val ) =>
									setAttributes( {
										widthTablet: val === '' ? undefined : val,
									} )
								}
								min={ 50 }
								max={ 800 }
								step={ 10 }
								allowReset
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Rotation (tablet, degrees)', 'sgs-blocks' ) }
								help={ __( 'Leave empty to use desktop value', 'sgs-blocks' ) }
								value={ rotationTablet ?? '' }
								onChange={ ( val ) =>
									setAttributes( {
										rotationTablet: val === '' ? undefined : val,
									} )
								}
								min={ -180 }
								max={ 180 }
								step={ 5 }
								allowReset
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>

				<PanelBody
					title={ __( 'Responsive (Mobile)', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<ToggleControl
						label={ __( 'Hide on mobile', 'sgs-blocks' ) }
						checked={ hideOnMobile }
						onChange={ ( val ) => setAttributes( { hideOnMobile: val } ) }
						__nextHasNoMarginBottom
					/>

					{ ! hideOnMobile && (
						<>
							<RangeControl
								label={ __( 'Position X (mobile)', 'sgs-blocks' ) }
								help={ __( 'Leave empty to use desktop value', 'sgs-blocks' ) }
								value={ positionXMobile ?? '' }
								onChange={ ( val ) =>
									setAttributes( {
										positionXMobile: val === '' ? undefined : val,
									} )
								}
								min={ 0 }
								max={ 100 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Position Y (mobile)', 'sgs-blocks' ) }
								help={ __( 'Leave empty to use desktop value', 'sgs-blocks' ) }
								value={ positionYMobile ?? '' }
								onChange={ ( val ) =>
									setAttributes( {
										positionYMobile: val === '' ? undefined : val,
									} )
								}
								min={ 0 }
								max={ 100 }
								step={ 1 }
								allowReset
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Width (mobile, px)', 'sgs-blocks' ) }
								help={ __( 'Leave empty to use desktop value', 'sgs-blocks' ) }
								value={ widthMobile ?? '' }
								onChange={ ( val ) =>
									setAttributes( {
										widthMobile: val === '' ? undefined : val,
									} )
								}
								min={ 50 }
								max={ 800 }
								step={ 10 }
								allowReset
								__nextHasNoMarginBottom
							/>
							<RangeControl
								label={ __( 'Rotation (mobile, degrees)', 'sgs-blocks' ) }
								help={ __( 'Leave empty to use desktop value', 'sgs-blocks' ) }
								value={ rotationMobile ?? '' }
								onChange={ ( val ) =>
									setAttributes( {
										rotationMobile: val === '' ? undefined : val,
									} )
								}
								min={ -180 }
								max={ 180 }
								step={ 5 }
								allowReset
								__nextHasNoMarginBottom
							/>
						</>
					) }
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ ! imageUrl ? (
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ onSelectImage }
							allowedTypes={ [ 'image' ] }
							value={ imageId }
							render={ ( { open } ) => (
								<div className="sgs-decorative-image-editor__placeholder">
									<Button onClick={ open } variant="primary">
										{ __( 'Select Decorative Image', 'sgs-blocks' ) }
									</Button>
									<p className="sgs-decorative-image-editor__help">
										{ __(
											'Decorative images float absolutely over sections with optional parallax effects.',
											'sgs-blocks'
										) }
									</p>
								</div>
							) }
						/>
					</MediaUploadCheck>
				) : (
					<div className="sgs-decorative-image-editor__preview-wrapper">
						<div
							className="sgs-decorative-image-editor__preview-container"
							style={ { position: 'relative', minHeight: '400px' } }
						>
							<img
								src={ imageUrl }
								alt={ imageAlt || __( 'Decorative image preview', 'sgs-blocks' ) }
								className="sgs-decorative-image-editor__preview"
								style={ previewStyles }
							/>
						</div>
						<div className="sgs-decorative-image-editor__actions">
							<MediaUploadCheck>
								<MediaUpload
									onSelect={ onSelectImage }
									allowedTypes={ [ 'image' ] }
									value={ imageId }
									render={ ( { open } ) => (
										<Button onClick={ open } variant="secondary">
											{ __( 'Replace Image', 'sgs-blocks' ) }
										</Button>
									) }
								/>
								<Button
									onClick={ onRemoveImage }
									variant="secondary"
									isDestructive
								>
									{ __( 'Remove Image', 'sgs-blocks' ) }
								</Button>
							</MediaUploadCheck>
						</div>
					</div>
				) }
			</div>
		</>
	);
}
