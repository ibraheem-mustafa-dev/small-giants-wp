/**
 * Forked from WordPress core (`@wordpress/components`
 * `circular-option-picker/circular-option-picker-actions.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { Button, Dropdown } from '@wordpress/components';

export function DropdownLinkAction( { buttonProps, className, dropdownProps, linkText } ) {
	return (
		<Dropdown
			className={ clsx(
				'components-circular-option-picker__dropdown-link-action',
				className
			) }
			renderToggle={ ( { isOpen, onToggle } ) => (
				<Button
					aria-expanded={ isOpen }
					aria-haspopup="true"
					onClick={ onToggle }
					variant="link"
					{ ...buttonProps }
				>
					{ linkText }
				</Button>
			) }
			{ ...dropdownProps }
		/>
	);
}

export function ButtonAction( { className, children, ...additionalProps } ) {
	return (
		<Button
			__next40pxDefaultSize
			className={ clsx(
				'components-circular-option-picker__clear',
				className
			) }
			variant="tertiary"
			{ ...additionalProps }
		>
			{ children }
		</Button>
	);
}
