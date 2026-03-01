/**
 * Heritage Strip block — deprecations.
 *
 * v2: Captures the static save output before the block was converted to
 *     server-side rendering via render.php (which uses sgs_responsive_image()).
 * v1: Pre-static-save era — block inserted with empty innerHTML.
 */
import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

// v2 — static save function that existed before render.php conversion.
const v2 = {
	attributes: {
		layout:           { type: 'string', default: 'image-text-image' },
		headline:         { type: 'string', source: 'html', selector: '.sgs-heritage-strip__headline' },
		body:             { type: 'string', source: 'html', selector: '.sgs-heritage-strip__body' },
		imageLeft:        { type: 'object' },
		imageRight:       { type: 'object' },
		headlineColour:   { type: 'string' },
		headlineFontSize: { type: 'string' },
		bodyColour:       { type: 'string' },
		bodyFontSize:     { type: 'string' },
		backgroundColour: { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
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
			layout,
			headline,
			body,
			imageLeft,
			imageRight,
			headlineColour,
			headlineFontSize,
			bodyColour,
			bodyFontSize,
		} = attributes;

		const showLeftImage  = layout === 'image-text-image' || layout === 'image-text';
		const showRightImage = layout === 'image-text-image' || layout === 'text-image';

		const className = [
			'sgs-heritage-strip',
			`sgs-heritage-strip--${ layout }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const headlineStyle = {
			color:    colourVar( headlineColour ) || undefined,
			fontSize: fontSizeVar( headlineFontSize ) || undefined,
		};

		const bodyStyle = {
			color:    colourVar( bodyColour ) || undefined,
			fontSize: fontSizeVar( bodyFontSize ) || undefined,
		};

		return (
			<section { ...blockProps }>
				{ showLeftImage && imageLeft?.url && (
					<div className="sgs-heritage-strip__image sgs-heritage-strip__image--left">
						<img
							src={ imageLeft.url }
							alt={ imageLeft.alt || '' }
							className="sgs-heritage-strip__img"
							loading="lazy"
						/>
					</div>
				) }
				<div className="sgs-heritage-strip__content">
					<RichText.Content
						tagName="h2"
						className="sgs-heritage-strip__headline"
						value={ headline }
						style={ headlineStyle }
					/>
					<RichText.Content
						tagName="div"
						className="sgs-heritage-strip__body"
						value={ body }
						style={ bodyStyle }
					/>
				</div>
				{ showRightImage && imageRight?.url && (
					<div className="sgs-heritage-strip__image sgs-heritage-strip__image--right">
						<img
							src={ imageRight.url }
							alt={ imageRight.alt || '' }
							className="sgs-heritage-strip__img"
							loading="lazy"
						/>
					</div>
				) }
			</section>
		);
	},
	migrate( attributes ) {
		return attributes;
	},
};

// v1 — block inserted with empty innerHTML before static save existed.
const v1 = {
	attributes: {
		layout:           { type: 'string', default: 'image-text-image' },
		headline:         { type: 'string', source: 'html', selector: '.sgs-heritage-strip__headline' },
		body:             { type: 'string', source: 'html', selector: '.sgs-heritage-strip__body' },
		imageLeft:        { type: 'object' },
		imageRight:       { type: 'object' },
		headlineColour:   { type: 'string' },
		headlineFontSize: { type: 'string' },
		bodyColour:       { type: 'string' },
		bodyFontSize:     { type: 'string' },
		backgroundColour: { type: 'string' },
	},
	supports: {
		align:   [ 'wide', 'full' ],
		anchor:  true,
		html:    false,
		color:   { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width:  true,
			color:  true,
			style:  true,
		},
	},
	save() {
		return null;
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v2, v1 ];
