import { ColorPalette } from './colour-picker';
import SgsGradientPicker from './gradient-picker';

export default function DesignTokenPicker( { value, onChange } ) {
	return (
		<>
			<ColorPalette value={ value } onChange={ onChange } />
			<SgsGradientPicker value={ value } onChange={ onChange } />
		</>
	);
}
