import { GradientPicker } from '@wordpress/components';

export default function Picker( { value, onChange } ) {
	return <GradientPicker value={ value } onChange={ onChange } />;
}
