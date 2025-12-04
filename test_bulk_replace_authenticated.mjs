#!/usr/bin/env node
/**
 * Test bulk-replace API with Vercel authentication using tiny-reactive
 */

const PREVIEW_URL = 'https://tinyutils-otyrymik4-cavins-projects-7b0e00bb.vercel.app';
const MFSR_TINY_ZIP_BASE64 = 'UEsDBBQAAAAIABWHN1kbhetFGQAAABcAAAAIAAAAdGVzdC50eHQrzs9NycksVkjOzytJTS7RAwBQSwECPwAUAAAACAAVhzdZG4XrRRkAAAAXAAAACAAkAAAAAAAAACAAAAAAAAAAdGVzdC50eHQKACAAAAAAAAEAGACAt8zTe83bAYC3zNN7zdsBoJ2i03vN2wFQSwUGAAAAAAEAAQBaAAAAPwAAAAAA';

console.log('🔧 Testing bulk-replace API with authentication...');
console.log(`📍 Preview URL: ${PREVIEW_URL}`);

// Helper to call tiny-reactive MCP
async function trCmd(params) {
  // This will be called via the MCP, simulating the command
  return params;
}

async function testBulkReplace() {
  try {
    console.log('\n1️⃣  Navigating to preview URL...');

    // Navigate to the preview URL (this will trigger authentication redirect)
    await fetch(`${PREVIEW_URL}/api/bulk-replace`);

    console.log('\n2️⃣  Preparing test ZIP file...');

    // Decode base64 ZIP
    const zipBuffer = Buffer.from(MFSR_TINY_ZIP_BASE64, 'base64');

    console.log('\n3️⃣  Testing POST to /api/bulk-replace...');

    // Create FormData
    const FormData = (await import('formdata-node')).FormData;
    const { Blob } = await import('buffer');

    const formData = new FormData();
    formData.append('file', new Blob([zipBuffer]), 'test.zip');
    formData.append('mode', 'simple');
    formData.append('find', 'hello');
    formData.append('replace', 'hi');
    formData.append('action', 'preview');
    formData.append('case_sensitive', 'false');

    const response = await fetch(`${PREVIEW_URL}/api/bulk-replace`, {
      method: 'POST',
      body: formData
    });

    console.log(`\n📊 Response Status: ${response.status} ${response.statusText}`);

    if (response.status === 401) {
      console.log('\n⚠️  Authentication required - this is expected for preview environments');
      console.log('   The API requires Vercel authentication bypass cookie');
      return { status: 401, message: 'Authentication required' };
    }

    const contentType = response.headers.get('content-type');
    console.log(`📄 Content-Type: ${contentType}`);

    if (contentType && contentType.includes('application/json')) {
      const data = await response.json();
      console.log('\n✅ JSON Response received:');
      console.log(JSON.stringify(data, null, 2));
      return data;
    } else {
      const text = await response.text();
      console.log('\n📝 Text Response (first 500 chars):');
      console.log(text.substring(0, 500));
      return { status: response.status, body: text.substring(0, 500) };
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    return { error: error.message };
  }
}

// Run the test
testBulkReplace().then(result => {
  console.log('\n🏁 Test complete!');
  if (result.status === 401) {
    console.log('\n💡 Next step: Use tiny-reactive MCP to load saved auth state and test');
  }
});
