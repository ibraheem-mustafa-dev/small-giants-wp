# SGS Client Notes — Visual Annotation & Feedback System

## Purpose

A lightweight WordPress plugin that lets clients pin visual notes/comments directly on their website pages. Notes are visible only to specific user roles and provide a structured way for clients to request changes, flag issues, or leave feedback — all without leaving the site.

Replaces Atarim, ProjectHuddle, and similar SaaS tools with a self-hosted, zero-cost solution deployed across all client sites.

---

## How It Works (User Experience)

### For the Client

1. Client logs into their WordPress site (custom role: `sgs_client`)
2. A subtle toolbar appears at the bottom of every frontend page: **"Leave Feedback"** button
3. Client clicks the button — page enters annotation mode (cursor changes, elements highlight on hover)
4. Client clicks on any element — a comment pin appears at that location
5. A comment form slides in: text field, optional screenshot capture, priority selector (suggestion / issue / urgent)
6. Client submits — pin stays on the page, numbered, with their comment
7. Client can see all their notes + any replies from the SGS team
8. When a note is resolved, it shows a "Resolved" badge and fades (still visible, not deleted)

### For Small Giants Studio (Admin)

1. Admin sees a "Client Notes" menu item in wp-admin with a count badge
2. Dashboard shows all unresolved notes across all pages, sorted by priority
3. Admin can reply to notes (reply appears on the frontend pin for the client)
4. Admin marks notes as "In Progress" or "Resolved"
5. Email notifications over `wp_mail()`: built — the notification address (`sgs_client_notes_notification_email`) is emailed when a note is created or resolved, and the note's author is emailed when someone else replies (never a self-notification), all via `includes/api/class-notes-mailer.php` (unified-email plan, phase 5b, live-proven on sandybrown 2026-09-27)
6. Admin can filter by page, priority, status, date

---

## Plugin Structure

```
sgs-client-notes/
├── sgs-client-notes.php          # Plugin bootstrap
├── uninstall.php                 # Clean removal
│
├── includes/
│   ├── class-sgs-client-notes.php    # Main plugin class
│   ├── class-installer.php           # Database table creation
│   ├── class-roles.php               # Register sgs_client role + capabilities
│   │
│   ├── api/
│   │   ├── class-rest-notes.php      # REST: /sgs-client-notes/v1/notes
│   │   └── class-rest-replies.php    # REST: /sgs-client-notes/v1/replies
│   │
│   ├── admin/
│   │   ├── class-admin-notes.php     # Admin notes management page
│   │   └── class-admin-dashboard.php # Dashboard widget
│   │
│   └── frontend/
│       ├── class-frontend-loader.php # Conditionally loads frontend assets
│       └── class-screenshot.php      # Server-side screenshot processing
│
├── assets/
│   ├── js/
│   │   ├── annotation-mode.js        # Frontend annotation overlay logic
│   │   ├── comment-panel.js          # Slide-in comment form
│   │   ├── pin-renderer.js           # Render pins on page load
│   │   └── screenshot.js             # html2canvas screenshot capture
│   ├── css/
│   │   ├── frontend.css              # Frontend overlay + pin styles
│   │   └── admin.css                 # Admin management styles
│   └── vendor/
│       └── html2canvas.min.js        # Screenshot library (~40KB, loaded only in annotation mode)
│
└── templates/
    └── email/
        ├── note-reply.php            # Reply notification template
        └── note-resolved.php         # Resolution notification template
```

---

## Database Schema

### `{prefix}sgs_client_notes`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `post_id` | BIGINT(20) | WordPress post/page ID where the note was placed |
| `user_id` | BIGINT(20) | WordPress user ID of the note author |
| `selector` | VARCHAR(500) | CSS selector of the annotated element |
| `xpath` | VARCHAR(500) | XPath fallback for element targeting |
| `offset_x` | FLOAT | Horizontal offset as percentage (0-100) within the element |
| `offset_y` | FLOAT | Vertical offset as percentage (0-100) within the element |
| `viewport_width` | INT | Viewport width at time of annotation (for responsive context) |
| `comment` | TEXT | Note text content |
| `priority` | ENUM('suggestion','issue','urgent') | Note priority |
| `status` | ENUM('open','in_progress','resolved','archived') | Note status |
| `screenshot_url` | VARCHAR(500) | URL to screenshot attachment (optional) |
| `page_url` | VARCHAR(500) | Full URL of the page (for reference) |
| `element_text` | VARCHAR(255) | Truncated text content of the annotated element (for context) |
| `resolved_by` | BIGINT(20) | User ID who resolved the note |
| `resolved_at` | DATETIME | When the note was resolved |
| `created_at` | DATETIME | |
| `updated_at` | DATETIME | |

### `{prefix}sgs_client_note_replies`

| Column | Type | Description |
|---|---|---|
| `id` | BIGINT(20) AUTO_INCREMENT | Primary key |
| `note_id` | BIGINT(20) | FK to client_notes |
| `user_id` | BIGINT(20) | WordPress user ID of the replier |
| `comment` | TEXT | Reply text |
| `created_at` | DATETIME | |

---

## DOM Anchoring Strategy

The biggest technical challenge: keeping pins attached to the right element when the page content changes.

### Primary: CSS Selector

When the user clicks an element, generate a unique CSS selector using:
1. ID if available (`#hero-section`)
2. Nth-child path if no ID (`main > section:nth-child(3) > div:nth-child(2) > h2`)
3. Data attributes if present (`[data-block="sgs/hero"]`)

Store the selector + percentage offset within the element (not absolute pixel coordinates).

### Fallback: Content Matching

Also store:
- `element_text` — first 255 characters of the element's text content
- `xpath` — XPath expression as fallback selector
- `viewport_width` — viewport width at annotation time

When rendering pins, try CSS selector first. If the element doesn't exist or its text content has changed significantly, try XPath. If both fail, show the pin in a "detached notes" panel at the bottom of the page with a note: "This element may have been modified — original location could not be found."

### Responsive Handling

Pins are placed using percentage offsets, not pixel positions. The `viewport_width` is stored so we can determine whether the annotation was made on desktop, tablet, or mobile. Pins placed on desktop are shown on desktop views; mobile annotations on mobile views. All pins visible in the admin panel regardless of viewport.

---

## REST API

| Method | Endpoint | Auth | Purpose |
|---|---|---|---|
| GET | `/sgs-client-notes/v1/notes` | Logged in (nonce) | Get notes for current page |
| POST | `/sgs-client-notes/v1/notes` | Client role (nonce) | Create a new note |
| PATCH | `/sgs-client-notes/v1/notes/{id}` | Admin (nonce) | Update note status |
| DELETE | `/sgs-client-notes/v1/notes/{id}` | Admin (nonce) | Delete a note |
| POST | `/sgs-client-notes/v1/notes/{id}/replies` | Logged in (nonce) | Add a reply |
| GET | `/sgs-client-notes/v1/notes/{id}/replies` | Logged in (nonce) | Get replies for a note |

---

## User Roles & Capabilities

### `sgs_client` Role

Created on plugin activation. Capabilities:
- `read` — can view the frontend
- `sgs_create_notes` — can create annotations
- `sgs_view_own_notes` — can see their own notes and replies
- Cannot access wp-admin (except profile page)

### Admin Capabilities

- `sgs_manage_notes` — view all notes, reply, change status, delete
- `sgs_manage_client_users` — create/edit client user accounts
- Assigned to `administrator` role on activation

---

## Frontend Behaviour

### Loading Strategy

- Assets loaded **only** for logged-in users with `sgs_create_notes` or `sgs_manage_notes` capability
- No assets loaded for regular site visitors (zero performance impact on public site)
- `html2canvas` loaded on-demand only when screenshot capture is triggered (not on initial page load)

### Annotation Mode

When "Leave Feedback" is clicked:
1. Semi-transparent overlay covers the page
2. Cursor changes to crosshair
3. Hovering over elements highlights them with an outline
4. Clicking pins a numbered marker
5. Comment panel slides in from the right
6. User types comment, selects priority, optionally captures screenshot
7. ESC or clicking outside cancels annotation mode

### Pin Display

On page load (for authenticated users with the right role):
- Fetch notes for current page via REST API
- Render numbered pins at stored positions
- Pin colour indicates priority: blue (suggestion), amber (issue), red (urgent)
- Resolved pins shown as grey with checkmark, slightly transparent
- Clicking a pin opens its comment thread in a slide-in panel

---

## Notification System (N8N)

| Event | Webhook | Recipient |
|---|---|---|
| New note created | `/webhook/sgs-client-note-created` | Admin (email/Slack) |
| Admin replied to note | `/webhook/sgs-client-note-replied` | Client (email) |
| Note marked resolved | `/webhook/sgs-client-note-resolved` | Client (email) |
| Urgent note created | `/webhook/sgs-client-note-urgent` | Admin (email + SMS) |

---

## Admin Interface

### Notes Management Page

- List table: Page, Excerpt, Author, Priority, Status, Date, Replies count
- Filter by: page, priority, status, date range
- Bulk actions: mark resolved, archive, delete
- Clicking a note shows the full comment thread + screenshot + link to the page with the pin highlighted

### Dashboard Widget

- Count of open notes by priority
- Latest 5 unresolved notes with quick links

---

## Screenshot Capture

Optional feature — client can capture a screenshot of the annotated area.

**Implementation:**
1. `html2canvas` renders the viewport area around the clicked element
2. Canvas converted to JPEG blob (quality: 0.7, max 1920px wide)
3. Uploaded via REST endpoint to WordPress media library (private, not indexable)
4. Attachment ID stored with the note

**Fallback:** If html2canvas fails (iframes, cross-origin images), the screenshot button shows "Could not capture — please describe the issue in your comment."

---

## Security

- All REST endpoints require authentication (WordPress nonce + logged-in user)
- Clients can only view/create their own notes (`sgs_view_own_notes`, `sgs_create_notes`)
- Admins can view/manage all notes (`sgs_manage_notes`)
- File uploads (screenshots) restricted to JPEG/PNG, max 5MB
- Rate limiting: max 20 notes per hour per user (prevent spam)
- All input sanitised, all output escaped
- Plugin assets never loaded for unauthenticated visitors
