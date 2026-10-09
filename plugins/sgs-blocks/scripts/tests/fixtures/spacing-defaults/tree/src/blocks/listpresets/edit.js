import { SgsBoxControl, ResponsiveOverride, ResponsiveBoxControl } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<ResponsiveOverride value={ attributes.padding } onChange={ ( obj ) => setAttributes( { padding: obj } ) }>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsBoxControl label="Padding" values={ ownValue || {} } presets={ [ '20', '30' ] } onChange={ setOwnValue } />
				) }
			</ResponsiveOverride>
		</>
	);
}
