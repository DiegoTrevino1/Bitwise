import { useState } from "react";
import "./CacheTest.css";

/* ─── QUESTIONS ─────────────────────────────────────── */
const QUESTIONS = [
  {
    id: 1,
    question: "In direct-mapped cache, what determines which cache line a memory address maps to?",
    options: [
      "The tag bits of the address",
      "The index bits of the address",
      "The offset bits of the address",
      "The most significant bits of the address",
    ],
    correct: 1,
    explanation:
      "In direct-mapped cache, the index bits of a memory address point to exactly one specific cache line. Each address can only map to one possible location in the cache.",
  },
  {
    id: 2,
    question: "What is a cache miss?",
    options: [
      "When the CPU writes data to the wrong location",
      "When the cache is completely full",
      "When the requested data is not found in the cache",
      "When two addresses map to the same cache line",
    ],
    correct: 2,
    explanation:
      "A cache miss occurs when the CPU looks for data in the cache and doesn't find it. The system must then fetch the data from main memory, which takes much longer.",
  },
  {
    id: 3,
    question: "In a memory address, what do the offset bits tell the cache?",
    options: [
      "Which cache set to look in",
      "Which byte to read within a cache line",
      "Whether the data has been modified",
      "How many times the line has been accessed",
    ],
    correct: 1,
    explanation:
      "The offset bits identify the specific byte within a cache line. Since each cache line holds multiple bytes, the offset tells the hardware exactly which byte to read or write.",
  },
  {
    id: 4,
    question: "What makes fully associative cache different from direct-mapped cache?",
    options: [
      "Fully associative cache is smaller",
      "Data can be placed in any cache line — there are no index bits",
      "Fully associative cache uses fewer tag bits",
      "Direct-mapped cache is faster to access",
    ],
    correct: 1,
    explanation:
      "In fully associative cache, any memory block can go into any cache line. There are no index bits — only tag and offset. Every tag must be checked on every access, making it flexible but more complex.",
  },
  {
    id: 5,
    question: "What is the purpose of the tag bits in a memory address?",
    options: [
      "To select which set the data belongs to",
      "To count how many cache lines have been used",
      "To verify that the correct data is stored in a cache line",
      "To indicate the size of the data being accessed",
    ],
    correct: 2,
    explanation:
      "Tag bits are used to verify the data in a cache line actually belongs to the requested address. If the stored tag doesn't match the address's tag, it's a cache miss even if the line is occupied.",
  },
  {
    id: 6,
    question: "A cache has 8 lines and each line holds 16 bytes. How many index bits and offset bits are needed?",
    options: [
      "3 index bits and 4 offset bits",
      "4 index bits and 3 offset bits",
      "8 index bits and 16 offset bits",
      "3 index bits and 8 offset bits",
    ],
    correct: 0,
    explanation:
      "You need enough bits to count every line and every byte. 8 lines needs 3 bits (2³ = 8). 16 bytes per line needs 4 bits (2⁴ = 16). So it's 3 index bits and 4 offset bits.",
  },
  {
    id: 7,
    question: "What is a conflict miss in a direct-mapped cache?",
    options: [
      "A miss caused by the cache being too small to hold all needed data",
      "A miss on the very first access to any memory address",
      "A miss caused by two addresses competing for the same cache line",
      "A miss caused by a write operation overwriting valid data",
    ],
    correct: 2,
    explanation:
      "A conflict miss happens when two or more memory addresses share the same index bits and keep evicting each other from the one cache line they both map to. This can't happen in fully associative cache because data can go anywhere.",
  },
  {
    id: 8,
    question: "In a 2-way set-associative cache, what does '2-way' mean?",
    options: [
      "The cache has exactly 2 sets",
      "Each set contains 2 lines, so a block can go in either line of its set",
      "The cache is split into 2 equal halves",
      "A cache lookup takes exactly 2 clock cycles",
    ],
    correct: 1,
    explanation:
      "In N-way set-associative cache, each set holds N lines. '2-way' means every set has 2 lines, so an incoming block has 2 possible locations within its set. Higher associativity reduces conflict misses but requires more hardware to check tags.",
  },
  {
    id: 9,
    question: "When a cache line is evicted to make room for new data, where does the old data go?",
    options: [
      "It is permanently deleted from the system",
      "It is copied to a register for later use",
      "It is written back to main memory (if it was modified)",
      "It is moved to a different cache line automatically",
    ],
    correct: 2,
    explanation:
      "When a modified (dirty) cache line is evicted, its contents are written back to the corresponding location in main memory so no data is lost. If the line was never written to (clean), it can simply be discarded since main memory already has an identical copy.",
  },
  {
    id: 10,
    question: "Which cache design requires checking the most tags on every memory access?",
    options: [
      "Direct-mapped cache",
      "2-way set-associative cache",
      "4-way set-associative cache",
      "Fully associative cache",
    ],
    correct: 3,
    explanation:
      "Fully associative cache has no index bits, so a block can live in any cache line. To find it, every single tag in the cache must be compared at once. Direct-mapped only ever checks one tag, making it the fastest to search but the most prone to conflict misses.",
  },
];

const TOTAL = QUESTIONS.length;

/* ─── COMPONENT ─────────────────────────────────────── */
export default function CacheTest({ type, onFinish, onBack, existingScore }) {
  const isPost = type === "post";
  const [phase, setPhase]       = useState("intro");   // intro | quiz | result
  const [current, setCurrent]   = useState(0);
  const [selected, setSelected] = useState(null);       // index of selected option or "idk"
  const [confirmed, setConfirmed] = useState(false);
  const [answers, setAnswers]   = useState([]);         // { questionId, chosen, correct }

  const q = QUESTIONS[current];
  const score = answers.filter(a => a.correct).length;

  /* ── handlers ── */
  const handleSelect = (idx) => {
    if (confirmed) return;
    setSelected(idx);
  };

  const handleConfirm = () => {
    if (selected === null) return;
    setConfirmed(true);
  };

  const handleNext = () => {
    const isCorrect = selected === q.correct;
    const newAnswers = [...answers, { questionId: q.id, chosen: selected, correct: isCorrect }];
    setAnswers(newAnswers);

    if (current + 1 < TOTAL) {
      setCurrent(current + 1);
      setSelected(null);
      setConfirmed(false);
    } else {
      const finalScore = newAnswers.filter(a => a.correct).length;
      setPhase("result");
      onFinish(finalScore);
    }
  };

  const improvement = isPost && existingScore !== null ? score - existingScore : null;

  /* ─── INTRO SCREEN ─── */
  if (phase === "intro") {
    return (
      <div className="ct-shell">
        <div className="ct-card ct-intro">
          <button className="ct-back-btn" onClick={onBack}>← Back</button>

          <div className="ct-intro-icon">{isPost ? "🏆" : "📋"}</div>
          <h1 className="ct-intro-title">
            {isPost ? "Post-Assessment" : "Pre-Assessment"}
          </h1>
          <p className="ct-intro-sub">
            {isPost
              ? "You've played all three modes — now see how much you've learned! This is the same quiz as before."
              : "Let's see what you already know about cache mapping. There are no wrong answers here — this just sets your baseline."}
          </p>

          <div className="ct-intro-meta-row">
            <div className="ct-intro-meta">
              <div className="ct-intro-meta-icon">❓</div>
              <div className="ct-intro-meta-val">{TOTAL}</div>
              <div className="ct-intro-meta-lbl">Questions</div>
            </div>
            <div className="ct-intro-meta">
              <div className="ct-intro-meta-icon">⏱️</div>
              <div className="ct-intro-meta-val">~5</div>
              <div className="ct-intro-meta-lbl">Minutes</div>
            </div>
            <div className="ct-intro-meta">
              <div className="ct-intro-meta-icon">💡</div>
              <div className="ct-intro-meta-val">5</div>
              <div className="ct-intro-meta-lbl">Topics</div>
            </div>
          </div>

          {!isPost && (
            <div className="ct-intro-tip">
              💬 Not sure about an answer? Use the <strong>"I don't know"</strong> option — it's always available and helps us understand your starting point.
            </div>
          )}

          <button className="ct-start-btn" onClick={() => setPhase("quiz")}>
            {isPost ? "Start post-assessment →" : "Start pre-assessment →"}
          </button>
        </div>
      </div>
    );
  }

  /* ─── RESULT SCREEN ─── */
  if (phase === "result") {
    const pct = Math.round((score / TOTAL) * 100);
    const grade =
      pct >= 80 ? { label: "Excellent!", emoji: "🌟", color: "#22c55e" }
      : pct >= 60 ? { label: "Good job!", emoji: "👍", color: "#f59e0b" }
      : { label: "Keep going!", emoji: "📚", color: "#8b5cf6" };

    return (
      <div className="ct-shell">
        <div className="ct-card ct-result">
          <div className="ct-result-emoji">{grade.emoji}</div>
          <h1 className="ct-result-title" style={{ color: grade.color }}>
            {grade.label}
          </h1>
          <div className="ct-result-score">
            <span className="ct-result-num">{score}</span>
            <span className="ct-result-denom">/ {TOTAL}</span>
          </div>
          <div className="ct-result-pct">{pct}% correct</div>

          {isPost && improvement !== null && (
            <div className={`ct-result-improvement ${improvement > 0 ? "positive" : improvement < 0 ? "negative" : "neutral"}`}>
              {improvement > 0
                ? `📈 You improved by ${improvement} point${improvement !== 1 ? "s" : ""} from your pre-assessment!`
                : improvement < 0
                ? `📉 Score dropped by ${Math.abs(improvement)} from pre-assessment. Review the material and try again.`
                : "📊 Same score as your pre-assessment. The games reinforced what you already knew!"}
            </div>
          )}

          <div className="ct-result-review">
            <div className="ct-review-title">Question Review</div>
            {answers.map((ans, i) => {
              const qq = QUESTIONS[i];
              const isIdk = ans.chosen === "idk";
              return (
                <div key={qq.id} className={`ct-review-row ${ans.correct ? "correct" : "wrong"}`}>
                  <div className="ct-review-q-num">Q{i + 1}</div>
                  <div className="ct-review-body">
                    <div className="ct-review-question">{qq.question}</div>
                    <div className="ct-review-your-ans">
                      {isIdk
                        ? <span className="ct-ans-idk">You answered: I don't know</span>
                        : <span className={ans.correct ? "ct-ans-correct" : "ct-ans-wrong"}>
                            You answered: {qq.options[ans.chosen]}
                          </span>}
                    </div>
                    {!ans.correct && (
                      <div className="ct-review-correct-ans">
                        ✓ Correct answer: {qq.options[qq.correct]}
                      </div>
                    )}
                    <div className="ct-review-explain">{qq.explanation}</div>
                  </div>
                  <div className="ct-review-icon">{ans.correct ? "✅" : "❌"}</div>
                </div>
              );
            })}
          </div>

          <button className="ct-done-btn" onClick={onBack}>
            ← Back to home
          </button>
        </div>
      </div>
    );
  }

  /* ─── QUIZ SCREEN ─── */
  const isIdkSelected = selected === "idk";
  const isCorrect = confirmed && selected === q.correct;
  const isWrong   = confirmed && selected !== q.correct && selected !== "idk";

  return (
    <div className="ct-shell">
      <div className="ct-card ct-quiz">

        {/* Header */}
        <div className="ct-quiz-header">
          <button className="ct-back-btn" onClick={onBack}>← Back</button>
          <div className="ct-progress-label">
            Question {current + 1} of {TOTAL}
          </div>
          <div className="ct-type-badge">{isPost ? "🏆 Post-Assessment" : "📋 Pre-Assessment"}</div>
        </div>

        {/* Progress bar */}
        <div className="ct-progress-track">
          <div
            className="ct-progress-fill"
            style={{ width: `${((current) / TOTAL) * 100}%` }}
          />
        </div>

        {/* Question */}
        <div className="ct-question-box">
          <div className="ct-q-num">Question {current + 1}</div>
          <div className="ct-q-text">{q.question}</div>
        </div>

        {/* Options */}
        <div className="ct-options">
          {q.options.map((opt, idx) => {
            let cls = "ct-option";
            if (selected === idx && !confirmed) cls += " ct-option-selected";
            if (confirmed) {
              if (idx === q.correct)   cls += " ct-option-correct";
              else if (selected === idx) cls += " ct-option-wrong";
              else cls += " ct-option-dim";
            }
            return (
              <button key={idx} className={cls} onClick={() => handleSelect(idx)} disabled={confirmed}>
                <span className="ct-opt-letter">{String.fromCharCode(65 + idx)}</span>
                <span className="ct-opt-text">{opt}</span>
                {confirmed && idx === q.correct && <span className="ct-opt-tick">✓</span>}
                {confirmed && selected === idx && idx !== q.correct && <span className="ct-opt-cross">✗</span>}
              </button>
            );
          })}

          {/* I don't know — only on pre-test */}
          {!isPost && (
            <button
              className={`ct-option ct-option-idk ${isIdkSelected && !confirmed ? "ct-option-idk-selected" : ""} ${confirmed && isIdkSelected ? "ct-option-idk-confirmed" : ""}`}
              onClick={() => handleSelect("idk")}
              disabled={confirmed}
            >
              <span className="ct-opt-letter ct-opt-letter-idk">?</span>
              <span className="ct-opt-text">I don't know</span>
            </button>
          )}
        </div>

        {/* Explanation after answer */}
        {confirmed && (
          <div className={`ct-explain-box ${isCorrect ? "correct" : isIdkSelected ? "idk" : "wrong"}`}>
            <div className="ct-explain-head">
              {isCorrect ? "✅ Correct!" : isIdkSelected ? "💡 Here's the answer:" : "❌ Not quite —"}
            </div>
            <div className="ct-explain-text">
              {!isCorrect && !isIdkSelected && (
                <div className="ct-explain-correct">
                  Correct answer: <strong>{q.options[q.correct]}</strong>
                </div>
              )}
              {q.explanation}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="ct-actions">
          {!confirmed ? (
            <button
              className="ct-confirm-btn"
              onClick={handleConfirm}
              disabled={selected === null}
            >
              Confirm Answer →
            </button>
          ) : (
            <button className="ct-next-btn" onClick={handleNext}>
              {current + 1 < TOTAL ? "Next Question →" : "See Results →"}
            </button>
          )}
        </div>

      </div>
    </div>
  );
}
