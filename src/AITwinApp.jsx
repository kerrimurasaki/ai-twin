import { useState, useRef, useCallback, useEffect } from "react";
import { 
  auth, 
  sendSignInLinkToEmail, 
  isSignInWithEmailLink, 
  signInWithEmailLink 
} from "./firebase";

// ─── CONFIG — API calls go to Vercel serverless functions ────────────────────
// Keys live in /api/twin.js and /api/image.js on the server.
// Visitors never see the API key. Nothing to configure here.

// ─── HELPER WORDS by category ────────────────────────────────────────────────
const WORD_CATEGORIES = [
  {
    label: "Personality",
    color: "#7c6af5",
    words: ["Curious", "Driven", "Calm", "Bold", "Precise", "Empathetic", "Analytical", "Creative", "Strategic", "Resilient"]
  },
  {
    label: "Work Style",
    color: "#e8a020",
    words: ["Detail-oriented", "Big-picture", "Collaborative", "Independent", "Fast-moving", "Methodical", "Hands-on", "Visionary", "Structured", "Adaptive"]
  },
  {
    label: "Strengths",
    color: "#10c4a0",
    words: ["Problem-solver", "Communicator", "Leader", "Builder", "Connector", "Innovator", "Mentor", "Negotiator", "Executor", "Storyteller"]
  },
  {
    label: "Values",
    color: "#e05c8a",
    words: ["Integrity", "Impact", "Excellence", "Growth", "Balance", "Service", "Mastery", "Fairness", "Courage", "Curiosity"]
  }
];

// ─── API CALLS — proxied through Express (dev) or Vercel (prod) ──────────────
async function generateTwinProfile(jobTitle, words) {
  const res = await fetch("/api/twin", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jobTitle, words })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data;
}

async function generateTwinImage(imagePrompt) {
  const res = await fetch("/api/image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ imagePrompt })
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error);
  return data.image;
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --void: #0a0a0a;
    --deep: #0f0f0f;
    --surface: #1a1a1a;
    --card-bg: #0a0f1e;
    --border: #2d2d2d;
    --neon: #00e5ff;
    --neon2: #7c6af5;
    --gold: #e8c44a;
    --pink: #e05c8a;
    --text: #f5f5f5;
    --muted: #888888;
    --paper: #ffffff;
  }

  html, body { background: var(--void); color: var(--text); font-family: 'Inter', sans-serif; min-height: 100vh; overflow-x: hidden; -webkit-font-smoothing: antialiased; }

  .starfield {
    position: fixed; inset: 0; pointer-events: none; z-index: 0;
    background:
      radial-gradient(ellipse 80% 60% at 20% 10%, rgba(124,106,245,0.05) 0%, transparent 60%),
      radial-gradient(ellipse 60% 80% at 80% 80%, rgba(0,229,255,0.04) 0%, transparent 60%);
  }

  .app { position: relative; z-index: 1; max-width: 680px; margin: 0 auto; padding: 0 24px 100px; }

  .header { padding: 64px 0 48px; text-align: center; animation: fadeDown 0.8s ease both; }
  .header-eyebrow { font-family: 'DM Mono', monospace; font-size: 11px; letter-spacing: 0.3em; text-transform: uppercase; color: var(--neon); margin-bottom: 20px; display: flex; align-items: center; justify-content: center; gap: 16px; font-weight: 600; }
  .eyebrow-line { width: 40px; height: 1px; background: linear-gradient(to right, transparent, var(--neon)); }
  .eyebrow-line.r { background: linear-gradient(to left, transparent, var(--neon)); }
  .header-title { font-family: 'Orbitron', sans-serif; font-size: clamp(32px, 8vw, 58px); font-weight: 900; line-height: 1.1; letter-spacing: -0.02em; color: var(--paper); margin-bottom: 12px; }
  .header-title span { color: var(--neon); }
  .header-sub { font-size: 17px; font-weight: 300; color: var(--muted); line-height: 1.7; max-width: 480px; margin: 16px auto 0; }

  .input-section { animation: fadeUp 0.8s 0.15s ease both; margin-bottom: 32px; }
  .field-label { font-family: 'DM Mono', monospace; font-size: 10px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--muted); margin-bottom: 10px; display: block; }
  .job-input-wrap { position: relative; margin-bottom: 24px; }
  .job-input { width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 6px; padding: 16px 20px; font-family: 'DM Sans', sans-serif; font-size: 16px; color: var(--text); outline: none; transition: border-color 0.2s, box-shadow 0.2s; }
  .job-input:focus { border-color: var(--neon); box-shadow: 0 0 0 3px rgba(74,240,208,0.08); }
  .job-input::placeholder { color: var(--muted); }

  .input-section { animation: fadeUp 0.8s 0.15s ease both; display: flex; flex-direction: column; gap: 40px; }
  .field-label { font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: var(--neon); margin-bottom: 14px; display: block; opacity: 0.9; }
  
  .job-input-wrap { margin-bottom: 0px; }
  .job-input { width: 100%; background: var(--surface); border: 2px solid var(--border); border-radius: 8px; padding: 20px 24px; font-family: 'Inter', sans-serif; font-size: 18px; color: var(--text); outline: none; transition: all 0.2s ease; }
  .job-input:focus { border-color: var(--neon); box-shadow: 0 0 20px rgba(0,229,255,0.15); background: var(--deep); }
  .job-input::placeholder { color: #555; }

  .word-section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 20px; border-bottom: 1px solid var(--border); padding-bottom: 12px; }
  .word-counter { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 600; color: var(--muted); }
  .word-counter strong { color: var(--neon); font-size: 16px; }

  .category-block { margin-bottom: 32px; }
  .category-label { font-size: 10px; font-weight: 700; letter-spacing: 0.25em; text-transform: uppercase; margin-bottom: 16px; display: flex; align-items: center; gap: 10px; }
  .category-dot { width: 6px; height: 6px; border-radius: 1px; }
  
  .word-chips { display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 10px; }
  .chip { padding: 14px 16px; border-radius: 6px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 600; border: 2px solid; cursor: pointer; transition: all 0.2s ease; background: transparent; user-select: none; text-align: center; }
  .chip:hover:not(.disabled) { transform: scale(1.02); border-color: var(--neon); color: var(--neon); box-shadow: 0 0 15px rgba(0,229,255,0.1); }
  .chip.selected { color: var(--void) !important; box-shadow: 0 0 20px currentColor; }
  .chip.disabled:not(.selected) { opacity: 0.2; cursor: not-allowed; border-color: var(--border) !important; color: var(--muted) !important; }

  .selected-preview { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; padding: 20px 24px; background: var(--deep); border: 2px dashed var(--border); border-radius: 8px; min-height: 72px; }
  .preview-label { font-size: 11px; font-weight: 800; color: var(--muted); letter-spacing: 0.15em; text-transform: uppercase; margin-right: 8px; }
  .preview-word { padding: 6px 16px; border-radius: 4px; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; }
  .preview-empty { font-size: 14px; color: #444; font-style: italic; }

  .gen-btn { width: 100%; height: 72px; background: var(--neon); border: none; border-radius: 6px; font-family: 'Orbitron', sans-serif; font-size: 18px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; color: var(--void); cursor: pointer; transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); position: relative; overflow: hidden; }
  .gen-btn:hover:not(:disabled) { transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,229,255,0.4); background: var(--paper); }
  .gen-btn:active:not(:disabled) { transform: translateY(-1px); }
  .gen-btn:disabled { background: #222; color: #444; cursor: not-allowed; border: 1px solid #333; }

  /* Mobile Grid Fix */
  @media (max-width: 600px) {
    .word-chips { grid-template-columns: 1fr 1fr; }
    .app { padding: 0 16px 80px; }
    .header { padding: 48px 0 32px; }
    .input-section { gap: 32px; }
    .chip { padding: 18px 12px; font-size: 15px; } /* Even bigger for fat fingers */
    .gen-btn { height: 80px; font-size: 16px; }
  }

  .loading-section { padding-top: 80px; text-align: center; animation: fadeIn 0.4s ease both; }
  .loading-orb { width: 100px; height: 100px; border-radius: 50%; margin: 0 auto 40px; background: radial-gradient(circle, rgba(0,229,255,0.2), transparent); border: 2px solid var(--neon); animation: orbPulse 2s ease infinite; }
  @keyframes orbPulse { 0%,100%{transform:scale(1);opacity:1;box-shadow: 0 0 20px var(--neon)} 50%{transform:scale(1.15);opacity:0.5;box-shadow: 0 0 50px var(--neon)} }
  .loading-title { font-family: 'Orbitron', sans-serif; font-size: 20px; font-weight: 900; color: var(--neon); letter-spacing: 0.15em; margin-bottom: 20px; text-transform: uppercase; }
  .loading-step { font-size: 15px; color: var(--muted); font-weight: 300; margin-bottom: 40px; }
  .loading-bar-track { height: 4px; background: #1a1a1a; border-radius: 4px; overflow: hidden; max-width: 320px; margin: 0 auto; }
  .loading-bar-fill { height: 100%; background: var(--neon); animation: loadBar 2.5s cubic-bezier(0.65, 0, 0.35, 1) infinite; }
  @keyframes loadBar { 0%{transform:translateX(-100%) scaleX(0.1)} 50%{transform:translateX(0) scaleX(0.7)} 100%{transform:translateX(100%) scaleX(0.1)} }

  .card-section { margin-top: 48px; animation: fadeUp 0.7s ease both; }
  .card-outer { position: relative; border-radius: 12px; padding: 2px; background: var(--border); margin-bottom: 40px; transition: all 0.5s ease; cursor: pointer; }
  .card-outer:hover { background: var(--neon); box-shadow: 0 0 40px rgba(0,229,255,0.2); }
  .card-inner { background: #050505; border-radius: 10px; overflow: hidden; position: relative; }
  .card-sheen { position: absolute; inset: 0; pointer-events: none; border-radius: 10px; z-index: 10; background: linear-gradient(105deg, transparent 20%, rgba(0,229,255,0.05) 30%, transparent 45%); animation: sheenMove 6s ease infinite; }
  @keyframes sheenMove { 0%,100%{background-position:0% 50%} 50%{background-position:100% 50%} }

  .card-image-area { position: relative; height: 320px; overflow: hidden; background: #000; }
  .card-image { width: 100%; height: 100%; object-fit: cover; filter: contrast(1.1) brightness(1.1); animation: fadeIn 1s ease; }
  .card-image-area::after { content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 140px; background: linear-gradient(to top, #050505, transparent); z-index: 2; }

  .lock-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(12px); z-index: 10; display: flex; align-items: center; justify-content: center; padding: 32px; text-align: center; }
  .lock-content { max-width: 280px; animation: fadeUp 0.6s ease both; }
  .lock-icon { font-size: 32px; margin-bottom: 16px; color: var(--neon); }
  .lock-title { font-family: 'Orbitron', sans-serif; font-size: 16px; font-weight: 900; letter-spacing: 0.1em; color: #fff; margin-bottom: 8px; text-transform: uppercase; }
  .lock-sub { font-size: 13px; color: #888; margin-bottom: 24px; line-height: 1.5; }
  
  .unlock-input { width: 100%; background: #111; border: 1px solid #333; border-radius: 4px; padding: 12px 16px; color: #fff; font-size: 14px; margin-bottom: 12px; outline: none; }
  .unlock-input:focus { border-color: var(--neon); }
  .unlock-btn { width: 100%; padding: 12px; background: var(--neon); color: var(--void); border: none; border-radius: 4px; font-family: 'Orbitron', sans-serif; font-size: 11px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; }
  .unlock-btn:hover:not(:disabled) { transform: translateY(-2px); box-shadow: 0 5px 15px rgba(0,229,255,0.3); }
  .unlock-btn:disabled { opacity: 0.5; cursor: not-allowed; }
  .unlock-error { color: var(--pink); font-size: 11px; margin-top: 8px; font-weight: 600; }

  .card-series { position: absolute; top: 16px; left: 16px; z-index: 5; font-family: 'Orbitron', sans-serif; font-size: 10px; font-weight: 900; letter-spacing: 0.25em; color: var(--void); padding: 5px 12px; border-radius: 2px; background: var(--neon); }
  .card-rarity { position: absolute; top: 16px; right: 16px; z-index: 5; display: flex; gap: 4px; }
  .rarity-star { color: var(--neon); font-size: 14px; }
  
  .card-name-block { position: absolute; bottom: 0; left: 0; right: 0; z-index: 5; padding: 24px 28px; }
  .card-twin-name { font-family: 'Orbitron', sans-serif; font-size: 38px; font-weight: 900; color: #fff; letter-spacing: 0.05em; line-height: 1; margin-bottom: 8px; }
  .card-twin-fullname { font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; color: var(--neon); }

  .card-body { padding: 24px 28px 40px; }
  .card-origin { font-size: 14px; font-weight: 400; color: #999; border-left: 3px solid var(--neon); padding-left: 16px; margin-bottom: 32px; line-height: 1.6; font-style: italic; }

  .stats-table { width: 100%; margin-bottom: 32px; border-collapse: collapse; }
  .stats-table th { font-size: 10px; font-weight: 900; letter-spacing: 0.2em; text-transform: uppercase; color: #444; padding: 0 0 12px; text-align: left; border-bottom: 1px solid #222; }
  .stats-table td { padding: 14px 0; font-size: 14px; color: #eee; border-bottom: 1px solid #111; }
  .stats-table td:first-child { font-weight: 800; color: #555; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
  .ai-val { color: var(--neon); font-weight: 700; }
  .th-you { color: var(--muted) !important; }
  .th-ai { color: var(--neon) !important; }

  .card-mission-label { font-size: 10px; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; color: var(--neon); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .card-mission { font-size: 15px; color: #ccc; line-height: 1.7; margin-bottom: 32px; font-weight: 400; }
  .card-super-label { font-size: 10px; font-weight: 900; letter-spacing: 0.25em; text-transform: uppercase; color: var(--pink); margin-bottom: 10px; display: flex; align-items: center; gap: 8px; }
  .card-super { font-size: 15px; color: #ccc; line-height: 1.7; margin-bottom: 40px; font-weight: 400; }
  
  .card-tagline { background: #111; border: 2px solid #222; border-radius: 8px; padding: 24px; text-align: center; font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 900; letter-spacing: 0.05em; line-height: 1.5; color: #fff; text-transform: uppercase; }

  .card-footer { display: flex; justify-content: space-between; align-items: center; padding: 20px 28px; background: #000; border-top: 1px solid #111; }
  .card-footer-brand { font-family: 'Orbitron', sans-serif; font-size: 9px; font-weight: 900; letter-spacing: 0.3em; color: #333; }
  .footer-word-chip { font-size: 10px; font-weight: 800; letter-spacing: 0.1em; padding: 4px 10px; background: #111; color: #555; border-radius: 2px; text-transform: uppercase; }

  .card-actions { display: flex; gap: 16px; margin-bottom: 64px; }
  .btn-share { flex: 2; height: 64px; background: var(--neon); border: none; border-radius: 6px; font-family: 'Orbitron', sans-serif; font-size: 14px; font-weight: 900; letter-spacing: 0.15em; text-transform: uppercase; color: var(--void); cursor: pointer; transition: all 0.2s; }
  .btn-reset { flex: 1; height: 64px; background: transparent; border: 2px solid var(--border); border-radius: 6px; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 700; color: var(--muted); cursor: pointer; transition: all 0.2s; }
  .btn-share:hover { background: var(--paper); box-shadow: 0 0 30px rgba(0,229,255,0.3); }
  .btn-reset:hover { border-color: #444; color: #fff; }

  .error-msg { background: rgba(224,92,138,0.1); border: 1px solid rgba(224,92,138,0.25); border-radius: 6px; padding: 12px 16px; font-size: 13px; color: #f08aaa; margin-bottom: 16px; text-align: center; }
  .toast { position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%); background: rgba(0,229,255,0.15); border: 1px solid var(--neon); color: var(--neon); padding: 12px 24px; border-radius: 6px; font-family: 'DM Mono', monospace; font-size: 12px; letter-spacing: 0.08em; z-index: 300; animation: fadeUp 0.3s ease both; }

  @keyframes fadeDown { from{opacity:0;transform:translateY(-30px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeUp   { from{opacity:0;transform:translateY(30px)}  to{opacity:1;transform:translateY(0)} }
  @keyframes fadeIn   { from{opacity:0} to{opacity:1} }

  @media (max-width: 480px) {
    .card-twin-name { font-size: 32px; }
    .card-actions { flex-direction: column; }
    .btn-share, .btn-reset { width: 100%; height: 72px; }
  }
`;

// ─── LOADING STEPS ────────────────────────────────────────────────────────────
const LOADING_STEPS = [
  "Analysing your profile…",
  "Constructing your AI Twin…",
  "Generating holographic portrait…",
  "Calibrating superpower matrix…",
  "Finalising your trading card…"
];

// ─── COMPONENT ────────────────────────────────────────────────────────────────
export default function AITwinApp() {
  const [jobTitle, setJobTitle] = useState("");
  const [selectedWords, setSelectedWords] = useState([]);
  const [phase, setPhase]       = useState("input");
  const [loadingStep, setLoadingStep] = useState(0);
  const [twin, setTwin]         = useState(null);
  const [twinImage, setTwinImage] = useState(null);
  const [email, setEmail]       = useState("");
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [isEmailSent, setIsEmailSent] = useState(false);
  const [error, setError]       = useState("");
  const [toast, setToast]       = useState("");
  const cardRef = useRef(null);
  const stepTimer = useRef(null);

  // ─── FIREBASE LINK DETECTION ────────────────────────────────────────────────
  useEffect(() => {
    const checkLink = async () => {
      const url = window.location.href;
      if (isSignInWithEmailLink(auth, url)) {
        setPhase("loading");
        setLoadingStep(0);
        setToast("⌛ Verifying magic link...");
        
        let savedEmail = window.localStorage.getItem('emailForSignIn');
        if (!savedEmail) {
          savedEmail = window.prompt('Please provide your email for confirmation');
        }
        
        try {
          await signInWithEmailLink(auth, savedEmail, url);
          window.localStorage.removeItem('emailForSignIn');
          setToast("✓ Email verified!");
          
          const savedTwin = window.localStorage.getItem('pendingTwin');
          const savedWords = window.localStorage.getItem('pendingWords');
          
          if (savedTwin && savedWords) {
            setToast("✨ Restoring your AI Twin...");
            const parsedTwin = JSON.parse(savedTwin);
            setTwin(parsedTwin);
            setSelectedWords(JSON.parse(savedWords));
            setPhase("card");
            
            // Auto-trigger image generation
            setIsUnlocking(true);
            try {
              const imgUrl = await generateTwinImage(parsedTwin.image_prompt);
              setTwinImage(imgUrl);
              setToast("✓ Portrait revealed!");
            } catch (imageErr) {
              setError("Email verified, but image generation failed.");
              console.error(imageErr);
              setToast("⚠️ Image generation failed");
            }
            setIsUnlocking(false);
          } else {
            console.warn("No pending twin data found in localStorage.");
            setError("Email verified! But we couldn't find your session data. This happens if you opened the link in a different browser or device.");
            setPhase("input");
          }
        } catch (err) {
          console.error("Link validation error:", err);
          setError(err.message || "Failed to validate link. It may have expired or was used once already.");
          setToast("❌ Link validation failed");
          setPhase("input");
        }
        setTimeout(() => setToast(""), 4000);
      }
    };
    checkLink();
  }, [setToast]);

  const toggleWord = (word) => {
    setSelectedWords(prev => {
      if (prev.includes(word)) return prev.filter(w => w !== word);
      if (prev.length >= 3) return prev;
      return [...prev, word];
    });
  };

  const canGenerate = jobTitle.trim().length > 1 && selectedWords.length === 3;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setPhase("loading");
    setError("");
    setLoadingStep(0);
    let step = 0;
    stepTimer.current = setInterval(() => {
      step = Math.min(step + 1, LOADING_STEPS.length - 1);
      setLoadingStep(step);
    }, 2200);
    try {
      const profile = await generateTwinProfile(jobTitle.trim(), selectedWords);
      clearInterval(stepTimer.current);
      
      // Persist twin data so it survives the email redirect
      window.localStorage.setItem('pendingTwin', JSON.stringify(profile));
      window.localStorage.setItem('pendingWords', JSON.stringify(selectedWords));
      
      setTwin(profile);
      setPhase("card");
    } catch (err) {
      clearInterval(stepTimer.current);
      setError(err.message || "Something went wrong generating your twin. Please try again.");
      setPhase("input");
    }
  };

  const handleUnlockImage = async () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setEmailError("Please enter a valid email address");
      return;
    }
    setEmailError("");
    setIsUnlocking(true);
    
    const actionCodeSettings = {
      url: window.location.href, // Redirect back to this page
      handleCodeInApp: true,
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setIsEmailSent(true);
    } catch (err) {
      setError(err.message || "Failed to send validation email. Please try again.");
      console.error(err);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleReset = () => {
    setPhase("input"); setTwin(null); setTwinImage(null);
    setSelectedWords([]); setJobTitle(""); setError("");
    setEmail(""); setEmailError(""); setIsEmailSent(false);
    window.localStorage.removeItem('pendingTwin');
    window.localStorage.removeItem('pendingWords');
  };

  const handleShare = useCallback(async () => {
    const text = `🤖 Meet ${twin?.twin_name} — my AI Twin!\n"${twin?.tagline}"\n\nGenerated at the AI Literacy Booth · aiclassasean.org`;
    try {
      if (navigator.share) { await navigator.share({ title: `My AI Twin: ${twin?.twin_name}`, text }); }
      else { await navigator.clipboard.writeText(text); setToast("✓ Copied to clipboard"); setTimeout(() => setToast(""), 3000); }
    } catch { /* user cancelled */ }
  }, [twin]);

  const getWordColor = (word) => {
    for (const cat of WORD_CATEGORIES) { if (cat.words.includes(word)) return cat.color; }
    return "#e8a020";
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="starfield" />
      <div className="stars" />
      <div className="app">

        <header className="header">
          <div className="header-eyebrow">
            <div className="eyebrow-line" />
            AI Literacy Booth · ASEAN
            <div className="eyebrow-line r" />
          </div>
          <h1 className="header-title">Meet Your<br /><span>AI Twin</span></h1>
          <p className="header-sub">Describe yourself in 3 words. Discover the AI version of you — and the superpower it can never replicate.</p>
        </header>

        {phase === "input" && (
          <div className="input-section">
            <label className="field-label">Your job title</label>
            <div className="job-input-wrap">
              <input className="job-input" placeholder="e.g. Teacher, Engineer, Banker…"
                value={jobTitle} onChange={e => setJobTitle(e.target.value)} />
            </div>
            <div className="word-section">
              <div className="word-section-header">
                <label className="field-label" style={{ margin: 0 }}>Pick exactly 3 words that describe you</label>
                <div className="word-counter"><strong>{selectedWords.length}</strong> / 3 selected</div>
              </div>
              {WORD_CATEGORIES.map(cat => (
                <div key={cat.label} className="category-block">
                  <div className="category-label" style={{ color: cat.color }}>
                    <div className="category-dot" style={{ background: cat.color }} />
                    {cat.label}
                  </div>
                  <div className="word-chips">
                    {cat.words.map(word => {
                      const isSelected = selectedWords.includes(word);
                      const isDisabled = !isSelected && selectedWords.length >= 3;
                      return (
                        <button key={word}
                          className={`chip ${isSelected ? "selected" : ""} ${isDisabled ? "disabled" : ""}`}
                          style={{ borderColor: isSelected ? cat.color : "var(--border)", color: isSelected ? "var(--void)" : cat.color, background: isSelected ? cat.color : "transparent" }}
                          onClick={() => toggleWord(word)} disabled={isDisabled}>
                          {word}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
            <div className="selected-preview">
              <span className="preview-label">Your 3 words:</span>
              {selectedWords.length === 0
                ? <span className="preview-empty">None selected yet</span>
                : selectedWords.map(w => (
                    <span key={w} className="preview-word"
                      style={{ background: `${getWordColor(w)}22`, color: getWordColor(w), border: `1px solid ${getWordColor(w)}44` }}>
                      {w}
                    </span>
                  ))
              }
            </div>
            {error && <div className="error-msg">{error}</div>}
            <button className="gen-btn" onClick={handleGenerate} disabled={!canGenerate}>
              {canGenerate ? "Generate My AI Twin →" : `Select ${3 - selectedWords.length} more word${3 - selectedWords.length !== 1 ? "s" : ""} to continue`}
            </button>
          </div>
        )}

        {phase === "loading" && (
          <div className="loading-section">
            <div className="loading-orb" />
            <div className="loading-title">Building Your Twin</div>
            <p className="loading-step">{LOADING_STEPS[loadingStep]}</p>
            <div className="loading-bar-track"><div className="loading-bar-fill" /></div>
          </div>
        )}

        {phase === "card" && twin && (
          <div className="card-section">
            <div className="card-outer" ref={cardRef}>
              <div className="card-inner">
                <div className="card-sheen" />
                <div className="card-image-area">
                  <div className="card-series">AI TWIN · SERIES 01</div>
                  <div className="card-rarity">{[1,2,3,4,5].map(i => <span key={i} className="rarity-star">★</span>)}</div>
                  
                  {twinImage ? (
                    <img className="card-image" src={twinImage} alt={twin.twin_name} />
                  ) : (
                    <div className="lock-overlay">
                      <div className="lock-content">
                        {isEmailSent ? (
                          <>
                            <div className="lock-icon">✉️</div>
                            <div className="lock-title">Check Your Email</div>
                            <div className="lock-sub">
                              You will receive an email from <strong>noreply@speakmesh.firebaseapp.com</strong>, 
                              if not check your spam folder.<br /><br />
                              Click on the link <strong>"Sign in to SpeakMesh"</strong> to return here and reveal your portrait.
                            </div>
                            <button className="unlock-btn" onClick={() => setIsEmailSent(false)}>
                              Try another email
                            </button>
                          </>
                        ) : (
                          <>
                            <div className="lock-icon">🔒</div>
                            <div className="lock-title">Portrait Locked</div>
                            <div className="lock-sub">Enter your email to unlock your AI Twin's holographic portrait.</div>
                            <input 
                              type="email" 
                              className="unlock-input" 
                              placeholder="your@email.com"
                              value={email}
                              onChange={e => setEmail(e.target.value)}
                            />
                            <button 
                              className="unlock-btn" 
                              onClick={handleUnlockImage}
                              disabled={isUnlocking}
                            >
                              {isUnlocking ? "Unlocking..." : "Unlock Portrait"}
                            </button>
                            {emailError && <div className="unlock-error">{emailError}</div>}
                            {error && <div className="unlock-error" style={{ color: '#ff4d4d' }}>{error}</div>}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="card-name-block">
                    <div className="card-twin-name">{twin.twin_name}</div>
                    <div className="card-twin-fullname">{twin.twin_full_name}</div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="card-origin">"{twin.origin_quote}"</div>
                  <table className="stats-table">
                    <thead>
                      <tr>
                        <th>Capability</th>
                        <th className="th-you">You</th>
                        <th className="th-ai">{twin.twin_name?.split("-")[0]}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {twin.stats?.map((s, i) => (
                        <tr key={i}>
                          <td>{s.label}</td>
                          <td className="human-val">{s.human}</td>
                          <td className="ai-val">{s.ai}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="card-divider" />
                  <div className="card-mission-label">▶ Mission</div>
                  <div className="card-mission">{twin.mission}</div>
                  <div className="card-super-label">✦ Your Superpower</div>
                  <div className="card-super">{twin.human_superpower}</div>
                  <div className="card-tagline">{twin.tagline}</div>
                </div>
                <div className="card-footer">
                  <div className="card-footer-brand">aiclassasean.org</div>
                  <div className="card-footer-words">
                    {selectedWords.map(w => <span key={w} className="footer-word-chip">{w}</span>)}
                  </div>
                </div>
              </div>
            </div>
            <div className="card-actions">
              <button className="btn-share" onClick={handleShare}>↗ Share My Twin</button>
              <button className="btn-reset" onClick={handleReset}>← Try Again</button>
            </div>
          </div>
        )}
      </div>
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}
