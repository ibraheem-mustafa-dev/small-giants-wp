// The brand and contact registry (plugins/sgs-blocks/includes/data/brand-registry.json, FP-1): read from the one file,
// never copied into a table here. The registry holds no host data, so ownership of an address is derived:
//   - a contact brand by scheme: `phone` owns tel:, `email` owns mailto: (the two schemes those entries stand for);
//   - a social brand (a siteInfoKey `socials.<name>`) by domain: the address's host is `<name>.<tld>` or a subdomain of
//     it, where <name> is the brand's slug or the `<name>` of its Site Info key (X's slug is x and its key is
//     socials.twitter, so x.com and twitter.com both match). The label must sit directly before the last label, so
//     `instagram.com.evil.example` and `notinstagram.com` are not Instagram.
// Gaps by design: short links (wa.me, youtu.be, g.page) and a country second-level domain (instagram.co.uk) are not
// derivable from the registry and are not claimed; a brand with no siteInfoKey, or with no scheme or domain rule
// (address), owns nothing.
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname( fileURLToPath( import.meta.url ) );
export const REGISTRY_FILE = path.resolve( HERE, '../../../plugins/sgs-blocks/includes/data/brand-registry.json' );

// Contact brand slug to the scheme it stands for.
const SCHEMES = { phone: 'tel:', email: 'mailto:' };

let cached = null;

// The registry's brands in file order: [{ slug, label, siteInfoKey, ... }].
export function brandRegistry( file = REGISTRY_FILE ) {
	if ( file === REGISTRY_FILE && cached ) {
		return cached;
	}
	const brands = JSON.parse( fs.readFileSync( file, 'utf8' ) ).brands;
	if ( ! Array.isArray( brands ) ) {
		throw new Error( `${ file } has no brands list` );
	}
	if ( file === REGISTRY_FILE ) {
		cached = brands;
	}
	return brands;
}

// One brand by slug, or null.
export const brandBySlug = ( slug, brands = brandRegistry() ) => brands.find( ( b ) => b.slug === slug ) ?? null;

// The domain names a social brand's addresses live on: its slug and the name inside its Site Info key.
export function brandDomains( brand ) {
	const m = /^socials\.([a-z0-9-]+)$/i.exec( brand?.siteInfoKey || '' );
	return m ? [ ...new Set( [ brand.slug, m[ 1 ] ].map( ( s ) => s.toLowerCase() ) ) ] : [];
}

// The names a brand goes by in a draft's token names: its slug and Site Info name (both at least three letters, so a
// one-letter slug such as x claims no word), its label's words (letters only) and the registry's `aliases`.
export function brandNames( brand ) {
	const label = String( brand?.label || '' ).toLowerCase().split( /[^a-z0-9]+/ ).filter( ( w ) => w.length >= 3 );
	const own = [ brand?.slug, ...brandDomains( brand ) ].filter( ( s ) => s && s.length >= 3 );
	return [ ...new Set( [ ...own, ...label, ...( brand?.aliases || [] ) ].map( ( s ) => String( s ).toLowerCase() ) ) ];
}

// The brand a colour token is named for (`--social-facebook`, `--fb-blue`, `--brand-youtube`), or null: a brand that
// carries a colour, one of whose names is a whole word of the token name. A contact entry (phone, email, address)
// carries no colour and is never matched.
export function brandOfToken( name, brands = brandRegistry() ) {
	const words = String( name ?? '' ).replace( /^--/, '' ).toLowerCase().split( /[-_]+/ ).filter( Boolean );
	return brands.find( ( b ) => b.colour && brandNames( b ).some( ( n ) => words.includes( n ) ) ) ?? null;
}

// Whether an address is the given brand's own (see the file header). A brand with no siteInfoKey owns nothing.
export function brandOwnsAddress( brand, address ) {
	const href = String( address ?? '' ).trim();
	if ( ! brand?.siteInfoKey || '' === href ) {
		return false;
	}
	if ( SCHEMES[ brand.slug ] ) {
		return href.toLowerCase().startsWith( SCHEMES[ brand.slug ] );
	}
	const domains = brandDomains( brand );
	if ( ! domains.length ) {
		return false;
	}
	let url;
	try {
		url = new URL( href );
	} catch {
		return false;
	}
	if ( ! /^https?:$/.test( url.protocol ) ) {
		return false;
	}
	const labels = url.hostname.toLowerCase().split( '.' );
	return labels.length >= 2 && domains.includes( labels[ labels.length - 2 ] );
}
