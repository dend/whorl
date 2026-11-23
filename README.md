<div align="center">
	<br>
	<br>
	<img src="src/icon-96.png" alt="Whorl" height="96">
	<br>
	<br>
	<h1>Whorl</h1>
	<b>@-mention your contacts in Thunderbird.</b>
	<br>
	<br>
</div>

## Features

- Type `@` in the message body to get a list of matching contacts.
- Contacts come from your address books, the message's current recipients, and a list of custom contacts you keep in the settings.
- A blocklist keeps contacts out of the suggestions.
- The trigger character can be changed from `@` to something else.
- People you mention are added to the To field. If they're already in CC or BCC, they're moved to To.
- The dropdown and the settings page follow Thunderbird's light or dark theme.
- Arrow keys move through the list, Enter or Tab picks a contact, and Escape closes it.

## Requirements

- Thunderbird 128 or later
- HTML compose mode (mentions don't work when composing in plain text)

## Installation

### From a release

1. Download the latest `.xpi` file from [Releases](https://github.com/dend/whorl/releases).
2. In Thunderbird, open Add-ons and Themes from the Tools menu.
3. Click the gear icon and choose Install Add-on From File.
4. Select the `.xpi` file.

### From source

1. Clone this repository.
2. In Thunderbird, open Add-ons and Themes from the Tools menu.
3. Click the gear icon and choose Debug Add-ons.
4. Click Load Temporary Add-on and select `src/manifest.json`.

## Usage

1. Start a new message or a reply.
2. In the body, type `@` and the start of a name or email address.
3. Pick a contact with the arrow keys and Enter or Tab, or click it.

The mention links to the person's email address, and they're added to the To field if they aren't a recipient yet. If the message goes out as plain text, the mention is just `@Name`.

Backspace right after a mention removes the last word of the name first ("@John Smith" becomes "@John"), then the whole mention.

## Settings

To open the settings, find Whorl in Add-ons and Themes and click Options, or right-click it and choose Options.

- Trigger character (default `@`)
- Maximum number of contacts in the list (default 10)
- Whether mentioned contacts are added to the To field
- Which sources to search: address books, current recipients, custom contacts
- Custom contacts (name and email)
- Blocklist entries, matched against names and email addresses

## Files

- `src/` is the extension itself. `background.js` searches contacts and handles recipients, `compose-script.js` runs the dropdown and inserts mentions, `compose-styles.css` styles mentions, and `options.html`, `options.js` and `options.css` are the settings page.
- `scripts/` has `package.sh` and `package.ps1` to build the XPI, `release.sh` and `release.ps1` to tag a release, and `resize-icons.ps1` to make the 16 and 32 px icons from the 96 px one.
- `dist/` is where built XPI files go.

## Permissions

- `compose`: read and change the recipients of the message you're writing, and prepare it for sending
- `addressBooks`: search your address books
- `scripting`: add the autocomplete to compose windows
- `storage`: save your settings

## Building

```bash
# Linux/macOS
./scripts/package.sh

# Windows
.\scripts\package.ps1
```

The XPI goes in `dist/`.

## Releasing

GitHub Actions builds and publishes a release when a version tag is pushed. The release script does the tagging:

```bash
# Linux/macOS
./scripts/release.sh 1.0.0

# Windows
.\scripts\release.ps1 1.0.0
```

It checks the version format, sets the version in `src/manifest.json`, commits that change, and creates and pushes the tag.

## License

MIT

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

---

Created by [Den](https://den.dev)
