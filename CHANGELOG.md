# Changelog

All notable changes to **api-echo** will be documented here.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

## [Unreleased]

## [1.0.0] - 2025-01-01
### Added
- Record mode: proxy and save HTTP requests/responses to disk
- Replay mode: serve saved responses from local fixtures
- Passthrough mode: proxy without recording
- File-based JSON storage for recordings
- CLI flags: `--mode`, `--target`, `--port`, `--dir`, `--delay`
- `--list` command to view all recordings
- `--clear` command to delete recordings
- Request matching by method + path
- Achievement tracker and roadmap scripts
- GitHub Actions CI workflow
- Devcontainer configuration for Codespaces
