/**
 * `caption` atom — CONTROL half (JSX).
 *
 * Split from the pure logic in `caption.js` per the purity contract
 * (`scripts/check-media-atom-purity.js`).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { SelectControl, TextControl } from '@wordpress/components';

import { attrKeys, validateTag } from './caption.js';

/**
 * Bare control rows: caption text, then caption tag. Never its own
 * `<InspectorControls>` — the caller mounts these inside its own panel.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes
 * @param {Function} props.setAttributes
 * @param {string}   [props.prefix]
 * @param {string}   [props.blockSlug]
 * @return {JSX.Element[]} Two rows: caption text, caption tag.
 */
export function control( { attributes, setAttributes, prefix = '', blockSlug = '' } ) {
	const keys = attrKeys( prefix, blockSlug );

	return [
		<TextControl
			key="caption-text"
			label={ __( 'Caption', 'sgs-blocks' ) }
			value={ attributes[ keys.caption ] || '' }
			onChange={ ( value ) => setAttributes( { [ keys.caption ]: value } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>,
		<SelectControl
			key="caption-tag"
			label={ __( 'Caption tag', 'sgs-blocks' ) }
			value={ attributes[ keys.tag ] || 'figcaption' }
			options={ [
				{
					label: __( 'Figure caption (figcaption)', 'sgs-blocks' ),
					value: 'figcaption',
				},
				{ label: __( 'Div', 'sgs-blocks' ), value: 'div' },
			] }
			onChange={ ( value ) => setAttributes( { [ keys.tag ]: validateTag( value ) } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>,
	];
}
