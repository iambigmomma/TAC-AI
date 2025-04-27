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
  url?: string | null;
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

// --- Types needed for stream parsing (even if temporary) ---

// Interface for the data field within a streaming chunk's data object
// Note: This might differ slightly from non-streaming data structure
export interface RagflowCompletionData {
  answer: string;
  session_id: string;
  reference?: RagflowReference; // Reference might appear in chunks too
}

// Interface for the overall streaming chunk structure received from RAGflow
export interface RagflowStreamChunk {
  code: number;
  message: string;
  data: RagflowCompletionData | boolean; // Data can be object or boolean(true)
}

// Add other shared types here if needed
