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
      "A large storage device for files",
      "A small, fast memory that stores frequently used data",
      "A network connection",
      "A type of keyboard shortcut",
    ],
    answer: 1,
    explanation:
      "A cache is a small and fast type of memory that stores data the CPU may need again soon.",
  },

  {
    id: 2,
    q: "What is a cache hit?",
    opts: [
      "The cache was deleted",
      "The data was found in the cache",
      "The CPU stopped running",
      "The cache is full",
    ],
    answer: 1,
    explanation:
      "A cache hit means the data the CPU was looking for was already in the cache.",
  },

  {
    id: 3,
    q: "What is a cache miss?",
    opts: [
      "The cache is turned off",
      "The cache is damaged",
      "The data was not found in the cache",
      "The data was found in the cache",
    ],
    answer: 2,
    explanation:
      "A cache miss means the data was not in the cache, so it has to be found somewhere else, like main memory.",
  },

  {
    id: 4,
    q: "What is a tag?",
    opts: [
      "The actual data being stored",
      "A type of cache",
      "The size of the cache",
      "A part of an address used to identify the data",
    ],
    answer: 3,
    explanation:
      "The tag helps check whether the data stored in the cache is the correct data for the address.",
  },

  {
    id: 5,
    q: "What is an index?",
    opts: [
      "A cache replacement rule",
      "A part of an address used to choose a cache location",
      "The data stored in the cache",
      "A part of an address used to choose a byte inside a block",
    ],
    answer: 1,
    explanation:
      "The index points to the cache line or set where the data should be checked.",
  },

  {
    id: 6,
    q: "What is an offset?",
    opts: [
      "A part of an address used to find a specific byte inside a block",
      "A type of cache miss",
      "A way to replace old data",
      "A part of an address used to choose the cache line",
    ],
    answer: 0,
    explanation:
      "The offset tells which exact byte or position inside a cache block is being accessed.",
  },

  {
    id: 7,
    q: "What does a direct-mapped cache do?",
    opts: [
      "It lets data go anywhere in the cache",
      "It stores data permanently",
      "It places each memory block in one specific cache location",
      "It removes the need for main memory",
    ],
    answer: 2,
    explanation:
      "In direct mapping, each memory block can only go to one specific cache line.",
  },

  {
    id: 8,
    q: "What does a fully associative cache do?",
    opts: [
      "It only lets data go to one cache line",
      "It stores data on the hard drive",
      "It does not use tags",
      "It lets data be placed in any cache line",
    ],
    answer: 3,
    explanation:
      "A fully associative cache is flexible because a memory block can be placed in any cache line.",
  },

  {
    id: 9,
    q: "What does a set-associative cache do?",
    opts: [
      "It lets data go into a small group of possible cache lines",
      "It stores data permanently",
      "It lets data go into every cache line at once",
      "It lets data go into only one exact cache line",
    ],
    answer: 0,
    explanation:
      "A set-associative cache gives each memory block a set, and the block can go into one of the lines inside that set.",
  },

  {
    id: 10,
    q: "Why is cache memory useful?",
    opts: [
      "It replaces all RAM",
      "It increases hard drive space",
      "It helps the CPU access data faster",
      "It makes files permanent",
    ],
    answer: 2,
    explanation:
      "Cache memory is useful because it helps the CPU quickly access data that is used often.",
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
