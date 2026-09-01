/**
 * `opacity` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `opacity.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { RangeControl } from '@wordpress/components';

import { attrKeys, validate } from './opacity.js';

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
		<RangeControl
			key={ `${ blockSlug }-${ prefix }-opacity` }
			label={ __( 'Opacity', 'sgs-blocks' ) }
			value={ attributes[ keys.opacity ] ?? 1 }
			min={ 0 }
			max={ 1 }
			step={ 0.05 }
			onChange={ ( value ) =>
				setAttributes( { [ keys.opacity ]: validate( value ?? 1 ) } )
			}
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);
}
