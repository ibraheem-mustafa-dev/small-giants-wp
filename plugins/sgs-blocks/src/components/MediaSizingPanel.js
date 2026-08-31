/**
 * MediaSizingPanel — the shared "media size & crop" panel (C19, 2026-08-27).
 *
 * Resolves a real ambiguity in the framework: a picture-holding block's box
 * shape has historically been set two ways at once — a fixed height AND an
 * aspect ratio — with no rule for which wins. This panel makes them mutually
 * exclusive MODES of one control (`Auto` / `Fixed height` / `Aspect ratio`),
 * so a client can no longer have both live simultaneously, and follows the
 * control chain in the order it actually matters:
 *
 *     box shape -> object-fit -> object-position (focal point)
 *
 * `imageInset` sits OUTSIDE that chain (it insets the box, it doesn't shape
 * it) and is intentionally NOT rendered by this component in its first
 * mount — `sgs/media`, the pilot block, has no inset/padding attribute at
 * all today. A future adopter that DOES have one passes `insetValue` +
 * `onInsetChange` and the row appears; omitting them omits the row rather
 * than rendering a broken control. See the block-level docblock in
 * `src/blocks/media/edit.js` for that decision recorded against this pilot.
 *
 * ---------------------------------------------------------------------------
 * WHY A PLAIN ATTRIBUTE, NOT A `supports.sgs` FLAG (open question 2, C19 design)
 * ---------------------------------------------------------------------------
 * `supports.sgs.*` flags in this codebase gate CAPABILITIES — whether a panel
 * exists at all for a given block (`showLayout`, `enableColumnShapePicker`,
 * `imageControls`, …). `mediaSizing` is not a capability switch: it is the
 * CLIENT'S CHOICE of box-shape mode, stored per instance exactly like
 * `objectFit` or `alignment` already are on this same block. It has to be a
 * real attribute because it round-trips through the editor and the cloning
 * converter the same way any other per-instance value does — a `supports`
 * flag is read once from block.json and never written to post_content.
 * Mounting THIS COMPONENT is the opt-in (each adopting block wires it
 * explicitly in its own edit.js); `mediaSizing` itself is just data.
 *
 * ---------------------------------------------------------------------------
 * RATIO STRING FORMAT (open question 1, C19 design)
 * ---------------------------------------------------------------------------
 * `image-sequence/render.php:54` already whitelists SIX spaced values
 * ("16 / 9", "21 / 9", "4 / 3", "1 / 1", "3 / 4", "9 / 16") and coerces
 * anything else back to "16 / 9" — the only block in the framework with a
 * real server-side ratio whitelist today. `card-grid`/`gallery`/`post-grid`
 * take free strings with no spaces ("16/10", "1/1"). Rather than inventing a
 * THIRD format, this panel's ratio dropdown reuses image-sequence's spaced
 * six-value list verbatim (`RATIO_OPTIONS` below) — CSS `aspect-ratio`
 * parses both forms identically, so this is a UI/whitelist choice, not a
 * CSS-correctness one, and picking the already-precedented format is the
 * cheaper one to standardise on later.
 *
 * ---------------------------------------------------------------------------
 * GREY-OUT, NOT `disabled` (WCAG 2.1 AA 1.3.1 / 3.3.2 + "degrade to more
 * information, never less")
 * ---------------------------------------------------------------------------
 * A control an earlier choice has made irrelevant is never hidden and never
 * given the native HTML `disabled` attribute — `disabled` removes an element
 * from the tab order, which fails the brief's explicit requirement that the
 * explanation stay keyboard-reachable. Instead: the control stays fully
 * operable, gets `aria-disabled="true"` (informative to assistive tech,
 * non-blocking to interaction) plus a wrapping class
 * (`sgs-media-sizing-panel__row--inert`) that a small editor-only stylesheet
 * dims, and every native control's own `help` prop carries the reason
 * (`INERT_HELP` below) so screen-reader users get the same explanation
 * sighted users get from the dimming.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import {
	SelectControl,
} from '@wordpress/components';
import ResponsiveOverride from './ResponsiveOverride';
import SgsLengthControl from './SgsLengthControl';
import FocalPositionField from './FocalPositionField';
import { ToggleGroupControl, ToggleGroupControlOption, ToolsPanelItem } from './primitives';

/**
 * The six ratios `image-sequence/render.php:54` already whitelists, in the
 * SAME spaced format — see the docblock above for why this list is not
 * re-derived from that file (this component doesn't touch image-sequence;
 * it isn't piloted this pass).
 */
export const RATIO_OPTIONS = [
	{ label: __( '16 / 9 — widescreen', 'sgs-blocks' ), value: '16 / 9' },
	{ label: __( '21 / 9 — cinematic', 'sgs-blocks' ), value: '21 / 9' },
	{ label: __( '4 / 3 — classic', 'sgs-blocks' ), value: '4 / 3' },
	{ label: __( '1 / 1 — square', 'sgs-blocks' ), value: '1 / 1' },
	{ label: __( '3 / 4 — portrait', 'sgs-blocks' ), value: '3 / 4' },
	{ label: __( '9 / 16 — vertical', 'sgs-blocks' ), value: '9 / 16' },
];

const OBJECT_FIT_OPTIONS = [
	{ label: __( 'Cover (fill, crop)', 'sgs-blocks' ), value: 'cover' },
	{ label: __( 'Contain (fit, letterbox)', 'sgs-blocks' ), value: 'contain' },
	{ label: __( 'Fill (stretch)', 'sgs-blocks' ), value: 'fill' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Scale down', 'sgs-blocks' ), value: 'scale-down' },
];

// Fill styles that genuinely crop/letterbox — a focal point only ever has a
// visible effect on these. "fill" stretches (no crop) and "none" renders at
// natural size (no crop), so a focal point set on either does nothing.
const FIT_STYLES_THAT_CROP = [ 'cover', 'contain', 'scale-down' ];

const MODE_OPTIONS = [
	{ label: __( 'Auto', 'sgs-blocks' ), value: 'auto' },
	{ label: __( 'Fixed height', 'sgs-blocks' ), value: 'height' },
	{ label: __( 'Aspect ratio', 'sgs-blocks' ), value: 'ratio' },
];

const inertHelp = ( reason ) => reason;

/**
 * @param {Object}   props
 * @param {string}   props.mode              Resolved mode: 'auto' | 'height' | 'ratio'.
 * @param {Function} props.onModeChange       ( next: string ) => void.
 * @param {Object}   [props.heightValue]      Tier object `{desktop,tablet,mobile}` — unit-embedded
 *                                            length strings (matches `sgs/media`'s existing `height`
 *                                            attr shape exactly; no separate unit prop needed).
 * @param {Function} props.onHeightChange     ( obj ) => void.
 * @param {string}   [props.ratioValue]       Current ratio string (spaced format, see RATIO_OPTIONS).
 * @param {Function} props.onRatioChange      ( value: string ) => void.
 * @param {string}   props.objectFit          Current object-fit value.
 * @param {boolean}  [props.showFitControl]   Render the Fill style row. Default
 *                                            true, so the four mounts that own
 *                                            their fit here are unchanged. A
 *                                            surface wired to the media-element
 *                                            `object-fit` ATOM passes false: the
 *                                            atom owns the control, and two
 *                                            controls writing one attribute is a
 *                                            duplicate writer. The VALUE is still
 *                                            read either way, because the focal
 *                                            point row is disclosed from it.
 * @param {Function} props.onObjectFitChange  ( value: string ) => void.
 * @param {string}   [props.focalPoint]       Current object-position CSS string.
 * @param {Function} props.onFocalPointChange ( value: string ) => void.
 * @param {string}   [props.focalPreviewUrl]  Image URL for the focal-point picker's preview thumbnail.
 * @param {boolean}  [props.showFocalControl] Render the Focal point row. Default
 *                                            true, so the four mounts that own
 *                                            their focal point here are unchanged.
 *                                            A surface wired to the media-element
 *                                            `focal-point` ATOM passes false: the
 *                                            atom owns the control, and two
 *                                            controls writing one attribute is a
 *                                            duplicate writer. The VALUE is still
 *                                            read either way, for the atom's
 *                                            disclosure logic.
 * @param {string}   [props.insetValue]       OPTIONAL — omit both this and onInsetChange to omit the
 *                                            row entirely (sgs/media has no inset attribute today).
 * @param {Function} [props.onInsetChange]
 */
export default function MediaSizingPanel( {
	mode,
	onModeChange,
	heightValue,
	onHeightChange,
	ratioValue,
	onRatioChange,
	objectFit,
	showFitControl = true,
	onObjectFitChange,
	focalPoint,
	onFocalPointChange,
	focalPreviewUrl,
	showFocalControl = true,
	insetValue,
	onInsetChange,
} ) {
	const resolvedMode = mode || 'auto';
	const isAuto = 'auto' === resolvedMode;
	const isHeight = 'height' === resolvedMode;
	const isRatio = 'ratio' === resolvedMode;

	const heightInert = ! isHeight;
	const ratioInert = ! isRatio;
	const fitInert = isAuto;
	const fitCrops = FIT_STYLES_THAT_CROP.includes( objectFit || 'cover' );
	const focalInert = isAuto || ! fitCrops;

	const heightReason = isAuto
		? __( 'Not used — the box shape is Auto. Switch Box shape to Fixed height to use this.', 'sgs-blocks' )
		: __( 'Not used — the box shape is set by the ratio above. Switch Box shape to Fixed height to use this.', 'sgs-blocks' );
	const ratioReason = isAuto
		? __( 'Not used — the box shape is Auto. Switch Box shape to Aspect ratio to use this.', 'sgs-blocks' )
		: __( 'Not used — the box shape is set by the height above. Switch Box shape to Aspect ratio to use this.', 'sgs-blocks' );
	const fitReason = __( 'The box is the same shape as the picture, so there is nothing to fit or crop.', 'sgs-blocks' );
	const focalReason = isAuto
		? __( 'Nothing is cropped, so there is no part to choose.', 'sgs-blocks' )
		: __( '"%s" does not crop the picture, so there is no part to choose.', 'sgs-blocks' ).replace(
				'%s',
				( OBJECT_FIT_OPTIONS.find( ( o ) => o.value === ( objectFit || 'cover' ) ) || {} ).label || objectFit
		  );

	return (
		<>
			<ToolsPanelItem
				label={ __( 'Box shape', 'sgs-blocks' ) }
				hasValue={ () => 'auto' !== resolvedMode }
				onDeselect={ () => onModeChange( 'auto' ) }
				isShownByDefault
			>
				<ToggleGroupControl
					label={ __( 'Box shape', 'sgs-blocks' ) }
					help={ __( 'Auto follows the picture. Fixed height and Aspect ratio each set the box, then the picture fills it.', 'sgs-blocks' ) }
					value={ resolvedMode }
					onChange={ ( value ) => onModeChange( value || 'auto' ) }
					isBlock
					__nextHasNoMarginBottom
					__next40pxDefaultSize
				>
					{ MODE_OPTIONS.map( ( opt ) => (
						<ToggleGroupControlOption key={ opt.value } value={ opt.value } label={ opt.label } />
					) ) }
				</ToggleGroupControl>
			</ToolsPanelItem>

			<ToolsPanelItem
				label={ __( 'Height', 'sgs-blocks' ) }
				hasValue={ () =>
					!! (
						heightValue &&
						Object.values( heightValue ).some( ( v ) => v !== undefined && v !== null && v !== '' )
					)
				}
				onDeselect={ () => onHeightChange( {} ) }
				isShownByDefault={ isHeight }
			>
				<div
					aria-disabled={ heightInert }
					className={
						heightInert ? 'sgs-media-sizing-panel__row sgs-media-sizing-panel__row--inert' : 'sgs-media-sizing-panel__row'
					}
				>
					<ResponsiveOverride label={ __( 'Height', 'sgs-blocks' ) } value={ heightValue } onChange={ onHeightChange }>
						{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
							<SgsLengthControl
								presets={ false }
								value={ ownValue || '' }
								placeholder={ inherited ? effectiveValue || '' : '' }
								help={ heightInert ? inertHelp( heightReason ) : undefined }
								onChange={ ( v ) => setOwnValue( v || '' ) }
							/>
						) }
					</ResponsiveOverride>
				</div>
			</ToolsPanelItem>

			<ToolsPanelItem
				label={ __( 'Ratio', 'sgs-blocks' ) }
				hasValue={ () => !! ratioValue }
				onDeselect={ () => onRatioChange( '' ) }
				isShownByDefault={ isRatio }
			>
				<div
					aria-disabled={ ratioInert }
					className={
						ratioInert ? 'sgs-media-sizing-panel__row sgs-media-sizing-panel__row--inert' : 'sgs-media-sizing-panel__row'
					}
				>
					<SelectControl
						label={ __( 'Ratio', 'sgs-blocks' ) }
						help={ ratioInert ? ratioReason : __( 'The box always keeps this shape, at every width.', 'sgs-blocks' ) }
						value={ ratioValue || '' }
						options={ [ { label: __( '— Select —', 'sgs-blocks' ), value: '' }, ...RATIO_OPTIONS ] }
						onChange={ onRatioChange }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</div>
			</ToolsPanelItem>

			{ showFitControl && (
			<ToolsPanelItem
				label={ __( 'Fill style', 'sgs-blocks' ) }
				hasValue={ () => ( objectFit || 'cover' ) !== 'cover' }
				onDeselect={ () => onObjectFitChange( 'cover' ) }
				isShownByDefault
			>
				<div
					aria-disabled={ fitInert }
					className={ fitInert ? 'sgs-media-sizing-panel__row sgs-media-sizing-panel__row--inert' : 'sgs-media-sizing-panel__row' }
				>
					<SelectControl
						label={ __( 'Fill style', 'sgs-blocks' ) }
						help={ fitInert ? fitReason : __( 'How the picture fills the box.', 'sgs-blocks' ) }
						value={ objectFit || 'cover' }
						options={ OBJECT_FIT_OPTIONS }
						onChange={ onObjectFitChange }
						__nextHasNoMarginBottom
						__next40pxDefaultSize
					/>
				</div>
			</ToolsPanelItem>
			) }

			{ showFocalControl && (
			<ToolsPanelItem
				label={ __( 'Focal point', 'sgs-blocks' ) }
				hasValue={ () => !! focalPoint && 'center center' !== focalPoint }
				onDeselect={ () => onFocalPointChange( 'center center' ) }
			>
				<div
					aria-disabled={ focalInert }
					className={
						focalInert ? 'sgs-media-sizing-panel__row sgs-media-sizing-panel__row--inert' : 'sgs-media-sizing-panel__row'
					}
				>
					<FocalPositionField
						label={ __( 'Focal point', 'sgs-blocks' ) }
						help={ focalInert ? focalReason : __( 'Which part stays visible when the picture is cropped.', 'sgs-blocks' ) }
						url={ focalPreviewUrl }
						format="css-string"
						value={ focalPoint || 'center center' }
						onChange={ onFocalPointChange }
					/>
				</div>
			</ToolsPanelItem>
			) }

			{ undefined !== insetValue && onInsetChange && (
				<ToolsPanelItem
					label={ __( 'Inset', 'sgs-blocks' ) }
					hasValue={ () => !! insetValue }
					onDeselect={ () => onInsetChange( '' ) }
				>
					<SgsLengthControl
						label={ __( 'Inset', 'sgs-blocks' ) }
						help={ __( 'Space between the box edge and the picture, on all sides.', 'sgs-blocks' ) }
						presets={ false }
						value={ insetValue || '' }
						onChange={ onInsetChange }
					/>
				</ToolsPanelItem>
			) }
		</>
	);
}
