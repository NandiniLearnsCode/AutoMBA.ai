// RAG Test Script - Paste this in your browser console (F12)

(async function testRAG() {
  console.log('🧪 RAG Test Starting...\n');
  
  // 1. Check if documents exist
  const docs = JSON.parse(localStorage.getItem('kaisey_documents') || '[]');
  console.log(`📚 Found ${docs.length} document(s):`);
  docs.forEach((d, i) => {
    console.log(`   ${i + 1}. "${d.title}"`);
    console.log(`      - Has embedding: ${d.embedding ? '✅ Yes (' + d.embedding.length + ' dims)' : '❌ No (will generate on first use)'}`);
    console.log(`      - Content length: ${d.content.length} chars`);
    console.log(`      - Preview: ${d.content.substring(0, 60)}...\n`);
  });
  
  if (docs.length === 0) {
    console.log('⚠️  No documents found! Upload one in Settings → Knowledge Base Documents first.');
    return;
  }
  
  // 2. Check API key
  const apiKey = localStorage.getItem('openai_api_key');
  if (!apiKey) {
    console.log('⚠️  No OpenAI API key found. RAG will use keyword search (less accurate).');
    console.log('   Add your API key in Settings → API Keys\n');
  } else {
    console.log('✅ OpenAI API key found\n');
  }
  
  // 3. Test query examples
  console.log('📝 Test Query Examples:');
  const testQueries = [
    "networking events strategy",
    "study schedule preparation",
    "course assignments deadlines",
    "MBA classes meetings"
  ];
  
  testQueries.forEach((q, i) => {
    console.log(`   ${i + 1}. "${q}"`);
  });
  
  console.log('\n✅ To test RAG:');
  console.log('   1. Make sure you have documents uploaded');
  console.log('   2. Make sure OpenAI API key is set');
  console.log('   3. Refresh the page (or wait for auto-refresh)');
  console.log('   4. Watch the console for [RAG] logs');
  console.log('   5. Check if AI recommendations reference your documents\n');
  
  // 4. Check if embeddings need to be generated
  const needsEmbedding = docs.filter(d => !d.embedding);
  if (needsEmbedding.length > 0 && apiKey) {
    console.log(`⏳ ${needsEmbedding.length} document(s) need embedding generation:`);
    needsEmbedding.forEach(d => console.log(`   - "${d.title}"`));
    console.log('   (This will happen automatically when recommendations are generated)\n');
  } else if (needsEmbedding.length > 0 && !apiKey) {
    console.log(`⚠️  ${needsEmbedding.length} document(s) need embeddings, but no API key is set.`);
    console.log('   They will use keyword search instead.\n');
  } else if (docs.length > 0) {
    console.log('✅ All documents have embeddings ready!\n');
  }
  
  // 5. Simulate what the query would be
  const now = new Date();
  const dayOfWeek = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  const sampleQuery = `Today's schedule: Class Meeting, Study Session. Time: ${currentTime}. Day: ${dayOfWeek}.`;
  
  console.log('🔍 Sample query that will be used:');
  console.log(`   "${sampleQuery}"\n`);
  
  console.log('📊 Expected RAG Flow:');
  console.log('   1. Query embedding generated');
  console.log('   2. Document embeddings checked/generated');
  console.log('   3. Cosine similarity calculated');
  console.log('   4. Top 3 most relevant documents selected');
  console.log('   5. Documents formatted and added to LLM prompt');
  console.log('   6. LLM generates recommendations with document context\n');
  
  console.log('✨ Test complete! Refresh the page to see RAG in action.');
})();
