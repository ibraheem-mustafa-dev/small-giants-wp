// The pure parts of the live form submission check (Spec 48 FR-48-57; form-submit-check.mjs drives them): reading a form post's
// settings and field copy, the test values a required field takes, the success verdict, the original recipient a test site's mail
// redirect names, and the target's site folder from deploy_common.py.

// The first block comment of `name` in post content: its attribute object, or null.
function blockAttrs( content, name ) {
	const m = new RegExp( `<!--\\s*wp:${ name }(?:\\s+(\\{.*?\\}))?\\s*/?-->`, 's' ).exec( String( content || '' ) );
	if ( ! m ) {
		return null;
	}
	try {
		return m[ 1 ] ? JSON.parse( m[ 1 ] ) : {};
	} catch {
		return null;
	}
}

// The form's settings from an `sgs_form` post's content: { successMessage, successRedirect, notifyEmail } (the block's own
// attributes; an unset one is ''), or null when the content holds no sgs/form block.
export function formSettingsOf( content ) {
	const a = blockAttrs( content, 'sgs/form' );
	return a ? { successMessage: a.successMessage || '', successRedirect: a.successRedirect || '', notifyEmail: a.notifyEmail || a.emailSettings?.notifyEmail || '' } : null;
}

// Each field block in the content: [ { block, label, required, msgRequired } ] in document order.
export function formFieldsOf( content ) {
	const out = [];
	for ( const m of String( content || '' ).matchAll( /<!--\s*wp:(sgs\/form-field-[\w-]+)(?:\s+(\{.*?\}))?\s*\/?-->/gs ) ) {
		let a = {};
		try {
			a = m[ 2 ] ? JSON.parse( m[ 2 ] ) : {};
		} catch {
			a = {};
		}
		out.push( { block: m[ 1 ], label: a.label || '', required: true === a.required, msgRequired: a.msgRequired || '' } );
	}
	return out;
}

// A valid test value for a control: { tag, type, min, options: [ values ] } -> a string, 'check' to tick it, or null to leave it.
export function testValueFor( c ) {
	if ( 'select' === c.tag ) {
		return ( c.options || [] ).find( ( o ) => '' !== o ) ?? null;
	}
	if ( 'textarea' === c.tag ) {
		return 'This is an automated test submission from the form check.';
	}
	switch ( c.type ) {
		case 'email':
			return 'form-check@example.test';
		case 'tel':
			return '07700900123';
		case 'number':
			return String( c.min && Number.isFinite( Number( c.min ) ) ? Number( c.min ) : 1 );
		case 'url':
			return 'https://example.test';
		case 'date':
			return '2030-01-15';
		case 'checkbox':
		case 'radio':
			return 'check';
		case 'file':
		case 'hidden':
		case 'submit':
		case 'button':
			return null;
		default:
			return 'Form check';
	}
}

const squash = ( s ) => String( s || '' ).replace( /\s+/g, ' ' ).trim();

// Whether a submission ended in the form's own success state: the redirect target when the form has one (the final address's
// path is its path), else the success message visible on the page. A form with no message set shows the block's default, so any
// visible success message passes.
export function successVerdict( { settings, finalUrl, successText } ) {
	const redirect = squash( settings.successRedirect );
	if ( redirect ) {
		const pathOf = ( u ) => {
			try {
				return new URL( u, 'https://x.test' ).pathname.replace( /\/$/, '' );
			} catch {
				return String( u );
			}
		};
		const ok = pathOf( finalUrl ) === pathOf( redirect );
		return { ok, why: ok ? `redirected to ${ redirect }` : `expected a redirect to ${ redirect }, the page is at ${ finalUrl }` };
	}
	const want = squash( settings.successMessage );
	const got = squash( successText );
	if ( ! got ) {
		return { ok: false, why: 'no success message became visible' };
	}
	return want && got !== want ? { ok: false, why: `success message "${ got }" is not the form's "${ want }"` } : { ok: true, why: `success message "${ got }"` };
}

// The address a mail was meant for: a test site's redirect names it in the subject (`[test site, to: a@b.test] Subject`), else the
// mail's own `to`. The redirected `to` is the test inbox, never the owner address under test.
export function originalRecipient( { subject, to } ) {
	const m = /^\[test site, to: ([^\]]+)\]/.exec( String( subject || '' ) );
	return ( m ? m[ 1 ] : String( to || '' ) ).split( ',' )[ 0 ].trim().toLowerCase();
}

// The site folder of a target in deploy_common.py's TARGETS: { host, root: 'domains/<host>/public_html' } or null.
export function targetSite( pyText, target ) {
	const at = String( pyText || '' ).indexOf( `"${ target }": {` );
	if ( at < 0 ) {
		return null;
	}
	const block = String( pyText ).slice( at, String( pyText ).indexOf( '}', at ) );
	const host = /"host":\s*"([^"]+)"/.exec( block )?.[ 1 ];
	const wp = /"wp_content":\s*"([^"]+)"/.exec( block )?.[ 1 ];
	return host && wp ? { host, root: wp.replace( /\/wp-content\/?$/, '' ) } : null;
}
