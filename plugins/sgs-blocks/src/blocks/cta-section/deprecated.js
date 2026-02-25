import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * V1 deprecation: static save with full HTML output.
 *
 * Migrates to dynamic render (save returns null) — render.php
 * now handles all frontend output. Attributes are preserved
 * in the block comment delimiter JSON.
 */
const v1 = {
	attributes: {
		headline: {
			type: 'string',
			source: 'html',
			selector: '.sgs-cta-section__headline',
		},
		body: {
			type: 'string',
			source: 'html',
			selector: '.sgs-cta-section__body',
		},
		buttons: { type: 'array', default: [] },
		layout: { type: 'string', default: 'centred' },
		headlineColour: { type: 'string' },
		bodyColour: { type: 'string' },
		bodyFontSize: { type: 'string' },
		buttonColour: { type: 'string' },
		buttonBackground: { type: 'string' },
		backgroundImage: { type: 'object', default: null },
		backgroundImageOpacity: { type: 'number', default: 30 },
		stats: { type: 'array', default: [] },
		hoverBackgroundColour: { type: 'string', default: '' },
		hoverTextColour: { type: 'string', default: '' },
		hoverBorderColour: { type: 'string', default: '' },
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
			headline,
			body,
			buttons,
			layout,
			headlineColour,
			bodyColour,
			bodyFontSize,
			buttonColour,
			buttonBackground,
		} = attributes;

		const className = [
			'sgs-cta-section',
			`sgs-cta-section--${ layout }`,
		].join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const headlineStyle = {
			color: colourVar( headlineColour ) || undefined,
		};

		const bodyStyle = {
			color: colourVar( bodyColour ) || undefined,
			fontSize: fontSizeVar( bodyFontSize ) || undefined,
		};

		const btnStyle = {
			color: colourVar( buttonColour ) || undefined,
			backgroundColor: colourVar( buttonBackground ) || undefined,
		};

		return (
			<section { ...blockProps }>
				<div className="sgs-cta-section__content">
					<RichText.Content
						tagName="h2"
						className="sgs-cta-section__headline"
						value={ headline }
						style={ headlineStyle }
					/>
					<RichText.Content
						tagName="p"
						className="sgs-cta-section__body"
						value={ body }
						style={ bodyStyle }
					/>
				</div>
				{ buttons.length > 0 && (
					<div className="sgs-cta-section__buttons">
						{ buttons.map( ( btn, index ) =>
							btn.text ? (
								<a
									key={ index }
									href={ btn.url || '#' }
									className={ `sgs-cta-section__btn sgs-cta-section__btn--${ btn.style || 'accent' }` }
									style={ btnStyle }
								>
									{ btn.text }
								</a>
							) : null
						) }
					</div>
				) }
			</section>
		);
	},
	migrate( attributes ) {
		return attributes;
	},
};

export default [ v1 ];
