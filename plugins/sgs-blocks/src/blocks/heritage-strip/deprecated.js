import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * V3 deprecation: save output before transitionDuration and transitionEasing
 * CSS variables were added to the wrapper style. Attributes already exist in
 * block.json with defaults, so migrate passes attributes unchanged.
 */
const v3 = {
	attributes: {
		layout: { type: 'string', default: 'image-text-image' },
		headline: {
			type: 'string',
			source: 'html',
			selector: '.sgs-heritage-strip__headline',
		},
		body: {
			type: 'string',
			source: 'html',
			selector: '.sgs-heritage-strip__body',
		},
		imageLeft: { type: 'object' },
		imageRight: { type: 'object' },
		headlineColour: { type: 'string' },
		headlineFontSize: { type: 'string' },
		bodyColour: { type: 'string' },
		bodyFontSize: { type: 'string' },
		backgroundColour: { type: 'string' },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
		hoverEffect: { type: 'string', default: 'none' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
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
			headline,
			body,
			imageLeft,
			imageRight,
			headlineColour,
			headlineFontSize,
			bodyColour,
			bodyFontSize,
			hoverBackgroundColour,
			hoverTextColour,
			hoverBorderColour,
			hoverEffect,
		} = attributes;

		const showLeftImage =
			layout === 'image-text-image' || layout === 'image-text';
		const showRightImage =
			layout === 'image-text-image' || layout === 'text-image';

		const className = [
			'sgs-heritage-strip',
			`sgs-heritage-strip--${ layout }`,
			hoverEffect && hoverEffect !== 'none' ? `sgs-heritage-strip--hover-${ hoverEffect }` : '',
		].filter( Boolean ).join( ' ' );

		const wrapperStyle = {
			'--sgs-hover-bg': hoverBackgroundColour ? colourVar( hoverBackgroundColour ) : undefined,
			'--sgs-hover-text': hoverTextColour ? colourVar( hoverTextColour ) : undefined,
			'--sgs-hover-border': hoverBorderColour ? colourVar( hoverBorderColour ) : undefined,
		};

		const blockProps = useBlockProps.save( { className, style: wrapperStyle } );

		const headlineStyle = {
			color: colourVar( headlineColour ) || undefined,
			fontSize: fontSizeVar( headlineFontSize ) || undefined,
		};

		const bodyStyle = {
			color: colourVar( bodyColour ) || undefined,
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
		return {
			...attributes,
			transitionDuration: '300',
			transitionEasing: 'ease-in-out',
		};
	},
};

/**
 * V2 deprecation: save output before hover state attributes were added.
 * The wrapper had no inline style prop from hover vars.
 * Migrate passes attributes unchanged — new hover attrs default to "".
 */
const v2 = {
	attributes: {
		layout: { type: 'string', default: 'image-text-image' },
		headline: {
			type: 'string',
			source: 'html',
			selector: '.sgs-heritage-strip__headline',
		},
		body: {
			type: 'string',
			source: 'html',
			selector: '.sgs-heritage-strip__body',
		},
		imageLeft: { type: 'object' },
		imageRight: { type: 'object' },
		headlineColour: { type: 'string' },
		headlineFontSize: { type: 'string' },
		bodyColour: { type: 'string' },
		bodyFontSize: { type: 'string' },
		backgroundColour: { type: 'string' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
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
			headline,
			body,
			imageLeft,
			imageRight,
			headlineColour,
			headlineFontSize,
			bodyColour,
			bodyFontSize,
		} = attributes;

		const showLeftImage =
			layout === 'image-text-image' || layout === 'image-text';
		const showRightImage =
			layout === 'image-text-image' || layout === 'text-image';

		const className = [
			'sgs-heritage-strip',
			`sgs-heritage-strip--${ layout }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const headlineStyle = {
			color: colourVar( headlineColour ) || undefined,
			fontSize: fontSizeVar( headlineFontSize ) || undefined,
		};

		const bodyStyle = {
			color: colourVar( bodyColour ) || undefined,
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
		return {
			...attributes,
			hoverBackgroundColour: '',
			hoverTextColour: '',
			hoverBorderColour: '',
			hoverEffect: 'none',
		};
	},
};

/**
 * V1 deprecation: block was inserted with empty innerHTML (before static save was
 * implemented). Stored innerHTML is empty — this entry matches that state.
 * WordPress migrates attributes unchanged and writes the current save.js HTML
 * on the next editor save.
 */
const v1 = {
	attributes: {
		layout: { type: 'string', default: 'image-text-image' },
		headline: {
			type: 'string',
			source: 'html',
			selector: '.sgs-heritage-strip__headline',
		},
		body: {
			type: 'string',
			source: 'html',
			selector: '.sgs-heritage-strip__body',
		},
		imageLeft: { type: 'object' },
		imageRight: { type: 'object' },
		headlineColour: { type: 'string' },
		headlineFontSize: { type: 'string' },
		bodyColour: { type: 'string' },
		bodyFontSize: { type: 'string' },
		backgroundColour: { type: 'string' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: {
			radius: true,
			width: true,
			color: true,
			style: true,
		},
	},
	save() {
		return null;
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v3, v2, v1 ];
