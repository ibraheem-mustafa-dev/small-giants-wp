/**
 * The clip reveal's corner radius fields (`clipRound` on the entrance's from and to values): a rounded element keeps
 * its rounded corners while it is revealed. Offered under the Reveal (clip) row; a blank value is no radius, and a
 * Tablet or Mobile blank inherits the tier above.
 *
 * @package
 */

import { __ } from '@wordpress/i18n';
import DistanceAtom from '../../../../components/motion/DistanceAtom';
import defs from '../../../../components/motion/motion-defs';
import { valueAtPath } from '../layers/stamp';
import { tierPrefix } from './entrance-facts';

const NODES = {
	from: defs.$defs.EntranceFrom.properties.clipRound,
	to: defs.$defs.EntranceTo.properties.clipRound,
};

/**
 * @param {Object} props
 * @param {Object} props.layer  The entrance layer.
 * @param {string} props.tier   `desktop`, `tablet` or `mobile`.
 * @param {Object} props.editor The layer editor (`editMany`).
 * @return {Element} The two radius fields.
 */
export default function ClipRoundFields( { layer, tier, editor } ) {
	const prefix = tierPrefix( tier );
	const labels = {
		from: __( 'Reveal corner radius, start', 'sgs-blocks' ),
		to: __( 'Reveal corner radius, end', 'sgs-blocks' ),
	};
	return (
		<div className="sgs-motion-entrance__clip-round">
			{ [ 'from', 'to' ].map( ( end ) => {
				const path = `${ prefix }.${ end }.clipRound`;
				return (
					<DistanceAtom
						key={ end }
						label={ labels[ end ] }
						value={ valueAtPath( layer, path ) }
						fieldNode={ NODES[ end ] }
						onChange={ ( next ) => editor.editMany( [ [ path, next ] ] ) }
					/>
				);
			} ) }
		</div>
	);
}
