# Thunderbird @Mention - Technical Design

## Overview

This document outlines the technical design and architecture of the Thunderbird @Mention extension, which enables @-mentioning contacts in the email compose window. It provides comprehensive details on every component to serve as both documentation and a guide for future development.

## Requirements

### Functional Requirements

1. **Autocomplete Trigger**: Typing `@` in the compose body triggers a dropdown
2. **Contact Sources**: Show contacts from:
   - Current recipients (To, CC, BCC fields)
   - User's address book(s)
3. **Mention Rendering**: Insert mentions as clickable `mailto:` links
4. **Recipient Management**: Automatically add mentioned contacts to the To field
5. **Backspace Behavior**: Word-by-word deletion for multi-word names

### Non-Functional Requirements

1. **Performance**: Responsive autocomplete with minimal latency
2. **Theme Support**: Adapt to light and dark themes
3. **Compatibility**: Support Thunderbird 128+ ([Manifest V3](https://webextension-api.thunderbird.net/en/stable/changes/manifest-v3.html))

---

## Architecture

### Component Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Thunderbird Compose Window               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Compose Editor                      │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              compose-script.js                   │  │  │
│  │  │  - Input monitoring                              │  │  │
│  │  │  - Dropdown management                           │  │  │
│  │  │  - Mention insertion                             │  │  │
│  │  │  - Backspace handling                            │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │              compose-styles.css                  │  │  │
│  │  │  - Dropdown styling                              │  │  │
│  │  │  - Mention styling                               │  │  │
│  │  │  - Theme support                                 │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ browser.runtime.sendMessage
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      background.js                           │
│  - Compose script registration                               │
│  - Contact fetching (recipients + address book)              │
│  - Recipient management (add to To field)                    │
│  - vCard parsing                                             │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

1. **User types `@`** → `input` event fires in compose-script.js
2. **findAtTrigger()** → Detects `@` and extracts query text
3. **fetchAndShowContacts()** → Sends message to background script
4. **background.js** → Fetches recipients + queries address book
5. **Contacts returned** → Dropdown populated and displayed
6. **User selects contact** → Mention inserted, recipient added to To

---

## File-by-File Breakdown

### manifest.json

The manifest file defines the extension's metadata, permissions, and components. Each field serves a specific purpose:

```json
{
  "manifest_version": 3,
  "name": "Thunderbird @Mention",
  "version": "1.0.0",
  "description": "Add @-mention autocomplete for contacts in email composition",
  "browser_specific_settings": {
    "gecko": {
      "id": "at-mention@thunderbird-extension",
      "strict_min_version": "128.0"
    }
  },
  "permissions": ["compose", "addressBooks", "scripting"],
  "background": {
    "scripts": ["background/background.js"],
    "type": "module"
  },
  "icons": {
    "48": "icons/icon-48.png",
    "96": "icons/icon-96.png"
  }
}
```

**Field explanations:**

| Field | Purpose |
|-------|---------|
| `manifest_version: 3` | Uses Manifest V3, required for Thunderbird 128+ |
| `browser_specific_settings.gecko.id` | Unique extension identifier for Thunderbird/Gecko |
| `browser_specific_settings.gecko.strict_min_version` | Minimum Thunderbird version (128.0 for MV3 support) |
| `permissions: compose` | Access to compose window APIs for reading/modifying recipients |
| `permissions: addressBooks` | Access to search and read contacts from address books |
| `permissions: scripting` | Required to use `browser.scripting.compose.registerScripts()` |
| `background.scripts` | Background script that runs persistently |
| `background.type: module` | Enables ES module syntax in background script |

**Why no `compose_scripts` in manifest?**

Unlike content scripts for web pages, Thunderbird's compose scripts cannot be declared statically in the manifest. They must be registered programmatically using `browser.scripting.compose.registerScripts()` in the background script. This is a Thunderbird-specific requirement.

---

### background/background.js

The background script is the extension's "backend". It runs in a privileged context with access to Thunderbird APIs that compose scripts cannot access directly.

#### Script Registration

```javascript
browser.scripting.compose.registerScripts([
  {
    id: "at-mention-compose",
    js: ["compose/compose-script.js"],
    css: ["compose/compose-styles.css"]
  }
]).catch((err) => {
  console.log("Compose script registration:", err.message);
});
```

**How it works:**
- Called immediately when the background script loads
- Registers both JavaScript and CSS to be injected into compose windows
- The `id` must be unique; re-registering with the same ID throws an error
- The `.catch()` handles the case where the background script restarts and tries to re-register
- **Important**: Registered scripts only apply to *newly opened* compose windows, not already-open ones

See: [scripting.compose API](https://webextension-api.thunderbird.net/en/stable/scripting.compose.html)

#### Message Handling

```javascript
browser.runtime.onMessage.addListener(async (message, sender) => {
  const tabId = sender.tab?.id;

  if (message.type === "getContacts") {
    return await getContactsForCompose(tabId, message.query);
  }

  if (message.type === "ensureRecipientInTo") {
    await ensureRecipientInTo(tabId, message.email, message.name);
  }
});
```

**How it works:**
- Listens for messages from compose scripts via `browser.runtime.sendMessage()`
- The `sender` object contains information about the sender, including `sender.tab.id`
- The tab ID is essential for accessing compose-specific data (recipients, etc.)
- Returns data for `getContacts` (the compose script awaits the response)
- No return needed for `ensureRecipientInTo` (fire-and-forget)

#### Contact Fetching: getContactsForCompose()

This function aggregates contacts from two sources: current recipients and the address book.

```javascript
async function getContactsForCompose(tabId, query) {
  const contacts = new Map(); // Use Map to dedupe by email

  // 1. Get current recipients
  // 2. Search address book
  // 3. Merge, dedupe, sort, and return
}
```

**Step 1: Fetching Current Recipients**

```javascript
const composeDetails = await browser.compose.getComposeDetails(tabId);
const recipientFields = ["to", "cc", "bcc"];

for (const field of recipientFields) {
  const recipients = composeDetails[field] || [];
  for (const recipient of recipients) {
    const parsed = parseRecipient(recipient);
    if (parsed && matchesQuery(parsed, query)) {
      contacts.set(parsed.email.toLowerCase(), {
        ...parsed,
        isRecipient: true  // Flag for priority sorting
      });
    }
  }
}
```

**Why this matters:**
- Recipients the user has already added are likely the most relevant suggestions
- They're marked with `isRecipient: true` so they appear first in results
- Recipients can be in various formats: `"email@example.com"` or `"Name <email@example.com>"`
- The `parseRecipient()` function handles both formats

See: [compose.getComposeDetails()](https://webextension-api.thunderbird.net/en/stable/compose.html#getcomposedetails-tabid)

**Step 2: Searching Address Book**

```javascript
const queryOptions = query ? { searchString: query } : {};
const addressBookContacts = await browser.addressBooks.contacts.query(queryOptions);

for (const contact of addressBookContacts) {
  const parsed = parseVCard(contact.vCard);
  // ... process and add to contacts map
}
```

**Key details:**
- If `query` is empty, pass an empty object to get all contacts
- If `query` has a value, it searches across contact fields
- Results include the full vCard string, not parsed properties
- Contacts already in the map (from recipients) are skipped (deduplication)

See: [addressBooks.contacts.query()](https://webextension-api.thunderbird.net/en/stable/addressBooks.contacts.html)

**Step 3: Sorting and Limiting**

```javascript
const results = Array.from(contacts.values());
results.sort((a, b) => {
  if (a.isRecipient && !b.isRecipient) return -1;  // Recipients first
  if (!a.isRecipient && b.isRecipient) return 1;
  return (a.name || a.email).localeCompare(b.name || b.email);  // Then alphabetical
});
return results.slice(0, 10);  // Limit for performance
```

#### Recipient Management: ensureRecipientInTo()

Handles adding mentioned contacts to the To field and moving them from CC/BCC if needed.

```javascript
async function ensureRecipientInTo(tabId, email, name) {
  const details = await browser.compose.getComposeDetails(tabId);
  const emailLower = email.toLowerCase();

  // Check if already in To
  const inTo = (details.to || []).some((r) => {
    const parsed = parseRecipient(r);
    return parsed && parsed.email.toLowerCase() === emailLower;
  });

  if (inTo) return;  // Nothing to do

  // Remove from CC and BCC if present
  const newCc = (details.cc || []).filter(/* ... */);
  const newBcc = (details.bcc || []).filter(/* ... */);

  // Add to To
  const formattedRecipient = name ? `${name} <${email}>` : email;
  const newTo = [...(details.to || []), formattedRecipient];

  // Update compose window
  await browser.compose.setComposeDetails(tabId, {
    to: newTo,
    cc: newCc,
    bcc: newBcc
  });
}
```

**Why move from CC/BCC?**
- When you @mention someone, you're directly addressing them
- It makes semantic sense for them to be in the To field
- Prevents duplicate recipients across fields

See: [compose.setComposeDetails()](https://webextension-api.thunderbird.net/en/stable/compose.html#setcomposedetails-tabid-details)

#### vCard Parsing: parseVCard()

Thunderbird 102+ stores contacts in vCard format. This function extracts the essential fields.

```javascript
function parseVCard(vCard) {
  const result = { name: "", emails: [] };
  if (!vCard) return result;

  const lines = vCard.split(/\r?\n/);

  for (const line of lines) {
    // FN = Formatted Name (display name)
    if (line.startsWith("FN:")) {
      result.name = line.substring(3).trim();
    }

    // EMAIL may have parameters: EMAIL;PREF=1:user@example.com
    if (line.startsWith("EMAIL")) {
      const colonIndex = line.indexOf(":");
      if (colonIndex !== -1) {
        const email = line.substring(colonIndex + 1).trim();
        if (email) result.emails.push(email);
      }
    }
  }

  return result;
}
```

**vCard format example:**
```
BEGIN:VCARD
VERSION:4.0
N:Smith;John;;;
FN:John Smith
EMAIL;PREF=1:john@example.com
EMAIL:john.smith@work.com
UID:abc123
END:VCARD
```

**Parsing notes:**
- `FN:` is the formatted (display) name
- `EMAIL` lines may have parameters before the colon (e.g., `PREF=1`, `TYPE=work`)
- We extract everything after the colon as the email address
- A contact may have multiple email addresses

See: [Working with vCard contacts](https://webextension-api.thunderbird.net/en/latest/examples/vcard.html)

---

### compose/compose-script.js

The compose script runs inside the compose window's document. It handles all DOM manipulation and user interaction.

#### Initialization

```javascript
(function () {
  "use strict";

  // State variables
  let dropdown = null;
  let selectedIndex = -1;
  let currentContacts = [];
  let currentQuery = "";
  let atTriggerRange = null;

  function init() {
    document.addEventListener("input", handleInput);
    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("click", handleDocumentClick);
    createDropdown();
  }

  // Initialize when DOM is ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
```

**Why an IIFE (Immediately Invoked Function Expression)?**
- Prevents polluting the global namespace of the compose document
- All variables are scoped within the function
- Avoids conflicts with other scripts or Thunderbird internals

**State variables explained:**
| Variable | Purpose |
|----------|---------|
| `dropdown` | Reference to the dropdown DOM element |
| `selectedIndex` | Currently highlighted item index (-1 = none) |
| `currentContacts` | Array of contacts currently shown in dropdown |
| `currentQuery` | The text after `@` that triggered the search |
| `atTriggerRange` | DOM Range from `@` to cursor, used for replacement |

#### Dropdown Creation and Persistence

```javascript
function createDropdown() {
  dropdown = document.createElement("div");
  dropdown.id = "at-mention-dropdown";
  dropdown.className = "at-mention-dropdown";
  dropdown.style.display = "none";
  dropdown.contentEditable = "false";
  document.body.appendChild(dropdown);
}

function ensureDropdownExists() {
  if (!dropdown || !document.body.contains(dropdown)) {
    createDropdown();
  }
}
```

**Critical insight: Dropdown can be deleted!**

When a user selects all content (Cmd+A / Ctrl+A) and deletes it, the dropdown element (which is a child of `document.body`) is also deleted. The `ensureDropdownExists()` function is called before showing the dropdown to handle this edge case.

**Why `contentEditable="false"`?**
- Prevents the dropdown from being included in text selection
- Makes it behave as a UI element rather than content

#### Detecting the @ Trigger: findAtTrigger()

This is one of the most complex functions. It must accurately detect when the user is typing a mention.

```javascript
function findAtTrigger() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return null;

  const range = selection.getRangeAt(0);
  if (!range.collapsed) return null;  // Don't trigger with text selected

  let node = range.startContainer;
  let offset = range.startOffset;

  // If not in a text node, find the nearest text node
  if (node.nodeType !== Node.TEXT_NODE) {
    const textNode = findPreviousTextNode(node, offset);
    if (textNode) {
      node = textNode;
      offset = textNode.textContent.length;
    } else {
      return null;
    }
  }

  const text = node.textContent.substring(0, offset);

  // Find @ at start or preceded by whitespace
  let atIndex = -1;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === "@") {
      if (i === 0 || /\s/.test(text[i - 1])) {
        atIndex = i;
        break;
      } else {
        break;  // @ in middle of word (e.g., email address)
      }
    }
  }

  if (atIndex === -1) return null;

  const query = text.substring(atIndex + 1);
  if (query.length > 50) return null;  // Too long, probably not a mention

  // Create range for later replacement
  const triggerRange = document.createRange();
  triggerRange.setStart(node, atIndex);
  triggerRange.setEnd(node, offset);

  return { query, range: triggerRange };
}
```

**Why search backwards for @?**
- The user types left-to-right, but we need to find the trigger
- We start from the cursor and look backwards
- Stop at the first valid `@` (preceded by whitespace or at start)
- Stop if we find `@` in the middle of a word (like an email address)

**Handling complex DOM structures:**

The compose editor can have various DOM structures:
- Text directly in `<body>`
- Text in `<div>`, `<p>`, or other elements
- `<br>` elements mixed with text
- Nested elements from pasted content

The `findPreviousTextNode()` helper handles these cases by searching backwards through siblings and descendants.

```javascript
function findPreviousTextNode(parentNode, offset) {
  for (let i = offset - 1; i >= 0; i--) {
    const child = parentNode.childNodes[i];
    if (child.nodeType === Node.TEXT_NODE) {
      return child;
    }
    if (child.nodeType === Node.ELEMENT_NODE) {
      const textNode = getLastTextNode(child);
      if (textNode) return textNode;
    }
  }
  return null;
}

function getLastTextNode(node) {
  if (node.nodeType === Node.TEXT_NODE) return node;
  for (let i = node.childNodes.length - 1; i >= 0; i--) {
    const result = getLastTextNode(node.childNodes[i]);
    if (result) return result;
  }
  return null;
}
```

#### Dropdown Positioning

```javascript
function positionDropdown() {
  if (!atTriggerRange) return;

  const rect = atTriggerRange.getBoundingClientRect();

  // With position:fixed, use viewport coordinates directly
  let top = rect.bottom + 2;
  let left = rect.left;

  // Fallback if rect has no dimensions (empty document)
  if (rect.width === 0 && rect.height === 0) {
    const selection = window.getSelection();
    if (selection.rangeCount > 0) {
      const cursorRect = selection.getRangeAt(0).getBoundingClientRect();
      if (cursorRect.width > 0 || cursorRect.height > 0) {
        top = cursorRect.bottom + 2;
        left = cursorRect.left;
      } else {
        top = 50;
        left = 20;
      }
    }
  }

  // Boundary checks
  if (left < 10) left = 10;
  if (left + 250 > window.innerWidth) left = Math.max(10, window.innerWidth - 260);
  if (top + 200 > window.innerHeight) top = Math.max(10, rect.top - 210);
  if (top < 10) top = 10;

  dropdown.style.top = `${top}px`;
  dropdown.style.left = `${left}px`;
}
```

**Why `position: fixed`?**
- `position: absolute` is relative to the nearest positioned ancestor
- In an empty compose window, the body may have zero height
- `position: fixed` is relative to the viewport, always visible

**Fallback positioning:**
- `getBoundingClientRect()` can return zeros for collapsed/empty ranges
- We try the selection range as a fallback
- Ultimate fallback: fixed position at top-left (50px, 20px)

#### Inserting Mentions: selectContact()

```javascript
async function selectContact(index) {
  const contact = currentContacts[index];
  if (!contact || !atTriggerRange) return;

  const displayName = contact.name || contact.email;
  const email = contact.email;

  // Create mention span
  const mentionSpan = document.createElement("span");
  mentionSpan.className = "at-mention";
  mentionSpan.contentEditable = "false";
  mentionSpan.dataset.email = email;
  mentionSpan.dataset.name = displayName;

  const link = document.createElement("a");
  link.href = `mailto:${email}`;
  link.innerHTML = `@${displayName}`;
  mentionSpan.appendChild(link);

  // Replace @query with mention
  atTriggerRange.deleteContents();
  atTriggerRange.insertNode(mentionSpan);

  // Add space after mention
  const space = document.createTextNode("\u00A0");
  mentionSpan.parentNode.insertBefore(space, mentionSpan.nextSibling);

  // Move cursor after space
  const selection = window.getSelection();
  const newRange = document.createRange();
  newRange.setStartAfter(space);
  newRange.collapse(true);
  selection.removeAllRanges();
  selection.addRange(newRange);

  hideDropdown();

  // Add to To field
  await browser.runtime.sendMessage({
    type: "ensureRecipientInTo",
    email: email,
    name: displayName
  });
}
```

**Mention structure explained:**

```html
<span class="at-mention" contenteditable="false"
      data-email="user@example.com" data-name="John Smith">
  <a href="mailto:user@example.com">@John Smith</a>
</span>&nbsp;
```

| Element/Attribute | Purpose |
|-------------------|---------|
| `<span class="at-mention">` | Wrapper for styling and identification |
| `contenteditable="false"` | Makes the mention an atomic unit (can't edit inside) |
| `data-email` | Stores email for recipient management |
| `data-name` | Stores full name for backspace word deletion |
| `<a href="mailto:...">` | Clickable link that opens email client |
| `&nbsp;` (non-breaking space) | Ensures cursor can be placed after mention |

**Why use `\u00A0` (non-breaking space)?**
- Regular spaces at the end of elements can be collapsed by the browser
- Non-breaking space ensures there's always a character after the mention
- This allows the cursor to be positioned after the mention naturally

#### Backspace Word Deletion: handleMentionBackspace()

```javascript
function handleMentionBackspace() {
  const selection = window.getSelection();
  if (!selection.rangeCount) return false;

  const range = selection.getRangeAt(0);
  if (!range.collapsed) return false;

  let node = range.startContainer;
  let offset = range.startOffset;
  let mentionSpan = null;

  // Detect if cursor is adjacent to a mention
  if (node.nodeType === Node.TEXT_NODE) {
    if (offset === 0) {
      let prev = node.previousSibling;
      if (prev?.classList?.contains("at-mention")) {
        mentionSpan = prev;
      }
    } else if (offset === 1 && node.textContent[0] === "\u00A0") {
      let prev = node.previousSibling;
      if (prev?.classList?.contains("at-mention")) {
        mentionSpan = prev;
        node.textContent = node.textContent.substring(1);  // Remove nbsp
      }
    }
  } else if (node.nodeType === Node.ELEMENT_NODE && offset > 0) {
    const child = node.childNodes[offset - 1];
    if (child?.classList?.contains("at-mention")) {
      mentionSpan = child;
    }
  }

  if (!mentionSpan) return false;

  // Word-by-word deletion
  const name = mentionSpan.dataset.name;
  const words = name.split(/\s+/);

  if (words.length > 1) {
    words.pop();
    const newName = words.join(" ");
    mentionSpan.dataset.name = newName;
    mentionSpan.querySelector("a").innerHTML = `@${newName}`;
  } else {
    mentionSpan.remove();
  }

  return true;  // Indicate we handled the backspace
}
```

**Behavior example:**
1. Mention shows: `@John Smith`
2. User presses backspace → `@John`
3. User presses backspace again → mention removed entirely

**Why this approach?**
- Matches user expectations from other @mention implementations
- Allows partial corrections without deleting the entire mention
- Preserves the email in `data-email` even as the display name shortens

---

### compose/compose-styles.css

#### Dropdown Styling

```css
.at-mention-dropdown {
  position: fixed;
  z-index: 2147483647;
  background: #ffffff;
  border: 1px solid #cccccc;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  max-height: 200px;
  min-width: 200px;
  max-width: 350px;
  overflow-y: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 13px;
}
```

| Property | Purpose |
|----------|---------|
| `position: fixed` | Position relative to viewport (not document) |
| `z-index: 2147483647` | Maximum 32-bit integer, ensures dropdown is on top |
| `max-height: 200px` | Limits height, enables scrolling for many results |
| `overflow-y: auto` | Shows scrollbar when content exceeds max-height |

#### Theme Support

```css
@media (prefers-color-scheme: dark) {
  .at-mention-dropdown {
    background: #2d2d2d;
    border-color: #4a4a4a;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
  }

  .at-mention-item:hover,
  .at-mention-item.selected {
    background-color: #3d4f6f;
  }

  .at-mention-item-name {
    color: #e8e8e8;
  }

  .at-mention-item-email {
    color: #a0a0a0;
  }

  .at-mention a {
    color: #8ab4f8;
  }
}
```

**How it works:**
- `prefers-color-scheme: dark` detects the OS/browser dark mode setting
- Thunderbird respects this setting when the user chooses a dark theme
- Colors are chosen to maintain readability and contrast in dark mode

---

## API Usage

### Thunderbird WebExtension APIs

| API | Purpose | Documentation |
|-----|---------|---------------|
| `browser.scripting.compose.registerScripts()` | Inject compose scripts | [scripting.compose](https://webextension-api.thunderbird.net/en/stable/scripting.compose.html) |
| `browser.compose.getComposeDetails()` | Get current recipients | [compose](https://webextension-api.thunderbird.net/en/stable/compose.html) |
| `browser.compose.setComposeDetails()` | Update recipients | [compose](https://webextension-api.thunderbird.net/en/stable/compose.html) |
| `browser.addressBooks.contacts.query()` | Search address book | [addressBooks.contacts](https://webextension-api.thunderbird.net/en/stable/addressBooks.contacts.html) |
| `browser.runtime.sendMessage()` | Communication between scripts | [runtime](https://webextension-api.thunderbird.net/en/stable/runtime.html) |

For a complete list of supported APIs, see the [Thunderbird WebExtension API documentation](https://webextension-api.thunderbird.net/en/stable/).

### Message Protocol

| Type | Direction | Payload | Response |
|------|-----------|---------|----------|
| `getContacts` | compose → background | `{ query: string }` | `Array<{ name, email, isRecipient }>` |
| `ensureRecipientInTo` | compose → background | `{ email, name }` | None |

---

## Edge Cases and Solutions

### 1. Empty Compose Window

**Problem**: After deleting all content, the body has minimal structure and `getBoundingClientRect()` may return zeros.

**Solution**:
- Multiple fallback positioning strategies
- Check selection rect as alternative to range rect
- Ultimate fallback to fixed position (50, 20)

### 2. Dropdown Deletion

**Problem**: Cmd+A (select all) followed by delete removes the dropdown element from DOM.

**Solution**: `ensureDropdownExists()` checks `document.body.contains(dropdown)` and recreates if missing.

### 3. @ in Email Addresses

**Problem**: `user@example.com` contains `@` but shouldn't trigger autocomplete.

**Solution**: Only trigger when `@` is at start or preceded by whitespace.

### 4. Complex DOM Structures

**Problem**: Pasted content, formatted text, and reply quotes create complex DOM trees.

**Solution**: `findPreviousTextNode()` recursively searches through siblings and descendants.

### 5. Background Script Restart

**Problem**: When the background script restarts, it tries to re-register compose scripts with the same ID.

**Solution**: Wrap registration in `.catch()` to handle the "already registered" error gracefully.

---

## Known Limitations

1. **HTML Mode Only**: Plain text compose mode is not supported (no DOM to inject into)
2. **Newly Opened Windows**: Registered scripts only apply to new compose windows
3. **Large Contact Lists**: Results are limited to 10 for performance
4. **Recipient Timing**: Recipients must be fully "pillified" to appear in suggestions
5. **Draft Persistence**: Mention formatting may not survive draft save/restore

---

## Future Enhancements

- Support for mailing lists
- Configurable result limit
- Custom mention styling options
- Plain text mode support
- Mention persistence across draft saves
- Keyboard shortcut to trigger mention

---

## References

- [Thunderbird WebExtension API Documentation](https://webextension-api.thunderbird.net/en/stable/)
- [Manifest V3 Migration Guide](https://webextension-api.thunderbird.net/en/stable/changes/manifest-v3.html)
- [Thunderbird Add-on Developer Guide](https://developer.thunderbird.net/add-ons/mailextensions)
- [WebExtension Examples Repository](https://github.com/thunderbird/webext-examples)
- [Working with vCard Contacts](https://webextension-api.thunderbird.net/en/latest/examples/vcard.html)
- [Using Content Scripts](https://developer.thunderbird.net/add-ons/hello-world-add-on/using-content-scripts)
