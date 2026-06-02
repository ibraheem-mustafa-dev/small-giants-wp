import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
} from '@wordpress/components';
import { DesignTokenPicker, IconPicker, IconPreview } from '../../components';
import { colourVar } from '../../utils';

const BG_SHAPES = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Pill', 'sgs-blocks' ), value: 'pill' },
	{ label: __( 'Rounded square', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
	{ label: __( 'Outline ring', 'sgs-blocks' ), value: 'outline' },
];

const LINK_TARGET_OPTIONS = [
	{ label: __( 'Same tab', 'sgs-blocks' ), value: '_self' },
	{ label: __( 'New tab', 'sgs-blocks' ), value: '_blank' },
];

/**
 * Size modifier class for the editor preview wrapper.
 *
 * @param {number} size px value
 * @return {string} BEM modifier class
 */
function sizeModifier( size ) {
	if ( size <= 20 ) {
		return 'sgs-icon--size-small';
	}
	if ( size <= 40 ) {
		return 'sgs-icon--size-medium';
	}
	if ( size <= 64 ) {
		return 'sgs-icon--size-large';
	}
	return 'sgs-icon--size-custom';
}

/**
 * The per-source attribute that holds the icon's identifier.
 *
 * @param {Object} attrs Block attributes.
 * @return {string} The current icon name/char for the active source.
 */
function currentIconName( attrs ) {
	switch ( attrs.iconSource ) {
		case 'emoji':
			return attrs.emojiChar;
		case 'dashicon':
			return attrs.dashiconName;
		case 'wp-icon':
			return attrs.wpIconName;
		case 'lucide':
		default:
			return attrs.iconName;
	}
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		iconSource,
		iconSize,
		iconColour,
		backgroundColour,
		backgroundShape,
		linkUrl,
		linkTarget,
		ariaLabel,
		hoverIconColour,
		hoverShapeColour,
		hoverScale,
	} = attributes;

	const blockAlign = attributes.align || 'center';
	const className = [
		'sgs-icon',
		`sgs-icon--source-${ iconSource }`,
		sizeModifier( iconSize ),
		backgroundShape !== 'none' && `sgs-icon--bg-${ backgroundShape }`,
		`align${ blockAlign }`,
	]
		.filter( Boolean )
		.join( ' ' );

	// Outline shape: transparent background + coloured border; no solid fill.
	const isOutline = backgroundShape === 'outline';

	const style = {
		'--sgs-icon-size': `${ iconSize }px`,
		color: colourVar( iconColour ) || undefined,
		backgroundColor:
			backgroundColour && backgroundShape !== 'none' && ! isOutline
				? colourVar( backgroundColour )
				: undefined,
		'--sgs-icon-outline-colour':
			backgroundColour && isOutline ? colourVar( backgroundColour ) : undefined,
		'--sgs-icon-hover-colour': colourVar( hoverIconColour ) || undefined,
		'--sgs-icon-hover-shape-colour':
			hoverShapeColour ? colourVar( hoverShapeColour ) : undefined,
		'--sgs-icon-hover-scale': hoverScale || undefined,
	};

	const blockProps = useBlockProps( { className, style } );

	// Map the IconPicker's { source, name } back onto the block's per-source attrs.
	const handleIconChange = ( { source, name } ) => {
		const next = { iconSource: source };
		if ( 'emoji' === source ) {
			next.emojiChar = name;
		} else if ( 'dashicon' === source ) {
			next.dashiconName = name;
		} else if ( 'wp-icon' === source ) {
			next.wpIconName = name;
		} else {
			next.iconName = name;
		}
		setAttributes( next );
	};

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Icon', 'sgs-blocks' ) }>
					<IconPicker
						label={ __( 'Icon', 'sgs-blocks' ) }
						value={ {
							source: iconSource,
							name: currentIconName( attributes ),
						} }
						onChange={ handleIconChange }
					/>

					<RangeControl
						label={ __( 'Size (px)', 'sgs-blocks' ) }
						value={ iconSize }
						onChange={ ( val ) => setAttributes( { iconSize: val } ) }
						min={ 16 }
						max={ 128 }
						step={ 4 }
						__nextHasNoMarginBottom
					/>
					<DesignTokenPicker
						label={ __( 'Icon colour', 'sgs-blocks' ) }
						value={ iconColour }
						onChange={ ( val ) => setAttributes( { iconColour: val } ) }
					/>
				</PanelBody>

				<PanelBody title={ __( 'Background', 'sgs-blocks' ) } initialOpen={ false }>
					<SelectControl
						label={ __( 'Background shape', 'sgs-blocks' ) }
						value={ backgroundShape }
						options={ BG_SHAPES }
						onChange={ ( val ) => setAttributes( { backgroundShape: val } ) }
						__nextHasNoMarginBottom
					/>
					{ backgroundShape !== 'none' && (
						<DesignTokenPicker
							label={ __( 'Background colour', 'sgs-blocks' ) }
							value={ backgroundColour }
							onChange={ ( val ) =>
								setAttributes( { backgroundColour: val } )
							}
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Link', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Link URL', 'sgs-blocks' ) }
						value={ linkUrl }
						onChange={ ( val ) => setAttributes( { linkUrl: val } ) }
						type="url"
						__nextHasNoMarginBottom
					/>
					{ linkUrl && (
						<SelectControl
							label={ __( 'Open in', 'sgs-blocks' ) }
							value={ linkTarget }
							options={ LINK_TARGET_OPTIONS }
							onChange={ ( val ) => setAttributes( { linkTarget: val } ) }
							__nextHasNoMarginBottom
						/>
					) }
				</PanelBody>

				<PanelBody title={ __( 'Hover effects', 'sgs-blocks' ) } initialOpen={ false }>
					<DesignTokenPicker
						label={ __( 'Icon colour on hover', 'sgs-blocks' ) }
						value={ hoverIconColour }
						onChange={ ( val ) => setAttributes( { hoverIconColour: val } ) }
					/>
					{ backgroundShape !== 'none' && (
						<DesignTokenPicker
							label={ __( 'Shape colour on hover', 'sgs-blocks' ) }
							help={ __(
								'Background (or border for Outline) colour when hovered. Leave empty to keep unchanged.',
								'sgs-blocks'
							) }
							value={ hoverShapeColour }
							onChange={ ( val ) => setAttributes( { hoverShapeColour: val } ) }
						/>
					) }
					<RangeControl
						label={ __( 'Scale on hover', 'sgs-blocks' ) }
						value={ hoverScale }
						onChange={ ( val ) => setAttributes( { hoverScale: val } ) }
						min={ 1 }
						max={ 1.5 }
						step={ 0.05 }
						__nextHasNoMarginBottom
					/>
				</PanelBody>

				<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Accessible label', 'sgs-blocks' ) }
						help={
							linkUrl
								? __(
										'Describes the link destination for screen readers. Defaults to the icon name when blank.',
										'sgs-blocks'
								  )
								: __(
										'Describes the icon for screen readers. Leave blank for decorative icons (hidden from assistive technology).',
										'sgs-blocks'
								  )
						}
						value={ ariaLabel }
						onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Editor canvas preview — renders the real icon via the shared preview. */ }
				<span className="sgs-icon__svg" aria-hidden="true">
					<IconPreview
						source={ iconSource }
						name={ currentIconName( attributes ) }
						size={ iconSize }
					/>
				</span>
			</div>
		</>
	);
}
