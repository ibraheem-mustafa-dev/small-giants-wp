/**
 * MediaSlotCaptionText: a slot's caption words. The renderer prints them through `sgs_rich_text_kses()`, so the field
 * takes bold, italic, strikethrough, a link and a line break, like every other typed rich setting.
 *
 * @package
 */
import SgsFreeTextField from '../SgsFreeTextField.js';

/**
 * @param {Object}   props
 * @param {string}   props.label    The field label.
 * @param {string}   props.value    The stored caption (HTML string).
 * @param {boolean}  props.disabled Whether the setting is off.
 * @param {string}   props.help     Why it is off, when it is.
 * @param {Function} props.onChange Receives the new HTML string.
 */
export default function MediaSlotCaptionText( { label, value, disabled, help, onChange } ) {
	return <SgsFreeTextField type="rich" label={ label } value={ value } disabled={ disabled } help={ help } onChange={ onChange } />;
}
