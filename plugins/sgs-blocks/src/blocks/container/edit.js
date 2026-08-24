import { __ } from "@wordpress/i18n";
import {
  useBlockProps,
  useInnerBlocksProps,
  InspectorControls,
  useSettings,
} from "@wordpress/block-editor";
import {
  PanelBody,
  SelectControl,
  TextControl,
  BoxControl,
} from "@wordpress/components";
import { useSelect } from "@wordpress/data";
import { ResponsiveControl, ResponsiveOverride, ResponsiveBoxControl, ShadowControl, SgsColourPanel, BOX_UNITS, normaliseResponsiveBox, resolveColourToken } from "../../components";
import { resolveShadowPreview, resolveResponsiveTier } from "../../utils";
import {
  LayoutPanel,
  WidthPanel,
  BackgroundPanel,
  ShapeDividersPanel,
  GridItemDefaultsPanel,
  MIN_HEIGHT_OPTIONS,
} from "./components/ContainerWrapperControls";

/**
 * Resolve a gap attribute value to a CSS string for editor preview.
 *
 * `gap` is a TIER OBJECT — {desktop,tablet,mobile} in ONE attribute (Spec 35
 * pass 1, 2026-08-10) — so the tier is resolved first, with a blank tier
 * inheriting the one above it. A plain string is still accepted so an
 * un-migrated caller degrades to its old behaviour rather than rendering
 * nothing.
 *
 * Mirrors the FRONTEND emitter (sgs_responsive_format_atom_value):
 *  - Bare number (e.g. "24") → "24px". ⚠ This is a DELIBERATE, Bean-ruled
 *    meaning: a bare number means px everywhere, matching every other
 *    numeric control an operator touches.
 *  - Raw CSS length ("16px", "1.5rem", "clamp(...)") → pass through
 *  - Empty → undefined (so the style key is omitted)
 *
 * ⛔ Keep this in step with the PHP path. If they disagree, the editor lies
 * about what the page will look like — which is the failure this mirror exists
 * to prevent.
 *
 * @param {Object|string} gap  Gap attribute value (tier object, or legacy string).
 * @param {string}        tier Active device tier ('desktop'|'tablet'|'mobile').
 * @returns {string|undefined}
 */
function gapCssValue( gap, tier = 'desktop' ) {
	const raw =
		// resolveResponsiveTier returns { value, inherited } -- NOT a bare string.
		// Without `?.value` this hands React an OBJECT: it survives the `! raw`
		// guard (objects are truthy), String() turns it into "[object Object]"
		// so the numeric-unit branch misses, and React then silently drops the
		// non-string style value. Net effect: the canvas showed NO gap at all
		// while the published page was correct. Line ~321 (minHeight) already
		// does `?.value` -- this was the odd one out.
		gap && typeof gap === 'object' ? resolveResponsiveTier( gap, tier )?.value : gap;

	if ( ! raw ) {
		return undefined;
	}
	// Bare number → px (mirrors the frontend's unit_default).
	if ( /^\d+(\.\d+)?$/.test( String( raw ) ) ) {
		return `${ raw }px`;
	}
	// Raw CSS length — return as-is (already validated by SpacingControl freeInput).
	return raw;
}

// Semantic HTML tag (D344) — ARIA landmarks + sectioning for screen-reader
// landmark navigation (WCAG 2.2) and SEO/document structure. Must match the
// block.json `tagName` enum and the wrapper's allowlist.
const TAG_NAME_OPTIONS = [
  { label: __( "Section (default)", "sgs-blocks" ), value: "section" },
  { label: __( "Div (no semantics)", "sgs-blocks" ), value: "div" },
  { label: __( "Article (self-contained)", "sgs-blocks" ), value: "article" },
  { label: __( "Aside (complementary)", "sgs-blocks" ), value: "aside" },
  { label: __( "Nav (navigation)", "sgs-blocks" ), value: "nav" },
  { label: __( "Header", "sgs-blocks" ), value: "header" },
  { label: __( "Footer", "sgs-blocks" ), value: "footer" },
  { label: __( "Figure", "sgs-blocks" ), value: "figure" },
];

const TEMPLATE_MODE_OPTIONS = [
  { label: __("Free (no restrictions)", "sgs-blocks"), value: "free" },
  { label: __("Grid section", "sgs-blocks"), value: "grid-section" },
  { label: __("Card grid", "sgs-blocks"), value: "card-grid" },
];

/**
 * Editor mirror of `$sgs_resolve_content_width` in class-sgs-container-wrapper.php.
 *
 * Kept token-for-token in step with the PHP: `normal`/`wide` map to the SAME global
 * custom properties the frontend uses, so the canvas band and the rendered band resolve
 * to one number rather than two that merely look alike. `full` and `''` both resolve to
 * NOTHING — they are identical on the frontend (:508-524) and must stay identical here,
 * because "no cap" is what makes `$has_band_props` false and suppresses the band entirely.
 *
 * @param {string} value Raw contentWidth tier value.
 * @return {string} A CSS length, or '' for no cap.
 */
function resolveContentWidthPreview( value ) {
	const v = String( value ?? '' );
	if ( v === 'normal' ) return 'var(--wp--style--global--content-size,1200px)';
	if ( v === 'wide' ) return 'var(--wp--style--global--wide-size,1400px)';
	if ( v === 'full' || v === '' ) return '';
	return v;
}

/**
 * Box-object interface contract §1: build an editor-preview shorthand from a
 * 4-side box object — mirrors the pattern already used across every other
 * block's edit.js (e.g. icon-list/edit.js) and render.php's own hand-built
 * shorthand, so the canvas preview matches the frontend.
 *
 * @param {Object|undefined} box  {top,right,bottom,left}, each an already
 *                                 unit-bearing CSS length string or absent.
 * @return {string|undefined} A 4-value CSS shorthand, or undefined when no
 *                             side is set.
 */
function boxShorthand( box ) {
	if ( ! box || 'object' !== typeof box ) return undefined;
	const keys = [ 'top', 'right', 'bottom', 'left' ];
	if ( ! keys.some( ( key ) => box[ key ] ) ) return undefined;
	return keys.map( ( key ) => box[ key ] || '0' ).join( ' ' );
}

/**
 * padding/margin are NOT tier objects on this block — they are a flat trio of
 * OWNED box attrs (`padding`/`paddingTablet`/`paddingMobile`, each its own
 * {top,right,bottom,left}), the pre-tier-object shape (Spec 35 / D555). The
 * frontend emits the base box through the style engine, then a tablet/mobile
 * `@media` rule for EACH side that tier explicitly sets — an unset side at a
 * narrower tier keeps whatever the wider tier declared (ordinary CSS cascade,
 * both `max-width` queries can be simultaneously true). This mirrors that:
 * merge tablet's declared sides over base, then mobile's over that.
 *
 * @param {Object|undefined} base   Desktop/base box.
 * @param {Object|undefined} tablet Tablet box (only declared sides override).
 * @param {Object|undefined} mobile Mobile box (only declared sides override).
 * @param {string}           tier   Active preview tier.
 * @return {Object} Merged box for the active tier.
 */
function resolveBoxTierPreview( base, tablet, mobile, tier ) {
	const merged = { ...( base && typeof base === 'object' ? base : {} ) };
	if ( tier === 'tablet' || tier === 'mobile' ) {
		const t = tablet && typeof tablet === 'object' ? tablet : {};
		[ 'top', 'right', 'bottom', 'left' ].forEach( ( key ) => {
			if ( t[ key ] ) merged[ key ] = t[ key ];
		} );
	}
	if ( tier === 'mobile' ) {
		const m = mobile && typeof mobile === 'object' ? mobile : {};
		[ 'top', 'right', 'bottom', 'left' ].forEach( ( key ) => {
			if ( m[ key ] ) merged[ key ] = m[ key ];
		} );
	}
	return merged;
}

/**
 * Resolve a flat colour + its sibling gradient to a paintable BACKGROUND
 * preview — mirrors `sgs_background_paint_decl()` (helpers-tokens.php): a
 * valid gradient always wins over the flat colour. The gradient attribute
 * stores a complete, already-valid CSS gradient function (validated server-
 * side by `sgs_css_gradient_value()` on save/render), so the editor preview
 * can use it verbatim — only the FLAT colour can be a design-token slug that
 * needs `resolveColourToken()` against the live palette (D288).
 *
 * @param {string}      colour   Flat colour attribute value (slug or CSS colour).
 * @param {string}      gradient Sibling gradient attribute value.
 * @param {Array}       palette  Active theme colour palette.
 * @return {Object} A partial style object — {} when both inputs are empty.
 */
function backgroundPaintPreview( colour, gradient, palette ) {
	if ( gradient ) {
		return { backgroundImage: gradient };
	}
	const resolved = resolveColourToken( colour, palette );
	return resolved ? { backgroundColor: resolved } : {};
}

/**
 * Same resolution rule as `backgroundPaintPreview()`, but for TEXT colour —
 * mirrors `sgs_text_colour_decl()`: a gradient renders via
 * `background-image` + `background-clip:text` + `color:transparent` (the
 * gradient-text technique), a flat colour renders via `color`.
 *
 * @param {string} colour   Flat colour attribute value (slug or CSS colour).
 * @param {string} gradient Sibling gradient attribute value.
 * @param {Array}  palette  Active theme colour palette.
 * @return {Object} A partial style object — {} when both inputs are empty.
 */
function textPaintPreview( colour, gradient, palette ) {
	if ( gradient ) {
		return {
			backgroundImage: gradient,
			WebkitBackgroundClip: 'text',
			backgroundClip: 'text',
			color: 'transparent',
		};
	}
	const resolved = resolveColourToken( colour, palette );
	return resolved ? { color: resolved } : {};
}

// The same allowlist `sgs_overlay_decls()` (helpers-tokens.php) enforces server-side —
// mirrored here rather than trusted as "any string is harmless in CSS", so the editor
// preview and the frontend refuse the identical out-of-enum set, not just a similar one.
const OVERLAY_BLEND_MODES = [
	'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge',
	'color-burn', 'soft-light', 'hard-light', 'difference', 'exclusion',
];

/**
 * Resolve the container's own overlay LAYER to a paintable canvas preview —
 * mirrors `sgs_overlay_decls()` (helpers-tokens.php) exactly, the single shared
 * owner class-sgs-container-wrapper.php and sgs/hero's `.sgs-hero__overlay`
 * both call server-side (D717/D718: "the EXISTENCE test IS the shared helper's
 * return value" — colour/gradient/opacity/blend-mode are ONE decision, not
 * layered ad hoc). Resting state only (P2-4b scope) — hover and responsive
 * opacity tiers are deferred.
 *
 * @param {string}        colour     backgroundOverlayColour attribute value.
 * @param {string}        gradient   overlayGradient attribute value.
 * @param {number|string} opacity    backgroundOverlayOpacity, 0-100. 100/empty/
 *                                   null emits no opacity override (CSS default).
 * @param {string}        blendMode  backgroundOverlayBlendMode attribute value.
 * @param {Array}         palette    Active theme colour palette.
 * @return {Object} CSS custom properties for the `::after` mirror in
 *                   editor.css, plus a `hasOverlay` flag — {} / false when
 *                   there is nothing to paint, mirroring the PHP helper's `''`.
 */
function overlayPaintPreview( colour, gradient, opacity, blendMode, palette ) {
	const paint = backgroundPaintPreview( colour, gradient, palette );
	if ( ! paint.backgroundImage && ! paint.backgroundColor ) {
		return { hasOverlay: false, vars: {} };
	}
	const vars = {
		'--sgs-ed-overlay-image': paint.backgroundImage || 'none',
		'--sgs-ed-overlay-colour': paint.backgroundColor || 'transparent',
	};
	const numericOpacity = parseFloat( opacity );
	if ( '' !== opacity && null != opacity && ! Number.isNaN( numericOpacity ) ) {
		const pct = Math.max( 0, Math.min( 100, numericOpacity ) );
		if ( 100 !== pct ) {
			vars[ '--sgs-ed-overlay-opacity' ] = pct / 100;
		}
	}
	if ( blendMode && 'normal' !== blendMode && OVERLAY_BLEND_MODES.includes( blendMode ) ) {
		vars[ '--sgs-ed-overlay-blend' ] = blendMode;
	}
	return { hasOverlay: true, vars };
}

export default function Edit({ attributes, setAttributes, name }) {
  const {
    layout,
    gap,
    backgroundImage,
    bgVideo,
    bgKenBurns = false,
    bgAnimationDuration = 20,
    shadow,
    // maxWidth and minHeight are both TIER OBJECTS — read via
    // `attributes.maxWidth`/`attributes.minHeight` below, not destructured
    // bare (a bare destructure was a real live bug for maxWidth's editor
    // preview, fixed below, same class as gridTemplateColumns already
    // resolving via resolveResponsiveTier rather than being used bare).
    gridTemplateColumns = "",
    alignItems,
    justifyItems = "stretch",
    alignContent = "stretch",
    templateMode = "free",
    backgroundColour,
    backgroundColourGradient,
    backgroundColourHover,
    backgroundColourHoverGradient,
    textColour,
    textColourGradient,
    textColourHover,
    textColourHoverGradient,
    bgParallax = false,
    gridAutoRows = "",
    flexDirection = "",
    flexWrap = "wrap",
    justifyContent = "",
    backgroundOverlayColour,
    overlayGradient,
    backgroundOverlayOpacity,
    backgroundOverlayBlendMode,
  } = attributes;

  // D288/D636: colours are stored as theme-token SLUGS or a custom hex, and
  // gradients as a raw CSS gradient string — resolved the same way the
  // button block's editor preview does (resolveColourToken against the live
  // palette), so a preset applied in the inspector actually shows on canvas
  // rather than looking like a no-op.
  const [ colourPalette ] = useSettings( "color.palette" );

  // Active device tier for the preview, read from the SAME source the inspector's
  // global device toggle writes (`core/editor` getDeviceType) — mirrors
  // ResponsiveControl.js:103. Without this the preview would always show desktop
  // while the operator is editing the mobile tier.
  const previewTier = useSelect( ( select ) => {
    const ed = select( "core/editor" );
    const device =
      ed && typeof ed.getDeviceType === "function" ? ed.getDeviceType() : null;
    return { Tablet: "tablet", Mobile: "mobile" }[ device ] || "desktop";
  }, [] );

  // Editor preview: show bg-image if set (video not previewed inline — too complex for editor).
  const hasBgImage = !!backgroundImage?.url;
  const hasBgVideo = !!bgVideo?.url;

  const overlayPreview = overlayPaintPreview(
    backgroundOverlayColour,
    overlayGradient,
    backgroundOverlayOpacity,
    backgroundOverlayBlendMode,
    colourPalette
  );

  const style = {
    gap: gapCssValue( gap, previewTier ),
    minHeight: resolveResponsiveTier( attributes.minHeight, previewTier )?.value || undefined,
    ...(shadow && { boxShadow: resolveShadowPreview( shadow ) }),
    // Media is handed to a ::before layer via custom properties rather than
    // painted on the element, MIRRORING the frontend (Phase 1, 2026-08-08).
    // The editor is the surface clients actually work in, so it has to agree.
    ...(hasBgImage && !hasBgVideo && {
      "--sgs-ed-bg-image": `url(${backgroundImage.url})`,
      "--sgs-ed-bg-size": attributes.backgroundSize || "cover",
      "--sgs-ed-bg-position": attributes.backgroundPosition || "center center",
      "--sgs-ed-bg-repeat": attributes.backgroundRepeat || "no-repeat",
      "--sgs-ed-bg-attachment":
        attributes.backgroundAttachment === "fixed" ? "fixed" : "scroll",
    }),
    ...(hasBgVideo && {
      // Show a teal placeholder in editor when video is set
      backgroundColor: "var(--wp--preset--color--primary, #0F7E80)",
    }),
    ...(bgKenBurns && hasBgImage && {
      "--sgs-ken-burns-duration": `${bgAnimationDuration}s`,
    }),
    // Overlay layer — a ::after mirror in editor.css, same reasoning as the
    // background-image ::before above: painting it on the element itself
    // would dim the client's real content, not just the decorative layer.
    ...overlayPreview.vars,
    // Base (SGS-owned) background paint — the OUTER-most layer, below the
    // media ::before and the overlay span. Text paint is applied AFTER
    // background so it wins the shared `backgroundImage` key exactly as the
    // frontend's decl order does when BOTH a background gradient and a text
    // gradient are set (helpers-tokens.php's $sgs_container_resting_decls:
    // background pushed first, text pushed second — same last-wins result).
    ...backgroundPaintPreview( backgroundColour, backgroundColourGradient, colourPalette ),
    ...textPaintPreview( textColour, textColourGradient, colourPalette ),
  };

  // Responsive padding/margin (Spec 35 / D555) — a flat trio of OWNED box
  // attrs, not a single tier-object attribute (unlike gap/minHeight/maxWidth
  // above), so it resolves via resolveBoxTierPreview() rather than
  // resolveResponsiveTier(). Previously never applied to the canvas at all —
  // the inspector's ResponsiveBoxControl wrote the attrs correctly but
  // nothing here read them back.
  const paddingPreview = boxShorthand(
    resolveBoxTierPreview( attributes.padding, attributes.paddingTablet, attributes.paddingMobile, previewTier )
  );
  if ( paddingPreview ) style.padding = paddingPreview;
  const marginPreview = boxShorthand(
    resolveBoxTierPreview( attributes.margin, attributes.marginTablet, attributes.marginMobile, previewTier )
  );
  if ( marginPreview ) style.margin = marginPreview;

  if (layout === "grid") {
    style.display = "grid";
    // SB-2: use the gridTemplateColumns string attr when set so the editor preview
    // matches render.php output for asymmetric grids (e.g. "5fr 3fr", "60% 40%").
    // gridTemplateColumns is a TIER OBJECT (Spec 35 pass 3a) — calling .trim()
    // on it threw `p?.trim is not a function` and CRASHED the editor canvas.
    // The canvas preview represents the DESKTOP tier, so resolve that tier.
    // ⛔ Found only by opening the editor: no static gate in this repo can see
    // a type error inside an edit component (D567, same class).
    const gtcDesktop = resolveResponsiveTier( gridTemplateColumns, 'desktop' )?.value;
    // columns is also a TIER OBJECT (Spec 35 pass 4) — resolve the desktop
    // tier the same way, or this renders "repeat([object Object], 1fr)" and
    // silently breaks the editor grid preview (same D567 class as above).
    const columnsDesktop = resolveResponsiveTier( attributes.columns, 'desktop' )?.value;
    style.gridTemplateColumns = String( gtcDesktop ?? '' ).trim()
      ? String( gtcDesktop ).trim()
      : `repeat(${ columnsDesktop || 2 }, 1fr)`;
    // gridAutoRows is a plain scalar on this block (not yet tier-capable in
    // its own block.json — see class-sgs-container-wrapper.php's D549 guard),
    // so it previews unconditionally for the grid layout, same as the other
    // QB-1 grid-track properties.
    if ( gridAutoRows ) {
      style.gridAutoRows = gridAutoRows;
    }
    style.alignItems = alignItems;
    if ( justifyItems && justifyItems !== "stretch" ) {
      style.justifyItems = justifyItems;
    }
    if ( alignContent && alignContent !== "stretch" ) {
      style.alignContent = alignContent;
    }
  } else if (layout === "flex") {
    style.display = "flex";
    style.alignItems = alignItems;
    // Mirrors class-sgs-container-wrapper.php's flex branch exactly (~:1315-1331),
    // INCLUDING the column+wrap invariant: per CSS Flexbox L1 9.4 a column-axis
    // container with wrap sizes each line from its items rather than being handed
    // the parent's own cross size, so a child ignores the parent's width. That is
    // true however the value arrived, so it is coerced here too — an operator who
    // picks 'wrap' on a column axis sees the SAME safe behaviour on canvas that
    // they get on the published page, not a canvas that looks fine and then breaks.
    const isColumnAxis = flexDirection.indexOf( "column" ) === 0;
    const effectiveFlexWrap =
      isColumnAxis && ( flexWrap === "wrap" || flexWrap === "wrap-reverse" )
        ? "nowrap"
        : flexWrap;
    if ( "" !== effectiveFlexWrap ) {
      style.flexWrap = effectiveFlexWrap;
    }
    if ( "" !== flexDirection ) {
      style.flexDirection = flexDirection;
    }
    if ( "" !== justifyContent ) {
      style.justifyContent = justifyContent;
    }
  } else if ( layout === "stack" ) {
    // Task 3 — mirror class-sgs-container-wrapper.php's stack branch (~:1341-1371)
    // onto the canvas. Stack is display:flex with the column axis FORCED, never read
    // from flexDirection — that is the whole point of the mode: an operator who set
    // flexDirection:"row" on a previous layout and then picks Stack still gets a
    // column, because Stack answers "which axis" outright rather than depending on a
    // second control staying in sync with it. flexDirection is therefore deliberately
    // never read in this branch, matching the PHP wrapper exactly.
    style.display = "flex";
    style.alignItems = alignItems;
    // Because the axis is ALWAYS column under Stack (never conditional on the
    // flexDirection attr, unlike the flex branch above), the column+wrap invariant
    // from CSS Flexbox L1 9.4 always applies here: a wrapped column-axis container
    // sizes each line from its items rather than being handed the parent's cross
    // size, so a child ignores the parent's width. Coerced unconditionally, same
    // reasoning as the PHP wrapper's stack branch.
    const stackEffectiveFlexWrap =
      flexWrap === "wrap" || flexWrap === "wrap-reverse" ? "nowrap" : flexWrap;
    if ( "" !== stackEffectiveFlexWrap ) {
      style.flexWrap = stackEffectiveFlexWrap;
    }
    style.flexDirection = "column";
    if ( "" !== justifyContent ) {
      style.justifyContent = justifyContent;
    }
  }

  // Editor preview: when a literal maxWidth is set, apply it as inline max-width.
  // Breakout (alignwide / alignfull) is driven by WP-native align attr — no inline style needed.
  // maxWidth is a TIER OBJECT — was destructured and used BARE here (a real live
  // bug: an object handed to `style.maxWidth` renders nothing useful in the
  // editor preview), found and fixed alongside minHeight's own migration.
  const previewMaxWidth = resolveResponsiveTier( attributes.maxWidth, previewTier )?.value;
  if ( previewMaxWidth ) {
    style.maxWidth = previewMaxWidth;
  }

  // ── CONTENT BAND (L2) — the editor rendered ONE layer until 2026-08-21 ─────
  // `edit.js` never emitted `.sgs-container__inner`, while `editor.css:13` styled it:
  // a rule waiting for an element that was never created. So "Content band width" and
  // "Band padding" wrote to something the canvas did not contain — the client changed
  // a setting, nothing moved, and the only way to see the result was to publish.
  //
  // The gate MUST match the wrapper's `$has_band_props` (~:894): a resolved contentWidth
  // OR any band-padding side. Not "is contentWidth set" — `full` resolves to '' and must
  // NOT produce a band, or the canvas would grow a layer the frontend does not have.
  const bandMaxWidth = resolveContentWidthPreview(
    resolveResponsiveTier( attributes.contentWidth, previewTier )?.value
  );
  const bandPadTier = resolveResponsiveTier( attributes.contentBandPadding, previewTier )?.value;
  const bandPad = bandPadTier && typeof bandPadTier === "object" ? bandPadTier : {};
  const hasBandPadding = [ "top", "right", "bottom", "left" ].some( ( side ) => !! bandPad[ side ] );
  const hasBandProps = bandMaxWidth !== "" || hasBandPadding;

  const bandStyle = {};
  if ( bandMaxWidth ) {
    bandStyle.maxWidth = bandMaxWidth;
    bandStyle.marginInline = "auto";
  }
  if ( bandPad.top ) bandStyle.paddingTop = bandPad.top;
  if ( bandPad.right ) bandStyle.paddingRight = bandPad.right;
  if ( bandPad.bottom ) bandStyle.paddingBottom = bandPad.bottom;
  if ( bandPad.left ) bandStyle.paddingLeft = bandPad.left;

  // GRID-ON-INNER. The frontend moves the grid ONTO the band whenever a band exists
  // (`$grid_on_inner`, ~:902) — which is why commit a28a1121 had to delete the
  // `.sgs-cols-*` classes: they addressed the wrapper after the grid had moved. The
  // canvas has to make the same move, or a grid container previews its columns on the
  // full-bleed outer while rendering them on the capped band.
  const gridOnInner = ( layout === "grid" || layout === "flex" || layout === "stack" ) && hasBandProps;
  if ( gridOnInner ) {
    for ( const key of [ "display", "gridTemplateColumns", "gridAutoRows", "gap", "alignItems",
                         "justifyItems", "alignContent", "flexWrap", "flexDirection", "justifyContent" ] ) {
      if ( style[ key ] !== undefined ) {
        bandStyle[ key ] = style[ key ];
        delete style[ key ];
      }
    }
  }

  const className = [
    "sgs-container",
    layout && `sgs-container--${layout}`,
  ]
    .filter(Boolean)
    .join(" ");

  // QB-3: allowedBlocks per templateMode — only restrict when operator explicitly
  // opts into a structured mode. "free" (default) imposes no restrictions.
  const TEMPLATE_MODE_ALLOWED = {
    "grid-section": [
      "sgs/container",
      "sgs/heading",
      "sgs/text",
      "sgs/button",
      "sgs/media",
    ],
    "card-grid": [
      "sgs/info-box",
      "sgs/card-grid",
      "sgs/container",
    ],
  };
  const allowedBlocks = templateMode !== "free"
    ? TEMPLATE_MODE_ALLOWED[templateMode] ?? undefined
    : undefined;

  // Gate the editor's ::before media layer on a class so the pseudo-element
  // exists ONLY on containers that actually have a background image — every
  // other container in the canvas is untouched (mirrors the frontend, where the
  // layer's box properties are only emitted when there is media to paint).
  // bgParallax: mirrors the frontend's `sgs-container--parallax` class
  // (class-sgs-container-wrapper.php ~:1455) — full scroll-driven playback
  // isn't previewed in a static canvas, but the class itself IS what the
  // frontend gates its `background-attachment:fixed` styling on, so applying
  // it here at least shows the state took effect instead of looking silent.
  const editorClassName = [
    className,
    hasBgImage && !hasBgVideo ? "sgs-container--has-bg-media" : "",
    bgParallax ? "sgs-container--parallax" : "",
    overlayPreview.hasOverlay ? "sgs-container--has-overlay" : "",
  ]
    .filter( Boolean )
    .join( " " );

  const blockProps = useBlockProps({ className: editorClassName, style });
  // The children belong to the BAND when one renders, and to the root when one does not.
  // useInnerBlocksProps is called exactly once either way — branching the ARGUMENT, never
  // the hook, so this cannot trip the rules of hooks.
  const innerBlocksProps = useInnerBlocksProps(
    hasBandProps ? { className: "sgs-container__inner", style: bandStyle } : blockProps,
    {
      orientation: layout === "stack" ? "vertical" : undefined,
      allowedBlocks,
    }
  );

  return (
    <>
      {/* Background (image/video/svg tabs + ken-burns/parallax) — the STYLES
          tab, not Settings. A background image/video/overlay is appearance, so
          it belongs beside colour, which D621/D622 already placed in Styles.
          Standardised 2026-08-16 (Bean-ruled): this panel previously rendered
          in Settings on container/site-header/site-footer/physics-canvas and in
          Styles on cta-section/hero — the same panel in two different tabs
          depending on which block the client had selected. */}
      <InspectorControls group="styles">
        {/* Base background colour — the OUTER-most paint layer, BELOW the
            background image/video/SVG (::before), the overlay colour/gradient
            (backgroundOverlayColour/overlayGradient, painted on the
            .sgs-container__overlay span) and content. Deliberately a
            SEPARATE attribute + control from the overlay pair below — the
            overlay tints/covers media, this paints when there is none.
            Mirrors sgs/site-header's SgsColourPanel pattern (D294/D684):
            its own panel, not nested inside BackgroundPanel's PanelBody. */}
        <SgsColourPanel
          rows={ [
            {
              key: 'background',
              label: __( 'Background colour', 'sgs-blocks' ),
              states: [
                {
                  key: 'normal',
                  label: __( 'Normal', 'sgs-blocks' ),
                  value: backgroundColour,
                  onChange: ( val ) => setAttributes( { backgroundColour: val ?? '' } ),
                  linked: true,
                  gradientValue: backgroundColourGradient,
                  onGradientChange: ( val ) =>
                    setAttributes( { backgroundColourGradient: val ?? '' } ),
                },
                {
                  key: 'hover',
                  label: __( 'Hover', 'sgs-blocks' ),
                  value: backgroundColourHover,
                  onChange: ( val ) => setAttributes( { backgroundColourHover: val ?? '' } ),
                  gradientValue: backgroundColourHoverGradient,
                  onGradientChange: ( val ) =>
                    setAttributes( { backgroundColourHoverGradient: val ?? '' } ),
                },
              ],
            },
            {
              /* Root TEXT colour. A section-KIND block can parent any non-section
                 block without a forced parent, so this is the INHERITABLE cascade
                 default for whatever the client nests inside — NOT a duplicate of a
                 child's own text control (Bean's ruling, 2026-08-21). It replaces a
                 DEAD binding: the wrapper manifest mapped css:color to
                 `native:color.text` while supports.color is false on this block, so
                 there was no reachable text control at all. */
              key: 'text',
              label: __( 'Text colour', 'sgs-blocks' ),
              gradientCapable: true,
              states: [
                {
                  key: 'normal',
                  label: __( 'Normal', 'sgs-blocks' ),
                  value: textColour,
                  onChange: ( val ) => setAttributes( { textColour: val ?? '' } ),
                  linked: true,
                  gradientValue: textColourGradient,
                  onGradientChange: ( val ) =>
                    setAttributes( { textColourGradient: val ?? '' } ),
                },
                {
                  key: 'hover',
                  label: __( 'Hover', 'sgs-blocks' ),
                  value: textColourHover,
                  onChange: ( val ) => setAttributes( { textColourHover: val ?? '' } ),
                  gradientValue: textColourHoverGradient,
                  onGradientChange: ( val ) =>
                    setAttributes( { textColourHoverGradient: val ?? '' } ),
                },
              ],
            },
          ] }
        />
        <BackgroundPanel attributes={ attributes } setAttributes={ setAttributes } name={ name } />
      </InspectorControls>

      <InspectorControls>

        {/* Layout panel — shared LayoutPanel + WidthPanel + container-specific controls
            (HTML tag, min-height ×3). Kept as a single "Layout" PanelBody to preserve
            the pre-refactor inspector order and label for container users. */}
        <PanelBody title={ __( "Layout", "sgs-blocks" ) }>
          <SelectControl
            label={ __( "HTML tag", "sgs-blocks" ) }
            value={ attributes.tagName || "section" }
            options={ TAG_NAME_OPTIONS }
            onChange={ ( val ) => setAttributes( { tagName: val } ) }
            help={ __( "Semantic tag for accessibility landmarks and SEO. Use Nav / Aside / Article for their meaning; Div for a plain wrapper.", "sgs-blocks" ) }
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
          { [ 'nav', 'aside' ].includes( attributes.tagName ) && (
            <TextControl
              label={ __( "Landmark label", "sgs-blocks" ) }
              value={ attributes.ariaLabel || "" }
              onChange={ ( val ) => setAttributes( { ariaLabel: val } ) }
              help={ __( "Required when a page has more than one Nav or Aside — lets screen readers tell them apart (e.g. \"Primary\", \"Footer links\", \"Related articles\").", "sgs-blocks" ) }
              __nextHasNoMarginBottom
              __next40pxDefaultSize
            />
          ) }
          <hr style={ { margin: "16px 0" } } />
          <LayoutPanel
            attributes={ attributes }
            setAttributes={ setAttributes }
            enableIntrinsicColumns
          />
          <hr style={ { margin: "16px 0" } } />
          <WidthPanel attributes={ attributes } setAttributes={ setAttributes } />
          { /* `minHeight` is a TIER OBJECT — {desktop,tablet,mobile} — so it uses
               ResponsiveOverride. */ }
          <ResponsiveOverride
            label={ __( "Min height", "sgs-blocks" ) }
            value={ attributes.minHeight }
            onChange={ ( obj ) => setAttributes( { minHeight: obj } ) }
          >
            { ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
              <SelectControl
                value={ ownValue || "" }
                options={ MIN_HEIGHT_OPTIONS }
                onChange={ ( val ) => setOwnValue( val || undefined ) }
                help={ ! inherited
                  ? __( "Desktop / base. Tablet and mobile override it at narrower widths.", "sgs-blocks" )
                  : __( "Leave empty to use the tier above.", "sgs-blocks" ) }
                __nextHasNoMarginBottom
              	__next40pxDefaultSize
              />
            ) }
          </ResponsiveOverride>
        </PanelBody>

        {/* Responsive spacing (padding + margin) — Spec 35 / D555 gutter-default
            migration. `padding`/`margin` are now block-OWNED object attrs (no
            `supports.spacing` — a WP-native support cannot carry a framework
            default, which is exactly why `sgs/container` had no horizontal
            gutter and rendered flush to the viewport edge; see D555). Base tier
            now writes to the owned `padding`/`margin` attrs directly, matching
            the tablet/mobile legs' already-owned `paddingTablet`/`paddingMobile`
            and `marginTablet`/`marginMobile` — one system, not a native+SGS
            split. Mirrors the D548 `sgs/gallery` precedent (its own base tier
            is likewise owned, not native). */}
        <PanelBody title={ __( "Padding & margin", "sgs-blocks" ) } initialOpen={ false }>
          <ResponsiveBoxControl
            label={ __( "Padding", "sgs-blocks" ) }
            values={ {
              base: attributes.padding ?? {},
              tablet: attributes.paddingTablet ?? {},
              mobile: attributes.paddingMobile ?? {},
            } }
            onChange={ ( tier, next ) => {
              /* Breakpoint -> attr map, not a ternary. This is the CANONICAL
                 idiom in this codebase and check-control-ux.js recognises it
                 explicitly (its "COMPLIANT IDIOM EXEMPTION", ~:330): a variant
                 appearing as the VALUE of a `tablet:`/`mobile:` key is the
                 wrapped-and-delegated shape, whereas a bare computed ternary
                 reads to the gate as an unwrapped direct write and fails the
                 build with RESPONSIVE-FAMILY-WITHOUT-SWITCHER. It is also
                 simply less code: one setAttributes, no branch. */
              const attrFor = { base: "padding", tablet: "paddingTablet", mobile: "paddingMobile" };
              setAttributes( { [ attrFor[ tier ] ]: next } );
            } }
          />
          <hr style={ { margin: "16px 0" } } />
          <ResponsiveBoxControl
            label={ __( "Margin", "sgs-blocks" ) }
            values={ {
              base: attributes.margin ?? {},
              tablet: attributes.marginTablet ?? {},
              mobile: attributes.marginMobile ?? {},
            } }
            onChange={ ( tier, next ) => {
              /* Same canonical breakpoint -> attr map as Padding above. */
              const attrFor = { base: "margin", tablet: "marginTablet", mobile: "marginMobile" };
              setAttributes( { [ attrFor[ tier ] ]: next } );
            } }
          />
        </PanelBody>

        {/* Content band (Layer 2 __inner) padding — per-area object attr (contract §2),
            not a WP-native attr since the band is an SGS-only inner element. Background +
            responsive width controls stay on GridItemDefaultsPanel's neighbour BackgroundPanel
            / WidthPanel; this panel is scoped to band padding only. */}
        <PanelBody title={ __( "Content band", "sgs-blocks" ) } initialOpen={ false }>
          <p className="components-base-control__help">
            { __( "Styles the inner content band (the max-width wrapper set by Content width). The band exists by default — set Content width to Full to remove it.", "sgs-blocks" ) }
          </p>
          {/* ⛔ "Band background colour" (contentBandBackground) was REMOVED
              2026-08-12, and the attribute retired framework-wide. Bean's rule:
              a background colour or media fills the max-width of its CONTAINER
              and is never clipped to the inner content layer, so a band-scoped
              background was a design error rather than a capability. Set the
              background on the block itself (BackgroundPanel) instead. Zero
              stored instances existed on the canary at deletion. Do NOT re-add
              a band-scoped background control here or on any composite. */}
          {/* contentBandPadding is a TIER OBJECT — ONE attr holding
              {desktop,tablet,mobile}, each tier itself a {top,right,bottom,left}
              box (Spec 35 box-shaped pass, 2026-08-11). It therefore uses
              ResponsiveOverride, which reads and writes the object, NOT the
              flat-sibling ResponsiveBoxControl. Do NOT revert to an attrMap of
              {base:'contentBandPadding', tablet:'contentBandPaddingTablet',
              mobile:'contentBandPaddingMobile'} — those two siblings are no
              longer declared by any block.json, and WordPress SILENTLY
              DISCARDS an attribute a block does not declare (D338), so both
              tiers would save nothing while the desktop branch wrote a plain
              object into the SAME shape as before by coincidence only — the
              real risk is a stale flat write landing on a deleted attr.
              Mirrors ResponsiveBoxControls.js's Padding block exactly. */}
          {/* ⛔ NO `label` on the wrapper, and NO `hideLabelFromVision` on the
              BoxControl — core's BoxControl ignores that prop and always renders its
              own label, so both painted (sentence case + WP's uppercase). Keep
              BoxControl's; BaseControl associates it with the inputs. Full reasoning
              at components/ResponsiveBoxControls.js. */}
          <ResponsiveOverride
            value={ attributes.contentBandPadding }
            onChange={ ( obj ) => setAttributes( { contentBandPadding: obj } ) }
          >
            { ( { ownValue, setOwnValue } ) => (
              <BoxControl
                label={ __( "Band padding", "sgs-blocks" ) }
                values={ ownValue && typeof ownValue === "object" ? ownValue : {} }
                units={ BOX_UNITS }
                splitOnAxis={ false }
                onChange={ ( next ) => setOwnValue( normaliseResponsiveBox( next ) ) }
              	__next40pxDefaultSize
              />
            ) }
          </ResponsiveOverride>
        </PanelBody>

        {/* Grid item defaults — only shown when layout is grid. */}
        <GridItemDefaultsPanel attributes={ attributes } setAttributes={ setAttributes } />

        {/* QB-3: Template mode — allowed children restriction. Container-specific. */}
        <PanelBody
          title={ __( "Template mode", "sgs-blocks" ) }
          initialOpen={ false }
        >
          <SelectControl
            label={ __( "Allowed children", "sgs-blocks" ) }
            value={ templateMode }
            options={ TEMPLATE_MODE_OPTIONS }
            onChange={ ( val ) => setAttributes( { templateMode: val } ) }
            help={ __(
              "Grid section and Card grid restrict which block types can be inserted directly inside this container. Free (default) imposes no restrictions.",
              "sgs-blocks"
            ) }
            __nextHasNoMarginBottom
          	__next40pxDefaultSize
          />
        </PanelBody>

        {/* Shadow — legacy string token attr (sm/md/lg/glow OR a raw box-shadow
          CSS string built by ShadowControl), resolved by sgs_shadow_value()
          (Spec 35 T2.2b). */}
        <PanelBody title={ __( "Shadow", "sgs-blocks" ) } initialOpen={ false }>
          <ShadowControl
            label={ __( "Shadow", "sgs-blocks" ) }
            attributes={ attributes }
            setAttributes={ setAttributes }
            attrNames={ {
            	base: 'shadow',
            	colour: 'shadowColour',
            	hoverColour: 'shadowColourHover',
            } }
           />
        </PanelBody>

        {/* Shape Dividers (top + bottom). */}
        <ShapeDividersPanel attributes={ attributes } setAttributes={ setAttributes } />

      </InspectorControls>

      { hasBandProps ? (
        <div { ...blockProps }>
          <div { ...innerBlocksProps } />
        </div>
      ) : (
        <div { ...innerBlocksProps } />
      ) }
    </>
  );
}
