#!/bin/sh
# Runs the Posse API scenario tests against an in-memory fake Supabase. Usage: sh tests/run-posse-test.sh
for t in posse-api friendchat-api; do npx --yes esbuild tests/$t.test.ts --bundle --platform=node --outfile=/tmp/$t.test.js --alias:@supabase/supabase-js=./tests/fake-supabase.ts --log-level=error && node /tmp/$t.test.js; done
