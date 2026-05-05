import { useBlockProps, RichText, InnerBlocks } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Deprecated versions of the SGS CTA Section block.
 *
 * v1 — Static save with full HTML output. Buttons rendered as <a> tags from
 *      the buttons array attribute. No InnerBlocks.
 *
 * v2 — Dynamic save (returns null). Buttons array attribute still present.
 *      render.php built button HTML server-side. No InnerBlocks.
 *      Migrates buttons array to sgs/multi-button + sgs/button InnerBlocks.
 *
 * v3 — Dynamic save (returns null). Buttons are InnerBlocks via
 *      sgs/multi-button. backgroundImage was image-only.
 *
 * v4 (current) — Schema before backgroundMedia was introduced (2026-05-05).
 *      Migrate legacy backgroundImage objects into the unified backgroundMedia
 *      slot so existing posts open without "unexpected content" warnings.
 *      backgroundImage is preserved as a back-compat denormalised fallback.
 */

/**
 * Full attribute snapshot for v1 and v2 (buttons array era).
 */
const BUTTONS_ERA_ATTRIBUTES = {
	headline: { type: 'string', default: '' },
	body: { type: 'string', default: '' },
	buttons: { type: 'array', default: [] },
	ribbon: { type: 'string', default: '' },
	layout: { type: 'string', default: 'centred' },
	backgroundColor: { type: 'string', default: 'accent' },
	textColor: { type: 'string', default: 'text' },
	headlineColour: { type: 'string', default: 'text' },
	bodyColour: { type: 'string', default: 'text' },
	bodyFontSize: { type: 'string' },
	bodyFontSizeTablet: { type: 'string', default: '' },
	bodyFontSizeMobile: { type: 'string', default: '' },
	buttonColour: { type: 'string', default: 'text-inverse' },
	buttonBackground: { type: 'string', default: 'primary-dark' },
	backgroundImage: { type: 'object', default: null },
	backgroundImageOpacity: { type: 'number', default: 30 },
	stats: { type: 'array', default: [] },
	buttonStyle: {
		type: 'string',
		default: 'solid',
		enum: [ 'solid', 'outline', 'ghost', 'gradient' ],
	},
	buttonSize: {
		type: 'string',
		default: 'md',
		enum: [ 'xs', 'sm', 'md', 'lg', 'xl' ],
	},
	buttonBorderColour: { type: 'string' },
	buttonBorderWidth: { type: 'number' },
	buttonBorderRadius: { type: 'number' },
	gradientPreset: { type: 'string', default: '' },
	hoverBackgroundColour: { type: 'string', default: '' },
	hoverTextColour: { type: 'string', default: '' },
	hoverBorderColour: { type: 'string', default: '' },
	transitionDuration: { type: 'string', default: '300' },
	transitionEasing: { type: 'string', default: 'ease-in-out' },
	textAlignMobile: { type: 'string', default: '' },
	textAlignTablet: { type: 'string', default: '' },
	textAlignDesktop: { type: 'string', default: '' },
};

/**
 * Build InnerBlocks structure from the legacy buttons array.
 *
 * @param {Array} buttons Legacy buttons array from block attributes.
 * @return {Array} Array of [ blockName, blockAttrs, innerBlocks ] tuples.
 */
function buildInnerBlocksFromButtons( buttons ) {
	if ( ! buttons || ! buttons.length ) {
		return [];
	}

	const buttonBlocks = buttons
		.filter( ( btn ) => btn.text )
		.map( ( btn, index ) => [
			'sgs/button',
			{
				inheritStyle: index === 0 ? 'primary' : 'secondary',
				label: btn.text || '',
				url: btn.url || '',
				linkTarget: '_self',
			},
			[],
		] );

	if ( ! buttonBlocks.length ) {
		return [];
	}

	return [ [ 'sgs/multi-button', {}, buttonBlocks ] ];
}

/**
 * v2 — Dynamic save (returns null). render.php built button HTML from
 * the buttons array attribute. Migrates to InnerBlocks composition.
 */
const v2 = {
	attributes: BUTTONS_ERA_ATTRIBUTES,
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true },
		typography: {
			fontSize: true,
			lineHeight: true,
			textAlign: true,
			letterSpacing: true,
			textTransform: true,
			fontWeight: true,
			fontStyle: true,
		},
		spacing: { margin: true, padding: true },
		shadow: true,
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
		const {
			buttons,
			buttonColour,
			buttonBackground,
			buttonStyle,
			buttonSize,
			buttonBorderColour,
			buttonBorderWidth,
			buttonBorderRadius,
			...newAttributes
		} = attributes;

		return [
			newAttributes,
			buildInnerBlocksFromButtons( buttons ),
		];
	},
};

/**
 * v1 — Static save with full HTML output. Earliest version of the block.
 * headline/body stored as source:html, buttons rendered as <a> tags.
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
		const {
			buttons,
			buttonColour,
			buttonBackground,
			...newAttributes
		} = attributes;

		return [
			newAttributes,
			buildInnerBlocksFromButtons( buttons ),
		];
	},
};

/**
 * v3 — Pre-backgroundMedia schema. Same attributes as the current block but
 * without the unified backgroundMedia slot. Save still returns null (dynamic
 * render via render.php). Migrates a legacy backgroundImage object into the
 * new backgroundMedia slot when present.
 */
const V3_ATTRIBUTES = {
	headline: { type: 'string', default: '' },
	body: { type: 'string', default: '' },
	buttons: { type: 'array', default: [] },
	ribbon: { type: 'string', default: '' },
	layout: { type: 'string', default: 'centred' },
	backgroundColor: { type: 'string', default: 'accent' },
	textColor: { type: 'string', default: 'text' },
	headlineColour: { type: 'string', default: 'text' },
	bodyColour: { type: 'string', default: 'text' },
	bodyFontSize: { type: 'string' },
	bodyFontSizeTablet: { type: 'string', default: '' },
	bodyFontSizeMobile: { type: 'string', default: '' },
	buttonColour: { type: 'string', default: 'text-inverse' },
	buttonBackground: { type: 'string', default: 'primary-dark' },
	backgroundImage: { type: 'object', default: null },
	backgroundImageOpacity: { type: 'number', default: 30 },
	stats: { type: 'array', default: [] },
	buttonStyle: {
		type: 'string',
		default: 'solid',
		enum: [ 'solid', 'outline', 'ghost', 'gradient' ],
	},
	buttonSize: {
		type: 'string',
		default: 'md',
		enum: [ 'xs', 'sm', 'md', 'lg', 'xl' ],
	},
	buttonBorderColour: { type: 'string' },
	buttonBorderWidth: { type: 'number' },
	buttonBorderRadius: { type: 'number' },
	gradientPreset: { type: 'string', default: '' },
	hoverBackgroundColour: { type: 'string', default: '' },
	hoverTextColour: { type: 'string', default: '' },
	hoverBorderColour: { type: 'string', default: '' },
	transitionDuration: { type: 'string', default: '300' },
	transitionEasing: { type: 'string', default: 'ease-in-out' },
	textAlignMobile: { type: 'string', default: '' },
	textAlignTablet: { type: 'string', default: '' },
	textAlignDesktop: { type: 'string', default: '' },
};

const v3 = {
	attributes: V3_ATTRIBUTES,
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: true, text: true, gradients: true },
		typography: {
			fontSize: true,
			lineHeight: true,
			textAlign: true,
			letterSpacing: true,
			textTransform: true,
			fontWeight: true,
			fontStyle: true,
		},
		spacing: { margin: true, padding: true },
		shadow: true,
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
	isEligible( attributes ) {
		// Only run when a legacy backgroundImage exists and backgroundMedia
		// has not yet been populated — prevents re-running on already-migrated
		// posts.
		return !! (
			attributes &&
			attributes.backgroundImage &&
			attributes.backgroundImage.url &&
			! attributes.backgroundMedia
		);
	},
	migrate( attributes ) {
		const next = { ...attributes };
		if (
			attributes.backgroundImage &&
			attributes.backgroundImage.url &&
			! attributes.backgroundMedia
		) {
			next.backgroundMedia = {
				url: attributes.backgroundImage.url,
				type: 'image',
				id: attributes.backgroundImage.id || 0,
				alt: attributes.backgroundImage.alt || '',
				mime: 'image/jpeg',
			};
		}
		return next;
	},
};

export default [ v3, v2, v1 ];
