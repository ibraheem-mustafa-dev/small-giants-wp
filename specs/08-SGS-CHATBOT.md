# SGS Chatbot — WordPress Chat & AI Assistant Plugin

## Purpose

A self-hosted WordPress plugin providing live chat, AI-powered chatbot, and hybrid chat modes. Replaces Tidio ($24-2999/month SaaS), LiveChat ($20-59/month per agent), Crisp ($45-295/month), tawk.to (free but SaaS-hosted), and Intercom ($29-132/month).

**Core advantage over SaaS competitors:** All conversation data stays on the WordPress server. No per-agent licensing. Widget appearance reads from theme.json design tokens. AI processing delegated to N8N (use any LLM — OpenAI, Anthropic, local models). Zero vendor lock-in.

**Build timing:** This is a late-stage plugin. Spec now, build after SGS Forms, SGS Pop-ups, and client site launches are complete. The chatbot adds the most value on established sites with traffic, not during initial launches.

---

## Architecture

### Why N8N for AI, Not Direct LLM Calls

The plugin does NOT call OpenAI/Anthropic APIs directly. Instead, all AI processing routes through N8N webhooks. This provides:

1. **Model flexibility** — switch between GPT-4o, Claude, Llama, or any model via N8N workflow without plugin code changes
2. **RAG pipeline** — N8N can query a vector database (Pinecone, Qdrant, pgvector) for knowledge base retrieval before sending to LLM
3. **Cost control** — N8N rate-limits, caches, and routes requests (simple questions → smaller/cheaper model, complex → larger model)
4. **Audit trail** — N8N logs all AI interactions independently
5. **Escalation logic** — N8N decides when to escalate to human based on confidence scores, not the WordPress plugin

### High-Level Data Flow

```
Visitor → Widget (Interactivity API) → REST API → WordPress DB (conversation stored)
                                                  ↓
                                          N8N Webhook (AI mode)
                                                  ↓
                                          LLM + Knowledge Base
                                                  ↓
                                          Response → REST API → Widget
```

**Live chat mode:** Visitor → Widget → REST API → DB → Admin panel (real-time via polling/SSE) → Operator responds → REST API → Widget

**AI mode:** Visitor → Widget → REST API → N8N webhook → LLM processes → N8N returns response → REST API → Widget

**Hybrid mode:** AI handles initial messages. If confidence is low or visitor requests human, N8N escalation workflow notifies operator via N8N → email/Slack/WhatsApp.

---

## Plugin Structure

```
sgs-chatbot/
├── sgs-chatbot.php                  # Plugin bootstrap
├── package.json                     # Build toolchain
├── webpack.config.js
│
├── src/
│   ├── widget/
│   │   ├── view.js                  # Interactivity API store (chat widget)
│   │   ├── style.css                # Widget frontend styles
│   │   └── components/              # Widget sub-components (message bubble, input, etc.)
│   │
│   ├── admin/
│   │   ├── inbox.js                 # Operator inbox (React)
│   │   ├── settings.js              # Settings page
│   │   ├── knowledge-base.js        # Knowledge base management
│   │   └── style.css                # Admin styles
│   │
│   └── editor/
│       ├── index.js                 # Gutenberg sidebar panel for per-page chat config
│       └── style.css
│
├── build/                           # Compiled output
│
├── includes/
│   ├── class-sgs-chatbot.php        # Main plugin class
│   ├── class-chat-widget.php        # Widget rendering (conditional based on settings)
│   ├── class-conversations.php      # Conversation CRUD + message storage
│   ├── class-knowledge-base.php     # KB article management
│   ├── class-n8n-bridge.php         # N8N webhook integration
│   ├── class-rest-api.php           # REST endpoints (messages, conversations, KB)
│   ├── class-settings.php           # Settings page
│   └── class-sse-handler.php        # Server-Sent Events for real-time updates
│
└── templates/
    └── widget.php                   # Widget HTML template
```

---

## Chat Modes

### 1. Live Chat (Human Operator)

- Visitor sends message → stored in DB → appears in admin inbox
- Operator responds from admin inbox → stored in DB → pushed to visitor widget
- Real-time updates via Server-Sent Events (SSE) with long-polling fallback
- Typing indicators (both directions)
- Operator can transfer conversation to another operator
- Offline mode: when no operators online, widget shows "Leave a message" form instead

### 2. AI Chat (N8N + LLM)

- Visitor sends message → stored in DB → forwarded to N8N webhook
- N8N workflow: retrieves relevant KB articles → constructs prompt with context → calls LLM → returns response
- Response stored in DB → pushed to visitor widget
- AI messages clearly marked as "AI Assistant" (not pretending to be human)
- Conversation context maintained (last 10 messages sent with each request for continuity)
- Fallback: if N8N webhook times out (>15s) or returns error, show "Sorry, I couldn't process that. Would you like to speak to a human?"

### 3. Hybrid Chat (AI-first, Human Escalation)

- AI handles initial messages
- Escalation triggers (configurable in N8N workflow):
  - Visitor explicitly asks for human ("speak to someone", "human", "agent")
  - AI confidence below threshold (returned by N8N workflow)
  - Conversation exceeds N messages without resolution
  - Specific keywords detected (e.g., "complaint", "refund", "urgent")
- On escalation: N8N sends notification to operator (email, Slack, WhatsApp)
- Conversation seamlessly transferred — operator sees full AI conversation history
- If operator doesn't respond within configurable timeout, AI resumes with apology

---

## Database Schema

### Table: `{prefix}sgs_chat_conversations`

```sql
CREATE TABLE {prefix}sgs_chat_conversations (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    visitor_id      VARCHAR(64) NOT NULL,      -- Hashed cookie ID (not PII)
    operator_id     BIGINT UNSIGNED DEFAULT NULL, -- WP user ID of assigned operator
    status          VARCHAR(20) NOT NULL DEFAULT 'open',  -- open, resolved, escalated, archived
    mode            VARCHAR(10) NOT NULL DEFAULT 'ai',     -- ai, live, hybrid
    page_url        VARCHAR(500) DEFAULT NULL,  -- Page where chat was initiated
    visitor_name    VARCHAR(100) DEFAULT NULL,   -- Optional, provided by visitor
    visitor_email   VARCHAR(254) DEFAULT NULL,   -- Optional, provided by visitor
    started_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     DATETIME DEFAULT NULL,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_visitor (visitor_id),
    INDEX idx_operator (operator_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Table: `{prefix}sgs_chat_messages`

```sql
CREATE TABLE {prefix}sgs_chat_messages (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    conversation_id BIGINT UNSIGNED NOT NULL,
    sender_type     VARCHAR(10) NOT NULL,       -- visitor, operator, ai, system
    sender_id       VARCHAR(64) DEFAULT NULL,   -- WP user ID for operator, visitor_id for visitor
    message         TEXT NOT NULL,
    metadata        JSON DEFAULT NULL,           -- Attachments, AI confidence, etc.
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_conversation (conversation_id, created_at),
    FOREIGN KEY (conversation_id) REFERENCES {prefix}sgs_chat_conversations(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

### Table: `{prefix}sgs_chat_knowledge_base`

```sql
CREATE TABLE {prefix}sgs_chat_knowledge_base (
    id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title           VARCHAR(255) NOT NULL,
    content         LONGTEXT NOT NULL,
    source_url      VARCHAR(500) DEFAULT NULL,  -- Original page URL if ingested from site
    source_type     VARCHAR(20) DEFAULT 'manual', -- manual, page, post, faq
    embedding_synced TINYINT(1) DEFAULT 0,       -- Whether N8N has processed this for vector DB
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_source (source_type),
    INDEX idx_sync (embedding_synced)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

---

## REST API Endpoints

All endpoints under `sgs-chatbot/v1/`.

### Public Endpoints (visitor-facing, nonce-verified)

#### `POST /conversations`

Start a new conversation.

```json
// Request
{ "page_url": "https://example.com/contact" }

// Response
{
    "conversation_id": 42,
    "visitor_token": "abc123...",
    "greeting": "Hello! How can I help you today?"
}
```

The `visitor_token` is a short-lived JWT (24h) that authenticates subsequent messages for this conversation. Stored in sessionStorage on the client.

#### `POST /conversations/{id}/messages`

Send a message in an existing conversation.

```json
// Request (Authorization: Bearer {visitor_token})
{
    "message": "What are your opening hours?",
    "visitor_name": "Jane"  // Optional, first message only
}

// Response
{
    "message_id": 108,
    "ai_response": {
        "message": "We're open Monday to Friday, 9am to 5pm.",
        "confidence": 0.92
    }
}
```

**AI mode:** Response includes `ai_response` inline (N8N webhook called synchronously with 15s timeout).

**Live chat mode:** Response is `{ "message_id": 108, "status": "delivered" }` — operator response comes via SSE.

#### `GET /conversations/{id}/messages`

Poll for new messages (SSE preferred, this is the fallback).

- **Parameters:** `since` (message ID — return only messages after this ID)
- **Authentication:** Bearer visitor_token

#### `GET /conversations/{id}/stream`

Server-Sent Events stream for real-time message delivery.

```
event: message
data: {"id":109,"sender_type":"operator","message":"Let me check that for you.","created_at":"2026-02-13T10:30:00Z"}

event: typing
data: {"sender_type":"operator","typing":true}
```

### Admin Endpoints (capability: `manage_options`)

#### `GET /admin/conversations`

List conversations for the operator inbox.

- **Parameters:** `status` (open | resolved | escalated | all), `page`, `per_page`

#### `POST /admin/conversations/{id}/messages`

Operator sends a message.

#### `PATCH /admin/conversations/{id}`

Update conversation (assign operator, change status, resolve).

#### `GET /admin/conversations/{id}`

Get full conversation with all messages.

#### `GET /admin/stats`

Dashboard statistics: open conversations, average response time, conversations today, resolution rate.

### Knowledge Base Endpoints (capability: `manage_options`)

#### `GET /admin/knowledge-base`

List KB articles.

#### `POST /admin/knowledge-base`

Create KB article (manual or ingest from page URL).

#### `PUT /admin/knowledge-base/{id}`

Update KB article.

#### `DELETE /admin/knowledge-base/{id}`

Delete KB article.

#### `POST /admin/knowledge-base/ingest`

Bulk ingest: scrape specified pages/posts from the WordPress site and create KB articles from their content.

```json
{
    "source": "post_type",
    "post_type": "page",
    "post_ids": [1, 2, 3]  // Optional — specific IDs, or omit for all
}
```

#### `POST /admin/knowledge-base/sync`

Trigger N8N webhook to re-process all KB articles for vector embeddings.

---

## Chat Widget

### Widget Appearance

The widget renders as a floating button (bottom-right by default) that expands to a chat panel.

**Design tokens from theme.json:**
- Widget accent colour: `--wp--preset--color--primary`
- Widget text colour: `--wp--preset--color--text`
- Widget background: `--wp--preset--color--surface`
- Font family: inherits site's body font
- Border radius: `--wp--preset--spacing--small` (for rounded corners)

**Customisable via settings:**
- Widget position: bottom-right | bottom-left
- Button icon: chat bubble | headset | custom SVG
- Button size: small (48px) | medium (56px) | large (64px)
- Greeting message: configurable text shown when widget opens
- Operator avatar: upload or Gravatar
- AI assistant name and avatar: configurable
- Online/offline indicator: green dot when operators available
- Pre-chat form: optional name + email fields before first message

### Widget States

| State | Appearance | Behaviour |
|---|---|---|
| **Collapsed** | Floating button with optional unread badge | Click to expand |
| **Expanded** | Chat panel (360px wide, 500px tall on desktop) | Full chat interface |
| **Minimised** | Small bar showing "1 new message" | Click to expand |
| **Offline** | Button with "Leave message" label | Opens contact form instead of live chat |
| **Loading** | Typing indicator dots | While waiting for AI or operator response |

### Widget HTML (injected via `wp_footer`)

```html
<div
    class="sgs-chatbot-widget"
    data-wp-interactive="sgs/chatbot"
    data-wp-context='{"expanded":false,"conversationId":null,"messages":[]}'
    data-wp-class--sgs-chatbot-widget--expanded="context.expanded"
>
    <!-- Toggle button -->
    <button
        class="sgs-chatbot-widget__toggle"
        data-wp-on--click="actions.toggleWidget"
        aria-label="Open chat"
        aria-expanded="false"
        data-wp-bind--aria-expanded="context.expanded"
    >
        <svg class="sgs-chatbot-widget__icon"><!-- chat icon --></svg>
        <span
            class="sgs-chatbot-widget__badge"
            data-wp-bind--hidden="!state.unreadCount"
            data-wp-text="state.unreadCount"
        ></span>
    </button>

    <!-- Chat panel -->
    <div
        class="sgs-chatbot-widget__panel"
        role="complementary"
        aria-label="Chat support"
        data-wp-bind--hidden="!context.expanded"
    >
        <!-- Header -->
        <div class="sgs-chatbot-widget__header">
            <span class="sgs-chatbot-widget__title">Chat with us</span>
            <button
                data-wp-on--click="actions.toggleWidget"
                aria-label="Minimise chat"
            >
                <svg><!-- minimise icon --></svg>
            </button>
        </div>

        <!-- Messages -->
        <div
            class="sgs-chatbot-widget__messages"
            role="log"
            aria-live="polite"
            data-wp-watch="callbacks.scrollToBottom"
        >
            <!-- Message bubbles rendered from context.messages -->
        </div>

        <!-- Input -->
        <form
            class="sgs-chatbot-widget__input"
            data-wp-on--submit="actions.sendMessage"
        >
            <input
                type="text"
                placeholder="Type a message..."
                aria-label="Chat message"
                data-wp-bind--value="context.inputValue"
                data-wp-on--input="actions.updateInput"
            />
            <button type="submit" aria-label="Send message">
                <svg><!-- send icon --></svg>
            </button>
        </form>
    </div>
</div>
```

---

## Admin Interface

### Operator Inbox

Admin page under the Chatbot menu. React-based real-time inbox:

1. **Conversation list** (left panel) — filterable by status (open, escalated, resolved), sorted by most recent message
2. **Active conversation** (centre panel) — full message thread with reply box
3. **Visitor info** (right panel) — page URL, visitor name/email (if provided), conversation start time, number of messages, previous conversations from same visitor

**Real-time updates:** SSE connection from admin panel to receive new messages without page refresh.

**Keyboard shortcuts:**
- `Ctrl+Enter` — send message
- `Escape` — close conversation
- `Up/Down` — navigate conversation list

### Canned Responses

Operators can save and reuse common responses:

- Stored in `wp_options` as serialised array
- Triggered by typing `/` in the reply box (shows filterable dropdown)
- Support `{visitor_name}` placeholder token

### Knowledge Base Manager

Admin page for managing KB articles:

1. **Article list** — title, source type, sync status, last updated
2. **Article editor** — title + content (rich text)
3. **Bulk ingest** — select post types/pages to scrape content from
4. **Sync status** — shows which articles have been sent to N8N for vector embedding

---

## N8N Integration

### Webhook Endpoints (called from plugin to N8N)

#### AI Response Webhook

```json
// Plugin → N8N
{
    "conversation_id": 42,
    "message": "What are your delivery times?",
    "context": [
        {"role": "visitor", "content": "Hi there"},
        {"role": "ai", "content": "Hello! How can I help?"},
        {"role": "visitor", "content": "What are your delivery times?"}
    ],
    "visitor_info": {
        "page_url": "https://example.com/products",
        "name": "Jane"
    }
}

// N8N → Plugin (response)
{
    "response": "We typically deliver within 3-5 working days across the UK.",
    "confidence": 0.88,
    "sources": ["kb-article-12"],
    "escalate": false
}
```

#### Escalation Webhook

Fired when AI decides to escalate (or visitor requests human):

```json
// Plugin → N8N
{
    "conversation_id": 42,
    "reason": "visitor_request",
    "conversation_summary": "Visitor asking about delivery times, then requested to speak to a human about a specific order.",
    "visitor_info": { "name": "Jane", "email": "jane@example.com" }
}
```

N8N workflow then sends notification to operator via email, Slack, or WhatsApp.

#### KB Sync Webhook

Sends KB articles to N8N for vector embedding:

```json
// Plugin → N8N
{
    "articles": [
        { "id": 12, "title": "Delivery Times", "content": "..." },
        { "id": 13, "title": "Returns Policy", "content": "..." }
    ]
}
```

### Settings for N8N

| Setting | Type | Description |
|---|---|---|
| AI response webhook URL | URL | N8N webhook endpoint for AI responses |
| Escalation webhook URL | URL | N8N webhook endpoint for escalation notifications |
| KB sync webhook URL | URL | N8N webhook endpoint for knowledge base sync |
| Webhook secret | Password | Shared secret for webhook authentication (HMAC-SHA256) |
| AI timeout | Number | Seconds to wait for N8N response before showing fallback (default: 15) |
| AI mode enabled | Toggle | Enable/disable AI responses (default: off until N8N configured) |

---

## Settings Page

Admin settings under Settings → SGS Chatbot:

### General

| Setting | Type | Default | Description |
|---|---|---|---|
| Chat mode | Select | AI | live / ai / hybrid |
| Widget enabled | Toggle | On | Master switch |
| Widget position | Select | bottom-right | bottom-right / bottom-left |
| Greeting message | Text | "Hello! How can I help?" | Shown when widget opens |
| Offline message | Text | "We're currently offline..." | Shown when no operators online |
| Pre-chat form | Toggle | Off | Require name/email before chatting |
| Pre-chat fields | Multi-select | name, email | Which fields to require |
| Operating hours | Schedule | Always on | When live chat operators are available |

### Appearance

| Setting | Type | Default | Description |
|---|---|---|---|
| Widget accent colour | Colour picker | Theme primary | Override theme.json primary |
| Button icon | Select | chat-bubble | chat-bubble / headset / custom |
| Custom icon SVG | Textarea | — | SVG markup for custom icon |
| Button size | Select | medium | small (48px) / medium (56px) / large (64px) |
| AI assistant name | Text | "Assistant" | Display name for AI messages |
| AI assistant avatar | Image upload | Default robot icon | Avatar for AI messages |
| Sound notification | Toggle | Off | Play sound on new message |

### Display Rules

| Setting | Type | Default | Description |
|---|---|---|---|
| Show on all pages | Toggle | On | Widget visible everywhere |
| Show on pages | Multi-select | — | Specific page IDs (when "all pages" is off) |
| Hide on pages | Multi-select | — | Exclude specific pages |
| Show after delay | Number | 0 | Seconds before widget appears |
| Show to logged-in users | Toggle | On | |
| Show to logged-out users | Toggle | On | |

### Data

| Setting | Type | Default | Description |
|---|---|---|---|
| Conversation retention | Select | 90 days | 30 / 60 / 90 / 180 / 365 days / forever |
| Export conversations | Button | — | Download all conversations as CSV |
| Delete all data | Button | — | Purge all conversations and messages (with confirmation) |

---

## Responsive Behaviour

| Breakpoint | Widget Button | Chat Panel |
|---|---|---|
| Desktop (>1024px) | 56px button, bottom-right corner | 360×500px panel, above button |
| Tablet (601-1024px) | 56px button, bottom-right corner | 360×450px panel, above button |
| Mobile (<600px) | 48px button, bottom-right corner | Full-width, full-height overlay (slides up) |

**Mobile-specific:**
- Chat panel becomes full-screen overlay on mobile
- Close button: minimum 44×44px touch target
- Input field positioned above virtual keyboard (uses `visualViewport` API)
- Back button / swipe-down to minimise

---

## Accessibility

- Widget toggle: `aria-expanded`, `aria-label="Open chat"` / `"Close chat"`
- Chat panel: `role="complementary"`, `aria-label="Chat support"`
- Message area: `role="log"`, `aria-live="polite"` for new messages
- Input: `aria-label="Chat message"`
- Send button: `aria-label="Send message"`
- Typing indicator: `aria-live="off"` (not announced, visual only)
- Focus management: focus moves to input when panel opens, returns to toggle when closed
- Keyboard: `Escape` closes panel, `Enter` sends message
- Animations respect `prefers-reduced-motion`
- Colour contrast: minimum 4.5:1 for all text in widget
- Screen reader: AI messages include `aria-label="AI Assistant said:"` prefix

---

## Performance Budget

- **Widget CSS:** < 6KB (loaded only when widget is enabled on current page)
- **Widget JS:** < 8KB Interactivity API store (viewScriptModule, deferred)
- **Admin inbox JS:** < 30KB (admin-only, not loaded on frontend)
- **SSE connection:** single lightweight connection, reconnects on drop
- **API calls:** messages sent via `fetch()`, responses received via SSE stream
- **No external scripts** — everything served from WordPress (unlike Tidio, Crisp, tawk.to which inject external JS)
- **Lazy widget:** widget HTML not injected until page is idle (`requestIdleCallback`)
- **Zero CLS:** widget is `position: fixed`, no layout impact

---

## GDPR & Privacy

- **Consent before chat:** Optional pre-chat consent checkbox ("I agree to the privacy policy")
- **Data storage:** All conversations stored locally in WordPress database (not SaaS)
- **Visitor identification:** Hashed cookie ID only — no fingerprinting, no IP logging
- **Email/name optional:** Pre-chat form fields are opt-in, not required by default
- **Right to erasure:** Admin can delete individual conversations or all data for a visitor ID
- **Data export:** Conversations exportable as CSV for GDPR subject access requests
- **Retention policy:** Automatic deletion of conversations older than configured retention period (daily cron)
- **No tracking pixels** — widget does not load images from external domains
- **Cookie:** Single session cookie (`sgs_chat_visitor` — hashed visitor ID, session-scoped)

---

## Security

- **REST API nonces** — all visitor endpoints verified via `wp_rest` nonce
- **Visitor tokens** — JWT with 24h expiry, conversation-scoped (visitors can only access their own conversations)
- **Admin endpoints** — capability check (`manage_options`) on all admin REST routes
- **N8N webhook authentication** — HMAC-SHA256 signature verification on all outgoing webhooks
- **Input sanitisation** — all messages sanitised with `wp_kses_post()` before storage
- **Output escaping** — all messages escaped with `esc_html()` before rendering in widget
- **Rate limiting** — max 5 messages per minute per visitor (prevents spam/abuse)
- **File sharing disabled by default** — optional, with strict type/size validation if enabled
- **XSS prevention** — message content rendered as text nodes, never `innerHTML`
- **SQL injection** — all queries via `$wpdb->prepare()`

---

## Integration Points

| Component | Integration |
|---|---|
| **N8N** | AI responses, escalation notifications, KB sync (all via webhooks) |
| **SGS Theme** | Widget reads design tokens from theme.json |
| **SGS Forms** | "Leave a message" offline form can use SGS Form block |
| **SGS Pop-ups** | Chat widget can be triggered by popup CTA ("Chat now" button) |
| **WooCommerce** | Future: show order details in operator sidebar (Phase 2) |

---

## Competitive Edge Summary

| Feature | Tidio | LiveChat | Crisp | tawk.to | Intercom | SGS Chatbot |
|---|---|---|---|---|---|---|
| Pricing | $24-2999/mo | $20-59/mo/agent | $45-295/mo | Free (+$29 branding) | $29-132/mo | Free (self-hosted) |
| Data location | SaaS (EU/US) | SaaS | SaaS (EU) | SaaS | SaaS (US) | Your server |
| AI chatbot | Lyro AI (paid) | ChatBot add-on | Basic | No | Fin AI ($0.99/resolution) | Any LLM via N8N |
| Custom LLM | No | No | No | No | No | Yes (via N8N) |
| Knowledge base | Built-in | Separate product | Built-in | Built-in | Built-in | Built-in + N8N RAG |
| Theme integration | Limited | Limited | Limited | Limited | Limited | Native theme.json tokens |
| Block editor | No | No | No | No | No | Admin uses React, widget uses Interactivity API |
| Per-agent pricing | Yes | Yes | Yes | No | Yes | No |
| GDPR self-hosted | No (SaaS) | No (SaaS) | Yes (EU hosting) | No (SaaS) | No (SaaS) | Yes (fully self-hosted) |
| Performance | External script ~80KB | External script ~120KB | External script ~100KB | External script ~200KB | External script ~150KB | < 14KB total (no external scripts) |

---

## Phase / Build Order

**Phase:** Last plugin to build. Requires N8N infrastructure and at least one live client site with traffic.

**Dependencies:**
- N8N server operational (already running at 72.62.212.169)
- At least one N8N workflow for AI responses (basic: forward to LLM, return response)
- Knowledge base articles populated (can bulk ingest from existing site pages)

**Build sequence:**
1. Plugin scaffold + DB tables + settings page
2. Widget rendering + Interactivity API store (collapsed/expanded states)
3. Conversation REST API (create, send message, poll)
4. SSE handler for real-time updates
5. Admin inbox (conversation list + reply)
6. N8N bridge (AI response webhook integration)
7. Knowledge base manager + bulk ingest
8. Pre-chat form + offline mode
9. Typing indicators + canned responses
10. Hybrid mode (AI → human escalation)
11. Analytics dashboard (response times, resolution rates)

**Estimated blocks of work:** 11 increments. Phases 1-5 deliver a functional live chat. Phases 6-8 add AI capability. Phases 9-11 are polish.
