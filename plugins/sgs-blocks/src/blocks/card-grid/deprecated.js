/**
 * Card Grid deprecations.
 *
 * V2 (FRONT — newest first): pre-media-slot schema (2026-05-05). Each item
 * accepted only an `image` object. v2 lifts each item's legacy `image` into
 * the new unified `media` slot so existing posts open without "unexpected
 * content" warnings. `image` is preserved on each item as a back-compat
 * denormalised fallback (matches hero v4 pattern).
 *
 * V1: original static save output, before the block was converted to
 * server-side rendering (render.php). Blocks saved with the old static
 * HTML are migrated by returning the attributes unchanged; WordPress
 * will re-render via render.php on the next editor save.
 */
import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, spacingVar } from '../../utils';

const v2 = {
	attributes: {
		variant:               { type: 'string', default: 'card' },
		items:                 { type: 'array',  default: [] },
		columns:               { type: 'number', default: 3 },
		columnsMobile:         { type: 'number', default: 1 },
		gap:                   { type: 'string', default: '30' },
		aspectRatio:           { type: 'string', default: '16/10' },
		hoverEffect:           { type: 'string', default: 'zoom' },
		columnsTablet:         { type: 'number', default: 2 },
		overlayStyle:          { type: 'string', default: 'gradient' },
		titleColour:           { type: 'string', default: 'primary' },
		subtitleColour:        { type: 'string', default: 'text' },
		hoverBackgroundColour: { type: 'string' },
		hoverTextColour:       { type: 'string' },
		hoverBorderColour:     { type: 'string', default: 'primary' },
		transitionDuration:    { type: 'string', default: '300' },
		transitionEasing:      { type: 'string', default: 'ease-in-out' },
		hoverScale:            { type: 'string', default: '' },
		hoverShadow:           { type: 'string', default: '' },
		hoverImageZoom:        { type: 'boolean', default: false },
		hoverGrayscale:        { type: 'boolean', default: false },
		staggerDelay:          { type: 'number', default: 80 },
		sgsAnimation:          { type: 'string', default: 'fade-up' },
		sgsAnimationDuration:  { type: 'string', default: 'medium' },
		sgsAnimationEasing:    { type: 'string', default: 'default' },
		source:                { type: 'string', default: 'manual', enum: [ 'manual', 'query' ] },
		queryPostType:         { type: 'string', default: 'post' },
		queryPostsPerPage:     { type: 'number', default: 6 },
		queryCategory:         { type: 'number', default: 0 },
	},
	save() {
		// Block is server-side rendered — save returns null (matches current).
		return null;
	},
	isEligible( attributes ) {
		// Only run when at least one item still has a legacy `image` and has
		// not yet been populated with `media` — prevents re-running on
		// already-migrated posts.
		if ( ! attributes || ! Array.isArray( attributes.items ) ) {
			return false;
		}
		return attributes.items.some(
			( it ) => it && it.image && it.image.url && ! it.media
		);
	},
	migrate( attributes ) {
		const nextItems = ( attributes.items || [] ).map( ( it ) => {
			if ( ! it ) {
				return it;
			}
			if ( it.image && it.image.url && ! it.media ) {
				return {
					...it,
					media: {
						url: it.image.url,
						type: 'image',
						id: it.image.id || 0,
						alt: it.image.alt || '',
						mime: 'image/jpeg',
					},
				};
			}
			return it;
		} );
		return { ...attributes, items: nextItems };
	},
};

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

export default [ v2, v1 ];
