/**
 * sgs/hero — the editor canvas's styles for the section, its content column and
 * its split-media grid cell, at the device tier the editor is previewing. Each value
 * is resolved the way render.php emits it (its base rule plus its
 * `@media (max-width:1023px)` / `(max-width:767px)` overrides), so the canvas
 * paints what the published page paints at that width.
 *
 * @package
 */

import {
	backgroundPaintPreview,
	containerWrapperPreview,
	tierBoxLonghands,
	typographyPreviewStyle,
	tierLengthPreview,
	tierValueOf,
	RADIUS_STYLE_KEYS,
} from '../../utils';

const ALIGN_MAP = { top: 'flex-start', center: 'center', bottom: 'flex-end' };
const TEXT_ALIGNS = [ 'left', 'center', 'right', 'start', 'end', 'justify' ];

/**
 * @param {Object}  attributes   Block attributes.
 * @param {Object}  opts
 * @param {string}  opts.tier    Previewed tier from `usePreviewTier()`.
 * @param {Array}   opts.palette Theme colour palette.
 * @param {boolean} opts.isSplit The split variant.
 * @return {{ root: Object, content: Object, media: Object, band: { hasBandProps: boolean, bandStyle: Object } }}
 *   Styles for the section, `.sgs-hero__content`, and `.sgs-hero__media` (the split media's grid cell).
 */
export function heroCanvasPreview(
	attributes,
	{ tier = 'desktop', palette = [], isSplit = false }
) {
	const wrapper = containerWrapperPreview( attributes, tier, palette );

	// Section: the shared wrapper's gap, max-width, radius and layout, then hero's own rules.
	const root = {};
	[
		'gap',
		'maxWidth',
		...RADIUS_STYLE_KEYS,
		'display',
		'gridTemplateColumns',
		'gridTemplateRows',
		'gridAutoRows',
		'alignItems',
		'justifyItems',
		'alignContent',
		'flexDirection',
		'flexWrap',
		'justifyContent',
	].forEach( ( key ) => {
		if ( undefined !== wrapper.style[ key ] ) {
			root[ key ] = wrapper.style[ key ];
		}
	} );
	// A standard hero's padding paints its content band (the shared wrapper's `bandStyle`); a split hero has no band, so it stays on the section.
	Object.assign(
		root,
		isSplit ? tierBoxLonghands( attributes.padding, tier, 'padding' ) : {},
		tierBoxLonghands( attributes.margin, tier, 'margin' )
	);
	// render.php always sets align-items from verticalAlignment; a wrapper layout's own value wins.
	root.alignItems =
		root.alignItems ||
		ALIGN_MAP[ attributes.verticalAlignment ] ||
		'center';
	const minHeight =
		'mobile' === tier
			? tierValueOf(
					{
						...attributes.minHeight,
						mobile: attributes.minHeight?.mobile || '360px',
					},
					tier
			  )
			: tierValueOf( attributes.minHeight, tier );
	if ( minHeight ) {
		root.minHeight = minHeight;
	}
	Object.assign( root, typographyPreviewStyle( attributes, '', tier ) );

	if ( isSplit ) {
		const gtc = attributes.gridTemplateColumns || {};
		const desktopRatio = gtc.desktop || '1fr 1fr';
		root.gridTemplateColumns =
			{
				desktop: desktopRatio,
				tablet: gtc.tablet || desktopRatio,
				mobile: gtc.mobile || '1fr',
			}[ tier ] || desktopRatio;
		// Split confines its two columns with inline padding instead of a band (desktop tier).
		const cw = attributes.contentWidth?.desktop || '';
		const band =
			{
				normal: 'var(--wp--style--global--content-size)',
				wide: 'var(--wp--style--global--wide-size)',
			}[ cw ] || ( cw && 'full' !== cw ? cw : '' );
		if ( band ) {
			root.paddingInline = `max(var(--wp--style--root--padding-right,24px),calc((100% - ${ band }) / 2))`;
		}
	}

	// Content column.
	const content = {
		justifyContent: ALIGN_MAP[ attributes.verticalAlignment ] || 'center',
	};
	const textAlign = tierValueOf( attributes.textAlign, tier );
	if ( TEXT_ALIGNS.includes( textAlign ) ) {
		content.textAlign = textAlign;
	}
	Object.assign(
		content,
		backgroundPaintPreview(
			attributes.contentBackground,
			attributes.contentBackgroundGradient,
			palette
		)
	);
	// Set sides only, as render.php prints the content, media and split-media padding.
	Object.assign(
		content,
		tierBoxLonghands( attributes.contentPadding, tier, 'padding' )
	);
	const contentGap = tierLengthPreview( attributes.contentGap, tier );
	if ( undefined !== contentGap ) {
		content.gap = contentGap;
	}

	// Split column order: desktop 'media-first' swaps; tablet overrides when set;
	// mobile is media-first unless set to content-first.
	const order = attributes.splitContentOrder || {};
	const desktopMediaFirst = 'media-first' === order.desktop;
	const mediaFirst = {
		desktop: desktopMediaFirst,
		tablet: order.tablet
			? 'media-first' === order.tablet
			: desktopMediaFirst,
		mobile: 'content-first' !== order.mobile,
	}[ tier ];
	const media = {};
	if ( isSplit && mediaFirst ) {
		content.order = 2;
		media.order = 1;
	}

	return {
		root,
		content,
		media,
		band: isSplit
			? { hasBandProps: false, bandStyle: {} }
			: {
					hasBandProps: wrapper.hasBandProps,
					bandStyle: wrapper.bandStyle,
			  },
		layoutClass: wrapper.className,
	};
}
