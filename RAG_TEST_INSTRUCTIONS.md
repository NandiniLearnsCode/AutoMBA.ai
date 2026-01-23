# RAG Testing Guide

## Quick Test Steps

### 1. Upload a Test Document
Go to **Settings → Knowledge Base Documents** and upload a PDF or add text with specific keywords like:
- "MBA strategy"
- "networking events"
- "study schedule"
- "course requirements"

**Example test document:**
```
Title: MBA Study Guide
Content: This document contains important information about MBA networking events. Students should attend weekly networking sessions on Fridays. The strategy course requires 10 hours of study per week. Make sure to prepare for case studies before class meetings.
```

### 2. Test RAG in Browser Console

Open your browser console (F12) and paste this test function:

```javascript
// RAG Test Function
async function testRAG() {
  // Import the RAG functions (they're available globally via window in dev mode)
  const { retrieveRelevantDocuments, formatDocumentsForPrompt } = await import('/src/services/documentService.ts');
  const { getOpenAIApiKey } = await import('/src/config/apiKey.ts');
  
  // Or use the direct localStorage approach
  const apiKey = localStorage.getItem('openai_api_key');
  
  if (!apiKey) {
    console.error('❌ No OpenAI API key found. Add it in Settings first.');
    return;
  }
  
  // Test query that should match your document
  const testQuery = "networking events strategy course study schedule";
  
  console.log('🧪 Testing RAG with query:', testQuery);
  console.log('📚 Checking documents...');
  
  // Get documents from localStorage
  const docs = JSON.parse(localStorage.getItem('kaisey_documents') || '[]');
  console.log(`Found ${docs.length} documents:`, docs.map(d => d.title));
  
  // Test retrieval (you'll need to import the function)
  // For now, just check if documents exist and have embeddings
  docs.forEach(doc => {
    console.log(`\n📄 Document: "${doc.title}"`);
    console.log(`   - Has embedding: ${doc.embedding ? '✅ Yes' : '❌ No (will be generated on first use)'}`);
    console.log(`   - Content preview: ${doc.content.substring(0, 100)}...`);
  });
  
  console.log('\n✅ To see RAG in action:');
  console.log('1. Refresh the page to trigger AI recommendations');
  console.log('2. Watch the console for [RAG] logs');
  console.log('3. Check if your document appears in the recommendations');
}

testRAG();
```

### 3. Simpler Console Test (Direct)

Just paste this in the console:

```javascript
// Quick RAG Test
const docs = JSON.parse(localStorage.getItem('kaisey_documents') || '[]');
console.log('📚 Documents:', docs.length);
docs.forEach(d => {
  console.log(`\n"${d.title}"`);
  console.log(`  Embedding: ${d.embedding ? '✅' : '❌ (will generate on first use)'}`);
  console.log(`  Content: ${d.content.substring(0, 80)}...`);
});

// Check API key
const apiKey = localStorage.getItem('openai_api_key');
console.log(`\n🔑 API Key: ${apiKey ? '✅ Set' : '❌ Missing'}`);

if (docs.length === 0) {
  console.log('\n⚠️ No documents found. Upload one in Settings first!');
} else if (!apiKey) {
  console.log('\n⚠️ No API key. RAG will use keyword search (less accurate).');
} else {
  console.log('\n✅ Ready! Refresh page to trigger RAG.');
}
```

### 4. Watch RAG in Action

1. **Refresh the page** (or wait for auto-refresh every 5 minutes)
2. **Open browser console** (F12)
3. **Look for these logs:**
   ```
   [AI Recommendations] Starting RAG retrieval...
   [RAG] Generating/checking embeddings for X documents...
   [RAG] Generating embedding for document: "Your Document Title"
   [RAG] Embedding generated for "Your Document Title" (1536 dimensions)
   [RAG] Generating query embedding for: "Today's schedule: ..."
   [RAG] Found 3 relevant documents: "Your Document Title" (relevance: 0.XXX)
   [AI Recommendations] Document context retrieved and added to prompt
   ```

### 5. Verify RAG is Working

**Success indicators:**
- ✅ Console shows `[RAG] Found X relevant documents`
- ✅ Console shows `Document context retrieved and added to prompt`
- ✅ AI recommendations reference content from your documents
- ✅ Recommendations are more contextually relevant

**If it's not working:**
- ❌ Check if OpenAI API key is set in Settings
- ❌ Check if documents are saved (look in localStorage)
- ❌ Check console for error messages
- ❌ Verify embeddings are being generated (should see `[RAG] Generating embedding` logs)

## Test Query Examples

Try uploading documents with these topics and see if they get retrieved:

1. **Networking Focus:**
   - Query: "networking events"
   - Document should contain: "networking", "events", "meetups"

2. **Study Schedule:**
   - Query: "study time preparation"
   - Document should contain: "study", "preparation", "schedule"

3. **Course Requirements:**
   - Query: "course assignments deadlines"
   - Document should contain: "assignments", "deadlines", "requirements"

## Expected Behavior

1. **First time:** Embeddings are generated (takes a few seconds, costs ~$0.0001 per document)
2. **Subsequent times:** Existing embeddings are reused (instant, no cost)
3. **Relevance threshold:** Only documents with similarity > 0.1 are included
4. **Top K:** Maximum 3 most relevant documents are sent to LLM
5. **Context limit:** Each document is truncated to 1000 characters in the prompt
