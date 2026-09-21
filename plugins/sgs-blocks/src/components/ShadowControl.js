/**
 * ShadowControl — the shared layered box-shadow control.
 *
 * A shadow is stored as two ordinary text attributes and NO new attribute is needed:
 *   • SHAPE  — layers separated by commas, each `[inset] X Y BLUR SPREAD`, or a bare theme
 *              shadow name (a link: change the theme once and the block follows), or `none`.
 *              Empty means "the block's own default".
 *   • COLOUR — one entry for every layer, or a list matching the layers. An entry is `site`
 *              (the one site-wide shadow colour), a palette slug or a CSS colour, plus an
 *              optional `N%` opacity. Colour and opacity are separate; the SERVER builds the
 *              `color-mix()` (`includes/helpers-shadow-layers.php`), and `src/utils/shadow-layers.js`
 *              is its JS twin for the canvas.
 *
 * The panel (`./shadow-control/`) has Simple (theme styles + an Elevation builder), Layers and
 * Raw CSS levels over one model (`src/utils/shadow-model.js`). Shape and colour are written in
 * ONE call so a delete or reorder is one undo step and the two lists never misalign. A Normal /
 * Hover switcher sits at panel level when the block has a hover shadow.
 *
 * Install in one call: pass `attributes`, `setAttributes` and an `attrNames` map from
 * `shadowAttrKeys()`. The older explicit `value`/`onChange`/`colour`/`onColourChange` props
 * still win when supplied.
 *
 * WCAG 2.1 AA: labelled native controls, `aria-pressed` on every choice, announced actions,
 * keyboard reordering (Alt+Up / Alt+Down), 44px touch targets.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useSettings } from '@wordpress/block-editor';
import { BaseControl, TabPanel } from '@wordpress/components';
import ShadowStateBuilder from './shadow-control/ShadowStateBuilder';
import { makeResolveHex, presetPreviewCss } from './shadow-control/preview';
import { flattenSettingList } from './shadow-control/useShadowPresets';

/**
 * Derive ONE of a shadow family's attribute names from its base name.
 *
 * The rules are ENUMERATED from the real corpus, not generalised (a generalised rule scored
 * 0/10 against it): `colour` = `<base>Colour`, `hoverColour` = `<base>ColourHover`,
 * `hover` = `<base>Hover`.
 *
 * @param {string} base Base attribute name, e.g. 'boxShadow'.
 * @param {string} part One of 'base' | 'colour' | 'hover' | 'hoverColour'.
 * @return {string} The attribute key, or '' for an unknown part.
 */
export function shadowAttrName( base, part = 'base' ) {
	if ( ! base ) {
		return '';
	}
	switch ( part ) {
		case 'base':
			return base;
		case 'colour':
			return base + 'Colour';
		case 'hover':
			return base + 'Hover';
		case 'hoverColour':
			return base + 'ColourHover';
	}
	return '';
}

/**
 * The attribute-key set for a shadow family: the RESTING PAIR by default. `{ hoverColour: true }`
 * adds the hover colour and `{ hover: true }` the hover shape; they are INDEPENDENT because the
 * corpus has them independently (many blocks carry a hover colour and no hover shape, a few
 * carry both, some carry only a hover family). Returning all four by default would hand a block
 * a key it never declares, and WordPress silently discards a write to an undeclared attribute:
 * a control that moves and does nothing, which `check-dead-controls.js` exists to catch.
 *
 * The PHP twin is `sgs_shadow_attr_map()` (`includes/helpers-colour-variants.php`).
 *
 * @param {string}  base                  Base attribute name, e.g. 'boxShadow'.
 * @param {Object}  [options]             Options.
 * @param {boolean} [options.hover]       Include the hover shape.
 * @param {boolean} [options.hoverColour] Include the hover colour.
 * @return {{base: string, colour: string, hover?: string, hoverColour?: string}} The keys.
 */
export function shadowAttrKeys( base, { hover = false, hoverColour = false } = {} ) {
	const keys = {
		base: shadowAttrName( base, 'base' ),
		colour: shadowAttrName( base, 'colour' ),
	};
	if ( hover ) {
		keys.hover = shadowAttrName( base, 'hover' );
	}
	if ( hoverColour ) {
		keys.hoverColour = shadowAttrName( base, 'hoverColour' );
	}
	return keys;
}

const warnMissing = ( what ) => () => {
	// eslint-disable-next-line no-console
	console.warn( `ShadowControl: ${ what } is missing, so this field will not update the block. Pass it from the caller.` );
};

/**
 * @param {Object}   props
 * @param {string}   props.label                  Field label.
 * @param {string}   [props.value]                Stored SHAPE text (or a theme shadow name).
 * @param {Function} [props.onChange]             Receives the next SHAPE text.
 * @param {string}   [props.colour]               Stored COLOUR text, owned by the caller.
 * @param {Function} [props.onColourChange]       Setter for the colour attribute.
 * @param {string}   [props.colourHover]          Hover COLOUR text. Omit when the block has no hover state.
 * @param {Function} [props.onColourHoverChange]  Setter for the hover colour.
 * @param {string}   [props.valueHover]           Hover SHAPE text.
 * @param {Function} [props.onValueHoverChange]   Setter for the hover shape.
 * @param {Object}   [props.attributes]           Block attributes (install-in-one-call form).
 * @param {Function} [props.setAttributes]        Block setAttributes.
 * @param {Object}   [props.attrNames]            Map from `shadowAttrKeys()`.
 */
export default function ShadowControl( {
	label,
	value,
	onChange,
	colour,
	onColourChange,
	colourHover,
	onColourHoverChange,
	valueHover,
	onValueHoverChange,
	attributes,
	setAttributes,
	attrNames,
} ) {
	// Explicit props win over the map, and a pair is written in ONE call only when the map
	// (not the caller) supplies both halves.
	const explicitBase = typeof onChange === 'function' || typeof onColourChange === 'function';
	const explicitHover = typeof onValueHoverChange === 'function' || typeof onColourHoverChange === 'function';
	if ( attrNames && attributes && setAttributes ) {
		const bind = ( key, current, currentSetter ) => {
			const attr = attrNames[ key ];
			if ( ! attr || current !== undefined || typeof currentSetter === 'function' ) {
				return [ current, currentSetter ];
			}
			return [ attributes[ attr ], ( next ) => setAttributes( { [ attr ]: next ?? '' } ) ];
		};
		[ value, onChange ] = bind( 'base', value, onChange );
		[ colour, onColourChange ] = bind( 'colour', colour, onColourChange );
		[ valueHover, onValueHoverChange ] = bind( 'hover', valueHover, onValueHoverChange );
		[ colourHover, onColourHoverChange ] = bind( 'hoverColour', colourHover, onColourHoverChange );
	}
	const setShape = onChange || warnMissing( 'onChange' );
	const setColour = onColourChange || warnMissing( 'onColourChange' );
	const setHoverShape = onValueHoverChange || warnMissing( 'onValueHoverChange' );
	const setHoverColour = onColourHoverChange || warnMissing( 'onColourHoverChange' );
	const canEditHoverShape = typeof onValueHoverChange === 'function';
	const hasHoverState = canEditHoverShape || typeof onColourHoverChange === 'function';

	const applyNormal = ( shape, colourText ) => {
		if ( ! explicitBase && attrNames?.base && attrNames?.colour && setAttributes ) {
			setAttributes( { [ attrNames.base ]: shape, [ attrNames.colour ]: colourText } );
			return;
		}
		setShape( shape );
		setColour( colourText );
	};
	const applyHover = ( shape, colourText ) => {
		if ( ! canEditHoverShape ) {
			setHoverColour( colourText );
		} else if ( ! explicitHover && attrNames?.hover && attrNames?.hoverColour && setAttributes ) {
			setAttributes( { [ attrNames.hover ]: shape, [ attrNames.hoverColour ]: colourText } );
		} else {
			setHoverShape( shape );
			setHoverColour( colourText );
		}
	};

	const [ presetSetting, custom, paletteSetting ] = useSettings( 'shadow.presets', 'custom', 'color.palette' );
	const palette = flattenSettingList( paletteSetting );
	const siteToken = String( custom?.shadowColour || '' );
	const slugMatch = /^var\(--wp--preset--color--([a-z0-9-]+)\)$/.exec( siteToken );
	const siteColor = slugMatch ? palette.find( ( p ) => p.slug === slugMatch[ 1 ] )?.color || '' : siteToken;
	const resolveHex = makeResolveHex( palette, siteColor );
	const presets = flattenSettingList( presetSetting ).map( ( preset ) => ( {
		slug: preset.slug,
		name: preset.name,
		literal: preset.shadow,
		preview: presetPreviewCss( preset.shadow, resolveHex( 'site' ) ),
	} ) );
	const shared = { presets, resolveHex, siteColor: resolveHex( 'site' ) };

	return (
		<BaseControl label={ label } __nextHasNoMarginBottom>
			{ /* ONE state axis, at the top: Normal / Hover own the WHOLE panel (Bean's ruling).
			   The tabs inside are the layers model, not a second state axis. */ }
			{ hasHoverState ? (
				<TabPanel
					className="sgs-shadow-control__states"
					tabs={ [
						{ name: 'normal', title: __( 'Normal', 'sgs-blocks' ) },
						{ name: 'hover', title: __( 'Hover', 'sgs-blocks' ) },
					] }
				>
					{ ( tab ) =>
						'hover' === tab.name ? (
							<ShadowStateBuilder
								{ ...shared }
								isHover
								canEditShape={ canEditHoverShape }
								value={ valueHover }
								colour={ colourHover }
								baseValue={ value }
								baseColour={ colour }
								onApply={ applyHover }
							/>
						) : (
							<ShadowStateBuilder { ...shared } value={ value } colour={ colour } onApply={ applyNormal } />
						)
					}
				</TabPanel>
			) : (
				<ShadowStateBuilder { ...shared } value={ value } colour={ colour } onApply={ applyNormal } />
			) }
		</BaseControl>
	);
}
