/**
 * DisabledRow: one control row that greys out with a plain reason (the pattern `sgs/media`'s border panel introduced:
 * Style and Colour wait for a width, and say so). With no `reason` it renders its children untouched, so a row that is
 * always live costs nothing. The row is a `fieldset`, so every control inside it switches off together, keyboard focus
 * included, and the reason is read out as the row's description.
 *
 * @package
 */

import { useInstanceId } from '@wordpress/compose';
import './DisabledRow.css';

/**
 * @param {Object}      props
 * @param {string}      [props.reason]    Why the row is off, in plain words; empty leaves the row live.
 * @param {string}      [props.className] Extra class for the wrapper.
 * @param {JSX.Element} props.children    The row's controls.
 * @return {JSX.Element} The row.
 */
export default function DisabledRow( {
	reason = '',
	className = '',
	children,
} ) {
	const id = useInstanceId( DisabledRow, 'sgs-disabled-row' );
	if ( ! reason ) {
		return children;
	}
	return (
		<fieldset
			className={ `sgs-disabled-row ${ className }`.trim() }
			disabled
			aria-describedby={ id }
		>
			{ children }
			<p id={ id } className="sgs-disabled-row__reason">
				{ reason }
			</p>
		</fieldset>
	);
}
