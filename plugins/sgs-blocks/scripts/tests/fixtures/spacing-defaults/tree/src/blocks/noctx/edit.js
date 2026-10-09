import { ResponsiveBoxControl } from '../../components';
import { spacingDefaultsFor } from '../../utils/spacing-defaults';

export default function Edit( { attributes, setAttributes, name } ) {
	return (
		<ResponsiveBoxControl
			label="Padding"
			presets
			defaults={ spacingDefaultsFor( name, 'padding' ) }
			values={ { base: attributes.padding?.desktop ?? {} } }
			onChange={ ( tier, next ) => setAttributes( { padding: { ...attributes.padding, desktop: next } } ) }
		/>
	);
}
