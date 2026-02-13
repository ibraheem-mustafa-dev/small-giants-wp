import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

export default function Save( { attributes } ) {
	const {
		title,
		items,
		badgeStyle,
		badgeSize,
		titleColour,
		titleFontSize,
		labelColour,
		labelFontSize,
	} = attributes;

	const className = [
		'sgs-certification-bar',
		`sgs-certification-bar--${ badgeStyle }`,
		`sgs-certification-bar--${ badgeSize }`,
	].join( ' ' );

	const blockProps = useBlockProps.save( { className } );

	const titleStyle = {
		color: colourVar( titleColour ) || undefined,
		fontSize: fontSizeVar( titleFontSize ) || undefined,
	};

	const labelStyle = {
		color: colourVar( labelColour ) || undefined,
		fontSize: fontSizeVar( labelFontSize ) || undefined,
	};

	const renderBadge = ( item, i ) => {
		const badgeContent = (
			<>
				{ badgeStyle !== 'text-only' && item.image?.url && (
					<img
						src={ item.image.url }
						alt={ item.label || '' }
						className="sgs-certification-bar__badge-img"
						loading="lazy"
					/>
				) }
				{ badgeStyle !== 'image-only' && item.label && (
					<span
						className="sgs-certification-bar__badge-label"
						style={ labelStyle }
					>
						{ item.label }
					</span>
				) }
			</>
		);

		if ( item.url ) {
			return (
				<a
					key={ i }
					href={ item.url }
					className="sgs-certification-bar__badge"
					target="_blank"
					rel="noopener noreferrer"
				>
					{ badgeContent }
				</a>
			);
		}

		return (
			<div key={ i } className="sgs-certification-bar__badge">
				{ badgeContent }
			</div>
		);
	};

	return (
		<div { ...blockProps }>
			{ title && (
				<RichText.Content
					tagName="p"
					className="sgs-certification-bar__title"
					value={ title }
					style={ titleStyle }
				/>
			) }

			{ items.length > 0 && (
				<div className="sgs-certification-bar__badges">
					{ items.map( ( item, i ) => renderBadge( item, i ) ) }
				</div>
			) }
		</div>
	);
}
