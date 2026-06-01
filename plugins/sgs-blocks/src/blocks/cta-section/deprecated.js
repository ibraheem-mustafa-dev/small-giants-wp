import { useBlockProps, RichText, InnerBlocks } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Deprecated versions of the SGS CTA Section block.
 *
 * Newest first — WordPress walks this array stopping at the first version whose
 * save() output validates against the stored post_content.
 *
 * v5 (FR-22-6 migration, 2026-06-01) — full content column → InnerBlocks.
 *      Previous shape: scalar headline/body drove render.php; only the
 *      sgs/multi-button subtree was serialised as InnerBlocks. save() was
 *      <InnerBlocks.Content /> so post_content held only the button subtree.
 *      migrate() converts scalar headline/body into child sgs/heading +
 *      sgs/text blocks, PREPENDED to the existing button InnerBlocks.
 *      R-22-14: no legacy scalar fallback in the new render.php.
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
 *      Schema before backgroundMedia was introduced (2026-05-05).
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
 * Build content child blocks (heading + body text) from the scalar headline/body
 * attributes for the FR-22-6 migration. These are PREPENDED to the existing
 * button InnerBlocks so the migrated block renders heading → body → buttons.
 *
 * @param {string} headline Old scalar headline string.
 * @param {string} body     Old scalar body string.
 * @return {Array} Array of [ blockName, blockAttrs, innerBlocks ] tuples.
 */
function buildContentBlocksFromScalars( headline, body ) {
	const contentBlocks = [];

	if ( headline ) {
		contentBlocks.push( [
			'sgs/heading',
			{
				level: 'h2',
				className: 'sgs-cta-section__headline',
				content: headline,
			},
			[],
		] );
	}

	if ( body ) {
		contentBlocks.push( [
			'sgs/text',
			{
				className: 'sgs-cta-section__body',
				text: body,
			},
			[],
		] );
	}

	return contentBlocks;
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

		return [ newAttributes, buildInnerBlocksFromButtons( buttons ) ];
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
									className={ `sgs-cta-section__btn sgs-cta-section__btn--${
										btn.style || 'accent'
									}` }
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
		const { buttons, buttonColour, buttonBackground, ...newAttributes } =
			attributes;

		return [ newAttributes, buildInnerBlocksFromButtons( buttons ) ];
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

// ---------------------------------------------------------------------------
// v5 — FR-22-6 migration (2026-06-01): scalar headline/body → InnerBlocks
// ---------------------------------------------------------------------------

/**
 * Attribute snapshot immediately before the FR-22-6 migration. Identical to the
 * current block.json (headline/body are retained there for this back-compat
 * entry). Scalar headline/body are read by migrate() to build child blocks;
 * they are no longer read by render.php (R-22-14).
 */
const V5_ATTRIBUTES = {
	headline: { type: 'string', default: '', role: 'content' },
	body: { type: 'string', default: '', role: 'content' },
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
	backgroundMedia: { type: 'object', default: null },
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

const v5 = {
	attributes: V5_ATTRIBUTES,
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
		// Pre-migration save was <InnerBlocks.Content /> — the stored
		// post_content only contained the sgs/multi-button subtree. WordPress
		// validates that stored content against this save() output and passes.
		return <InnerBlocks.Content />;
	},

	isEligible( attributes, innerBlocks ) {
		// Only run when scalar headline/body content exists that has not yet
		// been lifted into InnerBlocks. If the inner blocks already contain a
		// heading/text child, the block is already migrated — skip.
		if ( ! attributes ) {
			return false;
		}
		const hasScalarContent = !! ( attributes.headline || attributes.body );
		const alreadyHasContentChild = !! (
			innerBlocks &&
			innerBlocks.some(
				( b ) =>
					b && ( b.name === 'sgs/heading' || b.name === 'sgs/text' )
			)
		);
		return hasScalarContent && ! alreadyHasContentChild;
	},

	/**
	 * Convert scalar headline/body to child InnerBlocks.
	 *
	 * @param {Object} attributes  - Old scalar attributes.
	 * @param {Array}  innerBlocks - Existing serialised inner blocks
	 *                             (the sgs/multi-button subtree, may be empty).
	 * @return {[Object, Array]} Tuple of [newAttributes, newInnerBlocks].
	 */
	migrate( attributes, innerBlocks ) {
		const { headline, body, ...rest } = attributes;

		const contentBlocks = buildContentBlocksFromScalars( headline, body );

		// Prepend content (heading + body) before the existing button subtree.
		const newInnerBlocks = [ ...contentBlocks, ...( innerBlocks || [] ) ];

		// Retain scalar headline/body on the migrated block for deprecation-chain
		// safety — they are no longer read by render.php (R-22-14) but must
		// survive subsequent round-trips through the deprecation chain.
		const newAttributes = {
			...rest,
			headline,
			body,
		};

		return [ newAttributes, newInnerBlocks ];
	},
};

// Newest first.
export default [ v5, v3, v2, v1 ];
