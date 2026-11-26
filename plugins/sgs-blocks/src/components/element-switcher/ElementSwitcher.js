/**
 * ElementSwitcher: pick which part of a block a family panel (typography, border, shadow) is editing, so a block with
 * several such parts shows one full control set at a time. The shape is `TypographyControls.js::TypographyTargetSwitcher`
 * (the choice is local state, never a stored attribute; one part shows no switcher), drawn with the motion panel's choice
 * atom (segmented up to three short labels, a select beyond that) and its dot for a part that holds a value.
 *
 * The parts come from the block's `supports.sgs.elements`, not from a list each mount writes: `parts.js::switcherParts`
 * lists a part with settings in the family that the block draws now, and keeps a part that holds a value but is not drawn,
 * marked "not shown here".
 *
 * Use it as a wrapper with a render function, or take the chosen key with `onSelect` and `selected`:
 *
 *     <ElementSwitcher blockName={ name } clientId={ clientId } family="shadow" attributes={ attributes }>
 *         { ( part ) => <ShadowControl … /> }
 *     </ElementSwitcher>
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import { getBlockType } from '@wordpress/blocks';
import { useState } from '@wordpress/element';
import ChoiceAtom from '../motion/ChoiceAtom';
import { usePartKinds } from '../motion/use-part-kinds';
import { switcherOptions, switcherParts } from './parts';

/**
 * The attribute defaults of a registered block, by attribute name.
 *
 * @param {Object|undefined} attributes The block type's `attributes`.
 * @return {Object} `{ <attribute>: default }` for every attribute that has one.
 */
function defaultsOf( attributes ) {
	return Object.fromEntries(
		Object.entries( attributes || {} )
			.filter( ( [ , spec ] ) => spec && 'default' in spec )
			.map( ( [ name, spec ] ) => [ name, spec.default ] )
	);
}

/**
 * @param {Object}                  props
 * @param {string}                  props.blockName    The block's name; its `supports.sgs.elements` lists the parts.
 * @param {string}                  props.clientId     The block's client id, to read the media kind on each device.
 * @param {string}                  props.family       `shadow`, `border` or `typography`.
 * @param {Object}                  props.attributes   The block's attributes.
 * @param {Object|null}             [props.elements]   `supports.sgs.elements`; read from the block type when absent.
 * @param {string}                  [props.label]      The row's label.
 * @param {string}                  [props.selected]   The chosen part, when the caller owns the choice.
 * @param {Function}                [props.onSelect]   Receives the chosen part key, when the caller owns the choice.
 * @param {Function|JSX.Element}    [props.children]   `( partKey ) => element`, drawn under the switcher for the chosen part.
 * @return {JSX.Element|null} The switcher and the chosen part's controls; the controls alone when one part is listed.
 */
export default function ElementSwitcher( {
	blockName,
	clientId,
	family,
	attributes,
	elements,
	label = __( 'Editing', 'sgs-blocks' ),
	selected,
	onSelect,
	children,
} ) {
	const type = getBlockType( blockName );
	const kindsOf = usePartKinds( clientId, blockName );
	const [ own, setOwn ] = useState( null );
	const parts = switcherParts( {
		elements: elements ?? type?.supports?.sgs?.elements,
		family,
		attributes,
		supportsSgs: type?.supports?.sgs,
		kindsOf,
		defaults: defaultsOf( type?.attributes ),
	} );
	if ( 0 === parts.length ) {
		return null;
	}
	const requested = undefined === selected ? own : selected;
	const current = parts.some( ( part ) => part.value === requested )
		? requested
		: parts[ 0 ].value;
	const render =
		'function' === typeof children ? children( current ) : children;
	if ( 1 === parts.length ) {
		return render ?? null;
	}
	return (
		<>
			<ChoiceAtom
				label={ label }
				help={ __(
					'A dot marks a part that already has a value here.',
					'sgs-blocks'
				) }
				options={ switcherOptions( parts ) }
				value={ current }
				onChange={ ( next ) => {
					setOwn( next );
					onSelect?.( next );
				} }
				emptyLabel={ null }
			/>
			{ render }
		</>
	);
}
