import { useState, useEffect, useRef } from "react";

// ─── Google Analytics ─────────────────────────────────────────────────────────
// Replace G-XXXXXXXXXX with your real Measurement ID from analytics.google.com
const GA_ID = "G-0QE3EP5HXC";

function initGA() {
  if (typeof window === "undefined" || window._gaLoaded) return;
  window._gaLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
}

function track(event, params = {}) {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", event, params);
  }
}

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are NutriAdvisor AI — a friendly, knowledgeable nutrition assistant specializing in affordable, healthy meals for students and low-income individuals in Tanzania and East Africa.

Your expertise includes:
- Tanzanian staple foods: ugali, mchicha, dagaa (sardines), ndizi, viazi, maharage, kunde, mbaazi, matembele, cassava, sorghum, chips, chips yai, sweet potatoes, rice, fruits, meat, fish, chicken.
- Budget meal planning using local market prices (TZS)
- Nutritional value of local foods
- Street food advice (mama lishe options)
- Simple recipes using locally available ingredients
- Hydration and health tips suited for the Tanzanian climate
- Seasonal eating based on Tanzanian harvest cycles

Guidelines:
- Always suggest meals under TZS 3,000–5,000 per day for students when possible, suggest above TZS 5,000 when asked
- Recommend foods available at local markets (soko) and dukas
- Balance: proteins (beans, eggs, milk, dagaa, meat, chicken, fish, when affordable), carbs (ugali, rice, viazi), vegetables (mchicha, matembele, cauliflower, cabbage)
- Be warm, encouraging, and practical
- Support both English and Swahili — respond in whichever language the user uses
- If asked in Swahili, respond fully in Swahili
- Give specific portion sizes and simple cooking instructions (if asked)
- Mention nutrition benefits in plain language (no jargon)
- For students: suggest meal prep tips, shared cooking to save costs, campus canteen healthy choices
- Always be culturally respectful and sensitive to local food traditions
- Always end responses with: "ℹ️ NutriAdvisor provides educational nutrition guidance, not medical advice."
- Keep responses short, clear, understarndable and not boring

Keep responses concise, practical, and friendly. Use emojis occasionally to keep it warm. Never recommend foods that are unavailable or too expensive without offering a cheaper local alternative.`;

const SUGGESTED_QUESTIONS = [
  { en: "Cheap meals under TZS 4,000?", sw: "Chakula cha bei nafuu?" },
  { en: "High protein foods in Tanzania?", sw: "Vyakula vya protini?" },
  { en: "Healthy breakfast on a budget?", sw: "Kifungua kinywa cha afya?" },
  { en: "What to eat for energy during exams?", sw: "Chakula cha nguvu wakati wa mtihani?" },
  { en: "How to cook mchicha nutritiously?", sw: "Jinsi ya kupika mchicha?" },
  { en: "Weekly meal plan for TZS 20,000?", sw: "Mpango wa chakula wiki nzima?" },
];

// ─── Storage helpers (all browser-only, nothing sent anywhere) ────────────────
const storage = {
  getProfiles: () => {
    try { return JSON.parse(localStorage.getItem("na_profiles") || "[]"); }
    catch { return []; }
  },
  saveProfiles: (profiles) => {
    try { localStorage.setItem("na_profiles", JSON.stringify(profiles)); }
    catch {}
  },
  getChats: (profileId) => {
    try { return JSON.parse(localStorage.getItem(`na_chats_${profileId}`) || "[]"); }
    catch { return []; }
  },
  saveChats: (profileId, chats) => {
    try { localStorage.setItem(`na_chats_${profileId}`, JSON.stringify(chats)); }
    catch {}
  },
  getActiveProfile: () => {
    try { return localStorage.getItem("na_active_profile") || null; }
    catch { return null; }
  },
  setActiveProfile: (id) => {
    try { localStorage.setItem("na_active_profile", id); }
    catch {}
  },
  clearActiveProfile: () => {
    try { localStorage.removeItem("na_active_profile"); }
    catch {}
  },
};

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const now = () => new Date().toLocaleString("en-TZ", { dateStyle: "medium", timeStyle: "short" });

// ─── Avatars ──────────────────────────────────────────────────────────────────
const AVATARS = ["🧑", "👩", "👨", "🧒", "👩‍🎓", "👨‍🎓", "🧑‍💼", "👩‍💼", "🧑‍🍳", "👩‍🍳"];

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 1 — Profile selector / creator
// ══════════════════════════════════════════════════════════════════════════════
function ProfileScreen({ onSelect }) {
  const [profiles, setProfiles] = useState(storage.getProfiles);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [chosenAvatar, setChosenAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) { setError("Please enter your name."); return; }
    if (name.length < 2) { setError("Name must be at least 2 characters."); return; }
    if (profiles.find((p) => p.name.toLowerCase() === name.toLowerCase())) {
      setError("That name is already taken on this device."); return;
    }
    const profile = { id: genId(), name, avatar: chosenAvatar, createdAt: now() };
    const updated = [...profiles, profile];
    storage.saveProfiles(updated);
    setProfiles(updated);
    setCreating(false);
    setNewName("");
    setError("");
    track("profile_created");
    onSelect(profile);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Delete this profile and all its chats?")) return;
    const updated = profiles.filter((p) => p.id !== id);
    storage.saveProfiles(updated);
    localStorage.removeItem(`na_chats_${id}`);
    setProfiles(updated);
  };

  return (
    <div style={ps.page}>
      <div style={ps.card}>
        <div style={ps.logo}>🥗</div>
        <h1 style={ps.title}>NutriAdvisor AI</h1>
        <p style={ps.sub}>Chakula bora, bei nafuu · Healthy meals, small budget</p>

        {!creating ? (
          <>
            <p style={ps.who}>Who's using the app?</p>
            <div style={ps.profileGrid}>
              {profiles.map((p) => (
                <div key={p.id} style={ps.profileBtn} onClick={() => onSelect(p)}>
                  <div style={ps.profileAvatar}>{p.avatar}</div>
                  <span style={ps.profileName}>{p.name}</span>
                  <button
                    style={ps.deleteBtn}
                    onClick={(e) => handleDelete(e, p.id)}
                    title="Delete profile"
                  >✕</button>
                </div>
              ))}
              <div style={ps.addBtn} onClick={() => setCreating(true)}>
                <span style={ps.addIcon}>＋</span>
                <span style={ps.addLabel}>Add Profile</span>
              </div>
            </div>
          </>
        ) : (
          <div style={ps.createForm}>
            <p style={ps.who}>Create your profile</p>
            <p style={ps.formLabel}>Choose an avatar</p>
            <div style={ps.avatarGrid}>
              {AVATARS.map((a) => (
                <button
                  key={a}
                  style={{ ...ps.avatarBtn, ...(chosenAvatar === a ? ps.avatarBtnActive : {}) }}
                  onClick={() => setChosenAvatar(a)}
                >{a}</button>
              ))}
            </div>
            <p style={ps.formLabel}>Your name</p>
            <input
              style={ps.input}
              placeholder="e.g. Amina, John, Fatuma..."
              value={newName}
              onChange={(e) => { setNewName(e.target.value); setError(""); }}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
              maxLength={30}
              autoFocus
            />
            {error && <p style={ps.error}>{error}</p>}
            <button style={ps.createBtn} onClick={handleCreate}>Create Profile ✓</button>
            <button style={ps.cancelBtn} onClick={() => { setCreating(false); setError(""); setNewName(""); }}>
              Cancel
            </button>
          </div>
        )}

        <p style={ps.privacy}>
          🔒 All data stays in your browser only. Nothing is sent to any server except your chat messages to the AI.
        </p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 2 — Chat history sidebar view
// ══════════════════════════════════════════════════════════════════════════════
function HistoryScreen({ profile, chats, onOpen, onNew, onBack }) {
  return (
    <div style={hs.page}>
      <div style={hs.header}>
        <button style={hs.backBtn} onClick={onBack}>← Switch Profile</button>
        <div style={hs.profileInfo}>
          <span style={hs.avatar}>{profile.avatar}</span>
          <span style={hs.name}>{profile.name}</span>
        </div>
        <button style={hs.newBtn} onClick={onNew}>+ New Chat</button>
      </div>

      <div style={hs.body}>
        <p style={hs.heading}>💬 Your Saved Chats</p>
        {chats.length === 0 ? (
          <div style={hs.empty}>
            <p style={hs.emptyIcon}>🌿</p>
            <p style={hs.emptyText}>No chats yet.</p>
            <p style={hs.emptySubText}>Start a new chat to get nutrition advice!</p>
            <button style={hs.startBtn} onClick={onNew}>Start Chatting</button>
          </div>
        ) : (
          <div style={hs.list}>
            {[...chats].reverse().map((chat) => (
              <div key={chat.id} style={hs.chatItem} onClick={() => onOpen(chat)}>
                <div style={hs.chatIcon}>💬</div>
                <div style={hs.chatMeta}>
                  <p style={hs.chatTitle}>{chat.title}</p>
                  <p style={hs.chatDate}>{chat.updatedAt} · {chat.messages.length} messages</p>
                </div>
                <span style={hs.chevron}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SCREEN 3 — Active chat
// ══════════════════════════════════════════════════════════════════════════════
function TypingIndicator() {
  return (
    <div style={cs.bubbleRow("assistant")}>
      <div style={cs.avatar}>🥦</div>
      <div style={{ ...cs.bubble("assistant"), display: "flex", alignItems: "center", gap: 5, padding: "14px 18px" }}>
        {[0, 1, 2].map((i) => (
          <span key={i} style={cs.dot(i)} />
        ))}
      </div>
    </div>
  );
}

function ChatScreen({ profile, chat, onBack, onSave }) {
  const [messages, setMessages] = useState(chat ? chat.messages : []);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [chatId] = useState(chat ? chat.id : genId());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const showSuggestions = messages.length === 0;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-save on every message change
  useEffect(() => {
    if (messages.length === 0) return;
    const title = messages[0]?.content?.slice(0, 45) + (messages[0]?.content?.length > 45 ? "…" : "") || "New Chat";
    onSave({ id: chatId, title, messages, updatedAt: now() });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || loading) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setLoading(true);
    track("message_sent", { is_suggestion: !!text });

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          system: SYSTEM_PROMPT,
          messages: newMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const reply = data?.content?.[0]?.text || "Samahani, kuna tatizo. / Sorry, something went wrong.";
      setMessages([...newMessages, { role: "assistant", content: reply }]);
      track("message_received");
    } catch {
      setMessages([...newMessages, { role: "assistant", content: "⚠️ Samahani, hakuna muunganisho. Tafadhali jaribu tena. / Sorry, no connection. Please try again." }]);
      track("message_error");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div style={cs.page}>
      <div style={cs.blob1} />
      <div style={cs.blob2} />
      <div style={cs.container}>

        {/* Header */}
        <header style={cs.header}>
          <button style={cs.backBtn} onClick={onBack} title="Back to chats">
            ‹ Chats
          </button>
          <div style={cs.headerCenter}>
            <div style={cs.logoCircle}>🥗</div>
            <div>
              <h1 style={cs.title}>NutriAdvisor AI</h1>
              <p style={cs.subtitle}>Chatting as {profile.avatar} {profile.name}</p>
            </div>
          </div>
          <div style={{ width: 70 }} />
        </header>

        {/* Chat area */}
        <main style={cs.chatArea}>
          {showSuggestions && (
            <div style={cs.welcome}>
              <div style={cs.welcomeEmoji}>🌿</div>
              <h2 style={cs.welcomeTitle}>Karibu, {profile.name}!</h2>
              <p style={cs.welcomeText}>
                Ask me anything about affordable, healthy eating in Tanzania.
              </p>
              <div style={cs.suggestionsGrid}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    style={cs.suggestBtn}
                    onClick={() => { sendMessage(q.en); track("suggestion_clicked", { question: q.en }); }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "#16a34a";
                      e.currentTarget.style.color = "#fff";
                      e.currentTarget.style.transform = "translateY(-2px)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "#f0fdf4";
                      e.currentTarget.style.color = "#166534";
                      e.currentTarget.style.transform = "translateY(0)";
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 600 }}>{q.en}</span>
                    <span style={{ fontSize: 11, opacity: 0.7, display: "block" }}>{q.sw}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={cs.bubbleRow(msg.role)}>
              {msg.role === "assistant" && <div style={cs.avatar}>🥦</div>}
              <div style={cs.bubble(msg.role)}>
                {msg.content.split("\n").map((line, j) => (
                  <span key={j}>{line}{j < msg.content.split("\n").length - 1 && <br />}</span>
                ))}
              </div>
              {msg.role === "user" && <div style={{ ...cs.avatar, fontSize: 18 }}>{profile.avatar}</div>}
            </div>
          ))}

          {loading && <TypingIndicator />}
          <div ref={bottomRef} />
        </main>

        {/* Input */}
        <footer style={cs.footer}>
          <div style={cs.inputRow}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about meals, recipes, nutrition... / Uliza kuhusu chakula..."
              style={cs.textarea}
              rows={1}
              disabled={loading}
            />
            <button
              onClick={() => sendMessage()}
              disabled={loading || !input.trim()}
              style={{ ...cs.sendBtn, opacity: loading || !input.trim() ? 0.5 : 1, cursor: loading || !input.trim() ? "not-allowed" : "pointer" }}
            >
              {loading ? "⏳" : "➤"}
            </button>
          </div>
          <p style={cs.hint}>
            Press Enter to send · Chats auto-save to your browser
          </p>
          <p style={cs.disclaimer}>
            ⚕️ Educational guidance only — not medical advice
          </p>
        </footer>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT — orchestrates screens
// ══════════════════════════════════════════════════════════════════════════════
export default function NutriAdvisor() {
  const [screen, setScreen] = useState("profiles"); // profiles | history | chat
  const [activeProfile, setActiveProfile] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  // Init Google Analytics once on app load
  useEffect(() => {
    initGA();
    track("page_view", { page_title: "NutriAdvisor AI" });
  }, []);

  // On mount, restore last active profile
  useEffect(() => {
    const savedId = storage.getActiveProfile();
    if (savedId) {
      const profiles = storage.getProfiles();
      const found = profiles.find((p) => p.id === savedId);
      if (found) {
        setActiveProfile(found);
        setChats(storage.getChats(found.id));
        setScreen("history");
      }
    }
  }, []);

  const selectProfile = (profile) => {
    setActiveProfile(profile);
    const loaded = storage.getChats(profile.id);
    setChats(loaded);
    storage.setActiveProfile(profile.id);
    track("profile_selected");
    setScreen("history");
  };

  const openChat = (chat) => {
    setActiveChat(chat);
    track("chat_opened");
    setScreen("chat");
  };

  const startNewChat = () => {
    setActiveChat(null);
    track("new_chat_started");
    setScreen("chat");
  };

  const saveChat = (chatData) => {
    setChats((prev) => {
      const exists = prev.find((c) => c.id === chatData.id);
      const updated = exists
        ? prev.map((c) => (c.id === chatData.id ? chatData : c))
        : [...prev, chatData];
      storage.saveChats(activeProfile.id, updated);
      return updated;
    });
  };

  const goBackToHistory = () => {
    setActiveChat(null);
    setScreen("history");
  };

  const goBackToProfiles = () => {
    storage.clearActiveProfile();
    setActiveProfile(null);
    setScreen("profiles");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Plus Jakarta Sans', sans-serif; }
        textarea:focus { outline: none; }
        button:focus { outline: none; }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes popIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        ::-webkit-scrollbar { width: 5px; }
        ::-webkit-scrollbar-thumb { background: #bbf7d0; border-radius: 10px; }
      `}</style>

      {screen === "profiles" && (
        <ProfileScreen onSelect={selectProfile} />
      )}
      {screen === "history" && activeProfile && (
        <HistoryScreen
          profile={activeProfile}
          chats={chats}
          onOpen={openChat}
          onNew={startNewChat}
          onBack={goBackToProfiles}
        />
      )}
      {screen === "chat" && activeProfile && (
        <ChatScreen
          profile={activeProfile}
          chat={activeChat}
          onBack={goBackToHistory}
          onSave={saveChat}
        />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════

// Profile screen
const ps = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4, #dcfce7, #bbf7d0)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, fontFamily: "'Plus Jakarta Sans', sans-serif" },
  card: { background: "#fff", borderRadius: 24, padding: "36px 28px", maxWidth: 520, width: "100%", boxShadow: "0 24px 60px rgba(0,0,0,0.1)", animation: "popIn 0.3s ease", textAlign: "center" },
  logo: { fontSize: 52, marginBottom: 10 },
  title: { fontSize: 26, fontWeight: 700, color: "#15803d", marginBottom: 4 },
  sub: { fontSize: 12.5, color: "#4b7a5a", marginBottom: 28 },
  who: { fontSize: 15, fontWeight: 600, color: "#374151", marginBottom: 16 },
  profileGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 12, marginBottom: 20 },
  profileBtn: { background: "#f0fdf4", border: "1.5px solid #bbf7d0", borderRadius: 14, padding: "14px 10px", cursor: "pointer", position: "relative", transition: "all 0.2s", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 },
  profileAvatar: { fontSize: 32 },
  profileName: { fontSize: 13, fontWeight: 600, color: "#166534", wordBreak: "break-word" },
  deleteBtn: { position: "absolute", top: 6, right: 6, background: "rgba(239,68,68,0.1)", border: "none", color: "#ef4444", borderRadius: 6, width: 20, height: 20, fontSize: 10, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 },
  addBtn: { background: "#fff", border: "2px dashed #86efac", borderRadius: 14, padding: "14px 10px", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, transition: "all 0.2s" },
  addIcon: { fontSize: 28, color: "#16a34a", lineHeight: 1 },
  addLabel: { fontSize: 12, fontWeight: 600, color: "#16a34a" },
  createForm: { textAlign: "left" },
  formLabel: { fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 8, marginTop: 14 },
  avatarGrid: { display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  avatarBtn: { fontSize: 22, background: "#f0fdf4", border: "2px solid transparent", borderRadius: 10, width: 44, height: 44, cursor: "pointer", transition: "all 0.15s" },
  avatarBtnActive: { border: "2px solid #16a34a", background: "#dcfce7", transform: "scale(1.1)" },
  input: { width: "100%", border: "2px solid #d1fae5", borderRadius: 12, padding: "12px 14px", fontSize: 14.5, fontFamily: "inherit", color: "#1a3a24", background: "#f8fffe", marginBottom: 6 },
  error: { color: "#ef4444", fontSize: 12.5, marginBottom: 8 },
  createBtn: { width: "100%", background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", border: "none", borderRadius: 12, padding: "13px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 },
  cancelBtn: { width: "100%", background: "transparent", color: "#6b7280", border: "1.5px solid #e5e7eb", borderRadius: 12, padding: "11px", fontSize: 14, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  privacy: { fontSize: 11, color: "#9ca3af", marginTop: 16, lineHeight: 1.6 },
};

// History screen
const hs = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4, #dcfce7)", fontFamily: "'Plus Jakarta Sans', sans-serif", display: "flex", flexDirection: "column" },
  header: { background: "linear-gradient(90deg, #16a34a, #15803d)", padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 },
  backBtn: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" },
  profileInfo: { display: "flex", alignItems: "center", gap: 8 },
  avatar: { fontSize: 22 },
  name: { color: "#fff", fontWeight: 700, fontSize: 15 },
  newBtn: { background: "#fff", border: "none", color: "#16a34a", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  body: { flex: 1, maxWidth: 600, width: "100%", margin: "0 auto", padding: "24px 20px" },
  heading: { fontSize: 16, fontWeight: 700, color: "#15803d", marginBottom: 16 },
  empty: { textAlign: "center", padding: "60px 20px" },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyText: { fontSize: 18, fontWeight: 700, color: "#374151", marginBottom: 6 },
  emptySubText: { fontSize: 14, color: "#6b7280", marginBottom: 24 },
  startBtn: { background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", border: "none", borderRadius: 12, padding: "13px 28px", fontSize: 14.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  chatItem: { background: "#fff", borderRadius: 14, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, cursor: "pointer", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", border: "1.5px solid #f0fdf4", transition: "all 0.2s", animation: "fadeUp 0.3s ease" },
  chatIcon: { fontSize: 24, flexShrink: 0 },
  chatMeta: { flex: 1, minWidth: 0 },
  chatTitle: { fontSize: 14, fontWeight: 600, color: "#1a3a24", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  chatDate: { fontSize: 11.5, color: "#6b7280", marginTop: 3 },
  chevron: { fontSize: 22, color: "#16a34a", fontWeight: 700, flexShrink: 0 },
};

// Chat screen
const cs = {
  page: { minHeight: "100vh", background: "linear-gradient(135deg, #f0fdf4, #dcfce7, #bbf7d0)", display: "flex", alignItems: "center", justifyContent: "center", padding: 0, position: "relative", overflow: "hidden", fontFamily: "'Plus Jakarta Sans', sans-serif" },
  blob1: { position: "fixed", top: -120, right: -120, width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, #86efac 0%, transparent 70%)", opacity: 0.5, pointerEvents: "none" },
  blob2: { position: "fixed", bottom: -100, left: -100, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, #4ade80 0%, transparent 70%)", opacity: 0.4, pointerEvents: "none" },
  container: { width: "100%", maxWidth: 720, height: "100dvh", maxHeight: 900, background: "#fff", borderRadius: 24, boxShadow: "0 32px 80px rgba(0,0,0,0.12)", display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", background: "linear-gradient(90deg, #16a34a, #15803d)", color: "#fff", flexShrink: 0 },
  backBtn: { background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", borderRadius: 10, padding: "7px 14px", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit", flexShrink: 0 },
  headerCenter: { display: "flex", alignItems: "center", gap: 10 },
  logoCircle: { width: 40, height: 40, borderRadius: "50%", background: "rgba(255,255,255,0.2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 },
  title: { fontSize: 17, fontWeight: 700, lineHeight: 1.2 },
  subtitle: { fontSize: 11, opacity: 0.85, marginTop: 2 },
  chatArea: { flex: 1, overflowY: "auto", padding: "20px 20px 10px", display: "flex", flexDirection: "column", gap: 12 },
  welcome: { textAlign: "center", padding: "20px 12px", animation: "fadeUp 0.5s ease" },
  welcomeEmoji: { fontSize: 48, marginBottom: 10 },
  welcomeTitle: { fontSize: 22, fontWeight: 700, color: "#15803d", marginBottom: 6 },
  welcomeText: { fontSize: 14, color: "#4b7a5a", lineHeight: 1.6, maxWidth: 460, margin: "0 auto 20px" },
  suggestionsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(190px, 1fr))", gap: 10, maxWidth: 580, margin: "0 auto" },
  suggestBtn: { background: "#f0fdf4", color: "#166534", border: "1.5px solid #bbf7d0", borderRadius: 12, padding: "11px 13px", fontSize: 13, fontWeight: 600, cursor: "pointer", textAlign: "left", transition: "all 0.2s ease", fontFamily: "inherit", lineHeight: 1.4 },
  bubbleRow: (role) => ({ display: "flex", flexDirection: role === "user" ? "row-reverse" : "row", alignItems: "flex-end", gap: 10, animation: "fadeUp 0.3s ease" }),
  avatar: { width: 34, height: 34, borderRadius: "50%", background: "#f0fdf4", border: "2px solid #bbf7d0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 },
  bubble: (role) => ({ maxWidth: "75%", padding: "12px 16px", borderRadius: role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px", background: role === "user" ? "linear-gradient(135deg, #16a34a, #15803d)" : "#f8fffe", color: role === "user" ? "#fff" : "#1a3a24", fontSize: 14.5, lineHeight: 1.65, boxShadow: role === "user" ? "0 4px 14px rgba(22,163,74,0.3)" : "0 2px 8px rgba(0,0,0,0.07)", wordBreak: "break-word" }),
  dot: (i) => ({ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: "#16a34a", animation: "blink 1.2s infinite", animationDelay: `${i * 0.2}s` }),
  footer: { padding: "10px 16px 12px", borderTop: "1px solid #f0fdf4", background: "#fff", flexShrink: 0 },
  inputRow: { display: "flex", gap: 10, alignItems: "flex-end" },
  textarea: { flex: 1, resize: "none", border: "2px solid #d1fae5", borderRadius: 14, padding: "12px 16px", fontSize: 14.5, fontFamily: "'Plus Jakarta Sans', sans-serif", color: "#1a3a24", background: "#f8fffe", lineHeight: 1.5, maxHeight: 120, overflow: "auto" },
  sendBtn: { width: 48, height: 48, borderRadius: 14, background: "linear-gradient(135deg, #16a34a, #15803d)", color: "#fff", border: "none", fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, boxShadow: "0 4px 14px rgba(22,163,74,0.35)" },
  hint: { fontSize: 11, color: "#86a98f", textAlign: "center", marginTop: 6, fontWeight: 500 },
  disclaimer: { fontSize: 10.5, color: "#a3b8a9", textAlign: "center", marginTop: 3 },
};
