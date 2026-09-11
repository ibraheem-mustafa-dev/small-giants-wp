import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../components/primitives';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Effects" PanelBody (sliding
 * indicator toggle).
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim JSX.
 * Indicator colour lives in the top-level SgsColourPanel (D618/D609), shown
 * there only when the indicator is On, unchanged by this split.
 *
 * @param {Object}   root0               Props.
 * @param {string}   root0.indicatorStyle The block's `indicatorStyle` attribute.
 * @param {Function} root0.setAttributes  The block's attribute setter.
 */
export default function EffectsPanel( { indicatorStyle, setAttributes } ) {
	return (
		<PanelBody
			title={ __( 'Effects', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			<ToggleGroupControl
				label={ __( 'Sliding indicator', 'sgs-blocks' ) }
				value={ indicatorStyle }
				isBlock
				onChange={ ( val ) =>
					setAttributes( { indicatorStyle: val } )
				}
				help={ __(
					'A pill that slides beneath the hovered/current item — additional to the hover style above, not a replacement for it.',
					'sgs-blocks'
				) }
				__next40pxDefaultSize
			>
				<ToggleGroupControlOption
					value="none"
					label={ __( 'Off', 'sgs-blocks' ) }
				/>
				<ToggleGroupControlOption
					value="pill"
					label={ __( 'On', 'sgs-blocks' ) }
				/>
			</ToggleGroupControl>

			{ /* Indicator colour moved to the top-level SgsColourPanel
			   (D618/D609) — shown there only when the indicator is
			   On, mirroring this panel's own visibility gate. */ }
		</PanelBody>
	);
}
