/**
 * One row of a media panel: the mapped field plus the note that says which
 * device's value it shows (Spec 49 §9.2).
 *
 * @package SGS\Blocks
 */
import { __, sprintf } from '@wordpress/i18n';

import { COMPONENT_MAP, OWN_NOTE } from './component-map.js';
import { translateReason } from './reasons.js';
import { deviceNote, rowIO } from './row-io.js';

/**
 * @param {Object}   props
 * @param {Object}   props.row           A panel-model row.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.prefix        Surface prefix.
 * @param {string}   props.blockSlug     Block slug.
 * @param {string}   props.device        Active device.
 * @param {string}   props.kind          The slot's kind at the device.
 * @param {Object}   [props.slot]        `{ prefix, kinds, context }`, for the fields that read the whole slot.
 * @return {JSX.Element|null} The row, or null when nothing can be drawn.
 */
export default function PanelRow( { row, attributes, setAttributes, prefix, blockSlug, device, kind, slot } ) {
	const Field = COMPONENT_MAP[ row.setting.control.component ];
	if ( ! Field ) {
		// A field that is not built yet leaves a disabled row's reason as a line of
		// text, so the person still reads why nothing is offered.
		return 'disabled' === row.state.state && row.state.hiddenReason ? (
			<p className="sgs-media-panel__hint">{ translateReason( row.state.hiddenReason ) }</p>
		) : null;
	}

	const io = rowIO( row, attributes, setAttributes, device, prefix, blockSlug );
	const note = OWN_NOTE.includes( row.setting.control.component ) ? null : deviceNote( io, device );
	let noteText = '';
	if ( note && 'all' === note.kind ) {
		noteText = __( 'Applies to all devices', 'sgs-blocks' );
	} else if ( note ) {
		noteText = note.from
			? /* translators: 1: device being edited, 2: the wider device whose value is used. */
			  sprintf( __( '%1$s: using %2$s', 'sgs-blocks' ), note.device, note.from )
			: /* translators: %s: device being edited. */
			  sprintf( __( '%s: default', 'sgs-blocks' ), note.device );
	}

	return (
		<div className="sgs-media-panel__row" data-sgs-base={ row.setting.base }>
			<Field
				row={ row }
				io={ io }
				attributes={ attributes }
				setAttributes={ setAttributes }
				prefix={ prefix }
				blockSlug={ blockSlug }
				kind={ kind }
				slot={ slot }
			/>
			{ noteText && <p className="sgs-media-panel__note">{ noteText }</p> }
		</div>
	);
}
