# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.2] - 2020-03-29
### Fixed
- Minified build no longer throws an error when shimming async methods

### Changed
- Moved to a Rollup build step

## [1.0.1] - 2020-01-23
### Added
- Use UNPKG as a CDN option
- Installation instructions
- Pass `cdnProviders` as an option to `get` to change where libraries are loaded from
- New `getAll` method allows for multiple packages to be retrieved at once
- Code to load WNPM via a bookmarklet
- Ability to rely on NPM CDNs (which often differ from GitHub repos) to load files

### Changed
- Use jsDelivr to serve GitHub files rather than GitCDN
- All methods are promise based in order to run code after an operation has completed

## [1.0.0] - 2018-05-20
### Added
- Initial GitHub based solution

[Unreleased]: https://github.com/andrewbridge/wnpm/compare/v1.0.2...HEAD
[1.0.2]: https://github.com/andrewbridge/wnpm/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/andrewbridge/wnpm/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/andrewbridge/wnpm/releases/tag/v1.0.0