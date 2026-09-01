/**
 * `shadow` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `shadow.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`). Mounts the same shared
 * `ShadowControl` (`src/components/ShadowControl.js`) every other
 * shadow-capable block in the tree already uses, fed this atom's own
 * attribute names via `attrNames` — zero custom shadow-building logic here.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import ShadowControl from '../../ShadowControl.js';
import { attrKeys } from './shadow.js';

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
	return (
		<ShadowControl
			key={ `${ blockSlug }-${ prefix }-shadow` }
			label={ __( 'Box shadow', 'sgs-blocks' ) }
			attributes={ attributes }
			setAttributes={ setAttributes }
			attrNames={ {
				base: keys.base,
				colour: keys.colour,
				hoverColour: keys.hoverColour,
			} }
		/>
	);
}
