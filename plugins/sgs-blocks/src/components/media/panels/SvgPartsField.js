/**
 * The background SVG's part animation (Spec 49 §8 `SvgParts`, `SvgPartsTrigger`): today's `SvgPartsControls` reading the
 * slot's two §8 attributes. Both rows name this field and `ONCE_PER_PANEL` mounts it once. The model shows it only
 * for a background whose kind is SVG at the device.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import SvgPartsControls from '../../SvgPartsControls.js';
import { mediaAttrName } from '../../MediaElementControls.js';

export default function SvgPartsField( { attributes, setAttributes, prefix } ) {
	return (
		<SvgPartsControls
			attributes={ attributes }
			setAttributes={ setAttributes }
			names={ { parts: mediaAttrName( prefix, 'SvgParts' ), trigger: mediaAttrName( prefix, 'SvgPartsTrigger' ) } }
			label={ __( 'Background SVG parts', 'sgs-blocks' ) }
			defaultTrigger="load"
			hover={ false }
		/>
	);
}
