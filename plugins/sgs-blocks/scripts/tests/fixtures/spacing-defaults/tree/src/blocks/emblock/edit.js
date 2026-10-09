import { SgsBoxControl, ResponsiveOverride, ResponsiveBoxControl } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<ResponsiveOverride value={ attributes.tagPadding } onChange={ ( obj ) => setAttributes( { tagPadding: obj } ) }>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsBoxControl label="Tag padding" values={ ownValue || {} } presets onChange={ setOwnValue } />
				) }
			</ResponsiveOverride>
			<ResponsiveOverride value={ attributes.labelPadding } onChange={ ( obj ) => setAttributes( { labelPadding: obj } ) }>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsBoxControl label="Label padding" values={ ownValue || {} } presets onChange={ setOwnValue } />
				) }
			</ResponsiveOverride>
		</>
	);
}
