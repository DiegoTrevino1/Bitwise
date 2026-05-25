import { useState } from "react";
import "./PreAssessment.css";
import { submitAssessment } from "./api";

/* ─────────────────────────────────────────────────────────────
   QUESTIONS
   These test prior knowledge of cache mapping concepts.
   The same question set is reused for the post-assessment so
   scores can be compared directly.
───────────────────────────────────────────────────────────── */
const QUESTIONS = [
  {
    id: 1,
    q: "What is a cache?",
    opts: [
      "A small, fast memory that stores copies of frequently used data",
      "A large, slow memory used for long-term storage",
      "A type of CPU register",
      "A network buffer",
    ],
    answer: 0,
    explanation: "A cache is a small, fast memory placed between the CPU and main memory to speed up data access by storing copies of frequently used data.",
  },
  {
    id: 2,
    q: "In direct-mapped cache, what do the index bits determine?",
    opts: [
      "Which byte within a cache line to read",
      "Whether the data is valid",
      "Which cache line the memory address maps to",
      "The size of the cache",
    ],
    answer: 2,
    explanation: "In direct-mapped cache the index bits identify the exact cache line that a memory address maps to. Each address can only ever go in one line.",
  },
  {
    id: 3,
    q: "What is a cache miss?",
    opts: [
      "When the CPU skips a cache line",
      "When requested data is not found in the cache",
      "When two addresses map to the same line",
      "When the cache is full",
    ],
    answer: 1,
    explanation: "A cache miss occurs when the CPU looks for data in the cache and it isn't there — the data must be fetched from slower main memory.",
  },
  {
    id: 4,
    q: "What is the role of the tag bits in direct-mapped cache?",
    opts: [
      "They point to the cache set",
      "They select the byte within a cache line",
      "They verify that the correct data is stored in the cache line",
      "They determine the cache size",
    ],
    answer: 2,
    explanation: "Tag bits are compared against the stored tag in the cache line to verify that the line actually holds the data for this address. A mismatch means a cache miss.",
  },
  {
    id: 5,
    q: "In fully associative cache, where can a memory block be placed?",
    opts: [
      "Only in the line determined by the index bits",
      "Only in the set determined by the set bits",
      "In any cache line",
      "In the last cache line only",
    ],
    answer: 2,
    explanation: "Fully associative cache has no index or set bits — a memory block can be placed in any available cache line. Every line's tag must be compared to check for a hit.",
  },
  {
    id: 6,
    q: "What do the offset bits in a memory address tell you?",
    opts: [
      "Which cache line to use",
      "Which byte within a cache line to access",
      "Whether there is a cache hit or miss",
      "Which set of lines the address belongs to",
    ],
    answer: 1,
    explanation: "Offset bits identify the specific byte within a cache line. They are the same across all cache mapping strategies.",
  },
  {
    id: 7,
    q: "In set-associative cache, what do the set bits determine?",
    opts: [
      "The exact cache line the data must go in",
      "Which group (set) of cache lines this address belongs to",
      "Whether the stored tag matches",
      "The number of ways in the cache",
    ],
    answer: 1,
    explanation: "Set bits identify which set of lines an address belongs to. Once the set is found, the data can go in any line within that set — that's where the 'associative' part comes in.",
  },
  {
    id: 8,
    q: "A cache has 4 lines and uses direct mapping. An address has index bits '10'. Which line does it map to?",
    opts: ["Line 0", "Line 1", "Line 2", "Line 3"],
    answer: 2,
    explanation: "Binary '10' = decimal 2, so the address maps to Line 2.",
  },
  {
    id: 9,
    q: "Which cache mapping strategy is the most flexible about where data can be placed?",
    opts: [
      "Direct-mapped",
      "Set-associative",
      "Fully associative",
      "They are all equally flexible",
    ],
    answer: 2,
    explanation: "Fully associative is the most flexible — data can go in any line. Direct-mapped is the least flexible (only one possible line per address).",
  },
  {
    id: 10,
    q: "In a set-associative cache with 4 sets and 2 ways each, how many total cache lines are there?",
    opts: ["2", "4", "6", "8"],
    answer: 3,
    explanation: "4 sets × 2 ways = 8 total cache lines.",
  },
];

/* ─────────────────────────────────────────────────────────────
   COMPONENT
───────────────────────────────────────────────────────────── */
export default function PreAssessment({ type = "pre", onComplete, onBack }) {
  const [qIdx,     setQIdx]     = useState(0);
  const [selected, setSelected] = useState(null);   // index of chosen option
  const [revealed, setRevealed] = useState(false);  // show correct/wrong
  const [answers,  setAnswers]  = useState([]);      // array of booleans

  const q         = QUESTIONS[qIdx];
  const total     = QUESTIONS.length;
  const pct       = Math.round((qIdx / total) * 100);
  const isPre     = type === "pre";
  const title     = isPre ? "Pre-Assessment" : "Post-Assessment";
  const subtitle  = isPre
    ? "Answer honestly — this tests what you already know. Finishing unlocks the game."
    : "Same questions as the pre-assessment. See how much you've learned!";

  const handleSelect = (idx) => {
    if (revealed) return;
    setSelected(idx);
  };

  const handleConfirm = () => {
    if (selected === null || revealed) return;
    setRevealed(true);
    setAnswers(prev => [...prev, selected === q.answer]);
  };

  const handleNext = async () => {
    if (qIdx + 1 >= total) {
      const finalAnswers = [...answers, selected === q.answer];
      const score = finalAnswers.filter(Boolean).length;
      // Save to backend (non-blocking — works offline too)
      await submitAssessment(type, score, total);
      onComplete(score);
    } else {
      setQIdx(i => i + 1);
      setSelected(null);
      setRevealed(false);
    }
  };

  const isCorrect = revealed && selected === q.answer;
  const isWrong   = revealed && selected !== q.answer;

  return (
    <div className="pa-shell">

      {/* Top bar */}
      <div className="pa-topbar">
        <button className="pa-back-btn" onClick={onBack}>← Back</button>
        <div className="pa-topbar-center">
          <span className="pa-topbar-title">{title}</span>
          <div className="pa-progress-track">
            <div className="pa-progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="pa-progress-label">{qIdx + 1} / {total}</span>
        </div>
        <div className="pa-score-pill">{answers.filter(Boolean).length} correct</div>
      </div>

      {/* Body */}
      <div className="pa-body">
        <div className="pa-card">

          {/* Header */}
          <div className="pa-card-head">
            <div className="pa-eyebrow">{title} · Question {qIdx + 1} of {total}</div>
            <p className="pa-card-sub">{subtitle}</p>
          </div>

          {/* Question */}
          <div className="pa-question">{q.q}</div>

          {/* Options */}
          <div className="pa-options">
            {q.opts.map((opt, i) => {
              let cls = "pa-option";
              if (revealed) {
                if (i === q.answer)             cls += " pa-opt-correct";
                else if (i === selected)        cls += " pa-opt-wrong";
              } else if (i === selected) {
                cls += " pa-opt-selected";
              }
              return (
                <button key={i} className={cls} onClick={() => handleSelect(i)} disabled={revealed}>
                  <span className="pa-opt-letter">{String.fromCharCode(65 + i)}</span>
                  <span className="pa-opt-text">{opt}</span>
                  {revealed && i === q.answer && <span className="pa-opt-icon">✓</span>}
                  {revealed && i === selected && i !== q.answer && <span className="pa-opt-icon">✗</span>}
                </button>
              );
            })}
          </div>

          {/* Explanation */}
          {revealed && (
            <div className={`pa-explanation ${isCorrect ? "pa-expl-correct" : "pa-expl-wrong"}`}>
              <div className="pa-expl-title">{isCorrect ? "✓ Correct!" : "✗ Not quite"}</div>
              <p className="pa-expl-body">{q.explanation}</p>
            </div>
          )}

          {/* Actions */}
          <div className="pa-actions">
            {!revealed ? (
              <button
                className="pa-btn-confirm"
                onClick={handleConfirm}
                disabled={selected === null}
              >
                {selected === null ? "Select an answer" : "Confirm →"}
              </button>
            ) : (
              <button className="pa-btn-next" onClick={handleNext}>
                {qIdx + 1 >= total ? "See my results →" : "Next question →"}
              </button>
            )}
          </div>

        </div>

        {/* Why this matters callout */}
        {!revealed && (
          <div className="pa-why">
            💡 <strong>Why this matters:</strong> These concepts are exactly what the cache mapping game tests.
            Your score now will be compared to your score after playing to measure how much you learned.
          </div>
        )}
      </div>
    </div>
  );
}
