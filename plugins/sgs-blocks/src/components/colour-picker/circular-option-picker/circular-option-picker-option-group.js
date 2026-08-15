/**
 * Forked from WordPress core (`@wordpress/components`
 * `circular-option-picker/circular-option-picker-option-group.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * External dependencies
 */
import clsx from 'clsx';

export function OptionGroup( { className, options, ...additionalProps } ) {
	const role =
		'aria-label' in additionalProps || 'aria-labelledby' in additionalProps
			? 'group'
			: undefined;

	return (
		<div
			{ ...additionalProps }
			role={ role }
			className={ clsx(
				'components-circular-option-picker__option-group',
				'components-circular-option-picker__swatches',
				className
			) }
		>
			{ options }
		</div>
	);
}
