import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { spacingVar, shadowVar } from '../../utils';

export default function Save( { attributes } ) {
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
}
