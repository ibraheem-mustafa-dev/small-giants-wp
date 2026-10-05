import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  InspectorControls,
  RichText,
  useSettings,
} from "@wordpress/block-editor";
import {
  PanelBody,
  TextControl,
  RangeControl,
  ToggleControl,
} from "@wordpress/components";
import { IconPicker, IconPreview, TypographyControls, ResponsiveBoxControl, SgsColourPanel, textRow, SgsBorderControl, resolveColourToken, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { colourVar, resolveTextColourPreviewStyle, typographyPreviewStyle, usePreviewTier, boxPreview } from "../../utils";


function formatNumber(num, separator) {
  if (separator) {
    return num.toLocaleString("en-GB");
  }
  return String(num);
}

export default function Edit({ attributes, setAttributes }) {
  const {
    number,
    prefix,
    suffix,
    label,
    duration,
    separator,
    numberColour,
    numberColourGradient,
    labelColour,
    labelColourGradient,
    icon,
    accentStroke,
  } = attributes;

  const className = [
    "sgs-counter",
    accentStroke ? "sgs-counter--accent-stroke" : "",
  ]
    .filter(Boolean)
    .join(" ");

  // Padding, margin, border and radius at the previewed device tier.
  const previewTier = usePreviewTier();
  const [colourPalette] = useSettings("color.palette");
  const blockProps = useBlockProps({ className, style: boxPreview(attributes, previewTier, colourPalette) });

  const numberStyle = resolveTextColourPreviewStyle(numberColour, numberColourGradient, colourVar);

  const labelStyle = {
    ...typographyPreviewStyle(attributes, "label", previewTier),
    ...resolveTextColourPreviewStyle(labelColour, labelColourGradient, colourVar),
  };

  return (
    <>
      { /* D619 — ONE grouped, SGS-OWNED colour panel, rendered FIRST so it
         sits at the top of the inspector. Replaces the inline
         `DesignTokenPicker` rows that used to sit in the "Text Styling"
         panel below. `supports.color` sub-flags are now false so
         WordPress generates no native colour UI to overlap with this
         panel. No hover pair exists for either attribute on this block. */ }
      <SgsColourPanel
        rows={ [
          textRow({
            key: "number",
            label: __("Number colour", "sgs-blocks"),
            attrs: {
              base: "numberColour",
              hover: "numberColourHover",
              gradient: "numberColourGradient",
              hoverGradient: "numberColourHoverGradient",
            },
            attributes,
            setAttributes,
          }),
          textRow({
            key: "label",
            label: __("Label colour", "sgs-blocks"),
            attrs: {
              base: "labelColour",
              hover: "labelColourHover",
              gradient: "labelColourGradient",
              hoverGradient: "labelColourHoverGradient",
            },
            attributes,
            setAttributes,
          }),
        ] }
      />
      <InspectorControls>
        <PanelBody title={__("Counter Settings", "sgs-blocks")}>
          <TextControl
            label={__("Target number", "sgs-blocks")}
            value={String(number)}
            onChange={(val) => {
              const parsed = parseInt(val, 10);
              setAttributes({
                number: isNaN(parsed) ? 0 : parsed,
              });
            }}
            type="number"
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          <TextControl
            label={__("Prefix", "sgs-blocks")}
            value={prefix}
            onChange={(val) => setAttributes({ prefix: val })}
            placeholder={__("e.g. £", "sgs-blocks")}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          <TextControl
            label={__("Suffix", "sgs-blocks")}
            value={suffix}
            onChange={(val) => setAttributes({ suffix: val })}
            placeholder={__("e.g. +, %, M", "sgs-blocks")}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          <ToggleControl
            label={__("Thousand separator", "sgs-blocks")}
            checked={separator}
            onChange={(val) => setAttributes({ separator: val })}
            __nextHasNoMarginBottom
          />
          <RangeControl
            label={__("Animation duration (ms)", "sgs-blocks")}
            value={duration}
            onChange={(val) => setAttributes({ duration: val })}
            min={500}
            max={5000}
            step={100}
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
        </PanelBody>

        <PanelBody title={__("Icon", "sgs-blocks")} initialOpen={false}>
          <IconPicker
            label={__("Icon", "sgs-blocks")}
            value={ icon ? { source: "lucide", name: icon } : null }
            onChange={ ( val ) => setAttributes({ icon: val ? val.name : "" }) }
          />
        </PanelBody>

        <PanelBody title={__("Text Styling", "sgs-blocks")} initialOpen={false}>
          <TypographyControls fontSizePresets showFontFamily showDecoration showTransform showLetterSpacing showTextAlign showTextWrap showTextColumns showWritingMode
            attributes={attributes}
            setAttributes={setAttributes}
            prefix="label"
            showLineHeight={true}
          />
        </PanelBody>

        <PanelBody title={__("Decoration", "sgs-blocks")} initialOpen={false}>
          <ToggleControl
            label={__("Accent underline stroke", "sgs-blocks")}
            help={__(
              "Adds a short coloured line beneath the number.",
              "sgs-blocks",
            )}
            checked={accentStroke}
            onChange={(val) => setAttributes({ accentStroke: val })}
            __nextHasNoMarginBottom
          />
        </PanelBody>

        {/* Spacing — padding/margin are each a single block-owned tier-object
            attr { desktop, tablet, mobile }, written via ResponsiveOverride +
            SgsBoxControl; read directly by this block's render.php. */}
        <PanelBody title={__("Spacing", "sgs-blocks")} initialOpen={false}>
          <ResponsiveOverride
          	value={ attributes.padding }
          	onChange={ ( obj ) => setAttributes( { padding: obj } ) }
          >
          	{ ( { ownValue, setOwnValue } ) => (
          		<SgsBoxControl
          			label={ __( 'Padding', 'sgs-blocks' ) }
          			values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
          			units={ BOX_UNITS }
          			presets
          			onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
          		/>
          	) }
          </ResponsiveOverride>
          <ResponsiveOverride
          	value={ attributes.margin }
          	onChange={ ( obj ) => setAttributes( { margin: obj } ) }
          >
          	{ ( { ownValue, setOwnValue } ) => (
          		<SgsBoxControl
          			label={ __( 'Margin', 'sgs-blocks' ) }
          			values={ ownValue && typeof ownValue === 'object' ? ownValue : {} }
          			units={ BOX_UNITS }
          			presets
          			onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
          		/>
          	) }
          </ResponsiveOverride>
        </PanelBody>

				<PanelBody title={ __( 'Border', 'sgs-blocks' ) } initialOpen={ false }>
					<SgsBorderControl
						widthValues={ attributes.borderWidth ?? {} }
						onWidthChange={ ( next ) => setAttributes( { borderWidth: next } ) }
						widthPresets={ [ '10', '20', '30' ] }
						styleValue={ attributes.borderStyle }
						onStyleChange={ ( val ) => setAttributes( { borderStyle: val } ) }
						colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
						colourValue={ attributes.borderColour }
						onColourChange={ ( val ) => setAttributes( { borderColour: val ?? '' } ) }
						colourGradientValue={ attributes.borderColourGradient }
						onColourGradientChange={ ( val ) => setAttributes( { borderColourGradient: val ?? '' } ) }
						colourLinked={ true }
						radiusValues={ {
								base: attributes.borderRadius?.desktop ?? {},
								tablet: attributes.borderRadius?.tablet ?? {},
								mobile: attributes.borderRadius?.mobile ?? {},
							} }
						onRadiusChange={ ( tier, next ) => {
							const key = tier === 'base' ? 'desktop' : tier;
							setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
						} }
					/>
				</PanelBody>
      </InspectorControls>

      <div {...blockProps}>
        { icon && (
          <span className="sgs-counter__icon" aria-hidden="true">
            <IconPreview source="lucide" name={ icon } size={ 24 } />
          </span>
        ) }
        <span className="sgs-counter__number" style={numberStyle}>
          {prefix}
          {formatNumber(number, separator)}
          {suffix}
        </span>
        <RichText
          tagName="p"
          className="sgs-counter__label"
          value={label}
          onChange={(val) => setAttributes({ label: val })}
          placeholder={__("Label text…", "sgs-blocks")}
          style={labelStyle}
        />
      </div>
    </>
  );
}
