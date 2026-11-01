#!/bin/sh
# Runs the Posse API scenario tests against an in-memory fake Supabase. Usage: sh tests/run-posse-test.sh
npx --yes esbuild tests/posse-api.test.ts --bundle --platform=node --outfile=/tmp/posse-api.test.js --alias:@supabase/supabase-js=./tests/fake-supabase.ts --log-level=error && node /tmp/posse-api.test.js
