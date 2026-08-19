import { BoxControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import ResponsiveOverride from '../../../../src/components/ResponsiveOverride';

// Even WITH hideLabelFromVision, BoxControl ignores the prop (proven live
// against WP 7.0.4's own box-control source, commit 895aef9b) — so this is
// still a DEFECT, the exception to the general suppression rule.
export default function Edit( { attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label={ __( 'Content band padding', 'sgs-blocks' ) }
			value={ attributes.contentBandPadding }
			onChange={ ( obj ) => setAttributes( { contentBandPadding: obj } ) }
		>
			{ ( { ownValue, setOwnValue } ) => (
				<BoxControl
					label={ __( 'Content band padding', 'sgs-blocks' ) }
					hideLabelFromVision
					values={ ownValue }
					onChange={ setOwnValue }
				/>
			) }
		</ResponsiveOverride>
	);
}
