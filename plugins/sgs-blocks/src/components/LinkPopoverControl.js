/**
 * LinkPopoverControl — the SGS standard LINK control (Spec 35 §2 LINK,
 * promoted from `sgs/button`'s pilot 2026-08-13, Bean-approved live).
 *
 * Supersedes `SgsLinkControl`'s INLINE mount as the canonical shape. Two
 * exports:
 *
 * - `LinkPopoverContent` — the low-level `<Popover>` primitive. Use this
 *   directly when a block needs MULTIPLE triggers to open the SAME popover
 *   instance (e.g. `sgs/button`'s toolbar link button + sidebar row both
 *   opening one popover with a swapped `anchor` — see `button/edit.js`).
 * - `LinkPopoverField` — a self-contained row-trigger + popover in ONE
 *   component, for the common case of a single inspector-panel trigger
 *   (`sgs/icon`, `sgs/media`, the block-link extension, `sgs/product-card`).
 *
 * WHY A POPOVER, NOT AN INLINE MOUNT (the root-cause this migration fixes):
 * 1. Core sets `.block-editor-link-control { min-width: 350px }`, cancelled
 *    ONLY under `.components-popover__content`. Mounting inline in a ~248px
 *    inspector panel overflows by ~86px — a popover fixes this by
 *    construction, never by overriding core CSS.
 * 2. Core `LinkControl` STAGES its `settings` toggles and only commits them
 *    on Submit — there is no blur/close handler. `SgsLinkControl`'s inline
 *    mount (no explicit "Submit" gesture in the ordinary editing flow) let a
 *    flipped toggle silently discard. This component NEVER passes toggles
 *    through `LinkControl`'s `settings` prop — every toggle below is our own
 *    control, committing immediately via `onChange*`, exactly like the
 *    button pilot and the (superseded) `SgsLinkControl`.
 * Neither Kadence nor Otter mount core `LinkControl` inline in a sidebar
 * panel either — both use a popover or `<BlockControls>`.
 *
 * `linkId`/`linkKind` (internal post/term ID resolution, `get_permalink()`
 * at render time) are OPT-IN per consumer — pass `enableInternalResolution`
 * only when the target's `render.php` resolves them (currently `sgs/button`
 * only; see each block's own dispatch notes for why).
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState, useRef, forwardRef, useImperativeHandle } from '@wordpress/element';
import { LinkControl } from '@wordpress/block-editor';
import {
	BaseControl,
	Button,
	Popover,
	SelectControl,
	TextControl,
	ToggleControl,
} from '@wordpress/components';
import { useInstanceId } from '@wordpress/compose';
import { link as linkIcon } from '@wordpress/icons';
import { VStack } from './primitives';
import './LinkPopoverControl.css';

export const TARGET_ENUM_OPTIONS = [
	{ label: __( 'Same tab (_self)', 'sgs-blocks' ), value: '_self' },
	{ label: __( 'New tab (_blank)', 'sgs-blocks' ), value: '_blank' },
	{ label: __( 'Parent frame (_parent)', 'sgs-blocks' ), value: '_parent' },
	{ label: __( 'Full window (_top)', 'sgs-blocks' ), value: '_top' },
];

/**
 * The popover primitive. Mount ONE instance; swap `anchor` between however
 * many triggers should open it (see `sgs/button/edit.js`).
 *
 * @param {Object}    props
 * @param {Element}   props.anchor               DOM node the popover is pinned to.
 * @param {Function}  props.onClose              Fires on Escape / outside click.
 * @param {string}    props.url                  Stored url string.
 * @param {string}    [props.linkId]             Internal post/term ID (string); '' = none.
 *                                                Only meaningful when `enableInternalResolution`.
 * @param {string}    [props.linkKind]           LinkControl `kind`; '' = none.
 * @param {string}    [props.linkTarget]         HTML target — enum string ('_self'…) or
 *                                                'boolean' mode's `''`/`'_blank'`.
 * @param {string}    [props.rel]                Rel attribute string.
 * @param {boolean}   [props.download]           Download-link toggle value.
 * @param {Function}  props.onChangeLink         Receives { url, linkId, linkKind } (linkId/
 *                                                linkKind omitted when `enableInternalResolution`
 *                                                is false — caller's onChange only needs `url`).
 * @param {Function}  [props.onChangeTarget]     Receives the next linkTarget value. Omit the
 *                                                whole target row by omitting this prop.
 * @param {Function}  [props.onChangeRel]        Receives the next rel string. Omit to hide.
 * @param {Function}  [props.onChangeDownload]   Receives the next download boolean. Omit to hide.
 * @param {'enum'|'boolean'} [props.targetMode]  'enum' = 4-value SelectControl (_self/_blank/
 *                                                _parent/_top, `sgs/button`'s shape). 'boolean' =
 *                                                a single "Open in new tab" ToggleControl mapped
 *                                                to `''`/`'_blank'` (icon/media's existing shape).
 * @param {boolean}   [props.enableInternalResolution] When true, `onChangeLink` receives
 *                                                { url, linkId, linkKind } from LinkControl's
 *                                                internal-search result. When false (default),
 *                                                only { url } is passed — a plain pasted/typed
 *                                                URL string, matching the pre-migration contract
 *                                                for consumers whose render.php has no ID
 *                                                resolution.
 * @param {Function}  [props.renderExtraFields]  ( { url } ) => JSX, rendered after the standard
 *                                                fields, only when a url is set. For a consumer's
 *                                                own bespoke field (e.g. the block-link extension's
 *                                                accessible-label field).
 */
export function LinkPopoverContent( {
	anchor,
	onClose,
	url,
	linkId,
	linkKind,
	linkTarget,
	rel,
	download,
	onChangeLink,
	onChangeTarget,
	onChangeRel,
	onChangeDownload,
	targetMode = 'enum',
	enableInternalResolution = false,
	renderExtraFields,
} ) {
	const linkValue = {
		url: url || '',
		id: enableInternalResolution && linkId ? linkId : undefined,
		kind: enableInternalResolution && linkKind ? linkKind : undefined,
	};

	const handleLinkChange = ( next ) => {
		if ( enableInternalResolution ) {
			onChangeLink( {
				url: next.url || '',
				linkId: next.id ? String( next.id ) : '',
				linkKind: next.kind || '',
			} );
		} else {
			onChangeLink( { url: next.url || '' } );
		}
	};

	const handleRemove = () => {
		onChangeLink(
			enableInternalResolution
				? { url: '', linkId: '', linkKind: '' }
				: { url: '' }
		);
	};

	return (
		<Popover
			anchor={ anchor }
			onClose={ onClose }
			placement="bottom-start"
			offset={ 8 }
			shift
			className="sgs-link-popover"
		>
			{ /* `VStack spacing={4}` = the WP grid-unit-20 (16px) rhythm — matches
			   core's own popover spacing. Every control below carries
			   `__nextHasNoMarginBottom` so VStack is the ONLY source of the
			   gap (mixing the two would double it up). */ }
			<VStack className="sgs-link-popover__inner" spacing={ 4 }>
				<LinkControl
					searchInputPlaceholder={ __( 'Search or paste a URL', 'sgs-blocks' ) }
					value={ linkValue }
					settings={ [] }
					onChange={ handleLinkChange }
					onRemove={ handleRemove }
					forceIsEditingLink={ ! linkValue.url }
				/>
				{ !! linkValue.url && (
					<VStack spacing={ 4 }>
						{ onChangeTarget && 'enum' === targetMode && (
							<SelectControl
								label={ __( 'Open in', 'sgs-blocks' ) }
								value={ linkTarget }
								options={ TARGET_ENUM_OPTIONS }
								onChange={ onChangeTarget }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
						{ onChangeTarget && 'boolean' === targetMode && (
							<ToggleControl
								label={ __( 'Open in new tab', 'sgs-blocks' ) }
								checked={ '_blank' === linkTarget }
								onChange={ ( checked ) => onChangeTarget( checked ? '_blank' : '_self' ) }
								__nextHasNoMarginBottom
							/>
						) }
						{ onChangeRel && (
							<TextControl
								label={ __( 'Rel attribute', 'sgs-blocks' ) }
								value={ rel }
								onChange={ onChangeRel }
								help={ __( 'e.g. noopener noreferrer nofollow', 'sgs-blocks' ) }
								__nextHasNoMarginBottom
								__next40pxDefaultSize
							/>
						) }
						{ onChangeDownload && (
							<ToggleControl
								label={ __( 'Download link', 'sgs-blocks' ) }
								checked={ !! download }
								onChange={ onChangeDownload }
								__nextHasNoMarginBottom
							/>
						) }
						{ renderExtraFields && renderExtraFields( { url: linkValue.url } ) }
					</VStack>
				) }
			</VStack>
		</Popover>
	);
}

/**
 * Self-contained trigger row + popover for the common single-trigger case.
 * Renders the compact `.sgs-link-popover__row` Button (icon + truncated URL
 * label, matching `sgs/button`'s sidebar row) and owns its own open/anchor
 * state. Exposes `ref.current.open()` for a caller that ALSO wants an
 * external trigger (e.g. a toolbar button) to open the same instance —
 * `sgs/button` doesn't use this wrapper (it needs two independently-styled
 * triggers), but a future consumer with the same need can.
 *
 * @param {Object}   props
 * @param {string}   props.label                 Row/BaseControl label.
 * @param {string}   [props.help]                Help text.
 * @param {Object}   props.value                 { url, linkId, linkKind, linkTarget, rel, download }.
 * @param {Function} props.onChange               Receives the next partial value object — merge
 *                                                 into attributes yourself (matches `setAttributes`'s
 *                                                 own merge semantics).
 * @param {'enum'|'boolean'} [props.targetMode]   See `LinkPopoverContent`. Default 'boolean'
 *                                                 (matches icon/media's existing SgsLinkControl shape).
 * @param {boolean}  [props.showTarget=true]      Show the open-in-new-tab control.
 * @param {boolean}  [props.showRel=true]         Show the rel field.
 * @param {boolean}  [props.showDownload=false]   Show the download toggle.
 * @param {boolean}  [props.enableInternalResolution=false] See `LinkPopoverContent`.
 * @param {Function} [props.renderExtraFields]    See `LinkPopoverContent`.
 * @param {boolean}  [props.searchOnly=false]     Opt-in variant for plain string-URL attributes
 *                                                that have no new-tab/rel/download concept (e.g.
 *                                                `sgs/product-card`'s `ctaUrl`). `value` is a bare
 *                                                URL STRING and `onChange` receives the next url
 *                                                STRING directly — matches `SgsLinkControl`'s own
 *                                                `searchOnly` contract, which this supersedes.
 *                                                Forces target/rel/download rows off regardless of
 *                                                the show* props.
 */
const LinkPopoverField = forwardRef( function LinkPopoverField(
	{
		label,
		help,
		value,
		onChange,
		targetMode = 'boolean',
		showTarget = true,
		showRel = true,
		showDownload = false,
		enableInternalResolution = false,
		renderExtraFields,
		searchOnly = false,
	},
	ref
) {
	const [ isOpen, setIsOpen ] = useState( false );
	const triggerRef = useRef();

	useImperativeHandle( ref, () => ( {
		open: () => setIsOpen( true ),
	} ) );

	const url = searchOnly ? ( value || '' ) : ( value?.url || '' );

	// `id` is required for BaseControl to give its own `help` paragraph an id
	// (`${id}__help`, the same convention every native self-wiring control
	// gets from useBaseControlProps()) — without it the paragraph renders
	// with no id at all and nothing can point aria-describedby at it.
	const instanceId = useInstanceId( LinkPopoverField, 'sgs-link-popover-field' );
	const id = `sgs-link-popover-field-${ instanceId }`;
	const helpId = help ? `${ id }__help` : undefined;

	return (
		<BaseControl id={ id } label={ label } help={ help } __nextHasNoMarginBottom>
			<Button
				ref={ triggerRef }
				variant="tertiary"
				className="sgs-link-popover__row"
				icon={ linkIcon }
				title={ url || undefined }
				aria-describedby={ helpId }
				onClick={ () => setIsOpen( true ) }
			>
				<span className="sgs-link-popover__row-label">
					{ url ? url : __( 'Add link', 'sgs-blocks' ) }
				</span>
			</Button>
			{ isOpen && (
				<LinkPopoverContent
					anchor={ triggerRef.current }
					onClose={ () => setIsOpen( false ) }
					url={ url }
					linkId={ searchOnly ? undefined : value?.linkId }
					linkKind={ searchOnly ? undefined : value?.linkKind }
					linkTarget={ searchOnly ? undefined : value?.linkTarget }
					rel={ searchOnly ? undefined : value?.rel }
					download={ searchOnly ? undefined : value?.download }
					targetMode={ targetMode }
					enableInternalResolution={ ! searchOnly && enableInternalResolution }
					onChangeLink={ ( next ) => onChange( searchOnly ? ( next.url || '' ) : next ) }
					onChangeTarget={ ! searchOnly && showTarget ? ( val ) => onChange( { linkTarget: val } ) : undefined }
					onChangeRel={ ! searchOnly && showRel ? ( val ) => onChange( { rel: val } ) : undefined }
					onChangeDownload={ ! searchOnly && showDownload ? ( val ) => onChange( { download: val } ) : undefined }
					renderExtraFields={ searchOnly ? undefined : renderExtraFields }
				/>
			) }
		</BaseControl>
	);
} );

export default LinkPopoverField;
