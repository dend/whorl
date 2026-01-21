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

## Thunderbird API Notes

### Compose Scripts
Registered via `browser.scripting.compose.registerScripts()` in background.js.

### Address Books
Use `browser.addressBooks.contacts.query()` to search contacts. Returns vCard data that needs parsing.

### Storage
Settings persisted via `browser.storage.local`. Listen for changes with `browser.storage.onChanged`.

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
