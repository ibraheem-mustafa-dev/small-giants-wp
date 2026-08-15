/**
 * Forked from WordPress core (`@wordpress/components`
 * `circular-option-picker/circular-option-picker-option.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { useInstanceId } from '@wordpress/compose';
import { forwardRef, useContext, useEffect } from '@wordpress/element';
import { Icon, check } from '@wordpress/icons';
import { Button, Composite } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { CircularOptionPickerContext } from './circular-option-picker-context';

function UnforwardedOptionAsButton( props, forwardedRef ) {
	const { isPressed, label, ...additionalProps } = props;
	return (
		<Button
			__next40pxDefaultSize
			{ ...additionalProps }
			aria-pressed={ isPressed }
			ref={ forwardedRef }
			label={ label }
		/>
	);
}

const OptionAsButton = forwardRef( UnforwardedOptionAsButton );

function UnforwardedOptionAsOption( props, forwardedRef ) {
	const { id, isSelected, label, ...additionalProps } = props;

	const { setActiveId, activeId } = useContext( CircularOptionPickerContext );

	useEffect( () => {
		if ( isSelected && ! activeId ) {
			// The setTimeout call is necessary to make sure that this update
			// doesn't get overridden by `Composite`'s internal logic, which picks
			// an initial active item if one is not specifically set.
			window.setTimeout( () => setActiveId?.( id ), 0 );
		}
	}, [ isSelected, setActiveId, activeId, id ] );

	return (
		<Composite.Item
			render={
				<Button
					__next40pxDefaultSize
					{ ...additionalProps }
					role="option"
					aria-selected={ !! isSelected }
					ref={ forwardedRef }
					label={ label }
				/>
			}
			id={ id }
		/>
	);
}

const OptionAsOption = forwardRef( UnforwardedOptionAsOption );

export function Option( {
	className,
	isSelected,
	selectedIconProps = {},
	tooltipText,
	...additionalProps
} ) {
	const { baseId, setActiveId } = useContext( CircularOptionPickerContext );
	const id = useInstanceId(
		Option,
		baseId || 'components-circular-option-picker__option'
	);

	const commonProps = {
		id,
		className: 'components-circular-option-picker__option',
		...additionalProps,
	};

	const isListbox = setActiveId !== undefined;
	const optionControl = isListbox ? (
		<OptionAsOption
			{ ...commonProps }
			label={ tooltipText }
			isSelected={ isSelected }
		/>
	) : (
		<OptionAsButton
			{ ...commonProps }
			label={ tooltipText }
			isPressed={ isSelected }
		/>
	);

	return (
		<div
			className={ clsx(
				className,
				'components-circular-option-picker__option-wrapper'
			) }
		>
			{ optionControl }
			{ isSelected && <Icon icon={ check } { ...selectedIconProps } /> }
		</div>
	);
}
