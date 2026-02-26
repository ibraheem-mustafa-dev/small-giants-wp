import { useBlockProps } from '@wordpress/block-editor';
import { colourVar, spacingVar } from '../../utils';

export default function Save( { attributes } ) {
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
	} = attributes;

	const className = [
		'sgs-card-grid',
		`sgs-card-grid--${ variant }`,
		`sgs-card-grid--hover-${ hoverEffect }`,
	].join( ' ' );

	const blockProps = useBlockProps.save( { className } );

	const gridStyle = {
		'--sgs-card-grid-columns': columns,
		'--sgs-card-grid-columns-mobile': columnsMobile,
		'--sgs-card-grid-columns-tablet': columnsTablet,
		'--sgs-card-grid-gap': spacingVar( gap ),
		'--sgs-card-grid-aspect': aspectRatio,
		'--sgs-hover-bg': colourVar( hoverBackgroundColour ) || undefined,
		'--sgs-hover-text': colourVar( hoverTextColour ) || undefined,
		'--sgs-hover-border': colourVar( hoverBorderColour ) || undefined,
	};

	const titleStyle = {
		color: colourVar( titleColour ) || undefined,
	};

	const subtitleStyle = {
		color: colourVar( subtitleColour ) || undefined,
	};

	if ( ! items.length ) {
		return null;
	}

	return (
		<div { ...blockProps } style={ { ...blockProps.style, ...gridStyle } }>
			{ items.map( ( item, index ) => {
				const hasLink = !! item.link;
				const Tag = hasLink ? 'a' : 'div';
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
										<span
											className="sgs-card-grid__title"
											style={ titleStyle }
										>
											{ item.title }
										</span>
									) }
									{ item.subtitle && (
										<span
											className="sgs-card-grid__subtitle"
											style={ subtitleStyle }
										>
											{ item.subtitle }
										</span>
									) }
								</div>
							) }
						</div>
						{ variant === 'card' && (
							<div className="sgs-card-grid__body">
								{ item.title && (
									<h3
										className="sgs-card-grid__title"
										style={ titleStyle }
									>
										{ item.title }
									</h3>
								) }
								{ item.subtitle && (
									<p
										className="sgs-card-grid__subtitle"
										style={ subtitleStyle }
									>
										{ item.subtitle }
									</p>
								) }
								{ item.badge && item.badgeVariant && (
									<span
										className={ `sgs-card-grid__badge sgs-card-grid__badge--${ item.badgeVariant }` }
									>
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
}
