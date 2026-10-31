/**
 * AuthoredText — the editor canvas's print of a typed rich value (a setting edited with
 * `SgsFreeTextField type="rich"`), the twin of `sgs_rich_text_kses()` on the front end.
 *
 * It renders React elements built by `authoredTextNodes()` (src/utils/authored-text-nodes.js), never an HTML string:
 * only bold, italic, strikethrough, a link with a safe address and a line break reach the canvas. Use
 * `authoredTextPlain()` (src/utils/authored-text.js) where the canvas needs the words only.
 *
 * @package SGS\Blocks
 */
import { createElement } from '@wordpress/element';
import { authoredTextNodes } from '../utils/authored-text-nodes';

/**
 * @param {Object}  props
 * @param {*}       props.value   The typed value (HTML string or plain text).
 * @param {string}  [props.as]    The element to print inside (default `span`).
 * @param {boolean} [props.noLink] Drop links (the text prints inside a link or button).
 * @param {string[]} [props.formats] The setting's extra formats (`sgs/inline-photo`, `sgs/highlight`); none by default.
 * @param {Object}  [props.rest]  Any other prop goes to that element.
 * @return {JSX.Element} The element holding the rebuilt nodes.
 */
export default function AuthoredText( { value, as: Tag = 'span', noLink = false, formats = [], ...rest } ) {
	return createElement( Tag, rest, ...authoredTextNodes( value, { links: ! noLink, formats } ) );
}
