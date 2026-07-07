#!/usr/bin/env bash
# Verify a deployed BrewMint static site.
#
# Usage: check.sh <base-url>
#   e.g. check.sh https://republicroofingco.com
#        check.sh https://republic-roofing.pages.dev
#        check.sh http://localhost:8000
#
# Curls the standard set of files every BrewMint client site ships
# (client-onboard's template scaffolds all of them) plus the homepage, and
# does a dry, non-destructive check of the contact-form endpoint. Prints a
# pass/fail table and exits non-zero if any required check failed.

set -uo pipefail

if [ "$#" -ne 1 ]; then
  echo "usage: check.sh <base-url>" >&2
  exit 1
fi

BASE_URL="${1%/}"
FAILURES=0

# name|path
CHECKS=(
  "Homepage|/"
  "sitemap.xml|/sitemap.xml"
  "robots.txt|/robots.txt"
  "llms.txt|/llms.txt"
  "site.webmanifest|/site.webmanifest"
  "favicon.ico|/favicon.ico"
)

printf "%-20s %-8s %-8s %s\n" "CHECK" "STATUS" "RESULT" "URL"
printf -- '-%.0s' $(seq 1 72); echo

for entry in "${CHECKS[@]}"; do
  name="${entry%%|*}"
  path="${entry#*|}"
  url="$BASE_URL$path"
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$url")"
  if [ "$code" = "200" ]; then
    result="PASS"
  else
    result="FAIL"
    FAILURES=$((FAILURES + 1))
  fi
  printf "%-20s %-8s %-8s %s\n" "$name" "$code" "$result" "$url"
done

# Contact-form dry check: POST an intentionally invalid body and confirm the
# Worker rejects it (400) rather than not responding at all. This never
# sends a real submission or email -- the Worker's own field validation
# fails on `{}` before it ever calls SEND_EMAIL.send().
contact_url="$BASE_URL/api/contact"
contact_code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST -H 'Content-Type: application/json' -d '{}' "$contact_url")"
case "$contact_code" in
  400|405)
    contact_result="PASS (endpoint live, rejected dry payload as expected)"
    ;;
  404)
    contact_result="SKIP (no /api/contact -- fine if this client has no contact-form Worker)"
    ;;
  000)
    contact_result="FAIL (no response -- Worker route may not be bound)"
    FAILURES=$((FAILURES + 1))
    ;;
  *)
    contact_result="WARN (unexpected status $contact_code -- check manually)"
    ;;
esac
printf "%-20s %-8s %s\n" "contact form" "$contact_code" "$contact_result"
echo "(dry POST only -- {} is invalid input by design; no real submission or email was sent)"

echo
if [ "$FAILURES" -gt 0 ]; then
  echo "$FAILURES required check(s) failed."
  exit 1
else
  echo "All required checks passed."
  exit 0
fi
