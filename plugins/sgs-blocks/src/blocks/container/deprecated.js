/**
 * Container block deprecations.
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

export default [ v1, v0 ];
