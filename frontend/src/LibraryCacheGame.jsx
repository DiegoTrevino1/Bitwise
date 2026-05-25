import { useState } from "react";
import "./LibraryCacheGame.css";
import { postProgress } from "./api";

/* ─────────────────────────────────────────────────────────────
   CACHE CONFIGURATIONS PER MODE
   ─────────────────────────────────────────────────────────────
   Direct mapping   : 8 lines, 8-bit addr → tag(4) | index(3) | offset(1)
   Set-associative  : 8 lines, 4 sets × 2 ways, 8-bit addr → tag(5) | set(2) | offset(1)
   Fully associative: 8 lines, 8-bit addr → tag(7) | offset(1)
*/

const CONFIGS = {
  directEasy: {
    id: "directEasy",
    mode: "direct",
    label: "Direct Mapping Easy",
    color: "#22c55e",
    colorLight: "#f0fdf4",
    colorBorder: "#86efac",
    colorDark: "#14532d",
    lines: 8,
    sets: null,
    waysPerSet: null,
    tagBits: 4,
    indexBits: 3,
    setBits: 0,
    offsetBits: 1,
    totalBits: 8,
    description: "Each memory address maps to exactly one cache line determined by the index bits. Use the index to find the line, then check the tag to confirm it holds the right data.",
    rules: [
      { part: "tag",    role: "Verify: does the stored tag match? If not → cache miss" },
      { part: "index",  role: "Locate: the one and only line this address can occupy" },
      { part: "offset", role: "Select: which byte within the cache line" },
    ],
  },
  directMedium: {
    id: "directMedium",
    mode: "direct",
    label: "Direct Mapping Medium",
    color: "#22c55e",
    colorLight: "#f0fdf4",
    colorBorder: "#86efac",
    colorDark: "#14532d",
    lines: 8,
    sets: null,
    waysPerSet: null,
    tagBits: 4,
    indexBits: 4,
    setBits: 0,
    offsetBits: 2,
    totalBits: 10,
    description: "Each memory address maps to exactly one cache line determined by the index bits. Use the index to find the line, then check the tag to confirm it holds the right data.",
    rules: [
      { part: "tag",    role: "Verify: does the stored tag match? If not → cache miss" },
      { part: "index",  role: "Locate: the one and only line this address can occupy" },
      { part: "offset", role: "Select: which byte within the cache line" },
    ],
  },
  directHard: {
    id: "directHard",
    mode: "direct",
    label: "Direct Mapping Hard",
    color: "#22c55e",
    colorLight: "#f0fdf4",
    colorBorder: "#86efac",
    colorDark: "#14532d",
    lines: 8,
    sets: null,
    waysPerSet: null,
    tagBits: 4,
    indexBits: 5,
    setBits: 0,
    offsetBits: 2,
    totalBits: 11,
    hideAddressLabels: true,
    description: "Each memory address maps to exactly one cache line determined by the index bits. Use the index to find the line, then check the tag to confirm it holds the right data.",
    rules: [
      { part: "tag",    role: "Verify: does the stored tag match? If not → cache miss" },
      { part: "index",  role: "Locate: the one and only line this address can occupy" },
      { part: "offset", role: "Select: which byte within the cache line" },
    ],
  },
  set: {
    id: "set",
    mode: "set",
    label: "Set-Associative",
    color: "#f59e0b",
    colorLight: "#fffbeb",
    colorBorder: "#fbbf24",
    colorDark: "#78350f",
    lines: 8,
    sets: 4,
    waysPerSet: 2,
    tagBits: 5,
    indexBits: 0,
    setBits: 2,
    offsetBits: 1,
    totalBits: 8,
    description: "The cache is split into sets, each holding multiple lines. Set bits identify which set this address belongs to. The data can be placed in any line within that set. Tag bits identify which specific line holds the data.",
    rules: [
      { part: "tag",    role: "Identify: which line in the set holds this data — miss if no tags match" },
      { part: "set",    role: "Locate: which set of lines this address belongs to" },
      { part: "offset", role: "Select: which byte within the cache line" },
    ],
  },
  associative: {
    id: "associative",
    label: "Fully Associative",
    color: "#8b5cf6",
    colorLight: "#f5f3ff",
    colorBorder: "#c4b5fd",
    colorDark: "#4c1d95",
    lines: 8,
    sets: null,
    waysPerSet: null,
    tagBits: 7,
    indexBits: 0,
    setBits: 0,
    offsetBits: 1,
    totalBits: 8,
    description: "Memory can be placed in any cache line — there are no index or set bits. Every tag in every line must be compared on each lookup. A miss only occurs when no stored tag matches.",
    rules: [
      { part: "tag",    role: "Compare ALL lines — if no stored tag matches → cache miss" },
      { part: "offset", role: "Select: which byte within the cache line" },
    ],
  },
};

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
  let offsetVal = null; //the offset bits of the address
  let tagVal = null; //the tag bits of the address
  let addr = null; //the combined address
  let correctLine = null; 
  let correctOffset = null;
  let isHit = null;
  let explanation = "";

  console.log("mode: ", cfg.id, "generating questions");
  for (let i = 0; i < count; i++) {
    isHit= Math.random() > 0.35;

    switch (cfg.mode) {
      case "direct":
        indexVal = randomBits(cfg.indexBits);
        lineIdx = parseInt(indexVal, 2)%cfg.lines;
        offsetVal = randomBits(cfg.offsetBits);
        tagVal = cacheLines[lineIdx].tag;
        addr = tagVal + indexVal + offsetVal;
        correctOffset = parseInt(offsetVal, 2);
        correctLine = lineIdx;

        console.log(`Question ${i+1}: Line: ${lineIdx}, Initial tagVal: ${tagVal}, stored tag: ${cacheLines[lineIdx].tag}, isHit: ${isHit}, addr: ${addr}`);
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

        break;
      case "associative":

        break;
    }
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
    const rowCorrect = feedback === "correct" && (cfg.id === "direct" ? (selRow && selectedOffset === correctOffset) : selRow);
    const rowWrong = feedback === "wrong" && selRow && (cfg.id === "direct" ? selectedOffset !== correctOffset : true);
    const rowAnswer = feedback === "wrong" && correctLine === lineIdx;

    if (cfg.id === "direct") {
      return (
        <button
          key={lineIdx}
          className={`lcg-cache-row lcg-cache-row-btn lcg-cache-row-direct ${selRow ? "lcg-row-selected" : ""} ${rowCorrect ? "lcg-row-correct" : ""} ${rowWrong ? "lcg-row-wrong" : ""} ${rowAnswer ? "lcg-row-answer" : ""}`}
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
    }

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
        <div className="lcg-th lcg-th-line">{cfg.id === "set" ? "Set / Way" : "Line"}</div>
        <div className="lcg-th lcg-th-tag">Stored tag</div>
        <div className="lcg-th lcg-th-data">{"byte"}</div>
      </div>
      {cfg.id === "set"
        ? Array.from({ length: cfg.sets }, (_, s) =>
            Array.from({ length: cfg.waysPerSet }, (_, w) =>
              renderRow(s * cfg.waysPerSet + w, `Set ${s}`, `Way ${w}`)
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

export default function LibraryCacheGame({ onBack, onHome }) {
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
          <button className="lcg-home-btn" onClick={onHome}>Home</button>
        </div>
        <div className="lcg-select-body">
          <div className="lcg-select-hero">
            <div className="lcg-select-eyebrow">Cache Mapping Game</div>
            <h2 className="lcg-select-title">Choose a mapping mode</h2>
            <p className="lcg-select-sub">Each mode teaches a different strategy. Concepts build — start with Direct Mapping.</p>
          </div>
          <div className="lcg-mode-grid">
            {Object.values(CONFIGS).map((c) => (
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
            <div className="howto-title">How to play</div>
            <ol className="howto-steps">
              <li>An address appears, colour-coded to show <strong>tag</strong>, <strong>index/set</strong>, and <strong>offset</strong> bits.</li>
              <li>The current cache state is shown in the table on the right with any stored tags.</li>
              <li>Use the address parts to decide which cache line this address belongs to, then click that row.</li>
              <li>Press <em>Submit</em> to check. You'll see whether it was a <strong>hit</strong> (tag already matched) or a <strong>miss</strong> (must load), with a full explanation.</li>
            </ol>
          </div>
        </div>
      </div>
    );
  }

  /* ── DIFFICULTY SELECT ── */
  if (phase === "difficulty" && pendingMode === "direct") {
    return (
      <div className="lcg-shell">
        <div className="lcg-topbar">
          <button className="lcg-back-btn" onClick={() => { setPendingMode(null); setPhase("select"); }}>← Back</button>
          <div className="lcg-topbar-title">Bitwise — Direct Mapping</div>
          <button className="lcg-home-btn" onClick={onHome}>Home</button>
        </div>
        <div className="lcg-select-body">
          <div className="lcg-select-hero">
            <div className="lcg-select-eyebrow">Direct Mapping</div>
            <h2 className="lcg-select-title">Choose difficulty</h2>
            <p className="lcg-select-sub">Pick a direct-mapping challenge level. Medium varies cache size and address width, and Hard hides the labeled address fields.</p>
          </div>
          <div className="lcg-mode-grid">
            {DIRECT_DIFFICULTY_OPTIONS.map((option) => (
              <button
                key={option.id}
                className="lcg-mode-card"
                style={{ "--mc": "#22c55e", "--mcl": "#f0fdf4", "--mcb": "#86efac", "--mcd": "#14532d" }}
                onClick={() => startMode("direct", option.id)}
              >
                <div className="lcg-mc-label">{option.label}</div>
                <p className="lcg-mc-desc">{option.description}</p>
                <div className="lcg-mc-play">Start →</div>
              </button>
            ))}
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
          <span className="lcg-topbar-mode" style={{ color: cfg.color }}>{cfg.label}{cfg.difficultyLabel ? ` · ${cfg.difficultyLabel}` : ""}</span>
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
        {/* LEFT: address decoder + question */}
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
                    {cfg.id === "associative" ? "compare every cache line" : cfg.id === "set" ? "identify row within its set" : "verify correct data is stored"}
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

            <div className="lcg-question-prompt">
              {cfg.id === "direct" && cfg.hideAddressLabels && "The address parts are hidden in Hard mode. Use the bit pattern to identify the correct line and byte."}
              {cfg.id === "direct" && !cfg.hideAddressLabels && "Which cache line and byte does this address map to? Click the correct byte in the cache table."}
              {cfg.id === "set"         && "Which set does this address belong to? Click any line within the correct set."}
              {cfg.id === "associative" && "Where can this address go? If a tag matches click that line — otherwise click any empty line."}
            </div>
          </div>

          {feedback === null && (
            <>
              <button
                className="lcg-submit-btn"
                style={{ background: cfg.color }}
                onClick={handleSubmit}
                disabled={selectedMiss ? false : (cfg.id === "direct" ? (selectedLine === null || selectedOffset === null) : (selectedLine === null))}
              >
                {selectedMiss ? "Submit cache miss" : (cfg.id === "direct" ? (selectedLine === null || selectedOffset === null ? "← Select a line and byte in the cache table" : "Submit answer →") : (selectedLine === null ? "← Select a line in the cache table" : "Submit answer →"))}
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
              {cfg.id === "set" ? `${cfg.sets} sets · ${cfg.waysPerSet} ways each · ${cfg.lines} total lines`
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
