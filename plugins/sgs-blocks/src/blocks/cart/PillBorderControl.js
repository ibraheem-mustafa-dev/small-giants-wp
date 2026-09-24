import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { SgsBorderControl, SgsLengthControl } from '../../components';

// Spec 35 §14 field 6 / C5: a scalar CSS length (not a 4-corner responsive
// object — Spec 32 §6.1 deliberate-keep for a single uniform pill radius)
// takes a real UnitControl `units` array including `%`, mirroring
// sgs/option-picker's own LENGTH_UNITS for its identically-shaped
// pillBorderRadius.
const PILL_RADIUS_UNITS = [
	{ value: 'px', label: 'px', default: 0 },
	{ value: '%', label: '%', default: 0 },
];

/**
 * SGS Cart — the trigger pill's border pair, Styles-tab panel. Split out of
 * edit.js (already over the 250-line JS budget) rather than grown inline.
 *
 * Spec 35 §14 / §1 field 9f (compliance correction): border colour is the
 * ONE canonical mechanism, `SgsBorderControl` — no ad-hoc second colour
 * control. Width (box object, base only) + style (enum) + colour (flat, no
 * gradient sibling) all mount through it, mirroring sgs/whatsapp-cta's
 * `cardBorderWidth`/`cardBorderStyle`/`cardBorderColour`
 * (card-fields.js::CardTypographyPanel). Radius is the one attribute that
 * does NOT go through `SgsBorderControl`'s `onRadiusChange`: that prop is
 * typed for a 4-corner responsive tier object, and `pillBorderRadius`
 * deliberately stays a plain scalar CSS length (Spec 32 §6.1 deliberate-keep
 * for a single uniform pill radius, matching sgs/option-picker's own
 * `pillBorderRadius`) — routing it through `onRadiusChange` would force
 * exactly the object migration §6.1 exempts. It mounts immediately below the
 * composite instead, in the same panel.
 *
 * @param {Object}   root0                 Props.
 * @param {boolean}  root0.isPill          Whether triggerStyle is 'pill'.
 * @param {string}   root0.pillBorderColour Flat colour (no gradient sibling — see
 *                                          block.json's `pill` element note).
 * @param {Object}   root0.pillBorderWidth  `{top,right,bottom,left}` box object, base tier only.
 * @param {string}   root0.pillBorderStyle  '' | 'solid' | 'dashed' | 'dotted'.
 * @param {string}   root0.pillBorderRadius CSS length string, e.g. "999px" or "50%".
 * @param {string}   root0.contrastAgainst  The pill's own solid fill, for the WCAG 3:1 border warning ('' = none).
 * @param {Function} root0.setAttributes    The block's attribute setter.
 */
export default function PillBorderControl( {
	isPill,
	pillBorderColour,
	pillBorderWidth,
	contrastAgainst = '',
	pillBorderStyle,
	pillBorderRadius,
	setAttributes,
} ) {
	if ( ! isPill ) return null;

	return (
		<PanelBody title={ __( 'Pill border', 'sgs-blocks' ) } initialOpen={ false }>
			<SgsBorderControl
				widthValues={ pillBorderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { pillBorderWidth: next } ) }
				styleValue={ pillBorderStyle }
				onStyleChange={ ( val ) => setAttributes( { pillBorderStyle: val } ) }
				colourValue={ pillBorderColour }
				onColourChange={ ( val ) => setAttributes( { pillBorderColour: val ?? '' } ) }
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourLinked
				contrastAgainst={ contrastAgainst }
			/>
			<SgsLengthControl
				label={ __( 'Border radius', 'sgs-blocks' ) }
				value={ pillBorderRadius || '' }
				units={ PILL_RADIUS_UNITS }
				onChange={ ( val ) => setAttributes( { pillBorderRadius: val ?? '' } ) }
				help={ __( 'Leave blank for the default (fully rounded).', 'sgs-blocks' ) }
				presets={ false }
			/>
		</PanelBody>
	);
}
