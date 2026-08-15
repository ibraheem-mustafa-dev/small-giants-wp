/**
 * Forked from WordPress core (`@wordpress/components` `color-picker/legacy-adapter.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * Internal dependencies
 */
import ColorPicker from './component';
import { useDeprecatedProps } from './use-deprecated-props';

export const LegacyAdapter = ( props ) => {
	return <ColorPicker { ...useDeprecatedProps( props ) } />;
};
