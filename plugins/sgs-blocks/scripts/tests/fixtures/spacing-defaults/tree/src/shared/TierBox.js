import { SgsBoxControl, ResponsiveOverride, ResponsiveBoxControl } from '../../components';

export default function TierBox( { label, attr, attributes, setAttributes } ) {
	return (
		<ResponsiveOverride value={ attributes[ attr ] } onChange={ ( obj ) => setAttributes( { [ attr ]: obj } ) }>
			{ ( { ownValue, setOwnValue } ) => (
				<SgsBoxControl label={ label } values={ ownValue || {} } presets onChange={ setOwnValue } />
			) }
		</ResponsiveOverride>
	);
}
