import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
	Button,
	Flex,
	FlexItem,
} from '@wordpress/components';
import { DesignTokenPicker } from '../../components';
import { colourVar } from '../../utils';

const BG_SHAPES = [
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Circle', 'sgs-blocks' ), value: 'circle' },
	{ label: __( 'Rounded square', 'sgs-blocks' ), value: 'rounded' },
	{ label: __( 'Square', 'sgs-blocks' ), value: 'square' },
];

const LINK_TARGET_OPTIONS = [
	{ label: __( 'Same tab', 'sgs-blocks' ), value: '_self' },
	{ label: __( 'New tab', 'sgs-blocks' ), value: '_blank' },
];

const ICON_SOURCE_OPTIONS = [
	{ label: __( 'Lucide (1917 icons)', 'sgs-blocks' ), value: 'lucide' },
	{ label: __( 'WordPress icons', 'sgs-blocks' ), value: 'wp-icon' },
	{ label: __( 'Dashicons', 'sgs-blocks' ), value: 'dashicon' },
	{ label: __( 'Emoji', 'sgs-blocks' ), value: 'emoji' },
];

/** Curated list of common WordPress @wordpress/icons. */
const WP_ICON_OPTIONS = [
	{ label: __( 'Check', 'sgs-blocks' ), value: 'check' },
	{ label: __( 'Plus', 'sgs-blocks' ), value: 'plus' },
	{ label: __( 'Minus', 'sgs-blocks' ), value: 'minus' },
	{ label: __( 'Arrow right', 'sgs-blocks' ), value: 'arrow-right' },
	{ label: __( 'Arrow left', 'sgs-blocks' ), value: 'arrow-left' },
	{ label: __( 'Arrow up', 'sgs-blocks' ), value: 'arrow-up' },
	{ label: __( 'Arrow down', 'sgs-blocks' ), value: 'arrow-down' },
	{ label: __( 'Chevron right', 'sgs-blocks' ), value: 'chevron-right' },
	{ label: __( 'Chevron left', 'sgs-blocks' ), value: 'chevron-left' },
	{ label: __( 'Search', 'sgs-blocks' ), value: 'search' },
	{ label: __( 'Edit', 'sgs-blocks' ), value: 'edit' },
	{ label: __( 'Trash', 'sgs-blocks' ), value: 'trash' },
	{ label: __( 'Share', 'sgs-blocks' ), value: 'share' },
	{ label: __( 'Download', 'sgs-blocks' ), value: 'download' },
	{ label: __( 'Upload', 'sgs-blocks' ), value: 'upload' },
	{ label: __( 'External link', 'sgs-blocks' ), value: 'external' },
	{ label: __( 'Menu', 'sgs-blocks' ), value: 'menu' },
	{ label: __( 'Settings', 'sgs-blocks' ), value: 'settings' },
	{ label: __( 'Info', 'sgs-blocks' ), value: 'info' },
	{ label: __( 'Warning', 'sgs-blocks' ), value: 'warning' },
	{ label: __( 'Help', 'sgs-blocks' ), value: 'help' },
	{ label: __( 'Lock', 'sgs-blocks' ), value: 'lock' },
	{ label: __( 'Eye', 'sgs-blocks' ), value: 'eye' },
	{ label: __( 'Mail', 'sgs-blocks' ), value: 'mail' },
	{ label: __( 'Phone', 'sgs-blocks' ), value: 'phone' },
	{ label: __( 'Comment', 'sgs-blocks' ), value: 'comment' },
	{ label: __( 'Bell', 'sgs-blocks' ), value: 'bell' },
	{ label: __( 'Image', 'sgs-blocks' ), value: 'image' },
	{ label: __( 'Video', 'sgs-blocks' ), value: 'video' },
	{ label: __( 'Play', 'sgs-blocks' ), value: 'play' },
	{ label: __( 'People', 'sgs-blocks' ), value: 'people' },
	{ label: __( 'Person', 'sgs-blocks' ), value: 'person' },
	{ label: __( 'Payment', 'sgs-blocks' ), value: 'payment' },
	{ label: __( 'Shipping', 'sgs-blocks' ), value: 'shipping' },
	{ label: __( 'Shopping cart', 'sgs-blocks' ), value: 'shopping-cart' },
	{ label: __( 'Shield', 'sgs-blocks' ), value: 'shield' },
	{ label: __( 'Star filled', 'sgs-blocks' ), value: 'star-filled' },
	{ label: __( 'Star empty', 'sgs-blocks' ), value: 'star-empty' },
	{ label: __( 'Heart', 'sgs-blocks' ), value: 'heart' },
	{ label: __( 'Globe', 'sgs-blocks' ), value: 'globe' },
	{ label: __( 'Location', 'sgs-blocks' ), value: 'location' },
	{ label: __( 'Calendar', 'sgs-blocks' ), value: 'calendar' },
	{ label: __( 'Clock', 'sgs-blocks' ), value: 'clock' },
	{ label: __( 'Copy', 'sgs-blocks' ), value: 'copy' },
	{ label: __( 'Close', 'sgs-blocks' ), value: 'close' },
];

/** Curated 15 Dashicons covering 80% of operator needs. */
const DASHICON_OPTIONS = [
	{ label: __( 'Star filled', 'sgs-blocks' ), value: 'star-filled' },
	{ label: __( 'Heart', 'sgs-blocks' ), value: 'heart' },
	{ label: __( 'Share', 'sgs-blocks' ), value: 'share' },
	{ label: __( 'Video alt', 'sgs-blocks' ), value: 'video-alt' },
	{ label: __( 'Format quote', 'sgs-blocks' ), value: 'format-quote' },
	{ label: __( 'Format image', 'sgs-blocks' ), value: 'format-image' },
	{ label: __( 'Location', 'sgs-blocks' ), value: 'location' },
	{ label: __( 'Calendar', 'sgs-blocks' ), value: 'calendar' },
	{ label: __( 'Email', 'sgs-blocks' ), value: 'email' },
	{ label: __( 'Phone', 'sgs-blocks' ), value: 'phone' },
	{ label: __( 'Lightbulb', 'sgs-blocks' ), value: 'lightbulb' },
	{ label: __( 'Awards', 'sgs-blocks' ), value: 'awards' },
	{ label: __( 'Shield', 'sgs-blocks' ), value: 'shield' },
	{ label: __( 'Smiley', 'sgs-blocks' ), value: 'smiley' },
	{ label: __( 'Yes alt', 'sgs-blocks' ), value: 'yes-alt' },
];

/** Quick-pick business emojis. */
const EMOJI_QUICK_PICKS = [
	{ emoji: '🎉', label: 'Party popper' },
	{ emoji: '⭐', label: 'Star' },
	{ emoji: '💡', label: 'Light bulb' },
	{ emoji: '✅', label: 'Check mark' },
	{ emoji: '❤️', label: 'Heart' },
	{ emoji: '🔥', label: 'Fire' },
	{ emoji: '⚡', label: 'Lightning' },
	{ emoji: '🎯', label: 'Target' },
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
 * Return a short human-readable preview label for the editor canvas.
 * Shown inside the icon wrapper so the operator can see what's selected
 * without a live SVG render.
 *
 * @param {Object} attrs Block attributes.
 * @return {string} Preview text.
 */
function previewLabel( attrs ) {
	switch ( attrs.iconSource ) {
		case 'emoji':
			return attrs.emojiChar || '⭐';
		case 'dashicon':
			return attrs.dashiconName ? `dashicons-${ attrs.dashiconName }` : 'dashicons-star-filled';
		case 'wp-icon':
			return attrs.wpIconName || 'check';
		case 'lucide':
		default:
			return attrs.iconName || 'star';
	}
}

export default function Edit( { attributes, setAttributes } ) {
	const {
		iconSource,
		iconName,
		emojiChar,
		dashiconName,
		wpIconName,
		iconSize,
		iconColour,
		backgroundColour,
		backgroundShape,
		linkUrl,
		linkTarget,
		ariaLabel,
	} = attributes;

	const blockAlign = attributes.align || 'center';
	const className  = [
		'sgs-icon',
		`sgs-icon--source-${ iconSource }`,
		sizeModifier( iconSize ),
		backgroundShape !== 'none' && `sgs-icon--bg-${ backgroundShape }`,
		`align${ blockAlign }`,
	].filter( Boolean ).join( ' ' );

	const style = {
		'--sgs-icon-size': `${ iconSize }px`,
		color:             colourVar( iconColour ) || undefined,
		backgroundColor:   backgroundColour && backgroundShape !== 'none'
			? colourVar( backgroundColour )
			: undefined,
	};

	const blockProps = useBlockProps( { className, style } );

	return (
		<>
			<InspectorControls>
				<PanelBody title={ __( 'Icon', 'sgs-blocks' ) }>
					{ /* Source picker — always shown at top of panel */ }
					<SelectControl
						label={ __( 'Icon source', 'sgs-blocks' ) }
						value={ iconSource }
						options={ ICON_SOURCE_OPTIONS }
						onChange={ ( val ) => setAttributes( { iconSource: val } ) }
						__nextHasNoMarginBottom
					/>

					{ /* Lucide: free-text name */ }
					{ 'lucide' === iconSource && (
						<TextControl
							label={ __( 'Icon name (Lucide)', 'sgs-blocks' ) }
							help={ __( 'Any Lucide icon name, e.g. "heart", "star", "arrow-right". All 1917 icons are supported.', 'sgs-blocks' ) }
							value={ iconName }
							onChange={ ( val ) => setAttributes( { iconName: val.trim() } ) }
							__nextHasNoMarginBottom
						/>
					) }

					{ /* WordPress icons: curated SelectControl */ }
					{ 'wp-icon' === iconSource && (
						<SelectControl
							label={ __( 'WordPress icon', 'sgs-blocks' ) }
							value={ wpIconName }
							options={ WP_ICON_OPTIONS }
							onChange={ ( val ) => setAttributes( { wpIconName: val } ) }
							__nextHasNoMarginBottom
						/>
					) }

					{ /* Dashicons: curated SelectControl */ }
					{ 'dashicon' === iconSource && (
						<SelectControl
							label={ __( 'Dashicon', 'sgs-blocks' ) }
							value={ dashiconName }
							options={ DASHICON_OPTIONS }
							onChange={ ( val ) => setAttributes( { dashiconName: val } ) }
							__nextHasNoMarginBottom
						/>
					) }

					{ /* Emoji: text input + quick-pick row */ }
					{ 'emoji' === iconSource && (
						<>
							<TextControl
								label={ __( 'Emoji character', 'sgs-blocks' ) }
								help={ __( 'Paste or type an emoji, e.g. 🎉', 'sgs-blocks' ) }
								value={ emojiChar }
								onChange={ ( val ) => setAttributes( { emojiChar: val } ) }
								__nextHasNoMarginBottom
							/>
							<p style={ { marginTop: '8px', marginBottom: '4px', fontSize: '11px', textTransform: 'uppercase', color: '#757575' } }>
								{ __( 'Quick pick', 'sgs-blocks' ) }
							</p>
							<Flex wrap>
								{ EMOJI_QUICK_PICKS.map( ( { emoji, label } ) => (
									<FlexItem key={ emoji }>
										<Button
											variant={ emojiChar === emoji ? 'primary' : 'secondary' }
											onClick={ () => setAttributes( { emojiChar: emoji } ) }
											aria-label={ label }
											style={ { fontSize: '20px', lineHeight: '1', padding: '4px 6px', minWidth: '36px' } }
											title={ label }
										>
											{ emoji }
										</Button>
									</FlexItem>
								) ) }
							</Flex>
						</>
					) }

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
							onChange={ ( val ) => setAttributes( { backgroundColour: val } ) }
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

				<PanelBody title={ __( 'Accessibility', 'sgs-blocks' ) } initialOpen={ false }>
					<TextControl
						label={ __( 'Accessible label', 'sgs-blocks' ) }
						help={
							linkUrl
								? __( 'Describes the link destination for screen readers. Defaults to the icon name when blank.', 'sgs-blocks' )
								: __( 'Describes the icon for screen readers. Leave blank for decorative icons (hidden from assistive technology).', 'sgs-blocks' )
						}
						value={ ariaLabel }
						onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Editor canvas preview — text placeholder; SVG rendered server-side. */ }
				<span
					className="sgs-icon__svg sgs-icon__svg--preview"
					aria-hidden="true"
					title={ previewLabel( attributes ) }
				>
					<span className="sgs-icon__placeholder">{ previewLabel( attributes ) }</span>
				</span>
			</div>
		</>
	);
}
