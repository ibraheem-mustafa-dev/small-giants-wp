import { RangeControl } from '@wordpress/components';

export function DurationControl( { value, onChange } ) {
	return <RangeControl value={ value } onChange={ onChange } min={ 0 } max={ 5000 } />;
}
