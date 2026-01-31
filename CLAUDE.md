# Claude Code Guidelines for Whorl

## Project Overview

Whorl is a Thunderbird extension that adds @-mention autocomplete for contacts in email composition. The name references the spiral shape of the @ symbol, reminiscent of whorls found in nautilus shells and other natural patterns.

## Key Files

All source files are in the `src/` directory:

| File | Purpose |
|------|---------|
| `src/manifest.json` | Extension manifest (Manifest V3, min TB 128) |
| `src/background.js` | Settings management, contact fetching, recipient handling |
| `src/compose-script.js` | Autocomplete UI, mention insertion, keyboard handling |
| `src/compose-styles.css` | Dropdown and mention styling |
| `src/options.html/js/css` | Settings page UI and logic |
| `src/icon-*.png` | Extension icons (16, 32, 48, 96px) |

## Settings Schema

Settings are stored via `browser.storage.local`:

```javascript
{
  customContacts: [],        // Array of {name, email}
  blocklist: [],             // Array of strings (matches name or email)
  maxResults: 10,            // Number of dropdown results
  autoAddRecipient: true,    // Add mentioned contacts to To field
  searchAddressBooks: true,  // Include address book contacts
  searchRecipients: true,    // Include current To/CC/BCC recipients
  searchCustomContacts: true,// Include custom contacts
  triggerCharacter: "@"      // Character that triggers dropdown
}
```

## Packaging

The extension is packaged as an XPI file from the `src/` directory. Run:
- Windows: `.\scripts\package.ps1`
- Linux/Mac: `./scripts/package.sh`

The XPI is created in `dist/`. When adding new files to the extension, add them to `src/` and update both package scripts to include them.

## Releases

Releases are created by pushing a git tag. Tags use the format `X.Y.Z` (no `v` prefix):

```bash
git tag 1.0.7
git push origin 1.0.7
```

## Icons

The extension uses multiple icon sizes for different UI contexts:

| Size | Purpose |
|------|---------|
| 16px | Tabs, small UI elements |
| 32px | Toolbars, medium contexts |
| 48px | Add-on manager |
| 96px | High-DPI displays |

All sizes must be declared in `manifest.json`:

```json
"icons": {
  "16": "icon-16.png",
  "32": "icon-32.png",
  "48": "icon-48.png",
  "96": "icon-96.png"
}
```

**Options page favicon:** Add link elements in `options.html` `<head>` for the tab icon:

```html
<link rel="icon" type="image/png" sizes="32x32" href="icon-32.png">
<link rel="icon" type="image/png" sizes="16x16" href="icon-16.png">
```

**Generating smaller icons:** Use `scripts/resize-icons.ps1` to create 16px and 32px versions from the 96px source.

## Thunderbird API Notes

### Compose Scripts

Registered via `browser.scripting.compose.registerScripts()` in background.js.

**Lifecycle Requirements:** In Manifest V3, the background page is an event page that unloads after idle time (~2 minutes). Any registered event listener will wake it up and re-execute top-level code. Use session storage to prevent duplicate initialization:

```javascript
async function initialize() {
  // Prevent re-initialization when background wakes from messages
  const { initialized } = await browser.storage.session.get({ initialized: false });
  if (initialized) {
    return;
  }
  await browser.storage.session.set({ initialized: true });

  await loadSettings();
  await registerComposeScripts();
}

// Empty listener ensures background runs on Thunderbird startup
browser.runtime.onStartup.addListener(() => {});

// Initialize on load (startup, install/update, or dev reload)
initialize();
```

### Address Books

Use `browser.addressBooks.contacts.query()` to search contacts. Returns vCard data that needs parsing.

### Storage

Settings persisted via `browser.storage.local`. Listen for changes with `browser.storage.onChanged`.

**Auto-save Pattern:** For list items (contacts, blocklist), save immediately on add/remove rather than requiring a Save button:

```javascript
async function addItem() {
  items.push(newItem);
  renderItems(items);
  await browser.storage.local.set({ items });
  showStatus("Item added");
}
```

## UI Design Guidelines

Follow Thunderbird's native settings UI style:

### Layout
- **Flat design** - no boxed/card sections
- **Horizontal dividers** - thin border-bottom between sections
- **Compact spacing** - minimal padding and margins
- **Max width** - constrain content width (600px for settings)

### Typography
- **Page title**: 15px, font-weight 600 (bold)
- **Section headers**: 13px, font-weight 600 (bold), normal case (not uppercase)
- **Body text**: 13px
- **Small/secondary text**: 11-12px

### Colors (CSS Variables)

```css
/* Light theme */
--bg: #F9F9FA;
--border: #D7D7DB;
--text: #15141A;
--text-secondary: #5B5B66;
--accent: #0061E0;
--input-bg: #FFFFFF;
--input-border: #8F8F9D;
--btn-bg: #F0F0F4;
--btn-border: #CFCFD8;
--success: #058B00;
--error: #C50042;

/* Dark theme */
--bg: #2A2A2E;
--border: #4A4A4F;
--text: #F9F9FA;
--text-secondary: #B1B1B3;
--accent: #45A1FF;
--input-bg: #3A3A3E;
--input-border: #5C5C61;
--btn-bg: #4A4A4F;
--btn-border: #5C5C61;
--success: #30E60B;
--error: #FF848B;
```

### Components

**Buttons:**
- Outlined style, not filled
- Primary buttons use accent color for border and text
- Padding: 3px 10px
- Border-radius: 2px

**Inputs:**
- Dark background in dark mode (#3A3A3E)
- Padding: 3px 6px
- Border-radius: 2px
- Focus: 2px accent outline

**Checkboxes:**
- Use `accent-color` for theming
- 14px size
- 6px margin-right before label

**Tables:**
- No outer border
- Row dividers only (border-bottom)
- Cell padding: 6px vertical, 12px horizontal gap
- Header: secondary text color, 600 weight

### Theme Support

Use `@media (prefers-color-scheme: dark)` to switch between light and dark themes. Define all colors as CSS custom properties in `:root`.

### Spacing Guidelines

- Body padding: 12px 16px
- Section margin-bottom: 4px
- Section padding-bottom: 10px
- Row margin-bottom: 4px
- Element gaps: 6px
