import { UnitControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ResponsiveOverride from '../../../../src/components/ResponsiveOverride';

// Same label on wrapper + inner, but hideLabelFromVision genuinely suppresses
// the paint here because UnitControl (unlike BoxControl) honours the prop —
// must NOT flag.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label={ __( 'Max width', 'sgs-blocks' ) }
			value={ attributes.maxWidth }
			onChange={ ( obj ) => setAttributes( { maxWidth: obj } ) }
		>
			{ ( { ownValue, setOwnValue } ) => (
				<UnitControl
					label={ __( 'Max width', 'sgs-blocks' ) }
					hideLabelFromVision
					value={ ownValue }
					onChange={ setOwnValue }
				/>
			) }
		</ResponsiveOverride>
	);
}
