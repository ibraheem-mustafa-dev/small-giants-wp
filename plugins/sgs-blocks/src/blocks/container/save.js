import { useBlockProps, useInnerBlocksProps, InnerBlocks } from '@wordpress/block-editor';
import { spacingVar, shadowVar } from '../../utils';

/**
 * Dynamic block — render.php handles frontend output.
 * Save stores only the inner blocks content.
 */
export default function Save() {
	return <InnerBlocks.Content />;
}

/**
 * Deprecation: v0 static save that rendered a <div> wrapper.
 * Required so existing Container blocks in the database don't
 * trigger block validation errors after switching to dynamic rendering.
 */
export const deprecated = [
	{
		attributes: {
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
		},
		supports: {
			align: [ 'wide', 'full' ],
			anchor: true,
			html: false,
			color: { background: true, text: true, gradients: true },
			spacing: { margin: true, padding: true, blockGap: true },
			__experimentalBorder: {
				radius: true,
				width: true,
				color: true,
				style: true,
			},
		},
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
	},
];
