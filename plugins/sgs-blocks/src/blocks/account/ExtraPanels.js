/**
 * sgs/account — inspector panels for wording, page headers, addresses, account details and the sign-in button.
 *
 * Every control writes one attribute that is absent until set, so an untouched block keeps WooCommerce's look
 * (block.json holds no default for them).
 */
import { __ } from '@wordpress/i18n';
import { PanelBody, TextControl } from '@wordpress/components';
import { ResponsiveOverride, SgsBorderControl, SgsLengthControl, ShadowControl } from '../../components';
import { Choice, TextField, TierBox, Toggle } from './extraControls';

const WORDING = [
	[ 'signIn', __( 'Sign in button (WooCommerce: Log in)', 'sgs-blocks' ), 'Log in' ],
	[ 'signInHeading', __( 'Sign in panel heading (WooCommerce: Login)', 'sgs-blocks' ), 'Login' ],
	[ 'registerHeading', __( 'Register panel heading', 'sgs-blocks' ), 'Register' ],
	[ 'usernameLabel', __( 'Sign in field label', 'sgs-blocks' ), 'Username or email address' ],
	[ 'lostUsernameLabel', __( 'Lost password field label', 'sgs-blocks' ), 'Username or email' ],
	[ 'rememberMe', __( 'Remember me', 'sgs-blocks' ), 'Remember me' ],
	[ 'lostPassword', __( 'Lost password link', 'sgs-blocks' ), 'Lost your password?' ],
	[ 'resetPassword', __( 'Reset password button', 'sgs-blocks' ), 'Reset password' ],
	[ 'register', __( 'Register button', 'sgs-blocks' ), 'Register' ],
	[ 'registerEmailLabel', __( 'Email field label (register form and account details)', 'sgs-blocks' ), 'Email address' ],
	[ 'newPasswordLabel', __( 'New password field label', 'sgs-blocks' ), 'New password (leave blank to leave unchanged)' ],
	[ 'confirmPasswordLabel', __( 'Confirm new password field label', 'sgs-blocks' ), 'Confirm new password' ],
	[ 'currentPasswordLabel', __( 'Current password field label', 'sgs-blocks' ), 'Current password (leave blank to leave unchanged)' ],
	[ 'signOut', __( 'Sign out (menu)', 'sgs-blocks' ), 'Log out' ],
	[ 'orders', __( 'Orders (menu)', 'sgs-blocks' ), 'Orders' ],
	[ 'addresses', __( 'Addresses (menu)', 'sgs-blocks' ), 'Addresses' ],
	[ 'accountDetails', __( 'Account details (menu)', 'sgs-blocks' ), 'Account details' ],
	[ 'savedItems', __( 'Saved items (menu)', 'sgs-blocks' ), 'Saved items' ],
	[ 'passwordMismatch', __( 'Reset form: passwords do not match line', 'sgs-blocks' ), 'Passwords do not match.' ],
	[ 'billingAddress', __( 'Billing address title', 'sgs-blocks' ), 'Billing address' ],
	[ 'shippingAddress', __( 'Shipping address title', 'sgs-blocks' ), 'Shipping address' ],
	[ 'addAddressLink', __( 'Add address link (whole text; %s is the address title)', 'sgs-blocks' ), 'Add %s' ],
	[ 'editAddressLink', __( 'Edit address link (whole text; %s is the address title)', 'sgs-blocks' ), 'Edit %s' ],
	[ 'passwordChange', __( 'Password change heading', 'sgs-blocks' ), 'Password change' ],
	[ 'resetConfirmLabel', __( 'Choose a new password: repeat field label', 'sgs-blocks' ), 'Re-enter new password' ],
	[ 'savePassword', __( 'Choose a new password: button', 'sgs-blocks' ), 'Save' ],
];

// [ view, label, eyebrow attribute, title attribute, intro attribute ]
const VIEWS = [
	[ 'headerSignIn', __( 'Sign in page', 'sgs-blocks' ), 'headerSignInEyebrow', 'headerSignInTitle', 'headerSignInIntro' ],
	[ 'headerLost', __( 'Lost password page', 'sgs-blocks' ), 'headerLostEyebrow', 'headerLostTitle', 'headerLostIntro' ],
	[ 'headerLostSent', __( 'Lost password: email sent', 'sgs-blocks' ), '', 'headerLostSentTitle', 'headerLostSentIntro' ],
	[ 'headerLostReset', __( 'Lost password: choose a new one', 'sgs-blocks' ), '', 'headerLostResetTitle', 'headerLostResetIntro' ],
	[ 'headerAccount', __( 'Signed-in account', 'sgs-blocks' ), 'headerAccountEyebrow', 'headerAccountTitle', 'headerAccountIntro' ],
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
			{ VIEWS.map( ( [ prefix, label, eyebrow, title, intro ] ) => (
				<PanelBody key={ prefix } title={ label } initialOpen={ false }>
					{ '' !== eyebrow && <TextField { ...p } name={ eyebrow } label={ __( 'Eyebrow', 'sgs-blocks' ) } /> }
					<TextField
						{ ...p }
						name={ title }
						label={ __( 'Title', 'sgs-blocks' ) }
						help={ 'headerAccount' === prefix ? __( 'Use {first_name} for the customer’s first name.', 'sgs-blocks' ) : undefined }
					/>
					{ '' !== intro && <TextField { ...p } name={ intro } label={ __( 'Intro line', 'sgs-blocks' ) } /> }
					{ 'headerLost' === prefix && (
						<TextField { ...p } name="headerLostBackLabel" label={ __( 'Back to sign in link', 'sgs-blocks' ) } />
						<Toggle { ...p } name="resetErrorsInline" label={ __( 'Reset form errors under the fields', 'sgs-blocks' ) } help={ __( 'The choose-a-new-password form shows its errors as text under the fields, not a boxed notice above. Off = WooCommerce’s own form.', 'sgs-blocks' ) } />
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
			<Toggle
				{ ...p }
				name="addressEditor"
				label={ __( 'Edit addresses inside the cards', 'sgs-blocks' ) }
				help={ __( 'Replaces WooCommerce’s address list and address page: each card opens its own form and saves through WooCommerce. Off = WooCommerce’s own screens.', 'sgs-blocks' ) }
			/>
			{ attributes.addressEditor && (
				<>
					<TextField { ...p } name="addressEditLabel" label={ __( 'Edit link', 'sgs-blocks' ) } help={ __( 'Empty = “Edit” plus the card title.', 'sgs-blocks' ) } />
					<TextField { ...p } name="addressAddLabel" label={ __( 'Add link (card with no address)', 'sgs-blocks' ) } help={ __( 'Empty = “Add” plus the card title.', 'sgs-blocks' ) } />
					<TextField { ...p } name="addressSaveLabel" label={ __( 'Save button', 'sgs-blocks' ) } />
					<TextField { ...p } name="addressCancelLabel" label={ __( 'Cancel link', 'sgs-blocks' ) } />
					<TextField { ...p } name="addressLine2Label" label={ __( 'Second address line label', 'sgs-blocks' ) } help={ __( 'For example “Flat / building”. Empty = WooCommerce’s own label.', 'sgs-blocks' ) } />
					<TextField { ...p } name="addressPairs" label={ __( 'Fields side by side', 'sgs-blocks' ) } help={ __( 'Comma-separated, for example “city, postcode”. First and last name already sit together.', 'sgs-blocks' ) } />
					<TextField { ...p } name="addressHideFields" label={ __( 'Fields to leave out', 'sgs-blocks' ) } help={ __( 'Comma-separated, for example “company, state”. A left-out field keeps its saved value (the billing email falls back to the account email), so a required one still passes WooCommerce’s check.', 'sgs-blocks' ) } />
				</>
			) }
			<TextField
				{ ...p }
				name="addressHelperText"
				label={ __( 'Helper line under the cards', 'sgs-blocks' ) }
			/>
			<TextField
				{ ...p }
				name="addressEmptyText"
				label={ __( 'Line in a card with no address', 'sgs-blocks' ) }
				help={ __( '{type} becomes the card title without the word address, for example “No {type} address saved yet.”', 'sgs-blocks' ) }
			/>
			<TextField
				{ ...p }
				name="addressSameText"
				label={ __( 'Line in an empty billing card while a delivery address is saved', 'sgs-blocks' ) }
				help={ __( 'For example “Same as delivery address”.', 'sgs-blocks' ) }
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
			<ResponsiveOverride
				label={ __( 'Space between fields', 'sgs-blocks' ) }
				value={ attributes.accountFormGap }
				onChange={ ( obj ) => setAttributes( { accountFormGap: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<SgsLengthControl
						presets
						label={ __( 'Space between fields', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ ownValue ?? '' }
						placeholder={ inherited ? effectiveValue : '' }
						onChange={ ( val ) => setOwnValue( val || undefined ) }
					/>
				) }
			</ResponsiveOverride>
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
				<>
					<TextField { ...p } name="accountMobileLabel" label={ __( 'Mobile field label', 'sgs-blocks' ) } />
					<TextField
						{ ...p }
						name="accountMobileHint"
						label={ __( 'Line under the Mobile field', 'sgs-blocks' ) }
						help={ __( 'Empty = no line. It takes the password helper’s type and colour.', 'sgs-blocks' ) }
					/>
				</>
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
 * @return {JSX.Element} The Register form panel.
 */
export function RegisterFormPanel( { attributes, setAttributes } ) {
	const p = { attributes, setAttributes };
	return (
		<PanelBody title={ __( 'Register form', 'sgs-blocks' ) } initialOpen={ false }>
			<Toggle
				{ ...p }
				name="registerShowFirstName"
				label={ __( 'Ask for a first name', 'sgs-blocks' ) }
				help={ __( 'A required First name field, saved to the customer’s name and billing first name.', 'sgs-blocks' ) }
			/>
			{ attributes.registerShowFirstName && (
				<TextField { ...p } name="registerFirstNameLabel" label={ __( 'First name field label', 'sgs-blocks' ) } />
			) }
			<TextField { ...p } name="registerPasswordHint" label={ __( 'Hint under the password field', 'sgs-blocks' ) } />
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
				name="registerButtonPreset"
				label={ __( 'Register button: start from the site’s button style', 'sgs-blocks' ) }
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
			<ResponsiveOverride
				label={ __( 'Minimum height', 'sgs-blocks' ) }
				value={ attributes.loginButtonMinHeight }
				onChange={ ( obj ) => setAttributes( { loginButtonMinHeight: obj } ) }
			>
				{ ( { ownValue, effectiveValue, inherited, setOwnValue } ) => (
					<SgsLengthControl
						presets
						label={ __( 'Minimum height', 'sgs-blocks' ) }
						hideLabelFromVision
						value={ ownValue ?? '' }
						placeholder={ inherited ? effectiveValue : '' }
						onChange={ ( val ) => setOwnValue( val || undefined ) }
					/>
				) }
			</ResponsiveOverride>
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
