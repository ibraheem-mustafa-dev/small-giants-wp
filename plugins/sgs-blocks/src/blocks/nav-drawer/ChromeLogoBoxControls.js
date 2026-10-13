/**
 * Nav drawer top-row logo box controls (Spec 36 FR-36-6): corner radius,
 * padding and shadow around the top-row logo (`chromeLogoBox*`),
 * mounted under the logo controls in the "Top row" panel. Render side:
 * `includes/nav-drawer-chrome-extras-css.php`. The box's fill is a row in the
 * drawer's Styles-tab colour panel (`chrome-colour-rows.js`).
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { SgsBoxControl, SgsLengthControl, ShadowControl } from '../../components';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The controls.
 */
export default function ChromeLogoBoxControls( { attributes, setAttributes } ) {
	const { chromeLogoBoxRadius, chromeLogoBoxPadding } = attributes;

	return (
		<>
			<SgsLengthControl
				label={ __( 'Logo box corner radius', 'sgs-blocks' ) }
				help={ __( 'Rounds the box around the logo. Empty: square corners.', 'sgs-blocks' ) }
				value={ chromeLogoBoxRadius || '' }
				onChange={ ( value ) => setAttributes( { chromeLogoBoxRadius: value || '' } ) }
			/>
			<SgsBoxControl
				label={ __( 'Logo box padding', 'sgs-blocks' ) }
				values={ chromeLogoBoxPadding ?? {} }
				presets
				onChange={ ( next ) => setAttributes( { chromeLogoBoxPadding: next } ) }
			/>
			<ShadowControl
				label={ __( 'Logo box shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base: 'chromeLogoBoxShadow', colour: 'chromeLogoBoxShadowColour' } }
			/>
		</>
	);
}
