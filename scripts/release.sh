#!/bin/bash

# BrowserLoop Release Helper Script
# This script helps automate the release process

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
function print_header() {
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}       BrowserLoop Release Helper       ${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo
}

function print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

function print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

function print_error() {
    echo -e "${RED}❌ $1${NC}"
}

function print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

function check_git_status() {
    if [[ -n $(git status --porcelain) ]]; then
        print_error "Git working directory is not clean. Please commit or stash changes first."
        exit 1
    fi
    print_success "Git working directory is clean"
}

function check_branch() {
    current_branch=$(git branch --show-current)
    if [[ "$current_branch" != "main" ]]; then
        print_warning "You are on branch '$current_branch', not 'main'"
        read -p "Continue anyway? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_info "Exiting..."
            exit 1
        fi
    else
        print_success "On main branch"
    fi
}

function run_tests() {
    print_info "Running tests and validations..."

    if npm run validate:package; then
        print_success "All validations passed"
    else
        print_error "Validation failed. Please fix issues before releasing."
        exit 1
    fi
}

function show_current_version() {
    current_version=$(node -p "require('./package.json').version")
    print_info "Current version: $current_version"
}

function calculate_next_version() {
    current_version=$(node -p "require('./package.json').version")

    # Parse semantic version
    IFS='.' read -ra VERSION_PARTS <<< "$current_version"
    major=${VERSION_PARTS[0]}
    minor=${VERSION_PARTS[1]}
    patch=${VERSION_PARTS[2]}

    case $1 in
        "patch")
            echo "$major.$minor.$((patch + 1))"
            ;;
        "minor")
            echo "$major.$((minor + 1)).0"
            ;;
        "major")
            echo "$((major + 1)).0.0"
            ;;
        *)
            echo "Invalid version type"
            exit 1
            ;;
    esac
}

function perform_release() {
    local release_type=$1
    local next_version=$(calculate_next_version $release_type)

    print_info "Preparing $release_type release: $next_version"

    # Confirm with user
    read -p "Proceed with $release_type release to version $next_version? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_info "Release cancelled"
        exit 0
    fi

    # Create version and tags
    print_info "Creating version $next_version and pushing to GitHub..."
    npm run "version:$release_type"

    print_success "Version $next_version created and pushed!"
    print_info "Next steps:"
    echo "  1. Go to https://github.com/mattiasw/browserloop/releases"
    echo "  2. Create a new release from tag v$next_version"
    echo "  3. Add release notes and publish"
    echo "  4. GitHub Actions will automatically publish to npm"
}

function show_usage() {
    echo "Usage: $0 [patch|minor|major|check]"
    echo
    echo "Commands:"
    echo "  patch   - Create a patch release (bug fixes)"
    echo "  minor   - Create a minor release (new features)"
    echo "  major   - Create a major release (breaking changes)"
    echo "  check   - Check if everything is ready for release"
    echo
}

# Main script
print_header

if [[ $# -eq 0 ]]; then
    show_usage
    exit 1
fi

case $1 in
    "check")
        print_info "Checking release readiness..."
        check_git_status
        check_branch
        show_current_version
        run_tests
        print_success "Ready for release!"
        ;;
    "patch"|"minor"|"major")
        print_info "Preparing $1 release..."
        check_git_status
        check_branch
        show_current_version
        run_tests
        perform_release $1
        ;;
    *)
        show_usage
        exit 1
        ;;
esac
