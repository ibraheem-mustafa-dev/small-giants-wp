import { RangeControl } from '@wordpress/components';

export function EffectsPanel( { value, onChange } ) {
	return (
		<RangeControl
			label="Duration"
			value={ value }
			onChange={ onChange }
			min={ 0 }
			max={ 5000 }
		/>
	);
}
