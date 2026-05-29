/**
 * Container block deprecations.
 *
 * v2 — sgs/svg-background → sgs/container cross-block migration (2026-05-28 D93).
 *      Transforms legacy sgs/svg-background blocks into sgs/container blocks
 *      with bgSvg* attributes populated. Matches the retired block name so
 *      WordPress resolves existing posts without "unexpected content" errors.
 *
 * v1 — WP-CLI / empty innerHTML catch-all.
 *      save: () => null matches any stored innerHTML.
 *
 * v0 — original static save that rendered a <div> wrapper.
 *      Required so existing Container blocks in the database don't
 *      trigger block validation errors after switching to dynamic rendering.
 */

import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { spacingVar, shadowVar } from '../../utils';

const v0Attributes = {
	layout: { type: 'string', default: 'stack' },
	columns: { type: 'number', default: 2 },
	columnsMobile: { type: 'number', default: 1 },
	columnsTablet: { type: 'number', default: 2 },
	gap: { type: 'string', default: '40' },
	backgroundImage: { type: 'object' },
	backgroundOverlayColour: { type: 'string' },
	backgroundOverlayOpacity: { type: 'number', default: 50 },
	shadow: { type: 'string' },
	maxWidth: { type: 'string', default: 'wide' },
	minHeight: { type: 'string' },
	verticalAlign: { type: 'string', default: 'start' },
	htmlTag: { type: 'string', default: 'section' },
};

const v0Supports = {
	align: [ 'wide', 'full' ],
	anchor: true,
	html: false,
	color: { background: true, text: true, gradients: true },
	spacing: { margin: true, padding: true, blockGap: true },
	__experimentalBorder: { radius: true, width: true, color: true, style: true },
};

/* v2 — sgs/svg-background cross-block migration.
 *
 * WordPress calls migrate() when a stored block's name matches this deprecated
 * entry's isEligible() result — or simply when the block name in post_content
 * is the retired name. We target sgs/svg-background by registering it here
 * with its original attribute schema.
 *
 * The migrate() function maps old attrs → new sgs/container bgSvg* attrs so the
 * block seamlessly upgrades in the editor without any manual intervention.
 */
const v2SvgBackgroundAttributes = {
	svgContent:     { type: 'string', default: '' },
	svgPosition:    { type: 'string', default: 'background', enum: [ 'background', 'foreground' ] },
	animationType:  { type: 'string', default: 'none', enum: [ 'none', 'pulse', 'float', 'wave' ] },
	animationSpeed: { type: 'string', default: 'medium', enum: [ 'slow', 'medium', 'fast' ] },
	opacity:        { type: 'number', default: 100 },
	minHeight:      { type: 'string', default: '' },
	textShadow:     { type: 'boolean', default: false },
};

const v2SvgBackgroundSupports = {
	align: [ 'wide', 'full' ],
	anchor: true,
	className: true,
	html: false,
	spacing: { margin: true, padding: true, blockGap: true },
	color: { background: true, text: true, gradients: true },
};

const v2 = {
	attributes: v2SvgBackgroundAttributes,
	supports: v2SvgBackgroundSupports,
	isEligible( attributes, innerBlocks, { name } ) {
		return name === 'sgs/svg-background';
	},
	migrate( attributes ) {
		const {
			svgContent,
			svgPosition,
			animationType,
			animationSpeed,
			opacity,
			minHeight,
			textShadow,
			// Pass through any WP-native attrs (className, anchor, style, etc.)
			...rest
		} = attributes;

		return {
			...rest,
			// Map old attrs → new bgSvg* namespace on sgs/container.
			bgSvgContent:       svgContent ?? '',
			bgSvgPosition:      svgPosition ?? 'background',
			bgSvgAnimation:     animationType ?? 'none',
			bgSvgAnimationSpeed: animationSpeed ?? 'medium',
			bgSvgOpacity:       opacity ?? 100,
			bgSvgMinHeight:     minHeight ?? '',
			bgSvgTextShadow:    textShadow ?? false,
			// sgs/container defaults for attrs the old block didn't have.
			layout:             'stack',
			htmlTag:            'section',
			maxWidth:           'wide',
			widthMode:          'default',
			gap:                '40',
		};
	},
	save() {
		// sgs/svg-background used dynamic rendering — inner blocks content only.
		const { children, ...innerBlocksProps } = useInnerBlocksProps.save(
			useBlockProps.save()
		);
		return <div { ...innerBlocksProps }>{ children }</div>;
	},
};

/* v3 — pre-SB-1/QB-1/QB-2/QB-3 schema (before 2026-05-29 D98 additions).
 *
 * Covers blocks saved before these attrs existed:
 *   gridItemPadding, gridItemBackground, gridItemBorderRadius, gridItemBorder,
 *   gridItemShadow, gridItemTextColour, gridTemplateRows, gridTemplateRowsTablet,
 *   gridTemplateRowsMobile, gridAutoRows, justifyItems, alignContent, templateMode.
 *
 * migrate() backfills all new attrs with their block.json defaults so the block
 * upgrades cleanly without any "unexpected content" errors. Save output is unchanged
 * (dynamic block — only InnerBlocks.Content). */
const v3PreD98Attributes = {
	layout:                  { type: 'string', default: 'stack' },
	columns:                 { type: 'number', default: 2 },
	columnsMobile:           { type: 'number', default: 1 },
	columnsTablet:           { type: 'number', default: 2 },
	gridTemplateColumns:     { type: 'string', default: '' },
	gridTemplateColumnsTablet: { type: 'string', default: '' },
	gridTemplateColumnsMobile: { type: 'string', default: '' },
	gap:                     { type: 'string', default: '40' },
	gapTablet:               { type: 'string', default: '' },
	gapMobile:               { type: 'string', default: '' },
	backgroundImage:         { type: 'object' },
	backgroundImageTablet:   { type: 'object' },
	backgroundImageMobile:   { type: 'object' },
	backgroundSize:          { type: 'string', default: 'cover' },
	backgroundPosition:      { type: 'string', default: 'center center' },
	backgroundRepeat:        { type: 'string', default: 'no-repeat' },
	backgroundAttachment:    { type: 'string', default: 'scroll' },
	backgroundOverlayColour: { type: 'string' },
	backgroundOverlayOpacity: { type: 'number', default: 50 },
	overlayGradient:         { type: 'boolean', default: false },
	overlayGradientAngle:    { type: 'number', default: 180 },
	overlayGradientFrom:     { type: 'string', default: '' },
	overlayGradientTo:       { type: 'string', default: '' },
	bgVideo:                 { type: 'object' },
	bgVideoMobile:           { type: 'object' },
	bgParallax:              { type: 'boolean', default: false },
	bgKenBurns:              { type: 'boolean', default: false },
	bgAnimationDuration:     { type: 'number', default: 20 },
	shadow:                  { type: 'string' },
	maxWidth:                { type: 'string', default: 'wide' },
	widthMode:               { type: 'string', default: 'default' },
	widthModeMobile:         { type: 'string', default: '' },
	widthModeTablet:         { type: 'string', default: '' },
	widthModeDesktop:        { type: 'string', default: '' },
	customWidth:             { type: 'number', default: 0 },
	customWidthUnit:         { type: 'string', default: 'px' },
	minHeight:               { type: 'string' },
	verticalAlign:           { type: 'string', default: 'start' },
	htmlTag:                 { type: 'string', default: 'section' },
	shapeDividerTop:         { type: 'string', default: '' },
	shapeDividerTopColour:   { type: 'string', default: '' },
	shapeDividerTopHeight:   { type: 'number', default: 80 },
	shapeDividerTopFlip:     { type: 'boolean', default: false },
	shapeDividerTopInvert:   { type: 'boolean', default: false },
	shapeDividerBottom:      { type: 'string', default: '' },
	shapeDividerBottomColour: { type: 'string', default: '' },
	shapeDividerBottomHeight: { type: 'number', default: 80 },
	shapeDividerBottomFlip:  { type: 'boolean', default: false },
	shapeDividerBottomInvert: { type: 'boolean', default: false },
	bgSvgContent:            { type: 'string', default: '' },
	bgSvgPosition:           { type: 'string', default: 'background' },
	bgSvgAnimation:          { type: 'string', default: 'none' },
	bgSvgAnimationSpeed:     { type: 'string', default: 'medium' },
	bgSvgOpacity:            { type: 'number', default: 100 },
	bgSvgMinHeight:          { type: 'string', default: '' },
	bgSvgTextShadow:         { type: 'boolean', default: false },
};

const v3 = {
	attributes: v3PreD98Attributes,
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true, link: true, heading: true },
		typography: {
			fontSize: true, lineHeight: true, textAlign: true,
			letterSpacing: true, textTransform: true, fontWeight: true, fontStyle: true,
		},
		spacing: { margin: true, padding: true, blockGap: true },
		__experimentalBorder: { radius: true, width: true, color: true, style: true },
	},
	migrate( attributes ) {
		return {
			...attributes,
			// Backfill all D98 new attrs with their block.json defaults.
			gridItemPadding:      '',
			gridItemBackground:   '',
			gridItemBorderRadius: '',
			gridItemBorder:       '',
			gridItemShadow:       '',
			gridItemTextColour:   '',
			gridTemplateRows:        '',
			gridTemplateRowsTablet:  '',
			gridTemplateRowsMobile:  '',
			gridAutoRows:         '',
			justifyItems:         'stretch',
			alignContent:         'stretch',
			templateMode:         'free',
		};
	},
	save() {
		// Dynamic block — only InnerBlocks content is serialised.
		const { children, ...innerBlocksProps } = useInnerBlocksProps.save(
			useBlockProps.save()
		);
		return <div { ...innerBlocksProps }>{ children }</div>;
	},
};

/* v1 — catch-all for empty innerHTML (WP-CLI, block recovery). */
const v1 = {
	attributes: v0Attributes,
	supports: v0Supports,
	save: () => null,
	migrate: ( attributes ) => attributes,
};

/* v0 — original static save before switching to dynamic render.php. */
const v0 = {
	attributes: v0Attributes,
	supports: v0Supports,
	save( { attributes } ) {
		const {
			layout,
			columns,
			columnsMobile,
			columnsTablet,
			gap,
			backgroundImage,
			backgroundOverlayColour,
			backgroundOverlayOpacity,
			shadow,
			maxWidth,
			minHeight,
			verticalAlign,
		} = attributes;

		const style = {
			gap: spacingVar( gap ),
			minHeight: minHeight || undefined,
			...( shadow && { boxShadow: shadowVar( shadow ) } ),
			...( backgroundImage?.url && {
				backgroundImage: `url(${ backgroundImage.url })`,
				backgroundSize: 'cover',
				backgroundPosition: 'center',
			} ),
		};

		if ( layout === 'grid' ) {
			style.display = 'grid';
			style.gridTemplateColumns = `repeat(${ columns }, 1fr)`;
			style.alignItems = verticalAlign;
		} else if ( layout === 'flex' ) {
			style.display = 'flex';
			style.flexWrap = 'wrap';
			style.alignItems = verticalAlign;
		}

		const className = [
			'sgs-container',
			`sgs-container--${ layout }`,
			`sgs-container--width-${ maxWidth }`,
			layout === 'grid' && `sgs-cols-${ columns }`,
			layout === 'grid' &&
				columnsTablet &&
				`sgs-cols-tablet-${ columnsTablet }`,
			layout === 'grid' &&
				columnsMobile &&
				`sgs-cols-mobile-${ columnsMobile }`,
		]
			.filter( Boolean )
			.join( ' ' );

		const blockProps = useBlockProps.save( { className, style } );
		const innerBlocksProps = useInnerBlocksProps.save( blockProps );

		return (
			<div { ...innerBlocksProps }>
				{ backgroundImage?.url && backgroundOverlayColour && (
					<span
						className="sgs-container__overlay"
						style={ {
							backgroundColor: backgroundOverlayColour,
							opacity: backgroundOverlayOpacity / 100,
						} }
						aria-hidden="true"
					/>
				) }
				{ innerBlocksProps.children }
			</div>
		);
	},
};

export default [ v3, v2, v1, v0 ];
