# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - 2026-01-30

### Added
- **Web Dashboard Command**: New `dashboard` command that generates a standalone, modern HTML report powered by Tailwind CSS.
- **Configuration File Support**: Added support for `xlf-sync.json` and `xlf-sync.config.json` to manage project settings and command defaults locally.
- **Dynamic Versioning**: The CLI now correctly extracts and displays the version from `package.json`.

---

## [1.1.0] - 2026-01-30

### Added
- **Comprehensive Test Suite**: Increased test coverage to ~78%. Added unit and integration tests for all core logic and CLI commands.
- **Improved CI-Friendliness**: Refactored `check` and `report` commands to be more predictable and testable.
- **XLIFF 2.0 Support Enhancements**: Improved roundtrip stability for XLIFF 2.0 files.

### Fixed
- **Windows Path Handling**: Fixed a critical bug where glob patterns would fail on Windows due to backslash directory separators.
- **Translation Detection**: Standardized "untranslated" logic across all commands. Now correctly identifies `TODO` values as pending translations.
- **Graveyard Serialization**: Fixed an issue where graveyard files were not correctly marking entries as `obsolete`.
- **UI Bug**: Fixed `ui.warn` to correctly use `console.warn` for semantic consistency.

### Changed
- **Refactored Architecture**: Decoupled CLI action handlers from core logic to allow for better testability and potential library usage.

---

## [1.0.3] - 2026-01-29
- Initial stable release with XLIFF 1.2 and 2.0 support.
