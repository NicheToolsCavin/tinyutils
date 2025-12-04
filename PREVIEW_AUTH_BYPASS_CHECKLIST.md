# Phase 6: Preview Auth/Bypass Checklist for tiny-reactive

## Pre-Execution Checklist

### Environment Setup
- [ ] `PREVIEW_URL` is set to the target preview deployment
- [ ] `TINY_REACTIVE_BASE_URL` is set to the running tiny-reactive server
- [ ] `TINY_REACTIVE_TOKEN` is set to the valid API token
- [ ] `VERCEL_AUTOMATION_BYPASS_SECRET` or `PREVIEW_BYPASS_TOKEN` is set for preview access
- [ ] `PREVIEW_SECRET` is set if required by the preview

### Preview Access Verification
- [ ] Preview URL is accessible without bypass (to establish baseline)
- [ ] Bypass token works with preview (test with a simple curl request)
- [ ] Headers format is correct:
  - `x-vercel-protection-bypass: <token>`
  - `x-vercel-set-bypass-cookie: true`
  - Cookie header includes bypass token if needed

### Test Artifacts Location
- [ ] Verify artifact directory path (default: `artifacts/ui/converter/<date>` or `artifacts/ui/bulk-find-replace/<date>`)
- [ ] Ensure directory permissions allow writing
- [ ] Check available disk space for screenshots and JSON output

## Execution Checklist

### Converter Tests
- [ ] Run converter-color-alignment-tiny-reactive-harness.mjs
- [ ] Run converter-page-break-tiny-reactive-harness.mjs
- [ ] Verify JSON summary files are created
- [ ] Verify screenshot files are created
- [ ] Confirm all marker tests pass

### Bulk Find & Replace Tests
- [ ] Run bulk-replace-tiny-reactive-harness.mjs
- [ ] Run bulk-replace-api-smoke.mjs
- [ ] Verify JSON summary files are created
- [ ] Check that API endpoint responds appropriately

### Auth/Bypass Validation
- [ ] Confirm bypass headers are properly applied to all requests
- [ ] Verify cookies are set correctly across redirects  
- [ ] Test that without bypass tokens, access is restricted as expected

## Post-Execution Checklist

### Results Validation
- [ ] All JSON summary files have `"ok": true`
- [ ] Screenshots are properly captured and viewable
- [ ] Error logs are reviewed if any tests failed
- [ ] Performance metrics (processing time) are within expected ranges

### Security Validation
- [ ] No sensitive tokens are leaked in output logs
- [ ] API responses don't contain internal system information
- [ ] Bypass mechanism works as intended (no unintended access)

### Clean-up
- [ ] Close all running tiny-reactive sessions properly
- [ ] Verify no orphaned processes remain
- [ ] Archive test results if needed for later analysis

## Troubleshooting Notes

### Common Issues
- **Bypass token rejected**: Verify token format and validity period
- **Element not found**: Check for dynamic loading issues or selector changes
- **File upload failures**: Note that file upload testing may be limited in tiny-reactive
- **Timeout errors**: Increase timeout values if testing complex documents

### Fallback Procedures
- If UI tests fail, try simpler document content
- If bypass fails, verify preview URL and token separately
- For API tests, verify endpoint availability with simple GET request first
