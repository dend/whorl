# Whorl

A Thunderbird extension that enables @-mentioning contacts in the email compose window with autocomplete support. The name references the spiral shape of the @ symbol, reminiscent of whorls found in nautilus shells.

## Features

- **@-mention autocomplete**: Type `@` in the compose window to trigger a dropdown with matching contacts
- **Multiple contact sources**: Searches address books, current recipients, and custom contacts
- **Custom contacts**: Add your own contacts that appear alongside address book results
- **Blocklist**: Exclude specific contacts from appearing in suggestions
- **Configurable trigger**: Change the trigger character from `@` to any character
- **Auto-add to recipients**: Mentioned contacts are automatically added to the To field
- **Smart recipient handling**: If a contact is in CC/BCC, they're moved to To when mentioned
- **Theme-aware**: Dropdown and settings automatically adapt to light and dark themes
- **Keyboard navigation**: Use arrow keys to navigate, Enter/Tab to select, Escape to close

## Requirements

- Thunderbird 128 or later (Manifest V3)
- HTML compose mode (plain text mode not supported)

## Installation

### From XPI Package

1. Download the latest `.xpi` file from [Releases](https://github.com/dend/whorl/releases)
2. In Thunderbird, go to `Tools` → `Add-ons and Themes`
3. Click the gear icon → `Install Add-on From File`
4. Select the downloaded `.xpi` file

### From Source (Development)

1. Clone or download this repository
2. Open Thunderbird
3. Go to `Tools` → `Add-ons and Themes`
4. Click the gear icon → `Debug Add-ons`
5. Click `Load Temporary Add-on`
6. Select the `manifest.json` file from this repository

## Usage

1. Open a new compose window or reply to an email
2. In the email body, type `@` followed by a name or email
3. A dropdown will appear with matching contacts
4. Use arrow keys or mouse to select a contact
5. Press Enter/Tab or click to insert the mention
6. The contact will be added to the To field if not already a recipient

## Settings

Access settings by right-clicking the extension in Add-ons Manager and selecting "Options", or via `Tools` → `Add-ons and Themes` → Whorl → Options.

### Available Settings

- **Trigger character**: The character that activates the dropdown (default: `@`)
- **Maximum results**: Number of contacts shown in dropdown (default: 10)
- **Auto-add to recipients**: Automatically add mentioned contacts to the To field
- **Contact sources**: Toggle searching address books, current recipients, and custom contacts
- **Custom contacts**: Add name/email pairs that appear in suggestions
- **Blocklist**: Patterns to exclude from suggestions (matches name or email)

## Backspace Behavior

When your cursor is immediately after a mention:
- First backspace: Removes the last word (e.g., "@John Smith" → "@John")
- Second backspace: Removes the entire mention

## File Structure

```
whorl/
├── manifest.json          # Extension manifest (Manifest V3)
├── background.js          # Contact API & recipient management
├── compose-script.js      # Autocomplete & mention logic
├── compose-styles.css     # Dropdown & mention styling
├── options.html           # Settings page
├── options.js             # Settings page logic
├── options.css            # Settings page styling
├── icon-48.png            # Extension icon (48x48)
├── icon-96.png            # Extension icon (96x96)
├── scripts/
│   ├── package.sh         # Linux/macOS packaging script
│   ├── package.ps1        # Windows packaging script
│   ├── release.sh         # Linux/macOS release script
│   └── release.ps1        # Windows release script
├── README.md              # This file
└── CLAUDE.md              # Development guidelines
```

## Permissions

This extension requires the following permissions:

- `compose`: Access to compose window details and recipient management
- `addressBooks`: Access to search contacts in address books
- `scripting`: Ability to inject scripts into compose windows
- `storage`: Persist extension settings

## Building

Package the extension as an XPI file:

```bash
# Linux/macOS
./scripts/package.sh

# Windows
.\scripts\package.ps1
```

The XPI file will be created in the `dist/` folder.

## Releasing

Releases are automated via GitHub Actions. Use the release script to create a new release:

```bash
# Linux/macOS
./scripts/release.sh 1.0.0

# Windows
.\scripts\release.ps1 1.0.0
```

The script will:
1. Validate the version format
2. Update `manifest.json` with the new version
3. Commit the change
4. Create and push the tag
5. Trigger GitHub Actions to build and publish the release

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

Created by [Den Delimarsky](https://den.dev)
