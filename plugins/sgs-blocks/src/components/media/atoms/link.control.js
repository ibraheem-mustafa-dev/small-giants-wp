/**
 * `link` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `link.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`). Mounts the same shared
 * `LinkPopoverField` (`src/components/LinkPopoverControl.js`) the Spec 35 §2
 * LINK standard already promoted from `sgs/button`'s Bean-approved popover —
 * `targetMode="boolean"` maps this atom's plain `LinkOpensNewTab` boolean
 * to/from the shared component's `linkTarget` field at the edge, exactly as
 * the hand-rolled version this atom replaces did.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';

import LinkPopoverField from '../../LinkPopoverControl.js';
import { attrKeys } from './link.js';

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
		<LinkPopoverField
			key={ `${ blockSlug }-${ prefix }-link` }
			label={ __( 'Link', 'sgs-blocks' ) }
			help={ __(
				'Search your site or paste a URL to wrap the image in a link. Leave empty for no link.',
				'sgs-blocks'
			) }
			value={ {
				url: attributes[ keys.url ] || '',
				linkTarget: attributes[ keys.newTab ] ? '_blank' : '_self',
				rel: attributes[ keys.rel ] || '',
			} }
			targetMode="boolean"
			onChange={ ( next ) => {
				const patch = {};
				if ( undefined !== next.url ) {
					patch[ keys.url ] = next.url;
				}
				if ( undefined !== next.linkTarget ) {
					patch[ keys.newTab ] = '_blank' === next.linkTarget;
				}
				if ( undefined !== next.rel ) {
					patch[ keys.rel ] = next.rel;
				}
				setAttributes( patch );
			} }
		/>
	);
}
