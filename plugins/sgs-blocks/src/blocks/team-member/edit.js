import { __ } from '@wordpress/i18n';
import {
	useBlockProps,
	InspectorControls,
	MediaUpload,
	MediaUploadCheck,
	RichText,
} from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	Button,
	Flex,
	FlexItem,
	FlexBlock,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
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

const SOCIAL_PLATFORMS = [
	'facebook', 'twitter', 'linkedin', 'instagram', 'youtube', 'tiktok', 'github', 'email', 'website',
];

export default function Edit( { attributes, setAttributes } ) {
	const {
		photo,
		name,
		role,
		bio,
		socialLinks,
		nameColour,
		roleColour,
		cardStyle,
		photoShape,
	} = attributes;

	const className = [
		'sgs-team-member',
		`sgs-team-member--${ cardStyle }`,
	].join( ' ' );

	const blockProps = useBlockProps( { className } );

	const updateSocialLink = ( index, field, value ) => {
		const updated = [ ...socialLinks ];
		updated[ index ] = { ...updated[ index ], [ field ]: value };
		setAttributes( { socialLinks: updated } );
	};

	const addSocialLink = () => {
		setAttributes( {
			socialLinks: [ ...socialLinks, { platform: 'website', url: '' } ],
		} );
	};

	const removeSocialLink = ( index ) => {
		const updated = socialLinks.filter( ( _, i ) => i !== index );
		setAttributes( { socialLinks: updated } );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Card Settings', 'sgs-blocks' ) }>
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

				<PanelBody title={ __( 'Social Links', 'sgs-blocks' ) } initialOpen={ false }>
					{ socialLinks.map( ( link, index ) => (
						<Flex key={ index } style={ { marginBottom: '8px' } }>
							<FlexItem>
								<SelectControl
									value={ link.platform }
									options={ SOCIAL_PLATFORMS.map( ( p ) => ( { label: p, value: p } ) ) }
									onChange={ ( val ) => updateSocialLink( index, 'platform', val ) }
									__nextHasNoMarginBottom
								/>
							</FlexItem>
							<FlexBlock>
								<TextControl
									value={ link.url }
									onChange={ ( val ) => updateSocialLink( index, 'url', val ) }
									placeholder="https://…"
									__nextHasNoMarginBottom
								/>
							</FlexBlock>
							<FlexItem>
								<Button
									icon="trash"
									isDestructive
									onClick={ () => removeSocialLink( index ) }
									label={ __( 'Remove', 'sgs-blocks' ) }
								/>
							</FlexItem>
						</Flex>
					) ) }
					<Button variant="secondary" onClick={ addSocialLink }>
						{ __( 'Add social link', 'sgs-blocks' ) }
					</Button>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				<div className={ `sgs-team-member__photo sgs-team-member__photo--${ photoShape }` }>
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) => setAttributes( { photo: { id: media.id, url: media.url, alt: media.alt } } ) }
							allowedTypes={ [ 'image' ] }
							value={ photo?.id }
							render={ ( { open } ) => (
								photo?.url ? (
									<img src={ photo.url } alt={ photo.alt || name } onClick={ open } style={ { cursor: 'pointer' } } />
								) : (
									<Button onClick={ open } variant="secondary" className="sgs-team-member__photo-placeholder">
										{ __( 'Select photo', 'sgs-blocks' ) }
									</Button>
								)
							) }
						/>
					</MediaUploadCheck>
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
				<RichText
					tagName="p"
					className="sgs-team-member__bio"
					value={ bio }
					onChange={ ( val ) => setAttributes( { bio: val } ) }
					placeholder={ __( 'Short bio…', 'sgs-blocks' ) }
				/>
			</div>
		</>
	);
}
