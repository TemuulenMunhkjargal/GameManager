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
npm test
npm run test:coverage
npm run lint
npm run typecheck
npm run build
```

## Build the Windows installer

```powershell
npm run desktop:build
```

The build starts from clean generated directories, rejects a nested installer, copies the current
Node.js runtime and native SQLite binary, and writes the versioned installer to `release/`.
Generated output and dependencies are intentionally excluded from Git; public installers belong in
GitHub Releases.

## Release

The Windows release workflow can be run manually or triggered by pushing a tag beginning with `v`.
The tag must match the versions in both package manifests. CI installs from the lockfile, runs tests,
coverage, lint, type checking, and the installer build, then publishes a stable asset named
`GameHall-Setup.exe`. Published releases are treated as immutable; bump the version for another release.
