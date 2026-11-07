#!/bin/sh
# Runs the Posse/chat/points API tests against an in-memory fake Supabase. Usage: sh tests/run-posse-test.sh
mkdir -p tests/.out
for t in posse-api friendchat-api posse-points posse-compete; do
  timeout 120 npx --yes esbuild tests/$t.test.ts --bundle --platform=node --outfile=tests/.out/$t.cjs --alias:@supabase/supabase-js=./tests/fake-supabase.ts --external:esbuild --log-level=error && timeout 60 node tests/.out/$t.cjs
done
