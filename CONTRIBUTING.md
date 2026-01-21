# Contributing to Whorl

Thank you for your interest in contributing to Whorl! This guide will help you get started with development and explain how to submit your contributions.

## Understanding the Project

Whorl is a Thunderbird extension built using the WebExtension API (Manifest V3). Before diving into the code, it helps to understand how Thunderbird extensions work.

### Recommended Reading

If you're new to Thunderbird extension development, these resources will help you get up to speed:

- [Thunderbird WebExtension API Documentation](https://webextension-api.thunderbird.net/en/stable/) - The official API reference for Thunderbird extensions
- [Thunderbird Extension Development Guide](https://developer.thunderbird.net/add-ons/mailextensions) - Getting started with MailExtensions
- [Manifest V3 Changes](https://webextension-api.thunderbird.net/en/stable/changes/128.html) - Important changes in Thunderbird 128+
- [Compose Scripts](https://webextension-api.thunderbird.net/en/stable/scripting.compose.html) - How compose scripts work (used heavily in this extension)

### Project Architecture

Whorl consists of three main parts:

1. **Background Script** (`background.js`) - Runs persistently and handles contact lookups, settings management, and recipient manipulation via the Thunderbird APIs.

2. **Compose Script** (`compose-script.js`) - Injected into email compose windows. Handles the autocomplete UI, keyboard events, and mention insertion.

3. **Options Page** (`options.html`, `options.js`, `options.css`) - The settings interface where users configure the extension.

Understanding how these pieces communicate is important. The compose script sends messages to the background script to fetch contacts and trigger recipient updates. Settings are stored via `browser.storage.local` and synchronized across all components.

## Setting Up Your Development Environment

### Prerequisites

You'll need:
- **Thunderbird 128 or later** - The extension uses Manifest V3 features that require this version
- **Git** - For cloning and version control
- **A text editor** - Any editor works, but one with JavaScript support is helpful
- **PowerShell (Windows) or Bash (macOS/Linux)** - For running the build scripts

### Getting the Code

Start by forking the repository on GitHub, then clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/whorl.git
cd whorl
```

### Building the Extension

Before you can install the extension in Thunderbird, you need to package it as an XPI file. The repository includes scripts to do this:

**On Windows:**
```powershell
.\scripts\package.ps1
```

**On macOS/Linux:**
```bash
./scripts/package.sh
```

This creates a `whorl.xpi` file in the `dist/` directory.

### Installing in Thunderbird

There are two ways to load the extension for development:

**Option 1: Load Temporarily (Recommended for Development)**

This method is quick but requires reloading after each Thunderbird restart:

1. Open Thunderbird
2. Go to `Tools` → `Add-ons and Themes`
3. Click the gear icon → `Debug Add-ons`
4. Click `Load Temporary Add-on`
5. Navigate to your project folder and select `manifest.json`

**Option 2: Install from XPI**

This persists across restarts but requires rebuilding the XPI after changes:

1. Build the XPI using the package script
2. Go to `Tools` → `Add-ons and Themes`
3. Click the gear icon → `Install Add-on From File`
4. Select `dist/whorl.xpi`

### Development Workflow

When making changes:

1. Edit the source files
2. For **background.js** or **options** changes: Click "Reload" in the Debug Add-ons page
3. For **compose script** changes: Open a new compose window (existing windows won't update)
4. Check the browser console for errors (`Tools` → `Developer Tools` → `Error Console`)

## Making Changes

### Testing Your Changes

Before submitting, verify your changes work correctly:

- **Theme support**: Test in both light and dark Thunderbird themes
- **Settings persistence**: Change settings, restart Thunderbird, confirm they persist
- **Edge cases**: Test with empty address books, no recipients, special characters in names
- **Keyboard navigation**: Ensure arrow keys, Enter, Tab, and Escape work in the dropdown
- **Error handling**: Check the console for errors or warnings

### UI Changes

If you're modifying the options page or dropdown styling, refer to the design guidelines in `CLAUDE.md`. The extension follows Thunderbird's native UI patterns for consistency.

## Submitting Your Contribution

### Creating a Pull Request

1. Create a new branch for your changes:
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. Make your changes and commit them with clear, descriptive messages

3. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

4. Open a pull request against the main repository

### Pull Request Description

Your PR description should include:

- **What** the change does
- **Why** it's needed (link to an issue if applicable)
- **How** you tested it
- Screenshots for any UI changes
- Any breaking changes or migration notes

### AI Disclosure Requirement

**If you used AI tools to help write code or documentation in your contribution, you must disclose this in your pull request description.**

This includes tools like GitHub Copilot, ChatGPT, Claude, Cursor, or similar AI assistants. Please specify:

- Which AI tool(s) you used
- What portions of the contribution were AI-assisted

This requirement exists for transparency and helps maintainers understand the origin and context of contributions. There's no penalty for using AI tools - I just ask that you're upfront about it.

## Reporting Issues

Found a bug or have a feature idea? Open an issue on GitHub.

For bug reports, include:

- Your Thunderbird version (Help → About Thunderbird)
- Your operating system
- Steps to reproduce the problem
- What you expected to happen vs. what actually happened
- Any error messages from the console

For feature requests, describe the use case and why it would be valuable. Be open to discussion about whether and how to implement it.

## Getting Help

If you're stuck or have questions about contributing:

- Check existing issues and pull requests for similar discussions
- Open a new issue with your question
- Review the Thunderbird documentation linked above

## Code of Conduct

I'm committed to providing a welcoming environment for all contributors. Please:

- Be respectful and constructive in discussions
- Welcome newcomers and help them get started
- Focus on technical merits when reviewing contributions
- Assume good intentions

Thank you for contributing to Whorl!
