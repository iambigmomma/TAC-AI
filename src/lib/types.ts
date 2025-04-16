export interface RagflowReferenceChunk {
  id: string;
  content: string;
  document_id: string;
  document_name: string;
  dataset_id: string;
  image_id?: string;
  similarity?: number;
  vector_similarity?: number;
  term_similarity?: number;
  positions?: string[];
}

export interface RagflowDocAgg {
  doc_name: string;
  doc_id: string;
  count: number;
}

export interface RagflowReference {
  total: number;
  chunks: RagflowReferenceChunk[];
  doc_aggs?: RagflowDocAgg[];
  prompt?: string;
}

// Add other shared types here if needed
