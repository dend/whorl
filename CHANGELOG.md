# Changelog

All notable changes to Whorl will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.8 (January 30, 2026)

### Fixed

- MV3 event page lifecycle handling - use session storage to prevent duplicate initialization when background script wakes from messages
- Empty `onStartup` listener to ensure background script runs on Thunderbird startup

### Changed

- Simplified script registration by removing unnecessary retry and unregister logic
- Removed `onInstalled` listener in favor of top-level initialization

## 1.0.7 (January 29, 2026)

### Fixed

- Compose script not loading on Thunderbird launch - added proper lifecycle event handlers (`onInstalled`, `onStartup`) with retry logic
- Custom contacts and blocklist entries not persisting - now auto-saved immediately when added/removed

### Added

- 16px and 32px icon sizes for better UI display in tabs and toolbars
- Favicon links in options page for tab icon display

### Changed

- Script registration now uses retry logic (3 attempts, 500ms delay) to handle timing issues
- Unregisters existing scripts before re-registering to avoid conflicts
