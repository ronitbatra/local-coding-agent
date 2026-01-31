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

export function chunkFile(_path: string, _content: string, _maxChunkSize: number): Chunk[] {
  // TODO: Implement file chunking
  return [];
}
