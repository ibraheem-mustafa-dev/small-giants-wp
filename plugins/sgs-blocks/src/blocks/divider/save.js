import { useBlockProps } from '@wordpress/block-editor';
import { colourVar } from '../../utils';

/**
 * Build inline styles for the outer wrapper.
 */
function buildWrapperStyle( attributes ) {
	const { marginTop, marginBottom, marginUnit } = attributes;
	return {
		marginTop: `${ marginTop }${ marginUnit }`,
		marginBottom: `${ marginBottom }${ marginUnit }`,
	};
}

/**
 * Render the variant-specific inner markup.
 * All colour values feed through CSS custom properties so style.css
 * fallbacks apply when no inline style is present.
 */
function renderVariant( attributes ) {
	const { variant, colour, thickness, width, widthUnit, shape, shapeSize, dotCount } = attributes;
	const colourValue = colourVar( colour );

	const sizeStyle = { width: `${ width }${ widthUnit }` };

	if ( 'line' === variant ) {
		return (
			<hr
				className="wp-block-sgs-divider__line"
				style={ {
					...sizeStyle,
					borderTop: `${ thickness }px solid ${ colourValue }`,
					borderBottom: 'none',
					borderLeft: 'none',
					borderRight: 'none',
					margin: 0,
				} }
			/>
		);
	}

	if ( 'dots' === variant ) {
		const dots = Array.from( { length: dotCount } );
		return (
			<div className="wp-block-sgs-divider__dots" style={ sizeStyle }>
				{ dots.map( ( _, i ) => (
					<span
						key={ i }
						className="wp-block-sgs-divider__dot"
						style={ {
							width: `${ shapeSize }px`,
							height: `${ shapeSize }px`,
							backgroundColor: colourValue,
						} }
					/>
				) ) }
			</div>
		);
	}

	if ( 'wave' === variant ) {
		return (
			<div className="wp-block-sgs-divider__wave" style={ sizeStyle }>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 200 20"
					preserveAspectRatio="none"
					aria-hidden="true"
					focusable="false"
				>
					<path
						d="M0,10 C25,0 50,20 75,10 C100,0 125,20 150,10 C175,0 200,20 200,10"
						stroke={ colourValue }
						strokeWidth="2"
						fill="none"
					/>
				</svg>
			</div>
		);
	}

	if ( 'shape' === variant ) {
		const shapeClass = `wp-block-sgs-divider__shape-inner is-${ shape }`;
		return (
			<div className="wp-block-sgs-divider__shape" style={ sizeStyle }>
				<span
					className={ shapeClass }
					style={ {
						width: `${ shapeSize }px`,
						height: `${ shapeSize }px`,
						backgroundColor: colourValue,
					} }
				/>
			</div>
		);
	}

	return null;
}

export default function Save( { attributes } ) {
	const { variant, dividerAlign } = attributes;

	const wrapperClass = [
		'wp-block-sgs-divider',
		`wp-block-sgs-divider--${ variant }`,
		`is-divider-align-${ dividerAlign }`,
	].join( ' ' );

	const blockProps = useBlockProps.save( {
		className: wrapperClass,
		style: buildWrapperStyle( attributes ),
	} );

	return (
		<div { ...blockProps }>
			{ renderVariant( attributes ) }
		</div>
	);
}
