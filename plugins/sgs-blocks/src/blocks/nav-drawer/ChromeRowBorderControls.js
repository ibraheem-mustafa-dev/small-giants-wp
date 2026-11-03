/**
 * Nav drawer "Top row border": the bottom border of the chrome row per device (`chromeRowBorder`), through the shared
 * TierBorderControl. Rendered by `includes/nav-drawer-chrome-css.php` through `sgs_tiered_border_specs`.
 *
 * @package SGS\Blocks
 */

import { __ } from '@wordpress/i18n';
import { TierBorderControl } from '../../components';

/**
 * @param {Object}   props               Props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Setter.
 * @return {Element} The control.
 */
export default function ChromeRowBorderControls( { attributes, setAttributes } ) {
	return (
		<TierBorderControl
			label={ __( 'Top row bottom border', 'sgs-blocks' ) }
			value={ attributes.chromeRowBorder }
			onChange={ ( next ) => setAttributes( { chromeRowBorder: next } ) }
		/>
	);
}
