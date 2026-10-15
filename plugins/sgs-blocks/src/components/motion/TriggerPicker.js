/**
 * TriggerPicker: when a motion layer plays. It offers exactly the triggers the panel's schema entry allows (§6.2),
 * narrowed to the ones the effect supports (`fx_effects.triggers`) and to the ones the block can use: a layer that
 * waits for a named state needs a state the block declares. Choosing `state` shows a second choice for the state name.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import defs from './motion-defs';
import ChoiceAtom from './ChoiceAtom';

const DEFS = defs.$defs;

// The schema entry whose `trigger` enum is each panel's trigger list.
const PANEL_ENTRIES = Object.freeze( {
	hover: 'HoverEffect',
	entrance: 'EntranceBase',
	'entrance-text': 'EntranceTextEffect',
	effects: 'EffectLayer',
} );

const TRIGGER_LABELS = Object.freeze( {
	hover: __( 'Hover or focus', 'sgs-blocks' ),
	load: __( 'Page loads', 'sgs-blocks' ),
	scroll: __( 'Scrolls into view', 'sgs-blocks' ),
	visible: __( 'Becomes visible', 'sgs-blocks' ),
	open: __( 'Opens', 'sgs-blocks' ),
	state: __( 'State changes', 'sgs-blocks' ),
	pointerdown: __( 'Pressed', 'sgs-blocks' ),
	click: __( 'Clicked', 'sgs-blocks' ),
} );

/**
 * The triggers a panel may offer.
 *
 * @param {Object}   args
 * @param {string}   args.panel                  `hover`, `entrance`, `entrance-text` or `effects`.
 * @param {string[]} [args.effectTriggers]       The effect's `fx_effects.triggers`; omitted for a panel without an effect.
 * @param {string[]} [args.states]               The states the block declares; `state` is dropped when there are none.
 * @param {string[]} [args.exclude]             Triggers to drop (for example `open` on a part no disclosure opens).
 * @return {string[]} The trigger names, in schema order.
 */
export function triggersFor( {
	panel,
	effectTriggers,
	states = [],
	exclude = [],
} ) {
	const entry = PANEL_ENTRIES[ panel ];
	const allowed = entry
		? DEFS[ entry ]?.properties?.trigger?.enum || []
		: [];
	return allowed.filter(
		( trigger ) =>
			( ! effectTriggers || effectTriggers.includes( trigger ) ) &&
			! exclude.includes( trigger ) &&
			( trigger !== 'state' || states.length > 0 )
	);
}

const humanise = ( value ) => {
	const text = value.replace( /-/g, ' ' );
	return text.charAt( 0 ).toUpperCase() + text.slice( 1 );
};

/**
 * @param {Object}   props
 * @param {string}   props.panel            `hover`, `entrance`, `entrance-text` or `effects`.
 * @param {string}   [props.label]          Field label.
 * @param {string}   [props.value]          The chosen trigger.
 * @param {Function} props.onChange         Receives the chosen trigger.
 * @param {string[]} [props.effectTriggers] The effect's `fx_effects.triggers`.
 * @param {string[]} [props.states]         The states the block declares (`supports.sgs.motion.states`).
 * @param {string[]} [props.exclude]        Triggers to drop.
 * @param {Object}   [props.labels]         Replacement labels by trigger, for a panel that words them differently.
 * @param {string}   [props.state]          The chosen state name, when the trigger is `state`.
 * @param {Function} [props.onStateChange]  Receives the chosen state name.
 * @param {string}   [props.help]           Hint text.
 * @return {Element|null} The control, or null when the panel has no trigger to choose.
 */
export default function TriggerPicker( {
	panel,
	label = __( 'Start when', 'sgs-blocks' ),
	value,
	onChange,
	effectTriggers,
	states = [],
	exclude,
	labels = {},
	state,
	onStateChange,
	help,
} ) {
	const triggers = triggersFor( { panel, effectTriggers, states, exclude } );
	if ( triggers.length === 0 ) {
		return null;
	}
	const options = triggers.map( ( trigger ) => ( {
		value: trigger,
		label: labels[ trigger ] || TRIGGER_LABELS[ trigger ] || humanise( trigger ),
	} ) );
	return (
		<>
			<ChoiceAtom
				label={ label }
				help={ help }
				options={ options }
				fieldNode={ { enum: triggers } }
				value={ value }
				onChange={ onChange }
				emptyLabel={ null }
			/>
			{ value === 'state' && onStateChange && (
				<ChoiceAtom
					label={ __( 'State', 'sgs-blocks' ) }
					options={ states.map( ( name ) => ( {
						value: name,
						label: humanise( name ),
					} ) ) }
					value={ state }
					onChange={ onStateChange }
				/>
			) }
		</>
	);
}
