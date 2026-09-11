import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { SgsLengthControl } from '../../components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Underline" PanelBody (thickness,
 * offset). Only mounted by edit.js when `hoverStyle === 'underline'` — the
 * conditional stays at the CALL SITE (edit.js), matching the original inline
 * `{ 'underline' === hoverStyle && ( <PanelBody>…</PanelBody> ) }` shape, so
 * this component itself renders unconditionally once mounted.
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim JSX. Bar
 * colour (Normal + Hover) lives in the top-level SgsColourPanel (D618/D609),
 * only shown there when Hover style is 'underline', unchanged by this split.
 *
 * @param {Object}   root0                    Props.
 * @param {number}   root0.underlineThickness The block's `underlineThickness` attribute.
 * @param {number}   root0.underlineOffset    The block's `underlineOffset` attribute.
 * @param {Function} root0.setAttributes      The block's attribute setter.
 */
export default function UnderlinePanel( {
	underlineThickness,
	underlineOffset,
	setAttributes,
} ) {
	return (
		<PanelBody
			title={ __( 'Underline', 'sgs-blocks' ) }
			initialOpen={ false }
		>
			{ /* Bar colour (Normal + Hover) moved to the top-level
			   SgsColourPanel (D618/D609) — only shown there when
			   Hover style is 'underline', mirroring this panel's
			   own visibility gate. */ }
			<SgsLengthControl
				label={ __( 'Thickness', 'sgs-blocks' ) }
				value={ `${ underlineThickness }px` }
				units={ [
					{ value: 'px', label: 'px', default: 2 },
				] }
				onChange={ ( val ) =>
					setAttributes( {
						underlineThickness:
							parseFloat( val ) || 2,
					} )
				}
				presets={ false }
			/>
			<SgsLengthControl
				label={ __( 'Distance below text', 'sgs-blocks' ) }
				value={ `${ underlineOffset }px` }
				units={ [
					{ value: 'px', label: 'px', default: 6 },
				] }
				onChange={ ( val ) =>
					setAttributes( {
						underlineOffset: parseFloat( val ) || 6,
					} )
				}
				presets={ false }
			/>
			<p className="sgs-nav-menu__inspector-note">
				{ __(
					'Leave the colours empty to match the item text. The bar also marks the current page.',
					'sgs-blocks'
				) }
			</p>
		</PanelBody>
	);
}
