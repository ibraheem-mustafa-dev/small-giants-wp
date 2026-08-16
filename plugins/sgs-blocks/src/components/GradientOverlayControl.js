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
 * UX shape (Background panel redesign D1, 2026-08-11): a compact swatch
 * BUTTON that opens a Dropdown popover, matching WP's own native
 * colour/gradient control shape, rather than every sub-control rendered
 * inline in the sidebar. Modelled on `@wordpress/block-editor`'s
 * `ColorGradientSettingsDropdown` (`packages/block-editor/src/components/
 * colors-gradients/dropdown.js`): a `ColorIndicator` swatch + label as the
 * toggle. Built from the STABLE primitives (`Dropdown`, `ColorIndicator`,
 * `Button` — none `__experimental*`) rather than importing WP's own dropdown
 * component, because that component expects the multi-origin theme
 * colour/gradient dataset and ToolsPanel context this control doesn't use —
 * this is the same visual pattern without pulling in machinery this control
 * has no data source for.
 *
 * ⛑ Task 3 rebuild (D636, 2026-08-16) — SUPERSEDES the 2026-08-11 ruling
 * this docblock used to record. That ruling kept WP's NATIVE `GradientPicker`
 * because its per-stop colour editor renders a bare `ColorPicker`, never
 * `ColorPalette`, so a stop could not be linked to a theme/global palette
 * colour — assessed then as "not worth the time". A 4-seat design council
 * (2026-08-16) re-opened that trade-off: SGS now composes its own gradient
 * bar (`../gradient-picker`, forked from the same pinned Gutenberg SHA the
 * colour-picker fork uses) whose stop editor mounts the SGS `ColorPalette`
 * above the raw picker — see `gradient-picker/gradient-bar/control-points.js`.
 * Picking a swatch stores that stop as `var(--wp--preset--color--<slug>)`.
 *
 * STORAGE — collapsed from 4 scalars to 1 string (D636): `attrNames.gradient`
 * now holds the COMPLETE CSS gradient value (any stop count, linear or
 * radial), validated at render time through `sgs_css_gradient_value()`
 * (`includes/helpers-tokens.php`). A non-empty gradient string wins over the
 * flat `solid` colour, exactly as WP core and Kadence/Spectra/Otter resolve
 * it — no boolean discriminator. The old `angle`/`from`/`to` keys and the
 * `parseLinearGradient`/`buildGradientCss` bridge functions that existed only
 * to translate a free-form CSS string down onto that lossy 2-stop shape are
 * gone — the stored value IS the CSS string now, nothing to translate.
 *
 * `attrNames` — an optional `{ gradient, solid }` map of attribute names to
 * read/write. Defaults to the original whole-block overlay names
 * (`overlayGradient`/`backgroundOverlayColour`) so every existing call site
 * is unaffected by this parameterisation.
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button, Card, CardBody, ColorIndicator, Dropdown } from '@wordpress/components';
import DesignTokenPicker from './DesignTokenPicker';
import SgsGradientPicker from './gradient-picker';
import {
	HStack,
	ToggleGroupControl,
	ToggleGroupControlOption,
} from './primitives';

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

	// Mode is DERIVED from the stored value, not a separate boolean attr —
	// matches the storage-layer resolution model (non-empty gradient wins).
	// A local toggle-in-progress (operator clicked "Gradient" but hasn't
	// picked a stop yet) is UI-only state, not written until they interact.
	const [ localGradientMode, setLocalGradientMode ] = useState( null );
	const gradientEnabled =
		localGradientMode !== null ? localGradientMode : !! gradientValue;

	// What the swatch preview + Dropdown toggle shows — whichever of the two
	// mutually-exclusive paths (solid / gradient) is active.
	const swatchValue = gradientEnabled ? gradientValue : solidColour;

	return (
		<Card size="small" className="sgs-gradient-overlay-control__card">
			<CardBody size="small">
				<Dropdown
					className="sgs-gradient-overlay-control"
					contentClassName="sgs-gradient-overlay-control__popover"
					popoverProps={ { placement: 'left-start', offset: 36, shift: true } }
					renderToggle={ ( { isOpen, onToggle } ) => (
						<Button
							__next40pxDefaultSize
							onClick={ onToggle }
							aria-expanded={ isOpen }
							className="sgs-gradient-overlay-control__toggle"
						>
							<HStack justify="flex-start">
								<ColorIndicator colorValue={ swatchValue } />
								<span>{ solidLabel }</span>
							</HStack>
						</Button>
					) }
					renderContent={ () => (
						<div className="sgs-gradient-overlay-control__content">
							<ToggleGroupControl
								label={ __( 'Overlay type', 'sgs-blocks' ) }
								value={ gradientEnabled ? 'gradient' : 'solid' }
								onChange={ ( val ) =>
									setLocalGradientMode( val === 'gradient' )
								}
								isBlock
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							>
								<ToggleGroupControlOption
									value="solid"
									label={ __( 'Solid', 'sgs-blocks' ) }
								/>
								<ToggleGroupControlOption
									value="gradient"
									label={ __( 'Gradient', 'sgs-blocks' ) }
								/>
							</ToggleGroupControl>

							{ gradientEnabled ? (
								<SgsGradientPicker
									value={ gradientValue }
									onChange={ ( newGradient ) => {
										setLocalGradientMode( true );
										setAttributes( {
											[ attrNames.gradient ]: newGradient ?? '',
										} );
									} }
									enableAlpha
									__experimentalIsRenderedInSidebar
								/>
							) : (
								<DesignTokenPicker
									label={ solidLabel }
									value={ solidColour }
									onChange={ ( val ) => {
										setLocalGradientMode( false );
										setAttributes( {
											[ attrNames.solid ]: val,
											// Switching back to solid clears any
											// gradient so the two paths never
											// disagree about which is "current".
											[ attrNames.gradient ]: '',
										} );
									} }
								/>
							) }
						</div>
					) }
				/>
			</CardBody>
		</Card>
	);
}
