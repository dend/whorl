# Changelog

Notable changes to Whorl, newest first.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.11 (November 22, 2026)

### Fixed

- Mentions are `mailto:` links again in HTML messages. In plain-text messages they still read as just `@Name`.

## 1.0.10 (November 22, 2026)

### Fixed

- In plain-text messages, mentions were followed by `<mailto:...>` and an invisible zero-width space.
- Deleting a mention with Backspace could lose the space before it, so typing `@` straight after didn't open the dropdown.
- Deleting a mention with text right after it left an invisible character behind.

### Added

- Deleting a mention with Backspace can be undone.

### Changed

- The autocomplete dropdown renders in a shadow root and is closed before a message is sent.
- Mentions are plain `@Name` text instead of `mailto:` links. (Reverted in 1.0.11.)

## 1.0.9 (November 22, 2026)

### Fixed

- The autocomplete dropdown stayed in the message body after it closed. It's now removed when it closes, and copies left by older versions are removed from drafts, replies and forwards.

## 1.0.8 (January 30, 2026)

### Fixed

- The background script could set itself up twice when a message woke it. It now records in session storage that setup has run.
- Added an empty `onStartup` listener so the background script runs when Thunderbird starts.

### Changed

- Script registration no longer retries or unregisters first.
- Removed the `onInstalled` listener. Setup runs at the top level of the background script.

## 1.0.7 (January 29, 2026)

### Fixed

- The compose script didn't load when Thunderbird started. Added `onInstalled` and `onStartup` handlers, with retries.
- Custom contacts and blocklist entries weren't saved. They're now saved as soon as they're added or removed.

### Added

- 16 and 32 px icons for tabs and toolbars.
- Favicon links on the options page.

### Changed

- Script registration retries up to 3 times, 500 ms apart.
- Existing scripts are unregistered before they're registered again.
