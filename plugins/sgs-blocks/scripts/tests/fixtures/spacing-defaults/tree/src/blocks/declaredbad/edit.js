import { ResponsiveBoxControl } from '../../components';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';

export default function Edit( { attributes, setAttributes, name } ) {
	return (
		<>
			<ResponsiveBoxControl
				label="Padding"
				presets
				values={ { base: attributes.padding?.desktop ?? {} } }
				onChange={ ( tier, next ) => setAttributes( { padding: { ...attributes.padding, desktop: next } } ) }
			/>
			<ResponsiveBoxControl
				label="Margin"
				presets
				sides={ [ 'top' ] }
				defaults={ spacingDefaultsFor( name, 'padding' ) }
				values={ { base: attributes.margin?.desktop ?? {} } }
				onChange={ ( tier, next ) => setAttributes( { margin: { ...attributes.margin, desktop: next } } ) }
			/>
		</>
	);
}
