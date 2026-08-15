/**
 * Forked from WordPress core (`@wordpress/components`
 * `dropdown/dropdown-content-wrapper.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * Deviations from source:
 *  - `contextConnect`/`useContextSystem` (core's private polymorphic
 *    "context-connect" system) are stripped — see `../color-picker/component.js`
 *    for the full reasoning; this fork's usage never sits inside a matching
 *    context `<Provider>`.
 *  - The `DropdownContentWrapperDiv` `styled()` (`@emotion/styled`) wrapper
 *    from core's `./styles` is replaced with a plain `<div>` carrying a
 *    class from `./style.scss`.
 *
 * WordPress dependencies
 */
import { forwardRef } from '@wordpress/element';
import clsx from 'clsx';

// Stylesheet imported once, globally, from src/blocks/extensions/index.js —
// NOT here. See color-picker/component.js's identical note for why.

function UnconnectedDropdownContentWrapper( props, forwardedRef ) {
	const { paddingSize = 'small', className, ...derivedProps } = props;

	return (
		<div
			{ ...derivedProps }
			ref={ forwardedRef }
			className={ clsx(
				'sgs-colour-picker__dropdown-content-wrapper',
				`sgs-colour-picker__dropdown-content-wrapper--padding-${ paddingSize }`,
				className
			) }
		/>
	);
}

/**
 * A convenience wrapper for the `renderContent` when you want to apply
 * different padding. (Default is `paddingSize="small"`).
 */
export const DropdownContentWrapper = forwardRef( UnconnectedDropdownContentWrapper );

export default DropdownContentWrapper;
