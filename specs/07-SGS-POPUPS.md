# SGS Pop-ups — WordPress Conversion Pop-up Plugin

## Purpose

A standalone WordPress plugin for creating, targeting, and measuring conversion pop-ups. Replaces OptinMonster ($9-49/month SaaS), Popup Maker (free + $99-299 Pro), Convert Pro ($99/year), Elementor Pro's popup builder ($59-399/year), and Hustle Pro ($3+/month).

**Core advantage over competitors:** Zero external SaaS dependency, zero per-site licensing, native block editor content, full Interactivity API integration, no performance penalty on pages without pop-ups, and deep integration with SGS Forms for lead capture.

**Core advantage over Elementor:** Elementor treats entire pages as popups (heavy DOM), requires Pro licence per site, generates deeply nested markup, and loads popup JS/CSS globally. SGS loads zero popup assets on pages without active popups.

---

## Architecture

### Why a Standalone Plugin

Pop-ups require their own admin UI (campaign management, analytics dashboard), custom post type, database tables (impressions/conversions), and page-targeting logic that operates independently of individual blocks. This scope exceeds what belongs inside `sgs-blocks`.

The plugin integrates with `sgs-blocks` by allowing SGS Form blocks inside popup content — but the popup engine itself is its own concern.

### High-Level Data Flow

```
1. Admin creates popup (CPT) using block editor
2. Display rules stored as post meta (page targets, triggers, frequency)
3. On frontend page load, PHP checks display rules server-side
4. If any popup matches current page, enqueue popup assets (HTML, CSS, JS)
5. Interactivity API store handles trigger detection + display timing
6. Analytics recorded via REST endpoint (impression on show, conversion on CTA/form submit)
```

---

## Plugin Structure

```
sgs-popups/
├── sgs-popups.php                  # Plugin bootstrap
├── package.json                    # Build toolchain (@wordpress/scripts)
├── webpack.config.js               # Build config
│
├── src/
│   ├── editor/
│   │   ├── index.js                # Editor-side registration
│   │   ├── sidebar-panel.js        # Popup settings sidebar (triggers, display rules)
│   │   ├── campaign-type-picker.js # Campaign type selector (modal, slide-in, etc.)
│   │   └── style.css               # Editor styles
│   │
│   ├── frontend/
│   │   ├── view.js                 # Interactivity API store (triggers, display, analytics)
│   │   └── style.css               # Frontend popup styles (all campaign types)
│   │
│   └── admin/
│       ├── analytics-page.js       # Analytics dashboard (React)
│       └── style.css               # Admin styles
│
├── build/                          # Compiled output
│
├── includes/
│   ├── class-sgs-popups.php        # Main plugin class
│   ├── class-popup-cpt.php         # Custom post type registration
│   ├── class-display-rules.php     # Rule evaluation engine (server-side)
│   ├── class-popup-renderer.php    # Frontend output (conditional enqueue + HTML injection)
│   ├── class-analytics.php         # Analytics recording + querying
│   ├── class-ab-testing.php        # A/B variant management
│   ├── class-rest-api.php          # REST endpoints (analytics, settings)
│   └── class-settings.php          # Plugin settings page
│
└── templates/
    └── popup-wrapper.php           # Popup container markup template
```

---

## Custom Post Type: `sgs_popup`

Each popup is a custom post type edited with the full block editor. The popup's visual content (headline, text, image, form, CTA button) is built from standard WordPress blocks and SGS blocks.

```php
register_post_type( 'sgs_popup', [
    'label'               => __( 'Pop-ups', 'sgs-popups' ),
    'public'              => false,
    'show_ui'             => true,
    'show_in_rest'        => true,  // Block editor support
    'supports'            => [ 'title', 'editor', 'custom-fields' ],
    'menu_icon'           => 'dashicons-megaphone',
    'capability_type'     => 'page',
    'has_archive'         => false,
    'exclude_from_search' => true,
] );
```

---

## Campaign Types

| Type | Description | Overlay | Position |
|---|---|---|---|
| `modal` | Centred lightbox popup with backdrop | Yes (semi-transparent) | Centred viewport |
| `slide-in` | Slides from corner | No | Bottom-right, bottom-left, top-right, top-left (configurable) |
| `fullscreen` | Full-viewport takeover | Yes (opaque) | Full viewport |
| `bottom-bar` | Fixed bar at bottom of viewport | No | Bottom, full-width |
| `top-bar` | Fixed bar at top of viewport | No | Top, full-width |
| `floating-box` | Small persistent box in corner | No | Bottom-right (configurable) |

### Campaign Type Attributes (post meta)

- `_sgs_popup_type` — modal | slide-in | fullscreen | bottom-bar | top-bar | floating-box (default: modal)
- `_sgs_popup_position` — Configurable position for slide-in and floating-box types
- `_sgs_popup_width` — number px (default: 600 for modal, 360 for slide-in/floating-box, auto for bars)
- `_sgs_popup_max_width` — number px (default: 90vw — prevents overflow on mobile)
- `_sgs_popup_overlay_colour` — token slug (default: black at 50% opacity)
- `_sgs_popup_overlay_click_close` — boolean (default: true — clicking backdrop closes modal)
- `_sgs_popup_animation_in` — fade | slide-up | slide-down | slide-left | slide-right | scale | none (default: fade)
- `_sgs_popup_animation_out` — fade | slide-down | slide-up | slide-left | slide-right | scale | none (default: fade)
- `_sgs_popup_animation_duration` — fast (200ms) | medium (300ms) | slow (500ms) (default: medium)
- `_sgs_popup_border_radius` — token slug or px value (default: medium)
- `_sgs_popup_padding` — token slug (default: medium)
- `_sgs_popup_shadow` — token slug (default: shadow-lg)
- `_sgs_popup_close_button` — boolean (default: true)
- `_sgs_popup_close_button_position` — inside-right | inside-left | outside-right | outside-left (default: inside-right)
- `_sgs_popup_close_button_delay` — integer seconds (default: 0 — delay before close button appears)

---

## Trigger System

Triggers determine WHEN a popup appears. Multiple triggers can be set per popup (OR logic — first trigger wins).

### Trigger Types

| Trigger | Description | Desktop | Mobile |
|---|---|---|---|
| `exit-intent` | Mouse moves toward browser chrome / back button | Cursor leaves viewport top | Device back button or rapid scroll up |
| `scroll-depth` | User scrolls past percentage of page | Yes | Yes |
| `time-delay` | Fires after N seconds on page | Yes | Yes |
| `click` | User clicks element matching CSS selector | Yes | Yes |
| `inactivity` | No mouse movement/scroll/keypress for N seconds | Yes | Yes (no touch events) |
| `page-load` | Fires immediately when page loads (after delay if set) | Yes | Yes |

### Trigger Attributes (post meta — stored as serialised array)

- `_sgs_popup_triggers` — array of trigger objects:
  ```json
  [
    {
      "type": "exit-intent",
      "sensitivity": 20
    },
    {
      "type": "scroll-depth",
      "percentage": 50
    },
    {
      "type": "time-delay",
      "seconds": 15
    },
    {
      "type": "click",
      "selector": ".popup-trigger"
    },
    {
      "type": "inactivity",
      "seconds": 30
    },
    {
      "type": "page-load",
      "delay": 0
    }
  ]
  ```

### Exit Intent Implementation

**Desktop:** `mouseleave` event on `document.documentElement` with Y-coordinate check (only fires when cursor exits through top 20% of viewport — avoids false triggers from moving to sidebar scrollbar).

**Mobile:** Combination of rapid upward scroll velocity detection (user pulling down to go back) and `beforeunload`/`popstate` events. Mobile exit-intent is inherently less reliable — the trigger documentation should be honest about this.

---

## Display Rules

Display rules determine WHERE and TO WHOM a popup shows. All rules are evaluated server-side in PHP before any popup assets are enqueued — if no popup matches the current page, zero popup JS/CSS is loaded.

### Rule Categories

#### Page Targeting
- `pages` — show on specific page IDs
- `posts` — show on specific post IDs
- `post_types` — show on all posts of specific post types
- `categories` — show on posts in specific categories
- `tags` — show on posts with specific tags
- `taxonomies` — show on posts in specific taxonomy terms
- `url_contains` — show when URL contains substring
- `url_regex` — show when URL matches regex pattern
- `is_front_page` — show on front page only
- `is_archive` — show on archive pages
- `is_search` — show on search results
- `is_404` — show on 404 page
- `exclude_pages` — never show on these page IDs (overrides include rules)

#### User Targeting
- `user_logged_in` — show only to logged-in users
- `user_logged_out` — show only to logged-out users
- `user_roles` — show only to specific roles (admin, editor, subscriber, etc.)
- `user_new` — show only to first-time visitors (no cookie set)
- `user_returning` — show only to returning visitors (cookie present)

#### Device Targeting
- `device_desktop` — boolean (default: true)
- `device_tablet` — boolean (default: true)
- `device_mobile` — boolean (default: true)

#### Referrer Targeting
- `referrer_contains` — show when HTTP referer contains string (e.g., "google.com", "facebook.com")
- `referrer_not_contains` — exclude specific referrers
- `utm_source` — show when UTM source matches
- `utm_campaign` — show when UTM campaign matches

#### Scheduling
- `start_date` — ISO 8601 date (popup hidden before this date)
- `end_date` — ISO 8601 date (popup hidden after this date)
- `days_of_week` — array of 0-6 (show only on specific days)
- `time_start` — HH:MM (show only after this time, site timezone)
- `time_end` — HH:MM (show only before this time, site timezone)

#### Frequency Capping
- `frequency_type` — always | once-per-session | once-per-day | once-ever | custom (default: once-per-session)
- `frequency_max` — integer (for custom — max times to show)
- `frequency_period` — session | day | week | month (for custom)
- `cookie_days` — integer (default: 30 — how long "once-ever" cookie persists)

### Rule Storage (post meta)

```json
{
  "_sgs_popup_rules": {
    "include": {
      "pages": [42, 108],
      "post_types": ["post", "product"],
      "is_front_page": true
    },
    "exclude": {
      "pages": [99]
    },
    "user": {
      "logged_in": null,
      "roles": [],
      "new_visitor": false,
      "returning_visitor": false
    },
    "device": {
      "desktop": true,
      "tablet": true,
      "mobile": true
    },
    "referrer": {
      "contains": [],
      "not_contains": []
    },
    "schedule": {
      "start_date": null,
      "end_date": null,
      "days_of_week": [],
      "time_start": null,
      "time_end": null
    },
    "frequency": {
      "type": "once-per-session",
      "max": null,
      "period": null,
      "cookie_days": 30
    }
  }
}
```

### Server-Side Rule Evaluation

```php
// In class-display-rules.php
class SGS_Display_Rules {
    public function get_matching_popups(): array {
        // 1. Query all published sgs_popup posts
        // 2. For each popup, evaluate rules against current request:
        //    - Page targeting (is_page, is_single, get_queried_object_id, etc.)
        //    - User targeting (is_user_logged_in, current_user_can, cookie check)
        //    - Device targeting (wp_is_mobile + user agent parsing)
        //    - Referrer targeting ($_SERVER['HTTP_REFERER'])
        //    - Schedule targeting (current_time vs start/end)
        // 3. Return array of matching popup IDs + their trigger configs
        // 4. Results cached per request (no duplicate queries)
    }
}
```

**Caching:** Popup rules are transient-cached for 5 minutes. Cache is busted on popup save/update/delete via `save_post_sgs_popup` hook.

---

## A/B Testing

Each popup can have up to 4 variants (A, B, C, D). Variants share the same display rules and triggers but have different content (headline, offer, CTA, image).

### Implementation

- Original popup is variant A
- Variants B/C/D are separate `sgs_popup` posts linked to the original via `_sgs_popup_parent` meta
- Traffic split is even by default (50/50 for 2 variants, 33/33/33 for 3, etc.)
- Variant selection uses a hash of visitor cookie + popup ID — deterministic per visitor (same visitor always sees same variant)
- Each variant tracks its own impression and conversion counts independently
- Admin dashboard shows conversion rate comparison with statistical significance indicator (calculated via chi-squared test when sample > 100 per variant)

### A/B Test Attributes (post meta)

- `_sgs_popup_parent` — post ID of parent popup (only set on variants B/C/D)
- `_sgs_popup_variant` — A | B | C | D
- `_sgs_popup_ab_active` — boolean (is A/B test running?)
- `_sgs_popup_ab_winner` — variant letter (set when test is concluded)

---

## Analytics

### Database Table: `{prefix}sgs_popup_events`

```sql
CREATE TABLE {prefix}sgs_popup_events (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    popup_id        BIGINT UNSIGNED NOT NULL,
    variant         CHAR(1) DEFAULT 'A',
    event_type      VARCHAR(20) NOT NULL,  -- 'impression', 'conversion', 'close'
    event_date      DATE NOT NULL,
    event_count     INT UNSIGNED DEFAULT 1,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_popup_date (popup_id, event_date),
    INDEX idx_event_type (event_type, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

**Design note:** Events are aggregated by day, not per-visitor. This keeps the table small (one row per popup per event type per day, not one row per visitor). The `event_count` column is incremented via `INSERT ... ON DUPLICATE KEY UPDATE event_count = event_count + 1` using a unique constraint on `(popup_id, variant, event_type, event_date)`.

### Tracked Events

| Event | When Recorded | Method |
|---|---|---|
| `impression` | Popup becomes visible to user | Interactivity API callback → REST endpoint |
| `conversion` | User clicks CTA button or submits embedded form | Interactivity API callback → REST endpoint |
| `close` | User dismisses popup (close button, overlay click, Escape) | Interactivity API callback → REST endpoint |

### REST Endpoints

#### `POST /sgs-popups/v1/event`

Records an analytics event. Called from frontend JS.

```json
{
    "popup_id": 42,
    "variant": "A",
    "event_type": "impression"
}
```

**Security:** Nonce-verified via `wp_rest` nonce injected into page. Rate-limited to 10 events per second per IP to prevent abuse. No sensitive data stored — just aggregate counts.

#### `GET /sgs-popups/v1/analytics`

Returns analytics data for the admin dashboard.

- **Capability required:** `manage_options`
- **Parameters:** `popup_id` (optional), `date_from`, `date_to`, `group_by` (day | week | month)
- **Response:** Array of `{ date, impressions, conversions, closes, conversion_rate }`

#### `GET /sgs-popups/v1/analytics/summary`

Returns summary stats for the popup list table.

- **Capability required:** `manage_options`
- **Parameters:** `popup_ids` (comma-separated)
- **Response:** Array of `{ popup_id, total_impressions, total_conversions, conversion_rate }`

---

## Admin Dashboard

### Popup List Table

Custom columns added to the `sgs_popup` post type list table:

| Column | Content |
|---|---|
| Title | Popup title (links to editor) |
| Type | Campaign type icon + label |
| Status | Active / Paused / Scheduled / Ended |
| Impressions | Total impression count |
| Conversions | Total conversion count |
| Rate | Conversion rate (conversions / impressions) |
| A/B | "2 variants" or "—" |
| Last Modified | Date |

### Analytics Page

Admin page under the Pop-ups menu. React-based dashboard showing:

1. **Overview cards** — total impressions, conversions, conversion rate, active popups (date-range selector)
2. **Per-popup table** — sortable table with all popups and their metrics
3. **Trend chart** — impressions and conversions over time (Chart.js or Recharts via @wordpress/components)
4. **A/B test results** — variant comparison with confidence intervals

---

## Settings Page

Admin settings under Settings → SGS Pop-ups:

| Setting | Type | Default | Description |
|---|---|---|---|
| Global enable | Toggle | On | Master switch to disable all popups |
| Respect Do Not Track | Toggle | On | Skip analytics recording when DNT header is set |
| GDPR mode | Toggle | Off | Require cookie consent before showing popups (checks for CookieYes/Complianz/CookieBot consent cookie) |
| GDPR consent cookie name | Text | `cookieyes-consent` | Cookie name to check for GDPR consent |
| Max popups per page | Number | 1 | Maximum simultaneous popups per page load |
| Priority mode | Select | First match | First match / Highest priority / Random |
| Global frequency cap | Number | 3 | Max popup impressions per visitor per session across all popups |
| Analytics retention | Select | 90 days | 30 / 60 / 90 / 180 / 365 days — old aggregated data auto-deleted via daily cron |
| Disable on admin | Toggle | On | Don't show popups to logged-in admins |

---

## Frontend Rendering

### Conditional Asset Loading

The key performance feature: popup assets are ONLY loaded on pages where at least one popup matches. The server-side rule evaluation happens in `template_redirect` hook:

```php
add_action( 'template_redirect', function() {
    $rules   = new SGS_Display_Rules();
    $popups  = $rules->get_matching_popups();

    if ( empty( $popups ) ) {
        return; // Zero popup assets loaded on this page
    }

    // Store matching popups for later rendering
    SGS_Popup_Renderer::set_popups( $popups );

    // Enqueue popup CSS + Interactivity API viewScriptModule
    add_action( 'wp_enqueue_scripts', [ SGS_Popup_Renderer::class, 'enqueue_assets' ] );

    // Inject popup HTML before </body>
    add_action( 'wp_footer', [ SGS_Popup_Renderer::class, 'render_popups' ] );
});
```

### Popup HTML Output

```html
<div
    class="sgs-popup sgs-popup--modal"
    data-wp-interactive="sgs/popups"
    data-wp-context='{"popupId":42,"variant":"A","shown":false,"triggers":[...]}'
    data-wp-bind--hidden="!context.shown"
    data-wp-class--sgs-popup--visible="context.shown"
    data-wp-on--keydown="actions.handleKeydown"
    role="dialog"
    aria-modal="true"
    aria-label="Promotional offer"
    aria-hidden="true"
    data-wp-bind--aria-hidden="!context.shown"
>
    <!-- Overlay (for modal/fullscreen types) -->
    <div
        class="sgs-popup__overlay"
        data-wp-on--click="actions.close"
    ></div>

    <!-- Popup content -->
    <div class="sgs-popup__content" role="document">
        <!-- Close button -->
        <button
            class="sgs-popup__close"
            data-wp-on--click="actions.close"
            aria-label="Close pop-up"
        >
            <svg><!-- X icon --></svg>
        </button>

        <!-- Block editor content rendered here -->
        <div class="sgs-popup__body">
            <?php echo apply_filters( 'the_content', $popup->post_content ); ?>
        </div>
    </div>
</div>
```

### Interactivity API Store

```js
// view.js — loaded as viewScriptModule
import { store, getContext } from '@wordpress/interactivity';

const { state, actions, callbacks } = store( 'sgs/popups', {
    state: {
        get activePopupCount() {
            // Count currently visible popups
        },
    },
    actions: {
        show() {
            const ctx = getContext();
            if ( state.activePopupCount >= sgsPopupsSettings.maxPerPage ) return;

            ctx.shown = true;
            // Record impression
            actions.recordEvent( 'impression' );
            // Trap focus inside popup
            actions.trapFocus();
        },
        close() {
            const ctx = getContext();
            ctx.shown = false;
            // Record close event
            actions.recordEvent( 'close' );
            // Set frequency cookie
            actions.setFrequencyCookie();
            // Restore focus
            actions.restoreFocus();
        },
        handleKeydown( event ) {
            if ( event.key === 'Escape' ) {
                actions.close();
            }
            if ( event.key === 'Tab' ) {
                actions.handleTabTrap( event );
            }
        },
        recordEvent( eventType ) {
            const ctx = getContext();
            navigator.sendBeacon(
                sgsPopupsSettings.restUrl + 'sgs-popups/v1/event',
                JSON.stringify({
                    popup_id: ctx.popupId,
                    variant: ctx.variant,
                    event_type: eventType,
                    _wpnonce: sgsPopupsSettings.nonce,
                })
            );
        },
        convert() {
            const ctx = getContext();
            actions.recordEvent( 'conversion' );
            // Optionally close after conversion
        },
    },
    callbacks: {
        initTriggers() {
            const ctx = getContext();
            // Check frequency cookie — skip if already exceeded
            if ( actions.isFrequencyExceeded() ) return;

            ctx.triggers.forEach( trigger => {
                switch ( trigger.type ) {
                    case 'exit-intent':
                        actions.setupExitIntent( trigger.sensitivity );
                        break;
                    case 'scroll-depth':
                        actions.setupScrollDepth( trigger.percentage );
                        break;
                    case 'time-delay':
                        setTimeout( () => actions.show(), trigger.seconds * 1000 );
                        break;
                    case 'click':
                        document.querySelectorAll( trigger.selector ).forEach( el => {
                            el.addEventListener( 'click', () => actions.show() );
                        });
                        break;
                    case 'inactivity':
                        actions.setupInactivity( trigger.seconds );
                        break;
                    case 'page-load':
                        setTimeout( () => actions.show(), ( trigger.delay || 0 ) * 1000 );
                        break;
                }
            });
        },
    },
});
```

---

## SGS Forms Integration

When an SGS Form block is placed inside a popup's block editor content:

1. The form renders normally inside the popup
2. On successful form submission, the popup's Interactivity API store detects the `sgs/forms:submitted` event
3. The popup records a `conversion` event automatically
4. The popup can be configured to close after form submission (with optional success message delay)

**No special code needed in the form blocks** — the popup listens for the existing form submission event that SGS Forms already dispatches.

---

## Responsive Behaviour

| Breakpoint | Modal | Slide-in | Fullscreen | Bars | Floating Box |
|---|---|---|---|---|---|
| Desktop (>1024px) | Centred, configurable width | Corner positioned | Full viewport | Full width | Corner positioned |
| Tablet (601-1024px) | Centred, max-width 90vw | Bottom drawer (full width) | Full viewport | Full width | Hidden or bottom drawer |
| Mobile (<600px) | Bottom sheet (slides up from bottom) | Bottom sheet | Full viewport | Full width, smaller text | Hidden or bottom sheet |

**Mobile-specific behaviour:**
- Modals become bottom sheets on mobile (slide up from bottom, easier to dismiss with thumb)
- Close button touch target: minimum 44x44px
- Popup content scrollable if taller than viewport (with visible scroll indicator)
- Backdrop touch-scrollable (no scroll lock on body — prevents iOS rubber-banding issues)

---

## Accessibility

- `role="dialog"` + `aria-modal="true"` on popup container
- `aria-label` set from popup title
- `aria-hidden="true"` when popup is not visible
- Focus trapped inside popup when visible (Tab cycles through focusable elements)
- Focus moves to first focusable element when popup opens
- Focus returns to trigger element (or body) when popup closes
- `Escape` key closes popup
- Close button has `aria-label="Close pop-up"`
- Overlay click closes popup (for modal/fullscreen types)
- Animations respect `prefers-reduced-motion: reduce` — instant show/hide, no transitions
- Screen reader announcement: `aria-live="polite"` region announces "Pop-up opened" when shown
- No autoplaying audio or video inside popups without user interaction

---

## Performance Budget

- **Zero-cost on pages without popups** — no CSS, no JS, no DOM elements
- **CSS:** < 8KB for all campaign type styles (loaded only when needed)
- **JS:** < 6KB Interactivity API store + trigger handlers (viewScriptModule, deferred)
- **DOM:** Each popup adds 3-5 elements (wrapper, overlay, content, close button)
- **Analytics:** `navigator.sendBeacon` — non-blocking, no impact on page unload
- **Rule evaluation:** Cached for 5 minutes via transient, < 1ms for cached lookup
- **No layout shift:** Popups are `position: fixed` overlays — zero CLS impact

---

## GDPR & Privacy

- **No personal data stored** — analytics are aggregate counts, not per-visitor
- **Cookie usage:** Only a small frequency-capping cookie (`sgs_popup_{id}` = impression count, 1-30 day expiry)
- **GDPR consent mode:** When enabled, the plugin checks for a third-party consent cookie (CookieYes, Complianz, CookieBot) before showing any popups. No consent → no popups → no cookies
- **Do Not Track:** When the `Respect DNT` setting is on, `navigator.sendBeacon` calls for analytics are skipped for visitors with DNT enabled
- **No external requests** — all popup content is served from the WordPress site itself, no third-party SaaS calls
- **Data retention:** Analytics data automatically pruned by daily cron based on configured retention period

---

## Database Schema

### Table: `{prefix}sgs_popup_events`

Created on plugin activation via `dbDelta()`.

```sql
CREATE TABLE {prefix}sgs_popup_events (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    popup_id        BIGINT UNSIGNED NOT NULL,
    variant         CHAR(1) NOT NULL DEFAULT 'A',
    event_type      VARCHAR(20) NOT NULL,
    event_date      DATE NOT NULL,
    event_count     INT UNSIGNED NOT NULL DEFAULT 1,
    UNIQUE KEY uk_popup_event_date (popup_id, variant, event_type, event_date),
    KEY idx_event_date (event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Options (wp_options)

- `sgs_popups_settings` — serialised array of global settings
- `sgs_popups_db_version` — integer for schema migration tracking

### Activation / Deactivation / Uninstall

- **Activation:** Create database table, set default options, flush rewrite rules
- **Deactivation:** Unschedule cron jobs
- **Uninstall (uninstall.php):** Drop database table, delete all `sgs_popup` posts and their meta, delete all `sgs_popups_*` options, remove frequency-capping cookies (documented for users to clear manually)

---

## Integration Points

| Component | Integration |
|---|---|
| **SGS Forms** | Form blocks inside popup content trigger popup conversion events on submission |
| **SGS Theme** | Reads design tokens (colours, typography, spacing, shadows) from theme.json |
| **SGS Blocks** | Any SGS block can be placed inside popup content |
| **N8N** | Conversion events can trigger N8N webhooks for notifications/CRM updates |
| **Cookie consent plugins** | Checks consent cookie before showing popups (GDPR mode) |

---

## Competitive Edge Summary

| Feature | OptinMonster | Popup Maker | Convert Pro | Elementor Pro | SGS Pop-ups |
|---|---|---|---|---|---|
| Pricing | $9-49/month SaaS | Free + $99-299 Pro | $99/year | $59-399/year | Free (self-hosted) |
| Block editor content | No (proprietary builder) | Limited | No | Elementor builder | Full WordPress block editor |
| Exit intent | Yes (patented term) | Pro only | Yes | Yes | Yes |
| A/B testing | Yes (all plans) | Pro only | Yes | No | Yes |
| Analytics | Yes (SaaS dashboard) | Basic | Basic | No | Built-in per-popup |
| GDPR consent mode | Basic | Basic | Yes | No | Yes (auto-detects consent plugins) |
| Performance impact | External JS on all pages | Plugin JS on all pages | Plugin JS on all pages | Elementor JS on all pages | Zero assets on pages without popups |
| SGS Forms integration | No | No | No | No | Native |
| Per-site licensing | Per-site SaaS fee | One-time Pro licence | One-time | Per-site annual | None |

---

## Phase / Build Order

**Phase:** After SGS Forms (Phase 1b) and before SGS Chatbot. The popup plugin depends on SGS Forms being available for email capture popups, but does not depend on the booking plugin.

**Build sequence:**
1. Plugin scaffold + CPT registration + basic editor sidebar
2. Campaign type rendering (modal + slide-in first, then remaining types)
3. Trigger system (time-delay + scroll-depth first, then exit-intent + click + inactivity)
4. Display rules engine (page targeting first, then user/device/referrer/schedule)
5. Frequency capping (cookies)
6. Analytics recording + REST endpoints
7. Admin dashboard (list table columns + analytics page)
8. A/B testing
9. GDPR consent mode
10. SGS Forms integration (conversion detection)

**Estimated blocks of work:** 10 increments, each independently deployable and testable.
