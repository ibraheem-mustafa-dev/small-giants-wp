import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  InspectorControls,
  RichText,
} from "@wordpress/block-editor";
import {
  PanelBody,
  TextControl,
  RangeControl,
  ToggleControl,
} from "@wordpress/components";
import { IconPicker, IconPreview, TypographyControls, ResponsiveBoxControl, ResponsiveBorderRadiusControl, SgsColourPanel, SgsBorderControl, resolveColourToken, ResponsiveOverride, BOX_UNITS, normaliseResponsiveBox, SgsBoxControl } from '../../components';
import { colourVar, resolveTextColourPreviewStyle } from "../../utils";


function formatNumber(num, separator) {
  if (separator) {
    return num.toLocaleString("en-GB");
  }
  return String(num);
}

// Box-object interface contract §1: build an editor-preview shorthand from a
// box object — mirrors render.php's box-shorthand builder so the canvas
// preview matches the frontend (contract §5).
function boxShorthand(box, keys) {
  if (!box || "object" !== typeof box) return undefined;
  if (!keys.some((key) => box[key])) return undefined;
  return keys.map((key) => box[key] || "0").join(" ");
}

export default function Edit({ attributes, setAttributes }) {
  const { padding, margin,
    style,
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

  // Base padding/margin/border-radius preview — padding/margin are owned
  // tier-object attrs { desktop, tablet, mobile } (desktop tier is a box,
  // top/right/bottom/left); radius stays WP-native style.border.radius
  // (top-left/top-right/bottom-right/bottom-left).
  const wrapperPreviewStyle = {};
  const paddingPreview = boxShorthand(padding?.desktop, ["top", "right", "bottom", "left"]);
  if (paddingPreview) wrapperPreviewStyle.padding = paddingPreview;
  const marginPreview = boxShorthand(margin?.desktop, ["top", "right", "bottom", "left"]);
  if (marginPreview) wrapperPreviewStyle.margin = marginPreview;
  const radiusPreview = boxShorthand(style?.border?.radius, ["topLeft", "topRight", "bottomRight", "bottomLeft"]);
  if (radiusPreview) wrapperPreviewStyle.borderRadius = radiusPreview;

  const blockProps = useBlockProps({ className, style: wrapperPreviewStyle });

  const numberStyle = resolveTextColourPreviewStyle(numberColour, numberColourGradient, colourVar);

  const labelStyle = resolveTextColourPreviewStyle(labelColour, labelColourGradient, colourVar);

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
          {
            key: "number",
            label: __("Number colour", "sgs-blocks"),
            gradientCapable: true,
            states: [
              {
                key: "normal",
                label: __("Normal", "sgs-blocks"),
                value: numberColour,
                onChange: (val) => setAttributes({ numberColour: val ?? "" }),
                linked: true,
                gradientValue: numberColourGradient,
                onGradientChange: (val) => setAttributes({ numberColourGradient: val ?? "" }),
              },
            ],
          },
          {
            key: "label",
            label: __("Label colour", "sgs-blocks"),
            gradientCapable: true,
            states: [
              {
                key: "normal",
                label: __("Normal", "sgs-blocks"),
                value: labelColour,
                onChange: (val) => setAttributes({ labelColour: val ?? "" }),
                linked: true,
                gradientValue: labelColourGradient,
                onGradientChange: (val) => setAttributes({ labelColourGradient: val ?? "" }),
              },
            ],
          },
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
          <TypographyControls
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

        {/* Border radius — a single block-owned tier-object attr
            { desktop, tablet, mobile }, read directly by render.php. */}
        <PanelBody title={__("Border radius", "sgs-blocks")} initialOpen={false}>
          <ResponsiveBorderRadiusControl
            label={__("Border radius", "sgs-blocks")}
    values={ {
    	base: attributes.borderRadius?.desktop ?? {},
    	tablet: attributes.borderRadius?.tablet ?? {},
    	mobile: attributes.borderRadius?.mobile ?? {},
    } }
    onChange={ ( tier, next ) => {
    	const key = tier === 'base' ? 'desktop' : tier;
    	setAttributes( { borderRadius: { ...attributes.borderRadius, [ key ]: next } } );
    } }
          />
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
