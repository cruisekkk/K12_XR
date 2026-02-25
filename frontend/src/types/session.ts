import type { Annotation, EducationalContent } from "./agent";

export interface Session {
  id: string;
  prompt: string;
  run_id: string;
  status: "running" | "completed" | "error";
  grade_level?: string;
  subject?: string;
  refined_prompt?: string;
  image_url?: string;
  model_url?: string;
  annotations: Annotation[];
  educational_content?: EducationalContent;
  created_at: string;
  updated_at: string;
}

export interface GenerateRequest {
  prompt: string;
  session_id?: string;
  grade_level?: string;
  subject?: string;
}

export interface GenerateResponse {
  run_id: string;
  session_id: string;
}
