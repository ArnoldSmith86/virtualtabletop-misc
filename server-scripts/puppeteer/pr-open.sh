#!/bin/bash

# Fetch the current PR description
current_body=$(curl -H "Authorization: Bearer $1" \
  https://api.github.com/repos/ArnoldSmith86/virtualtabletop/pulls/$2 \
  | sed -n 's/.*"body": "\(.*\)",/\1/p')

# Concatenate the new text to the current body
new_body="$current_body\n\n---\n\nPR-SERVER-BOT: You can play around with it here: https://test.virtualtabletop.io/PR-$2/pr-test (or any other room on that server)"

# Update the PR description with the new concatenated body
curl -X PATCH -H "Authorization: Bearer $1" \
  -H "Content-Type: application/json" \
  -d "{\"body\":\"$new_body\"}" \
  https://api.github.com/repos/ArnoldSmith86/virtualtabletop/pulls/$2

exit 0

# old comment approach
curl -H "Authorization: Bearer $1" \
  https://api.github.com/repos/ArnoldSmith86/virtualtabletop/issues/$2/comments \
  -d "{\"body\":\"PR-SERVER-BOT: You can play around with it here: https://test.virtualtabletop.io/PR-$2/pr-test (or any other room on that server)\"}"
