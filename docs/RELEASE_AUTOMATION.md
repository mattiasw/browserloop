# Release Automation Guide

This guide covers the automated release process for BrowserLoop, including versioning, npm publishing, and CI/CD workflows.

## Overview

BrowserLoop uses automated CI/CD pipelines for:
- ✅ **Automated Testing**: Unit, integration, and E2E tests
- ✅ **Security Scanning**: npm audit and CodeQL analysis
- ✅ **Docker Building**: Multi-platform container images
- ✅ **npm Publishing**: Automatic publication to npm registry
- ✅ **GitHub Releases**: Release assets and changelog

## Release Types

### Semantic Versioning

BrowserLoop follows [Semantic Versioning](https://semver.org/) (semver):

| Type | When to Use | Example |
|------|-------------|---------|
| **Patch** | Bug fixes, security patches | 1.0.0 → 1.0.1 |
| **Minor** | New features, backwards compatible | 1.0.1 → 1.1.0 |
| **Major** | Breaking changes | 1.1.0 → 2.0.0 |

## Automated Release Process

### Prerequisites

1. **NPM_TOKEN Secret**: GitHub repository must have `NPM_TOKEN` secret configured
2. **Repository Access**: Maintainer access to create releases
3. **All Tests Pass**: CI/CD pipeline must be green

### Step 1: Version Bump and Tag Creation

Use the automated versioning scripts:

```bash
# For bug fixes and security patches
npm run version:patch

# For new features (backwards compatible)
npm run version:minor

# For breaking changes
npm run version:major
```

These scripts will:
- Bump the version in `package.json`
- Create a git tag
- Push changes and tags to GitHub

### Step 2: Create GitHub Release

1. Go to [GitHub Releases](https://github.com/mattiasw/browserloop/releases)
2. Click "Create a new release"
3. Select the tag created in Step 1
4. Add release title and description
5. Click "Publish release"

### Step 3: Automated CI/CD Pipeline

Once a GitHub release is published, the CI/CD pipeline automatically:

1. **Runs Full Test Suite**
   - Unit tests on Node.js 20, 22, 23
   - Integration tests
   - E2E tests
   - Docker integration tests

2. **Security Validation**
   - npm audit
   - CodeQL analysis
   - Package security validation

3. **Build and Publish**
   - Builds TypeScript to dist/
   - Validates package integrity
   - Publishes to npm registry
   - Verifies publication works
   - Creates release assets

4. **Docker Build**
   - Multi-platform Docker images (linux/amd64, linux/arm64)
   - Uploads as GitHub release assets

## Manual Release (Emergency)

For emergency releases or when automation fails:

```bash
# 1. Ensure everything is ready
npm run validate:package

# 2. Version bump (if not already done)
npm version patch  # or minor/major

# 3. Push to GitHub
git push && git push --tags

# 4. Publish to npm
npm publish

# 5. Create GitHub release manually
```

## Repository Secrets Configuration

### Required Secrets

The repository needs these GitHub Secrets configured:

| Secret | Description | How to Get |
|--------|-------------|------------|
| `NPM_TOKEN` | npm authentication token | [Create at npmjs.com](https://www.npmjs.com/settings/tokens) |
| `GITHUB_TOKEN` | Automatic GitHub token | Automatically provided |

### Setting up NPM_TOKEN

1. Go to [npmjs.com](https://www.npmjs.com) and login
2. Go to Access Tokens in your account settings
3. Create a new **Automation** token
4. Copy the token
5. In GitHub repository settings → Secrets and variables → Actions
6. Create new secret named `NPM_TOKEN` with the token value

## Verification Steps

After each release, verify:

1. **npm Registry**: Package is available at [npmjs.com/package/browserloop](https://www.npmjs.com/package/browserloop)
2. **npx Works**: `npx -y browserloop@latest --version` returns correct version
3. **GitHub Release**: Release assets are attached
4. **Docker Images**: Available in GitHub Container Registry

## Troubleshooting

### Common Issues

#### "npm publish failed: 403 Forbidden"
- **Cause**: NPM_TOKEN is invalid or missing
- **Fix**: Update NPM_TOKEN secret in repository settings

#### "Version already exists"
- **Cause**: Trying to publish same version twice
- **Fix**: Bump version number before publishing

#### "Tests failing in CI"
- **Cause**: Code changes broke existing functionality
- **Fix**: Fix failing tests before creating release

#### "Docker build timeout"
- **Cause**: Complex build taking too long
- **Fix**: Optimize Dockerfile or increase GitHub Actions timeout

### Recovery Procedures

#### Failed npm Publish
```bash
# 1. Fix the issue
# 2. Bump version (npm won't allow republishing same version)
npm version patch

# 3. Push new version
git push && git push --tags

# 4. Create new GitHub release with new tag
```

#### Rollback Release
```bash
# Deprecate bad version (doesn't delete it)
npm deprecate browserloop@1.2.3 "This version has issues, please upgrade"

# Publish fixed version
npm version patch
git push && git push --tags
# Create new GitHub release
```

## Release Checklist

### Pre-Release
- [ ] All tests passing
- [ ] Documentation updated
- [ ] Version follows semver conventions
- [ ] Breaking changes documented
- [ ] Security audit clean

### Post-Release
- [ ] npm package accessible
- [ ] npx installation works
- [ ] GitHub release created
- [ ] Docker images built
- [ ] Documentation reflects new version

## Release Frequency

- **Patch releases**: As needed for bug fixes and security patches
- **Minor releases**: Monthly or when significant features are ready
- **Major releases**: Quarterly or when breaking changes are necessary

## Communication

Release announcements should include:
- Version number and type (patch/minor/major)
- Key changes and new features
- Breaking changes (for major releases)
- Migration guide (if needed)
- Security fixes (if applicable)

---

For questions about the release process, please open an issue or contact the maintainers.
