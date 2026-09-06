/**
 * GradientOverlayControl
 *
 * Shared "background colour or gradient" picker. Originally built for the
 * whole-block "background overlay" used by container / cta-section / hero
 * (all three render through the same `BackgroundPanel` in
 * `blocks/container/components/ContainerWrapperControls.js`), and reused as
 * of Phase 4 Item 5 (D561 inspector-standardisation plan) for hero's
 * per-element `mediaBackground`/`contentBackground` colour+gradient controls.
 * Also mounted (D636/D643 gradient rollout, Builder 5) for the two shape-
 * divider colour rows inside `ShapeDividersPanel` — the confirmed live
 * precedent this file's own two-sibling-attribute shape provided for that
 * rollout: `shapeDivider{Top,Bottom}Colour` (flat, unchanged) +
 * `shapeDivider{Top,Bottom}ColourGradient` (gradient), via a custom
 * `attrNames` map rather than the default overlay names.
 *
 * ⛑ THIN-ADAPTER REBUILD (D4, unified-colour-panel design, 2026-08-22) —
 * SUPERSEDES the bespoke Card/Dropdown/ToggleGroupControl markup this file
 * used to hand-roll. This was never a distinct capability: it was mechanism
 * A (`DesignTokenPicker`'s `states` row shape) wearing a different prop
 * register (`attributes`/`setAttributes`/`attrNames` instead of a `states`
 * array) — and it was SINGLE-STATE BY CONSTRUCTION, which is the sole
 * reason a background overlay colour could never carry a hover. This file
 * is now a thin translation layer: it reads `attrNames`/`attributes` and
 * hands a one-entry `states` array down to `DesignTokenPicker`, which does
 * all the actual rendering (the same row/popover/tab shape every other
 * `SgsColourPanel` row already uses). Hover arrives for free the moment a
 * caller's `attrNames` grows hover siblings and this file's `states` array
 * is extended to a second entry — no rewrite needed here.
 *
 * Every existing call site (container/cta-section/hero's whole-block
 * overlay, hero's mediaOverlay/contentBackground/mediaBackground, the two
 * shape-divider rows) keeps its exact props — `attributes`, `setAttributes`,
 * `attrNames`, `solidLabel` — so this is a one-file rebuild, not a migration
 * across blocks.
 *
 * ⚠ SEMANTIC RULING CARRIED FORWARD (design doc D4): "a client who had a
 * gradient, picks a solid, keeps an invisible gradient" must never happen.
 * The old hand-rolled control cleared the gradient sibling on EVERY solid
 * pick, inside the solid picker's own `onChange` — not only when the
 * Solid/Gradient toggle switched modes. `DesignTokenPicker`'s own toggle
 * already clears the gradient sibling when switching TO solid, and the
 * solid palette is unreachable without passing through that toggle first
 * (only one of {palette, gradient bar} renders per mode), so the two
 * mechanisms are behaviourally equivalent for any reachable operator path.
 * This adapter still clears `attrNames.gradient` explicitly inside its own
 * `onChange` below — belt and braces, matching the old control's semantic
 * literally rather than relying on that reachability argument alone.
 *
 * `attrNames` — an optional `{ gradient, solid }` map of attribute names to
 * read/write. Defaults to the original whole-block overlay names
 * (`overlayGradient`/`backgroundOverlayColour`) so every existing call site
 * is unaffected by this parameterisation.
 */
import { __ } from '@wordpress/i18n';
import DesignTokenPicker from './DesignTokenPicker';

// Default attribute-name map — today's whole-block "overlay" shape. Passing a
// different map lets other elements (e.g. hero's mediaBackground/
// contentBackground, Item 5 of the D561 inspector-standardisation plan) reuse
// this exact control without duplicating it, while every EXISTING call site
// (container / cta-section / hero's own overlay usage) keeps working
// unchanged because it relies on this default.
const DEFAULT_ATTR_NAMES = {
	gradient: 'overlayGradient',
	solid: 'backgroundOverlayColour',
	// Hover siblings are OPTIONAL. When a caller supplies them, this control
	// renders Normal and Hover as TABS INSIDE ONE POPOVER rather than as two
	// separate rows — `DesignTokenPicker` already switches to its tab shape
	// the moment it receives more than one state (see its `hasStates`). The
	// whole point of the D4 adapter was to make that reachable here; a second
	// row would duplicate a row shape the shared picker already owns.
	solidHover: 'backgroundOverlayColourHover',
	gradientHover: 'overlayGradientHover',
};


/**
 * Derive ONE of a gradient-overlay family's attribute names from its base.
 *
 * The standard helper pair for this control, mirroring `shadowAttrName()` and
 * `typographyAttrName()`. See `scripts/check-control-helper-parity.py` for the
 * census of which controls carry theirs.
 *
 * ⭐ ENUMERATED, NOT GENERALISED — and the enumeration found the rule is only
 * HALF derivable. Every mount in the tree (2026-08-26, all three in `sgs/hero`;
 * `sgs/info-box` merely DISCUSSES this control in a docblock and mounts no such
 * thing):
 *
 *   solid                  gradient
 *   ---------------------  --------------------------
 *   mediaOverlayColour     mediaOverlayGradient
 *   contentBackground      contentBackgroundGradient
 *   mediaBackground        mediaBackgroundGradient
 *
 *   • `gradient` = `<base>Gradient`  — holds **3/3**, so it is derivable.
 *   • `solid`    = `<base>` twice, `<base>Colour` once — **NOT uniform**, so it
 *     is NOT derived. It defaults to `<base>` (the majority) and is overridable.
 *
 * ⛔ Deriving `solid` from a single rule would have named a non-existent
 * attribute on one of the three mounts, and WordPress SILENTLY DISCARDS writes
 * to undeclared attributes (D338) — an editor control that moves and does
 * nothing. The shadow pair learned this the expensive way; this one did not.
 *
 * @param {string} base Base attribute name, e.g. 'mediaOverlay'.
 * @param {string} part One of 'gradient' | 'solid'.
 * @return {string} The attribute key, or '' for an unknown part.
 */
export function gradientOverlayAttrName( base, part = 'gradient' ) {
	if ( ! base ) {
		return '';
	}
	if ( 'gradient' === part ) {
		return base + 'Gradient';
	}
	if ( 'solid' === part ) {
		return base;
	}
	return '';
}

/**
 * The attribute-key map for a gradient-overlay family.
 *
 * `solid` defaults to the base name and is overridable for the families that
 * suffix it with `Colour` — see the enumeration above for why that override
 * exists rather than a second rule.
 *
 * The PHP twin is `sgs_gradient_overlay_attr_map()` (`includes/helpers-tokens.php`),
 * which carries the same default and the same override.
 *
 * @param {string} base              Base attribute name, e.g. 'contentBackground'.
 * @param {Object} [options]         Options.
 * @param {string} [options.solid]   Override the solid-colour attribute name.
 * @return {{gradient: string, solid: string}} The keys.
 */
export function gradientOverlayAttrKeys( base, { solid } = {} ) {
	return {
		gradient: gradientOverlayAttrName( base, 'gradient' ),
		solid: solid || gradientOverlayAttrName( base, 'solid' ),
	};
}

export default function GradientOverlayControl( {
	attributes,
	setAttributes,
	attrNames = DEFAULT_ATTR_NAMES,
	solidLabel = __( 'Overlay colour', 'sgs-blocks' ),
} ) {
	return (
		<DesignTokenPicker
			label={ solidLabel }
			// D717 (2026-08-21) — carried forward verbatim. Without `linked`
			// the picker stores whatever CSS colour the swatch happens to
			// hold rather than the palette SLUG, so picking the client's own
			// brand swatch freezes a raw hex and silently unlinks the
			// palette token on every pick. `states[].linked` below is the
			// mechanism-A equivalent of the flag this control used to pass
			// directly to `DesignTokenPicker` in single-value mode.
			//
			// enableAlpha is OFF on the SOLID swatch (D717) — transparency
			// belongs to `backgroundOverlayOpacity`, a separate CSS
			// property that leaves the stored colour/slug intact. Two
			// transparency mechanisms is what let the token-corrupting one
			// stay reachable. The gradient bar never carried that risk (a
			// gradient stop lives inside a full CSS gradient STRING, never
			// slug-matched), so its alpha stays ON via `gradientEnableAlpha`
			// — one shared `enableAlpha` cannot express both policies at
			// once, which is why `DesignTokenPicker` grew that prop for
			// this adapter.
			enableAlpha={ false }
			gradientEnableAlpha
			/*
			 * TWO LITERAL ENTRIES, deliberately — not a .map() over a spec
			 * list. inspector-scan rule 31 resolves a row's state count by
			 * READING THIS ARRAY STATICALLY; it follows array literals,
			 * spreads and conditionals, but it cannot evaluate a runtime
			 * `.filter( spec => attrNames[ spec.key ] )` because the
			 * predicate depends on a prop. A first version of this fix used
			 * exactly that shape: the control really did render both states,
			 * and the gate reported "carries 1 state" — the code improved
			 * while the detector went blind, which is strictly worse than
			 * the honest finding it replaced. The duplication below is the
			 * price of staying legible to the gate that enforces it.
			 *
			 * Hover is emitted ONLY when the caller's attrNames carries the
			 * pair, so the shape-divider rows and hero's media/content
			 * backgrounds (which pass a custom map without hover keys) keep
			 * exactly one state and no tab strip.
			 */
			states={ [
				{
					key: 'normal',
					label: solidLabel,
					value: attributes[ attrNames.solid ],
					linked: true,
					onChange: ( val ) =>
						setAttributes( {
							[ attrNames.solid ]: val ?? '',
							// A solid pick always clears that state's stored
							// gradient so the two paths never disagree about
							// which is "current" — the semantic ruling in the
							// docblock above.
							[ attrNames.gradient ]: '',
						} ),
					gradientValue: attributes[ attrNames.gradient ] || '',
					onGradientChange: ( val ) =>
						setAttributes( { [ attrNames.gradient ]: val ?? '' } ),
				},
				...( attrNames.solidHover
					? [
							{
								key: 'hover',
								label: __( 'Hover', 'sgs-blocks' ),
								value: attributes[ attrNames.solidHover ],
								linked: true,
								onChange: ( val ) =>
									setAttributes( {
										[ attrNames.solidHover ]: val ?? '',
										[ attrNames.gradientHover ]: '',
									} ),
								gradientValue:
									attributes[ attrNames.gradientHover ] || '',
								onGradientChange: ( val ) =>
									setAttributes( {
										[ attrNames.gradientHover ]: val ?? '',
									} ),
							},
					  ]
					: [] ),
			] }
		/>
	);
}
