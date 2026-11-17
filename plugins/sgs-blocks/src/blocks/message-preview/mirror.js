/**
 * sgs/message-preview: copies what the visitor types into the matching preview lines.
 *
 * A fields block is `[data-sgs-message-preview][data-group="<group>"]` holding
 * `[data-sgs-mp-input][data-field="<key>"]` boxes. A line block, anywhere in the document, is
 * `[data-sgs-mp-line][data-group="<group>"][data-field="<key>"]` carrying `data-prefix`, `data-suffix` and
 * `data-fallback`. Visitor text goes in through `textContent`, never markup.
 *
 * Session copy (off by default; the setting prints `data-remember="true"`): every keystroke writes all of the
 * block's fields as one JSON object, `{ "<field key>": "<value>" }`, to `sessionStorage[ STORAGE_PREFIX + <group> ]`.
 * A checkout gift-message field can read that key to pre-fill itself. Nothing is read back here and nothing is
 * ever sent to a server.
 *
 * @package
 */

export const STORAGE_PREFIX = 'sgs-message-preview:';

/**
 * The text a preview line shows for a field value.
 *
 * @param {string} value          Field value.
 * @param {Object} parts          What surrounds the value.
 * @param {string} parts.prefix   Text before a filled value.
 * @param {string} parts.suffix   Text after a filled value.
 * @param {string} parts.fallback Text shown while the value is blank.
 * @return {string} Line text: prefix + value + suffix, or the fallback when the value is blank.
 */
export function lineText( value, { prefix = '', suffix = '', fallback = '' } ) {
	return String( value ).trim() === '' ? fallback : prefix + value + suffix;
}

/**
 * Wire one `[data-sgs-message-preview]` element to the lines of its group.
 *
 * @param {HTMLElement} root The fields block's root element.
 */
export function initialiseMessagePreview( root ) {
	const group = root.getAttribute( 'data-group' ) || '';
	const doc = root.ownerDocument;
	const inputs = Array.from( root.querySelectorAll( '[data-sgs-mp-input]' ) );
	const remember = root.getAttribute( 'data-remember' ) === 'true';
	const storageKey = STORAGE_PREFIX + group;

	// Read at each keystroke: a line block can sit anywhere, and the page may add one after load.
	const linesFor = ( key ) =>
		Array.from( doc.querySelectorAll( '[data-sgs-mp-line]' ) ).filter(
			( line ) =>
				line.getAttribute( 'data-group' ) === group &&
				line.getAttribute( 'data-field' ) === key
		);

	const sync = ( input ) => {
		linesFor( input.getAttribute( 'data-field' ) ).forEach( ( line ) => {
			line.textContent = lineText( input.value, {
				prefix: line.getAttribute( 'data-prefix' ) || '',
				suffix: line.getAttribute( 'data-suffix' ) || '',
				fallback: line.getAttribute( 'data-fallback' ) || '',
			} );
		} );
	};

	const store = () => {
		const note = {};
		inputs.forEach( ( input ) => {
			note[ input.getAttribute( 'data-field' ) ] = input.value;
		} );
		try {
			window.sessionStorage.setItem( storageKey, JSON.stringify( note ) );
		} catch ( error ) {
			// Storage can be blocked: the preview still works.
		}
	};

	inputs.forEach( ( input ) => {
		sync( input );
		input.addEventListener( 'input', () => {
			sync( input );
			if ( remember ) {
				store();
			}
		} );
	} );
}

/**
 * Wire every fields block in a document.
 *
 * @param {Document} doc Document to search.
 */
export function initialiseAll( doc = document ) {
	doc.querySelectorAll( '[data-sgs-message-preview]' ).forEach(
		initialiseMessagePreview
	);
}
