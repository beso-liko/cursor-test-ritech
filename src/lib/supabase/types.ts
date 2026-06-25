export type DocumentStatus = "processing" | "ready" | "error";
export type FileType = "pdf" | "docx" | "pptx" | "txt" | "png" | "jpg" | "jpeg" | "heic" | "heif";

export interface DocumentGroup {
  id: string;
  name: string;
  created_at: string;
}

export interface Document {
  id: string;
  name: string;
  file_url: string | null;
  file_type: FileType;
  page_count: number | null;
  status: DocumentStatus;
  chunk_count: number;
  group_id: string | null;
  created_at: string;
}

export interface Summary {
  id: string;
  document_id: string | null;
  group_id: string | null;
  content: string;
  created_at: string;
}

export type Difficulty = "easy" | "medium" | "hard";

export interface Flashcard {
  id: string;
  document_id: string | null;
  group_id: string | null;
  question: string;
  answer: string;
  difficulty: Difficulty;
  created_at: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  difficulty: Difficulty;
}

export interface Quiz {
  id: string;
  document_id: string | null;
  group_id: string | null;
  questions: QuizQuestion[];
  created_at: string;
}

export interface QuizResult {
  id: string;
  quiz_id: string;
  score: number;
  total: number;
  answers: number[];
  taken_at: string;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  sources?: string[];
  timestamp: string;
}

export interface ChatSession {
  id: string;
  document_id: string;
  messages: ChatMessage[];
  updated_at: string;
}
