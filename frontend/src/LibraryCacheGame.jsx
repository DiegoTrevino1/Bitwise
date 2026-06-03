import { useState } from "react";
import "./LibraryCacheGame.css";
import { postProgress } from "./api";
import { CONFIGS, MODE_INSTRUCTIONS, MODE_DESCRIPTIONS } from "./GameConfigs";

function renderParts(parts) {
  return parts.map((part, i) => {
    if (typeof part === "string") return part;
    if (part.badge)              return <span key={i} className={`lcg-instr-badge lcg-mc-badge-${part.badge}`}>{part.text}</span>;
    if (part.strong !== undefined) return <strong key={i}>{part.strong}</strong>;
    if (part.sub)                return <ul key={i}>{part.sub.map((s, j) => <li key={j}>{renderParts(s)}</li>)}</ul>;
    return null;
  });
}

function InstructionsPanel({ mode }) {
  const steps = MODE_INSTRUCTIONS[mode];
  if (!steps) return null;
  return (
    <div className="lcg-instructions">
      <div className="lcg-instructions-title">How to answer</div>
      <ol className="lcg-instructions-steps">
        {steps.map((step, i) => <li key={i}>{renderParts(step)}</li>)}
      </ol>
    </div>
  );
}


const DIRECT_DIFFICULTY_OPTIONS = [
  { id: "easy",   label: "Easy",   description: "Standard 8-line direct mapping with tag/index/offset labels visible." },
  { id: "medium", label: "Medium", description: "Vary cache size and address width while keeping direct mapping rules." },
  { id: "hard",   label: "Hard",   description: "Same as Medium, but the address parts are not labeled for the player." },
];

const DIRECT_DIFFICULTY_PRESETS = [
  { lines: 8, offsetBits: 1, totalBits: 8 },
  { lines: 8, offsetBits: 2, totalBits: 9 },
  { lines: 4, offsetBits: 1, totalBits: 7 },
  { lines: 16, offsetBits: 1, totalBits: 10 },
  { lines: 16, offsetBits: 2, totalBits: 11 },
];

const randomItem = (items) => items[Math.floor(Math.random() * items.length)];

function createDirectConfig(difficulty) {
  const difficultyOption = DIRECT_DIFFICULTY_OPTIONS.find((opt) => opt.id === difficulty) || DIRECT_DIFFICULTY_OPTIONS[0];
  const preset = difficulty === "easy"
    ? DIRECT_DIFFICULTY_PRESETS[0]
    : randomItem(DIRECT_DIFFICULTY_PRESETS.slice(1));

  const indexBits = Math.log2(preset.lines);
  const tagBits = preset.totalBits - indexBits - preset.offsetBits;

  return {
    ...CONFIGS.direct,
    lines: preset.lines,
    tagBits,
    indexBits,
    offsetBits: preset.offsetBits,
    totalBits: preset.totalBits,
    difficulty: difficultyOption.id,
    difficultyLabel: difficultyOption.label,
    difficultyDescription: difficultyOption.description,
    hideAddressLabels: difficulty === "hard",
  };
}

/* ─────────────────────────────────────────────────────────────
   QUESTION GENERATION  (fully self-contained — no backend)
───────────────────────────────────────────────────────────── */

function generateQuestions(cfg, count = 10) {
  let questions = []; //array of generated questions
  const randomBits = (len) => Math.floor(Math.random() * Math.pow(2, len)).toString(2).padStart(len, "0"); //function to generate random binary string
  const cacheLines = Array.from({ length: cfg.lines }, () => ({ tag: randomBits(cfg.tagBits), data: true })); 
  let indexVal = null; //Direct: index bits of the address
  let setVal = null; //Set: set bits of the address
  let lineIdx = null; //the index of the cache line the address should be pointing to
  let setIdx = null; //Set: the index of the set the address should be pointing to
  let offsetVal = null; //the offset bits of the address
  let tagVal = null; //the tag bits of the address
  let addr = null; //the combined address
  let correctLine = null; 
  let correctOffset = null;
  let isHit = null; //whether the question should be a hit or a miss
  let explanation = ""; //explanation of the correct answer

  console.log("mode: ", cfg.id, "generating questions");
  //generate questions
  for (let i = 0; i < count; i++) {
    //randomly decide if the question will be a hit or a miss (35% hit rate)
    isHit= Math.random() > 0.35;

    //find the mode
    switch (cfg.mode) {
      case "direct":
        //generate index,offset, and tag  
        indexVal = randomBits(cfg.indexBits);
        lineIdx = parseInt(indexVal, 2)%cfg.lines;
        offsetVal = randomBits(cfg.offsetBits);
        tagVal = cacheLines[lineIdx].tag;
        addr = tagVal + indexVal + offsetVal;
        correctOffset = parseInt(offsetVal, 2);
        correctLine = lineIdx;

        //if the question should be a miss, change the tag so they don't match
        if (!isHit) {
          let tries = 0;
          do {
            tagVal = randomBits(cfg.tagBits);
            tries += 1;
          } while (tagVal === cacheLines[lineIdx].tag && tries < 10);
          addr = tagVal + indexVal + offsetVal; 
          console.log(`new tagVal: ${tagVal}, new addr: ${addr}`);
          explanation = `Cache MISS. Index bits ${indexVal} map to line ${lineIdx}, but the stored tag (${cacheLines[lineIdx].tag}) does not match tag ${tagVal}. Select "Cache miss" to indicate a miss.`;
        }
        else {
            explanation = `Cache HIT. Index bits ${indexVal} = line ${lineIdx}. The stored tag ${tagVal} matches, Offset bit ${offsetVal} matches byte ${parseInt(offsetVal, 2)}`;
        }
        break; 
      case "set":
        //generate the set, offset, and tag  
        setVal = randomBits(cfg.setBits);
        setIdx = parseInt(setVal, 2)%cfg.sets;
        //pick a random line within the set
        lineIdx = setIdx * cfg.waysPerSet + Math.floor(Math.random() * cfg.waysPerSet);
        tagVal = cacheLines[lineIdx].tag;
        offsetVal = randomBits(cfg.offsetBits);
        addr = tagVal + setVal + offsetVal;
        correctLine = lineIdx;
        correctOffset = parseInt(offsetVal, 2);

        //if the question should be a miss, change the tag
        if(!isHit) {
          let tries = 0;
          do {
            tagVal = randomBits(cfg.tagBits);
            tries += 1;
          } while (tagVal === cacheLines[lineIdx].tag && tries < 10);
          addr = tagVal + setVal + offsetVal; 
          explanation = `Cache MISS. Set bits ${setVal} map to set ${setIdx}, but no line in that set has a matching tag. Select "Cache miss" to indicate a miss.`;
        }
        else {
          explanation = `Cache HIT. Set bits ${setVal} = set ${setIdx}. Line ${lineIdx} within that set has a matching tag ${tagVal}. Offset bits ${offsetVal} match byte ${parseInt(offsetVal, 2)}.`;
        }

        break;
      case "associative":
        //generate the correct line
        lineIdx = Math.floor(Math.random() * cfg.lines);
        //from the correct line get the tag
        tagVal = cacheLines[lineIdx].tag.toString(2);
        //generate the offset
        offsetVal = randomBits(cfg.offsetBits);
        //combine to get full address
        addr = tagVal + offsetVal;
        correctLine = lineIdx;
        correctOffset = parseInt(offsetVal, 2);
        
        //if the question should be a miss change the tag
        if(!isHit) {
          let tries = 0;
          do {
            tagVal = randomBits(cfg.tagBits);
            tries += 1;
          } while (tagVal === cacheLines[lineIdx].tag && tries < 10);
          addr = tagVal + offsetVal;
          explanation = 'Cache MISS. No line has a matching tag. Select "Cache miss" to indicate a miss.';
        }
        else {
          explanation = `Cache HIT. Line ${lineIdx} has a matching tag ${tagVal}. Offset bits ${offsetVal} match byte ${parseInt(offsetVal, 2)}.`;
        }
        break;
    }
    //if the user is a test account, print the question details for debugging
    console.log(`Question ${i+1}: Line: ${lineIdx}, offset: ${offsetVal}, tagVal: ${tagVal}, stored tag: ${cacheLines[lineIdx].tag}, isHit: ${isHit}, addr: ${addr}`);
    questions[i] = {addr, tagVal, setVal, indexVal, offsetVal, correctLine, correctOffset, isHit, explanation, cacheSnapshot: cacheLines.map(l => ({ ...l }))};
  }
  return questions;
}

/* ─────────────────────────────────────────────────────────────
   ADDRESS BITS DISPLAY
───────────────────────────────────────────────────────────── */

function AddressBits({ addr, cfg }) {
  const tagBits    = addr.slice(0, cfg.tagBits);
  const setBits    = cfg.setBits    > 0 ? addr.slice(cfg.tagBits, cfg.tagBits + cfg.setBits) : null;
  const indexBits  = cfg.indexBits  > 0 ? addr.slice(cfg.tagBits, cfg.tagBits + cfg.indexBits) : null;
  const actualOffset = cfg.tagBits + cfg.setBits + cfg.indexBits;
  const offsetBits = addr.slice(actualOffset, actualOffset + cfg.offsetBits);

  const parts = cfg.hideAddressLabels
    ? [{ bits: addr, cls: "unknown", label: null, len: cfg.totalBits }]
    : [
      { bits: tagBits,   cls: "tag",    label: "Tag",    len: cfg.tagBits },
      cfg.setBits   > 0 && { bits: setBits,   cls: "set",    label: "Set",    len: cfg.setBits },
      cfg.indexBits > 0 && { bits: indexBits, cls: "index",  label: "Index",  len: cfg.indexBits },
      { bits: offsetBits, cls: "offset", label: "Offset", len: cfg.offsetBits },
    ].filter(Boolean);

  return (
    <div className="lcg-addr-wrap">
      <div className="lcg-addr-bits">
        {parts.map((p) => p.bits.split("").map((b, i) => (
          <span key={(p.cls || "unknown") + i} className={`lcg-bit${p.cls ? ` lcg-bit-${p.cls}` : ""}`}>{b}</span>
        )))}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   CACHE TABLE
───────────────────────────────────────────────────────────── */

function CacheTable({ cfg, cacheSnapshot, selectedLine, selectedOffset, feedback, correctLine, correctOffset, onSelectLine }) {
  const offsetCount = Math.pow(2, cfg.offsetBits || 0);
  const renderRow = (lineIdx, label, sublabel) => {
    const entry = cacheSnapshot[lineIdx];
    const selRow = selectedLine === lineIdx;
    const rowCorrect = feedback === "correct" && (cfg.mode === "direct" ? (selRow && selectedOffset === correctOffset) : selRow);
    const rowWrong = feedback === "wrong" && selRow && (cfg.mode === "direct" ? selectedOffset !== correctOffset : true);
    const rowAnswer = feedback === "wrong" && correctLine === lineIdx;


    const sel = selRow;
    const ok  = feedback === "correct" && sel;
    const bad = feedback === "wrong"   && sel;
    const ans = feedback === "wrong"   && correctLine === lineIdx;
    return (
      <button
        key={lineIdx}
        className={`lcg-cache-row lcg-cache-row-btn ${sel ? "lcg-row-selected" : ""} ${ok ? "lcg-row-correct" : ""} ${bad ? "lcg-row-wrong" : ""} ${ans ? "lcg-row-answer" : ""}`}
        onClick={() => feedback === null && onSelectLine(lineIdx, null)}
        disabled={feedback !== null}
      >
        <div className="lcg-td lcg-td-line">{label}{sublabel && <span className="lcg-td-sub">{sublabel}</span>}</div>
        <div className="lcg-td lcg-td-tag">{entry.tag ?? <span className="lcg-empty">—</span>}</div>
        
        
        <div className="lcg-td lcg-td-offsets">
            {Array.from({ length: offsetCount }, (_, off) => {
              const isSel = selRow && selectedOffset === off;
              const isAns = feedback === "wrong" && rowAnswer && off === correctOffset;
              const isOk  = feedback === "correct" && isSel && selectedOffset === correctOffset;
              return (
                <button
                  key={off}
                  type="button"
                  className={`lcg-offset-btn ${isSel ? "lcg-offset-selected" : ""} ${isOk ? "lcg-offset-correct" : ""} ${isAns ? "lcg-offset-answer" : ""}`}
                  onClick={(e) => { e.stopPropagation(); feedback === null && onSelectLine(lineIdx, off); }}
                  disabled={feedback !== null}
                >
                  {off}
                </button>
              );
            })}
          </div>
      </button>
    );
  };

  return (
    <div className="lcg-cache-table">
      <div className="lcg-cache-thead">
        <div className="lcg-th lcg-th-line">{cfg.mode === "set" ? "Set" : "Line"}</div>
        <div className="lcg-th lcg-th-tag">Stored tag</div>
        <div className="lcg-th lcg-th-data">byte</div>
      </div>
      {cfg.mode === "set"
        ? Array.from({ length: cfg.sets }, (_, s) =>
            Array.from({ length: cfg.waysPerSet }, (_, w) =>
              renderRow(s * cfg.waysPerSet + w, `Set ${s}`, `Line ${w}`)
            )
          )
        : Array.from({ length: cfg.lines }, (_, i) => renderRow(i, `Line ${i}`, null))
      }
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────────── */

export default function LibraryCacheGame({ onBack, onHome, initialMode }) {
  const [activeMode,    setActiveMode]    = useState(null);
  const [pendingMode,   setPendingMode]   = useState(null);
  const [questions,     setQuestions]     = useState([]);
  const [qIdx,          setQIdx]          = useState(0);
    const [selectedLine,  setSelectedLine]  = useState(null);
    const [selectedOffset,setSelectedOffset]= useState(null);
    const [selectedMiss,  setSelectedMiss]   = useState(false);
  const [feedback,      setFeedback]      = useState(null);
  const [score,         setScore]         = useState(0);
  const [correctCount,  setCorrectCount]  = useState(0);
  const [phase,         setPhase]         = useState("select");

  const startMode = (modeId, difficulty = "easy") => {
    const cfg = modeId === "direct" ? createDirectConfig(difficulty) : CONFIGS[modeId];
    setActiveMode(cfg);
    setPendingMode(null);
    setQuestions(generateQuestions(cfg, 10));
    setQIdx(0);
    setSelectedLine(null);
    setSelectedOffset(null);
    setSelectedMiss(false);
    setFeedback(null);
    setScore(0);
    setCorrectCount(0);
    setPhase("play");
  };

  const retry = () => activeMode && startMode(activeMode.id, activeMode.difficulty || "easy");

  const q   = questions[qIdx] ?? null;
  const cfg = activeMode;

  const handleSubmit = () => {
    if (feedback !== null || !q) return;
    if (selectedMiss) {
      const isCorrect = !q.isHit;
      setFeedback(isCorrect ? "correct" : "wrong");
      if (isCorrect) { setScore((s) => s + 100); setCorrectCount((c) => c + 1); }
      return;
    }
    if (cfg.mode === "direct") {
      console.log("Submition: selectedLine: ", selectedLine, "selectedOffset: ", selectedOffset, "correctLine: ", q.correctLine, "correctOffset: ", q.correctOffset);
      if (selectedLine === null || selectedOffset === null) return;
      const isCorrect = q.correctLine === selectedLine && selectedOffset === q.correctOffset;
      setFeedback(isCorrect ? "correct" : "wrong");
      if (isCorrect) { setScore((s) => s + 100); setCorrectCount((c) => c + 1); }
      return;
    }
    if (selectedLine === null) return;
    const isCorrect = q.correctLine === selectedLine;
    setFeedback(isCorrect ? "correct" : "wrong");
    if (isCorrect) { setScore((s) => s + 100); setCorrectCount((c) => c + 1); }
  };

  const handleNext = () => {
    if (qIdx + 1 >= questions.length) {
      postProgress({ gameId: "cache", modeId: cfg.id, score, accuracy: correctCount / questions.length, xpEarned: score }).catch(() => {});
      setPhase("summary");
    } else {
      setQIdx((i) => i + 1);
      setSelectedLine(null);
      setSelectedOffset(null);
      setSelectedMiss(false);
      setFeedback(null);
    }
  };

  /* ── SELECT ── */
  if (phase === "select") {
    return (
      <div className="lcg-shell">
        <div className="lcg-topbar">
          <button className="lcg-back-btn" onClick={onBack}>← Back</button>
          <div className="lcg-topbar-title">Bitwise — Cache Mapping</div>
        </div>
        <div className="lcg-select-body">
          <div className="lcg-select-hero">
            <div className="lcg-select-eyebrow">Cache Mapping Game</div>
            <h2 className="lcg-select-title">Choose a difficulty</h2>
            <p className="lcg-select-sub">Pick how challenging you want this session to be.</p>
          </div>
          <div className="lcg-mode-grid">
            {Object.values(CONFIGS).filter((c) => !initialMode || c.mode === initialMode).map((c) => (
              <button
                key={c.id}
                className="lcg-mode-card"
                style={{ "--mc": c.color, "--mcl": c.colorLight, "--mcb": c.colorBorder, "--mcd": c.colorDark }}
                onClick={() => {
                  if (c.id === "direct") {
                    setPendingMode("direct");
                    setPhase("difficulty");
                  } else {
                    startMode(c.id);
                  }
                }}
              >
                <div className="lcg-mc-label">{c.label}</div>
                <p className="lcg-mc-desc">{c.description}</p>
                <div className="lcg-mc-bits">
                  {c.rules.map((r) => (
                    <div key={r.part} className="lcg-mc-bit-row">
                      <span className={`lcg-mc-badge lcg-mc-badge-${r.part}`}>{r.part}</span>
                      <span className="lcg-mc-role">{r.role}</span>
                    </div>
                  ))}
                </div>
                <div className="lcg-mc-play">Play →</div>
              </button>
            ))}
          </div>
          <div className="howto-panel">
            <InstructionsPanel mode={initialMode} />
          </div>
        </div>
      </div>
    );
  }



  /* ── SUMMARY ── */
  if (phase === "summary") {
    const pct = Math.round((correctCount / questions.length) * 100);
    return (
      <div className="lcg-shell">
        <div className="lcg-topbar">
          <button className="lcg-back-btn" onClick={() => setPhase("select")}>← Modes</button>
          <div className="lcg-topbar-title">Bitwise — {cfg.label}{cfg.difficultyLabel ? ` · ${cfg.difficultyLabel}` : ""}</div>
          <button className="lcg-home-btn" onClick={onHome}>Home</button>
        </div>
        <div className="lcg-summary-wrap">
          <div className="lcg-summary-card" style={{ "--mc": cfg.color, "--mcl": cfg.colorLight, "--mcb": cfg.colorBorder }}>
            <div className="lcg-summary-icon">{pct >= 80 ? "🏆" : pct >= 60 ? "📈" : "🔁"}</div>
            <h2 className="lcg-summary-title">{pct >= 80 ? "Excellent work!" : pct >= 60 ? "Good effort!" : "Keep practicing!"}</h2>
            <p className="lcg-summary-mode">{cfg.label}</p>
            <div className="lcg-summary-stats">
              <div className="lcg-stat-box"><div className="lcg-stat-num">{score}</div><div className="lcg-stat-lbl">XP earned</div></div>
              <div className="lcg-stat-box"><div className="lcg-stat-num">{pct}%</div><div className="lcg-stat-lbl">Accuracy</div></div>
              <div className="lcg-stat-box"><div className="lcg-stat-num">{correctCount}/{questions.length}</div><div className="lcg-stat-lbl">Correct</div></div>
            </div>
            <div className="lcg-summary-actions">
              <button className="lcg-btn-retry" onClick={retry}>↺ Retry this mode</button>
              <button className="lcg-btn-modes" onClick={() => setPhase("select")}>All modes</button>
              <button className="lcg-btn-home"  onClick={onHome}>Home</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /* ── PLAY ── */
  if (!q) return null;

  return (
    <div className="lcg-shell">
      <div className="lcg-topbar">
        <button className="lcg-back-btn" onClick={() => setPhase("select")}>← Modes</button>
        <div className="lcg-topbar-center">
          <span className="lcg-topbar-mode" style={{ color: cfg.colorBorder }}>{cfg.label}{cfg.difficultyLabel ? ` · ${cfg.difficultyLabel}` : ""}</span>
          <div className="lcg-progress-track">
            <div className="lcg-progress-fill" style={{ width: `${(qIdx / questions.length) * 100}%`, background: cfg.color }} />
          </div>
          <span className="lcg-progress-label">{qIdx + 1} / {questions.length}</span>
        </div>
        <div className="lcg-score-pill" style={{ background: cfg.colorLight, borderColor: cfg.colorBorder, color: cfg.colorDark }}>
          {score} XP
        </div>
      </div>

      <div className="lcg-play-layout">
        <div className="lcg-left">
          <div className="lcg-question-card" style={{ "--mc": cfg.color, "--mcl": cfg.colorLight, "--mcb": cfg.colorBorder }}>
            <div className="lcg-qcard-header">
              <span className="lcg-qcard-eyebrow">Memory access #{qIdx + 1}</span>
            </div>

            <div className="lcg-addr-row-label">{cfg.totalBits}-bit address</div>
            <AddressBits addr={q.addr} cfg={cfg} />

            {!cfg.hideAddressLabels && (
              <div className="lcg-decoded-rows">
                <div className="lcg-decoded-row">
                  <span className="lcg-decoded-badge lcg-decoded-tag">tag</span>
                  <code className="lcg-decoded-bin">{q.tagVal}</code>
                  <span className="lcg-decoded-role">
                    {cfg.mode === "associative" ? "Identify line by comparing tags" : cfg.mode === "set" ? "Identify row within its set" : "Verify correct data is stored"}
                  </span>
                </div>
                {cfg.setBits > 0 && (
                  <div className="lcg-decoded-row">
                    <span className="lcg-decoded-badge lcg-decoded-set">set</span>
                    <code className="lcg-decoded-bin">{q.setVal}</code>
                    <span className="lcg-decoded-role">{"maps to a set"}</span>
                  </div>
                )}
                {cfg.indexBits > 0 && (
                  <div className="lcg-decoded-row">
                    <span className="lcg-decoded-badge lcg-decoded-index">index</span>
                    <code className="lcg-decoded-bin">{q.indexVal}</code>
                    <span className="lcg-decoded-role">{"maps to a line"}</span>
                  </div>
                )}
                <div className="lcg-decoded-row">
                  <span className="lcg-decoded-badge lcg-decoded-offset">offset</span>
                  <code className="lcg-decoded-bin">{q.offsetVal}</code>
                  <span className="lcg-decoded-role">{"which byte within the line"}</span>
                </div>
              </div>
            )}
            {cfg.hideAddressLabels && cfg.mode === "direct" && (
              <div className="lcg-decoded-rows">
                <div className="lcg-decoded-row">
                  <span>The memory size requires there to be {cfg.indexBits} index bits.</span>
                </div>
              </div>
            )}

            <div className="lcg-question-prompt">
              {cfg.hideAddressLabels && "The address parts are hidden in Hard mode. "}
              {cfg.mode === "direct" && "Which cache line and byte does this address map to? Click the correct byte in the cache table."}
              {cfg.mode === "set"         && "Which set does this address belong to? Click the line with the matching tag within that set."}
              {cfg.mode === "associative" && "Where can this address go? If a tag matches click that line — otherwise click cache miss"}
            </div>
          </div>

          {feedback === null && (
            <>
              <button
                className="lcg-submit-btn"
                style={{ background: cfg.color }}
                onClick={handleSubmit}
                disabled={selectedMiss ? false : (cfg.mode === "direct" ? (selectedLine === null || selectedOffset === null) : (selectedLine === null))}
              >
                {selectedMiss ? "Submit cache miss" : (cfg.mode === "direct" ? (selectedLine === null || selectedOffset === null ? "← Select a line and byte in the cache table" : "Submit answer →") : (selectedLine === null ? "← Select a line in the cache table" : "Submit answer →"))}
              </button>

              <button
                type="button"
                className={`lcg-miss-btn ${selectedMiss ? "lcg-miss-selected" : ""} ${!q.isHit && feedback !== null ? "lcg-miss-answer" : ""} ${feedback === "wrong" && selectedMiss && q.isHit ? "lcg-miss-wrong" : ""}`}
                onClick={() => { if (feedback === null) { setSelectedMiss((s) => !s); setSelectedLine(null); setSelectedOffset(null); } }}
              >
                Cache miss
              </button>
            </>
          )}

          <InstructionsPanel mode={cfg.mode} />

          {feedback === "correct" && (
            <div className="lcg-feedback lcg-feedback-correct">
              <div className="lcg-fb-icon">✓</div>
              <div className="lcg-fb-title">Correct!</div>
              <p className="lcg-fb-body">{q.explanation}</p>
              <button className="lcg-btn-next" style={{ background: cfg.color }} onClick={handleNext}>
                {qIdx + 1 < questions.length ? "Next →" : "See results →"}
              </button>
            </div>
          )}

          {feedback === "wrong" && (
            <div className="lcg-feedback lcg-feedback-wrong">
              <div className="lcg-fb-icon">✗</div>
              <div className="lcg-fb-title">Not quite</div>
              <p className="lcg-fb-body">{q.explanation}</p>
              <p className="lcg-fb-hint">{!q.isHit ? 'The correct answer is "Cache miss".' : 'The correct line is highlighted green in the cache table.'}</p>
              <button className="lcg-btn-next" style={{ background: cfg.color }} onClick={handleNext}>
                {qIdx + 1 < questions.length ? "Next →" : "See results →"}
              </button>
            </div>
          )}
        </div>

        {/* RIGHT: cache table */}
        <div className="lcg-right">
          <div className="lcg-cache-header">
            <span className="lcg-cache-title">Cache state</span>
            <span className="lcg-cache-meta">
              {cfg.mode === "set" ? `${cfg.sets} sets · ${cfg.waysPerSet} ways each · ${cfg.lines} total lines`
                                : `${cfg.lines} lines`}
            </span>
          </div>
          <CacheTable
            cfg={cfg}
            cacheSnapshot={q.cacheSnapshot}
            selectedLine={selectedLine}
            selectedOffset={selectedOffset}
            feedback={feedback}
            correctLine={q.correctLine}
            correctOffset={q.correctOffset}
            onSelectLine={(i, off) => { setSelectedLine(i); setSelectedOffset(off); }}
          />
        </div>
      </div>
    </div>
  );
}
