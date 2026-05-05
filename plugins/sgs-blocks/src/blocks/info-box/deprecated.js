import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * V1 deprecation: static save with full HTML output.
 *
 * Migrates to dynamic render (save returns null) — render.php
 * now handles all frontend output. Attributes are preserved
 * in the block comment delimiter JSON.
 */
const v1 = {
	attributes: {
		icon: { type: 'string', default: 'star-filled' },
		heading: {
			type: 'string',
			source: 'html',
			selector: '.sgs-info-box__heading',
		},
		description: {
			type: 'string',
			source: 'html',
			selector: '.sgs-info-box__description',
		},
		link: { type: 'string' },
		linkOpensNewTab: { type: 'boolean', default: false },
		iconColour: { type: 'string', default: 'primary' },
		iconBackgroundColour: { type: 'string', default: 'accent-light' },
		iconSize: { type: 'string', default: 'medium' },
		headingColour: { type: 'string' },
		headingFontSize: { type: 'string' },
		descriptionColour: { type: 'string' },
		cardStyle: { type: 'string', default: 'elevated' },
		hoverEffect: { type: 'string', default: 'lift' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
	},
	supports: {
		align: false,
		anchor: true,
		html: false,
		color: { background: true, text: true, link: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save( { attributes } ) {
		const {
			icon,
			heading,
			description,
			link,
			linkOpensNewTab,
			iconColour,
			iconBackgroundColour,
			iconSize,
			headingColour,
			headingFontSize,
			descriptionColour,
			cardStyle,
			hoverEffect,
		} = attributes;

		const className = [
			'sgs-info-box',
			`sgs-info-box--${ cardStyle }`,
			`sgs-info-box--hover-${ hoverEffect }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const iconStyle = {
			color: colourVar( iconColour ),
			backgroundColor: colourVar( iconBackgroundColour ),
		};

		const headingStyle = {
			color: colourVar( headingColour ) || undefined,
			fontSize: fontSizeVar( headingFontSize ) || undefined,
		};

		const descriptionStyle = {
			color: colourVar( descriptionColour ) || undefined,
		};

		const cardContent = (
			<>
				<span
					className={ `sgs-info-box__icon sgs-info-box__icon--${ iconSize }` }
					style={ iconStyle }
					data-icon={ icon }
					aria-hidden="true"
				/>
				<RichText.Content
					tagName="h3"
					className="sgs-info-box__heading"
					value={ heading }
					style={ headingStyle }
				/>
				<RichText.Content
					tagName="p"
					className="sgs-info-box__description"
					value={ description }
					style={ descriptionStyle }
				/>
			</>
		);

		if ( link ) {
			return (
				<div { ...blockProps }>
					<a
						href={ link }
						className="sgs-info-box__link"
						{ ...( linkOpensNewTab
							? {
									target: '_blank',
									rel: 'noopener noreferrer',
							  }
							: {} ) }
					>
						{ cardContent }
					</a>
				</div>
			);
		}

		return <div { ...blockProps }>{ cardContent }</div>;
	},
	migrate( attributes ) {
		// V1 → V2: static save → dynamic render, no structural change needed.
		return attributes;
	},
};

/**
 * V2 deprecation: dynamic block (save returns null) without element-order
 * attributes (showMedia, showTitle, showSubtitle, showText, showButton,
 * elementOrder, mediaEmoji, subtitle, subtitleColour, subtitleFontSize*).
 *
 * Migrates to V3 which adds the 5-element toggle + reorder system.
 */
const v2 = {
	attributes: {
		mediaType: {
			type: 'string',
			default: 'icon',
			enum: [ 'icon', 'image' ],
		},
		image: { type: 'object' },
		iconPosition: {
			type: 'string',
			default: 'top',
			enum: [ 'top', 'left', 'right' ],
		},
		icon: { type: 'string', default: 'star-filled' },
		heading: { type: 'string', default: '' },
		description: { type: 'string', default: '' },
		link: { type: 'string' },
		linkOpensNewTab: { type: 'boolean', default: false },
		iconColour: { type: 'string', default: 'primary' },
		iconBackgroundColour: { type: 'string', default: 'accent-light' },
		iconSize: { type: 'string', default: 'medium' },
		iconSizeTablet: { type: 'string', default: '' },
		iconSizeMobile: { type: 'string', default: '' },
		headingColour: { type: 'string', default: 'primary' },
		headingFontSize: { type: 'string' },
		headingFontSizeTablet: { type: 'string', default: '' },
		headingFontSizeMobile: { type: 'string', default: '' },
		descriptionColour: { type: 'string', default: 'text' },
		cardStyle: { type: 'string', default: 'elevated' },
		hoverEffect: { type: 'string', default: 'lift' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
		transitionDuration: { type: 'string', default: '300' },
		transitionEasing: { type: 'string', default: 'ease-in-out' },
		hoverScale: { type: 'string', default: '' },
		hoverShadow: { type: 'string', default: '' },
		blockLink: { type: 'string', default: '' },
		blockLinkTarget: { type: 'boolean', default: false },
		hoverGrayscale: { type: 'boolean', default: false },
		hoverImageZoom: { type: 'boolean', default: false },
		staggerDelay: { type: 'number', default: 0 },
		sgsAnimation: { type: 'string', default: 'fade-up' },
		sgsAnimationDuration: { type: 'string', default: 'medium' },
		sgsAnimationEasing: { type: 'string', default: 'default' },
		textAlignMobile: { type: 'string', default: '' },
		textAlignTablet: { type: 'string', default: '' },
		textAlignDesktop: { type: 'string', default: '' },
	},
	save() {
		// Dynamic block — save was always null.
		return null;
	},
	migrate( attributes ) {
		// Derive sensible toggle defaults from what was actually set.
		const hasMedia = !! ( attributes.icon || attributes.image?.url );
		const hasTitle = !! attributes.heading;
		const hasText  = !! attributes.description;
		const hasLink  = !! attributes.link;

		return {
			...attributes,
			// New toggle attributes.
			showMedia:    hasMedia,
			showTitle:    hasTitle,
			showSubtitle: false,
			showText:     hasText,
			showButton:   false, // old link stays in the `link` attr; button slot starts empty.
			// New element order.
			elementOrder: [ 'media', 'title', 'subtitle', 'text', 'button' ],
			// Extend mediaType enum to include 'emoji' (value was 'icon' or 'image').
			mediaType:    attributes.mediaType === 'image' ? 'image' : 'icon',
			// New attributes not previously present.
			mediaEmoji:            '',
			subtitle:              '',
			subtitleColour:        '',
			subtitleFontSize:      '',
			subtitleFontSizeTablet: '',
			subtitleFontSizeMobile: '',
		};
	},
};

/**
 * V3 deprecation: schema before boxMedia was introduced (2026-05-05). The
 * block accepted only an image via the legacy `image` object attribute.
 * v3 migrates legacy image objects into the unified boxMedia slot so existing
 * posts open without "unexpected content" warnings. The legacy `image`
 * attribute is preserved as a back-compat denormalised fallback.
 */
const v3 = {
	attributes: {
		showMedia: { type: 'boolean', default: true },
		showTitle: { type: 'boolean', default: true },
		showSubtitle: { type: 'boolean', default: false },
		showText: { type: 'boolean', default: true },
		showButton: { type: 'boolean', default: false },
		elementOrder: {
			type: 'array',
			default: [ 'media', 'title', 'subtitle', 'text', 'button' ],
			items: { type: 'string' },
		},
		mediaType: {
			type: 'string',
			default: 'icon',
			enum: [ 'icon', 'emoji', 'image' ],
		},
		mediaEmoji: { type: 'string', default: '' },
		subtitle: { type: 'string', default: '' },
		subtitleColour: { type: 'string', default: '' },
		subtitleFontSize: { type: 'string', default: '' },
		subtitleFontSizeTablet: { type: 'string', default: '' },
		subtitleFontSizeMobile: { type: 'string', default: '' },
		image: { type: 'object' },
		iconPosition: {
			type: 'string',
			default: 'top',
			enum: [ 'top', 'left', 'right' ],
		},
		icon: { type: 'string', default: 'star-filled' },
		heading: { type: 'string', default: '' },
		description: { type: 'string', default: '' },
		link: { type: 'string' },
		linkOpensNewTab: { type: 'boolean', default: false },
		iconColour: { type: 'string', default: 'primary' },
		iconBackgroundColour: { type: 'string', default: 'accent-light' },
		iconSize: { type: 'string', default: 'medium' },
		iconSizeTablet: { type: 'string', default: '' },
		iconSizeMobile: { type: 'string', default: '' },
		headingColour: { type: 'string', default: 'primary' },
		headingFontSize: { type: 'string' },
		headingFontSizeTablet: { type: 'string', default: '' },
		headingFontSizeMobile: { type: 'string', default: '' },
		descriptionColour: { type: 'string', default: 'text' },
		cardStyle: { type: 'string', default: 'elevated' },
		hoverEffect: { type: 'string', default: 'lift' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
		transitionDuration: { type: 'string', default: '300' },
		transitionEasing: { type: 'string', default: 'ease-in-out' },
		hoverScale: { type: 'string', default: '' },
		hoverShadow: { type: 'string', default: '' },
		blockLink: { type: 'string', default: '' },
		blockLinkTarget: { type: 'boolean', default: false },
		hoverGrayscale: { type: 'boolean', default: false },
		hoverImageZoom: { type: 'boolean', default: false },
		staggerDelay: { type: 'number', default: 0 },
		sgsAnimation: { type: 'string', default: 'fade-up' },
		sgsAnimationDuration: { type: 'string', default: 'medium' },
		sgsAnimationEasing: { type: 'string', default: 'default' },
		textAlignMobile: { type: 'string', default: '' },
		textAlignTablet: { type: 'string', default: '' },
		textAlignDesktop: { type: 'string', default: '' },
	},
	save() {
		// Dynamic block — save was always null.
		return null;
	},
	isEligible( attributes ) {
		// Only run when a legacy image object exists and boxMedia has not yet
		// been populated — prevents re-running on already-migrated posts.
		return !! (
			attributes &&
			attributes.image &&
			attributes.image.url &&
			! attributes.boxMedia
		);
	},
	migrate( attributes ) {
		const next = { ...attributes };
		if (
			attributes.image &&
			attributes.image.url &&
			! attributes.boxMedia
		) {
			next.boxMedia = {
				url:    attributes.image.url,
				type:   'image',
				id:     attributes.image.id || 0,
				alt:    attributes.image.alt || '',
				mime:   'image/jpeg',
				width:  attributes.image.width || 0,
				height: attributes.image.height || 0,
			};
		}
		return next;
	},
};

export default [ v3, v2, v1 ];
