#!/bin/bash
# Test bulk-replace API on new Vercel deployment

PREVIEW_URL="https://tinyutils-otyrymik4-cavins-projects-7b0e00bb.vercel.app"

echo "Testing bulk-replace API at $PREVIEW_URL/api/bulk-replace"

# Create a temporary ZIP file with a test text file
TEST_DIR=$(mktemp -d)
cd "$TEST_DIR"

# Create test file
echo "hello world
hello again
goodbye world" > test.txt

# Create ZIP
zip -q test.zip test.txt

# Test the API
echo -e "\n1️⃣ Testing POST to /api/bulk-replace (preview mode)..."
curl -X POST "$PREVIEW_URL/api/bulk-replace" \
  -F "file=@test.zip" \
  -F "mode=simple" \
  -F "find=hello" \
  -F "replace=hi" \
  -F "action=preview" \
  -F "case_sensitive=false" \
  -w "\nHTTP Status: %{http_code}\n" \
  -o /tmp/bulk_replace_result.json

echo -e "\nResponse saved to /tmp/bulk_replace_result.json"
cat /tmp/bulk_replace_result.json | jq '.' || cat /tmp/bulk_replace_result.json

# Cleanup
rm -rf "$TEST_DIR"

echo -e "\n✅ Test complete!"
