/**
 * chunk - Chunking for context (v2: embeddings)
 * 
 * Splits large files into manageable chunks.
 * Future: use embeddings for semantic chunking.
 */

export interface Chunk {
  path: string;
  startLine: number;
  endLine: number;
  content: string;
}

export function chunkFile(path: string, content: string, maxChunkSize: number): Chunk[] {
  // TODO: Implement file chunking
  return [];
}
