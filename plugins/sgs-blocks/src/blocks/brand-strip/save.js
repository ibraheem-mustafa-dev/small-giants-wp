import { useBlockProps } from '@wordpress/block-editor';

const SPEED_MAP = {
	slow: '40s',
	medium: '25s',
	fast: '15s',
};

export default function Save( { attributes } ) {
	const {
		logos,
		scrolling,
		scrollSpeed,
		greyscale,
		maxHeight,
	} = attributes;

	const visibleLogos = logos.filter( ( logo ) => logo.image?.url );

	if ( ! visibleLogos.length ) {
		return null;
	}

	const className = [
		'sgs-brand-strip',
		greyscale ? 'sgs-brand-strip--greyscale' : '',
		scrolling ? 'sgs-brand-strip--scrolling' : '',
	]
		.filter( Boolean )
		.join( ' ' );

	const blockProps = useBlockProps.save( { className } );

	const trackStyle = {
		'--sgs-logo-max-height': `${ maxHeight }px`,
		'--sgs-scroll-speed': scrolling
			? SPEED_MAP[ scrollSpeed ] || '25s'
			: undefined,
	};

	const renderLogos = visibleLogos.map( ( logo, i ) => {
		const img = (
			<img
				src={ logo.image.url }
				alt={ logo.alt || '' }
				className="sgs-brand-strip__logo"
				loading="lazy"
				style={ { maxHeight: `${ maxHeight }px` } }
			/>
		);

		if ( logo.url ) {
			return (
				<a
					key={ i }
					href={ logo.url }
					className="sgs-brand-strip__item"
					target="_blank"
					rel="noopener noreferrer"
				>
					{ img }
				</a>
			);
		}

		return (
			<div key={ i } className="sgs-brand-strip__item">
				{ img }
			</div>
		);
	} );

	return (
		<div { ...blockProps }>
			<div className="sgs-brand-strip__track" style={ trackStyle }>
				{ renderLogos }
				{ /* Duplicate for seamless infinite scroll */ }
				{ scrolling && renderLogos }
			</div>
		</div>
	);
}
