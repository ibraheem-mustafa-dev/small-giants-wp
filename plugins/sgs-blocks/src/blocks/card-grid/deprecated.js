/**
 * Card Grid deprecations.
 *
 * V1: original static save output, before the block was converted to
 * server-side rendering (render.php). Blocks saved with the old static
 * HTML are migrated by returning the attributes unchanged; WordPress
 * will re-render via render.php on the next editor save.
 */
import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, spacingVar } from '../../utils';

const v1 = {
	attributes: {
		variant:              { type: 'string', default: 'card' },
		items:                { type: 'array',  default: [] },
		columns:              { type: 'number', default: 3 },
		columnsMobile:        { type: 'number', default: 1 },
		gap:                  { type: 'string', default: '30' },
		aspectRatio:          { type: 'string', default: '16/10' },
		hoverEffect:          { type: 'string', default: 'zoom' },
		columnsTablet:        { type: 'number', default: 2 },
		overlayStyle:         { type: 'string', default: 'gradient' },
		titleColour:          { type: 'string' },
		subtitleColour:       { type: 'string' },
		hoverBackgroundColour: { type: 'string' },
		hoverTextColour:      { type: 'string' },
		hoverBorderColour:    { type: 'string' },
		transitionDuration:   { type: 'string', default: '300' },
		transitionEasing:     { type: 'string', default: 'ease-in-out' },
		hoverScale:           { type: 'string', default: '' },
		hoverShadow:          { type: 'string', default: '' },
		hoverImageZoom:       { type: 'boolean', default: false },
		hoverGrayscale:       { type: 'boolean', default: false },
		staggerDelay:         { type: 'number', default: 0 },
	},
	save( { attributes } ) {
		const {
			variant,
			items,
			columns,
			columnsMobile,
			columnsTablet,
			overlayStyle,
			gap,
			aspectRatio,
			hoverEffect,
			titleColour,
			subtitleColour,
			hoverBackgroundColour,
			hoverTextColour,
			hoverBorderColour,
			transitionDuration,
			transitionEasing,
			hoverScale,
			hoverShadow,
			hoverImageZoom,
			hoverGrayscale,
			staggerDelay,
		} = attributes;

		const classNames = [
			'sgs-card-grid',
			`sgs-card-grid--${ variant }`,
			`sgs-card-grid--hover-${ hoverEffect }`,
		];
		if ( hoverScale )    classNames.push( 'sgs-has-hover-scale' );
		if ( hoverShadow )   classNames.push( 'sgs-has-hover' );
		if ( hoverImageZoom ) classNames.push( 'sgs-has-img-zoom' );
		if ( hoverGrayscale ) classNames.push( 'sgs-has-grayscale' );
		if ( staggerDelay )  classNames.push( 'sgs-has-stagger' );

		const blockProps = useBlockProps.save( { className: classNames.join( ' ' ) } );

		const gridStyle = {
			'--sgs-card-grid-columns':        columns,
			'--sgs-card-grid-columns-mobile': columnsMobile,
			'--sgs-card-grid-columns-tablet': columnsTablet,
			'--sgs-card-grid-gap':            spacingVar( gap ),
			'--sgs-card-grid-aspect':         aspectRatio,
			'--sgs-hover-bg':                 colourVar( hoverBackgroundColour ) || undefined,
			'--sgs-hover-text':               colourVar( hoverTextColour ) || undefined,
			'--sgs-hover-border':             colourVar( hoverBorderColour ) || undefined,
			'--sgs-transition-duration':      transitionDuration ? `${ transitionDuration }ms` : undefined,
			'--sgs-transition-easing':        transitionEasing || undefined,
			'--sgs-hover-scale':              hoverScale || undefined,
			'--sgs-hover-shadow':             hoverShadow ? `var(--wp--preset--shadow--${ hoverShadow })` : undefined,
			'--sgs-stagger':                  staggerDelay ? `${ staggerDelay }ms` : undefined,
		};

		const titleStyle    = { color: colourVar( titleColour ) || undefined };
		const subtitleStyle = { color: colourVar( subtitleColour ) || undefined };

		if ( ! items.length ) {
			return null;
		}

		return (
			<div { ...blockProps } style={ { ...blockProps.style, ...gridStyle } }>
				{ items.map( ( item, index ) => {
					const hasLink  = !! item.link;
					const Tag      = hasLink ? 'a' : 'div';
					const linkProps = hasLink
						? { href: item.link, className: 'sgs-card-grid__item' }
						: { className: 'sgs-card-grid__item' };
					const itemStyle = staggerDelay ? { '--sgs-item-index': index } : {};

					return (
						<Tag key={ index } { ...linkProps } style={ itemStyle }>
							<div className="sgs-card-grid__image-wrap">
								{ item.image?.url && (
									<img
										src={ item.image.url }
										alt={ item.image.alt || '' }
										className="sgs-card-grid__image"
										loading="lazy"
									/>
								) }
								{ variant === 'overlay' && (
									<div className="sgs-card-grid__overlay">
										{ item.title && <span className="sgs-card-grid__title" style={ titleStyle }>{ item.title }</span> }
										{ item.subtitle && <span className="sgs-card-grid__subtitle" style={ subtitleStyle }>{ item.subtitle }</span> }
									</div>
								) }
							</div>
							{ variant === 'card' && (
								<div className="sgs-card-grid__body">
									{ item.title && <h3 className="sgs-card-grid__title" style={ titleStyle }>{ item.title }</h3> }
									{ item.subtitle && <p className="sgs-card-grid__subtitle" style={ subtitleStyle }>{ item.subtitle }</p> }
									{ item.badge && item.badgeVariant && (
										<span className={ `sgs-card-grid__badge sgs-card-grid__badge--${ item.badgeVariant }` }>
											{ item.badge }
										</span>
									) }
								</div>
							) }
						</Tag>
					);
				} ) }
			</div>
		);
	},
	migrate( attributes ) {
		return {
			...attributes,
			source: 'manual',
			queryPostType: 'post',
			queryPostsPerPage: 6,
			queryCategory: 0,
		};
	},
};

export default [ v1 ];
