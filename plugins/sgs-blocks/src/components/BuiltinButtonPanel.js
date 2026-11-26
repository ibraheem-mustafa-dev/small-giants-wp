/**
 * The built-in button kit's editor panel mount.
 *
 * A block that renders a button itself (in PHP, tied to a shop or flow behaviour) declares it in
 * `supports.sgs.builtinButtons`: `{ prefix, part, label, groups }`. One `<BuiltinButtonPanel prefix="…" />` per declared
 * button shows the declared groups of the look set the kit generates for that prefix (`button-kit/registry.json`). A prefix
 * the block does not declare renders nothing.
 *
 * The panels load on first use as one shared chunk, so the block bundles that import this component do not each carry a
 * copy of the controls.
 *
 * The entry may carry `showWhen` (the condition under which the PHP prints the button, `kitShown.js`): while it does not
 * hold, the panel and the colour rows are not offered. The colour rows go in the block's one main Colour panel when the block
 * passes `colourInMainPanel` and spreads `builtinButtonColourRows()` into that panel's `rows`; otherwise they stay in the
 * kit's own Colour panel.
 *
 * @package
 */
import { getBlockType } from '@wordpress/blocks';
import { Suspense, lazy } from '@wordpress/element';

import registry from './button-kit/registry.json';
import { buttonKitColourRows } from './button-kit/colour-rows';
import { kitShown } from './kitShown';

const BuiltinButtonPanelBody = lazy( () =>
	import(
		/* webpackChunkName: "builtin-button-panel" */ './button-kit/BuiltinButtonPanelBody.js'
	)
);

/**
 * The attribute name for one registry base of a declared button (the twin of PHP `sgs_builtin_button_attr()`).
 *
 * @param {string} prefix Button prefix, for example 'arrow'.
 * @param {string} base   Registry base, for example 'ColourBackground'.
 * @return {string} `prefix + base`.
 */
export function builtinButtonAttrName( prefix, base ) {
	return prefix + base;
}

/**
 * Every attribute name the kit generates for a button's groups.
 *
 * @param {string}   prefix   Button prefix.
 * @param {string[]} [groups] Declared groups; omitted means the registry's default groups.
 * @return {string[]} The attribute names.
 */
export function builtinButtonAttrKeys( prefix, groups ) {
	const shown =
		Array.isArray( groups ) && groups.length
			? groups
			: registry.defaultGroups;
	return shown.flatMap( ( group ) =>
		( registry.groups[ group ] || [] ).map( ( row ) =>
			builtinButtonAttrName( prefix, row.base )
		)
	);
}

/**
 * A block's declaration for one built-in button, or null.
 *
 * @param {string} blockName Block name, for example 'sgs/buybox'.
 * @param {string} prefix    Button prefix.
 * @return {Object|null} The `builtinButtons` entry for this prefix.
 */
export function declaredButton( blockName, prefix ) {
	const entries = getBlockType( blockName )?.supports?.sgs?.builtinButtons;
	return Array.isArray( entries )
		? entries.find( ( e ) => e?.prefix === prefix ) || null
		: null;
}

/**
 * The kit's colour rows for one declared button, for a block's own main `SgsColourPanel`: headed Background and Text rows
 * (and Border when the button declares no border control). Empty when the block does not declare the prefix, the button is
 * not printed (`showWhen`), or the button declares no `colour` group.
 *
 * @param {Object}   args
 * @param {Object}   args.attributes    Block attributes.
 * @param {Function} args.setAttributes Block `setAttributes`.
 * @param {string}   args.blockName     Block name.
 * @param {string}   args.prefix        The button's attribute prefix.
 * @return {Array} Rows to spread into `SgsColourPanel`'s `rows`.
 */
export function builtinButtonColourRows( {
	attributes,
	setAttributes,
	blockName,
	prefix,
} ) {
	const entry = declaredButton( blockName, prefix );
	if ( ! entry || ! kitShown( entry, attributes ) ) {
		return [];
	}
	return buttonKitColourRows( {
		attributes,
		setAttributes,
		prefix,
		label: entry.label,
		groups: entry.groups,
	} );
}

/**
 * Mount one built-in button's panels.
 *
 * @param {Object}   props
 * @param {Object}   props.attributes      Block attributes.
 * @param {Function} props.setAttributes   Block `setAttributes`.
 * @param {string}   props.blockName       Block name, to read the button's `supports.sgs.builtinButtons` entry.
 * @param {string}   props.prefix          The button's attribute prefix.
 * @param {Function} [props.seedForPreset] Optional: given the preset slug just picked, returns further attributes to write with it
 *                                         (the product card seeds its colours and border from the preset).
 * @param {boolean}  [props.colourInMainPanel=false] True when the block draws this button's colour rows in its own main Colour panel
 *                                         through `builtinButtonColourRows()`, so the kit draws none.
 * @return {Object|null} The mounted panels, or null.
 */
export default function BuiltinButtonPanel( {
	attributes,
	setAttributes,
	blockName,
	prefix,
	seedForPreset,
	colourInMainPanel = false,
} ) {
	const entry = declaredButton( blockName, prefix );
	if ( ! entry || ! kitShown( entry, attributes ) ) {
		return null;
	}
	return (
		<Suspense fallback={ null }>
			<BuiltinButtonPanelBody
				attributes={ attributes }
				setAttributes={ setAttributes }
				blockName={ blockName }
				prefix={ prefix }
				label={ entry.label }
				groups={ entry.groups }
				seedForPreset={ seedForPreset }
				colourInMainPanel={ colourInMainPanel }
			/>
		</Suspense>
	);
}
