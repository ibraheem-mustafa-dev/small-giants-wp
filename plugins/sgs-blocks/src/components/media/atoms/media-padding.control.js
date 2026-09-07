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
import { patchTier } from '../../../utils/patch-tier.js';
import { attrKey, validate } from './media-padding.js';

const BOX_CONTROL_TIER_TO_ATTR_TIER = { base: 'desktop', tablet: 'tablet', mobile: 'mobile' };

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
	const key = attrKey( prefix, blockSlug );
	const tiers = attributes[ key ] && 'object' === typeof attributes[ key ] ? attributes[ key ] : {};

	return (
		<ResponsiveBoxControl
			key={ `${ blockSlug }-${ prefix }-media-padding` }
			label={ __( 'Padding', 'sgs-blocks' ) }
			values={ {
				base: tiers.desktop ?? {},
				tablet: tiers.tablet ?? {},
				mobile: tiers.mobile ?? {},
			} }
			onChange={ ( tier, next ) =>
				patchTier( attributes, setAttributes, key, BOX_CONTROL_TIER_TO_ATTR_TIER[ tier ], validate( next ) )
			}
		/>
	);
}
