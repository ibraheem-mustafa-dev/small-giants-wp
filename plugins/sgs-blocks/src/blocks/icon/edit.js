/**
 * sgs/icon editor: a hand-built canvas twin of render.php (same elements, same classes, so style.css paints both),
 * the Site Info link state (a blank bound link shows dimmed with a notice), and the inspector.
 *
 * @package SGS\Blocks
 */

import { __, sprintf } from '@wordpress/i18n';
import { useBlockProps, BlockControls, useSettings } from '@wordpress/block-editor';
import { LogicalAlignToolbar } from '../../components';
import { colourVar, tierBoxLonghands, usePreviewTier, resolveTier, sgsBorderPreview, flattenPresetSetting } from '../../utils';
import IconInspector from './inspector';
import CanvasGlyph from './glyph';
import {
	SITE_INFO_ADMIN_URL,
	boundLinkKey,
	siteInfoLinkState,
	resolveBrand,
	accessibleName,
	iconLengthValue,
} from './icon-state';

/**
 * The canvas root's custom properties and spacing: render.php's root rule for the previewed device.
 *
 * @param {Object}   attributes  Block attributes.
 * @param {string}   tier        Previewed device.
 * @param {Object}   brand       resolveBrand() result.
 * @param {string[]} presetSlugs Theme spacing preset slugs.
 * @return {Object} React style.
 */
export function canvasRootStyle( attributes, tier, brand, presetSlugs ) {
	const { iconSize, shapeSize, shape, shapeSizeLinked = true, iconRotate, scaleHover, opacityHover, textAlign } = attributes;
	const style = {};
	const size = iconLengthValue( resolveTier( iconSize, tier ).value, 512, presetSlugs );
	if ( size ) {
		style[ '--sgs-icon-size' ] = size;
	}
	const box = resolveTier( shapeSize, tier ).value;
	const width = iconLengthValue( box?.width, 640, presetSlugs );
	const height = 'circle' === shape || shapeSizeLinked ? '' : iconLengthValue( box?.height, 640, presetSlugs );
	if ( width ) {
		style[ '--sgs-icon-shape-w' ] = width;
	}
	if ( height ) {
		style[ '--sgs-icon-shape-h' ] = height;
	}
	const own = {
		iconColour: '--sgs-icon-colour',
		iconColourHover: '--sgs-icon-colour-hover',
		backgroundColour: '--sgs-icon-bg',
		backgroundColourHover: '--sgs-icon-bg-hover',
	};
	Object.entries( own ).forEach( ( [ attr, property ] ) => {
		const value = colourVar( attributes[ attr ] );
		if ( value ) {
			style[ property ] = value;
		}
	} );
	if ( brand.paint ) {
		const slots = {
			ground: '--sgs-icon-brand-ground',
			glyph: '--sgs-icon-brand-glyph',
			border: '--sgs-icon-brand-border',
			groundHover: '--sgs-icon-brand-ground-hover',
			glyphHover: '--sgs-icon-brand-glyph-hover',
		};
		Object.entries( slots ).forEach( ( [ slot, property ] ) => {
			if ( brand.paint[ slot ] ) {
				style[ property ] = brand.paint[ slot ];
			}
		} );
	}
	if ( iconRotate ) {
		style[ '--sgs-icon-rotate' ] = `${ iconRotate }deg`;
	}
	if ( 'number' === typeof scaleHover && Math.abs( scaleHover - 1.1 ) > 0.0001 ) {
		style[ '--sgs-icon-hover-scale' ] = scaleHover;
	}
	if ( opacityHover > 0 ) {
		style[ '--sgs-icon-opacity-hover' ] = opacityHover;
	}
	if ( [ 'left', 'center', 'right', 'justify' ].includes( textAlign ) ) {
		style.textAlign = textAlign;
	}
	Object.assign( style, tierBoxLonghands( attributes.padding, tier, 'padding' ) );
	Object.assign( style, tierBoxLonghands( attributes.margin, tier, 'margin' ) );
	return style;
}

export default function Edit( { attributes, setAttributes } ) {
	const tier = usePreviewTier();
	const [ palette ] = useSettings( 'color.palette' );
	const [ spacingSizes ] = useSettings( 'spacing.spacingSizes' );
	const presetSlugs = flattenPresetSetting( spacingSizes ).map( ( s ) => s.slug );

	const { iconSource, iconAlign, iconFill, shape = 'square', showBackground, linkUrl, borderWidth, borderStyle, borderColour, borderColourGradient, borderRadius, backgroundColourGradient } = attributes;

	const boundKey = boundLinkKey( attributes );
	const link = siteInfoLinkState( boundKey, window.sgsBlocksData?.siteInfo );
	const brand = resolveBrand( attributes, boundKey );
	const name = accessibleName( { ariaLabel: attributes.ariaLabel, boundKey, glyphBrand: brand.glyphBrand, url: linkUrl } );
	const showBg = !! showBackground || brand.brandOn;

	const shapeStyle = sgsBorderPreview(
		{
			widthValues: borderWidth,
			styleValue: borderStyle,
			colourValue: borderColour,
			colourGradientValue: borderColourGradient,
			radiusValues: 'square' === shape ? borderRadius : undefined,
		},
		tier,
		palette
	);
	const hasBorder = !! ( shapeStyle.borderWidth || shapeStyle.borderTopWidth || shapeStyle.borderStyle );
	if ( showBg && backgroundColourGradient ) {
		shapeStyle.backgroundImage = backgroundColourGradient;
	}

	const fillGlyph = iconFill && ! [ 'emoji', 'dashicon' ].includes( iconSource ) && ! ( 'brand' === iconSource && brand.glyphBrand?.glyph?.svg );
	const className = [
		'sgs-icon',
		`sgs-icon--source-${ iconSource || 'lucide' }`,
		`sgs-icon--shape-${ shape }`,
		showBg && 'sgs-icon--has-bg',
		( showBg || hasBorder ) && 'sgs-icon--boxed',
		brand.brandOn && 'sgs-icon--brand',
		fillGlyph && 'sgs-icon--fill',
		iconAlign && 'start' !== iconAlign && `sgs-icon--align-${ iconAlign }`,
		link.hidden && 'sgs-icon--hidden-empty',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps( { className, style: canvasRootStyle( attributes, tier, brand, presetSlugs ) } );
	const linked = !! linkUrl || link.bound;
	const shapeEl = (
		<span className="sgs-icon__shape" style={ shapeStyle }>
			<CanvasGlyph attributes={ attributes } glyphBrand={ brand.glyphBrand } drawFixed={ brand.drawFixed } />
		</span>
	);

	return (
		<>
			<BlockControls group="block">
				<LogicalAlignToolbar
					label={ __( 'Icon alignment', 'sgs-blocks' ) }
					value={ iconAlign }
					onChange={ ( value ) => setAttributes( { iconAlign: value } ) }
				/>
			</BlockControls>
			<IconInspector attributes={ attributes } setAttributes={ setAttributes } state={ { boundKey, link, brand, name } } />
			<div { ...blockProps }>
				{ /* A span, not a link: the canvas must not navigate. Same class, so the 44px target and shape paint. */ }
				{ linked ? <span className="sgs-icon__link">{ shapeEl }</span> : shapeEl }
				{ link.hidden && (
					<span className="sgs-icon__notice" role="note">
						{ sprintf(
							/* translators: %s: Site Info field, e.g. WhatsApp. */
							__( 'Hidden on your site: %s is empty in Site Info.', 'sgs-blocks' ),
							link.label
						) }{ ' ' }
						<a href={ SITE_INFO_ADMIN_URL } target="_blank" rel="noopener noreferrer">
							{ __( 'Open Site Info', 'sgs-blocks' ) }
						</a>
					</span>
				) }
			</div>
		</>
	);
}
