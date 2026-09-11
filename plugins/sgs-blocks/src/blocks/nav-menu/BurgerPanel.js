import { __ } from '@wordpress/i18n';
import { PanelBody } from '@wordpress/components';
import { SgsLengthControl } from '../../components';

/**
 * SGS Nav Menu (sgs/nav-menu) — Styles tab: "Burger" PanelBody (button size).
 *
 * Split out of edit.js (Spec 41 step 7, pure refactor) to keep the file under
 * the project's 250-line JS budget. No behaviour change — verbatim JSX. Icon
 * colour + background (Normal + Hover) live in the top-level SgsColourPanel
 * (D618/D609), unchanged by this split.
 *
 * @param {Object}   root0               Props.
 * @param {string}   root0.burgerSize    The block's `burgerSize` attribute.
 * @param {Function} root0.setAttributes The block's attribute setter.
 */
export default function BurgerPanel( { burgerSize, setAttributes } ) {
	return (
		<PanelBody title={ __( 'Burger', 'sgs-blocks' ) } initialOpen={ false }>
			{ /* Icon colour + background (Normal + Hover) moved to
			   the top-level SgsColourPanel (D618/D609). */ }
			<SgsLengthControl
				label={ __( 'Button size', 'sgs-blocks' ) }
				value={ burgerSize }
				units={ [ { value: 'px', label: 'px', default: 44 } ] }
				onChange={ ( val ) =>
					setAttributes( { burgerSize: val || '44px' } )
				}
				help={ __(
					'44px minimum for a comfortable touch target (WCAG 2.2 AA).',
					'sgs-blocks'
				) }
				presets={ false }
			/>
		</PanelBody>
	);
}
