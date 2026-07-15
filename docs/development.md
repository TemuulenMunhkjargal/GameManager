# GameHall development guide

This guide is for contributors. End users should install GameHall from the public download link in the main README and do not need any of these tools.

## Requirements

- Node.js 22 LTS
- npm
- Windows for producing the Windows installer

## Local development

```powershell
npm install
npm run desktop:dev
```

The desktop development command starts the local application runtime and opens GameHall automatically.

## Verification

```powershell
npm run test:coverage
npm run lint
npm run typecheck
```

## Build the Windows installer

```powershell
npm run desktop:build
```

The versioned installer is written to `release/`. Installer output and dependencies are intentionally excluded from Git; public installers belong in GitHub Releases.

## Release

The Windows release workflow can be run manually from GitHub Actions or triggered by pushing a tag beginning with `v`. It builds and publishes a stable release asset named `GameHall-Setup.exe` so the README download link does not change between versions.
