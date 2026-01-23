// Document storage and RAG service
// Stores documents with embeddings for retrieval-augmented generation

export interface Document {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  embedding?: number[]; // Vector embedding for semantic search
}

const DOCUMENTS_STORAGE_KEY = "kaisey_documents";
const EMBEDDINGS_CACHE_KEY = "kaisey_embeddings_cache";

// Get all stored documents
export function getDocuments(): Document[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(DOCUMENTS_STORAGE_KEY);
    if (!stored) return [];
    
    const docs = JSON.parse(stored);
    return docs.map((doc: any) => ({
      ...doc,
      createdAt: new Date(doc.createdAt),
      updatedAt: new Date(doc.updatedAt),
    }));
  } catch (error) {
    console.error("Error loading documents:", error);
    return [];
  }
}

// Save a document
export function saveDocument(document: Omit<Document, "id" | "createdAt" | "updatedAt">): Document {
  const docs = getDocuments();
  const newDoc: Document = {
    ...document,
    id: `doc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  docs.push(newDoc);
  localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
  return newDoc;
}

// Update a document
export function updateDocument(id: string, updates: Partial<Pick<Document, "title" | "content">>): Document | null {
  const docs = getDocuments();
  const index = docs.findIndex((d) => d.id === id);
  
  if (index === -1) return null;
  
  docs[index] = {
    ...docs[index],
    ...updates,
    updatedAt: new Date(),
    embedding: undefined, // Clear embedding - will need to regenerate
  };
  
  localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
  return docs[index];
}

// Delete a document
export function deleteDocument(id: string): boolean {
  const docs = getDocuments();
  const filtered = docs.filter((d) => d.id !== id);
  
  if (filtered.length === docs.length) return false;
  
  localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(filtered));
  return true;
}

// Generate embedding for text using OpenAI
export async function generateEmbedding(text: string, apiKey: string): Promise<number[]> {
  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "text-embedding-3-small", // Cost-effective embedding model
        input: text.substring(0, 8000), // Limit to 8000 chars
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding API error: ${response.status}`);
    }

    const data = await response.json();
    return data.data[0].embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw error;
  }
}

// Calculate cosine similarity between two vectors
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// Retrieve relevant documents based on query (using embeddings if available, fallback to keyword search)
export async function retrieveRelevantDocuments(
  query: string,
  apiKey: string | null,
  topK: number = 3
): Promise<Array<{ document: Document; relevance: number }>> {
  const documents = getDocuments();
  
  if (documents.length === 0) return [];
  
  // If we have API key, use embeddings for semantic search
  if (apiKey) {
    try {
      // Generate embedding for query
      const queryEmbedding = await generateEmbedding(query, apiKey);
      
      // Get or generate embeddings for documents
      const documentsWithEmbeddings = await Promise.all(
        documents.map(async (doc) => {
          if (!doc.embedding) {
            // Generate embedding for document
            const embedding = await generateEmbedding(
              `${doc.title}\n\n${doc.content}`,
              apiKey
            );
            
            // Save embedding to document
            const docs = getDocuments();
            const index = docs.findIndex((d) => d.id === doc.id);
            if (index !== -1) {
              docs[index].embedding = embedding;
              localStorage.setItem(DOCUMENTS_STORAGE_KEY, JSON.stringify(docs));
            }
            
            return { ...doc, embedding };
          }
          return doc;
        })
      );
      
      // Calculate similarity scores
      const scored = documentsWithEmbeddings
        .map((doc) => ({
          document: doc,
          relevance: doc.embedding
            ? cosineSimilarity(queryEmbedding, doc.embedding)
            : 0,
        }))
        .filter((item) => item.relevance > 0.1) // Filter low relevance
        .sort((a, b) => b.relevance - a.relevance)
        .slice(0, topK);
      
      return scored;
    } catch (error) {
      console.warn("Embedding-based retrieval failed, falling back to keyword search:", error);
      // Fall through to keyword search
    }
  }
  
  // Fallback: Simple keyword-based search
  const queryLower = query.toLowerCase();
  const queryWords = queryLower.split(/\s+/).filter((w) => w.length > 2);
  
  const scored = documents
    .map((doc) => {
      const text = `${doc.title} ${doc.content}`.toLowerCase();
      let score = 0;
      
      for (const word of queryWords) {
        const matches = (text.match(new RegExp(word, "g")) || []).length;
        score += matches;
      }
      
      return {
        document: doc,
        relevance: score / queryWords.length, // Normalize by query length
      };
    })
    .filter((item) => item.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance)
    .slice(0, topK);
  
  return scored;
}

// Format documents for inclusion in AI prompt
export function formatDocumentsForPrompt(
  relevantDocs: Array<{ document: Document; relevance: number }>
): string {
  if (relevantDocs.length === 0) return "";
  
  const formatted = relevantDocs
    .map(
      (item, index) =>
        `**Document ${index + 1}: ${item.document.title}**\n${item.document.content.substring(0, 1000)}${item.document.content.length > 1000 ? "..." : ""}`
    )
    .join("\n\n---\n\n");
  
  return `\n\n**Relevant Context from Your Documents:**\n${formatted}\n\nUse this context to inform your recommendations. Reference specific information from these documents when relevant.`;
}
