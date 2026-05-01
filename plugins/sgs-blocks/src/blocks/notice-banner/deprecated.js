import { useBlockProps, RichText } from '@wordpress/block-editor';
import { colourVar, fontSizeVar } from '../../utils';

/**
 * Notice Banner block deprecations.
 *
 * v2 — pre-Wave-1 structural save (no inline colour on <p>).
 *   Wave 1 added `textColour: "text"` as a default in block.json, causing
 *   save.js to emit `style="color:var(--wp--preset--color--text)"` on the
 *   `<p class="sgs-notice-banner__text">` element. Existing posts have no
 *   inline colour style on that element → validation mismatch.
 *   This entry reproduces the full save output from before that change.
 *   migrate() passes attributes through; textColour picks up its new default.
 *
 * v1 — null-save catch-all.
 *   Blocks recovered by the editor or created via WP-CLI have empty innerHTML.
 *   save: () => null matches any stored innerHTML (including empty string).
 */

/** Lucide-style SVG icons — reproduced from the original save.js. */
const VARIANT_ICONS = {
	info: (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			focusable="false"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<line
				x1="12"
				y1="8"
				x2="12"
				y2="8.01"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
			<line
				x1="12"
				y1="12"
				x2="12"
				y2="16"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	),
	success: (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			focusable="false"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M22 11.08V12a10 10 0 1 1-5.93-9.14"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<polyline
				points="22 4 12 14.01 9 11.01"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
		</svg>
	),
	warning: (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			focusable="false"
			xmlns="http://www.w3.org/2000/svg"
		>
			<path
				d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<line
				x1="12"
				y1="9"
				x2="12"
				y2="13"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<line
				x1="12"
				y1="17"
				x2="12.01"
				y2="17"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
		</svg>
	),
	error: (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			focusable="false"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<line
				x1="15"
				y1="9"
				x2="9"
				y2="15"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
			<line
				x1="9"
				y1="9"
				x2="15"
				y2="15"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	),
	accent: (
		<svg
			width="20"
			height="20"
			viewBox="0 0 24 24"
			fill="none"
			aria-hidden="true"
			focusable="false"
			xmlns="http://www.w3.org/2000/svg"
		>
			<circle
				cx="12"
				cy="12"
				r="10"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<line
				x1="12"
				y1="8"
				x2="12"
				y2="8.01"
				stroke="currentColor"
				strokeWidth="2.5"
				strokeLinecap="round"
			/>
			<line
				x1="12"
				y1="12"
				x2="12"
				y2="16"
				stroke="currentColor"
				strokeWidth="2"
				strokeLinecap="round"
			/>
		</svg>
	),
	none: null,
};

const DISMISS_ICON = (
	<svg
		width="16"
		height="16"
		viewBox="0 0 24 24"
		fill="none"
		aria-hidden="true"
		focusable="false"
		xmlns="http://www.w3.org/2000/svg"
	>
		<line
			x1="18"
			y1="6"
			x2="6"
			y2="18"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		/>
		<line
			x1="6"
			y1="6"
			x2="18"
			y2="18"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
		/>
	</svg>
);

/**
 * v3 — Wave 1 save shape with inline colour on <p>, no link span.
 * Matches posts saved after textColour: "text" default but before
 * linkText/linkUrl attributes were introduced.
 * migrate() passes attributes through; new linkText/linkUrl pick up
 * their block.json defaults ("") automatically.
 */
const v3 = {
	attributes: {
		icon:         { type: 'string', default: 'info' },
		text:         { type: 'string', source: 'html', selector: '.sgs-notice-banner__text' },
		variant:      { type: 'string', default: 'info' },
		textColour:   { type: 'string', default: 'text' },
		textFontSize: { type: 'string' },
		dismissible:  { type: 'boolean', default: false },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: false, text: false },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true, width: true, color: true, style: true },
	},
	save( { attributes } ) {
		const { icon, text, variant, textColour, textFontSize, dismissible } = attributes;

		const className = [
			'sgs-notice-banner',
			`sgs-notice-banner--${ variant }`,
			dismissible ? 'sgs-notice-banner--dismissible' : '',
		]
			.filter( Boolean )
			.join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		const textStyle = {
			color: colourVar( textColour ) || undefined,
			fontSize: fontSizeVar( textFontSize ) || undefined,
		};

		const iconKey = icon === 'none' ? 'none' : variant || icon;
		const iconSvg = VARIANT_ICONS[ iconKey ] || VARIANT_ICONS[ icon ] || null;

		return (
			<div { ...blockProps } role="note">
				{ iconSvg && (
					<span className="sgs-notice-banner__icon">{ iconSvg }</span>
				) }
				<RichText.Content
					tagName="p"
					className="sgs-notice-banner__text"
					value={ text }
					style={ textStyle }
				/>
				{ dismissible && (
					<button
						type="button"
						className="sgs-notice-banner__dismiss"
						aria-label="Dismiss"
					>
						{ DISMISS_ICON }
					</button>
				) }
			</div>
		);
	},
	migrate( attributes ) {
		return { ...attributes, linkText: '', linkUrl: '' };
	},
};

/**
 * v2 — full structural save without inline colour on <p>.
 * Matches posts saved before Wave 1 added textColour: "text" default.
 */
const v2 = {
	attributes: {
		icon:         { type: 'string', default: 'info' },
		text:         { type: 'string', source: 'html', selector: '.sgs-notice-banner__text' },
		variant:      { type: 'string', default: 'info' },
		textColour:   { type: 'string' },
		textFontSize: { type: 'string' },
		dismissible:  { type: 'boolean', default: false },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: false, text: false },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true, width: true, color: true, style: true },
	},
	save( { attributes } ) {
		const { icon, text, variant, textFontSize, dismissible } = attributes;

		const className = [
			'sgs-notice-banner',
			`sgs-notice-banner--${ variant }`,
			dismissible ? 'sgs-notice-banner--dismissible' : '',
		]
			.filter( Boolean )
			.join( ' ' );

		const blockProps = useBlockProps.save( { className } );

		// Old save: no colour style. Only fontSize if explicitly set.
		const textStyle = textFontSize
			? { fontSize: fontSizeVar( textFontSize ) || undefined }
			: undefined;

		const iconKey = icon === 'none' ? 'none' : variant || icon;
		const iconSvg = VARIANT_ICONS[ iconKey ] || VARIANT_ICONS[ icon ] || null;

		return (
			<div { ...blockProps } role="note">
				{ iconSvg && (
					<span className="sgs-notice-banner__icon">{ iconSvg }</span>
				) }
				<RichText.Content
					tagName="p"
					className="sgs-notice-banner__text"
					value={ text }
					style={ textStyle }
				/>
				{ dismissible && (
					<button
						type="button"
						className="sgs-notice-banner__dismiss"
						aria-label="Dismiss"
					>
						{ DISMISS_ICON }
					</button>
				) }
			</div>
		);
	},
	migrate( attributes ) {
		// Pass all attributes through unchanged. textColour picks up its
		// block.json default ("text") automatically for the new save shape.
		// linkText/linkUrl default to empty strings.
		return { ...attributes, linkText: '', linkUrl: '' };
	},
};

/**
 * v1 — null-save catch-all.
 * Blocks with empty innerHTML (WP-CLI created, editor-recovered) match here.
 */
const v1 = {
	attributes: {
		icon:         { type: 'string', default: 'info' },
		text:         { type: 'string', source: 'html', selector: '.sgs-notice-banner__text' },
		variant:      { type: 'string', default: 'info' },
		textColour:   { type: 'string' },
		textFontSize: { type: 'string' },
	},
	supports: {
		align: [ 'wide', 'full' ],
		anchor: true,
		html: false,
		color: { background: false, text: false },
		typography: { fontSize: true, lineHeight: true, textAlign: true },
		spacing: { margin: true, padding: true },
		__experimentalBorder: { radius: true, width: true, color: true, style: true },
	},
	save: () => null,
	migrate: ( attributes ) => ( { ...attributes, linkText: '', linkUrl: '' } ),
};

export default [ v3, v2, v1 ];
