"use client";

import { useState } from "react";
import type { EducationalContent, Annotation } from "@/types/agent";

interface EducationalPanelProps {
  content: EducationalContent | null;
  annotations: Annotation[];
  refinedPrompt: string | null;
  className?: string;
}

type TabId = "overview" | "annotations" | "quiz" | "vocab";

export function EducationalPanel({
  content,
  annotations,
  refinedPrompt,
  className,
}: EducationalPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  if (!content && annotations.length === 0 && !refinedPrompt) {
    return null;
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: "overview", label: "Overview" },
    { id: "annotations", label: "Labels" },
    { id: "quiz", label: "Quiz" },
    { id: "vocab", label: "Vocab" },
  ];

  return (
    <div
      className={`bg-white rounded-xl border border-gray-200 overflow-hidden ${className}`}
    >
      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 text-xs py-2 font-medium transition-colors ${
              activeTab === tab.id
                ? "text-blue-600 border-b-2 border-blue-600"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="p-4 max-h-[400px] overflow-y-auto">
        {activeTab === "overview" && (
          <div className="space-y-3">
            {content?.title && (
              <h4 className="font-semibold text-sm text-gray-800">
                {content.title}
              </h4>
            )}
            {content?.overview && (
              <p className="text-xs text-gray-600 leading-relaxed">
                {content.overview}
              </p>
            )}
            {content?.key_facts && content.key_facts.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-1">
                  Key Facts
                </h5>
                <ul className="space-y-1">
                  {content.key_facts.map((fact, i) => (
                    <li key={i} className="text-xs text-gray-600 flex gap-2">
                      <span className="text-blue-500">•</span>
                      {fact}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {content?.fun_facts && content.fun_facts.length > 0 && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-1">
                  Fun Facts
                </h5>
                {content.fun_facts.map((fact, i) => (
                  <p key={i} className="text-xs text-gray-600 mb-1">
                    💡 {fact}
                  </p>
                ))}
              </div>
            )}
            {refinedPrompt && (
              <div>
                <h5 className="text-xs font-semibold text-gray-700 mb-1">
                  Refined Prompt
                </h5>
                <p className="text-xs text-gray-500 italic bg-gray-50 rounded p-2">
                  {refinedPrompt}
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === "annotations" && (
          <div className="space-y-2">
            {annotations.length === 0 ? (
              <p className="text-xs text-gray-400">No annotations yet</p>
            ) : (
              annotations.map((ann) => (
                <div
                  key={ann.id}
                  className="border border-gray-100 rounded-lg p-2"
                >
                  <p className="text-xs font-semibold text-gray-800">
                    {ann.label}
                  </p>
                  <p className="text-[11px] text-gray-600 mt-0.5">
                    {ann.description}
                  </p>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "quiz" && (
          <div className="space-y-3">
            {!content?.quiz_questions || content.quiz_questions.length === 0 ? (
              <p className="text-xs text-gray-400">No quiz questions yet</p>
            ) : (
              content.quiz_questions.map((q, i) => (
                <QuizQuestion key={i} question={q} index={i} />
              ))
            )}
          </div>
        )}

        {activeTab === "vocab" && (
          <div className="space-y-2">
            {!content?.vocabulary || content.vocabulary.length === 0 ? (
              <p className="text-xs text-gray-400">No vocabulary yet</p>
            ) : (
              content.vocabulary.map((v, i) => (
                <div key={i} className="border-b border-gray-50 pb-2">
                  <span className="text-xs font-semibold text-gray-800">
                    {v.term}
                  </span>
                  <span className="text-xs text-gray-600"> — {v.definition}</span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function QuizQuestion({
  question,
  index,
}: {
  question: {
    question: string;
    options: string[];
    correct_answer: number;
    explanation: string;
  };
  index: number;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="border border-gray-100 rounded-lg p-3">
      <p className="text-xs font-medium text-gray-800 mb-2">
        {index + 1}. {question.question}
      </p>
      <div className="space-y-1">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => {
              setSelected(i);
              setRevealed(true);
            }}
            className={`w-full text-left text-xs px-2 py-1.5 rounded transition-colors ${
              revealed && i === question.correct_answer
                ? "bg-green-100 text-green-800 border border-green-300"
                : revealed && i === selected
                ? "bg-red-100 text-red-800 border border-red-300"
                : "bg-gray-50 text-gray-700 hover:bg-gray-100"
            }`}
            disabled={revealed}
          >
            {String.fromCharCode(65 + i)}. {opt}
          </button>
        ))}
      </div>
      {revealed && (
        <p className="text-[11px] text-gray-500 mt-2 italic">
          {question.explanation}
        </p>
      )}
    </div>
  );
}
