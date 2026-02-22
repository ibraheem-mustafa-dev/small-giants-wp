import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	RangeControl,
	Button,
	TextControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const EFFECT_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Parallax', 'sgs-blocks' ), value: 'parallax' },
	{ label: __( 'Float', 'sgs-blocks' ), value: 'float' },
	{ label: __( 'Reveal on scroll', 'sgs-blocks' ), value: 'reveal' },
];

const MASK_SHAPE_OPTIONS = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Blob', 'sgs-blocks' ), value: 'blob' },
	{ label: __( 'Hexagon', 'sgs-blocks' ), value: 'hexagon' },
	{ label: __( 'Diamond', 'sgs-blocks' ), value: 'diamond' },
];

const OBJECT_FIT_OPTIONS = [
	{ label: __( 'Cover', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Fill', 'sgs-blocks' ), value: 'fill' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		imageId,
		imageUrl,
		imageAlt,
		effect,
		maskShape,
		overlayColour,
		overlayOpacity,
		width,
		height,
		objectFit,
	} = attributes;

	const className = [
		'sgs-decorative-image',
		effect !== 'none' && `sgs-decorative-image--${ effect }`,
		maskShape !== 'none' && `sgs-decorative-image--mask-${ maskShape }`,
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( { className } );

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

	const overlayStyle = {
		backgroundColor: colourVar( overlayColour ) || overlayColour || undefined,
		opacity: overlayOpacity > 0 ? overlayOpacity / 100 : undefined,
	};

	const imageStyle = {
		width: width || '100%',
		height: height || 'auto',
		objectFit,
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Image Settings', 'sgs-blocks' ) }>
					<TextControl
						label={ __( 'Width', 'sgs-blocks' ) }
						help={ __(
							'e.g. 100%, 600px, 50vw',
							'sgs-blocks'
						) }
						value={ width }
						onChange={ ( val ) =>
							setAttributes( { width: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Height', 'sgs-blocks' ) }
						help={ __(
							'e.g. auto, 400px, 50vh',
							'sgs-blocks'
						) }
						value={ height }
						onChange={ ( val ) =>
							setAttributes( { height: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Object fit', 'sgs-blocks' ) }
						value={ objectFit }
						options={ OBJECT_FIT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { objectFit: val } )
						}
						__nextHasNoMarginBottom
					/>
					<TextControl
						label={ __( 'Alt text (optional)', 'sgs-blocks' ) }
						help={ __(
							'Decorative images are marked aria-hidden, but alt text helps editors understand the image.',
							'sgs-blocks'
						) }
						value={ imageAlt }
						onChange={ ( val ) =>
							setAttributes( { imageAlt: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Effects', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Effect', 'sgs-blocks' ) }
						value={ effect }
						options={ EFFECT_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { effect: val } )
						}
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Mask shape', 'sgs-blocks' ) }
						value={ maskShape }
						options={ MASK_SHAPE_OPTIONS }
						onChange={ ( val ) =>
							setAttributes( { maskShape: val } )
						}
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody
					title={ __( 'Overlay', 'sgs-blocks' ) }
					initialOpen={ false }
				>
					<DesignTokenPicker
						label={ __( 'Overlay colour', 'sgs-blocks' ) }
						value={ overlayColour }
						onChange={ ( val ) =>
							setAttributes( { overlayColour: val } )
						}
					/>
					<RangeControl
						label={ __( 'Overlay opacity', 'sgs-blocks' ) }
						value={ overlayOpacity }
						onChange={ ( val ) =>
							setAttributes( { overlayOpacity: val } )
						}
						min={ 0 }
						max={ 100 }
						step={ 5 }
						__nextHasNoMarginBottom
					/>
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
								<Button
									onClick={ open }
									variant="primary"
									className="sgs-decorative-image__upload"
								>
									{ __(
										'Select Image',
										'sgs-blocks'
									) }
								</Button>
							) }
						/>
					</MediaUploadCheck>
				) : (
					<div className="sgs-decorative-image__wrapper">
						<img
							src={ imageUrl }
							alt={ imageAlt }
							className="sgs-decorative-image__img"
							style={ imageStyle }
						/>
						{ overlayOpacity > 0 && (
							<div
								className="sgs-decorative-image__overlay"
								style={ overlayStyle }
								aria-hidden="true"
							/>
						) }
						<MediaUploadCheck>
							<Button
								onClick={ onRemoveImage }
								variant="secondary"
								isDestructive
								className="sgs-decorative-image__remove"
							>
								{ __( 'Remove Image', 'sgs-blocks' ) }
							</Button>
						</MediaUploadCheck>
					</div>
				) }
			</div>
		</>
	);
}
