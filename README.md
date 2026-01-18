# Thunderbird @Mention

A Thunderbird extension that enables @-mentioning contacts in the email compose window with autocomplete support.

## Features

- **@-mention autocomplete**: Type `@` in the compose window to trigger a dropdown with matching contacts
- **Multiple contact sources**: Searches both current recipients (To/CC/BCC) and your address book
- **Auto-add to recipients**: Mentioned contacts are automatically added to the To field
- **Smart recipient handling**: If a contact is in CC/BCC, they're moved to To when mentioned
- **Theme-aware**: Dropdown automatically adapts to light and dark themes
- **Keyboard navigation**: Use arrow keys to navigate, Enter/Tab to select, Escape to close

## Requirements

- Thunderbird 128 or later (Manifest V3)
- HTML compose mode (plain text mode not supported)

## Installation

### From Source (Development)

1. Clone or download this repository
2. Open Thunderbird
3. Go to `Tools` → `Add-ons and Themes`
4. Click the gear icon → `Debug Add-ons`
5. Click `Load Temporary Add-on`
6. Select the `manifest.json` file from this repository

### From XPI Package

1. Run the packaging script:
   - **Linux/macOS**: `./scripts/package.sh`
   - **Windows**: `.\scripts\package.ps1`
2. The XPI file will be created in the `dist/` folder
3. In Thunderbird, go to `Tools` → `Add-ons and Themes`
4. Click the gear icon → `Install Add-on From File`
5. Select the `.xpi` file from the `dist/` folder

## Usage

1. Open a new compose window or reply to an email
2. In the email body, type `@` followed by a name or email
3. A dropdown will appear with matching contacts
4. Use arrow keys or mouse to select a contact
5. Press Enter/Tab or click to insert the mention
6. The contact will be added to the To field if not already a recipient

## Backspace Behavior

When your cursor is immediately after a mention:
- First backspace: Removes the last word (e.g., "@John Smith" → "@John")
- Second backspace: Removes the entire mention

## File Structure

```
thunderbird-at-mention/
├── manifest.json              # Extension manifest (Manifest V3)
├── background/
│   └── background.js          # Contact API & recipient management
├── compose/
│   ├── compose-script.js      # Autocomplete & mention logic
│   └── compose-styles.css     # Dropdown & mention styling
├── icons/
│   ├── icon-48.png
│   └── icon-96.png
├── scripts/
│   ├── package.sh             # Linux/macOS packaging script
│   └── package.ps1            # Windows packaging script
└── docs/
    └── design.md              # Technical design documentation
```

## Permissions

This extension requires the following permissions:

- `compose`: Access to compose window details and recipient management
- `addressBooks`: Access to search contacts in address books
- `scripting`: Ability to inject scripts into compose windows

## License

MIT License

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
