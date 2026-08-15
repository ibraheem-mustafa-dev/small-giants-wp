/**
 * Forked from WordPress core (`@wordpress/components`
 * `circular-option-picker/circular-option-picker.tsx`),
 * commit 28c0dedc4eaf001a24237a1fbba4b0887698b000 (WP 7.0.4).
 *
 * External dependencies
 */
import clsx from 'clsx';

/**
 * WordPress dependencies
 */
import { useInstanceId } from '@wordpress/compose';
import { isRTL } from '@wordpress/i18n';
import { useMemo, useState } from '@wordpress/element';
import { Composite } from '@wordpress/components';

/**
 * Internal dependencies
 */
import { CircularOptionPickerContext } from './circular-option-picker-context';
import { Option } from './circular-option-picker-option';
import { OptionGroup } from './circular-option-picker-option-group';
import { ButtonAction, DropdownLinkAction } from './circular-option-picker-actions';

// No stylesheet import — this fork keeps core's own `.components-circular-
// option-picker*` class names, already styled by the globally-loaded
// wp-components stylesheet. See color-palette/index.js's identical note.

/**
 *`CircularOptionPicker` is a component that displays a set of options as circular buttons.
 */

function ListboxCircularOptionPicker( props ) {
	const {
		actions,
		options,
		baseId,
		className,
		loop = true,
		children,
		...additionalProps
	} = props;

	const [ activeId, setActiveId ] = useState( undefined );

	const contextValue = useMemo(
		() => ( {
			baseId,
			activeId,
			setActiveId,
		} ),
		[ baseId, activeId, setActiveId ]
	);

	return (
		<div className={ className }>
			<CircularOptionPickerContext.Provider value={ contextValue }>
				<Composite
					{ ...additionalProps }
					id={ baseId }
					focusLoop={ loop }
					rtl={ isRTL() }
					role="listbox"
					activeId={ activeId }
					setActiveId={ setActiveId }
				>
					{ options }
				</Composite>
				{ children }
				{ actions }
			</CircularOptionPickerContext.Provider>
		</div>
	);
}

function ButtonsCircularOptionPicker( props ) {
	const { actions, options, children, baseId, ...additionalProps } = props;

	const contextValue = useMemo(
		() => ( {
			baseId,
		} ),
		[ baseId ]
	);

	return (
		<div { ...additionalProps } role="group" id={ baseId }>
			<CircularOptionPickerContext.Provider value={ contextValue }>
				{ options }
				{ children }
				{ actions }
			</CircularOptionPickerContext.Provider>
		</div>
	);
}

function CircularOptionPicker( props ) {
	const {
		asButtons,
		actions: actionsProp,
		options: optionsProp,
		children,
		className,
		...additionalProps
	} = props;

	const baseId = useInstanceId(
		CircularOptionPicker,
		'components-circular-option-picker',
		additionalProps.id
	);

	const OptionPickerImplementation = asButtons
		? ButtonsCircularOptionPicker
		: ListboxCircularOptionPicker;

	const actions = actionsProp ? (
		<div className="components-circular-option-picker__custom-clear-wrapper">
			{ actionsProp }
		</div>
	) : undefined;

	const options = (
		<div className="components-circular-option-picker__swatches">
			{ optionsProp }
		</div>
	);

	return (
		<OptionPickerImplementation
			{ ...additionalProps }
			baseId={ baseId }
			className={ clsx( 'components-circular-option-picker', className ) }
			actions={ actions }
			options={ options }
		>
			{ children }
		</OptionPickerImplementation>
	);
}

CircularOptionPicker.Option = Option;
CircularOptionPicker.OptionGroup = OptionGroup;
CircularOptionPicker.ButtonAction = ButtonAction;
CircularOptionPicker.DropdownLinkAction = DropdownLinkAction;

CircularOptionPicker.displayName = 'CircularOptionPicker';

export default CircularOptionPicker;
