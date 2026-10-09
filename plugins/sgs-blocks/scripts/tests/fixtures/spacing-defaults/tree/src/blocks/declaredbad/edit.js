import { ResponsiveBoxControl } from '../../components';

export default function Edit( { attributes, setAttributes } ) {
	return (
		<ResponsiveBoxControl
			label="Padding"
			presets
			values={ { base: attributes.padding?.desktop ?? {} } }
			onChange={ ( tier, next ) => setAttributes( { padding: { ...attributes.padding, desktop: next } } ) }
		/>
	);
}
