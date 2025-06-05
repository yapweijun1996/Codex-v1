#!/bin/bash
set -e

# Test that login.cfm exists
if [ ! -f login.cfm ]; then
  echo "login.cfm missing"; exit 1; fi

# Test that index.cfm checks for session
grep -q "session.loggedIn" index.cfm

# Test that caching code is present
grep -q "queryCache" runQuery.cfm

echo "All tests passed."
