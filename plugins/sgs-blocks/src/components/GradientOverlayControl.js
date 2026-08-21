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
};

export default function GradientOverlayControl( {
	attributes,
	setAttributes,
	attrNames = DEFAULT_ATTR_NAMES,
	solidLabel = __( 'Overlay colour', 'sgs-blocks' ),
} ) {
	const {
		[ attrNames.gradient ]: gradientValue = '',
		[ attrNames.solid ]: solidColour,
	} = attributes;

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
			states={ [
				{
					key: 'normal',
					label: solidLabel,
					value: solidColour,
					linked: true,
					onChange: ( val ) => {
						setAttributes( {
							[ attrNames.solid ]: val ?? '',
							// Switching to a solid pick always clears any
							// stored gradient so the two paths never
							// disagree about which is "current" — see the
							// docblock's semantic-ruling note above.
							[ attrNames.gradient ]: '',
						} );
					},
					gradientValue,
					onGradientChange: ( val ) =>
						setAttributes( { [ attrNames.gradient ]: val ?? '' } ),
				},
			] }
		/>
	);
}
