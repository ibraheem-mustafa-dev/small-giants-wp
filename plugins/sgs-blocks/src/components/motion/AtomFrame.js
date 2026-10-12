/**
 * AtomFrame: the shell every value atom renders inside. It places the control, its hint, the refusal message (read
 * out when it appears, and worded so it never relies on colour alone) and the Customised tag.
 *
 * @package
 */

import CustomisedTag from './CustomisedTag';

/**
 * @param {Object}      props
 * @param {string}      props.kind         The atom kind, for the class name (`duration`, `easing` ...).
 * @param {string}      [props.label]      The field's label, for the Reset button.
 * @param {string}      [props.help]       Hint text under the control.
 * @param {string|null} [props.error]      The refusal message, when the last edit was not saved.
 * @param {boolean}     [props.customised] Whether the field differs from its preset.
 * @param {Function}    [props.onReset]    Restores the preset's value.
 * @param {Element}     props.children     The control.
 * @return {Element} The framed atom.
 */
export default function AtomFrame( {
	kind,
	label,
	help,
	error,
	customised = false,
	onReset,
	children,
} ) {
	return (
		<div className={ `sgs-motion-atom sgs-motion-atom--${ kind }` }>
			{ children }
			{ help && ! error && (
				<p
					className="sgs-motion-atom__help"
					style={ { margin: '4px 0 0', fontSize: '12px' } }
				>
					{ help }
				</p>
			) }
			{ error && (
				<p
					className="sgs-motion-atom__error"
					role="alert"
					style={ {
						margin: '4px 0 0',
						fontSize: '12px',
						color: '#cc1818',
					} }
				>
					{ error }
				</p>
			) }
			<CustomisedTag
				changed={ customised }
				label={ label }
				onReset={ onReset }
			/>
		</div>
	);
}
