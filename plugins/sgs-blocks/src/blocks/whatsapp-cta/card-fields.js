/**
 * SGS WhatsApp CTA — "card" variant editor fields.
 *
 * Extracted out of edit.js to keep that file under the 250-line JS budget
 * (Spec 32 / CLAUDE.md file-length rule) while still giving the card variant
 * a full editable title + sub-line (RichText, matching the block's existing
 * `label` RichText pattern) with its own colour + typography controls.
 *
 * Draft precedent (e.g. the "Need advice?" /
 * "Message me on WhatsApp — I'm an optician…" card): icon badge + two-line
 * text block, linking to the same wa.me URL as every other variant.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { RichText } from '@wordpress/block-editor';
import { PanelBody } from '@wordpress/components';
import TypographyControls from '../../components/TypographyControls';
import { SgsBorderControl } from '../../components';
import textRow from '../../components/colour-variants/textRow';
import { typographyPreviewStyle, usePreviewTier, textPaintPreview } from '../../utils';
import WhatsappIcon from './icon';

// Same allow-list as render.php's card-text wrap custom property.
const cardTextWrapAllowed = [ 'wrap', 'nowrap', 'balance', 'pretty', 'stable' ];

/**
 * Canvas content switcher for the block root's children — card / floating /
 * inline / banner each render a different icon+text shape inside the SAME
 * single-element root (contract §B3, no wrapper div). Extracted here (rather
 * than left inline in edit.js) purely for the file-length budget.
 */
export function VariantContent( { attributes, setAttributes } ) {
	const { variant, label } = attributes;
	const previewTier = usePreviewTier();
	const labelStyle = typographyPreviewStyle( attributes, 'label', previewTier );

	if ( 'card' === variant ) {
		return <CardFields attributes={ attributes } setAttributes={ setAttributes } />;
	}

	if ( 'floating' === variant ) {
		return (
			<>
				<WhatsappIcon size={ attributes.iconSize } />
				{ label ? (
					<span className="sgs-whatsapp-cta__label sgs-whatsapp-cta__label--floating" style={ labelStyle }>
						{ label }
					</span>
				) : (
					<span className="sgs-whatsapp-cta__label sgs-sr-only" style={ labelStyle }>
						{ __( 'Chat on WhatsApp', 'sgs-blocks' ) }
					</span>
				) }
			</>
		);
	}

	return (
		<>
			<WhatsappIcon size={ attributes.iconSize } />
			<RichText
				tagName="span"
				className="sgs-whatsapp-cta__label"
				style={ labelStyle }
				value={ label }
				onChange={ ( val ) => setAttributes( { label: val } ) }
				placeholder={ __( 'Chat on WhatsApp', 'sgs-blocks' ) }
			/>
		</>
	);
}

/**
 * Canvas markup for the card variant — icon badge + editable title/sub-line.
 * Rendered INSIDE the block root (the single <a>, per contract §B3), never
 * as a wrapping div of its own.
 */
export function CardFields( { attributes, setAttributes } ) {
	const { cardTitle, cardSubline } = attributes;
	const previewTier = usePreviewTier();
	const titleStyle = {
		...typographyPreviewStyle( attributes, 'cardTitle', previewTier ),
		...textPaintPreview( attributes.cardTitleColour, '' ),
	};
	const sublineStyle = {
		...typographyPreviewStyle( attributes, 'cardSubline', previewTier ),
		...textPaintPreview( attributes.cardSublineColour, '' ),
	};

	return (
		<>
			<span className="sgs-whatsapp-cta__icon-badge">
				<WhatsappIcon size={ attributes.iconSize } />
			</span>
			<span
				className="sgs-whatsapp-cta__card-text"
				style={ cardTextWrapAllowed.includes( attributes.labelTextWrap )
					? { '--sgs-whatsapp-cta-card-text-wrap': attributes.labelTextWrap }
					: undefined }
			>
				<RichText
					tagName="span"
					className="sgs-whatsapp-cta__card-title"
					style={ titleStyle }
					value={ cardTitle }
					onChange={ ( val ) => setAttributes( { cardTitle: val } ) }
					placeholder={ __( 'Questions? Chat to an optician', 'sgs-blocks' ) }
				/>
				<RichText
					tagName="span"
					className="sgs-whatsapp-cta__card-subline"
					style={ sublineStyle }
					value={ cardSubline }
					onChange={ ( val ) => setAttributes( { cardSubline: val } ) }
					placeholder={ __( 'We reply within the hour', 'sgs-blocks' ) }
				/>
			</span>
		</>
	);
}

/**
 * Colour rows for the card title + sub-line — spread into the block's shared
 * <SgsColourPanel rows={ [...] } /> only when variant === 'card'.
 *
 * Border colour is NOT a row here (Spec 35 §14 / C1): a border colour always
 * lives in `SgsBorderControl`, never in `SgsColourPanel` — see
 * `CardBorderRow` below, mounted in the card's own element panel instead.
 */
export function cardColourRows( { attributes, setAttributes } ) {
	return [
		textRow( {
			key: 'cardTitle',
			label: __( 'Card title colour', 'sgs-blocks' ),
			attrs: { base: 'cardTitleColour' },
			attributes,
			setAttributes,
		} ),
		textRow( {
			key: 'cardSubline',
			label: __( 'Card sub-line colour', 'sgs-blocks' ),
			attrs: { base: 'cardSublineColour' },
			attributes,
			setAttributes,
		} ),
	];
}

/**
 * Inspector panel: card title/sub-line typography + the card's border pair
 * (Spec 35 §14 — width as a box object + colour + style, radius left to the
 * block's own existing borderRadius control, shared across every variant,
 * so this does not mount a second radius control).
 */
export function CardTypographyPanel( { attributes, setAttributes } ) {
	const { cardBorderWidth, cardBorderColour, cardBorderStyle } = attributes;

	return (
		<PanelBody title={ __( 'Card typography', 'sgs-blocks' ) } initialOpen={ false }>
			<TypographyControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="cardTitle"
				fontSizePresets
			/>
			<TypographyControls
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix="cardSubline"
				fontSizePresets
			/>
			<SgsBorderControl
				label={ __( 'Card border', 'sgs-blocks' ) }
				widthValues={ cardBorderWidth }
				onWidthChange={ ( next ) => setAttributes( { cardBorderWidth: next } ) }
				styleValue={ cardBorderStyle }
				onStyleChange={ ( next ) => setAttributes( { cardBorderStyle: next } ) }
				colourValue={ cardBorderColour }
				onColourChange={ ( next ) => setAttributes( { cardBorderColour: next } ) }
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourLinked
				contrastAgainst={
					attributes.backgroundColour && ! attributes.backgroundColourGradient
						? attributes.backgroundColour
						: ''
				}
			/>
		</PanelBody>
	);
}
