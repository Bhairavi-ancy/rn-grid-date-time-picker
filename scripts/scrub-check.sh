#!/usr/bin/env bash
# Fails when a tracked (or new, not ignored) file contains an internal reference:
# a name, path or ticket key from the code this package was extracted from, a
# design-tool link, a "same as web" remark, or a decision / bug ID such as "R8".
#
# Terms that name the original owner are not written down here. Put them, one
# extended regex per line, in the untracked file .git/info/scrub-patterns, or
# pass them (separated by newlines or "|") in $SCRUB_PATTERNS (a CI secret).
# Without them only the generic checks below run, and the script says so.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

# P1, case-insensitive: generic terms from the original code and its tooling.
P1="figma|jira|bottomSheet|InfoField|DropDownContext|_common/|_components/|same as web|as web|web's|old picker"

# Private terms, added to P1.
extra=""
if [[ -f .git/info/scrub-patterns ]]; then
  extra="$(grep -vE '^\s*(#|$)' .git/info/scrub-patterns | paste -sd '|' - || true)"
fi
if [[ -n "${SCRUB_PATTERNS:-}" ]]; then
  env_terms="$(printf '%s\n' "$SCRUB_PATTERNS" | grep -vE '^\s*$' | paste -sd '|' -)"
  extra="${extra:+$extra|}$env_terms"
fi
if [[ -n "$extra" ]]; then
  P1="$P1|$extra"
else
  echo "scrub-check: no private terms (.git/info/scrub-patterns or \$SCRUB_PATTERNS); running the generic checks only." >&2
fi

# P2, case-sensitive: decision and bug IDs such as R8, D7, N10 or EQ. Explicit
# character classes instead of \b, so macOS and GNU grep agree; the '#' keeps
# hex colours such as #D1D5DB out.
P2='(^|[^A-Za-z0-9_#])(R|D|N|G|S|V|C|A|H)[0-9]{1,2}([^A-Za-z0-9_]|$)|(^|[^A-Za-z0-9_])EQ([^A-Za-z0-9_]|$)'

# Allowlist: paths that are never scanned, each with the reason.
skip_path() {
  case "$1" in
    # This script: it has to spell out the patterns it looks for.
    scripts/scrub-check.sh) return 0 ;;
    # The vendored Yarn release (third-party, minified).
    .yarn/releases/*) return 0 ;;
    # Lockfile: package names and integrity hashes only.
    yarn.lock) return 0 ;;
  esac
  return 1
}

files=()
while IFS= read -r f; do
  [[ -f "$f" ]] || continue
  skip_path "$f" && continue
  files+=("$f")
done < <(git ls-files -co --exclude-standard)

status=0
if ((${#files[@]})); then
  if grep -nIiE "$P1" -- "${files[@]}"; then
    echo "scrub-check: internal names or references found (above)." >&2
    status=1
  fi
  if grep -nIE "$P2" -- "${files[@]}"; then
    echo "scrub-check: decision or bug IDs found (above)." >&2
    status=1
  fi
fi

if ((status == 0)); then
  echo "scrub-check: ${#files[@]} files, 0 hits."
fi
exit "$status"
