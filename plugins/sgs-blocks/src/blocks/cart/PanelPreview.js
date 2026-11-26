/**
 * SGS Cart — editor-canvas preview of the mini-cart panel (FR-36-19).
 *
 * The live panel is filled client-side from the WooCommerce Store API, so the
 * editor shows a static sample of the same markup: the same `sgs-cart__*`
 * classes, with the panel's own settings painted by `panel-preview-style.js`.
 * One switch flips between the items view and the empty-cart view, because the
 * two draw different elements. Editor-only: the front end carries no inline style.
 *
 * @package SGS\Blocks
 */
import { __ } from '@wordpress/i18n';
import { useState } from '@wordpress/element';
import { Button } from '@wordpress/components';
import { tierLengthPreview } from '../../utils';
import { useSeparatorsCanvas } from '../../shared/separators/useSeparatorsCanvas';
import { logoUrlFor } from '../../utils/logo-source';
import { tierValueOf } from '../../utils/responsive';
import {
	panelElementStyles,
	panelRootStyle,
	scrimPreviewStyle,
} from './panel-preview-style';

import AuthoredText from '../../components/AuthoredText';
/** The lucide "x" glyph, as the live close button and the remove control draw it. */
function CloseGlyph() {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
		>
			<path d="M18 6 6 18" />
			<path d="m6 6 12 12" />
		</svg>
	);
}

/**
 * One sample item row, in the markup `item-row-template.js` builds.
 *
 * @param {Object} props       Props.
 * @param {Object} props.attrs Block attributes.
 * @param {Object} props.s     Element styles from panelElementStyles().
 * @return {Element} The row.
 */
function SampleItem( { attrs, s } ) {
	const removeText = 'text' === attrs.itemRemoveStyle;
	const showSave = false !== attrs.itemShowSaveForLater;
	// The sample item stands for a line that still has extras to choose, so
	// the link previews whenever it is switched on and given wording. On the
	// front end it hides itself per line once that line has them.
	const addOptionsLabel = attrs.itemAddOptionsLabel || '';
	const showAddOptions =
		true === attrs.itemShowAddOptions && '' !== addOptionsLabel;
	// A text Remove link can sit at the right of the quantity's line (as the live row draws it) when a quantity is shown.
	const removeAtEnd =
		removeText &&
		'inline-end' === attrs.itemRemovePlacement &&
		false !== attrs.itemShowQty;
	const removeLink = (
		<span
			className="sgs-cart__item-remove sgs-cart__item-remove--text sgs-cart__item-action"
			style={ { ...s.action, ...s.removeText } }
		>
			<AuthoredText
				value={ attrs.itemRemoveLabel || __( 'Remove', 'sgs-blocks' ) }
			/>
		</span>
	);
	return (
		<div
			className={ `sgs-cart__item${
				removeText ? ' sgs-cart__item--remove-text' : ''
			}` }
			style={ s.item }
		>
			<span
				className="sgs-cart__item-thumb sgs-cart__item-thumb--placeholder"
				aria-hidden="true"
				style={ s.thumb }
			/>
			<div className="sgs-cart__item-info">
				<div className="sgs-cart__item-top">
					<span
						className="sgs-cart__item-brand"
						style={ { ...s.brand } }
					>
						{ __( 'Brand', 'sgs-blocks' ) }
					</span>
					<span className="sgs-cart__item-price" style={ s.price }>
						{ '£12.00' }
					</span>
				</div>
				<span className="sgs-cart__item-name" style={ s.name }>
					{ __( 'Sample product', 'sgs-blocks' ) }
				</span>
				<ul className="sgs-cart__item-details" style={ s.details }>
					<li>{ __( 'Size: M', 'sgs-blocks' ) }</li>
				</ul>
				{ false !== attrs.itemShowQty && (
					<div className="sgs-cart__item-row">
						{ 'stepper' === attrs.itemQtyStyle ? (
							<div
								className="sgs-cart__item-stepper"
								style={ s.qty }
							>
								<span
									className="sgs-cart__item-qty-step sgs-cart__item-qty-step--minus"
									aria-hidden="true"
								>
									&minus;
								</span>
								<input
									type="number"
									className="sgs-cart__item-qty-input"
									value={ 2 }
									readOnly
									tabIndex={ -1 }
									aria-label={ __(
										'Quantity',
										'sgs-blocks'
									) }
									style={ s.qtyNumber }
								/>
								<span
									className="sgs-cart__item-qty-step sgs-cart__item-qty-step--plus"
									aria-hidden="true"
								>
									+
								</span>
							</div>
						) : (
							<>
								<label className="sgs-cart__item-qty-label">
									{ __( 'Qty', 'sgs-blocks' ) }
								</label>
								<input
									type="number"
									className="sgs-cart__item-qty-input"
									value={ 1 }
									readOnly
									tabIndex={ -1 }
								/>
							</>
						) }
						{ removeAtEnd && removeLink }
					</div>
				) }
				{ ( showAddOptions ||
					showSave ||
					( removeText && ! removeAtEnd ) ) && (
					<div
						className="sgs-cart__item-actions"
						style={
							attrs.itemActionsFlexWrap
								? { flexWrap: attrs.itemActionsFlexWrap }
								: undefined
						}
					>
						{ showAddOptions && (
							<span
								className="sgs-cart__item-add-options sgs-cart__item-action"
								style={ { ...s.action, ...s.save } }
							>
								{ addOptionsLabel }
							</span>
						) }
						{ showSave && (
							<span
								className="sgs-cart__item-save-for-later sgs-cart__item-action"
								style={ { ...s.action, ...s.save } }
							>
								{ __( 'Save for later', 'sgs-blocks' ) }
							</span>
						) }
						{ removeText && ! removeAtEnd && removeLink }
					</div>
				) }
			</div>
			{ ! removeText && (
				<span className="sgs-cart__item-remove" aria-hidden="true">
					&times;
				</span>
			) }
		</div>
	);
}

/**
 * @param {Object} props             Props.
 * @param {Object} props.attributes  Block attributes.
 * @param {string} props.displayMode `flyout` or `drawer`.
 * @param {string} props.tier        The previewed device tier.
 * @param {Array}  props.palette     Theme colour palette.
 * @param {string} props.clientId    The block's editor client ID, scoping the separator lines.
 * @return {Element} The static panel.
 */
export default function PanelPreview( {
	attributes,
	displayMode,
	tier,
	palette,
	clientId,
} ) {
	const [ view, setView ] = useState( 'items' );
	const s = panelElementStyles( attributes, tier, palette );
	const isDrawer = 'drawer' === displayMode;
	const showEmpty = 'empty' === view;
	const note = ( attributes.panelInstalmentsNote || '' ).trim();
	const taxNote =
		attributes.panelTaxNote ??
		__( 'Shipping and taxes calculated at checkout.', 'sgs-blocks' );
	const scope = `sgs-ed-sep-${ clientId }`;
	// The centred empty state turns on with any of its additions, as includes/helpers-cart-panel-extras.php decides.
	const emptyImageUrl = logoUrlFor( attributes.emptyImageSource, tier );
	// The empty-state picture's own sizing for the previewed tier, as the shared media renderer prints it on the frontend.
	const emptyImageRatio = String(
		tierValueOf( attributes.emptyImageRatio, tier ) || ''
	).trim();
	const emptyImageStyle = {
		width: tierLengthPreview( attributes.emptyImageWidth, tier ),
		height: tierLengthPreview( attributes.emptyImageHeight, tier ),
		minWidth: tierLengthPreview( attributes.emptyImageMinWidth, tier ),
		maxWidth: tierLengthPreview( attributes.emptyImageMaxWidth, tier ),
		minHeight: tierLengthPreview( attributes.emptyImageMinHeight, tier ),
		maxHeight: tierLengthPreview( attributes.emptyImageMaxHeight, tier ),
		aspectRatio: emptyImageRatio || undefined,
	};
	const emptyBody = ( attributes.emptyBody || '' ).trim();
	const emptyHasButton = Number( attributes.emptyProductId ) > 0;
	const emptyRich =
		'' !== emptyImageUrl ||
		'' !== emptyBody ||
		emptyHasButton ||
		'' !== ( attributes.emptyCtaUrl || '' ).trim();
	const emptyButtonLabel =
		( attributes.emptyButtonLabel || '' ).trim() ||
		__( 'Add to basket', 'sgs-blocks' );
	const giftHelp = ( attributes.panelGiftHelp || '' ).trim();
	// The gift box sits inside the item list under the lines when placed after the items, else above the footer.
	const giftAfterItems = 'after-items' === attributes.panelGiftPlacement;
	const giftBox = attributes.panelGiftShow && (
		<div
			className={ `sgs-cart__panel-gift${
				giftAfterItems ? ' sgs-cart__panel-gift--after-items' : ''
			}` }
			style={ s.giftBox }
		>
			<label className="sgs-cart__panel-gift-switch">
				<input
					type="checkbox"
					className="sgs-cart__panel-gift-checkbox"
					disabled
				/>
				<span className="sgs-cart__panel-gift-text">
					<span
						className="sgs-cart__panel-gift-label"
						style={ s.giftLabel }
					>
						{ attributes.panelGiftLabel }
					</span>
					{ '' !== giftHelp && (
						<span
							className="sgs-cart__panel-gift-help"
							style={ s.giftHelp }
						>
							{ giftHelp }
						</span>
					) }
				</span>
			</label>
			<div className="sgs-cart__panel-gift-fields">
				<span className="sgs-cart__panel-gift-field-label">
					{ attributes.panelGiftToLabel }
				</span>
				<input
					type="text"
					className="sgs-cart__panel-gift-to"
					readOnly
					tabIndex={ -1 }
					aria-hidden="true"
					style={ s.giftField }
				/>
				<span className="sgs-cart__panel-gift-field-label">
					{ attributes.panelGiftMessageLabel }
				</span>
				<textarea
					className="sgs-cart__panel-gift-message"
					rows={ 2 }
					readOnly
					tabIndex={ -1 }
					aria-hidden="true"
					style={ { ...s.giftField, ...s.giftMessage } }
				/>
			</div>
		</div>
	);
	// The upsell row under the basket lines, shown in the canvas whenever a product is chosen.
	const upsellLabel =
		( attributes.upsellButtonLabel || '' ).trim() ||
		__( 'Add', 'sgs-blocks' );
	const upsell = Number( attributes.upsellProductId ) > 0 && (
		<div className="sgs-cart__panel-upsell" style={ s.upsell }>
			{ false !== attributes.upsellShowImage && (
				<span
					className="sgs-cart__panel-upsell-image sgs-cart__item-thumb--placeholder"
					aria-hidden="true"
					style={ s.upsellImage }
				/>
			) }
			<div className="sgs-cart__panel-upsell-text">
				<p
					className="sgs-cart__panel-upsell-title"
					style={ s.upsellTitle }
				>
					{ ( attributes.upsellTitle || '' ).trim() ||
						__( 'Chosen product', 'sgs-blocks' ) }
				</p>
				{ '' !== ( attributes.upsellText || '' ).trim() && (
					<p
						className="sgs-cart__panel-upsell-body"
						style={ s.upsellText }
					>
						{ attributes.upsellText.replace( '{price}', '£5.00' ) }
					</p>
				) }
			</div>
			<span
				className="sgs-cart__panel-upsell-add"
				style={ s.upsellButton }
			>
				{ upsellLabel.replace( '{price}', '£5.00' ) }
			</span>
		</div>
	);
	// The footer's actions: View cart as a button or a link, and Checkout first when the two are stacked (as the markup orders them).
	const stacked = 'stacked' === attributes.panelActionsLayout;
	const viewCart = false !== attributes.panelShowViewCart && (
		<span
			className={ `sgs-cart__panel-view${
				'text-link' === attributes.panelViewStyle
					? ' sgs-cart__panel-view--link'
					: ''
			}` }
			style={ s.view }
		>
			<AuthoredText value={ attributes.viewCartLabel } />
		</span>
	);

	// The line between item rows: the canvas mirrors the item-drawn rules the front end
	// emits (includes/helpers-cart-panel-css.php) for the previewed device, in the space
	// `panelBodyGap` sets (16px when unset).
	const separatorsCss = useSeparatorsCanvas( {
		separators: attributes.separators,
		device: tier,
		name: 'sgs/cart',
		line: {
			item: `.${ scope } .sgs-cart__panel-items > .sgs-cart__item`,
			direction: 'column',
			gap: tierLengthPreview( attributes.panelBodyGap, tier ) || '16px',
		},
	} ).css;

	return (
		<div
			className={ `sgs-cart__panel-preview ${ scope }${
				isDrawer ? ' sgs-cart__panel-preview--drawer' : ''
			}` }
		>
			{ ! showEmpty && separatorsCss && <style>{ separatorsCss }</style> }
			{ isDrawer && (
				<div
					className="sgs-cart__panel-preview-scrim"
					style={ scrimPreviewStyle( attributes, tier, palette ) }
					aria-hidden="true"
				/>
			) }
			<div className="sgs-cart__panel-preview-switch">
				<Button
					size="small"
					variant={ showEmpty ? 'secondary' : 'primary' }
					onClick={ () => setView( 'items' ) }
				>
					{ __( 'Items', 'sgs-blocks' ) }
				</Button>
				<Button
					size="small"
					variant={ showEmpty ? 'primary' : 'secondary' }
					onClick={ () => setView( 'empty' ) }
				>
					{ __( 'Empty cart', 'sgs-blocks' ) }
				</Button>
			</div>
			<div
				className={ `sgs-cart__panel sgs-cart__panel--${
					isDrawer ? 'drawer' : 'flyout'
				} sgs-cart__panel--editor` }
				style={ panelRootStyle( attributes, tier, palette ) }
			>
				<div className="sgs-cart__panel-inner">
					<div className="sgs-cart__panel-header" style={ s.header }>
						<p
							className="sgs-cart__panel-heading"
							style={ s.heading }
						>
							<AuthoredText value={ attributes.panelHeading } />
							{ attributes.panelShowCount && (
								<>
									{ ' ' }
									<span
										className="sgs-cart__panel-count"
										style={ s.count }
									>
										{ '(1)' }
									</span>
								</>
							) }
						</p>
						{ isDrawer && (
							<span
								className="sgs-cart__panel-close"
								style={ s.close }
							>
								<CloseGlyph />
							</span>
						) }
					</div>
					{ showEmpty ? (
						<div
							className="sgs-cart__panel-items"
							style={ s.items }
						>
							<div
								className={ `sgs-cart__panel-empty${
									emptyRich
										? ' sgs-cart__panel-empty--rich'
										: ''
								}` }
								style={ { ...s.empty } }
							>
								{ emptyRich && '' !== emptyImageUrl && (
									<div className="sgs-cart__panel-empty-media">
										<img
											src={ emptyImageUrl }
											alt=""
											style={ emptyImageStyle }
										/>
									</div>
								) }
								{ emptyRich ? (
									<p
										className="sgs-cart__panel-empty-message"
										style={ s.emptyMessage }
									>
										<AuthoredText
											value={
												attributes.emptyCartMessage
											}
										/>
									</p>
								) : (
									<p
										className="sgs-cart__panel-empty-message"
										style={ s.emptyMessage }
									>
										<AuthoredText
											value={
												attributes.emptyCartMessage
											}
										/>
									</p>
								) }
								{ emptyRich && '' !== emptyBody && (
									<AuthoredText
										as="p"
										className="sgs-cart__panel-empty-body"
										style={ s.emptyBody }
										value={ emptyBody }
									/>
								) }
								{ emptyRich && emptyHasButton && (
									<span
										className="sgs-cart__panel-empty-cta sgs-cart__panel-empty-add"
										style={ s.emptyCta }
									>
										{ emptyButtonLabel.replace(
											'{price}',
											'£5.00'
										) }
									</span>
								) }
								{ ( ! emptyRich ||
									'' !==
										(
											attributes.emptyCartCtaLabel || ''
										).trim() ) && (
									<span
										className={
											emptyRich
												? 'sgs-cart__panel-empty-link'
												: 'sgs-cart__panel-empty-cta'
										}
										style={
											emptyRich ? s.emptyLink : s.emptyCta
										}
									>
										<AuthoredText
											value={
												attributes.emptyCartCtaLabel
											}
										/>
									</span>
								) }
							</div>
						</div>
					) : (
						<>
							<div
								className="sgs-cart__free-delivery"
								style={ s.freeBand }
							>
								<p
									className="sgs-cart__free-delivery-text"
									style={ s.freeText }
								>
									{ __(
										'You are £10.00 away from free delivery',
										'sgs-blocks'
									) }
								</p>
								<div
									className="sgs-cart__free-delivery-track"
									style={ s.freeTrack }
								>
									<div
										className="sgs-cart__free-delivery-fill"
										style={ {
											width: '50%',
											...s.freeFill,
										} }
									/>
								</div>
							</div>
							<div
								className="sgs-cart__panel-items"
								style={ s.items }
							>
								<SampleItem attrs={ attributes } s={ s } />
								<SampleItem attrs={ attributes } s={ s } />
								{ giftAfterItems && giftBox }
								{ upsell }
							</div>
							{ ! giftAfterItems && giftBox }
							<div
								className="sgs-cart__panel-footer"
								style={ s.footer }
							>
								<div
									className="sgs-cart__panel-subtotal"
									style={ s.subtotal }
								>
									<span className="sgs-cart__panel-subtotal-label">
										{ __( 'Subtotal', 'sgs-blocks' ) }
									</span>
									<span
										className="sgs-cart__panel-subtotal-value"
										style={ s.subtotalValue }
									>
										{ '£12.00' }
									</span>
								</div>
								{ '' !== taxNote && (
									<AuthoredText
										as="p"
										className="sgs-cart__panel-tax-note"
										style={ s.taxNote }
										value={ taxNote }
									/>
								) }
								<div
									className={ `sgs-cart__panel-actions${
										stacked
											? ' sgs-cart__panel-actions--stacked'
											: ''
									}` }
									style={
										attributes.panelActionsFlexWrap
											? {
													flexWrap:
														attributes.panelActionsFlexWrap,
											  }
											: undefined
									}
								>
									{ ! stacked && viewCart }
									<span
										className="sgs-cart__panel-checkout"
										style={ s.checkout }
									>
										<AuthoredText
											value={ attributes.checkoutLabel }
										/>
									</span>
									{ stacked && viewCart }
								</div>
								{ '' !== note && (
									<AuthoredText
										as="p"
										className="sgs-cart__panel-note"
										style={ s.note }
										value={ note.replace( '%s', '£4.00' ) }
									/>
								) }
							</div>
						</>
					) }
				</div>
			</div>
		</div>
	);
}
