/**
 * SGS Responsive Logo (sgs/responsive-logo) — the dark-logo rows at the foot of the "Logo" panel (Settings tab).
 *
 * One switch, "Use a different logo on dark backgrounds". On, the dark logo's Media rows (the `logoDark` slot: its file
 * picker and loading choice) appear beneath it under a small heading. There is no attribute for the switch itself: it reads
 * on when `logoDarkSource` holds a desktop file (what `includes/helpers-logo-media.php::sgs_logo_device_entry` reads) or was
 * just turned on here. Turning it off clears `logoDarkSource` in one `setAttributes` call, so one undo restores the file.
 *
 * Passed to `MediaElementPanel` through `panelContent.media`, so it renders inside the logo's own "Media" panel (titled
 * "Logo" by `titleOverride`). The rows are built the way the shared media panels build theirs: `buildPanelModel` over the
 * `logoDark` slot's atoms, each row drawn by `PanelRow`.
 *
 * @package
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { useSelect } from '@wordpress/data';
import { BaseControl, ToggleControl } from '@wordpress/components';

import PanelRow from '../../components/media/panels/PanelRow.js';
import { buildPanelModel } from '../../components/media/panels/panel-model.js';
import { createContext } from '../../components/media/panels/disclosure-context.js';

const DEVICE_TO_KEY = {
	Desktop: 'desktop',
	Tablet: 'tablet',
	Mobile: 'mobile',
};

/** The editor's active device, from the one global toggle (the same read the media panels make). */
function useActiveDevice() {
	return useSelect( ( select ) => {
		const ed = select( 'core/editor' );
		const device =
			ed && 'function' === typeof ed.getDeviceType
				? ed.getDeviceType()
				: null;
		return DEVICE_TO_KEY[ device ] || 'desktop';
	}, [] );
}

/**
 * True when the dark logo holds a desktop file: the one entry the front end reads.
 *
 * @param {Object|undefined} source The block's `logoDarkSource` attribute.
 * @return {boolean} Whether a file is stored.
 */
export function holdsDarkLogoFile( source ) {
	const entry = source && 'object' === typeof source ? source.desktop : null;
	return !! ( entry && ( entry.id || entry.url ) );
}

/**
 * @param {Object}   props
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Block `setAttributes`.
 * @param {string}   props.blockSlug     Block slug, for stored-name resolution.
 * @param {Object}   props.slot          The block's `logoDark` mediaElements entry: `{ prefix, kinds, context, atoms }`.
 * @return {JSX.Element} The switch and, when on, the dark logo's rows.
 */
export default function DarkLogoRows( {
	attributes,
	setAttributes,
	blockSlug,
	slot,
} ) {
	const [ justTurnedOn, setJustTurnedOn ] = useState( false );
	const device = useActiveDevice();
	const holdsFile = holdsDarkLogoFile( attributes.logoDarkSource );
	const on = holdsFile || justTurnedOn;

	const opts = {
		blockSlug,
		kinds: slot.kinds,
		context: slot.context,
		parallax: false,
		transformMotion: false,
		adopted: true,
		blockOwns: [],
	};
	const rows = on
		? buildPanelModel( {
				atomIds: slot.atoms,
				attrs: attributes,
				device,
				prefix: slot.prefix,
				opts,
				adopted: true,
		  } ).flatMap( ( entry ) => entry.rows )
		: [];
	const kind = createContext( attributes, device, slot.prefix, opts ).kind;

	return (
		<>
			<ToggleControl
				label={ __(
					'Use a different logo on dark backgrounds',
					'sgs-blocks'
				) }
				help={ __(
					'Shows a second logo wherever this logo sits on a dark ground: dark mode, a dark section or a dark header. Turning this off removes the dark logo file; Undo brings it back.',
					'sgs-blocks'
				) }
				checked={ on }
				onChange={ ( next ) => {
					setJustTurnedOn( next );
					if ( ! next && attributes.logoDarkSource ) {
						setAttributes( { logoDarkSource: undefined } );
					}
				} }
				__nextHasNoMarginBottom
			/>
			{ on && (
				<>
					<BaseControl.VisualLabel>
						{ __( 'Logo for dark backgrounds', 'sgs-blocks' ) }
					</BaseControl.VisualLabel>
					{ rows.map( ( row ) => (
						<PanelRow
							key={ `${ row.atomId }-${ row.setting.base }` }
							row={ row }
							attributes={ attributes }
							setAttributes={ setAttributes }
							prefix={ slot.prefix }
							blockSlug={ blockSlug }
							device={ device }
							kind={ kind }
							slot={ {
								prefix: slot.prefix,
								kinds: slot.kinds,
								context: slot.context,
							} }
						/>
					) ) }
				</>
			) }
		</>
	);
}
