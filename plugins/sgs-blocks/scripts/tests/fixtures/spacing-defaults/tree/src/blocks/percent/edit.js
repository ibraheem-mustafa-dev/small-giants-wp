import { SgsBoxControl, ResponsiveOverride, ResponsiveBoxControl } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<ResponsiveOverride value={ attributes.padding } onChange={ ( obj ) => setAttributes( { padding: obj } ) }>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsBoxControl label="Padding" values={ ownValue || {} } presets onChange={ setOwnValue } />
				) }
			</ResponsiveOverride>
			<ResponsiveOverride value={ attributes.margin } onChange={ ( obj ) => setAttributes( { margin: obj } ) }>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsBoxControl label="Margin" values={ ownValue || {} } presets onChange={ setOwnValue } />
				) }
			</ResponsiveOverride>
		</>
	);
}
