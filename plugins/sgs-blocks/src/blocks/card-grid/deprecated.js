/**
 * Card Grid block — v1 deprecation.
 *
 * Captures the original static save output before the block was converted to
 * server-side rendering via render.php. WordPress will use this to validate
 * existing block content on pages and silently migrate it to the dynamic
 * render.php output on the next editor save.
 */
import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, spacingVar } from '../../utils';

const v1 = {
	attributes: {
		variant:               { type: 'string', default: 'card' },
		items:                 { type: 'array', default: [] },
		columns:               { type: 'number', default: 3 },
		columnsMobile:         { type: 'number', default: 1 },
		columnsTablet:         { type: 'number', default: 2 },
		overlayStyle:          { type: 'string' },
		gap:                   { type: 'string', default: '30' },
		aspectRatio:           { type: 'string', default: '16/10' },
		hoverEffect:           { type: 'string', default: 'zoom' },
		titleColour:           { type: 'string' },
		subtitleColour:        { type: 'string' },
		hoverBackgroundColour: { type: 'string' },
		hoverTextColour:       { type: 'string' },
		hoverBorderColour:     { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true },
		typography: { fontSize: true, lineHeight: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save( { attributes } ) {
		const {
			variant,
			items,
			columns,
			columnsMobile,
			columnsTablet,
			gap,
			aspectRatio,
			hoverEffect,
			titleColour,
			subtitleColour,
			hoverBackgroundColour,
			hoverTextColour,
			hoverBorderColour,
		} = attributes;

		const className = [
			'sgs-card-grid',
			`sgs-card-grid--${ variant }`,
			`sgs-card-grid--hover-${ hoverEffect }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const gridStyle = {
			'--sgs-card-grid-columns':        columns,
			'--sgs-card-grid-columns-mobile': columnsMobile,
			'--sgs-card-grid-columns-tablet': columnsTablet,
			'--sgs-card-grid-gap':            spacingVar( gap ),
			'--sgs-card-grid-aspect':         aspectRatio,
			'--sgs-hover-bg':                 colourVar( hoverBackgroundColour ) || undefined,
			'--sgs-hover-text':               colourVar( hoverTextColour ) || undefined,
			'--sgs-hover-border':             colourVar( hoverBorderColour ) || undefined,
		};

		const titleStyle    = { color: colourVar( titleColour ) || undefined };
		const subtitleStyle = { color: colourVar( subtitleColour ) || undefined };

		if ( ! items.length ) {
			return null;
		}

		return (
			<div { ...blockProps } style={ { ...blockProps.style, ...gridStyle } }>
				{ items.map( ( item, index ) => {
					const hasLink   = !! item.link;
					const Tag       = hasLink ? 'a' : 'div';
					const linkProps = hasLink
						? { href: item.link, className: 'sgs-card-grid__item' }
						: { className: 'sgs-card-grid__item' };

					return (
						<Tag key={ index } { ...linkProps }>
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
										{ item.title && (
											<span className="sgs-card-grid__title" style={ titleStyle }>
												{ item.title }
											</span>
										) }
										{ item.subtitle && (
											<span className="sgs-card-grid__subtitle" style={ subtitleStyle }>
												{ item.subtitle }
											</span>
										) }
									</div>
								) }
							</div>
							{ variant === 'card' && (
								<div className="sgs-card-grid__body">
									{ item.title && (
										<h3 className="sgs-card-grid__title" style={ titleStyle }>
											{ item.title }
										</h3>
									) }
									{ item.subtitle && (
										<p className="sgs-card-grid__subtitle" style={ subtitleStyle }>
											{ item.subtitle }
										</p>
									) }
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
		return attributes;
	},
};

export default [ v1 ];
