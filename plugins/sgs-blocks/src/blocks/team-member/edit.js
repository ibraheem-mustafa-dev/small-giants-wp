import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	ToggleControl,
	TextControl,
	Button,
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

const PLATFORM_OPTIONS = [
	{ label: __( 'Facebook', 'sgs-blocks' ),     value: 'facebook' },
	{ label: __( 'Instagram', 'sgs-blocks' ),    value: 'instagram' },
	{ label: __( 'LinkedIn', 'sgs-blocks' ),     value: 'linkedin' },
	{ label: __( 'X / Twitter', 'sgs-blocks' ),  value: 'twitter' },
	{ label: __( 'YouTube', 'sgs-blocks' ),      value: 'youtube' },
	{ label: __( 'TikTok', 'sgs-blocks' ),       value: 'tiktok' },
	{ label: __( 'GitHub', 'sgs-blocks' ),       value: 'github' },
	{ label: __( 'WhatsApp', 'sgs-blocks' ),     value: 'whatsapp' },
	{ label: __( 'Email', 'sgs-blocks' ),        value: 'email' },
	{ label: __( 'Website', 'sgs-blocks' ),      value: 'website' },
	{ label: __( 'Pinterest', 'sgs-blocks' ),    value: 'pinterest' },
	{ label: __( 'Snapchat', 'sgs-blocks' ),     value: 'snapchat' },
	{ label: __( 'Telegram', 'sgs-blocks' ),     value: 'telegram' },
	{ label: __( 'Discord', 'sgs-blocks' ),      value: 'discord' },
];

/**
 * Single social link row editor in the inspector panel.
 * Mirrors the GenericBadgeItemEditor pattern from trust-bar.
 */
function SocialLinkItemEditor( { item, index, onChange, onRemove } ) {
	const update = ( key, value ) => onChange( { ...item, [ key ]: value } );
	return (
		<div style={ { borderBottom: '1px solid #ddd', paddingBottom: '12px', marginBottom: '12px' } }>
			<p style={ { fontWeight: 600, margin: '0 0 8px' } }>
				{ `#${ index + 1 }` }{ item.platform ? ` — ${ item.platform }` : '' }
			</p>
			<SelectControl
				label={ __( 'Platform', 'sgs-blocks' ) }
				value={ item.platform || 'website' }
				options={ PLATFORM_OPTIONS }
				onChange={ ( val ) => update( 'platform', val ) }
				__nextHasNoMarginBottom
			/>
			<TextControl
				label={ __( 'URL', 'sgs-blocks' ) }
				value={ item.url || '' }
				onChange={ ( val ) => update( 'url', val ) }
				type={ item.platform === 'email' ? 'email' : 'url' }
				placeholder={ item.platform === 'email' ? 'hello@example.com' : 'https://' }
				__nextHasNoMarginBottom
			/>
			<Button
				variant="secondary"
				isDestructive
				onClick={ onRemove }
				size="small"
				style={ { marginTop: '8px' } }
			>
				{ __( 'Remove link', 'sgs-blocks' ) }
			</Button>
		</div>
	);
}

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
		socialLinks,
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

	// Social links repeater helpers — mirror trust-bar pattern.
	const updateSocialLink = ( index, updated ) => {
		const next = [ ...socialLinks ];
		next[ index ] = updated;
		setAttributes( { socialLinks: next } );
	};

	const removeSocialLink = ( index ) => {
		setAttributes( { socialLinks: socialLinks.filter( ( _, i ) => i !== index ) } );
	};

	const addSocialLink = () => {
		setAttributes( { socialLinks: [ ...socialLinks, { platform: 'website', url: '' } ] } );
	};

	const className = [
		'sgs-team-member',
		`sgs-team-member--${ cardStyle }`,
		isCompact && 'sgs-team-member--compact',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( { className } );

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

				{ ! isCompact && (
					<PanelBody title={ __( 'Social Links', 'sgs-blocks' ) } initialOpen={ false }>
						<p style={ { fontSize: '12px', color: '#757575', marginTop: 0 } }>
							{ __( 'Social profile links displayed below the bio. Hidden in Compact mode.', 'sgs-blocks' ) }
						</p>
						{ socialLinks.map( ( link, index ) => (
							<SocialLinkItemEditor
								key={ index }
								item={ link }
								index={ index }
								onChange={ ( updated ) => updateSocialLink( index, updated ) }
								onRemove={ () => removeSocialLink( index ) }
							/>
						) ) }
						<Button
							variant="secondary"
							onClick={ addSocialLink }
							style={ { width: '100%', justifyContent: 'center' } }
						>
							{ __( 'Add social link', 'sgs-blocks' ) }
						</Button>
					</PanelBody>
				) }
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
				{ /* Social links preview in editor — shown only in full mode. */ }
				{ ! isCompact && socialLinks.length > 0 && (
					<div className="sgs-team-member__social">
						{ socialLinks.map( ( link, i ) => (
							link.url && (
								<span
									key={ i }
									className="sgs-team-member__social-preview"
									title={ link.url }
									aria-hidden="true"
								>
									{ link.platform || 'website' }
								</span>
							)
						) ) }
					</div>
				) }
				{ ! isCompact && socialLinks.length === 0 && (
					<p style={ { color: '#757575', fontStyle: 'italic', fontSize: '12px' } }>
						{ __( 'Add social links in the sidebar panel.', 'sgs-blocks' ) }
					</p>
				) }
			</div>
		</>
	);
}