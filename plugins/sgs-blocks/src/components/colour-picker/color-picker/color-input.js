/**
 * Forked from WordPress core (`@wordpress/components` `color-picker/color-input.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * Internal dependencies
 */
import { RgbInput } from './rgb-input';
import { HslInput } from './hsl-input';
import { HexInput } from './hex-input';

export const ColorInput = ( { colorType, color, onChange, enableAlpha } ) => {
	const props = { color, onChange, enableAlpha };
	switch ( colorType ) {
		case 'hsl':
			return <HslInput { ...props } />;
		case 'rgb':
			return <RgbInput { ...props } />;
		default:
		case 'hex':
			return <HexInput { ...props } />;
	}
};
