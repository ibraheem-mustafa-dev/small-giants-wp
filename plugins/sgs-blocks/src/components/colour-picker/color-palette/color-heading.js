/**
 * Forked/adapted from WordPress core (`@wordpress/components`
 * `color-palette/styles.ts`), commit 28c0dedc4eaf001a24237a1fbba4b0887698b000
 * (WP 7.0.4).
 *
 * Deviation from source: core's `ColorHeading = styled( Heading )` (emotion)
 * is replaced with a plain `Heading` carrying a class from `./style.scss`
 * (`font-weight: CONFIG.fontWeightMedium` = 499 — verified against this
 * commit's `utils/config-values.js`). This project has no `@emotion/styled`
 * dependency — see `../color-picker/style.scss` header for the full
 * reasoning.
 *
 * External dependencies
 */
import clsx from 'clsx';

/**
 * Internal dependencies
 */
import { Heading } from '../../primitives';

export function ColorHeading( { className, ...props } ) {
	return (
		<Heading
			{ ...props }
			className={ clsx( 'sgs-colour-picker__colour-heading', className ) }
		/>
	);
}
