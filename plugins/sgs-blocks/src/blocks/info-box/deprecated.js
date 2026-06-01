import { InnerBlocks, useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Deprecated versions of the SGS Info Box block.
 *
 * Newest first (WordPress walks this array in order, stopping at the first
 * version whose save() output matches the stored post_content).
 *
 * v4 — FR-22-6 migration (2026-05-31). Previous shape: scalar attrs for
 *      heading / subtitle / description drove render.php; only the button
 *      slot was an InnerBlocks child (save: <InnerBlocks.Content />).
 *      The stored post_content therefore contains only the serialised
 *      sgs/multi-button subtree (or is empty for blocks inserted in the v2/v3
 *      era when save was null).
 *      migrate() converts scalar content attrs into the new full InnerBlocks set.
 *
 * v3 — boxMedia introduction (2026-05-05). save: null. Migrated legacy `image`
 *      object into the unified `boxMedia` slot.
 *
 * v2 — 5-element toggle + reorder system added. save: null (fully dynamic,
 *      no InnerBlocks slot). Migrated mediaType enum + new toggle attrs.
 *
 * v1 — static save with full HTML output (original era).
 */

// ---------------------------------------------------------------------------
// v4 — scalar-content + button-only InnerBlocks shape (pre-FR-22-6)
// ---------------------------------------------------------------------------

/**
 * Attribute snapshot for v4.
 * Matches block.json immediately before the FR-22-6 migration.
 */
const V4_ATTRIBUTES = {
	showMedia:    { type: 'boolean', default: true },
	showTitle:    { type: 'boolean', default: true },
	showSubtitle: { type: 'boolean', default: false },
	showText:     { type: 'boolean', default: true },
	showButton:   { type: 'boolean', default: false },
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
	mediaEmoji:            { type: 'string', default: '' },
	subtitle:              { type: 'string', default: '', role: 'content' },
	subtitleColour:        { type: 'string', default: '' },
	subtitleFontSize:      { type: 'string', default: '' },
	subtitleFontSizeTablet: { type: 'string', default: '' },
	subtitleFontSizeMobile: { type: 'string', default: '' },
	image:   { type: 'object' },
	boxMedia: { type: 'object', default: null },
	iconPosition: {
		type: 'string',
		default: 'top',
		enum: [ 'top', 'left', 'right' ],
	},
	icon:              { type: 'string', default: 'star-filled' },
	heading:           { type: 'string', default: '', role: 'content' },
	description:       { type: 'string', default: '', role: 'content' },
	link:              { type: 'string' },
	linkOpensNewTab:   { type: 'boolean', default: false },
	iconColour:          { type: 'string', default: 'primary' },
	iconBackgroundColour: { type: 'string', default: 'accent-light' },
	iconSize:            { type: 'string', default: 'medium' },
	iconSizeTablet:      { type: 'string', default: '' },
	iconSizeMobile:      { type: 'string', default: '' },
	headingColour:        { type: 'string', default: 'primary' },
	headingFontSize:      { type: 'string' },
	headingFontSizeTablet: { type: 'string', default: '' },
	headingFontSizeMobile: { type: 'string', default: '' },
	descriptionColour:    { type: 'string', default: 'text' },
	cardStyle:     { type: 'string', default: 'elevated' },
	hoverEffect:   { type: 'string', default: 'lift' },
	hoverBackgroundColour: { type: 'string', default: '' },
	hoverTextColour:       { type: 'string', default: '' },
	hoverBorderColour:     { type: 'string', default: '' },
	transitionDuration:    { type: 'string', default: '300' },
	transitionEasing:      { type: 'string', default: 'ease-in-out' },
	hoverScale:      { type: 'string', default: '' },
	hoverShadow:     { type: 'string', default: '' },
	blockLink:       { type: 'string', default: '' },
	blockLinkTarget: { type: 'boolean', default: false },
	hoverGrayscale:  { type: 'boolean', default: false },
	hoverImageZoom:  { type: 'boolean', default: false },
	staggerDelay:    { type: 'number', default: 0 },
	sgsAnimation:          { type: 'string', default: 'fade-up' },
	sgsAnimationDuration:  { type: 'string', default: 'medium' },
	sgsAnimationEasing:    { type: 'string', default: 'default' },
	textAlignMobile:  { type: 'string', default: '' },
	textAlignTablet:  { type: 'string', default: '' },
	textAlignDesktop: { type: 'string', default: '' },
};

/**
 * v4 save — the button-only InnerBlocks slot.
 *
 * This is what WordPress stored in post_content for blocks inserted during
 * the scalar-attr era: only sgs/multi-button was serialised as an InnerBlock;
 * everything else was driven by scalar attrs via render.php.
 */
const v4 = {
	attributes: V4_ATTRIBUTES,

	save() {
		return <InnerBlocks.Content />;
	},

	/**
	 * Migrate scalar content attrs → full InnerBlocks set.
	 *
	 * The stored post_content carries the existing sgs/multi-button subtree
	 * as the `innerBlocks` argument (second element of the tuple). We prepend
	 * the content blocks derived from the scalar attrs and return the merged
	 * innerBlocks array.
	 *
	 * @param {Object} attributes  - Old scalar attributes.
	 * @param {Array}  innerBlocks - Existing serialised inner blocks
	 *                               (the button sgs/multi-button subtree, may be empty).
	 * @return {[Object, Array]} Tuple of [newAttributes, newInnerBlocks].
	 */
	migrate( attributes, innerBlocks ) {
		const {
			icon,
			iconColour,
			iconBackgroundColour,
			iconSize,
			mediaType,
			mediaEmoji,
			image,
			boxMedia,
			heading,
			subtitle,
			description,
			showMedia,
			showTitle,
			showSubtitle,
			showText,
			showButton,
			elementOrder,
			// Content attrs consumed into InnerBlocks — no longer used by render.php.
			// Retained on newAttributes for deprecation-chain safety.
			...rest
		} = attributes;

		const contentBlocks = [];

		// 1. Media (icon / emoji / image) → appropriate child block.
		if ( showMedia !== false ) {
			if ( 'image' === mediaType ) {
				// Prefer unified boxMedia slot; fall back to legacy image.
				const mediaUrl = ( boxMedia && boxMedia.url )
					? boxMedia.url
					: ( image && image.url ? image.url : '' );
				const mediaAlt = ( boxMedia && boxMedia.alt )
					? boxMedia.alt
					: ( image && image.alt ? image.alt : '' );
				const mediaId  = ( boxMedia && boxMedia.id )
					? boxMedia.id
					: ( image && image.id ? image.id : 0 );

				if ( mediaUrl ) {
					contentBlocks.push( [
						'sgs/media',
						{
							mediaType: 'image',
							imageUrl:  mediaUrl,
							imageAlt:  mediaAlt,
							imageId:   mediaId,
						},
						[],
					] );
				}
			} else if ( 'emoji' === mediaType && mediaEmoji ) {
				// Emoji: use sgs/text as a wrapper (no dedicated emoji block).
				contentBlocks.push( [
					'sgs/text',
					{ text: mediaEmoji, tag: 'div' },
					[],
				] );
			} else {
				// Icon (default): sgs/icon block.
				contentBlocks.push( [
					'sgs/icon',
					{
						icon:                icon || 'star-filled',
						iconColour:          iconColour || 'primary',
						iconBackgroundColour: iconBackgroundColour || 'accent-light',
						iconSize:            iconSize || 'medium',
					},
					[],
				] );
			}
		}

		// 2. Heading → sgs/heading.
		if ( showTitle !== false && heading ) {
			contentBlocks.push( [
				'sgs/heading',
				{
					level:       3,
					headingRole: 'heading',
					content:     heading,
				},
				[],
			] );
		}

		// 3. Subtitle → sgs/heading (subheading role) or sgs/text.
		if ( showSubtitle && subtitle ) {
			contentBlocks.push( [
				'sgs/heading',
				{
					headingRole: 'subheading',
					content:     subtitle,
				},
				[],
			] );
		}

		// 4. Description → sgs/text.
		if ( showText !== false && description ) {
			contentBlocks.push( [
				'sgs/text',
				{ text: description },
				[],
			] );
		}

		// 5. Button: append existing innerBlocks (sgs/multi-button subtree).
		// If the block was in the save:null era, innerBlocks will be empty —
		// seed a default button only if showButton was explicitly enabled.
		const buttonBlocks = ( innerBlocks && innerBlocks.length > 0 )
			? innerBlocks
			: ( showButton
				? [
						[
							'sgs/multi-button',
							{},
							[
								[
									'sgs/button',
									{ inheritStyle: 'primary', label: 'Learn More' },
									[],
								],
							],
						],
					]
				: [] );

		const newInnerBlocks = [ ...contentBlocks, ...buttonBlocks ];

		// Retain all attrs on the migrated block. Content attrs (heading,
		// description, etc.) are no longer read by render.php but must survive
		// round-trips through the deprecation chain.
		const newAttributes = {
			...rest,
			icon,
			iconColour,
			iconBackgroundColour,
			iconSize,
			mediaType,
			mediaEmoji,
			image,
			boxMedia,
			heading,
			subtitle,
			description,
			showMedia,
			showTitle,
			showSubtitle,
			showText,
			showButton,
			elementOrder,
		};

		return [ newAttributes, newInnerBlocks ];
	},
};

// ---------------------------------------------------------------------------
// v3 — boxMedia introduction (save: null)
// ---------------------------------------------------------------------------

const v3 = {
	attributes: {
		showMedia:    { type: 'boolean', default: true },
		showTitle:    { type: 'boolean', default: true },
		showSubtitle: { type: 'boolean', default: false },
		showText:     { type: 'boolean', default: true },
		showButton:   { type: 'boolean', default: false },
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
		mediaEmoji:            { type: 'string', default: '' },
		subtitle:              { type: 'string', default: '' },
		subtitleColour:        { type: 'string', default: '' },
		subtitleFontSize:      { type: 'string', default: '' },
		subtitleFontSizeTablet: { type: 'string', default: '' },
		subtitleFontSizeMobile: { type: 'string', default: '' },
		image: { type: 'object' },
		iconPosition: {
			type: 'string',
			default: 'top',
			enum: [ 'top', 'left', 'right' ],
		},
		icon:              { type: 'string', default: 'star-filled' },
		heading:           { type: 'string', default: '' },
		description:       { type: 'string', default: '' },
		link:              { type: 'string' },
		linkOpensNewTab:   { type: 'boolean', default: false },
		iconColour:          { type: 'string', default: 'primary' },
		iconBackgroundColour: { type: 'string', default: 'accent-light' },
		iconSize:            { type: 'string', default: 'medium' },
		iconSizeTablet:      { type: 'string', default: '' },
		iconSizeMobile:      { type: 'string', default: '' },
		headingColour:        { type: 'string', default: 'primary' },
		headingFontSize:      { type: 'string' },
		headingFontSizeTablet: { type: 'string', default: '' },
		headingFontSizeMobile: { type: 'string', default: '' },
		descriptionColour:    { type: 'string', default: 'text' },
		cardStyle:     { type: 'string', default: 'elevated' },
		hoverEffect:   { type: 'string', default: 'lift' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour:       { type: 'string', default: '' },
		hoverBorderColour:     { type: 'string', default: '' },
		transitionDuration:    { type: 'string', default: '300' },
		transitionEasing:      { type: 'string', default: 'ease-in-out' },
		hoverScale:      { type: 'string', default: '' },
		hoverShadow:     { type: 'string', default: '' },
		blockLink:       { type: 'string', default: '' },
		blockLinkTarget: { type: 'boolean', default: false },
		hoverGrayscale:  { type: 'boolean', default: false },
		hoverImageZoom:  { type: 'boolean', default: false },
		staggerDelay:    { type: 'number', default: 0 },
		sgsAnimation:         { type: 'string', default: 'fade-up' },
		sgsAnimationDuration: { type: 'string', default: 'medium' },
		sgsAnimationEasing:   { type: 'string', default: 'default' },
		textAlignMobile:  { type: 'string', default: '' },
		textAlignTablet:  { type: 'string', default: '' },
		textAlignDesktop: { type: 'string', default: '' },
	},
	save() {
		// Dynamic block — save was always null in this era.
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

// ---------------------------------------------------------------------------
// v2 — 5-element toggle + reorder system (save: null)
// ---------------------------------------------------------------------------

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
		icon:            { type: 'string', default: 'star-filled' },
		heading:         { type: 'string', default: '' },
		description:     { type: 'string', default: '' },
		link:            { type: 'string' },
		linkOpensNewTab: { type: 'boolean', default: false },
		iconColour:          { type: 'string', default: 'primary' },
		iconBackgroundColour: { type: 'string', default: 'accent-light' },
		iconSize:            { type: 'string', default: 'medium' },
		iconSizeTablet:      { type: 'string', default: '' },
		iconSizeMobile:      { type: 'string', default: '' },
		headingColour:     { type: 'string', default: 'primary' },
		headingFontSize:   { type: 'string' },
		headingFontSizeTablet: { type: 'string', default: '' },
		headingFontSizeMobile: { type: 'string', default: '' },
		descriptionColour: { type: 'string', default: 'text' },
		cardStyle:   { type: 'string', default: 'elevated' },
		hoverEffect: { type: 'string', default: 'lift' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour:       { type: 'string', default: '' },
		hoverBorderColour:     { type: 'string', default: '' },
		transitionDuration: { type: 'string', default: '300' },
		transitionEasing:   { type: 'string', default: 'ease-in-out' },
		hoverScale:      { type: 'string', default: '' },
		hoverShadow:     { type: 'string', default: '' },
		blockLink:       { type: 'string', default: '' },
		blockLinkTarget: { type: 'boolean', default: false },
		hoverGrayscale:  { type: 'boolean', default: false },
		hoverImageZoom:  { type: 'boolean', default: false },
		staggerDelay:    { type: 'number', default: 0 },
		sgsAnimation:         { type: 'string', default: 'fade-up' },
		sgsAnimationDuration: { type: 'string', default: 'medium' },
		sgsAnimationEasing:   { type: 'string', default: 'default' },
		textAlignMobile:  { type: 'string', default: '' },
		textAlignTablet:  { type: 'string', default: '' },
		textAlignDesktop: { type: 'string', default: '' },
	},
	save() {
		// Dynamic block — save was always null.
		return null;
	},
	migrate( attributes ) {
		const hasMedia = !! ( attributes.icon || attributes.image?.url );
		const hasTitle = !! attributes.heading;
		const hasText  = !! attributes.description;

		return {
			...attributes,
			showMedia:    hasMedia,
			showTitle:    hasTitle,
			showSubtitle: false,
			showText:     hasText,
			showButton:   false,
			elementOrder: [ 'media', 'title', 'subtitle', 'text', 'button' ],
			mediaType:    attributes.mediaType === 'image' ? 'image' : 'icon',
			mediaEmoji:            '',
			subtitle:              '',
			subtitleColour:        '',
			subtitleFontSize:      '',
			subtitleFontSizeTablet: '',
			subtitleFontSizeMobile: '',
		};
	},
};

// ---------------------------------------------------------------------------
// v1 — static save with full HTML output (original era)
// ---------------------------------------------------------------------------

const v1 = {
	attributes: {
		icon:            { type: 'string', default: 'star-filled' },
		heading:         {
			type: 'string',
			source: 'html',
			selector: '.sgs-info-box__heading',
		},
		description: {
			type: 'string',
			source: 'html',
			selector: '.sgs-info-box__description',
		},
		link:            { type: 'string' },
		linkOpensNewTab: { type: 'boolean', default: false },
		iconColour:          { type: 'string', default: 'primary' },
		iconBackgroundColour: { type: 'string', default: 'accent-light' },
		iconSize:            { type: 'string', default: 'medium' },
		headingColour:     { type: 'string' },
		headingFontSize:   { type: 'string' },
		descriptionColour: { type: 'string' },
		cardStyle:   { type: 'string', default: 'elevated' },
		hoverEffect: { type: 'string', default: 'lift' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour:       { type: 'string', default: '' },
		hoverBorderColour:     { type: 'string', default: '' },
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
			color:           colourVar( iconColour ),
			backgroundColor: colourVar( iconBackgroundColour ),
		};

		const headingStyle = {
			color:    colourVar( headingColour ) || undefined,
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
							? { target: '_blank', rel: 'noopener noreferrer' }
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
		// v1 → v2: static save → dynamic render, no structural change needed.
		return attributes;
	},
};

// Newest first.
export default [ v4, v3, v2, v1 ];
