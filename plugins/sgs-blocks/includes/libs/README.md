# SGS Blocks — PHP Library Reference

Composer autoloader registered in `sgs-blocks.php`. These are available anywhere in the plugin.

---

## spatie/color (v2.1) — Design Token Palette Generation

```php
use Spatie\Color\Hex;
use Spatie\Color\Hsl;

// Convert brand hex to HSL
$colour = Hex::fromString('#0F7E80');
$hsl    = $colour->toHsl(); // Hsl object

// Generate tints/shades for CSS custom properties
$base_h = $hsl->hue();
$base_s = $hsl->saturation();
$base_l = $hsl->lightness();

// Lighter tint (increase lightness)
$tint   = Hsl::fromString("hsl({$base_h}, {$base_s}%, 90%)")->toHex();

// Darker shade (decrease lightness)
$shade  = Hsl::fromString("hsl({$base_h}, {$base_s}%, 20%)")->toHex();
```

**Use cases:**
- `sgs_generate_palette( $hex )` helper — turn client brand colour into full `--sgs-primary-*` token set
- Style variation generator — auto-produce tints/shades for Gutenberg colour palette registration
- Badge/tag colours — compute accessible contrast colour automatically

---

## league/csv (v9.28) — CSV Import/Export

```php
use League\Csv\Reader;
use League\Csv\Writer;

// READ: bulk import team members, menu items, products
$csv     = Reader::createFromPath( SGS_BLOCKS_PATH . 'data/team.csv', 'r' );
$csv->setHeaderOffset( 0 ); // first row = headers
$records = $csv->getRecords(); // iterable

foreach ( $records as $record ) {
    // $record['name'], $record['role'], $record['bio']
    wp_insert_post( [
        'post_type'  => 'team_member',
        'post_title' => sanitize_text_field( $record['name'] ),
    ] );
}

// WRITE: export form submissions to CSV
$writer = Writer::createFromString();
$writer->insertOne( [ 'Name', 'Email', 'Date' ] ); // header row
$writer->insertAll( $rows );                         // array of arrays
$csv_string = $writer->toString();
```

**Use cases:**
- Admin bulk-import UI for team members, pricing, menu items
- Form submission export endpoint
- Ecommerce product import for WooCommerce/custom post types

---

## nesbot/carbon (v3.11) — Date & Time

```php
use Carbon\Carbon;

// Current time in client timezone
$now = Carbon::now( 'Europe/London' );

// Human-readable diff
echo $now->diffForHumans(); // "3 hours ago"

// Hijri calendar (Islamic dates)
$hijri = Carbon::now()->isoFormat( 'iD iMMMM iYYYY' ); // "15 Ramadan 1447"

// Countdown to event
$event    = Carbon::parse( '2026-03-30 00:00:00', 'Europe/London' );
$days_left = Carbon::now()->diffInDays( $event );

// Locale-aware formatting
Carbon::setLocale( 'ar' );
echo Carbon::now()->translatedFormat( 'l j F Y' ); // Arabic day/month names
```

**Use cases:**
- countdown-timer block: server-rendered time diff
- Booking system: slot availability, grace periods, expiry
- HelpingDoctors: Hijri date display on patient records
- Prayer time display: next prayer countdown

---

## PHP intl extension (built into Hostinger PHP 8.2 — no install needed)

```php
// Locale-aware number formatting
$fmt = new NumberFormatter( 'en-GB', NumberFormatter::CURRENCY );
echo $fmt->formatCurrency( 1234.56, 'GBP' ); // £1,234.56

$fmt_ar = new NumberFormatter( 'ar-EG', NumberFormatter::DECIMAL );
echo $fmt_ar->format( 1234 ); // ١٬٢٣٤ (Arabic-Indic numerals)

// Locale-aware date formatting
$fmt = new IntlDateFormatter(
    'ar-SA',
    IntlDateFormatter::FULL,
    IntlDateFormatter::NONE,
    'Asia/Riyadh',
    IntlDateFormatter::TRADITIONAL // Hijri calendar
);
echo $fmt->format( time() ); // Full Hijri date in Arabic

// Locale-aware string sorting
$collator = new Collator( 'ar' );
usort( $names, fn( $a, $b ) => $collator->compare( $a, $b ) );

// hreflang tag generation helper
$locale    = get_locale();           // e.g. "en_GB"
$hreflang  = Locale::canonicalize( $locale ); // "en_GB" → "en-GB"
```

**International SEO connection:**
- `hreflang` tells Google which language/region a page targets — use `Locale::canonicalize()` to produce correct BCP-47 tags
- Correct number/date/currency formatting per locale is a ranking signal — inconsistency (e.g. Arabic content with Western numbers) signals poor localisation
- Polylang/WPML handle URL routing; `intl` handles the PHP-side output formatting

---

## WP_HTML_Tag_Processor (WP core 6.2+ — no install needed)

```php
// Safely add a class to all <img> elements in block output
$processor = new \WP_HTML_Tag_Processor( $block_content );
while ( $processor->next_tag( 'img' ) ) {
    $processor->add_class( 'sgs-lazy' );
    $processor->set_attribute( 'loading', 'lazy' );
}
$block_content = $processor->get_updated_html();

// Remove inline styles from a specific element
$processor = new \WP_HTML_Tag_Processor( $html );
if ( $processor->next_tag( [ 'tag_name' => 'div', 'class_name' => 'wp-block-sgs-hero' ] ) ) {
    $processor->remove_attribute( 'style' );
}

// Read an attribute value safely
$processor = new \WP_HTML_Tag_Processor( $html );
$processor->next_tag( 'a' );
$href = $processor->get_attribute( 'href' ); // null if not present
```

**Use cases:**
- `render_block` filter — post-process any block's HTML output without regex
- Inject lazy loading, data attributes, or accessibility attributes programmatically
- Strip or modify inline styles added by third-party blocks
- Safer than DOMDocument for partial HTML fragments
