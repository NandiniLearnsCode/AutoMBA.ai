/**
 * RAG Service for MBA Playbook
 * Handles embedding generation, storage, and semantic search
 */

import { PlaybookChunk, playbookChunks, PLAYBOOK_VERSION } from '@/data/mbaPlaybook';
import { getOpenAIApiKey } from '@/config/apiKey';

const STORAGE_KEY = 'mba_playbook_embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';

interface StoredEmbeddings {
  version: string;
  embeddings: { [chunkId: string]: number[] };
}

interface ChunkWithEmbedding extends PlaybookChunk {
  embedding: number[];
}

let cachedEmbeddings: ChunkWithEmbedding[] | null = null;
let initializationPromise: Promise<void> | null = null;

/**
 * Generate embedding for a text using OpenAI API
 */
async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = getOpenAIApiKey();
  if (!apiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Embedding API error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = await response.json();
  return data.data[0].embedding;
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Load embeddings from localStorage
 */
function loadStoredEmbeddings(): StoredEmbeddings | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const parsed: StoredEmbeddings = JSON.parse(stored);

    // Check version match
    if (parsed.version !== PLAYBOOK_VERSION) {
      console.log('[RAG] Playbook version changed, will regenerate embeddings');
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('[RAG] Error loading stored embeddings:', error);
    return null;
  }
}

/**
 * Save embeddings to localStorage
 */
function saveEmbeddings(embeddings: { [chunkId: string]: number[] }): void {
  try {
    const data: StoredEmbeddings = {
      version: PLAYBOOK_VERSION,
      embeddings,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    console.log('[RAG] Embeddings saved to localStorage');
  } catch (error) {
    console.error('[RAG] Error saving embeddings:', error);
  }
}

/**
 * Initialize embeddings for all playbook chunks
 * Uses cached embeddings if available and version matches
 */
export async function initializeEmbeddings(): Promise<void> {
  // Return existing promise if initialization is in progress
  if (initializationPromise) {
    return initializationPromise;
  }

  // Return immediately if already initialized
  if (cachedEmbeddings) {
    return;
  }

  initializationPromise = (async () => {
    console.log('[RAG] Initializing playbook embeddings...');

    // Try to load from localStorage first
    const stored = loadStoredEmbeddings();

    if (stored) {
      // Check if all chunks have embeddings
      const allChunksHaveEmbeddings = playbookChunks.every(
        chunk => stored.embeddings[chunk.id]?.length > 0
      );

      if (allChunksHaveEmbeddings) {
        console.log('[RAG] Loaded embeddings from cache');
        cachedEmbeddings = playbookChunks.map(chunk => ({
          ...chunk,
          embedding: stored.embeddings[chunk.id],
        }));
        return;
      }
    }

    // Generate embeddings for all chunks
    console.log('[RAG] Generating new embeddings for', playbookChunks.length, 'chunks');
    const embeddingsMap: { [chunkId: string]: number[] } = {};
    const chunksWithEmbeddings: ChunkWithEmbedding[] = [];

    for (const chunk of playbookChunks) {
      try {
        // Create embedding text from title, keywords, and content
        const embeddingText = `${chunk.title}\n${chunk.keywords.join(', ')}\n${chunk.content}`;
        const embedding = await generateEmbedding(embeddingText);

        embeddingsMap[chunk.id] = embedding;
        chunksWithEmbeddings.push({ ...chunk, embedding });

        console.log(`[RAG] Generated embedding for: ${chunk.id}`);
      } catch (error) {
        console.error(`[RAG] Error generating embedding for ${chunk.id}:`, error);
        throw error;
      }
    }

    // Save to localStorage
    saveEmbeddings(embeddingsMap);
    cachedEmbeddings = chunksWithEmbeddings;

    console.log('[RAG] Embeddings initialization complete');
  })();

  try {
    await initializationPromise;
  } finally {
    initializationPromise = null;
  }
}

/**
 * Search for relevant playbook chunks based on a query
 * @param query - The user's message or search query
 * @param topK - Number of top results to return (default: 3)
 * @param contextHints - Optional context hints to improve search (e.g., current month, priorities)
 * @returns Array of relevant chunks sorted by relevance
 */
export async function searchRelevantChunks(
  query: string,
  topK: number = 3,
  contextHints?: {
    currentMonth?: number;
    priorities?: string[];
    recentEventTypes?: string[];
  }
): Promise<PlaybookChunk[]> {
  // Ensure embeddings are initialized
  await initializeEmbeddings();

  if (!cachedEmbeddings || cachedEmbeddings.length === 0) {
    console.warn('[RAG] No embeddings available, returning empty results');
    return [];
  }

  // Build enhanced query with context
  let enhancedQuery = query;

  if (contextHints) {
    const contextParts: string[] = [];

    if (contextHints.currentMonth !== undefined) {
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
      const monthName = monthNames[contextHints.currentMonth];

      // Add recruiting phase context
      if (contextHints.currentMonth >= 7 && contextHints.currentMonth <= 10) {
        contextParts.push(`Phase 1 recruiting season (${monthName}), consulting and banking focus`);
      } else if (contextHints.currentMonth >= 11 || contextHints.currentMonth <= 1) {
        contextParts.push(`Phase 2 recruiting season (${monthName}), tech and relationship building`);
      } else if (contextHints.currentMonth >= 2 && contextHints.currentMonth <= 4) {
        contextParts.push(`Phase 3 recruiting season (${monthName}), startups and VC`);
      }
    }

    if (contextHints.priorities?.length) {
      contextParts.push(`User priorities: ${contextHints.priorities.join(', ')}`);
    }

    if (contextHints.recentEventTypes?.length) {
      contextParts.push(`Recent activities: ${contextHints.recentEventTypes.join(', ')}`);
    }

    if (contextParts.length > 0) {
      enhancedQuery = `${query}\n\nContext: ${contextParts.join('. ')}`;
    }
  }

  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(enhancedQuery);

    // Calculate similarity scores
    const scoredChunks = cachedEmbeddings.map(chunk => ({
      chunk,
      score: cosineSimilarity(queryEmbedding, chunk.embedding),
    }));

    // Sort by score descending and take top K
    scoredChunks.sort((a, b) => b.score - a.score);

    const results = scoredChunks.slice(0, topK).map(({ chunk, score }) => {
      console.log(`[RAG] Match: ${chunk.id} (score: ${score.toFixed(3)})`);
      return chunk;
    });

    return results;
  } catch (error) {
    console.error('[RAG] Error searching chunks:', error);
    return [];
  }
}

/**
 * Format relevant chunks for inclusion in AI prompt
 */
export function formatChunksForPrompt(chunks: PlaybookChunk[]): string {
  if (chunks.length === 0) {
    return '';
  }

  const formattedChunks = chunks.map((chunk, index) =>
    `[${index + 1}] ${chunk.title} (${chunk.chapter}):\n${chunk.content}`
  ).join('\n\n---\n\n');

  return `**MBA PLAYBOOK KNOWLEDGE (Apply these principles in your response):**

${formattedChunks}

Use this knowledge to inform your advice. Reference concepts like event tiers, recruiting phases, biometric states, FOMO filter, and MBA vernacular (ROI, bandwidth, opportunity cost) where relevant.`;
}

/**
 * Check if RAG is ready (embeddings are initialized)
 */
export function isRagReady(): boolean {
  return cachedEmbeddings !== null && cachedEmbeddings.length > 0;
}

/**
 * Clear cached embeddings (useful for testing or forcing regeneration)
 */
export function clearEmbeddingsCache(): void {
  cachedEmbeddings = null;
  localStorage.removeItem(STORAGE_KEY);
  console.log('[RAG] Embeddings cache cleared');
}
