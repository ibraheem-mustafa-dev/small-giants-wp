/**
 * sgs/account — inspector panels for wording, page headers, addresses, account details and the sign-in button.
 *
 * Every control writes one attribute that is absent until set, so an untouched block keeps WooCommerce's look
 * (block.json holds no default for them).
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import { SgsBorderControl, ShadowControl } from '../../components';
import { Choice, TextField, TierBox, TierLength, Toggle } from './extraControls';

const WORDING = [
	[ 'signIn', __( 'Sign in button (WooCommerce: Log in)', 'sgs-blocks' ), 'Log in' ],
	[ 'usernameLabel', __( 'Sign in field label', 'sgs-blocks' ), 'Username or email address' ],
	[ 'rememberMe', __( 'Remember me', 'sgs-blocks' ), 'Remember me' ],
	[ 'lostPassword', __( 'Lost password link', 'sgs-blocks' ), 'Lost your password?' ],
	[ 'resetPassword', __( 'Reset password button', 'sgs-blocks' ), 'Reset password' ],
	[ 'register', __( 'Register button', 'sgs-blocks' ), 'Register' ],
	[ 'signOut', __( 'Sign out (menu)', 'sgs-blocks' ), 'Log out' ],
	[ 'orders', __( 'Orders (menu)', 'sgs-blocks' ), 'Orders' ],
	[ 'addresses', __( 'Addresses (menu)', 'sgs-blocks' ), 'Addresses' ],
	[ 'accountDetails', __( 'Account details (menu)', 'sgs-blocks' ), 'Account details' ],
	[ 'savedItems', __( 'Saved items (menu)', 'sgs-blocks' ), 'Saved items' ],
	[ 'billingAddress', __( 'Billing address title', 'sgs-blocks' ), 'Billing address' ],
	[ 'shippingAddress', __( 'Shipping address title', 'sgs-blocks' ), 'Shipping address' ],
	[ 'passwordChange', __( 'Password change heading', 'sgs-blocks' ), 'Password change' ],
];

const VIEWS = [
	[ 'headerSignIn', __( 'Sign in page', 'sgs-blocks' ) ],
	[ 'headerLost', __( 'Lost password page', 'sgs-blocks' ) ],
	[ 'headerAccount', __( 'Signed-in account', 'sgs-blocks' ) ],
];

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The Wording panel.
 */
export function WordingPanel( { attributes, setAttributes } ) {
	const strings = attributes.strings && 'object' === typeof attributes.strings ? attributes.strings : {};
	return (
		<PanelBody title={ __( 'Wording', 'sgs-blocks' ) } initialOpen={ false }>
			<p>{ __( 'Replace WooCommerce’s wording in this block only. Leave a field empty to keep the default. A trailing arrow such as “Sign in →” works.', 'sgs-blocks' ) }</p>
			{ WORDING.map( ( [ key, label, placeholder ] ) => (
				<TextControl
					key={ key }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
					label={ label }
					placeholder={ placeholder }
					value={ strings[ key ] ?? '' }
					onChange={ ( value ) => {
						const next = { ...strings, [ key ]: value };
						if ( ! value ) {
							delete next[ key ];
						}
						setAttributes( { strings: next } );
					} }
				/>
			) ) }
		</PanelBody>
	);
}

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The Page header panel.
 */
export function HeaderPanel( { attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	return (
		<PanelBody title={ __( 'Page header', 'sgs-blocks' ) } initialOpen={ false }>
			<Choice
				{ ...p }
				name="headerTitleTag"
				label={ __( 'Title heading level', 'sgs-blocks' ) }
				options={ [
					{ label: __( 'H2 (default)', 'sgs-blocks' ), value: '' },
					{ label: 'H1', value: 'h1' },
					{ label: 'H3', value: 'h3' },
				] }
			/>
			{ VIEWS.map( ( [ prefix, label ] ) => (
				<PanelBody key={ prefix } title={ label } initialOpen={ false }>
					<TextField { ...p } name={ prefix + 'Eyebrow' } label={ __( 'Eyebrow', 'sgs-blocks' ) } />
					<TextField
						{ ...p }
						name={ prefix + 'Title' }
						label={ __( 'Title', 'sgs-blocks' ) }
						help={ 'headerAccount' === prefix ? __( 'Use {first_name} for the customer’s first name.', 'sgs-blocks' ) : undefined }
					/>
					<TextField { ...p } name={ prefix + 'Intro' } label={ __( 'Intro line', 'sgs-blocks' ) } />
					{ 'headerLost' === prefix && (
						<TextField { ...p } name="headerLostBackLabel" label={ __( 'Back to sign in link', 'sgs-blocks' ) } />
					) }
					{ 'headerAccount' === prefix && (
						<>
							<TextField
								{ ...p }
								name="headerAccountMeta"
								label={ __( 'Right-hand line', 'sgs-blocks' ) }
								help={ __( 'For example “Signed in as {email}”.', 'sgs-blocks' ) }
							/>
							<Toggle { ...p } name="headerAccountRule" label={ __( 'Rule under the header', 'sgs-blocks' ) } />
						</>
					) }
				</PanelBody>
			) ) }
		</PanelBody>
	);
}

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The Addresses panel.
 */
export function AddressesPanel( { attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	const radius = attributes.addressCardBorderRadius;
	return (
		<PanelBody title={ __( 'Address cards', 'sgs-blocks' ) } initialOpen={ false }>
			<TextField
				{ ...p }
				name="addressHelperText"
				label={ __( 'Helper line under the cards', 'sgs-blocks' ) }
			/>
			<SgsBorderControl
				widthValues={ attributes.addressCardBorderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { addressCardBorderWidth: next } ) }
				styleValue={ attributes.addressCardBorderStyle }
				onStyleChange={ ( val ) => setAttributes( { addressCardBorderStyle: val || undefined } ) }
				colourLabel={ __( 'Card border colour', 'sgs-blocks' ) }
				colourValue={ attributes.addressCardBorderColour }
				onColourChange={ ( val ) => setAttributes( { addressCardBorderColour: val || undefined } ) }
				colourLinked
				radiusValues={ {
					base: radius?.desktop ?? {},
					tablet: radius?.tablet ?? {},
					mobile: radius?.mobile ?? {},
				} }
				onRadiusChange={ ( tier, next ) => {
					const key = 'base' === tier ? 'desktop' : tier;
					setAttributes( { addressCardBorderRadius: { ...radius, [ key ]: next } } );
				} }
			/>
			<ShadowControl
				label={ __( 'Card shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base: 'addressCardShadow', colour: 'addressCardShadowColour' } }
			/>
			<TierBox { ...p } name="addressCardPadding" label={ __( 'Card padding', 'sgs-blocks' ) } />
		</PanelBody>
	);
}

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The Account details panel.
 */
export function AccountDetailsPanel( { attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	return (
		<PanelBody title={ __( 'Account details form', 'sgs-blocks' ) } initialOpen={ false }>
			<Choice
				{ ...p }
				name="accountFormColumns"
				label={ __( 'Field columns', 'sgs-blocks' ) }
				options={ [
					{ label: __( 'WooCommerce default', 'sgs-blocks' ), value: '' },
					{ label: __( 'One column', 'sgs-blocks' ), value: '1' },
					{ label: __( 'Two columns', 'sgs-blocks' ), value: '2' },
				] }
			/>
			<TierLength { ...p } name="accountFormGap" label={ __( 'Space between fields', 'sgs-blocks' ) } />
			<Toggle
				{ ...p }
				name="accountDisplayFromNames"
				label={ __( 'Display name from first and last name', 'sgs-blocks' ) }
				help={ __( 'Hides the Display name field and fills it from the two names on save.', 'sgs-blocks' ) }
			/>
			<Toggle
				{ ...p }
				name="accountShowMobile"
				label={ __( 'Show a Mobile field', 'sgs-blocks' ) }
				help={ __( 'Saved to the customer’s billing phone.', 'sgs-blocks' ) }
			/>
			{ attributes.accountShowMobile && (
				<TextField { ...p } name="accountMobileLabel" label={ __( 'Mobile field label', 'sgs-blocks' ) } />
			) }
			<TextField { ...p } name="accountPasswordHelper" label={ __( 'Text under the password heading', 'sgs-blocks' ) } />
			<Toggle { ...p } name="accountSaveFullWidth" label={ __( 'Save button full width', 'sgs-blocks' ) } />
		</PanelBody>
	);
}

/**
 * @param {Object}   props               Panel props.
 * @param {Object}   props.attributes    Block attributes.
 * @param {Function} props.setAttributes Attribute setter.
 * @return {JSX.Element} The Sign in button panel.
 */
export function SignInButtonPanel( { attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	const radius = attributes.loginButtonBorderRadius;
	return (
		<PanelBody title={ __( 'Sign in button and link', 'sgs-blocks' ) } initialOpen={ false }>
			<Choice
				{ ...p }
				name="loginButtonPreset"
				label={ __( 'Start from the site’s button style', 'sgs-blocks' ) }
				options={ [
					{ label: __( 'WooCommerce button', 'sgs-blocks' ), value: '' },
					{ label: __( 'Primary button', 'sgs-blocks' ), value: 'primary' },
					{ label: __( 'Secondary button', 'sgs-blocks' ), value: 'secondary' },
				] }
			/>
			<Choice
				{ ...p }
				name="loginButtonScope"
				label={ __( 'Applies to', 'sgs-blocks' ) }
				options={ [
					{ label: __( 'Sign in button only', 'sgs-blocks' ), value: '' },
					{ label: __( 'Every form button (register, reset, account, address)', 'sgs-blocks' ), value: 'all-forms' },
				] }
			/>
			<Toggle { ...p } name="loginButtonFullWidth" label={ __( 'Full width', 'sgs-blocks' ) } />
			<TierLength { ...p } name="loginButtonMinHeight" label={ __( 'Minimum height', 'sgs-blocks' ) } />
			<TierBox { ...p } name="loginButtonPadding" label={ __( 'Padding', 'sgs-blocks' ) } />
			<SgsBorderControl
				widthValues={ attributes.loginButtonBorderWidth ?? {} }
				onWidthChange={ ( next ) => setAttributes( { loginButtonBorderWidth: next } ) }
				styleValue={ attributes.loginButtonBorderStyle }
				onStyleChange={ ( val ) => setAttributes( { loginButtonBorderStyle: val || undefined } ) }
				colourLabel={ __( 'Border colour', 'sgs-blocks' ) }
				colourValue={ attributes.loginButtonBorderColour }
				onColourChange={ ( val ) => setAttributes( { loginButtonBorderColour: val || undefined } ) }
				colourLinked
				radiusValues={ {
					base: radius?.desktop ?? {},
					tablet: radius?.tablet ?? {},
					mobile: radius?.mobile ?? {},
				} }
				onRadiusChange={ ( tier, next ) => {
					const key = 'base' === tier ? 'desktop' : tier;
					setAttributes( { loginButtonBorderRadius: { ...radius, [ key ]: next } } );
				} }
			/>
			<ShadowControl
				label={ __( 'Button shadow', 'sgs-blocks' ) }
				attributes={ attributes }
				setAttributes={ setAttributes }
				attrNames={ { base: 'loginButtonShadow', colour: 'loginButtonShadowColour' } }
			/>
			<Choice
				{ ...p }
				name="loginLinkPlacement"
				label={ __( 'Lost password link', 'sgs-blocks' ) }
				options={ [
					{ label: __( 'On its own line (default)', 'sgs-blocks' ), value: '' },
					{ label: __( 'On the Remember me row', 'sgs-blocks' ), value: 'remember-row' },
					{ label: __( 'Beside the sign in button', 'sgs-blocks' ), value: 'beside-button' },
				] }
			/>
			<Toggle { ...p } name="hideRememberMe" label={ __( 'Hide Remember me', 'sgs-blocks' ) } />
		</PanelBody>
	);
}
