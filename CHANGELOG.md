# Changelog

All notable changes to Whorl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.2 (January 20, 2026)

### Fixed

- Recipients without a display name (e.g., `den@example.com`) now correctly use the email as the display name

## 1.0.1 (January 20, 2026)

### Changed

- Recipients (To/CC/BCC) now appear first in the autocomplete dropdown, prioritized over address book and custom contacts

### Fixed

- Cursor now positions correctly after inserting a mention (previously appeared at far right of window)

## 1.0.0 (January 20, 2026)

### Added

- @-mention autocomplete in compose window
- Multiple contact sources: address books, current recipients, custom contacts
- Custom contacts management in settings
- Blocklist to exclude contacts from suggestions
- Configurable trigger character (default: @)
- Auto-add mentioned contacts to To field
- Smart recipient handling (moves from CC/BCC to To when mentioned)
- Theme-aware UI (light/dark mode support)
- Keyboard navigation (arrow keys, Enter/Tab, Escape)
- Maximum results setting
- Contact source toggles
