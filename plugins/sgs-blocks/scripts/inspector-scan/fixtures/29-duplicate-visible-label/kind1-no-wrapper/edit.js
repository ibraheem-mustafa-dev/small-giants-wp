import { RangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

// A bare control with no responsive wrapper at all — must NOT flag (nothing
// to double-paint against).
export default function Edit( { attributes, setAttributes } ) {
	return (
		<RangeControl
			label={ __( 'Icon size (px)', 'sgs-blocks' ) }
			value={ attributes.iconSize }
			onChange={ ( val ) => setAttributes( { iconSize: val } ) }
		/>
	);
}
