import { useState, useEffect, useRef } from "react";

// ─── Google Analytics ─────────────────────────────────────────────────────────
const GA_ID = "G-0QE3EP5HXC";
function initGA() {
  if (typeof window === "undefined" || window._gaLoaded) return;
  window._gaLoaded = true;
  const s = document.createElement("script");
  s.async = true; s.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
  document.head.appendChild(s);
  window.dataLayer = window.dataLayer || [];
  window.gtag = function () { window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", GA_ID, { anonymize_ip: true });
}
function track(event, params = {}) {
  if (typeof window !== "undefined" && window.gtag) window.gtag("event", event, params);
}

// ─── Markdown renderer ────────────────────────────────────────────────────────
function renderMarkdown(text) {
  const lines = text.split("\n");
  const elements = [];
  let tableBuffer = [], inTable = false, key = 0;

  const flushTable = () => {
    if (tableBuffer.length < 2) { tableBuffer = []; inTable = false; return; }
    const headers = tableBuffer[0].split("|").map(h => h.trim()).filter(Boolean);
    const rows = tableBuffer.slice(2).map(r => r.split("|").map(c => c.trim()).filter(Boolean));
    elements.push(
      <div key={key++} style={{ overflowX: "auto", margin: "10px 0" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 13 }}>
          <thead><tr>{headers.map((h, i) => <th key={i} style={{ background: "#16a34a", color: "#fff", padding: "8px 12px", textAlign: "left", fontWeight: 700, whiteSpace: "nowrap" }}>{h}</th>)}</tr></thead>
          <tbody>{rows.map((row, i) => <tr key={i} style={{ background: i % 2 === 0 ? "#f0fdf4" : "#fff" }}>{row.map((cell, j) => <td key={j} style={{ padding: "7px 12px", borderBottom: "1px solid #d1fae5", fontSize: 13 }}>{cell}</td>)}</tr>)}</tbody>
        </table>
      </div>
    );
    tableBuffer = []; inTable = false;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("|")) { inTable = true; tableBuffer.push(line); continue; }
    else if (inTable) flushTable();

    if (line.startsWith("### ")) elements.push(<p key={key++} style={{ fontWeight: 700, fontSize: 14, color: "#15803d", margin: "10px 0 4px" }}>{line.slice(4)}</p>);
    else if (line.startsWith("## ")) elements.push(<p key={key++} style={{ fontWeight: 700, fontSize: 15, color: "#15803d", margin: "12px 0 4px" }}>{line.slice(3)}</p>);
    else if (line.startsWith("# ")) elements.push(<p key={key++} style={{ fontWeight: 700, fontSize: 16, color: "#15803d", margin: "12px 0 6px" }}>{line.slice(2)}</p>);
    else if (line.match(/^[-*•]\s/)) {
      const content = line.replace(/^[-*•]\s/, "");
      elements.push(<div key={key++} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "3px 0" }}><span style={{ color: "#16a34a", fontWeight: 700, fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>•</span><span style={{ fontSize: 14, lineHeight: 1.6 }}>{formatInline(content)}</span></div>);
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)[1];
      const content = line.replace(/^\d+\.\s/, "");
      elements.push(<div key={key++} style={{ display: "flex", gap: 8, alignItems: "flex-start", margin: "3px 0" }}><span style={{ color: "#16a34a", fontWeight: 700, fontSize: 13, lineHeight: 1.6, flexShrink: 0, minWidth: 18 }}>{num}.</span><span style={{ fontSize: 14, lineHeight: 1.6 }}>{formatInline(content)}</span></div>);
    } else if (line.trim() === "") elements.push(<div key={key++} style={{ height: 5 }} />);
    else elements.push(<p key={key++} style={{ fontSize: 14, lineHeight: 1.65, margin: "2px 0" }}>{formatInline(line)}</p>);
  }
  if (inTable) flushTable();
  return elements;
}

function formatInline(text) {
  const parts = text.split(/(\*\*.*?\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) return <strong key={i} style={{ fontWeight: 700, color: "#15803d" }}>{part.slice(2, -2)}</strong>;
    return part;
  });
}

// ─── System Prompt ────────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `Wewe ni NutriAdvisor AI — msaidizi wa lishe wa karibu na wenye ujuzi, unayebobea katika milo ya bei nafuu na yenye afya kwa wanafunzi na watu wa kipato cha chini Tanzania na Afrika Mashariki.

Ujuzi wako ni pamoja na:
- Vyakula vya asili vya Tanzania: ugali, mchicha, dagaa, ndizi, viazi, maharage, kunde, mbaazi, matembele, mihogo, mtama, matembele, cassava, sorghum, chips, chips yai, sweet potatoes, rice, fruits, meat, fish, chicken.
- Mipango ya milo ya bajeti kwa kutumia bei za masoko ya hapa (TZS)
- Thamani ya lishe ya vyakula vya hapa
- Ushauri wa chakula cha barabara (chaguo za mama lishe)
- Mapishi rahisi kwa kutumia viungo vinavyopatikana hapa
- Seasonal eating based on Tanzanian harvest cycles

Kanuni muhimu:
- Daima pendekeza milo chini ya TZS 3,000-5,000 kwa siku kwa wanafunzi
- Pendekeza vyakula vinavyopatikana masokoni na madukani ya karibu
- Jibu kwa Kiswahili sanifu iwapo mtumiaji anaandika Kiswahili
- Jibu kwa Kiingereza iwapo mtumiaji anaandika Kiingereza
- MUHIMU: Usikurudie milo uliyopendekeza katika mazungumzo haya. Angalia historia na pendekeza milo MIPYA tu
- Tumia muundo mzuri: **maneno mazito**, orodha za •, meza, vichwa vya habari
- Mwisho wa kila jibu andika: "ℹ️ Mwongozo wa kielimu tu, si ushauri wa dawa."

Guidelines:
- Always suggest meals under TZS 3,000–5,000 per day for students when possible, suggest above TZS 5,000 when asked
- Recommend foods available at local markets (soko) and dukas
- Balance: proteins (beans, eggs, milk, dagaa, meat, chicken, fish, when affordable), carbs (ugali, rice, viazi), vegetables (mchicha, matembele, cauliflower, cabbage)
- Be warm, encouraging, and practical
- Suggest proteins such as meat, fish and chicken in meal generation above 4,000 weekly (chiken price is starts 2,000, 1kg meat is 11,000, fish is 15,000)
- Support both English and Swahili — respond in whichever language the user uses
- If asked in Swahili, respond fully in Swahili
- Give specific portion sizes and simple cooking instructions (if asked)
- Mention nutrition benefits in plain language (no jargon)
- For students: suggest meal prep tips, shared cooking to save costs, campus canteen healthy choices
- Always be culturally respectful and sensitive to local food traditions
- Always end responses with: "ℹ️ NutriAdvisor provides educational nutrition guidance, not medical advice."
- Keep responses short, clear, understarndable and not boring


Jibu kwa ufupi, wa vitendo na wa kirafiki. Tumia emoji mara kwa mara.`;

const MEAL_PLAN_PROMPT = `Wewe ni NutriAdvisor AI. Tengeneza mpango wa milo wa wiki nzima (siku 7) kwa mtumiaji Tanzania.

Maelekezo:
- Bajeti: {BUDGET} TZS kwa wiki
- Idadi ya watu: {PEOPLE}
- Mahitaji maalum: {NEEDS}

Tengeneza mpango kamili kwa muundo huu kwa KILA siku (Jumatatu-Jumapili):

## Siku ya [Jina]
**Kiamsha kinywa:** [chakula] - TZS [bei]
**Chakula cha mchana:** [chakula] - TZS [bei]
**Chakula cha jioni:** [chakula] - TZS [bei]
**Jumla ya siku:** TZS [jumla]

Baada ya siku zote, ongeza:
## Orodha ya Ununuzi
Orodha ya vitu vyote vya kununua na bei zake.

## Jumla ya Wiki
Jumla ya gharama yote.

Hakikisha milo inabadilika kila siku (usikurudie milo hiyo hiyo). Tumia vyakula vya Tanzania.`;

const SUGGESTED_QUESTIONS = [
  { sw: "Chakula cha bei nafuu chini ya TZS 2,000?", en: "Cheap meals under TZS 2,000?" },
  { sw: "Vyakula vya protini Tanzania?", en: "High protein foods in Tanzania?" },
  { sw: "Kiamsha kinywa cha afya na bei nafuu?", en: "Healthy breakfast on a budget?" },
  { sw: "Chakula cha nguvu wakati wa mitihani?", en: "Food for energy during exams?" },
  { sw: "Jinsi ya kupika mchicha vizuri?", en: "How to cook mchicha well?" },
  { sw: "Vidokezo vya kupika kwa wanafunzi?", en: "Cooking tips for students?" },
];

// ─── Storage ──────────────────────────────────────────────────────────────────
const storage = {
  getProfiles: () => { try { return JSON.parse(localStorage.getItem("na_profiles") || "[]"); } catch { return []; } },
  saveProfiles: (p) => { try { localStorage.setItem("na_profiles", JSON.stringify(p)); } catch {} },
  getChats: (id) => { try { return JSON.parse(localStorage.getItem(`na_chats_${id}`) || "[]"); } catch { return []; } },
  saveChats: (id, c) => { try { localStorage.setItem(`na_chats_${id}`, JSON.stringify(c)); } catch {} },
  getActiveProfile: () => { try { return localStorage.getItem("na_active_profile") || null; } catch { return null; } },
  setActiveProfile: (id) => { try { localStorage.setItem("na_active_profile", id); } catch {} },
  clearActiveProfile: () => { try { localStorage.removeItem("na_active_profile"); } catch {} },
};

const genId = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const nowStr = () => new Date().toLocaleString("sw-TZ", { dateStyle: "medium", timeStyle: "short" });
const AVATARS = ["🧑","👩","👨","🧒","👩‍🎓","👨‍🎓","🧑‍💼","👩‍💼","🧑‍🍳","👩‍🍳"];

// ─── Streaming fetch helper ───────────────────────────────────────────────────
async function streamChat(messages, systemPrompt, onChunk, onDone, onError) {
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-5",
        max_tokens: 1500,
        system: systemPrompt,
        messages,
      }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullText = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split("\n");
      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "content_block_delta" && parsed.delta?.text) {
              fullText += parsed.delta.text;
              onChunk(fullText);
            }
          } catch {}
        }
      }
    }
    onDone(fullText || "Samahani, hakuna jibu. Tafadhali jaribu tena.");
  } catch (err) {
    onError("⚠️ Samahani, hakuna muunganisho. Tafadhali jaribu tena.");
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// PROFILE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function ProfileScreen({ onSelect }) {
  const [profiles, setProfiles] = useState(storage.getProfiles);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [chosenAvatar, setChosenAvatar] = useState(AVATARS[0]);
  const [error, setError] = useState("");

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) { setError("Tafadhali ingiza jina lako."); return; }
    if (name.length < 2) { setError("Jina liwe na herufi 2 au zaidi."); return; }
    if (profiles.find(p => p.name.toLowerCase() === name.toLowerCase())) { setError("Jina hili linatumika tayari."); return; }
    const profile = { id: genId(), name, avatar: chosenAvatar, createdAt: nowStr() };
    const updated = [...profiles, profile];
    storage.saveProfiles(updated);
    setProfiles(updated);
    setCreating(false); setNewName(""); setError("");
    track("profile_created");
    onSelect(profile);
  };

  const handleDelete = (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Futa wasifu huu na mazungumzo yake yote?")) return;
    const updated = profiles.filter(p => p.id !== id);
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
            <p style={ps.who}>Ni nani anayetumia app?</p>
            <div style={ps.profileGrid}>
              {profiles.map(p => (
                <div key={p.id} style={ps.profileBtn} onClick={() => onSelect(p)}>
                  <div style={ps.profileAvatar}>{p.avatar}</div>
                  <span style={ps.profileName}>{p.name}</span>
                  <button style={ps.deleteBtn} onClick={e => handleDelete(e, p.id)}>✕</button>
                </div>
              ))}
              <div style={ps.addBtn} onClick={() => setCreating(true)}>
                <span style={ps.addIcon}>＋</span>
                <span style={ps.addLabel}>Ongeza Wasifu</span>
              </div>
            </div>
          </>
        ) : (
          <div style={ps.createForm}>
            <p style={ps.who}>Tengeneza wasifu wako</p>
            <p style={ps.formLabel}>Chagua picha yako</p>
            <div style={ps.avatarGrid}>{AVATARS.map(a => <button key={a} style={{ ...ps.avatarBtn, ...(chosenAvatar === a ? ps.avatarBtnActive : {}) }} onClick={() => setChosenAvatar(a)}>{a}</button>)}</div>
            <p style={ps.formLabel}>Jina lako</p>
            <input style={ps.input} placeholder="mf. Amina, John, Fatuma..." value={newName} onChange={e => { setNewName(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && handleCreate()} maxLength={30} autoFocus />
            {error && <p style={ps.error}>{error}</p>}
            <button style={ps.createBtn} onClick={handleCreate}>Tengeneza Wasifu ✓</button>
            <button style={ps.cancelBtn} onClick={() => { setCreating(false); setError(""); setNewName(""); }}>Ghairi</button>
          </div>
        )}
        <p style={ps.privacy}>🔒 Data yako inabaki kwenye kifaa chako tu.</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// HISTORY SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function HistoryScreen({ profile, chats, onOpen, onNew, onBack, onMealPlan }) {
  return (
    <div style={hs.page}>
      <div style={hs.header}>
        <button style={hs.backBtn} onClick={onBack}>← Badilisha</button>
        <div style={hs.profileInfo}><span style={hs.avatar}>{profile.avatar}</span><span style={hs.name}>{profile.name}</span></div>
        <button style={hs.newBtn} onClick={onNew}>+ Mpya</button>
      </div>

      {/* Quick actions */}
      <div style={hs.quickRow}>
        <button style={hs.quickBtn} onClick={onNew}>💬 Mazungumzo Mapya</button>
        <button style={{ ...hs.quickBtn, background: "#fff7ed", borderColor: "#fed7aa", color: "#c2410c" }} onClick={onMealPlan}>📅 Mpango wa Milo</button>
      </div>

      <div style={hs.body}>
        <p style={hs.heading}>💬 Mazungumzo Yaliyohifadhiwa</p>
        {chats.length === 0 ? (
          <div style={hs.empty}>
            <p style={hs.emptyIcon}>🌿</p>
            <p style={hs.emptyText}>Hakuna mazungumzo bado.</p>
            <p style={hs.emptySubText}>Anza mazungumzo kupata ushauri wa lishe!</p>
            <button style={hs.startBtn} onClick={onNew}>Anza Mazungumzo</button>
          </div>
        ) : (
          <div style={hs.list}>
            {[...chats].reverse().map(chat => (
              <div key={chat.id} style={hs.chatItem} onClick={() => onOpen(chat)}>
                <div style={hs.chatIcon}>{chat.isMealPlan ? "📅" : "💬"}</div>
                <div style={hs.chatMeta}>
                  <p style={hs.chatTitle}>{chat.title}</p>
                  <p style={hs.chatDate}>{chat.updatedAt} · Ujumbe {chat.messages.length}</p>
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
// MEAL PLAN SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function MealPlanScreen({ profile, onBack, onSave }) {
  const [budget, setBudget] = useState("20000");
  const [people, setPeople] = useState("1");
  const [needs, setNeeds] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState("");
  const [generated, setGenerated] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { if (result) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [result]);

  const generate = () => {
    if (!budget || loading) return;
    setLoading(true); setResult(""); setGenerated(false);
    track("meal_plan_generated");

    const prompt = MEAL_PLAN_PROMPT
      .replace("{BUDGET}", budget)
      .replace("{PEOPLE}", people)
      .replace("{NEEDS}", needs || "Hakuna mahitaji maalum");

    streamChat(
      [{ role: "user", content: "Tengeneza mpango wa milo sasa hivi." }],
      prompt,
      (text) => setResult(text),
      (finalText) => {
        setLoading(false); setGenerated(true);
        const chatData = {
          id: genId(), isMealPlan: true,
          title: `📅 Mpango wa Milo - TZS ${Number(budget).toLocaleString()}`,
          messages: [
            { role: "user", content: `Mpango wa milo - Bajeti: TZS ${budget}, Watu: ${people}` },
            { role: "assistant", content: finalText },
          ],
          updatedAt: nowStr(),
        };
        onSave(chatData);
      },
      () => { setLoading(false); setResult("⚠️ Tatizo la muunganisho. Tafadhali jaribu tena."); }
    );
  };

  return (
    <div style={mp.page}>
      <div style={mp.container}>
        <header style={mp.header}>
          <button style={mp.backBtn} onClick={onBack}>‹ Nyuma</button>
          <div style={mp.headerCenter}>
            <div style={mp.logoCircle}>📅</div>
            <div>
              <h1 style={mp.title}>Mpango wa Milo</h1>
              <p style={mp.subtitle}>{profile.avatar} {profile.name}</p>
            </div>
          </div>
          <div style={{ width: 60 }} />
        </header>

        <div style={mp.body}>
          {/* Form */}
          <div style={mp.formCard}>
            <p style={mp.formTitle}>⚙️ Weka Maelezo Yako</p>

            <p style={mp.label}>💰 Bajeti ya wiki (TZS)</p>
            <div style={mp.budgetGrid}>
              {["10000","15000","20000","30000","50000"].map(b => (
                <button key={b} style={{ ...mp.budgetBtn, ...(budget === b ? mp.budgetBtnActive : {}) }} onClick={() => setBudget(b)}>
                  {Number(b).toLocaleString()}
                </button>
              ))}
            </div>
            <input style={mp.input} type="number" placeholder="Au ingiza kiasi chochote..." value={budget} onChange={e => setBudget(e.target.value)} />

            <p style={mp.label}>👥 Idadi ya watu</p>
            <div style={mp.peopleRow}>
              {["1","2","3","4","5+"].map(n => (
                <button key={n} style={{ ...mp.peopleBtn, ...(people === n ? mp.peopleBtnActive : {}) }} onClick={() => setPeople(n)}>{n}</button>
              ))}
            </div>

            <p style={mp.label}>🥗 Mahitaji maalum (si lazima)</p>
            <input style={mp.input} placeholder="mf. Mboga tu, bila nyama, mgonjwa wa kisukari..." value={needs} onChange={e => setNeeds(e.target.value)} />

            <button style={{ ...mp.generateBtn, opacity: loading ? 0.7 : 1 }} onClick={generate} disabled={loading}>
              {loading ? "⏳ Inaandaa mpango..." : "🍽️ Tengeneza Mpango wa Wiki"}
            </button>
          </div>

          {/* Result */}
          {(result || loading) && (
            <div style={mp.resultCard}>
              <p style={mp.resultTitle}>📋 Mpango Wako wa Wiki</p>
              {loading && !result && (
                <div style={{ display: "flex", gap: 6, padding: "10px 0" }}>
                  {[0,1,2].map(i => <span key={i} style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", display: "inline-block", animation: "blink 1.2s infinite", animationDelay: `${i*0.2}s` }} />)}
                </div>
              )}
              <div style={mp.resultContent}>{renderMarkdown(result)}</div>
              {generated && <p style={mp.savedNote}>✅ Mpango umehifadhiwa kwenye mazungumzo yako</p>}
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAT SCREEN
// ══════════════════════════════════════════════════════════════════════════════
function TypingIndicator() {
  return (
    <div style={cs.bubbleRow("assistant")}>
      <div style={cs.avatarIcon}>🥦</div>
      <div style={{ ...cs.bubble("assistant"), display: "flex", alignItems: "center", gap: 5, padding: "14px 18px" }}>
        {[0,1,2].map(i => <span key={i} style={cs.dot(i)} />)}
      </div>
    </div>
  );
}

function ChatScreen({ profile, chat, onBack, onSave }) {
  const [messages, setMessages] = useState(chat ? chat.messages : []);
  const [streamingText, setStreamingText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [chatId] = useState(chat ? chat.id : genId());
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const showSuggestions = messages.length === 0;

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, streamingText, isStreaming]);

  useEffect(() => {
    if (messages.length === 0) return;
    const title = messages[0]?.content?.slice(0, 45) + (messages[0]?.content?.length > 45 ? "…" : "") || "Mazungumzo Mapya";
    onSave({ id: chatId, title, messages, updatedAt: nowStr() });
  }, [messages]);

  const sendMessage = async (text) => {
    const userText = text || input.trim();
    if (!userText || isStreaming) return;
    setInput("");
    const newMessages = [...messages, { role: "user", content: userText }];
    setMessages(newMessages);
    setIsStreaming(true); setStreamingText("");
    track("message_sent", { is_suggestion: !!text });

    streamChat(
      newMessages.map(m => ({ role: m.role, content: m.content })),
      SYSTEM_PROMPT,
      (text) => { setStreamingText(text); },
      (finalText) => {
        setIsStreaming(false); setStreamingText("");
        setMessages([...newMessages, { role: "assistant", content: finalText }]);
        track("message_received");
      },
      (errMsg) => {
        setIsStreaming(false); setStreamingText("");
        setMessages([...newMessages, { role: "assistant", content: errMsg }]);
        track("message_error");
      }
    );
  };

  return (
    <div style={cs.page}>
      <div style={cs.container}>
        <header style={cs.header}>
          <button style={cs.backBtn} onClick={onBack}>‹ Nyuma</button>
          <div style={cs.headerCenter}>
            <div style={cs.logoCircle}>🥗</div>
            <div><h1 style={cs.title}>NutriAdvisor AI</h1><p style={cs.subtitle}>{profile.avatar} {profile.name}</p></div>
          </div>
          <div style={{ width: 60 }} />
        </header>

        <main style={cs.chatArea}>
          {showSuggestions && (
            <div style={cs.welcome}>
              <div style={cs.welcomeEmoji}>🌿</div>
              <h2 style={cs.welcomeTitle}>Karibu, {profile.name}!</h2>
              <p style={cs.welcomeText}>Niulize chochote kuhusu chakula cha bei nafuu na chenye afya Tanzania.</p>
              <div style={cs.suggestionsGrid}>
                {SUGGESTED_QUESTIONS.map((q, i) => (
                  <button key={i} style={cs.suggestBtn}
                    onClick={() => { sendMessage(q.sw); track("suggestion_clicked", { question: q.sw }); }}
                    onMouseEnter={e => { e.currentTarget.style.background = "#16a34a"; e.currentTarget.style.color = "#fff"; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "#f0fdf4"; e.currentTarget.style.color = "#166534"; }}
                  >
                    <span style={{ fontSize: 12.5, fontWeight: 600, display: "block" }}>{q.sw}</span>
                    <span style={{ fontSize: 11, opacity: 0.6, display: "block", marginTop: 2 }}>{q.en}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} style={cs.bubbleRow(msg.role)}>
              {msg.role === "assistant" && <div style={cs.avatarIcon}>🥦</div>}
              <div style={cs.bubble(msg.role)}>
                {msg.role === "assistant" ? renderMarkdown(msg.content) : <p style={{ fontSize: 14, lineHeight: 1.6, margin: 0 }}>{msg.content}</p>}
              </div>
              {msg.role === "user" && <div style={{ ...cs.avatarIcon, fontSize: 20 }}>{profile.avatar}</div>}
            </div>
          ))}

          {/* Streaming bubble */}
          {isStreaming && (
            <div style={cs.bubbleRow("assistant")}>
              <div style={cs.avatarIcon}>🥦</div>
              <div style={cs.bubble("assistant")}>
                {streamingText ? renderMarkdown(streamingText + "▌") : <div style={{ display: "flex", gap: 5, padding: "4px 0" }}>{[0,1,2].map(i => <span key={i} style={cs.dot(i)} />)}</div>}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </main>

        <footer style={cs.footer}>
          <div style={cs.inputRow}>
            <textarea ref={inputRef} value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Uliza kuhusu chakula, mapishi, lishe..." style={cs.textarea} rows={1} disabled={isStreaming} />
            <button onClick={() => sendMessage()} disabled={isStreaming || !input.trim()}
              style={{ ...cs.sendBtn, opacity: isStreaming || !input.trim() ? 0.5 : 1, cursor: isStreaming || !input.trim() ? "not-allowed" : "pointer" }}>
              {isStreaming ? "⏳" : "➤"}
            </button>
          </div>
          <p style={cs.disclaimer}>⚕️ Mwongozo wa kielimu tu — si ushauri wa dawa</p>
        </footer>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function NutriAdvisor() {
  const [screen, setScreen] = useState("profiles");
  const [activeProfile, setActiveProfile] = useState(null);
  const [chats, setChats] = useState([]);
  const [activeChat, setActiveChat] = useState(null);

  useEffect(() => { initGA(); track("page_view", { page_title: "NutriAdvisor AI" }); }, []);

  useEffect(() => {
    const savedId = storage.getActiveProfile();
    if (savedId) {
      const profiles = storage.getProfiles();
      const found = profiles.find(p => p.id === savedId);
      if (found) { setActiveProfile(found); setChats(storage.getChats(found.id)); setScreen("history"); }
    }
  }, []);

  const selectProfile = (profile) => {
    setActiveProfile(profile); setChats(storage.getChats(profile.id));
    storage.setActiveProfile(profile.id); track("profile_selected"); setScreen("history");
  };

  const saveChat = (chatData) => {
    setChats(prev => {
      const exists = prev.find(c => c.id === chatData.id);
      const updated = exists ? prev.map(c => c.id === chatData.id ? chatData : c) : [...prev, chatData];
      storage.saveChats(activeProfile.id, updated);
      return updated;
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
        html,body{height:100%;overflow:hidden;font-family:'Plus Jakarta Sans',sans-serif;background:#f0fdf4}
        #root{height:100%}
        textarea:focus,button:focus,input:focus{outline:none}
        @keyframes blink{0%,80%,100%{opacity:.2;transform:scale(.8)}40%{opacity:1;transform:scale(1)}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        @keyframes popIn{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#bbf7d0;border-radius:10px}
      `}</style>

      {screen === "profiles" && <ProfileScreen onSelect={selectProfile} />}
      {screen === "history" && activeProfile && (
        <HistoryScreen profile={activeProfile} chats={chats}
          onOpen={(chat) => { setActiveChat(chat); track("chat_opened"); setScreen("chat"); }}
          onNew={() => { setActiveChat(null); track("new_chat_started"); setScreen("chat"); }}
          onBack={() => { storage.clearActiveProfile(); setActiveProfile(null); setScreen("profiles"); }}
          onMealPlan={() => { track("meal_plan_opened"); setScreen("mealplan"); }}
        />
      )}
      {screen === "chat" && activeProfile && (
        <ChatScreen profile={activeProfile} chat={activeChat}
          onBack={() => { setActiveChat(null); setScreen("history"); }}
          onSave={saveChat} />
      )}
      {screen === "mealplan" && activeProfile && (
        <MealPlanScreen profile={activeProfile}
          onBack={() => setScreen("history")}
          onSave={saveChat} />
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// STYLES
// ══════════════════════════════════════════════════════════════════════════════
const ps = {
  page: { height:"100%", minHeight:"100dvh", background:"linear-gradient(135deg,#f0fdf4,#dcfce7,#bbf7d0)", display:"flex", alignItems:"center", justifyContent:"center", padding:"16px", overflowY:"auto" },
  card: { background:"#fff", borderRadius:20, padding:"28px 20px", maxWidth:480, width:"100%", boxShadow:"0 20px 60px rgba(0,0,0,0.1)", animation:"popIn 0.3s ease", textAlign:"center" },
  logo: { fontSize:48, marginBottom:8 }, title: { fontSize:22, fontWeight:700, color:"#15803d", marginBottom:4 },
  sub: { fontSize:12, color:"#4b7a5a", marginBottom:24 }, who: { fontSize:14, fontWeight:600, color:"#374151", marginBottom:14 },
  profileGrid: { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(90px,1fr))", gap:10, marginBottom:16 },
  profileBtn: { background:"#f0fdf4", border:"1.5px solid #bbf7d0", borderRadius:14, padding:"12px 8px", cursor:"pointer", position:"relative", display:"flex", flexDirection:"column", alignItems:"center", gap:5 },
  profileAvatar: { fontSize:28 }, profileName: { fontSize:12, fontWeight:600, color:"#166534", wordBreak:"break-word" },
  deleteBtn: { position:"absolute", top:5, right:5, background:"rgba(239,68,68,0.1)", border:"none", color:"#ef4444", borderRadius:5, width:18, height:18, fontSize:9, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 },
  addBtn: { background:"#fff", border:"2px dashed #86efac", borderRadius:14, padding:"12px 8px", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:5 },
  addIcon: { fontSize:24, color:"#16a34a", lineHeight:1 }, addLabel: { fontSize:11, fontWeight:600, color:"#16a34a" },
  createForm: { textAlign:"left" }, formLabel: { fontSize:12.5, fontWeight:600, color:"#374151", marginBottom:7, marginTop:12 },
  avatarGrid: { display:"flex", flexWrap:"wrap", gap:7 },
  avatarBtn: { fontSize:20, background:"#f0fdf4", border:"2px solid transparent", borderRadius:9, width:40, height:40, cursor:"pointer" },
  avatarBtnActive: { border:"2px solid #16a34a", background:"#dcfce7", transform:"scale(1.1)" },
  input: { width:"100%", border:"2px solid #d1fae5", borderRadius:11, padding:"11px 13px", fontSize:14, fontFamily:"inherit", color:"#1a3a24", background:"#f8fffe", marginBottom:6 },
  error: { color:"#ef4444", fontSize:12, marginBottom:7 },
  createBtn: { width:"100%", background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff", border:"none", borderRadius:11, padding:"13px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginBottom:8 },
  cancelBtn: { width:"100%", background:"transparent", color:"#6b7280", border:"1.5px solid #e5e7eb", borderRadius:11, padding:"11px", fontSize:13.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  privacy: { fontSize:10.5, color:"#9ca3af", marginTop:14, lineHeight:1.6 },
};

const hs = {
  page: { height:"100dvh", background:"linear-gradient(135deg,#f0fdf4,#dcfce7)", display:"flex", flexDirection:"column", overflow:"hidden" },
  header: { background:"linear-gradient(90deg,#16a34a,#15803d)", padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0 },
  backBtn: { background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:9, padding:"6px 12px", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  profileInfo: { display:"flex", alignItems:"center", gap:7 }, avatar: { fontSize:20 },
  name: { color:"#fff", fontWeight:700, fontSize:14 },
  newBtn: { background:"#fff", border:"none", color:"#16a34a", borderRadius:9, padding:"6px 12px", fontSize:12.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  quickRow: { display:"flex", gap:10, padding:"12px 16px", flexShrink:0 },
  quickBtn: { flex:1, background:"#f0fdf4", border:"1.5px solid #bbf7d0", color:"#166534", borderRadius:11, padding:"11px 8px", fontSize:13, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  body: { flex:1, overflowY:"auto", padding:"16px" },
  heading: { fontSize:15, fontWeight:700, color:"#15803d", marginBottom:12 },
  empty: { textAlign:"center", padding:"40px 16px" }, emptyIcon: { fontSize:44, marginBottom:8 },
  emptyText: { fontSize:16, fontWeight:700, color:"#374151", marginBottom:5 },
  emptySubText: { fontSize:13, color:"#6b7280", marginBottom:20 },
  startBtn: { background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff", border:"none", borderRadius:11, padding:"12px 24px", fontSize:14, fontWeight:700, cursor:"pointer", fontFamily:"inherit" },
  list: { display:"flex", flexDirection:"column", gap:8 },
  chatItem: { background:"#fff", borderRadius:13, padding:"12px 14px", display:"flex", alignItems:"center", gap:12, cursor:"pointer", boxShadow:"0 2px 8px rgba(0,0,0,0.06)", border:"1.5px solid #f0fdf4", animation:"fadeUp 0.3s ease" },
  chatIcon: { fontSize:20, flexShrink:0 }, chatMeta: { flex:1, minWidth:0 },
  chatTitle: { fontSize:13.5, fontWeight:600, color:"#1a3a24", overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" },
  chatDate: { fontSize:11, color:"#6b7280", marginTop:2 },
  chevron: { fontSize:20, color:"#16a34a", fontWeight:700, flexShrink:0 },
};

const mp = {
  page: { height:"100dvh", display:"flex", flexDirection:"column", overflow:"hidden", background:"linear-gradient(135deg,#fff7ed,#ffedd5)" },
  container: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", maxWidth:720, width:"100%", margin:"0 auto", background:"#fff", boxShadow:"0 0 40px rgba(0,0,0,0.08)" },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", background:"linear-gradient(90deg,#ea580c,#c2410c)", color:"#fff", flexShrink:0 },
  backBtn: { background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:9, padding:"6px 11px", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  headerCenter: { display:"flex", alignItems:"center", gap:9 },
  logoCircle: { width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 },
  title: { fontSize:15, fontWeight:700, lineHeight:1.2 }, subtitle: { fontSize:10.5, opacity:0.85, marginTop:1 },
  body: { flex:1, overflowY:"auto", padding:"16px" },
  formCard: { background:"#fff7ed", borderRadius:16, padding:"16px", border:"1.5px solid #fed7aa", marginBottom:14 },
  formTitle: { fontSize:14.5, fontWeight:700, color:"#c2410c", marginBottom:14 },
  label: { fontSize:12.5, fontWeight:600, color:"#374151", marginBottom:8, marginTop:12 },
  budgetGrid: { display:"grid", gridTemplateColumns:"repeat(5,1fr)", gap:6, marginBottom:8 },
  budgetBtn: { background:"#fff", border:"1.5px solid #fed7aa", color:"#c2410c", borderRadius:9, padding:"7px 4px", fontSize:11, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  budgetBtnActive: { background:"#ea580c", border:"1.5px solid #ea580c", color:"#fff" },
  input: { width:"100%", border:"1.5px solid #fed7aa", borderRadius:10, padding:"10px 12px", fontSize:13.5, fontFamily:"inherit", color:"#374151", background:"#fff", marginBottom:4 },
  peopleRow: { display:"flex", gap:8, marginBottom:4 },
  peopleBtn: { flex:1, background:"#fff", border:"1.5px solid #fed7aa", color:"#c2410c", borderRadius:9, padding:"8px 4px", fontSize:13, fontWeight:600, cursor:"pointer", fontFamily:"inherit" },
  peopleBtnActive: { background:"#ea580c", border:"1.5px solid #ea580c", color:"#fff" },
  generateBtn: { width:"100%", background:"linear-gradient(135deg,#ea580c,#c2410c)", color:"#fff", border:"none", borderRadius:12, padding:"14px", fontSize:14.5, fontWeight:700, cursor:"pointer", fontFamily:"inherit", marginTop:14 },
  resultCard: { background:"#f8fffe", borderRadius:16, padding:"16px", border:"1.5px solid #d1fae5" },
  resultTitle: { fontSize:14.5, fontWeight:700, color:"#15803d", marginBottom:12 },
  resultContent: { fontSize:14, lineHeight:1.65 },
  savedNote: { fontSize:11.5, color:"#16a34a", marginTop:12, fontWeight:600 },
};

const cs = {
  page: { height:"100dvh", display:"flex", flexDirection:"column", overflow:"hidden", background:"linear-gradient(135deg,#f0fdf4,#dcfce7)" },
  container: { flex:1, display:"flex", flexDirection:"column", overflow:"hidden", maxWidth:720, width:"100%", margin:"0 auto", background:"#fff", boxShadow:"0 0 40px rgba(0,0,0,0.08)" },
  header: { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 14px", background:"linear-gradient(90deg,#16a34a,#15803d)", color:"#fff", flexShrink:0 },
  backBtn: { background:"rgba(255,255,255,0.15)", border:"1px solid rgba(255,255,255,0.3)", color:"#fff", borderRadius:9, padding:"6px 11px", fontSize:12.5, fontWeight:600, cursor:"pointer", fontFamily:"inherit", flexShrink:0 },
  headerCenter: { display:"flex", alignItems:"center", gap:9 },
  logoCircle: { width:36, height:36, borderRadius:"50%", background:"rgba(255,255,255,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:18 },
  title: { fontSize:15, fontWeight:700, lineHeight:1.2 }, subtitle: { fontSize:10.5, opacity:0.85, marginTop:1 },
  chatArea: { flex:1, overflowY:"auto", padding:"14px 14px 10px", display:"flex", flexDirection:"column", gap:10 },
  welcome: { textAlign:"center", padding:"14px 10px", animation:"fadeUp 0.5s ease" },
  welcomeEmoji: { fontSize:40, marginBottom:8 }, welcomeTitle: { fontSize:18, fontWeight:700, color:"#15803d", marginBottom:5 },
  welcomeText: { fontSize:13, color:"#4b7a5a", lineHeight:1.6, maxWidth:400, margin:"0 auto 14px" },
  suggestionsGrid: { display:"grid", gridTemplateColumns:"repeat(2,1fr)", gap:7, maxWidth:520, margin:"0 auto" },
  suggestBtn: { background:"#f0fdf4", color:"#166534", border:"1.5px solid #bbf7d0", borderRadius:11, padding:"9px 10px", fontSize:12, fontWeight:600, cursor:"pointer", textAlign:"left", transition:"all 0.2s ease", fontFamily:"inherit", lineHeight:1.4 },
  bubbleRow: (role) => ({ display:"flex", flexDirection:role==="user"?"row-reverse":"row", alignItems:"flex-end", gap:7, animation:"fadeUp 0.3s ease" }),
  avatarIcon: { width:28, height:28, borderRadius:"50%", background:"#f0fdf4", border:"2px solid #bbf7d0", display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 },
  bubble: (role) => ({ maxWidth:"82%", padding:"10px 13px", borderRadius:role==="user"?"16px 16px 4px 16px":"16px 16px 16px 4px", background:role==="user"?"linear-gradient(135deg,#16a34a,#15803d)":"#f8fffe", color:role==="user"?"#fff":"#1a3a24", boxShadow:role==="user"?"0 4px 12px rgba(22,163,74,0.3)":"0 2px 8px rgba(0,0,0,0.07)", wordBreak:"break-word", border:role==="assistant"?"1px solid #e8fdf0":"none" }),
  dot: (i) => ({ display:"inline-block", width:7, height:7, borderRadius:"50%", background:"#16a34a", animation:"blink 1.2s infinite", animationDelay:`${i*0.2}s` }),
  footer: { padding:"10px 14px 14px", borderTop:"1px solid #f0fdf4", background:"#fff", flexShrink:0 },
  inputRow: { display:"flex", gap:8, alignItems:"flex-end" },
  textarea: { flex:1, resize:"none", border:"2px solid #d1fae5", borderRadius:13, padding:"10px 13px", fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", color:"#1a3a24", background:"#f8fffe", lineHeight:1.5, maxHeight:100, overflow:"auto" },
  sendBtn: { width:44, height:44, borderRadius:13, background:"linear-gradient(135deg,#16a34a,#15803d)", color:"#fff", border:"none", fontSize:18, display:"flex", alignItems:"center", justifyContent:"center", flexShrink:0, boxShadow:"0 4px 12px rgba(22,163,74,0.35)" },
  disclaimer: { fontSize:10, color:"#a3b8a9", textAlign:"center", marginTop:6 },
};
