# SGS Client Notes

Visual annotation and feedback system for WordPress. Allows clients to pin comments directly on website pages for streamlined communication and change requests.

## Features

- **Visual Annotations**: Click any element on a page to leave feedback
- **Priority Levels**: Suggestion, Issue, or Urgent
- **Comment Threads**: Reply to notes and track conversation history
- **Status Management**: Open, In Progress, Resolved, Archived
- **Screenshot Capture**: Optional screenshot attachment for visual context
- **Smart Anchoring**: Pins stay attached to elements using CSS selectors and XPath fallback
- **Responsive**: Works across desktop, tablet, and mobile viewports
- **N8N Integration**: Webhook notifications for new notes, replies, and resolutions
- **Custom Role**: `sgs_client` role with limited capabilities for client access

## Installation

1. Upload the plugin to `wp-content/plugins/sgs-client-notes/`
2. Activate the plugin through the 'Plugins' menu in WordPress
3. Go to **Client Notes > Settings** to configure N8N webhook URLs (optional)

## Usage

### For Clients

1. Log in to your WordPress site with an `sgs_client` account
2. Navigate to any page on the frontend
3. Click the **"Leave Feedback"** button in the bottom-right corner
4. Click on any element to annotate
5. Fill in your comment, select priority, and submit
6. View all your notes and replies by clicking on the numbered pins

### For Administrators

1. Access **Client Notes** in the WordPress admin menu
2. View all notes across all pages with filtering options
3. Reply to notes, change status, or mark as resolved
4. See unresolved notes in the dashboard widget

## Custom Role: sgs_client

The plugin creates a `sgs_client` role with these capabilities:
- `read` - Can view the frontend
- `sgs_create_notes` - Can create annotations
- `sgs_view_own_notes` - Can see their own notes and replies

Clients cannot access wp-admin (except their profile page).

## Database Schema

### sgs_client_notes
Stores all client annotations with element selectors, position data, comments, and metadata.

### sgs_client_note_replies
Stores reply threads for each note.

## N8N Webhook Events

Configure webhook URLs in **Client Notes > Settings** to receive notifications:

- `created` - New note created
- `reply` - Admin replied to a note
- `resolved` - Note marked as resolved
- `urgent` - Urgent note created (separate webhook URL)

## Technical Details

- **WordPress Version**: 6.0+
- **PHP Version**: 7.4+
- **JavaScript**: Vanilla JS (no dependencies)
- **DOM Anchoring**: CSS selectors with XPath fallback
- **Rate Limiting**: 20 notes per hour per user (configurable)
- **Screenshot Upload**: Max 5MB, JPEG/PNG only

## Security

- All REST endpoints require authentication and nonces
- Role-based access control (clients can only view/create their own notes)
- All input sanitised, all output escaped
- Screenshot uploads restricted and stored privately

## Uninstall

When the plugin is uninstalled, it will:
- Drop database tables
- Remove custom role and capabilities
- Delete all plugin options
- Remove screenshot attachments

## Credits

Developed by **Small Giants Studio**  
https://smallgiantsstudio.com

## License

GPL v2 or later
