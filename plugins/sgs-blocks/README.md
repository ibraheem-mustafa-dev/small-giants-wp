# SGS Blocks

Custom Gutenberg block library by Small Giants Studio — 55 blocks across five categories, plus four editor extensions that apply to every block.

---

## Contents

- [Finding blocks in the editor](#finding-blocks-in-the-editor)
- [Block categories](#block-categories)
  - [Content blocks](#content-blocks)
  - [Form blocks](#form-blocks)
  - [Layout blocks](#layout-blocks)
  - [Commerce blocks](#commerce-blocks)
  - [Navigation blocks](#navigation-blocks)
- [Editor extensions](#editor-extensions)
- [Google Reviews setup](#google-reviews-setup)
- [Form submissions](#form-submissions)

---

## Finding blocks in the editor

Every SGS block appears under an **SGS** category in the block inserter.

To insert a block:

1. Click the **+** button in the editor toolbar or inside a content area.
2. Type the block name in the search box (e.g. "hero", "accordion", "pricing").
3. Click the block to insert it.

You can also type `/` on a blank line and start typing the block name as a shortcut.

All SGS blocks support the standard block toolbar (move, duplicate, remove) and have settings in the right-hand **Block** panel when selected.

---

## Block categories

### Content blocks

These blocks build the visible content sections of your pages.

| Block | What it does |
|-------|-------------|
| **SGS Hero** | Full-width page hero with headline, sub-headline, background image or video, an overlay, and up to two call-to-action buttons. Four variants: Standard, Split (image beside text), Video, and SVG Animated. |
| **SGS Testimonial Slider** | Scrollable carousel of testimonial cards with star ratings, autoplay, navigation dots, and arrows. |
| **SGS Testimonial** | Individual testimonial card with quote, author name, role, photo, and star rating. Used inside the Testimonial Slider. |
| **SGS Accordion** | Collapsible FAQ section using semantic `<details>` elements. Supports FAQ structured data for search engines. |
| **SGS Accordion Item** | A single question-answer pair. Place these inside an SGS Accordion. |
| **SGS Tabs** | Tabbed content panel with fully editable content inside each tab. Supports horizontal and vertical tab layouts. |
| **SGS Tab** | A single tab and its content. Used inside the Tabs block. |
| **SGS Info Box** | Icon, heading, and description card. Common use: feature lists, service highlights, "Why Choose Us" sections. Three hover effects available. |
| **SGS Card Grid** | Image grid with overlay or card display variants. Responsive columns with hover effects. Good for product showcases, team grids, and portfolio layouts. |
| **SGS CTA Section** | Call-to-action banner with headline, body text, and one or more buttons. Full layout and colour control. |
| **SGS Counter** | Animated number that counts up when it scrolls into view. Use for statistics ("10,000+ customers"). |
| **SGS Countdown Timer** | Live countdown clock to a date and time. Useful for promotions, launches, or event deadlines. |
| **SGS Process Steps** | Numbered step-by-step process block. Good for "How it works" sections. |
| **SGS Icon List** | List of items, each with an icon and text. Cleaner than a standard bullet list for feature comparisons or service summaries. |
| **SGS Icon Block** | A standalone icon with optional text label and link. |
| **SGS Icon** | Inline icon element for use within text or layouts. Draws from the Lucide icon library (1,900+ icons). |
| **SGS Brand Strip** | Infinite-scroll logo carousel. Logos display in greyscale and reveal colour on hover. Use for partner or client logos. |
| **SGS Trust Bar** | A horizontal strip of trust badges or certifications. |
| **SGS Certification Bar** | Certification logos displayed in a horizontal strip with optional labels. |
| **SGS Heritage Strip** | A stats or heritage bar displaying icon + label + value combinations (e.g. "Est. 1962", "5,000 products"). |
| **SGS Notice Banner** | An alert or information bar. Supports info, warning, success, and error variants. |
| **SGS Team Member** | Team member card with photo, name, role, and social links. |
| **SGS Star Rating** | Displays a star rating (0-5) with optional review count label. |
| **SGS Social Icons** | Row of social media icon links. Supports brand colours on hover. |
| **SGS Gallery** | Image gallery with grid or masonry layout and a built-in lightbox. |
| **SGS Post Grid** | Displays a grid or list of blog posts with AJAX pagination and category filtering. |
| **SGS Google Reviews** | Pulls real reviews from your Google Business Profile and displays them as cards. Requires API setup (see below). |
| **SGS Modal** | Popup modal that opens when a trigger element is clicked. The content inside the modal is fully editable. |
| **SGS Announcement Bar** | A thin banner at the very top of the page for promotions or important notices. |
| **SGS Decorative Image** | A purely visual image placed as a design element rather than content. |
| **SGS SVG Background** | Places an SVG shape as a section background or decorative layer. |
| **SGS WhatsApp CTA** | A floating or inline WhatsApp button that opens a pre-filled chat. |

---

### Form blocks

The SGS Forms system is a full form builder built into the block editor. Forms store submissions in the WordPress database and can notify you via an N8N webhook.

**There are 17 form blocks in total.**

#### The form wrapper

| Block | What it does |
|-------|-------------|
| **SGS Form** | The outer container for every form. Set the form name, submit button label, success message or redirect URL, and notification webhook. All field blocks go inside this block. |
| **SGS Form Step** | Divides a form into multiple steps (pages). Drop Field blocks inside each Step. When multiple Steps are present, the form shows a progress bar and Next/Back buttons automatically. |
| **SGS Form Review** | Shows the user a summary of what they entered before they submit. Place this as the last step in a multi-step form. |

#### Field blocks

All field blocks go inside an SGS Form or an SGS Form Step.

| Block | What it does |
|-------|-------------|
| **SGS Form Field: Text** | Single-line text input. Use for names, job titles, short answers. |
| **SGS Form Field: Email** | Email address input with format validation. |
| **SGS Form Field: Phone** | Phone number input. |
| **SGS Form Field: Textarea** | Multi-line text input. Use for messages, descriptions, or longer answers. |
| **SGS Form Field: Select** | Dropdown menu. Define the options in the block settings. |
| **SGS Form Field: Radio** | Multiple-choice question where the user picks one option. |
| **SGS Form Field: Checkbox** | Tick-box for yes/no questions or optional preferences. |
| **SGS Form Field: Tiles** | Visual multiple-choice selector displayed as clickable tiles rather than radio buttons. Good for "What service are you interested in?" questions. |
| **SGS Form Field: File** | File upload input. Accepted file types and maximum size are configurable in the block settings. |
| **SGS Form Field: Date** | Date picker input. |
| **SGS Form Field: Number** | Number input with optional minimum and maximum values. |
| **SGS Form Field: Address** | Structured address input (street, city, postcode, country). |
| **SGS Form Field: Consent** | GDPR consent tick-box with customisable label text. Required fields make the form unsubmittable unless ticked. |
| **SGS Form Field: Hidden** | Invisible field that passes a fixed value with the submission (e.g. form source, UTM parameters). |

#### Building a basic contact form

1. Insert an **SGS Form** block.
2. Inside it, insert **SGS Form Field: Text** (for the name), **SGS Form Field: Email**, and **SGS Form Field: Textarea** (for the message).
3. Optionally add an **SGS Form Field: Consent** block for GDPR.
4. In the Form block settings, set the **Form Name** (used to identify submissions), the **Submit Button Label**, and the **Success Message**.
5. To receive email or Slack notifications, enter your **N8N webhook URL** in the Form block settings.

#### Building a multi-step form

1. Insert an **SGS Form** block.
2. Inside it, insert one **SGS Form Step** block per step.
3. Add field blocks inside each step.
4. Optionally add an **SGS Form Review** block as the final step.
5. A progress bar and navigation buttons appear automatically.

#### Viewing submissions

All form submissions are stored in the WordPress database. To view them:

1. In the WordPress admin menu, go to **SGS Forms > Submissions**.
2. Filter by form name or date.
3. Click a submission to see all entered values.

---

### Layout blocks

Layout blocks control how other blocks are arranged on the page.

| Block | What it does |
|-------|-------------|
| **SGS Container** | The main layout building block. Wraps other blocks in a section with a configurable layout (stack, grid, or flex), responsive column counts (desktop, tablet, mobile independently), background colour or image, minimum height, and padding. Nest containers inside containers for complex layouts. |
| **SGS Card Grid** | A grid specifically optimised for cards and image-rich layouts. Also listed under Content blocks. |
| **SGS Hero** | Full-page hero layout block. Also listed under Content blocks. |

**Tip:** Use the SGS Container to build almost every layout. Set columns to 3 on desktop, 2 on tablet, and 1 on mobile — then drop your content blocks inside.

---

### Commerce blocks

| Block | What it does |
|-------|-------------|
| **SGS Pricing Table** | A pricing plan comparison block with plan names, prices, feature lists, and call-to-action buttons. Supports a "featured" plan highlight. |

---

### Navigation blocks

| Block | What it does |
|-------|-------------|
| **SGS Mega Menu** | Replaces a standard dropdown with a wide panel that can contain any blocks — images, columns, featured links, and calls to action. Configure the trigger link and panel content in the Site Editor under Template Parts. |
| **SGS Breadcrumbs** | Displays the current page's location in the site hierarchy (Home > Category > Page). Schema markup is included automatically. |
| **SGS Back to Top** | A button that appears after the user scrolls down and returns them to the top of the page when clicked. |
| **SGS Table of Contents** | Automatically generates a linked list of headings on the current page. Useful for long articles and documentation pages. |

---

## Editor extensions

Four extensions add extra capabilities to **all blocks** — not just SGS blocks, but core WordPress blocks too. They appear in the block settings panel on the right whenever a block is selected.

### Animation

Adds a scroll-triggered animation to any block. The block fades, slides, or zooms in when it enters the viewport.

**Settings available:**
- Animation type: Fade In, Slide Up, Slide Left, Slide Right, Zoom In.
- Delay: how long (in milliseconds) to wait before the animation starts.
- Duration: how long the animation takes.

The animation is powered by an IntersectionObserver — it triggers once as the block scrolls into view.

### Hover effects

Adds hover state changes to SGS blocks. When the user hovers over the block, its background colour, text colour, or border colour changes.

Set the hover colours in the **Hover Effects** panel in the block settings.

### Responsive visibility

Controls whether a block is visible on desktop, tablet, or mobile. Use this to show different content at different screen sizes without duplicating the whole layout.

**Example use:** Show a simplified version of a section on mobile and a fuller version on desktop, both inside the same page.

Toggle desktop, tablet, and mobile visibility independently in the **Visibility** panel.

### Custom spacing

Provides enhanced padding and margin controls with independent control over each side (top, right, bottom, left) and each breakpoint (desktop, tablet, mobile).

---

## Google Reviews setup

The SGS Google Reviews block pulls live reviews from your Google Business Profile.

**What you need:**
1. A **Google Places API key** — get one from the [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Enable the **Places API (New)** for your project.
2. Your **Place ID** — find it using the [Place ID Finder tool](https://developers.google.com/maps/documentation/javascript/examples/places-placeid-finder). Search for your business name and copy the ID (it starts with `ChIJ...`).

**Setting it up:**

1. In WordPress admin, go to **Settings > SGS Google Reviews**.
2. Paste your API key in the **API Key** field. The key is stored encrypted.
3. Paste your Place ID in the **Default Place ID** field.
4. Set the **Cache Duration** (default is 6 hours). Reviews are fetched fresh once per cache period to avoid unnecessary API calls.
5. Click **Save Settings**.
6. Click **Test API Connection** to confirm everything is working.

**Inserting the block:**

1. Insert an **SGS Google Reviews** block on any page.
2. If you have multiple locations, you can override the Place ID in the block settings.
3. The block will display your reviews as cards, including the reviewer's name, rating, and comment.

**Clearing the cache:**

If you have just received new reviews and want them to show immediately, go to **Settings > SGS Google Reviews** and click **Clear Cache**.

---

## Form submissions

All form submissions are stored securely in the WordPress database table `wp_sgs_form_submissions`.

**To view submissions:**

1. Go to **SGS Forms > Submissions** in the WordPress admin menu.
2. Use the filter dropdowns to narrow by form or date range.
3. Export to CSV if needed.

**N8N notifications:**

To trigger a webhook when a form is submitted, enter your N8N webhook URL in the **SGS Form** block settings. The webhook fires after every successful submission and includes all field values, the form name, and a timestamp.

Separate webhook URLs can be set for standard submissions and for high-priority forms.


---

## Testing

The plugin ships with two test suites -- PHPUnit for PHP server-side code and Jest for JavaScript block editor components.

---

### PHPUnit (PHP)

#### What is tested

| Test file | Coverage |
|-----------|---------|
| `tests/php/test-block-registration.php` | All 55 blocks register correctly via WP_Block_Type_Registry; server-side blocks have a render_callback. |
| `tests/php/test-form-submission.php` | REST API: valid submission (200), honeypot fake-success (200), rate limiting (429), missing/invalid nonce (403), oversized payload rejection, admin-only routes. |
| `tests/php/test-render-output.php` | Render output for hero (section), accordion-item (details/summary), form (form element, form ID, honeypot, Interactivity API), and modal (dialog). |

#### Prerequisites

1. **WordPress test suite** -- install once per environment:

```bash
bash bin/install-wp-tests.sh wordpress_tests root '' localhost latest
```

2. **Build the plugin assets** (block registration reads from `build/blocks/`):

```bash
npm run build
```

3. **PHPUnit** -- install via Composer:

```bash
composer require --dev phpunit/phpunit
```

#### Running the tests

```bash
npm run test:php

vendor/bin/phpunit --configuration phpunit.xml.dist

vendor/bin/phpunit --configuration phpunit.xml.dist tests/php/test-block-registration.php

vendor/bin/phpunit --configuration phpunit.xml.dist --coverage-text
```

#### Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WP_TESTS_DIR` | `/tmp/wordpress-tests-lib` | Path to the WordPress test suite |
| `DB_HOST` | `localhost` | Test database host |
| `DB_NAME` | `wordpress_tests` | Test database name |
| `DB_USER` | `root` | Test database user |
| `DB_PASSWORD` | _(empty)_ | Test database password |

---

### Jest (JavaScript)

#### What is tested

| Test file | Coverage |
|-----------|---------|
| `tests/js/block-edit.test.js` | Edit components for hero, accordion, form, card-grid: exports a function, renders without throwing, InspectorControls present, registerBlockType called by index.js. |

#### Prerequisites

All JS test dependencies are included via `@wordpress/scripts`. No extra packages required beyond the standard `npm install`.

#### Running the tests

```bash
npm run test:js

npx jest --config jest.config.js --watch

npx jest --config jest.config.js --coverage
```

#### How the mocks work

The `@wordpress/*` packages are webpack **externals** -- not installed as node_modules. `tests/js/setup.js` provides lightweight mocks for:

- `@wordpress/element` -- real React primitives
- `@wordpress/i18n` -- __() returns the string as-is
- `@wordpress/blocks` -- jest.fn() stubs for registerBlockType etc.
- `@wordpress/block-editor` -- useBlockProps, InspectorControls, RichText etc.
- `@wordpress/components` -- PanelBody, SelectControl, ToggleControl etc.
- `@wordpress/data` -- useSelect, useDispatch, select, dispatch
- `lucide-react` -- proxy returning a span for any icon name

---

### Running both suites

```bash
npm run test:php
npm run test:js
npm test
```

