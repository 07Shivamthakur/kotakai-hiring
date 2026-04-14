import { useState, useEffect, useRef, useCallback } from "react";

const storage = {
  async get(key) { const v = localStorage.getItem(key); return v ? { key, value: v } : null; },
  async set(key, value) { localStorage.setItem(key, value); return { key, value }; },
  async delete(key) { localStorage.removeItem(key); return { key, deleted: true }; }
};

const WEBHOOK_URL = "https://n8n.srv1042888.hstgr.cloud/webhook/apply";
const VERIFY_WEBHOOK = "https://n8n.srv1042888.hstgr.cloud/webhook/send-otp";

const JOBS = [{
  id: "ai-engineer-quant", title: "AI Engineer", subtitle: "Quantitative Finance",
  location: "Mumbai, India", department: "Quant Trading", type: "Hybrid",
  experience: "0–5 years", salary: "₹25L–₹65L", posted: "April 2026",
  description: [
    "You're an engineer at the frontier of machine learning and financial markets — building models that generate alpha, optimizing inference pipelines for sub-millisecond latency, and collaborating with quantitative researchers who think in equations.",
    "At Kotak's Quantitative Trading Division, you'll work on systems that directly impact trading decisions. This isn't another ML role — this is where your models meet real markets, real money, and real-time constraints.",
    "We're looking for someone who's deeply technical, intellectually curious, and thrives in high-stakes environments where precision matters."
  ],
  responsibilities: [
    "Research, develop, and deploy ML models for signal generation, alpha discovery, and trade execution optimization",
    "Build and maintain production inference pipelines with sub-millisecond latency requirements",
    "Collaborate with quantitative researchers to translate trading strategies into deployable ML systems",
    "Design data pipelines for high-frequency market data — tick data, order book, trades",
    "Monitor model performance, detect drift, and implement retraining workflows",
    "Optimize model serving for throughput and latency in real-time trading environments"
  ],
  requirements: [
    "Strong foundations in deep learning, NLP, reinforcement learning, or time-series modeling",
    "Familiarity with quantitative finance: statistical arbitrage, pairs trading, market making, momentum strategies",
    "Understanding of market microstructure, order book dynamics, and HFT considerations",
    "Production ML experience: deployment, A/B testing, monitoring, CI/CD for ML",
    "Proficiency in Python (required); C++, Rust, or CUDA is a strong plus",
    "Experience with PyTorch, TensorFlow, JAX, SQL, Kafka, Redis"
  ],
  niceToHave: [
    "Published research in ML, NLP, or quantitative finance",
    "Experience with low-latency systems or real-time data processing",
    "Background in stochastic calculus, time-series econometrics, or options pricing",
    "Contributions to open-source ML projects"
  ]
}];

const EDUCATION_OPTIONS = ["B.Sc / B.Tech", "M.Sc / M.Tech", "PhD", "Other"];
const EXPERIENCE_OPTIONS = ["0–1 years", "1–3 years", "3–5 years", "5+ years"];
const HFT_OPTIONS = ["No experience", "Theoretical knowledge only", "Some hands-on experience", "Significant production experience", "Expert-level"];
const SOURCE_OPTIONS = ["LinkedIn", "Referral", "Job Portal", "Social Media", "Other"];
const TECH_SKILLS = ["Python", "C++", "Rust", "CUDA", "PyTorch", "TensorFlow", "JAX", "SQL", "Kafka", "Redis", "Docker/K8s", "AWS/GCP", "Git"];

const PATTERN_QUESTIONS = [
  { sequence: ["2","6","18","54","?"], options: ["108","162","148","216"], answer: "162" },
  { sequence: ["1","1","2","3","5","?"], options: ["7","8","10","13"], answer: "8" },
  { sequence: ["3","9","27","81","?"], options: ["162","243","324","189"], answer: "243" },
  { sequence: ["1","4","9","16","25","?"], options: ["30","35","36","49"], answer: "36" },
  { sequence: ["2","3","5","7","11","?"], options: ["12","13","14","15"], answer: "13" }
];
const MATH_QUESTIONS = [
  { question: "A trading algorithm executes 1,200 trades/sec. Each trade has 0.3% profit on $1,000. Gross profit per minute?", options: ["$2,160","$3,600","$21,600","$36,000"], answer: "$21,600" },
  { question: "Stock follows GBM with drift μ=0.05, vol σ=0.2. Expected price after 1yr if current=$100?", options: ["$105.00","$105.13","$107.00","$105.50"], answer: "$105.13" },
  { question: "Model: 95% accuracy, precision=0.92, recall=0.88. F1 score?", options: ["0.90","0.8996","0.91","0.8800"], answer: "0.8996" },
  { question: "Server A: 4ms, Server B: 6ms. In parallel, expected latency for first response?", options: ["2.4ms","4.0ms","5.0ms","10.0ms"], answer: "2.4ms" },
  { question: "Sharpe=1.8, risk-free=4%, std dev=15%. Expected return?", options: ["27%","31%","23%","35%"], answer: "31%" }
];
const DEBUG_QUESTIONS = [
  { code: "def moving_average(prices, window):\n    result = []\n    for i in range(len(prices)):\n        avg = sum(prices[i:i+window]) / window\n        result.append(avg)\n    return result", question: "Bug in this moving average?", options: ["Should start from index 'window-1'","Division should use len(prices[i:i+window])","Range should be range(window, len(prices))","Both A and B are correct"], answer: "Both A and B are correct" },
  { code: "async function fetchOrderBook(symbol) {\n  const data = await fetch(`/api/${symbol}`);\n  const book = data.json();\n  return book.bids[0].price;\n}", question: "Why might this fail silently?", options: ["Missing await on data.json()","No error handling","Symbol injection","All of the above"], answer: "All of the above" },
  { code: "import numpy as np\ndef sharpe_ratio(returns, rf=0.04):\n    excess = returns - rf\n    return np.mean(excess) / np.std(returns)", question: "Issue with this Sharpe ratio?", options: ["Should use std of excess returns","Missing annualization","rf should be /252 for daily","All of the above"], answer: "All of the above" },
  { code: "def binary_search(arr, target):\n    lo, hi = 0, len(arr)\n    while lo < hi:\n        mid = (lo + hi) // 2\n        if arr[mid] == target: return mid\n        elif arr[mid] < target: lo = mid\n        else: hi = mid\n    return -1", question: "Why can this infinite loop?", options: ["lo = mid should be lo = mid + 1","hi should be len(arr) - 1","while should be lo <= hi","mid overflow"], answer: "lo = mid should be lo = mid + 1" },
  { code: "class OrderQueue:\n    def __init__(self):\n        self.orders = []\n    def add(self, order):\n        self.orders.append(order)\n        self.orders.sort(key=lambda x: x['price'])\n    def get_best(self):\n        return self.orders.pop(0)", question: "Performance issue for HFT?", options: ["sort() O(n log n) per add — use heapq","pop(0) is O(n) — use deque","Both A and B","No issue"], answer: "Both A and B" }
];

const STEPS = ["Personal", "Technical", "Resume", "Assessment", "Review"];
const font = "'JetBrains Mono', 'SF Mono', monospace";
const displayFont = "'Instrument Serif', Georgia, serif";

const S = {
  input: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8E8E3", padding: "14px 16px", fontSize: "14px", fontFamily: font, outline: "none", boxSizing: "border-box" },
  inputLabel: { fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.15em", color: "#666", marginBottom: "8px", display: "block" },
  inputGroup: { marginBottom: "20px" },
  primaryBtn: { width: "100%", background: "#E8E8E3", color: "#0A0A0A", border: "none", padding: "14px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: font, cursor: "pointer", fontWeight: 600, marginTop: "12px" },
  dangerBtn: { width: "100%", background: "transparent", color: "#EF4444", border: "1px solid rgba(239,68,68,0.3)", padding: "14px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: font, cursor: "pointer", fontWeight: 600, marginTop: "12px" },
  link: { color: "#888", fontSize: "12px", cursor: "pointer", background: "none", border: "none", fontFamily: font, textDecoration: "underline", textUnderlineOffset: "3px", padding: 0 },
  select: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8E8E3", padding: "14px 16px", fontSize: "14px", fontFamily: font, outline: "none", appearance: "none", boxSizing: "border-box", cursor: "pointer" },
  textarea: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", color: "#E8E8E3", padding: "14px 16px", fontSize: "14px", fontFamily: font, outline: "none", resize: "vertical", minHeight: "120px", lineHeight: 1.6, boxSizing: "border-box" },
  chip: s => ({ padding: "8px 16px", fontSize: "12px", background: s ? "rgba(255,255,255,0.12)" : "transparent", border: s ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)", color: s ? "#E8E8E3" : "#888", cursor: "pointer", fontFamily: font }),
  sectionLabel: { fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#555", marginBottom: "32px" },
  stepDot: (a, c) => ({ width: c ? "24px" : a ? "32px" : "24px", height: "3px", background: c || a ? "#E8E8E3" : "rgba(255,255,255,0.1)", transition: "all 0.3s" }),
  timer: u => ({ fontSize: "32px", fontFamily: font, color: u ? "#FF4444" : "#E8E8E3", fontWeight: 600, textAlign: "center", marginBottom: "32px", fontVariantNumeric: "tabular-nums" }),
  gameOpt: (sel) => ({ padding: "16px 20px", width: "100%", display: "block", textAlign: "left", background: sel ? "rgba(255,255,255,0.08)" : "transparent", border: sel ? "1px solid rgba(255,255,255,0.3)" : "1px solid rgba(255,255,255,0.08)", color: "#E8E8E3", cursor: "pointer", fontFamily: font, fontSize: "14px" }),
  codeBlock: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", padding: "20px", fontFamily: font, fontSize: "13px", lineHeight: 1.7, color: "#AAA", whiteSpace: "pre-wrap", marginBottom: "24px", overflowX: "auto" },
  scoreCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: "24px", textAlign: "center" },
  pStep: st => ({ display: "flex", alignItems: "center", gap: "8px", padding: "12px 16px", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.1em", color: st === "done" ? "#10B981" : st === "now" ? "#E8E8E3" : "#444", fontFamily: font }),
  pLine: c => ({ width: "24px", height: "1px", background: c ? "#10B981" : "rgba(255,255,255,0.1)", flexShrink: 0 }),
  badge: status => { const m = { SHORTLISTED: ["rgba(16,185,129,0.1)","rgba(16,185,129,0.3)","#10B981"], UNDER_REVIEW: ["rgba(245,158,11,0.1)","rgba(245,158,11,0.3)","#F59E0B"], REJECTED: ["rgba(255,255,255,0.03)","rgba(255,255,255,0.1)","#888"], PROCESSING: ["rgba(59,130,246,0.1)","rgba(59,130,246,0.3)","#3B82F6"], WITHDRAWN: ["rgba(239,68,68,0.1)","rgba(239,68,68,0.3)","#EF4444"] }; const c = m[status]||m.PROCESSING; return { padding: "8px 20px", background: c[0], border: `1px solid ${c[1]}`, color: c[2], fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.15em", fontFamily: font, display: "inline-block" }; },
  errorText: { color: "#EF4444", fontSize: "11px", marginTop: "4px" }
};

const Spacer = ({ h }) => <div style={{ height: h }} />;

function GameTimer({ seconds, total }) {
  const pct = seconds / total, urgent = pct < 0.2;
  return (<div>
    <div style={S.timer(urgent)}>{Math.floor(seconds/60)}:{(seconds%60).toString().padStart(2,"0")}</div>
    <div style={{ height: "2px", background: "rgba(255,255,255,0.06)", marginBottom: "32px" }}><div style={{ height: "2px", background: urgent ? "#FF4444" : "#E8E8E3", width: `${pct*100}%`, transition: "width 1s linear" }} /></div>
  </div>);
}

function GameSection({ scores, setScores, phase, setPhase }) {
  const [qIdx, setQIdx] = useState(0);
  const [sel, setSel] = useState(null);
  const [time, setTime] = useState(0);
  const [sc, setSc] = useState(0);
  const tmr = useRef(null);
  const start = useCallback((g, t) => { setPhase(g); setQIdx(0); setSel(null); setSc(0); setTime(t); }, [setPhase]);

  useEffect(() => {
    if (phase === "intro" || phase === "summary") return;
    tmr.current = setInterval(() => setTime(t => { if (t <= 1) { clearInterval(tmr.current); return 0; } return t - 1; }), 1000);
    return () => clearInterval(tmr.current);
  }, [phase]);

  const qs = phase === "pattern" ? PATTERN_QUESTIONS : phase === "math" ? MATH_QUESTIONS : DEBUG_QUESTIONS;
  const tt = phase === "pattern" ? 90 : 120;
  const answer = useCallback(opt => {
    if (sel) return; setSel(opt);
    const ok = qs[qIdx]?.answer === opt, ns = ok ? sc + 1 : sc;
    if (ok) setSc(s => s + 1);
    setTimeout(() => {
      if (qIdx < 4) { setQIdx(i => i + 1); setSel(null); }
      else {
        setScores(p => ({ ...p, [phase]: Math.round((ns/5)*100) }));
        clearInterval(tmr.current);
        if (phase === "pattern") setTimeout(() => start("math", 120), 1000);
        else if (phase === "math") setTimeout(() => start("debug", 120), 1000);
        else setPhase("summary");
      }
    }, 800);
  }, [sel, qs, qIdx, sc, phase, setScores, setPhase, start]);

  if (phase === "intro") return (<div>
    <h3 style={{ fontFamily: displayFont, fontSize: "28px", marginBottom: "12px", fontWeight: 400 }}>Cognitive Assessment</h3>
    <p style={{ fontSize: "14px", color: "#888", lineHeight: 1.7, fontFamily: displayFont, marginBottom: "40px" }}>Complete 3 timed challenges. Scores factor into evaluation.</p>
    {[["01","Pattern Recognition","90s"],["02","Math & Logic","120s"],["03","Code Debugging","120s"]].map(([n,t,d])=>(<div key={n} style={{display:"flex",gap:"24px",padding:"20px 0",borderTop:"1px solid rgba(255,255,255,0.06)"}}><span style={{fontSize:"12px",color:"#333",minWidth:"24px"}}>{n}</span><div><div style={{fontSize:"15px",fontFamily:displayFont}}>{t}</div><div style={{fontSize:"12px",color:"#555"}}>5 questions · {d}</div></div></div>))}
    <Spacer h={24} /><button style={S.primaryBtn} onClick={() => start("pattern", 90)}>Begin Assessment →</button>
    <div style={{ fontSize: "11px", color: "#444", marginTop: "12px" }}>Timer cannot be paused once started.</div>
  </div>);

  if (phase === "summary") return (<div style={{textAlign:"center",paddingTop:"40px"}}>
    <div style={{fontSize:"48px",marginBottom:"24px",opacity:0.5}}>✓</div>
    <h3 style={{ fontFamily: displayFont, fontSize: "28px", marginBottom: "16px", fontWeight: 400 }}>Assessment Complete</h3>
    <p style={{fontSize:"14px",color:"#888",fontFamily:displayFont,lineHeight:1.7,maxWidth:"400px",margin:"0 auto"}}>All 3 challenges have been completed. Your responses have been recorded and will be evaluated as part of your application.</p>
  </div>);

  const q = qs[qIdx]; if (!q) return null;
  const gn = phase === "pattern" ? "Pattern Recognition" : phase === "math" ? "Math & Logic" : "Code Debugging";
  return (<div style={{ maxWidth: "680px", margin: "0 auto" }}>
    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}><div style={{ fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.2em", color: "#555" }}>{gn}</div><div style={{ fontSize: "12px", color: "#555" }}>{qIdx+1}/5</div></div>
    <GameTimer seconds={time} total={tt} />
    {phase === "debug" && <div style={S.codeBlock}>{q.code}</div>}
    {phase === "pattern" && <div style={{textAlign:"center",marginBottom:"32px"}}><div style={{display:"flex",justifyContent:"center",gap:"12px",fontSize:"20px",fontFamily:font,flexWrap:"wrap"}}>{q.sequence.map((n,i)=><span key={i} style={{color:n==="?"?"#3B82F6":"#E8E8E3",padding:"8px 14px",background:n==="?"?"rgba(59,130,246,0.1)":"rgba(255,255,255,0.03)",border:`1px solid ${n==="?"?"rgba(59,130,246,0.3)":"rgba(255,255,255,0.06)"}`}}>{n}</span>)}</div></div>}
    {(phase==="math"||phase==="debug") && <div style={{fontSize:"15px",lineHeight:1.7,fontFamily:displayFont,marginBottom:"28px",color:"#CCC"}}>{q.question}</div>}
    <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>{q.options.map(o=><button key={o} style={S.gameOpt(sel===o)} onClick={()=>answer(o)} disabled={sel!==null}>{o}</button>)}</div>
  </div>);
}

function fileToBase64(file) { return new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result.split(",")[1]); r.onerror = rej; r.readAsDataURL(file); }); }

// ═══ MAIN APP ═══
export default function App() {
  const [page, setPage] = useState("home");
  const [selectedJob, setSelectedJob] = useState(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [hoveredJob, setHoveredJob] = useState(null);
  const [authForm, setAuthForm] = useState({ name: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [authError, setAuthError] = useState("");
  const [verifyStep, setVerifyStep] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [sentOtp, setSentOtp] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [appStep, setAppStep] = useState(0);
  const [appData, setAppData] = useState({ education: "", experience: "", source: "", aiAnswer: "", quantAnswer: "", hftLevel: "", techStack: [], extraInfo: "", resumeFile: null, resumeName: "" });
  const [gamePhase, setGamePhase] = useState("intro");
  const [gameScores, setGameScores] = useState({ pattern: 0, math: 0, debug: 0 });
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState("");
  const [appStatus, setAppStatus] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [withdrawConfirm, setWithdrawConfirm] = useState(false);
  const fileRef = useRef(null);
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;

  useEffect(() => { (async () => { try { const u = await storage.get("currentUser"); if (u) { const p = JSON.parse(u.value); setUser(p); try { const s = await storage.get(`status_${p.email}`); if (s) setAppStatus(JSON.parse(s.value)); } catch {} } } catch {} })(); }, []);

  const sendOtp = async () => {
    setAuthError("");
    if (!authForm.name || !authForm.email || !authForm.password) { setAuthError("All fields are required"); return; }
    if (authForm.password !== authForm.confirmPassword) { setAuthError("Passwords do not match"); return; }
    if (authForm.password.length < 6) { setAuthError("Min 6 characters for password"); return; }
    if (!authForm.email.includes("@")) { setAuthError("Invalid email"); return; }
    setOtpSending(true);
    const code = String(Math.floor(100000 + Math.random() * 900000)); setSentOtp(code);
    try { await fetch(VERIFY_WEBHOOK, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: authForm.email, name: authForm.name, code }) }); } catch {}
    setOtpSending(false); setVerifyStep(true);
  };

  const verifyAndCreate = async () => {
    setAuthError("");
    if (otpCode !== sentOtp) { setAuthError("Invalid code"); return; }
    const ud = { name: authForm.name, email: authForm.email, phone: authForm.phone, verified: true };
    await storage.set(`user_${authForm.email}`, JSON.stringify({ ...ud, password: authForm.password }));
    if (authForm.phone) await storage.set(`phone_${authForm.phone.replace(/[^0-9]/g, '')}`, authForm.email);
    await storage.set("currentUser", JSON.stringify(ud));
    setUser(ud); setVerifyStep(false); setOtpCode(""); setPage("apply");
  };

  const signIn = async () => {
    setAuthError("");
    const loginId = authForm.email;
    if (!loginId || !authForm.password) { setAuthError("Email/phone and password required"); return; }
    let email = loginId;
    if (!loginId.includes("@")) {
      try {
        const phoneKey = loginId.replace(/[^0-9]/g, '');
        const mapped = await storage.get(`phone_${phoneKey}`);
        if (mapped) { email = mapped.value; } else { setAuthError("No account found with this phone number"); return; }
      } catch { setAuthError("No account found with this phone number"); return; }
    }
    try {
      const r = await storage.get(`user_${email}`);
      if (!r) { setAuthError("Account not found"); return; }
      const p = JSON.parse(r.value);
      if (p.password !== authForm.password) { setAuthError("Wrong password"); return; }
      const ud = { name: p.name, email: p.email, phone: p.phone };
      await storage.set("currentUser", JSON.stringify(ud)); setUser(ud);
      try { const s = await storage.get(`status_${ud.email}`); if (s) { setAppStatus(JSON.parse(s.value)); setPage("status"); return; } } catch {}
      setPage("home");
    } catch { setAuthError("Sign in failed"); }
  };

  const signOut = async () => { try { await storage.delete("currentUser"); } catch {} setUser(null); setAppStatus(null); setPage("home"); };
  const openJob = j => { setSelectedJob(j); setTimeout(() => setDetailOpen(true), 10); };
  const closeJob = () => { setDetailOpen(false); setTimeout(() => setSelectedJob(null), 500); };
  const startApply = () => {
    closeJob();
    if (!user) { setTimeout(() => setPage("signup"), 500); return; }
    if (appStatus && appStatus.status !== "WITHDRAWN") { setTimeout(() => setPage("status"), 500); return; }
    setTimeout(() => { setPage("apply"); setAppStep(0); }, 500);
  };
  const withdrawApplication = async () => {
    if (!user || !appStatus) return;
    const updated = { ...appStatus, status: "WITHDRAWN", withdrawnAt: new Date().toISOString() };
    try { await storage.set(`status_${user.email}`, JSON.stringify(updated)); } catch {}
    setAppStatus(updated); setWithdrawConfirm(false);
  };
  const resetAuth = () => { setAuthError(""); setVerifyStep(false); setOtpCode(""); setAuthForm({ name: "", email: "", phone: "", password: "", confirmPassword: "" }); };
  const handleFile = f => { if (f?.type === "application/pdf") setAppData(p => ({ ...p, resumeFile: f, resumeName: f.name })); };
  const canNext = () => { if (appStep===0) return appData.education&&appData.experience&&appData.source; if (appStep===1) return appData.aiAnswer.length>=50&&appData.quantAnswer.length>=50&&appData.hftLevel; if (appStep===2) return appData.resumeFile; if (appStep===3) return gamePhase==="summary"; return true; };

  const submit = async () => {
    setSubmitting(true);
    const id = "APP-" + new Date().toISOString().slice(0,10).replace(/-/g,"") + "-" + String(Math.floor(Math.random()*10000)).padStart(4,"0");
    setApplicationId(id);
    const tot = gameScores.pattern + gameScores.math + gameScores.debug;
    let b64 = ""; try { if (appData.resumeFile) b64 = await fileToBase64(appData.resumeFile); } catch {}
    try { await fetch(WEBHOOK_URL, { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({ fullName: user.name, email: user.email, phone: user.phone||"", education: appData.education, experience: appData.experience, source: appData.source, aiAnswer: appData.aiAnswer, quantAnswer: appData.quantAnswer, hftLevel: appData.hftLevel, techStack: appData.techStack.join(", "), extraInfo: appData.extraInfo, resumeFileName: appData.resumeName||"resume.pdf", resumeBase64: b64, gameScores, totalGameScore: tot, applicationId: id }) }); } catch {}
    const sd = { applicationId: id, status: "PROCESSING", submittedAt: new Date().toISOString(), position: JOBS[0].title+" — "+JOBS[0].subtitle, gameScores, totalGameScore: tot };
    try { await storage.set(`status_${user.email}`, JSON.stringify(sd)); } catch {}
    setAppStatus(sd); setSubmitted(true); setSubmitting(false);
  };

  const mp = isMobile ? "20px" : "40px"; // mobile padding

  return (
    <div style={{ background: "#0A0A0A", color: "#E8E8E3", minHeight: "100vh", fontFamily: font, fontSize: "13px", letterSpacing: "0.02em" }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=JetBrains+Mono:wght@300;400;500;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{background:#0A0A0A}::selection{background:rgba(59,130,246,0.3);color:#fff}::-webkit-scrollbar{width:6px}::-webkit-scrollbar-track{background:transparent}::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.1);border-radius:3px}select option{background:#1a1a1a;color:#E8E8E3}input:focus,select:focus,textarea:focus{border-color:rgba(255,255,255,0.25)!important}button:hover{opacity:0.85}`}</style>

      {/* NAV */}
      {!["signup","signin","apply"].includes(page) && <nav style={{position:"fixed",top:0,left:0,right:0,zIndex:100,display:"flex",justifyContent:"space-between",alignItems:"center",padding:isMobile?"16px 20px":"20px 40px",background:"rgba(10,10,10,0.9)",backdropFilter:"blur(20px)",borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
        <div style={{display:"flex",alignItems:"center",gap:"12px"}}><button style={{fontFamily:displayFont,fontSize:isMobile?"22px":"28px",fontWeight:400,color:"#E8E8E3",cursor:"pointer",background:"none",border:"none"}} onClick={()=>{setPage("home");closeJob();}}>Kotak</button><span style={{fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.15em",color:"#555"}}>Quant</span></div>
        <div style={{display:"flex",alignItems:"center",gap:isMobile?"12px":"24px"}}>{user?<>
          <button style={{color:"#888",cursor:"pointer",background:"none",border:"none",fontFamily:font,fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.1em",padding:0}} onClick={()=>appStatus&&setPage("status")}>Status</button>
          {!isMobile&&<span style={{color:"#555",fontSize:"11px"}}>{user.name.split(" ")[0]}</span>}
          <button style={{color:"#E8E8E3",background:"none",border:"1px solid rgba(255,255,255,0.2)",padding:"6px 14px",cursor:"pointer",fontFamily:font,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.1em"}} onClick={signOut}>Sign Out</button>
        </>:<>
          <button style={{color:"#888",cursor:"pointer",background:"none",border:"none",fontFamily:font,fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.1em",padding:0}} onClick={()=>{setPage("signin");resetAuth();}}>Sign In</button>
          <button style={{color:"#E8E8E3",background:"none",border:"1px solid rgba(255,255,255,0.2)",padding:"6px 14px",cursor:"pointer",fontFamily:font,fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.1em"}} onClick={()=>{setPage("signup");resetAuth();}}>Apply</button>
        </>}</div>
      </nav>}

      {/* HOME */}
      {page==="home"&&<div>
        <div style={{padding:isMobile?`140px ${mp} 40px`:`180px ${mp} 60px`,maxWidth:"900px"}}><h1 style={{fontFamily:displayFont,fontSize:isMobile?"42px":"clamp(48px,8vw,96px)",fontWeight:400,lineHeight:1.05,color:"#E8E8E3",marginBottom:"24px",letterSpacing:"-0.03em"}}>Where AI<br/>meets markets.</h1><p style={{fontSize:isMobile?"14px":"15px",color:"#888",lineHeight:1.7,maxWidth:"560px"}}>Join our quantitative trading team. Build ML systems that generate alpha, optimize execution, and move billions — in milliseconds.</p></div>
        <div style={{padding:`0 ${mp} 120px`}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"flex-end",marginBottom:"20px",flexDirection:isMobile?"column":"row",gap:"16px"}}><div style={S.sectionLabel}>Current Openings</div><div style={{display:"flex",gap:"12px"}}><button style={{padding:"6px 14px",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.12em",background:"#E8E8E3",color:"#0A0A0A",border:"1px solid #E8E8E3",cursor:"pointer",fontFamily:font}}>All</button><button style={{padding:"6px 14px",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.12em",background:"transparent",color:"#888",border:"1px solid rgba(255,255,255,0.15)",cursor:"pointer",fontFamily:font}}>Mumbai</button></div></div>
          {JOBS.map(j=><div key={j.id} style={{display:"flex",justifyContent:"space-between",alignItems:isMobile?"flex-start":"center",padding:"20px 0",borderTop:"1px solid rgba(255,255,255,0.08)",cursor:"pointer",background:hoveredJob===j.id?"rgba(255,255,255,0.02)":"transparent",flexDirection:isMobile?"column":"row",gap:isMobile?"12px":"0"}} onMouseEnter={()=>setHoveredJob(j.id)} onMouseLeave={()=>setHoveredJob(null)} onClick={()=>openJob(j)}>
            <div><div style={{fontSize:isMobile?"16px":"18px",fontFamily:displayFont,fontWeight:400}}>{j.title} — {j.subtitle}</div><div style={{fontSize:"12px",color:"#555",marginTop:"4px"}}>{j.department} · {j.experience}</div></div>
            <div style={{display:"flex",alignItems:"center",gap:"16px"}}><span style={{fontSize:"14px",color:"#888",fontFamily:displayFont}}>{j.location}</span>{!isMobile&&<span style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.15em",color:"#E8E8E3",border:"1px solid rgba(255,255,255,0.3)",padding:"8px 20px",opacity:hoveredJob===j.id?1:0,transition:"opacity 0.2s",background:"none",fontFamily:font}}>Apply ↗</span>}</div>
          </div>)}
          <div style={{borderTop:"1px solid rgba(255,255,255,0.08)"}}/>
          <Spacer h={80}/><div style={S.sectionLabel}>Why Kotak Quant</div>
          {[["01","Real alpha generation","Your models directly impact trading P&L."],["02","Sub-millisecond latency","Where every microsecond matters."],["03","World-class team","PhDs in math, physics, and CS."],["04","AI-first culture","Heavy investment in ML infrastructure."],["05","Competitive compensation","Top-of-market pay + bonuses."],["06","Hybrid flexibility","Mumbai HQ, flexible arrangements."]].map(([n,t,d])=><div key={n} style={{display:"flex",gap:isMobile?"20px":"40px",padding:"24px 0",borderTop:"1px solid rgba(255,255,255,0.04)"}}><span style={{fontSize:"12px",color:"#333",fontFamily:font,minWidth:"28px"}}>{n}</span><div><div style={{fontSize:"16px",fontFamily:displayFont,marginBottom:"6px"}}>{t}</div><div style={{fontSize:"14px",color:"#666",fontFamily:displayFont}}>{d}</div></div></div>)}
        </div>
      </div>}

      {/* JOB DETAIL */}
      {selectedJob&&<div style={{position:"fixed",top:0,left:0,right:0,bottom:0,zIndex:200,display:"flex",pointerEvents:detailOpen?"all":"none",flexDirection:isMobile?"column":"row"}}>
        {!isMobile&&<div style={{width:"45%",background:"#060606",transition:"opacity 0.5s",opacity:detailOpen?1:0,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{fontFamily:displayFont,fontSize:"64px",color:"rgba(255,255,255,0.03)"}}>K</div></div>}
        <div style={{width:isMobile?"100%":"55%",height:isMobile?"100%":"auto",background:"#0F0F0F",overflowY:"auto",transform:detailOpen?"translateX(0)":isMobile?"translateY(100%)":"translateX(100%)",transition:"transform 0.5s cubic-bezier(0.25,0.46,0.45,0.94)",padding:isMobile?"24px 20px 80px":"40px 60px 80px",position:"relative"}}>
          <button style={{position:"absolute",top:"20px",right:"20px",background:"none",border:"1px solid rgba(255,255,255,0.2)",color:"#E8E8E3",width:"40px",height:"40px",display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",fontSize:"18px",zIndex:10,fontFamily:font}} onClick={closeJob}>✕</button>
          {!isMobile&&<button style={{position:"absolute",top:"24px",right:"80px",background:"none",border:"1px solid rgba(255,255,255,0.3)",color:"#E8E8E3",padding:"12px 28px",cursor:"pointer",fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.15em",fontFamily:font,zIndex:10}} onClick={startApply}>{appStatus&&appStatus.status!=="WITHDRAWN"?"View Application":"Apply for Role ↓"}</button>}
          <div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.15em",color:"#888",marginBottom:isMobile?"24px":"48px",display:"flex",gap:"24px",marginTop:isMobile?"48px":"0"}}><span>{selectedJob.location}</span><span>{selectedJob.department}</span></div>
          <h2 style={{fontFamily:displayFont,fontSize:isMobile?"28px":"42px",fontWeight:400,lineHeight:1.1,marginBottom:"8px"}}>{selectedJob.title}</h2>
          <div style={{fontSize:isMobile?"18px":"22px",color:"#888",fontFamily:displayFont,marginBottom:isMobile?"32px":"60px"}}>{selectedJob.salary}</div>
          {[["The Role",selectedJob.description,"p"],["Your Responsibilities",selectedJob.responsibilities,"ol"],["What We're Looking For",selectedJob.requirements,"ol"],["Nice to Have",selectedJob.niceToHave,"+"]].map(([t,items,type])=><div key={t} style={{marginBottom:isMobile?"32px":"48px"}}><div style={{fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.2em",color:"#555",marginBottom:"20px"}}>{t}</div>{type==="p"?items.map((p,i)=><p key={i} style={{fontSize:"15px",lineHeight:1.75,color:"#BBB",fontFamily:displayFont,marginBottom:"16px"}}>{p}</p>):<ol style={{listStyle:"none",padding:0}}>{items.map((r,i)=><li key={i} style={{fontSize:"14px",lineHeight:1.7,color:"#BBB",fontFamily:displayFont,padding:"6px 0 6px 20px",position:"relative"}}><span style={{position:"absolute",left:0,color:"#333"}}>{type==="+"?"+":i+1+"."}</span>{r}</li>)}</ol>}</div>)}
          <button style={{...S.primaryBtn,maxWidth:"320px"}} onClick={startApply}>{appStatus&&appStatus.status!=="WITHDRAWN"?"View Application Status →":"Apply for this Role →"}</button>
        </div>
      </div>}

      {/* AUTH */}
      {(page==="signup"||page==="signin")&&<div style={{minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row"}}>
        {!isMobile&&<div style={{width:"45%",background:"#060606",display:"flex",flexDirection:"column",justifyContent:"center",alignItems:"center",padding:"60px"}}><div style={{fontFamily:displayFont,fontSize:"48px",color:"#E8E8E3",marginBottom:"16px",letterSpacing:"-0.03em"}}>Kotak</div><div style={{fontSize:"11px",textTransform:"uppercase",letterSpacing:"0.2em",color:"#444"}}>Quantitative Trading Division</div></div>}
        <div style={{width:isMobile?"100%":"55%",background:"#0F0F0F",display:"flex",flexDirection:"column",justifyContent:"center",padding:isMobile?"80px 24px 40px":"60px 80px"}}>
          {isMobile&&<div style={{marginBottom:"40px"}}><div style={{fontFamily:displayFont,fontSize:"28px",color:"#E8E8E3",marginBottom:"8px"}}>Kotak</div><div style={{fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.2em",color:"#444"}}>Quantitative Trading Division</div></div>}
          {page==="signup"&&verifyStep?<>
            <h2 style={{fontFamily:displayFont,fontSize:isMobile?"28px":"36px",fontWeight:400,marginBottom:"12px"}}>Verify Email</h2>
            <p style={{fontSize:"14px",color:"#888",marginBottom:"48px",fontFamily:displayFont}}>Code sent to <strong style={{color:"#E8E8E3"}}>{authForm.email}</strong></p>
            <div style={S.inputGroup}><label style={S.inputLabel}>Verification Code</label><input style={{...S.input,fontSize:"24px",letterSpacing:"0.5em",textAlign:"center"}} value={otpCode} onChange={e=>setOtpCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="000000" maxLength={6} autoFocus/></div>
            {authError&&<div style={S.errorText}>{authError}</div>}
            <button style={{...S.primaryBtn,opacity:otpCode.length===6?1:0.3}} onClick={verifyAndCreate} disabled={otpCode.length!==6}>Verify & Create Account</button>
            <Spacer h={16}/><div style={{display:"flex",gap:"16px"}}><button style={S.link} onClick={()=>{setVerifyStep(false);setOtpCode("");setAuthError("");}}>← Back</button><button style={S.link} onClick={sendOtp}>Resend</button></div>
          </>:<>
            <h2 style={{fontFamily:displayFont,fontSize:isMobile?"28px":"36px",fontWeight:400,marginBottom:"12px"}}>{page==="signup"?"Create Account":"Welcome Back"}</h2>
            <p style={{fontSize:"14px",color:"#888",marginBottom:"40px",fontFamily:displayFont}}>{page==="signup"?"Start your application.":"Sign in with email or phone."}</p>
            {page==="signup"&&<div style={S.inputGroup}><label style={S.inputLabel}>Full Name</label><input style={S.input} value={authForm.name} onChange={e=>setAuthForm(p=>({...p,name:e.target.value}))} placeholder="John Doe"/></div>}
            <div style={S.inputGroup}><label style={S.inputLabel}>{page==="signin"?"Email or Phone Number":"Email"}</label><input style={S.input} value={authForm.email} onChange={e=>setAuthForm(p=>({...p,email:e.target.value}))} placeholder={page==="signin"?"john@example.com or +91XXXXXXXXXX":"john@example.com"}/></div>
            {page==="signup"&&<div style={S.inputGroup}><label style={S.inputLabel}>Phone</label><input style={S.input} value={authForm.phone} onChange={e=>setAuthForm(p=>({...p,phone:e.target.value}))} placeholder="+91-XXXXXXXXXX"/></div>}
            <div style={S.inputGroup}><label style={S.inputLabel}>Password</label><input style={S.input} type="password" value={authForm.password} onChange={e=>setAuthForm(p=>({...p,password:e.target.value}))} placeholder="••••••••"/></div>
            {page==="signup"&&<div style={S.inputGroup}><label style={S.inputLabel}>Confirm Password</label><input style={S.input} type="password" value={authForm.confirmPassword} onChange={e=>setAuthForm(p=>({...p,confirmPassword:e.target.value}))} placeholder="••••••••"/></div>}
            {authError&&<div style={S.errorText}>{authError}</div>}
            <button style={{...S.primaryBtn,opacity:otpSending?0.5:1}} onClick={page==="signup"?sendOtp:signIn} disabled={otpSending}>{otpSending?"Sending code...":page==="signup"?"Create Account":"Sign In"}</button>
            <Spacer h={20}/><button style={S.link} onClick={()=>{setPage(page==="signup"?"signin":"signup");resetAuth();}}>{page==="signup"?"Have an account? Sign in":"No account? Create one"}</button>
          </>}
        </div>
      </div>}

      {/* APPLICATION */}
      {page==="apply"&&<div style={{minHeight:"100vh",display:"flex",flexDirection:isMobile?"column":"row"}}>
        {!isMobile&&<div style={{width:"45%",background:"#060606",display:"flex",flexDirection:"column",justifyContent:"center",padding:"60px",position:"sticky",top:0,height:"100vh"}}>
          <div style={{fontFamily:displayFont,fontSize:"32px",marginBottom:"16px"}}>AI Engineer</div>
          <div style={{fontSize:"14px",color:"#555",fontFamily:displayFont,marginBottom:"40px"}}>Quantitative Finance · Mumbai</div>
          {STEPS.map((s,i)=><div key={i} style={{display:"flex",alignItems:"center",gap:"16px",padding:"12px 0",opacity:i<=appStep?1:0.3}}><span style={{fontSize:"11px",color:i<appStep?"#10B981":i===appStep?"#E8E8E3":"#333",minWidth:"20px"}}>{i<appStep?"✓":String(i+1).padStart(2,"0")}</span><span style={{fontSize:"13px",color:i===appStep?"#E8E8E3":"#666"}}>{s}</span></div>)}
        </div>}
        <div style={{width:isMobile?"100%":"55%",background:"#0F0F0F",padding:isMobile?"80px 24px 40px":"100px 60px 60px",overflowY:"auto"}}>
          <div style={{fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.2em",color:"#555",marginBottom:"8px"}}>Step {String(appStep+1).padStart(2,"0")} of {String(STEPS.length).padStart(2,"0")} — {STEPS[appStep]}</div>
          <div style={{display:"flex",gap:"4px",marginBottom:"48px"}}>{STEPS.map((_,i)=><div key={i} style={S.stepDot(i===appStep,i<appStep)}/>)}</div>

          {appStep===0&&<div>
            <h3 style={{fontFamily:displayFont,fontSize:isMobile?"24px":"28px",marginBottom:"32px",fontWeight:400}}>Personal Information</h3>
            <div style={S.inputGroup}><label style={S.inputLabel}>Name</label><input style={{...S.input,opacity:0.5}} value={user?.name||""} disabled/></div>
            <div style={S.inputGroup}><label style={S.inputLabel}>Email</label><input style={{...S.input,opacity:0.5}} value={user?.email||""} disabled/></div>
            <div style={S.inputGroup}><label style={S.inputLabel}>Education</label><select style={S.select} value={appData.education} onChange={e=>setAppData(p=>({...p,education:e.target.value}))}><option value="">Select</option>{EDUCATION_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div>
            <div style={S.inputGroup}><label style={S.inputLabel}>Experience</label><select style={S.select} value={appData.experience} onChange={e=>setAppData(p=>({...p,experience:e.target.value}))}><option value="">Select</option>{EXPERIENCE_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div>
            <div style={S.inputGroup}><label style={S.inputLabel}>Source</label><select style={S.select} value={appData.source} onChange={e=>setAppData(p=>({...p,source:e.target.value}))}><option value="">Select</option>{SOURCE_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div>
          </div>}

          {appStep===1&&<div>
            <h3 style={{fontFamily:displayFont,fontSize:isMobile?"24px":"28px",marginBottom:"32px",fontWeight:400}}>Technical Questions</h3>
            <div style={S.inputGroup}><label style={S.inputLabel}>AI/ML Project</label><p style={{fontSize:"13px",color:"#888",marginBottom:"12px",lineHeight:1.6}}>Describe your most impactful AI/ML project — architecture, dataset, challenges, outcomes.</p><textarea style={S.textarea} value={appData.aiAnswer} onChange={e=>setAppData(p=>({...p,aiAnswer:e.target.value}))}/><div style={{fontSize:"11px",color:appData.aiAnswer.length>=50?"#555":"#EF4444",textAlign:"right",marginTop:"4px"}}>{appData.aiAnswer.length} (min 50)</div></div>
            <div style={S.inputGroup}><label style={S.inputLabel}>Quant Strategy</label><p style={{fontSize:"13px",color:"#888",marginBottom:"12px",lineHeight:1.6}}>Explain a quant trading strategy — what inefficiency does it exploit?</p><textarea style={S.textarea} value={appData.quantAnswer} onChange={e=>setAppData(p=>({...p,quantAnswer:e.target.value}))}/><div style={{fontSize:"11px",color:appData.quantAnswer.length>=50?"#555":"#EF4444",textAlign:"right",marginTop:"4px"}}>{appData.quantAnswer.length} (min 50)</div></div>
            <div style={S.inputGroup}><label style={S.inputLabel}>HFT Familiarity</label><select style={S.select} value={appData.hftLevel} onChange={e=>setAppData(p=>({...p,hftLevel:e.target.value}))}><option value="">Select</option>{HFT_OPTIONS.map(o=><option key={o}>{o}</option>)}</select></div>
            <div style={S.inputGroup}><label style={S.inputLabel}>Skills</label><div style={{display:"flex",flexWrap:"wrap",gap:"8px",marginTop:"8px"}}>{TECH_SKILLS.map(sk=><button key={sk} style={S.chip(appData.techStack.includes(sk))} onClick={()=>setAppData(p=>({...p,techStack:p.techStack.includes(sk)?p.techStack.filter(x=>x!==sk):[...p.techStack,sk]}))}>{sk}</button>)}</div></div>
            <div style={S.inputGroup}><label style={S.inputLabel}>Anything else?</label><textarea style={{...S.textarea,minHeight:"80px"}} value={appData.extraInfo} onChange={e=>setAppData(p=>({...p,extraInfo:e.target.value}))}/></div>
          </div>}

          {appStep===2&&<div>
            <h3 style={{fontFamily:displayFont,fontSize:isMobile?"24px":"28px",marginBottom:"32px",fontWeight:400}}>Upload Resume</h3>
            {!appData.resumeFile?<div style={{border:`2px dashed ${dragOver?"rgba(255,255,255,0.3)":"rgba(255,255,255,0.08)"}`,padding:isMobile?"40px 20px":"60px 40px",textAlign:"center",cursor:"pointer",background:dragOver?"rgba(255,255,255,0.02)":"transparent"}} onDragOver={e=>{e.preventDefault();setDragOver(true);}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFile(e.dataTransfer.files[0]);}} onClick={()=>fileRef.current?.click()}>
              <input ref={fileRef} type="file" accept=".pdf" style={{display:"none"}} onChange={e=>handleFile(e.target.files[0])}/>
              <div style={{fontSize:"32px",marginBottom:"16px",opacity:0.3}}>↑</div><div style={{fontSize:"15px",fontFamily:displayFont,marginBottom:"8px"}}>Drop your resume here</div><div style={{fontSize:"12px",color:"#555"}}>PDF only · Max 10MB</div>
            </div>:<div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",padding:"24px",display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px"}}><div style={{display:"flex",alignItems:"center",gap:"16px"}}><span style={{fontSize:"24px",opacity:0.5}}>📄</span><div><div style={{fontSize:"14px"}}>{appData.resumeName}</div><div style={{fontSize:"12px",color:"#555"}}>{(appData.resumeFile.size/1024).toFixed(0)} KB</div></div></div><button style={{...S.link,color:"#EF4444"}} onClick={()=>setAppData(p=>({...p,resumeFile:null,resumeName:""}))}>Remove</button></div>}
          </div>}

          {appStep===3&&<GameSection scores={gameScores} setScores={setGameScores} phase={gamePhase} setPhase={setGamePhase}/>}

          {appStep===4&&!submitted&&<div>
            <h3 style={{fontFamily:displayFont,fontSize:isMobile?"24px":"28px",marginBottom:"32px",fontWeight:400}}>Review & Submit</h3>
            {[["Personal",`${user?.name} · ${user?.email} · ${appData.education} · ${appData.experience}`],["Technical",`AI/ML: ${appData.aiAnswer.slice(0,80)}... · HFT: ${appData.hftLevel} · Skills: ${appData.techStack.join(", ")}`],["Resume",appData.resumeName||"None"],["Assessment","All 3 challenges completed"]].map(([l,v])=><div key={l} style={{borderTop:"1px solid rgba(255,255,255,0.06)",padding:"20px 0"}}><div style={S.sectionLabel}>{l}</div><div style={{fontSize:"13px",color:"#AAA",lineHeight:1.7,wordBreak:"break-word"}}>{v}</div></div>)}
            <Spacer h={24}/><button style={{...S.primaryBtn,opacity:submitting?0.5:1}} onClick={submit} disabled={submitting}>{submitting?"Submitting...":"Submit Application →"}</button>
          </div>}

          {appStep===4&&submitted&&<div style={{textAlign:"center",paddingTop:"40px"}}>
            <div style={{fontSize:"48px",marginBottom:"24px"}}>✓</div>
            <h3 style={{fontFamily:displayFont,fontSize:"28px",marginBottom:"12px",fontWeight:400}}>Application Submitted</h3>
            <div style={{fontSize:"14px",color:"#888",fontFamily:displayFont,marginBottom:"32px"}}>We'll notify you by email.</div>
            <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.08)",padding:"20px",display:"inline-block",marginBottom:"32px"}}><div style={{fontSize:"10px",textTransform:"uppercase",letterSpacing:"0.2em",color:"#555",marginBottom:"8px"}}>Application ID</div><div style={{fontSize:isMobile?"14px":"18px",fontFamily:font}}>{applicationId}</div></div>
            <br/><button style={{...S.primaryBtn,maxWidth:"280px",display:"inline-block"}} onClick={()=>setPage("status")}>View Status →</button>
          </div>}

          {appStep<4&&!submitted&&<div style={{display:"flex",justifyContent:"space-between",marginTop:"40px",gap:"16px"}}>
            {appStep>0?<button style={S.link} onClick={()=>{if(appStep===3&&gamePhase!=="intro")setGamePhase("intro");else setAppStep(s=>s-1);}}>← Back</button>:<div/>}
            <button style={{...S.primaryBtn,width:"auto",padding:"14px 40px",opacity:canNext()?1:0.3}} disabled={!canNext()} onClick={()=>setAppStep(s=>s+1)}>Continue →</button>
          </div>}
        </div>
      </div>}

      {/* STATUS */}
      {page==="status"&&(()=>{
        const steps=["Submitted","Under Review","Assessment","Decision","Outcome"];
        const sm={PROCESSING:1,UNDER_REVIEW:2,SHORTLISTED:4,REJECTED:4,WITHDRAWN:0};
        const cs=sm[appStatus?.status]??1;
        const msgs={PROCESSING:"Your application is being processed.",SHORTLISTED:"Congratulations! You've been shortlisted.",UNDER_REVIEW:"Under detailed review.",REJECTED:"We've moved forward with other candidates.",WITHDRAWN:"You have withdrawn your application."};
        const isWithdrawn = appStatus?.status === "WITHDRAWN";
        return <div style={{minHeight:"100vh",paddingTop:isMobile?"100px":"120px"}}><div style={{maxWidth:"800px",margin:"0 auto",padding:`0 ${mp}`}}>
          <div style={S.sectionLabel}>Application Status</div>
          <h2 style={{fontFamily:displayFont,fontSize:isMobile?"28px":"36px",fontWeight:400,marginBottom:"8px"}}>{appStatus?.position||"AI Engineer"}</h2>
          <div style={{fontSize:"13px",color:"#555",marginBottom:"48px"}}>ID: {appStatus?.applicationId||"—"}</div>
          {!isWithdrawn&&<div style={{display:"flex",alignItems:"center",margin:"40px 0",flexWrap:"wrap",gap:isMobile?"4px":"0"}}>{steps.map((s,i)=><div key={s} style={{display:"flex",alignItems:"center"}}><div style={S.pStep(i<cs?"done":i===cs?"now":"wait")}><span>{i<cs?"✓":String(i+1).padStart(2,"0")}</span>{!isMobile&&<span>{s}</span>}</div>{i<steps.length-1&&!isMobile&&<div style={S.pLine(i<cs)}/>}</div>)}</div>}
          {isMobile&&!isWithdrawn&&<div style={{fontSize:"12px",color:"#888",marginBottom:"16px"}}>Step {cs+1} of {steps.length}: {steps[cs]||"Complete"}</div>}
          <Spacer h={32}/>
          <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",padding:isMobile?"24px":"32px"}}><div style={{display:"flex",justifyContent:"space-between",marginBottom:"20px",flexWrap:"wrap",gap:"12px"}}><div style={S.sectionLabel}>Status</div><div style={S.badge(appStatus?.status||"PROCESSING")}>{(appStatus?.status||"PROCESSING").replace("_"," ")}</div></div><p style={{fontSize:"15px",color:"#AAA",lineHeight:1.7,fontFamily:displayFont}}>{msgs[appStatus?.status]||msgs.PROCESSING}</p></div>
          {appStatus?.gameScores&&!isWithdrawn&&<><Spacer h={32}/><div style={S.sectionLabel}>Assessment</div><div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",padding:"20px"}}><span style={{fontSize:"13px",color:"#888"}}>Cognitive assessment completed</span></div></>}
          {!isWithdrawn&&appStatus?.status!=="REJECTED"&&appStatus?.status!=="SHORTLISTED"&&<>
            <Spacer h={40}/>
            {!withdrawConfirm?<button style={S.dangerBtn} onClick={()=>setWithdrawConfirm(true)}>Withdraw Application</button>
            :<div style={{background:"rgba(239,68,68,0.05)",border:"1px solid rgba(239,68,68,0.2)",padding:isMobile?"24px":"32px"}}>
              <p style={{fontSize:"14px",color:"#CCC",fontFamily:displayFont,marginBottom:"20px",lineHeight:1.6}}>Are you sure you want to withdraw your application? This action cannot be undone.</p>
              <div style={{display:"flex",gap:"12px",flexWrap:"wrap"}}>
                <button style={{...S.dangerBtn,width:"auto",padding:"12px 32px"}} onClick={withdrawApplication}>Yes, Withdraw</button>
                <button style={{...S.primaryBtn,width:"auto",padding:"12px 32px",marginTop:0}} onClick={()=>setWithdrawConfirm(false)}>Cancel</button>
              </div>
            </div>}
          </>}
          {isWithdrawn&&<><Spacer h={40}/><button style={S.primaryBtn} onClick={()=>{setAppStatus(null);setSubmitted(false);setAppStep(0);setGamePhase("intro");setGameScores({pattern:0,math:0,debug:0});setAppData({education:"",experience:"",source:"",aiAnswer:"",quantAnswer:"",hftLevel:"",techStack:[],extraInfo:"",resumeFile:null,resumeName:""});setPage("home");}}>Browse Open Roles →</button></>}
        </div></div>;
      })()}

      {/* FOOTER */}
      {!["signup","signin","apply","status"].includes(page)&&<div style={{padding:`60px ${mp}`,borderTop:"1px solid rgba(255,255,255,0.04)",marginTop:"40px"}}><div style={{display:"flex",justifyContent:"space-between",flexWrap:"wrap",gap:"16px"}}><div><div style={{fontFamily:displayFont,fontSize:"20px",marginBottom:"8px"}}>Kotak Quantitative Trading</div><div style={{fontSize:"12px",color:"#444"}}>Mumbai, India</div></div><div style={{fontSize:"11px",color:"#333"}}>© 2026</div></div></div>}
    </div>
  );
}
