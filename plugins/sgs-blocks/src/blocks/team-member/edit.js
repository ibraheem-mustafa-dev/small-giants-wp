import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	useInnerBlocksProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import ContainerWrapperControls from '../container/components/ContainerWrapperControls';
import MediaPicker from '../../components/MediaPicker';
import { colourVar } from '../../utils';

const CARD_STYLES = [
	{ label: __( 'Flat', 'sgs-blocks' ), value: 'flat' },
	{ label: __( 'Bordered', 'sgs-blocks' ), value: 'bordered' },
	{ label: __( 'Elevated', 'sgs-blocks' ), value: 'elevated' },
	{ label: __( 'Filled', 'sgs-blocks' ), value: 'filled' },
];

const PHOTO_SHAPES = [
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Rounded', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
];

const DISPLAY_MODES = [
	{ label: __( 'Full (photo, name, role, bio, socials)', 'sgs-blocks' ), value: 'full' },
	{ label: __( 'Compact (photo, name, role)', 'sgs-blocks' ), value: 'compact' },
];

/**
 * InnerBlocks template: default to one sgs/social-icons child.
 * Social links are now composed via InnerBlocks rather than a flat
 * socialLinks array attribute — allows full block editor control over
 * each sgs/social-icons instance including its own icon/label/style
 * controls without bespoke inspector UI here.
 */
const TEMPLATE = [ [ 'sgs/social-icons' ] ];

export default function Edit( { attributes, setAttributes } ) {
	const {
		memberMedia,
		photo,
		name,
		role,
		bio,
		nameColour,
		roleColour,
		cardStyle,
		photoShape,
		hoverOverlay,
		displayMode,
	} = attributes;

	const isCompact = 'compact' === displayMode;

	// Hydrate from new memberMedia first, fall back to legacy photo.
	const activeMedia = ( memberMedia && memberMedia.url )
		? memberMedia
		: ( photo && photo.url
			? {
				url: photo.url,
				type: 'image',
				id: photo.id || 0,
				alt: photo.alt || '',
				mime: 'image/jpeg',
			}
			: null
		);

	const handleMediaChange = ( media ) => {
		if ( ! media ) {
			setAttributes( { memberMedia: null, photo: undefined } );
			return;
		}
		setAttributes( {
			memberMedia: media,
			// Mirror to legacy attr so older render paths / schema markup keep working.
			photo: { id: media.id, url: media.url, alt: media.alt },
		} );
	};

	const className = [
		'sgs-team-member',
		`sgs-team-member--${ cardStyle }`,
		isCompact && 'sgs-team-member--compact',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( { className } );

	// Social icons rendered as InnerBlocks — editors use the sgs/social-icons
	// block inspector directly for platform/URL/label/style controls.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'sgs-team-member__social' },
		{
			template: TEMPLATE,
			templateLock: false,
			allowedBlocks: [ 'sgs/social-icons' ],
		}
	);

	return (
		<>
			<ContainerWrapperControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				kind="content"
			/>
			<InspectorControls>
				<PanelBody title={ __( 'Card Settings', 'sgs-blocks' ) }>
					<SelectControl
						label={ __( 'Display mode', 'sgs-blocks' ) }
						help={ __(
							'Compact shows photo, name and role only — ideal for dense team grids.',
							'sgs-blocks'
						) }
						value={ displayMode }
						options={ DISPLAY_MODES }
						onChange={ ( val ) => setAttributes( { displayMode: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Card style', 'sgs-blocks' ) }
						value={ cardStyle }
						options={ CARD_STYLES }
						onChange={ ( val ) => setAttributes( { cardStyle: val } ) }
						__nextHasNoMarginBottom
					/>
					<SelectControl
						label={ __( 'Photo shape', 'sgs-blocks' ) }
						value={ photoShape }
						options={ PHOTO_SHAPES }
						onChange={ ( val ) => setAttributes( { photoShape: val } ) }
						__nextHasNoMarginBottom
					/>
					{ ! isCompact && (
						<ToggleControl
							label={ __( 'Hover overlay (bio)', 'sgs-blocks' ) }
							help={ __( 'Reveals the bio as a slide-up overlay on the photo when hovered or focused. On touch devices, tap the photo to toggle.', 'sgs-blocks' ) }
							checked={ hoverOverlay }
							onChange={ ( val ) => setAttributes( { hoverOverlay: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Colours', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Name colour', 'sgs-blocks' ) }
						value={ nameColour }
						onChange={ ( val ) => setAttributes( { nameColour: val } ) }
					/>
					<DesignTokenPicker
						label={ __( 'Role colour', 'sgs-blocks' ) }
						value={ roleColour }
						onChange={ ( val ) => setAttributes( { roleColour: val } ) }
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className={ `sgs-team-member__photo sgs-team-member__photo--${ photoShape }` }>
					<MediaPicker
						value={ activeMedia }
						onChange={ handleMediaChange }
						onRemove={ () => setAttributes( { memberMedia: null, photo: undefined } ) }
						allowedTypes={ [ 'image' ] }
						label={ __( 'Select photo', 'sgs-blocks' ) }
						instructionsImage={ __( 'Choose a headshot photo for this team member', 'sgs-blocks' ) }
					/>
				</div>
				<RichText
					tagName="h3"
					className="sgs-team-member__name"
					value={ name }
					onChange={ ( val ) => setAttributes( { name: val } ) }
					placeholder={ __( 'Name', 'sgs-blocks' ) }
					style={ { color: colourVar( nameColour ) || undefined } }
				/>
				<RichText
					tagName="p"
					className="sgs-team-member__role"
					value={ role }
					onChange={ ( val ) => setAttributes( { role: val } ) }
					placeholder={ __( 'Role / Title', 'sgs-blocks' ) }
					style={ { color: colourVar( roleColour ) || undefined } }
				/>
				{ ! isCompact && (
					<RichText
						tagName="p"
						className="sgs-team-member__bio"
						value={ bio }
						onChange={ ( val ) => setAttributes( { bio: val } ) }
						placeholder={ __( 'Short bio…', 'sgs-blocks' ) }
					/>
				) }
				{ /* Social InnerBlocks persist in data; only shown in full mode. */ }
				<div { ...innerBlocksProps } hidden={ isCompact } />
			</div>
		</>
	);
}
