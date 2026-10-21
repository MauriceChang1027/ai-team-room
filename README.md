# 圓桌 · AI Team Room

A local AI team chat powered by Codex with ChatGPT subscription sign-in. Five roles take turns, pass their work along, and deliver a consolidated answer.

**No API key required. Model responses use your existing Codex subscription allowance. This is not unlimited free AI.**

[繁體中文說明](README.zh-Hant.md) · [完整操作指南](使用說明.md)

## What it does

- Researcher → Planner → Executor → Reviewer → Manager, with one real Codex session per role.
- Full-team discussion or a follow-up to a selected member.
- Stop a running discussion, keep local conversation history, and export Markdown.
- Traditional Chinese interface, responsive layout, and no third-party runtime dependencies.

This is a local prototype. The roles use the same Codex service and subscription; they are not separate model vendors or subscriptions. The executor produces text, analysis, drafts, and code content. It does not publish content or operate other applications.

## Requirements

- Node.js 20 or later.
- A current official Codex CLI supporting `--ignore-user-config`, available on PATH or through the Codex desktop installation.
- Codex signed in with your ChatGPT account: `codex login`.
- Internet access and remaining Codex usage allowance.

Windows is the tested platform. The server includes macOS/Linux process support, but those platforms have not been manually verified. The .cmd and PowerShell launchers are for Windows. Account eligibility and limits follow OpenAI's current terms and availability.

## Start

On Windows, double-click **Start.cmd**. The launcher finds Node.js on PATH or in the Codex bundled runtime and opens:

`http://127.0.0.1:4318`

Use **Stop.cmd** to stop the background service. The conversation remains in `data/history.json`.

Alternatively, from a terminal:

```sh
node server.mjs
```

Open the local address and enter a task. Choose the full team or one member. Keep the computer and local service running while agents work.

No `npm install` step is needed. An optional `CODEX_BIN` environment variable can point to a trusted native Codex executable. `PORT` can change the server port when running manually; the Windows launchers use 4318.

## Privacy and execution boundaries

- Listens on 127.0.0.1 only, with Host/Origin checks and a per-start session token for mutations. It is not designed for public hosting or multi-user remote access.
- Uses official CLI authentication; the app does not read or copy your authentication file. Forces ChatGPT sign-in and removes API-key environment variables from child processes.
- Ignores custom Codex user configuration, uses a read-only sandbox, disables the shell tool, and asks roles to limit work to web research and text output. These controls are not a general security audit or a guarantee against every model/tool behavior.
- Stores history unencrypted on your computer. Prompts and relevant conversation context are sent to OpenAI for model processing. Do not enter passwords or secrets.
- One team run contains five sequential model calls; long history is truncated and each role has a five-minute timeout. Errors stop the round; no mock replies are inserted.
- This repository excludes local history, logs, credentials, and account-specific settings.

## Development checks

```sh
npm run check
npm test
```

Tests use a temporary copy and an intentionally missing CLI path. They verify HTTP boundaries, failure handling, and static routes without making model calls or consuming subscription allowance. A real five-role discussion, cancellation, export, and restart persistence were manually checked on Windows during initial development.

## Official references

- [Codex non-interactive mode](https://learn.chatgpt.com/docs/non-interactive-mode)
- [Authentication and subscription versus API access](https://learn.chatgpt.com/docs/auth)
- [Plans and usage](https://learn.chatgpt.com/docs/pricing)

This project is independent and is not an official OpenAI product.

## Copyright

Copyright © 2026 MauriceChang1027. All rights reserved. Source is publicly viewable; no open-source license is granted. See [LICENSE](LICENSE).
