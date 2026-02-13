/**
 * Token resolvers — convert theme.json slugs to CSS custom property references.
 *
 * Usage in block edit/save:
 *   import { colourVar, spacingVar } from '../../utils';
 *   style={{ backgroundColor: colourVar('primary'), padding: spacingVar('40') }}
 */

export function colourVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--color--${ slug })`;
}

export function spacingVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--spacing--${ slug })`;
}

export function shadowVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--shadow--${ slug })`;
}

export function fontSizeVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--preset--font-size--${ slug })`;
}

export function borderRadiusVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--custom--border-radius--${ slug })`;
}

export function transitionVar( slug ) {
	if ( ! slug ) {
		return undefined;
	}
	return `var(--wp--custom--transition--${ slug })`;
}
