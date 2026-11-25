import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { SgsBorderControl } from '../../components';

/**
 * SGS Cart — the trigger pill's border (width, style, colour), Styles-tab panel. Split out of
 * edit.js (already over the 250-line JS budget) rather than grown inline.
 *
 * Spec 35 §14 / §1 field 9f (compliance correction): border colour is the
 * ONE canonical mechanism, `SgsBorderControl` — no ad-hoc second colour
 * control. Width (box object, base only) + style (enum) + colour (flat, no
 * gradient sibling) all mount through it, mirroring sgs/whatsapp-cta's
 * `cardBorderWidth`/`cardBorderStyle`/`cardBorderColour`
 * (card-fields.js::CardTypographyPanel). The corner radius is the trigger's own,
 * shared with the icon button (the Button panel on the Settings tab).
 *
 * @param {Object}   root0                  Props.
 * @param {boolean}  root0.isPill           Whether triggerStyle is 'pill'.
 * @param {string}   root0.pillBorderColour Flat colour (no gradient sibling — see
 *                                          block.json's `pill` element note).
 * @param {Object}   root0.pillBorderWidth  `{top,right,bottom,left}` box object, base tier only.
 * @param {string}   root0.pillBorderStyle  '' | 'solid' | 'dashed' | 'dotted'.
 * @param {string}   root0.contrastAgainst  The pill's own solid fill, for the WCAG 3:1 border warning ('' = none).
 * @param {Function} root0.setAttributes    The block's attribute setter.
 */
export default function PillBorderControl( {
	isPill,
	pillBorderColour,
	pillBorderWidth,
	contrastAgainst = '',
	pillBorderStyle,
	setAttributes,
} ) {
	if ( ! isPill ) {
		return null;
	}

	return (
		<PanelBody
			title={ __( 'Pill border', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<SgsBorderControl
				widthValues={ pillBorderWidth ?? {} }
				onWidthChange={ ( next ) =>
					setAttributes( { pillBorderWidth: next } )
				}
				styleValue={ pillBorderStyle }
				onStyleChange={ ( val ) =>
					setAttributes( { pillBorderStyle: val } )
				}
				colourValue={ pillBorderColour }
				onColourChange={ ( val ) =>
					setAttributes( { pillBorderColour: val ?? '' } )
				}
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourLinked
				contrastAgainst={ contrastAgainst }
			/>
		</PanelBody>
	);
}
