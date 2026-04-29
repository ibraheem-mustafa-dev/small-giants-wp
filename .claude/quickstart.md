# Quick Start Guide — SGS Framework

Get a new WordPress site up and running with the SGS theme and blocks plugin.

---

## Contents

- [What you need](#what-you-need)
- [Installation](#installation)
- [Creating your first page](#creating-your-first-page)
- [Using the block inserter](#using-the-block-inserter)
- [Editing the header and footer](#editing-the-header-and-footer)
- [Common tasks](#common-tasks)

---

## What you need

- A WordPress site running version 6.7 or higher
- PHP 8.0 or higher on the server
- Administrator access to the WordPress dashboard
- The `sgs-theme` folder (or zip)
- The `sgs-blocks` folder (or zip)

---

## Installation

### Step 1 — Upload and activate the theme

1. Log in to your WordPress admin (usually `yoursite.com/wp-admin`).
2. Go to **Appearance > Themes**.
3. Click **Add New Theme**, then **Upload Theme**.
4. Click **Choose File**, select `sgs-theme.zip`, and click **Install Now**.
5. Once installed, click **Activate**.

### Step 2 — Upload and activate the blocks plugin

1. Go to **Plugins > Add New Plugin**.
2. Click **Upload Plugin**.
3. Click **Choose File**, select `sgs-blocks.zip`, and click **Install Now**.
4. Once installed, click **Activate Plugin**.

### Step 3 — Check everything is working

1. Go to **Appearance > Editor**. If it opens without errors, the theme is active and working.
2. Create a new page (see below) and try inserting an SGS block. If the SGS category appears in the inserter, the plugin is working.

---

## Creating your first page

1. In the WordPress admin, go to **Pages > Add New Page**.
2. Give the page a title at the top.
3. The main editing area is below the title. Click the **+** button to start adding blocks.
4. Add your content using blocks (see the section below).
5. When you are ready, click **Publish** in the top-right corner.
6. Click **View Page** to see the live result.

**To set a page as your homepage:**

1. Go to **Settings > Reading**.
2. Under "Your homepage displays", select **A static page**.
3. Choose your new page from the **Homepage** dropdown.
4. Click **Save Changes**.

---

## Using the block inserter

The block inserter is how you add any content to a page.

**Opening the inserter:**

- Click the blue **+** button in the editor toolbar (top-left).
- Or click the **+** icon that appears when you hover between blocks.
- Or type `/` on a blank line and start typing a block name.

**Finding SGS blocks:**

All SGS blocks are grouped under the **SGS** category in the inserter. Scroll down or type a name in the search box.

**Useful blocks to start with:**

- **SGS Hero** — for the top section of your page (big headline + background image).
- **SGS Container** — for any multi-column layout.
- **SGS Info Box** — for feature or service highlight cards.
- **SGS CTA Section** — for a call-to-action banner.
- **Paragraph**, **Heading**, **Image**, **Buttons** — core WordPress blocks that work seamlessly alongside SGS blocks.

**Editing a block:**

1. Click any block to select it.
2. A toolbar appears above the block with common options (bold, alignment, etc.).
3. The right-hand panel shows detailed settings for that block (colours, spacing, layout).

**Moving blocks:**

Click and drag the six-dot handle on the left of a selected block to reorder it. Or use the up/down arrows in the toolbar.

---

## Editing the header and footer

The header and footer are template parts — they are edited once and the changes apply to every page automatically.

**Editing the header:**

1. Go to **Appearance > Editor**.
2. In the left panel, click **Template Parts**.
3. Click **Header** (or whichever header variant is in use).
4. Click the pencil/edit icon to enter edit mode.
5. Make your changes:
   - Click the logo to replace it.
   - Click navigation links to edit them or add new items.
   - Change colours using the block settings panel on the right.
6. Click **Save** when done.

**Editing the footer:**

Same steps as above — go to **Template Parts** and select **Footer**.

**Adding a navigation link:**

1. Open the header template part as above.
2. Click the **Navigation** block.
3. Click the **+** button inside the navigation to add a new link.
4. Type the page name and press Enter, or paste a URL.

---

## Common tasks

### Add a testimonial section

1. Open the page you want to edit.
2. Click **+** to open the inserter.
3. Insert an **SGS Testimonial Slider** block.
4. Click inside the slider and add individual **SGS Testimonial** blocks.
5. For each testimonial, fill in the quote text, author name, role, and upload a photo.
6. In the Testimonial Slider block settings, choose whether autoplay is enabled and set the slide interval.

### Create a contact form

1. Insert an **SGS Form** block.
2. Inside the form, insert these field blocks:
   - **SGS Form Field: Text** — label it "Full Name", mark as required.
   - **SGS Form Field: Email** — label it "Email Address", mark as required.
   - **SGS Form Field: Textarea** — label it "Message", mark as required.
   - **SGS Form Field: Consent** — add your GDPR consent text.
3. In the Form block settings (right panel):
   - Set **Form Name** to something descriptive (e.g. "Contact Page Form").
   - Set **Submit Button Label** to "Send Message".
   - Set **Success Message** to "Thank you! We will be in touch shortly."
   - Paste your N8N webhook URL if you want to receive notifications.
4. Click **Save/Update** on the page.

To view submissions, go to **SGS Forms > Submissions** in the admin menu.

### Set up a hero section

1. Insert an **SGS Hero** block.
2. In the block settings:
   - Choose a **Variant**: Standard (image behind text), Split (image beside text), Video, or SVG Animated.
   - Type your **Headline** directly in the editor.
   - Type your **Sub-Headline** below it.
   - For Standard variant: click **Background Image** to upload or choose an image from the media library.
   - Set the **Overlay** colour and opacity to ensure your text is readable over the image.
   - Set the **Text Alignment** (left, centre, or right).
3. Add CTA buttons: set the Primary CTA text and URL in the settings panel. Optionally add a Secondary CTA.
4. Preview the result on mobile by clicking the preview icon in the editor toolbar and selecting **Mobile**.

### Set up Google Reviews

See the [SGS Blocks README](../plugins/sgs-blocks/README.md#google-reviews-setup) for full instructions. In short:

1. Get a Google Places API key from the Google Cloud Console.
2. Find your Place ID using Google's Place ID Finder tool.
3. Go to **Settings > SGS Google Reviews** and enter both values.
4. Insert an **SGS Google Reviews** block on any page.

### Change the site's colour scheme

1. Go to **Appearance > Editor**.
2. Click the **Styles** icon (circle/brush icon, top-right).
3. Click **Edit Styles**.
4. Click **Colours** to see the colour palette.
5. Click any colour swatch to change it globally.

Note: If your site uses a style variation (e.g. Indus Foods), switching variations will override these settings.

### Switch the style variation

1. Go to **Appearance > Editor**.
2. Click the **Styles** icon (circle/brush icon, top-right).
3. A list of style variations will appear. Click any to preview it.
4. Click **Save** to apply it.
