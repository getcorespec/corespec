# Changelog

## [0.0.4](https://github.com/getcorespec/corespec/compare/specguard-v0.0.3...specguard-v0.0.4) (2026-04-16)


### Features

* pre-push hook + specguard reporting improvements ([#22](https://github.com/getcorespec/corespec/issues/22)) ([37f68f9](https://github.com/getcorespec/corespec/commit/37f68f967a99bbe2636ac4c913a5ee18676fc13b))

## [0.0.3](https://github.com/getcorespec/corespec/compare/specguard-v0.0.2...specguard-v0.0.3) (2026-04-03)


### Features

* add bot package — GitHub App webhook server ([#11](https://github.com/getcorespec/corespec/issues/11)) ([e244a24](https://github.com/getcorespec/corespec/commit/e244a245fbc1c4191afa8f286857372747f61e28))
* add ignore patterns and remove @ai-sdk/provider from specguard ([#19](https://github.com/getcorespec/corespec/issues/19)) ([b782995](https://github.com/getcorespec/corespec/commit/b7829958666490cc15e0aa83778cda5bcd52c17c))
* add pre-commit hook support and local LLM endpoint config ([#14](https://github.com/getcorespec/corespec/issues/14)) ([dba2bf5](https://github.com/getcorespec/corespec/commit/dba2bf554588afe210c9da3e6055c7ffdd2c0145))
* implement respec generate command and simplify model config ([#7](https://github.com/getcorespec/corespec/issues/7)) ([b10e01b](https://github.com/getcorespec/corespec/commit/b10e01b8cdce86cd99b080eb9dbe570fb95c3c96))


### Bug Fixes

* clean error messages, narrow output width, update docs ([#16](https://github.com/getcorespec/corespec/issues/16)) ([224752b](https://github.com/getcorespec/corespec/commit/224752b943e494417a13df97f0522e97a83b39a4))

## [0.0.2](https://github.com/getcorespec/corespec/compare/specguard-v0.0.1...specguard-v0.0.2) (2026-03-02)


### Features

* add Makefile, dotenv support for both CLIs ([9e9cb41](https://github.com/getcorespec/corespec/commit/9e9cb41a905e6df50ade6a5aba0ba48a4751f681))
* scaffold respec and specguard packages ([ae1aaad](https://github.com/getcorespec/corespec/commit/ae1aaad639d3ac9fe1427831fde21b51670d8760))
* **specguard:** add config loading with precedence chain ([2f88aa9](https://github.com/getcorespec/corespec/commit/2f88aa952a43c2bc85c86122f41a5423c94fcc1e))
* **specguard:** add GitHub Action for PR spec coverage checks ([#2](https://github.com/getcorespec/corespec/issues/2)) ([d03ef8d](https://github.com/getcorespec/corespec/commit/d03ef8de4a77900de2d1f0a0ded05f42574a877a))
* **specguard:** add pipeline orchestration and output formatting ([1f9bd63](https://github.com/getcorespec/corespec/commit/1f9bd63b4ba1aa83fcf0b3019828d1afc919ed73))
* **specguard:** wire up check command with pipeline ([a633ecd](https://github.com/getcorespec/corespec/commit/a633ecd7cee505049e4c0235ffbe5f02aabc29b6))


### Bug Fixes

* **specguard:** remove pnpm version pin from action to avoid packageManager conflict ([e94fdf3](https://github.com/getcorespec/corespec/commit/e94fdf3481277bf0bfa9f4278a44bff9463cd4c3))
