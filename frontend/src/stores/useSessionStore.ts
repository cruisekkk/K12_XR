import { create } from "zustand";
import type { Annotation, EducationalContent } from "@/types/agent";

interface SessionStoreState {
  sessionId: string | null;
  runId: string | null;
  prompt: string;
  refinedPrompt: string | null;
  modelUrl: string | null;
  imageUrl: string | null;
  annotations: Annotation[];
  educationalContent: EducationalContent | null;
  gradeLevel: string;
  subject: string;

  // Actions
  setPrompt: (prompt: string) => void;
  setGradeLevel: (level: string) => void;
  setSubject: (subject: string) => void;
  setSession: (sessionId: string, runId: string) => void;
  setRefinedPrompt: (prompt: string) => void;
  setModelUrl: (url: string) => void;
  setImageUrl: (url: string) => void;
  setAnnotations: (annotations: Annotation[]) => void;
  setEducationalContent: (content: EducationalContent) => void;
  reset: () => void;
}

export const useSessionStore = create<SessionStoreState>((set) => ({
  sessionId: null,
  runId: null,
  prompt: "",
  refinedPrompt: null,
  modelUrl: null,
  imageUrl: null,
  annotations: [],
  educationalContent: null,
  gradeLevel: "",
  subject: "",

  setPrompt: (prompt) => set({ prompt }),
  setGradeLevel: (gradeLevel) => set({ gradeLevel }),
  setSubject: (subject) => set({ subject }),
  setSession: (sessionId, runId) => set({ sessionId, runId }),
  setRefinedPrompt: (refinedPrompt) => set({ refinedPrompt }),
  setModelUrl: (modelUrl) => set({ modelUrl }),
  setImageUrl: (imageUrl) => set({ imageUrl }),
  setAnnotations: (annotations) => set({ annotations }),
  setEducationalContent: (educationalContent) => set({ educationalContent }),
  reset: () =>
    set({
      sessionId: null,
      runId: null,
      prompt: "",
      refinedPrompt: null,
      modelUrl: null,
      imageUrl: null,
      annotations: [],
      educationalContent: null,
      gradeLevel: "",
      subject: "",
    }),
}));
