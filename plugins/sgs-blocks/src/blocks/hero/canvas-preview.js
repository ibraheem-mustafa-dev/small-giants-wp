/**
 * sgs/hero — the editor canvas's styles for the section, its content column and
 * its split-media column, at the device tier the editor is previewing. Each value
 * is resolved the way render.php emits it (its base rule plus its
 * `@media (max-width:1023px)` / `(max-width:767px)` overrides), so the canvas
 * paints what the published page paints at that width.
 *
 * @package SGS\Blocks
 */

import {
	backgroundPaintPreview,
	containerWrapperPreview,
	spacingPreview,
	tierBoxShorthand,
	typographyPreviewStyle,
	tierLengthPreview,
	tierValueOf,
	BOX_CORNER_KEYS,
	BOX_SIDE_KEYS,
} from '../../utils';
import {
	css as boxShapeCss,
	normaliseRatio,
	resolveSizingMode,
	validateShape,
} from '../../components/media/atoms/box-shape.js';

const TIER_CHAIN = {
	desktop: [ 'desktop' ],
	tablet: [ 'tablet', 'desktop' ],
	mobile: [ 'mobile', 'tablet', 'desktop' ],
};
const ALIGN_MAP = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
const TEXT_ALIGNS = [ 'left', 'center', 'right', 'start', 'end', 'justify' ];

const isUnset = ( v ) => undefined === v || null === v || '' === v;

/**
 * A `{desktop}` object whose control never writes another tier (the box-shape
 * atom's max-width/max-height): render.php paints that one value at every width.
 */
function singleTierValue( obj ) {
	return obj && 'object' === typeof obj ? obj.desktop : undefined;
}

/** The value of one custom property in the box-shape atom's own declaration list. */
function atomDecl( decls, name ) {
	const hit = decls.find( ( d ) => d.startsWith( `${ name }:` ) );
	return hit ? hit.slice( name.length + 1 ) : undefined;
}

/**
 * The split column's media at a tier — the twin of render.php's
 * `$sgs_hero_resolve_split_type` plus `sgs_tier_media_render()`'s upward cascade:
 * a tier that resolves to nothing takes the next wider tier's media.
 *
 * @param {Object} attributes Block attributes.
 * @param {string} tier       Previewed tier.
 * @return {{type: string, image: ?Object, video: ?Object, svg: string}} The media to show.
 */
export function splitMediaAtTier( attributes, tier ) {
	const tiers = {
		desktop: {
			declared: attributes.splitMediaType || 'image',
			imageUrl: attributes.splitMediaImageUrl,
			alt: attributes.splitMediaImageAlt,
			videoUrl: attributes.splitMediaVideoUrl,
			svg: attributes.splitMediaSvgContent,
		},
		tablet: {
			declared: attributes.splitMediaTypeTablet,
			imageUrl: attributes.splitMediaImageUrlTablet,
			alt: attributes.splitMediaImageAltTablet,
			videoUrl: attributes.splitMediaVideoUrlTablet,
			svg: attributes.splitMediaSvgContentTablet,
		},
		mobile: {
			declared: attributes.splitMediaTypeMobile,
			imageUrl: attributes.splitMediaImageUrlMobile,
			alt: attributes.splitMediaImageAltMobile,
			videoUrl: attributes.splitMediaVideoUrlMobile,
			svg: attributes.splitMediaSvgContentMobile,
		},
	};
	for ( const t of TIER_CHAIN[ tier ] || TIER_CHAIN.desktop ) {
		const { declared = '', imageUrl = '', alt = '', videoUrl = '', svg = '' } = tiers[ t ];
		const hasSvg = '' !== String( svg || '' ).trim();
		let type = '';
		if ( [ 'video', 'svg', 'image', 'lottie' ].includes( declared ) ) {
			// A declared type is strict; the canvas never plays Lottie, so it shows nothing for it.
			const has = { video: !! videoUrl, svg: hasSvg, image: !! imageUrl, lottie: false }[ declared ];
			type = has ? declared : '';
		} else if ( imageUrl ) {
			type = 'image';
		} else if ( videoUrl ) {
			type = 'video';
		} else if ( hasSvg ) {
			type = 'svg';
		}
		if ( type ) {
			return {
				type,
				image: imageUrl ? { url: imageUrl, alt: alt || '' } : null,
				video: videoUrl ? { url: videoUrl } : null,
				svg: svg || '',
			};
		}
	}
	return { type: '', image: null, video: null, svg: '' };
}

/**
 * @param {Object}  attributes Block attributes.
 * @param {Object}  opts
 * @param {string}  opts.tier    Previewed tier from `usePreviewTier()`.
 * @param {Array}   opts.palette Theme colour palette.
 * @param {boolean} opts.isSplit The split variant.
 * @return {{ root: Object, content: Object, media: Object, image: Object, band: { hasBandProps: boolean, bandStyle: Object } }}
 *   Styles for the section, `.sgs-hero__content`, `.sgs-hero__media` and the split media element.
 */
export function heroCanvasPreview( attributes, { tier = 'desktop', palette = [], isSplit = false } ) {
	const wrapper = containerWrapperPreview( attributes, tier, palette );

	// Section: the shared wrapper's gap, max-width, radius and layout, then hero's own rules.
	const root = {};
	[ 'gap', 'maxWidth', 'borderRadius', 'display', 'gridTemplateColumns', 'gridTemplateRows', 'gridAutoRows',
		'alignItems', 'justifyItems', 'alignContent', 'flexDirection', 'flexWrap', 'justifyContent' ].forEach( ( key ) => {
		if ( undefined !== wrapper.style[ key ] ) {
			root[ key ] = wrapper.style[ key ];
		}
	} );
	Object.assign( root, spacingPreview( { padding: attributes.padding, margin: attributes.margin }, tier ) );
	// render.php always sets align-items from verticalAlignment; a wrapper layout's own value wins.
	root.alignItems = root.alignItems || ALIGN_MAP[ attributes.verticalAlignment ] || 'center';
	const minHeight = 'mobile' === tier
		? tierValueOf( { ...attributes.minHeight, mobile: attributes.minHeight?.mobile || '360px' }, tier )
		: tierValueOf( attributes.minHeight, tier );
	if ( minHeight ) {
		root.minHeight = minHeight;
	}
	Object.assign( root, typographyPreviewStyle( attributes, '', tier ) );

	if ( isSplit ) {
		const gtc = attributes.gridTemplateColumns || {};
		const desktopRatio = gtc.desktop || '1fr 1fr';
		root.gridTemplateColumns = {
			desktop: desktopRatio,
			tablet: gtc.tablet || desktopRatio,
			mobile: gtc.mobile || '1fr',
		}[ tier ] || desktopRatio;
		// Split confines its two columns with inline padding instead of a band (desktop tier).
		const cw = attributes.contentWidth?.desktop || '';
		const band = { normal: 'var(--wp--style--global--content-size)', wide: 'var(--wp--style--global--wide-size)' }[ cw ] ||
			( cw && 'full' !== cw ? cw : '' );
		if ( band ) {
			root.paddingInline = `max(var(--wp--style--root--padding-right,24px),calc((100% - ${ band }) / 2))`;
		}
	}

	// Content column.
	const content = { justifyContent: ALIGN_MAP[ attributes.verticalAlignment ] || 'center' };
	const textAlign = tierValueOf( attributes.textAlign, tier );
	if ( TEXT_ALIGNS.includes( textAlign ) ) {
		content.textAlign = textAlign;
	}
	Object.assign( content, backgroundPaintPreview( attributes.contentBackground, attributes.contentBackgroundGradient, palette ) );
	const contentPadding = tierBoxShorthand( attributes.contentPadding, tier, BOX_SIDE_KEYS, true );
	if ( contentPadding ) {
		content.padding = contentPadding;
	}

	// Split column order: desktop 'media-first' swaps; tablet overrides when set;
	// mobile is media-first unless set to content-first.
	const order = attributes.splitContentOrder || {};
	const desktopMediaFirst = 'media-first' === order.desktop;
	const mediaFirst = {
		desktop: desktopMediaFirst,
		tablet: order.tablet ? 'media-first' === order.tablet : desktopMediaFirst,
		mobile: 'content-first' !== order.mobile,
	}[ tier ];
	const media = {};
	if ( isSplit && mediaFirst ) {
		content.order = 2;
		media.order = 1;
	}
	const mediaPadding = tierBoxShorthand( attributes.mediaPadding, tier, BOX_SIDE_KEYS, true );
	if ( mediaPadding ) {
		media.padding = mediaPadding;
	}

	// Split media element (`.sgs-hero__split-media`).
	const image = {};
	if ( isSplit ) {
		const unitW = attributes.splitMediaWidthUnit || '%';
		const width = tierValueOf( attributes.splitMediaWidth, tier );
		if ( 'custom' === attributes.splitMediaObjectFit && ! isUnset( width ) ) {
			image.width = `${ Math.abs( parseInt( width, 10 ) ) || 0 }${ unitW }`;
		}
		const height = tierValueOf( attributes.splitMediaHeight, tier );
		image.height = isUnset( height ) ? '100%' : `${ Math.abs( parseInt( height, 10 ) ) || 0 }${ attributes.splitMediaHeightUnit || 'px' }`;
		const padTiers = { desktop: attributes.splitMediaPadding?.desktop, tablet: attributes.splitMediaPadding?.tablet, mobile: attributes.splitMediaPadding?.mobile };
		const pad = tierBoxShorthand( padTiers, tier, BOX_SIDE_KEYS, true );
		if ( pad ) {
			image.padding = pad;
		}
		const radius = tierBoxShorthand( {
			desktop: attributes.splitMediaBorderRadius,
			tablet: attributes.splitMediaBorderRadiusTablet,
			mobile: attributes.splitMediaBorderRadiusMobile,
		}, tier, BOX_CORNER_KEYS, true );
		if ( radius ) {
			image.borderRadius = radius;
		}
		// Sizing mode, ratio and shape through the box-shape atom's own twins, as render.php does.
		const mode = resolveSizingMode( attributes.splitMediaMediaSizing, attributes.splitMediaObjectFit, attributes, 'splitMedia', 'sgs/hero' );
		const ratio = normaliseRatio( attributes.splitMediaAspectRatio );
		if ( 'ratio' === mode && ratio ) {
			image.aspectRatio = ratio;
		}
		if ( 'none' !== validateShape( attributes.splitMediaShape ) ) {
			const clip = atomDecl( boxShapeCss( { attributes, prefix: 'splitMedia', blockSlug: 'sgs/hero' } ), '--sgs-media-clip-path' );
			if ( clip ) {
				image.clipPath = clip;
			}
		}
		const minH = tierLengthPreview( attributes.splitMediaMinHeight, tier );
		if ( minH ) {
			image.minHeight = minH;
		}
		const maxW = singleTierValue( attributes.splitMediaMaxWidth );
		if ( ! isUnset( maxW ) && /^\d+(\.\d+)?$/.test( String( maxW ) ) ) {
			image.maxWidth = `${ Math.abs( parseInt( maxW, 10 ) ) }${ attributes.splitMediaMaxWidthUnit || 'px' }`;
		}
		const maxH = singleTierValue( attributes.splitMediaMaxHeight );
		if ( ! isUnset( maxH ) && /^\d+(\.\d+)?$/.test( String( maxH ) ) ) {
			image.maxHeight = `${ Math.abs( parseInt( maxH, 10 ) ) }${ attributes.splitMediaMaxHeightUnit || 'px' }`;
		}
	}

	return {
		root,
		content,
		media,
		image,
		band: isSplit ? { hasBandProps: false, bandStyle: {} } : { hasBandProps: wrapper.hasBandProps, bandStyle: wrapper.bandStyle },
		layoutClass: wrapper.className,
	};
}
