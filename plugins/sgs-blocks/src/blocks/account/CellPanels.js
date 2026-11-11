/**
 * sgs/account — spacing, size, border and underline settings that replace hand-written Custom CSS. Each row is
 * [ attribute, kind, label ]; the kind picks the control and matches the kind the PHP side prints
 * (includes/account/helpers-account-cells-css.php): len and edge and frame and rule take a length per device, num a
 * unitless number per device, box four sides per device, sel an underline choice and tog an on/off switch.
 * Every attribute is absent until set, so an untouched block keeps the stylesheet's look.
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import { ResponsiveOverride, SgsLengthControl } from '../../components';
import { Choice, TierBox, Toggle } from './extraControls';

const ROWS_MENU = [
	[ 'menuSidebarBorderWidth', 'edge', __( 'Sidebar line width (desktop sidebar)', 'sgs-blocks' ) ],
	[ 'menuTabRowBorderWidth', 'edge', __( 'Tab row line width', 'sgs-blocks' ) ],
	[ 'menuTabRowMarginBottom', 'len', __( 'Space under the tab row', 'sgs-blocks' ) ],
	[ 'menuItemMinHeight', 'len', __( 'Menu item minimum height', 'sgs-blocks' ) ],
	[ 'menuItemPadding', 'box', __( 'Menu item padding', 'sgs-blocks' ) ],
	[ 'menuItemRadius', 'len', __( 'Menu item corner radius', 'sgs-blocks' ) ],
	[ 'menuItemGap', 'len', __( 'Gap between a menu item\'s icon, text and count', 'sgs-blocks' ) ],
	[ 'menuListGap', 'len', __( 'Gap between menu items', 'sgs-blocks' ) ],
	[ 'menuListPadding', 'box', __( 'Menu list padding', 'sgs-blocks' ) ],
];

const ROWS_HEAD = [
	[ 'headerEyebrowMarginBottom', 'len', __( 'Space under the eyebrow', 'sgs-blocks' ) ],
	[ 'headerAccountEyebrowMarginBottom', 'len', __( 'Space under the eyebrow (account view)', 'sgs-blocks' ) ],
	[ 'headerSignInMarginBottom', 'len', __( 'Space under the header (sign-in view)', 'sgs-blocks' ) ],
	[ 'headerResetMarginBottom', 'len', __( 'Space under the header (new-password view)', 'sgs-blocks' ) ],
	[ 'headerAccountTitleLineHeight', 'num', __( 'Title line height (account view)', 'sgs-blocks' ) ],
	[ 'headerBackLineMargin', 'box', __( 'Back link line margin', 'sgs-blocks' ) ],
	[ 'headerBackRuleWidth', 'rule', __( 'Back link bottom rule width (replaces its underline)', 'sgs-blocks' ) ],
	[ 'registerHintMarginTop', 'len', __( 'Register hint: space above', 'sgs-blocks' ) ],
	[ 'mobileHintMargin', 'box', __( 'Mobile hint margin', 'sgs-blocks' ) ],
];

const ROWS_AUTH = [
	[ 'authPairGap', 'len', __( 'Gap between the sign-in and register panels', 'sgs-blocks' ) ],
	[ 'authPairBorderWidth', 'frame', __( 'Frame width around the two panels', 'sgs-blocks' ) ],
	[ 'authPairCellPadding', 'box', __( 'Panel padding', 'sgs-blocks' ) ],
	[ 'authPairCellBorderWidth', 'frame', __( 'Panel border width', 'sgs-blocks' ) ],
	[ 'authPairCellRadius', 'len', __( 'Panel corner radius', 'sgs-blocks' ) ],
	[ 'authPanelHeadingMargin', 'box', __( 'Panel heading margin', 'sgs-blocks' ) ],
	[ 'authFormRowGap', 'len', __( 'Space between rows of the sign-in and register forms', 'sgs-blocks' ) ],
	[ 'loginFormRowGap', 'len', __( 'Space between rows of the sign-in form', 'sgs-blocks' ) ],
	[ 'loginRowMarginBottom', 'len', __( 'Space under each sign-in field, Remember me and Lost password', 'sgs-blocks' ) ],
	[ 'loginLinkPadding', 'box', __( 'Lost password line padding', 'sgs-blocks' ) ],
	[ 'loginLinkRuleWidth', 'rule', __( 'Lost password link bottom rule width (replaces its underline)', 'sgs-blocks' ) ],
	[ 'loginRememberMinHeight', 'len', __( 'Remember me row minimum height', 'sgs-blocks' ) ],
	[ 'loginRememberGap', 'len', __( 'Remember me row gap', 'sgs-blocks' ) ],
	[ 'rememberCheckboxSize', 'len', __( 'Remember me checkbox size', 'sgs-blocks' ) ],
	[ 'privacyLinkTextDecoration', 'sel', __( 'Privacy text link underline', 'sgs-blocks' ) ],
];

const ROWS_RESET = [
	[ 'resetFormMaxWidth', 'len', __( 'Form maximum width', 'sgs-blocks' ) ],
	[ 'resetFormBorderWidth', 'frame', __( 'Form border width', 'sgs-blocks' ) ],
	[ 'resetFormRadius', 'len', __( 'Form corner radius', 'sgs-blocks' ) ],
	[ 'resetFormPadding', 'box', __( 'Form padding', 'sgs-blocks' ) ],
	[ 'resetFormGap', 'len', __( 'Space between the form rows', 'sgs-blocks' ) ],
	[ 'resetHideIntro', 'tog', __( 'Hide WooCommerce\'s intro paragraph', 'sgs-blocks' ) ],
	[ 'resetRowMargin', 'box', __( 'Form row margin', 'sgs-blocks' ) ],
	[ 'resetRowPadding', 'box', __( 'Form row padding', 'sgs-blocks' ) ],
	[ 'resetErrorMargin', 'box', __( 'Error line margin', 'sgs-blocks' ) ],
	[ 'resetNoticeBorderWidth', 'frame', __( 'Error notice border width', 'sgs-blocks' ) ],
	[ 'resetNoticePadding', 'box', __( 'Error notice padding', 'sgs-blocks' ) ],
	[ 'resetNoticeMargin', 'box', __( 'Error notice margin', 'sgs-blocks' ) ],
	[ 'resetNoticeItemPadding', 'box', __( 'Error notice item padding', 'sgs-blocks' ) ],
];

const ROWS_DETAILS = [
	[ 'accountFormMaxWidth', 'len', __( 'Form maximum width', 'sgs-blocks' ) ],
	[ 'accountFieldsetBorderWidth', 'frame', __( 'Section border width', 'sgs-blocks' ) ],
	[ 'accountFieldsetMargin', 'box', __( 'Section margin', 'sgs-blocks' ) ],
	[ 'accountFieldsetPadding', 'box', __( 'Section padding', 'sgs-blocks' ) ],
	[ 'accountFieldsetGap', 'len', __( 'Space between section fields', 'sgs-blocks' ) ],
	[ 'accountLegendPadding', 'box', __( 'Section heading padding', 'sgs-blocks' ) ],
	[ 'accountLegendMargin', 'box', __( 'Section heading margin', 'sgs-blocks' ) ],
	[ 'accountLegendRuleWidth', 'edge', __( 'Section heading top rule width', 'sgs-blocks' ) ],
	[ 'accountFormRowMargin', 'box', __( 'Field row margin', 'sgs-blocks' ) ],
	[ 'accountFormRowPadding', 'box', __( 'Field row padding', 'sgs-blocks' ) ],
	[ 'accountPasswordHelperMargin', 'box', __( 'Password helper margin', 'sgs-blocks' ) ],
];

const ROWS_ADDR = [
	[ 'saveAddressMinHeight', 'len', __( 'Save address button minimum height', 'sgs-blocks' ) ],
	[ 'saveAddressPadding', 'box', __( 'Save address button padding', 'sgs-blocks' ) ],
	[ 'addressTitleRowGap', 'len', __( 'Title row gap', 'sgs-blocks' ) ],
	[ 'addressTitleRowMarginBottom', 'len', __( 'Space under the title row', 'sgs-blocks' ) ],
	[ 'addressTitleRowPadding', 'box', __( 'Title row padding', 'sgs-blocks' ) ],
	[ 'addressTitleMargin', 'box', __( 'Title margin', 'sgs-blocks' ) ],
	[ 'addressTitlePadding', 'box', __( 'Title padding', 'sgs-blocks' ) ],
	[ 'addressEditRuleWidth', 'rule', __( 'Edit link bottom rule width (replaces its underline)', 'sgs-blocks' ) ],
	[ 'addressEditMargin', 'box', __( 'Edit link margin', 'sgs-blocks' ) ],
	[ 'addressHelperMarginTop', 'len', __( 'Helper line: space above', 'sgs-blocks' ) ],
	[ 'addressActionsMarginTop', 'len', __( 'Address buttons: space above', 'sgs-blocks' ) ],
];

const ROWS_ORDER = [
	[ 'orderDetailBackMinHeight', 'len', __( 'Back link minimum height', 'sgs-blocks' ) ],
	[ 'orderDetailBackGap', 'len', __( 'Back link arrow gap', 'sgs-blocks' ) ],
	[ 'orderDetailChatUnderline', 'sel', __( 'WhatsApp card underline', 'sgs-blocks' ) ],
	[ 'orderDetailBoxTitleMarginBottom', 'len', __( 'Box title: space under', 'sgs-blocks' ) ],
	[ 'orderDetailLastBoxTitleMarginBottom', 'len', __( 'Last box title: space under', 'sgs-blocks' ) ],
	[ 'orderDetailTotalRowPaddingTop', 'len', __( 'Total row: padding above', 'sgs-blocks' ) ],
	[ 'orderDetailTotalRowMarginTop', 'len', __( 'Total row: space above', 'sgs-blocks' ) ],
	[ 'orderDetailTotalRowRuleWidth', 'edge', __( 'Total row top rule width', 'sgs-blocks' ) ],
	[ 'orderDetailTitleMarginBottom', 'len', __( 'Heading: space under', 'sgs-blocks' ) ],
	[ 'orderDetailItemMetaMarginTop', 'len', __( 'Item detail line: space above', 'sgs-blocks' ) ],
	[ 'ordersRowTextDecoration', 'sel', __( 'Order row underline', 'sgs-blocks' ) ],
];

const ROWS_TABS = [
	[ 'ordersEmptyButtonMinHeight', 'len', __( 'Empty orders button minimum height', 'sgs-blocks' ) ],
	[ 'ordersEmptyButtonPadding', 'box', __( 'Empty orders button padding', 'sgs-blocks' ) ],
	[ 'tabHeadingMarginBottom', 'len', __( 'Tab heading: space under', 'sgs-blocks' ) ],
	[ 'signedOutMaxWidth', 'len', __( 'Signed-out maximum width', 'sgs-blocks' ) ],
];

const UNDERLINE = [
	{ label: __( 'Default', 'sgs-blocks' ), value: '' },
	{ label: __( 'None', 'sgs-blocks' ), value: 'none' },
	{ label: __( 'Underline', 'sgs-blocks' ), value: 'underline' },
];

/**
 * @param {Object}   p
 * @param {string}   p.name          Tier-object attribute name.
 * @param {string}   p.label         Control label.
 * @param {Object}   p.attributes    Block attributes.
 * @param {Function} p.setAttributes Attribute setter.
 * @return {JSX.Element} A length per device.
 */
function TierLength( { name, label, attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label={ label }
			value={ attributes[ name ] }
			onChange={ ( obj ) => setAttributes( { [ name ]: obj } ) }
		>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<SgsLengthControl
					presets
					label={ label }
					hideLabelFromVision
					value={ ownValue ?? '' }
					placeholder={ inherited ? effectiveValue : '' }
					onChange={ ( val ) => setOwnValue( val || undefined ) }
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * @param {Object}   p
 * @param {string}   p.name          Tier-object attribute name.
 * @param {string}   p.label         Control label.
 * @param {Object}   p.attributes    Block attributes.
 * @param {Function} p.setAttributes Attribute setter.
 * @return {JSX.Element} A unitless number per device.
 */
function TierNumber( { name, label, attributes, setAttributes } ) {
	return (
		<ResponsiveOverride
			label={ label }
			value={ attributes[ name ] }
			onChange={ ( obj ) => setAttributes( { [ name ]: obj } ) }
		>
			{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
				<TextControl
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					type="number"
					step="0.05"
					label={ label }
					hideLabelFromVision
					value={ ownValue ?? '' }
					placeholder={ inherited ? String( effectiveValue ?? '' ) : '' }
					onChange={ ( val ) => setOwnValue( '' === val ? undefined : Number( val ) ) }
				/>
			) }
		</ResponsiveOverride>
	);
}

/**
 * One panel of setting rows.
 *
 * @param {Object}   p
 * @param {string}   p.title         Panel title.
 * @param {Array}    p.rows          [ attribute, kind, label ] rows.
 * @param {Object}   p.attributes    Block attributes.
 * @param {Function} p.setAttributes Attribute setter.
 * @return {JSX.Element} The panel.
 */
function CellRows( { title, rows, attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	return (
		<PanelBody title={ title } initialOpen={ false }>
			{ rows.map( ( [ name, kind, label ] ) => {
				if ( 'box' === kind ) {
					return <TierBox key={ name } { ...p } name={ name } label={ label } />;
				}
				if ( 'num' === kind ) {
					return <TierNumber key={ name } { ...p } name={ name } label={ label } />;
				}
				if ( 'sel' === kind ) {
					return <Choice key={ name } { ...p } name={ name } label={ label } options={ UNDERLINE } />;
				}
				if ( 'tog' === kind ) {
					return <Toggle key={ name } { ...p } name={ name } label={ label } />;
				}
				return <TierLength key={ name } { ...p } name={ name } label={ label } />;
			} ) }
		</PanelBody>
	);
}

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The spacing and size panels.
 */
export default function CellPanels( { attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	return (
		<>
			<CellRows { ...p } title={ __( 'Menu: frame and items', 'sgs-blocks' ) } rows={ ROWS_MENU } />
			<CellRows { ...p } title={ __( 'Page header: spacing', 'sgs-blocks' ) } rows={ ROWS_HEAD } />
			<CellRows { ...p } title={ __( 'Sign-in and register: spacing and size', 'sgs-blocks' ) } rows={ ROWS_AUTH } />
			<CellRows { ...p } title={ __( 'Reset view: spacing and size', 'sgs-blocks' ) } rows={ ROWS_RESET } />
			<CellRows { ...p } title={ __( 'Account details: spacing', 'sgs-blocks' ) } rows={ ROWS_DETAILS } />
			<CellRows { ...p } title={ __( 'Addresses: spacing and size', 'sgs-blocks' ) } rows={ ROWS_ADDR } />
			<CellRows { ...p } title={ __( 'Order page: spacing and underline', 'sgs-blocks' ) } rows={ ROWS_ORDER } />
			<CellRows { ...p } title={ __( 'Orders, tabs and signed-out width', 'sgs-blocks' ) } rows={ ROWS_TABS } />
		</>
	);
}
