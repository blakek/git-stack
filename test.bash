#!/usr/bin/env bash

##
# Basic flow test for `git stack`
##

set -euo pipefail

# Helpers
source "${DOTFILES_ROOT}/.bash_profile_extensions/00-bk.bash"

debug() {
	printf '%b%s%b\n' "$ansi_dim" "$1" "$ansi_reset"
}

error() {
	printf '%bError: %s%b\n' "$ansi_red" "$1" "$ansi_reset" >&2
}

test_step() {
	printf '%b%bTest: %s%b\n' "$ansi_bold" "$ansi_underline" "$1" "$ansi_reset"
}

panic() {
	error "$1"
	exit 1
}

resolve_rebase_conflicts() {
	git stack rebase
	
	while git rebase --show-current-patch >/dev/null 2>&1; do
		read -rp "Found conflicts. Please resolve them, then run \`git rebase --continue\` to proceed with the test. Press Enter to check again..."
	done
}

cleanup_commands=()

defer_cleanup() {
	local cmd
	for cmd in "${cleanup_commands[@]}"; do
		debug "Cleanup: $cmd"
		eval "$cmd"
	done
}

# Add cleanup steps
defer() {
	cleanup_commands+=("$*")

	if [[ "${#cleanup_commands[@]}" -gt 0 ]]; then
		trap defer_cleanup EXIT
	fi
}

main() {
	# Setup temporary repository
	local tmpDir
	tmpDir="$(mktemp -d "/tmp/git-stack-test.XXXXXX")"
	defer "rm -rf '$tmpDir'"
	
	debug "Created temporary directory $tmpDir"
	pushd "$tmpDir" >/dev/null || panic "Failed to enter $tmpDir"

	debug "Initializing git repository…"
	git init -b main >/dev/null 2>&1 || panic "Failed to initialize git repository"
	echo 'Starting content' >file.txt
	git add file.txt
	git commit -m "Initial commit" >/dev/null 2>&1 || panic "Failed to make initial commit"

	# Create a stack of branches
	test_step "Can create a stack of branches"

	debug "Creating branch stack…"
	git stack add feature-1
	# Ensure we're on the newly created branch or fail
	[[ "$(git symbolic-ref --short HEAD)" == "feature-1" ]] || panic "Not on feature-1 branch"
	echo 'Feature 1 content' >>file.txt
	git commit -am "Add feature 1" >/dev/null 2>&1 || panic "Failed to commit feature 1"

	git stack add feature-2
	echo 'Feature 2 content' >>file.txt
	git commit -am "Add feature 2" >/dev/null 2>&1 || panic "Failed to commit feature 2"

	# Check metadata was created and we can list
	test_step "Can list stack branches"
	git stack list

	# Check that rebase works
	debug 'Simulating upstream change…'
	git switch main --quiet
	echo 'main hotfix' >>file.txt
	git commit -am "Hotfix on main" >/dev/null 2>&1 || panic "Failed to commit hotfix on main"
	
	test_step "Can rebase stack branches"
	git switch feature-2 --quiet
	# Should prompt user to fix conflict
	resolve_rebase_conflicts
	resolve_rebase_conflicts

	debug "State after rebase:"
	git stack list

	debug "Graph after rebase:"
	git log --oneline --graph --all
}

main "$@"
