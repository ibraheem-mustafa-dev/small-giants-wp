import { RangeControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ResponsiveOverride from '../../../../src/components/ResponsiveOverride';

// Wrapper and inner labels genuinely differ — must NOT flag.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label={ __( 'Icon size (px)', 'sgs-blocks' ) }
			value={ attributes.iconSize }
			onChange={ ( obj ) => setAttributes( { iconSize: obj } ) }
		>
			{ ( { ownValue, setOwnValue } ) => (
				<RangeControl
					label={ __( 'Size in pixels', 'sgs-blocks' ) }
					value={ ownValue || 16 }
					onChange={ ( val ) => setOwnValue( val ) }
				/>
			) }
		</ResponsiveOverride>
	);
}
