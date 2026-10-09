import { SgsBoxControl, ResponsiveOverride, ResponsiveBoxControl } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<>
			<ResponsiveOverride value={ attributes.padding } onChange={ ( obj ) => setAttributes( { padding: obj } ) }>
				{ ( { ownValue, setOwnValue } ) => (
					<SgsBoxControl label="Padding" values={ ownValue || {} } presets onChange={ setOwnValue } />
				) }
			</ResponsiveOverride>
			<ResponsiveBoxControl
				label="Margin"
				presets
				values={ { base: attributes.margin?.desktop ?? {} } }
				onChange={ ( tier, next ) => setAttributes( { margin: { ...attributes.margin, desktop: next } } ) }
			/>
		</>
	);
}
