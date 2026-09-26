/**
 * LottieControls — ALL controls for one Lottie media slot (U-17, design
 * §3.1/§3.2, `.claude/reports/2026-09-26-u17-lottie-design.md`).
 *
 * Mounted from `source.control.js`'s `control()` in place of the image/video
 * pickers whenever the slot's resolved media type is `'lottie'` — this file
 * is the single place every Lottie-offering surface (`sgs/media`, `sgs/hero`
 * split media, `sgs/responsive-logo`) gets its picker + poster + trigger +
 * loop + speed rows from, so the four surfaces cannot drift apart.
 *
 * Rows, in order:
 *   1. JSON-only picker (`LottieId`) — media-library only, `application/json`,
 *      no URL field, no paste (design §3.1). Tiered (art direction).
 *   2. Poster (`Thumbnail`/`ThumbnailId` pair) — REQUIRED for a useful
 *      result: under reduced motion the player never loads, so a missing
 *      poster surfaces a `Notice`.
 *   3. Trigger (`LottieTrigger`) — load / visible / hover / scroll, default
 *      'visible'.
 *   4. Loop (`VideoLoop`, REUSED — not a new Lottie-only attribute).
 *   5. Speed (`LottieSpeed`) — 0.25–3, step 0.25, default 1.
 *
 * Trigger/loop/speed are deliberately UNTIERED (design §3.1 "trigger/loop/
 * speed are not" tiered) — only the picker (`LottieId`) and poster
 * (`ThumbnailId`/`Thumbnail`) carry Tablet/Mobile siblings.
 *
 * ⛔ THE CONTROL/LOGIC SPLIT IS A CONTRACT (`scripts/check-media-atom-purity.js`)
 * for the atom modules under `media/atoms/` — this file lives under
 * `media/controls/` (alongside `MediaTypeControl.js`/`VideoCaptionsFields.js`),
 * which is JSX-only by convention, so no plain-Node import constraint applies
 * here.
 *
 * @package SGS\Blocks
 */
import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import { Button, Notice, RangeControl, ToggleControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

import { mediaStoredAttrName } from '../../MediaElementControls.js';
import ResponsiveControl from '../../ResponsiveControl.js';
import { ToggleGroupControl, ToggleGroupControlOption } from '../../primitives';
import { pairPickerRow } from '../atoms/source.control.js';

/** Tier key -> attribute-name suffix. Desktop carries no suffix. */
const TIER_SUFFIX = { desktop: '', tablet: 'Tablet', mobile: 'Mobile' };

const TRIGGER_OPTIONS = [
	{ label: __( 'On load', 'sgs-blocks' ), value: 'load' },
	{ label: __( 'When visible', 'sgs-blocks' ), value: 'visible' },
	{ label: __( 'On hover', 'sgs-blocks' ), value: 'hover' },
	{ label: __( 'On scroll', 'sgs-blocks' ), value: 'scroll' },
];

/**
 * One responsive Lottie JSON picker row, hard-restricted to
 * `application/json` — media library only, no URL field, no paste (design
 * §3.1).
 *
 * @param {Object}   ctx
 * @param {Object}   ctx.attrs
 * @param {Function} ctx.setAttributes
 * @param {Function} ctx.name Resolves a base name to the surface's stored attribute name.
 * @return {JSX.Element} A bare responsive row.
 */
function lottieJsonPickerRow( { attrs, setAttributes, name } ) {
	return (
		<ResponsiveControl key="lottie-json" label={ __( 'Lottie file', 'sgs-blocks' ) }>
			{ ( tier ) => {
				const suffix = TIER_SUFFIX[ tier ] ?? '';
				const idKey = name( 'LottieId' + suffix );
				const id = attrs[ idKey ] || 0;

				return (
					<MediaUploadCheck>
						<MediaUpload
							onSelect={ ( media ) => {
								if ( ! media || 'application/json' !== ( media.mime || '' ) ) {
									return;
								}
								setAttributes( { [ idKey ]: media.id || 0 } );
							} }
							allowedTypes={ [ 'application/json' ] }
							value={ id }
							render={ ( { open } ) => (
								<div className="sgs-lottie-controls__picker">
									{ id ? (
										<>
											<p style={ { fontSize: '12px', marginBottom: '4px' } }>
												{ __( 'Lottie animation selected', 'sgs-blocks' ) }
											</p>
											<Button variant="secondary" onClick={ open }>
												{ __( 'Replace file', 'sgs-blocks' ) }
											</Button>
											<Button
												variant="link"
												isDestructive
												onClick={ () => setAttributes( { [ idKey ]: 0 } ) }
											>
												{ __( 'Remove', 'sgs-blocks' ) }
											</Button>
										</>
									) : (
										<Button variant="secondary" onClick={ open }>
											{ __( 'Select Lottie JSON', 'sgs-blocks' ) }
										</Button>
									) }
								</div>
							) }
						/>
					</MediaUploadCheck>
				);
			} }
		</ResponsiveControl>
	);
}

/**
 * Bare control rows for a Lottie media slot. Never its own
 * `<InspectorControls>` — the caller (`source.control.js`) mounts these
 * inside its own panel.
 *
 * @param {Object}   ctx
 * @param {Object}   ctx.attributes
 * @param {Function} ctx.setAttributes
 * @param {string}   ctx.prefix
 * @param {string}   ctx.blockSlug
 * @return {JSX.Element[]} Rows for the Lottie media type.
 */
export function control( { attributes, setAttributes, prefix, blockSlug } ) {
	const attrs = attributes || {};
	const name = ( base ) => mediaStoredAttrName( blockSlug, prefix, base );

	const posterIdKey = name( 'ThumbnailId' );
	const posterUrlKey = name( 'Thumbnail' );
	const hasPoster = !! ( attrs[ posterIdKey ] || attrs[ posterUrlKey ] );

	const triggerKey = name( 'LottieTrigger' );
	const loopKey = name( 'VideoLoop' );
	const speedKey = name( 'LottieSpeed' );

	const rows = [
		lottieJsonPickerRow( { attrs, setAttributes, name } ),
		pairPickerRow( {
			rowKey: 'lottie-poster',
			label: __( 'Poster image', 'sgs-blocks' ),
			attrs,
			setAttributes,
			name,
			idBase: 'ThumbnailId',
			urlBase: 'Thumbnail',
			allowedType: 'image',
		} ),
	];

	if ( ! hasPoster ) {
		rows.push(
			<Notice key="lottie-poster-notice" status="warning" isDismissible={ false }>
				{ __(
					'Add a poster image: visitors who prefer reduced motion see it instead.',
					'sgs-blocks'
				) }
			</Notice>
		);
	}

	rows.push(
		<ToggleGroupControl
			key="lottie-trigger"
			label={ __( 'Play trigger', 'sgs-blocks' ) }
			value={ attrs[ triggerKey ] || 'visible' }
			onChange={ ( value ) => setAttributes( { [ triggerKey ]: value } ) }
			isBlock
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		>
			{ TRIGGER_OPTIONS.map( ( opt ) => (
				<ToggleGroupControlOption key={ opt.value } value={ opt.value } label={ opt.label } />
			) ) }
		</ToggleGroupControl>
	);

	rows.push(
		<ToggleControl
			key="lottie-loop"
			label={ __( 'Loop', 'sgs-blocks' ) }
			checked={ !! attrs[ loopKey ] }
			onChange={ ( value ) => setAttributes( { [ loopKey ]: value } ) }
			__nextHasNoMarginBottom
		/>
	);

	rows.push(
		<RangeControl
			key="lottie-speed"
			label={ __( 'Playback speed', 'sgs-blocks' ) }
			value={ Number.isFinite( attrs[ speedKey ] ) ? attrs[ speedKey ] : 1 }
			min={ 0.25 }
			max={ 3 }
			step={ 0.25 }
			onChange={ ( value ) => setAttributes( { [ speedKey ]: value ?? 1 } ) }
			__nextHasNoMarginBottom
			__next40pxDefaultSize
		/>
	);

	return rows;
}
