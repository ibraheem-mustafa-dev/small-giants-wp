/**
 * `media-padding` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `media-padding.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`). Mounts the same shared
 * `ResponsiveBoxControl` (`src/components/ResponsiveBoxControl.js`) that
 * already drives padding/margin/border-width on `accordion`/`audio`/
 * `brand-strip`/`breadcrumbs` — zero custom box-building logic here.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import ResponsiveBoxControl from '../../ResponsiveBoxControl.js';
import { attrKeys, validate } from './media-padding.js';

/**
 * Bare inspector row for this atom. Mounts no `InspectorControls`/`PanelBody`.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @param {string}   [props.prefix]
 * @param {string}   [props.blockSlug]
 * @return {JSX.Element} A bare row.
 */
export function control( { attributes, setAttributes, prefix = '', blockSlug = '' } ) {
	const keys = attrKeys( prefix, blockSlug );
	const TIER_KEYS = { base: keys.base, tablet: keys.tablet, mobile: keys.mobile };

	return (
		<ResponsiveBoxControl
			key={ `${ blockSlug }-${ prefix }-media-padding` }
			label={ __( 'Padding', 'sgs-blocks' ) }
			values={ {
				base: attributes[ keys.base ] ?? {},
				tablet: attributes[ keys.tablet ] ?? {},
				mobile: attributes[ keys.mobile ] ?? {},
			} }
			onChange={ ( tier, next ) => setAttributes( { [ TIER_KEYS[ tier ] ]: validate( next ) } ) }
		/>
	);
}
