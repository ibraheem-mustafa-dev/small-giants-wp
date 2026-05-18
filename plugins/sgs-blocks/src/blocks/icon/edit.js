import { __ } from '@wordpress/i18n';
import { useBlockProps, InspectorControls } from '@wordpress/block-editor';
import {
	PanelBody,
	SelectControl,
	TextControl,
	RangeControl,
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

/**
 * Size modifiers for editor preview.
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

export default function Edit( { attributes, setAttributes } ) {
	const {
		iconName,
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
					<TextControl
						label={ __( 'Icon name (Lucide)', 'sgs-blocks' ) }
						help={ __( 'Enter any Lucide icon name, e.g. "heart", "star", "arrow-right". All 1917 icons are supported.', 'sgs-blocks' ) }
						value={ iconName }
						onChange={ ( val ) => setAttributes( { iconName: val.trim() } ) }
						__nextHasNoMarginBottom
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
								: __( 'Describes the icon for screen readers. Leave blank for decorative icons (they will be hidden from assistive technology).', 'sgs-blocks' )
						}
						value={ ariaLabel }
						onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
						__nextHasNoMarginBottom
					/>
				</PanelBody>
			</InspectorControls>

			<div { ...blockProps }>
				{ /* Editor preview: show icon name as text. The actual SVG is rendered
				     server-side via render.php using sgs_get_lucide_icon(). */ }
				<span
					className={ `sgs-icon__svg sgs-icon__svg--preview` }
					aria-hidden="true"
					title={ iconName }
				>
					{ /* Placeholder showing icon name slug in editor */ }
					<span className="sgs-icon__placeholder">{ iconName }</span>
				</span>
			</div>
		</>
	);
}
