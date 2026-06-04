import { useState, useRef, useEffect, useCallback } from "react";
import { auth, googleProvider } from "./firebase";
import {
  signInWithPopup, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "firebase/auth";
import logoImg from "./assets/images/logo.png";

// ─── Keys ─────────────────────────────────────────────────────
const SUPABASE_URL = "https://vfyaavqaewmmhqiarlbp.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmeWFhdnFhZXdtbWhxaWFybGJwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzg5MjQsImV4cCI6MjA5NTkxNDkyNH0.hCQj5dSmyO7R18q9XBQByKXSZ1Y2M7x_s5aM7-COt8U";
const SPOON_KEY = "47b51854bec40bba20aa2699ea54447";

// ─── Supabase helpers ─────────────────────────────────────────
const sb = {
  async upsert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "resolution=merge-duplicates,return=minimal"
      },
      body: JSON.stringify(data)
    });
    return res.ok;
  },
  async select(table, filter = "") {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${filter}`, {
      headers: { "apikey": SUPABASE_KEY, "Authorization": `Bearer ${SUPABASE_KEY}` }
    });
    return res.ok ? res.json() : [];
  },
  async insert(table, data) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": SUPABASE_KEY,
        "Authorization": `Bearer ${SUPABASE_KEY}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify(data)
    });
    return res.ok;
  }
};

// ─── Spoonacular helpers ──────────────────────────────────────
const spoon = {
  cache: {},
  async getMealPhoto(query) {
    if (this.cache[query]) return this.cache[query];
    try {
      const res = await fetch(
        `https://api.spoonacular.com/recipes/complexSearch?query=${encodeURIComponent(query)}&number=1&apiKey=${SPOON_KEY}`
      );
      const data = await res.json();
      const img = data.results?.[0]?.image || null;
      if (img) this.cache[query] = img;
      return img;
    } catch { return null; }
  },
  async getRandomPhotos(n = 6) {
    try {
      const res = await fetch(
        `https://api.spoonacular.com/recipes/random?number=${n}&apiKey=${SPOON_KEY}`
      );
      const data = await res.json();
      return data.recipes?.map(r => ({ img: r.image, title: r.title })) || [];
    } catch { return []; }
  }
};

// ─── Colors ───────────────────────────────────────────────────
const C = {
  g1: "#1A4731", g2: "#2D7A4F", g3: "#4CAF7A", g4: "#E8F5EE",
  o1: "#C4520A", o2: "#E8721A", o3: "#F59A4A", o4: "#FEF3E8",
  b1: "#0A3D5C", b2: "#1A6B8A", b3: "#3A9CC4", b4: "#E8F4FA",
  w: "#FFFFFF", bg: "#F7FAF8",
  text: "#0D1F12", textMid: "#2D5A3D", textMuted: "#6B9A7A", textFaint: "#B8D4C0",
  border: "rgba(26,71,49,0.10)", borderMid: "rgba(26,71,49,0.20)",
  shadow: "0 2px 16px rgba(26,71,49,0.08)", shadowMd: "0 6px 32px rgba(26,71,49,0.12)",
};

// ─── Regions ──────────────────────────────────────────────────
const REGIONS = ["Dar es Salaam","Dodoma","Arusha","Mwanza","Tanga","Morogoro","Pwani","Lindi","Mara","Mbeya","Ruvuma","Iringa","Kagera","Kigoma","Kilimanjaro","Rukwa","Shinyanga","Singida","Tabora","Mtwara","Zanzibar","Pemba","Njombe","Simiyu","Geita","Katavi","Songwe"];

// ─── Food Prices ──────────────────────────────────────────────
const PRICES = {
  "Dar es Salaam": { mchele:2000,dagaa:4000,maharage:2500,mchicha:300,kuku:9000,samaki:6000,mayai:300,viazi:1200,chips:2000,ndizi:1500,unga:800,tambi:2500,karanga:3000,maziwa:1500,chapati:300,maandazi:200 },
  "Mwanza": { mchele:1800,dagaa:3000,maharage:2200,mchicha:200,kuku:7500,samaki:4000,mayai:250,viazi:1000,chips:1500,ndizi:1200,unga:700,tambi:2200,karanga:2500,maziwa:1200,chapati:250,maandazi:150 },
  "Arusha": { mchele:2200,dagaa:5000,maharage:2800,mchicha:400,kuku:9500,samaki:7000,mayai:350,viazi:1500,chips:2500,ndizi:2000,unga:900,tambi:2800,karanga:3500,maziwa:1800,chapati:350,maandazi:250 },
  "Dodoma": { mchele:1700,dagaa:4500,maharage:2000,mchicha:250,kuku:8000,samaki:6500,mayai:280,viazi:1100,chips:1800,ndizi:1300,unga:750,tambi:2300,karanga:2800,maziwa:1400,chapati:280,maandazi:180 },
};
const getPrices = r => PRICES[r] || PRICES["Dar es Salaam"];

// ─── Tips ─────────────────────────────────────────────────────
const TIPS = {
  sw: [
    "Dagaa ina calcium mara 10 zaidi ya maziwa! Kikombe 1 kinatoa mahitaji yako yote ya siku nzima. 🐟",
    "Papai moja lina vitamin C mara 3 zaidi ya machungwa. Bei nafuu, lishe nyingi! 🍈",
    "Unapopika mchicha, chemsha dakika 3 tu — kupika zaidi kunapoteza vitamin C hadi nusu. 🥬",
    "Kunywa glasi ya maji kabla ya kula kunasaidia kuhisi kushiba haraka. 💧",
    "Karanga zina protini nyingi kama nyama — gramu 100 zina protini gramu 26! 🥜",
    "Vitamini D inapatikana BURE — jua la asubuhi dakika 20–30 kabla ya saa 10. ☀️",
    "Mchicha una iron mara 3 zaidi ukiliwa na vitamin C (machungwa au nyanya). 🍊",
    "Ndizi mbivu moja inatoa nishati ya haraka na potassium muhimu kwa moyo. 🍌",
  ],
  en: [
    "Dagaa has 10x more calcium than milk! One cup provides all your daily calcium needs. 🐟",
    "One papaya has 3x more vitamin C than an orange. Affordable and very nutritious! 🍈",
    "Cook mchicha for only 3 minutes — longer destroys up to half the vitamin C. 🥬",
    "Drinking a glass of water before meals helps you feel full faster. 💧",
    "Groundnuts have as much protein as meat — 100g contains 26g protein! 🥜",
    "Vitamin D is FREE — morning sun for 20–30 minutes before 10am. ☀️",
    "Mchicha has 3x more iron when eaten with vitamin C (orange or tomato). 🍊",
    "One ripe banana provides quick energy and potassium important for the heart. 🍌",
  ]
};

// ─── Health Groups ────────────────────────────────────────────
const GROUPS = {
  pregnant: { icon:"🤱", sw:"Wajawazito", en:"Pregnant Women", color:C.b2, spoon:"healthy pregnancy food",
    tips_sw:["Iron: Dagaa vijiko 4 + mchicha vikombe 1.5 kila siku. Kula na machungwa!","Calcium: Maziwa vikombe 2 + dagaa kila siku kwa mfupa wa mtoto.","Folate: Mchicha vikombe 2 + maharage kikombe 1 kila siku.","Unahitaji kalori 300 zaidi kwa siku = 2,100–2,300 kcal jumla."],
    tips_en:["Iron: 4 tbsp dagaa + 1.5 cups mchicha daily. Always with orange!","Calcium: 2 cups milk + dagaa daily for baby's bones.","Folate: 2 cups mchicha + 1 cup beans daily.","Need 300 more calories daily = 2,100–2,300 kcal total."] },
  children: { icon:"👶", sw:"Watoto 0–12", en:"Children 0–12", color:"#7B3FA0", spoon:"healthy kids food",
    tips_sw:["Miezi 0–6: Maziwa ya mama PEKE YAKE. Hakuna maji wala uji.","Vitamin A: Papai + viazi vitamu + mchicha kila siku.","Miaka 1–3: Ugali 120g + maharage + mboga. Mlo mara 5/siku.","Iron: Dagaa vijiko 3 + maharage kila siku + vitamin C kila wakati."],
    tips_en:["Months 0–6: Breastmilk ONLY. No water or porridge.","Vitamin A: Papaya + sweet potato + mchicha daily.","Age 1–3: Ugali 120g + beans + vegetables. 5 meals per day.","Iron: 3 tbsp dagaa + beans daily + vitamin C always."] },
  diabetes: { icon:"🩺", sw:"Kisukari", en:"Diabetes", color:C.o1, spoon:"diabetic meal low sugar",
    tips_sw:["Punguza ugali hadi 150g tu (GI 70). Bora: ugali wa mtama (GI 55).","Chips = kalori 400! Badilisha na viazi vya kuchemsha (kalori 87 tu).","Mboga vikombe 2 kwa kila mlo — kabichi, mchicha, bamia, bilinganya.","Epuka soda na juisi — sukari nyingi sana. Maji au chai bila sukari."],
    tips_en:["Reduce ugali to 150g only (GI 70). Better: sorghum ugali (GI 55).","Chips = 400 calories! Replace with boiled potato (only 87 cal).","2 cups vegetables per meal — cabbage, mchicha, okra, eggplant.","Avoid soda and juice. Water or unsweetened tea only."] },
  hiv: { icon:"💊", sw:"VVU/UKIMWI", en:"HIV/AIDS", color:C.b1, spoon:"immune boosting food",
    tips_sw:["Unahitaji kalori 10% zaidi: mwanaume 2,400–2,700/siku.","Protini kila mlo: mayai 2–3 + maharage + dagaa kila siku.","Vitamin C: Machungwa 2 au guava 1 kila siku kwa kinga.","Milo midogo mara 5–6 ikiwa hamu ya kula ni ndogo."],
    tips_en:["Need 10% more calories: men 2,400–2,700/day.","Protein every meal: 2–3 eggs + beans + dagaa daily.","Vitamin C: 2 oranges or 1 guava daily for immunity.","Small meals 5–6 times if appetite is low."] },
  hypertension: { icon:"❤️‍🩹", sw:"Shinikizo la Damu", en:"Hypertension", color:"#B71C1C", spoon:"heart healthy low sodium meal",
    tips_sw:["Chumvi chini ya gramu 5/siku — kijiko 1 tu kwa siku nzima!","Ndizi 1–2 + viazi vitamu + maharage kikombe 1 kila siku (potassium).","Epuka chips na vyakula vya kukaanga — mafuta mengi = shinikizo zaidi.","Kupunguza uzito ikiwa una uzito mkubwa — inasaidia sana!"],
    tips_en:["Less than 5g salt/day — just 1 teaspoon for the whole day!","1–2 bananas + sweet potato + 1 cup beans daily (potassium).","Avoid chips and fried foods — too much fat increases pressure.","Lose weight if overweight — it helps a lot!"] },
  elderly: { icon:"🧓", sw:"Wazee 60+", en:"Elderly 60+", color:C.o1, spoon:"soft nutritious food elderly",
    tips_sw:["Protini gramu 1.0–1.2/kg uzito kuzuia misuli kupotea.","Calcium: Maziwa vikombe 2 + dagaa kila siku kwa mifupa.","Vyakula laini ikiwa meno ni tatizo: uji, viazi, supu, mayai.","Maji vikombe 6–8/siku — wazee hawahisi kiu hata wakiwa na kiu!"],
    tips_en:["Protein 1.0–1.2g/kg body weight to prevent muscle loss.","Calcium: 2 cups milk + dagaa daily for bones.","Soft foods if teeth are a problem: porridge, potatoes, soup, eggs.","6–8 cups water/day — elderly don't feel thirst even when thirsty!"] },
  malaria: { icon:"🌡️", sw:"Kupona Malaria", en:"Malaria Recovery", color:C.g1, spoon:"iron rich african food",
    tips_sw:["Iron: Dagaa + mchicha + maharage kila siku. Kila wakati na machungwa!","Unahitaji kalori 10–15% zaidi wakati wa kupona.","Maji lita 3/siku — malaria inachoshesha mwili sana.","Mlo mara 5–6 hata kama huna hamu — mwili unahitaji nishati."],
    tips_en:["Iron: Dagaa + mchicha + beans daily. Always with orange!","Need 10–15% more calories during recovery.","3 liters water/day — malaria dehydrates the body severely.","Eat 5–6 times even without appetite — body needs energy."] },
  obesity: { icon:"⚖️", sw:"Kupunguza Uzito", en:"Weight Loss", color:C.g2, spoon:"low calorie healthy salad",
    tips_sw:["Punguza kalori 300–500 tu kwa siku — haraka sana kunaweza kudhuru.","Jaza nusu ya sahani na mboga (30–50 kcal/kikombe tu).","Maji glasi 2 dakika 30 kabla ya kila mlo.","Epuka chips (400 kcal) na soda (130 kcal) — kalori nyingi bila lishe."],
    tips_en:["Reduce only 300–500 calories per day — too fast can be harmful.","Fill half your plate with vegetables (only 30–50 kcal/cup).","2 glasses water 30 minutes before each meal.","Avoid chips (400 kcal) and soda (130 kcal) — empty calories."] },
};

// ─── Food Groups (Simple mode) ────────────────────────────────
const FOOD_GROUPS = {
  sw: [
    { icon:"🌾", name:"Wanga", desc:"Ugali, wali, tambi, viazi — nishati ya mwili", color:C.o2, spoon:"ugali rice Tanzania" },
    { icon:"🍖", name:"Protini", desc:"Dagaa, kuku, maharage, mayai — kujenga mwili", color:C.g2, spoon:"dagaa beans protein Tanzania" },
    { icon:"🥬", name:"Vitamini", desc:"Mchicha, kabichi, papai — kinga ya mwili", color:C.b2, spoon:"african greens vegetables" },
    { icon:"🫒", name:"Mafuta ya Afya", desc:"Mafuta ya alizeti, karanga — nishati ya kudumu", color:"#7B5EA7" },
    { icon:"💧", name:"Maji", desc:"Lita 2–3 kwa siku — uhai wa mwili", color:C.b3 },
    { icon:"🥛", name:"Maziwa & Kalisi", desc:"Maziwa, mtindi, dagaa — nguvu ya mifupa", color:C.o3 },
  ],
  en: [
    { icon:"🌾", name:"Carbohydrates", desc:"Ugali, rice, pasta, potatoes — body energy", color:C.o2, spoon:"ugali rice Tanzania" },
    { icon:"🍖", name:"Proteins", desc:"Dagaa, chicken, beans, eggs — body building", color:C.g2, spoon:"dagaa beans protein Tanzania" },
    { icon:"🥬", name:"Vitamins", desc:"Mchicha, cabbage, papaya — immunity", color:C.b2, spoon:"african greens vegetables" },
    { icon:"🫒", name:"Healthy Fats", desc:"Sunflower oil, groundnuts — lasting energy", color:"#7B5EA7" },
    { icon:"💧", name:"Water", desc:"2–3 liters daily — life for every body function", color:C.b3 },
    { icon:"🥛", name:"Dairy & Calcium", desc:"Milk, yoghurt, dagaa — bone strength", color:C.o3 },
  ]
};

// ─── Build AI Prompt ──────────────────────────────────────────
function buildPrompt(user, prices, lang, mode) {
  const sw = lang === "sw";
  const p = prices || getPrices("Dar es Salaam");
  return `You are NutriAdvisor — a warm, knowledgeable nutrition advisor for Tanzania. ${sw ? "Jibu kwa Kiswahili." : "Reply in English."}

FORMAT RULES — STRICTLY FOLLOW:
1. SHORT compact format — no long paragraphs ever
2. Every meal shows: name + compact table (portion/price${mode === "detailed" ? "/calories/protein" : ""})
3. NEVER suggest ugali for breakfast
4. Chips maximum 2x per week only
5. Breakfast ONLY: mkate/chapati/maandazi/tambi/uji/oatmeal + tea + fruit
6. Vary foods every day — never repeat same staple two days in a row
7. End every meal plan with summary table showing totals

MEAL FORMAT:
**[emoji] [Meal name]**
[Foods listed]
| | |
|---|---|
| 🍽️ ${sw ? "Kiasi" : "Portion"} | [amounts] |
| 💰 ${sw ? "Bei" : "Price"} | TZS X |${mode === "detailed" ? `\n| 🔥 ${sw ? "Kalori" : "Calories"} | X kcal |\n| 💪 ${sw ? "Protini" : "Protein"} | Xg |` : ""}

REGIONAL PRICES (${user?.region || "Dar es Salaam"}):
Mchele: ${p.mchele}/kg | Dagaa: ${p.dagaa}/kg | Maharage: ${p.maharage}/kg
Mchicha: ${p.mchicha}/mfungu | Kuku: ${p.kuku}/kg | Samaki: ${p.samaki}/kg
Mayai: ${p.mayai}/yai | Chips: ${p.chips}/sehemu | Chapati: ${p.chapati} | Maandazi: ${p.maandazi}

USER PROFILE:
Name: ${user?.first_name || "Rafiki"} | Region: ${user?.region || "Tanzania"}
Health: ${user?.health || "Mzima"} | Budget: ${user?.budget || "Wastani"}
Goal: ${user?.goal || "Afya nzuri"} | Mode: ${mode}
Dislikes: ${user?.dislikes || "None"}

Personalize advice to this user. Address them by name occasionally.
${sw ? "Malizia ushauri wa kimatibabu na: Wasiliana na daktari kwa ushauri zaidi." : "End medical advice with: Consult a doctor for more specific advice."}`;
}

// ─── Format AI message ────────────────────────────────────────
function FormatMsg({ text }) {
  const lines = text.split("\n");
  const els = [];
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tLines = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) { tLines.push(lines[i]); i++; }
      const rows = tLines.filter(l => !/^\|[\s\-|:]+\|$/.test(l.trim()));
      els.push(
        <div key={`t${i}`} style={{ overflowX:"auto", margin:"8px 0", borderRadius:10, border:`1px solid ${C.border}` }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr>{rows[0]?.trim().slice(1,-1).split("|").map((c,j)=>(
              <th key={j} style={{ background:C.g2, color:"#fff", padding:"7px 10px", textAlign:"left", fontWeight:600, fontSize:12 }}>{c.trim()}</th>
            ))}</tr></thead>
            <tbody>{rows.slice(1).map((row,ri)=>(
              <tr key={ri} style={{ background:ri%2===0?C.g4:"#fff" }}>
                {row.trim().slice(1,-1).split("|").map((c,ci)=>(
                  <td key={ci} style={{ padding:"6px 10px", borderBottom:`1px solid ${C.border}`, color:C.textMid, fontSize:13 }}>{c.trim()}</td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (line.startsWith("## ")) els.push(<div key={i} style={{ fontWeight:700, color:C.g2, fontSize:14, marginTop:12, marginBottom:3 }}>{line.slice(3)}</div>);
    else if (line.startsWith("**") && line.endsWith("**")) els.push(<div key={i} style={{ fontWeight:700, color:C.text, marginTop:5, marginBottom:2 }}>{line.replace(/\*\*/g,"")}</div>);
    else if (line.match(/\*\*(.+?)\*\*/)) els.push(<div key={i} style={{ lineHeight:1.7, fontSize:13 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>") }}/>);
    else if (line.startsWith("- ")||line.startsWith("• ")) els.push(<div key={i} style={{ paddingLeft:14, position:"relative", marginBottom:3, lineHeight:1.6, fontSize:13 }}><span style={{ position:"absolute", left:2, color:C.g2 }}>•</span>{line.slice(2)}</div>);
    else if (/^\d+\./.test(line)) els.push(<div key={i} style={{ paddingLeft:16, marginBottom:3, lineHeight:1.6, fontSize:13 }}>{line}</div>);
    else if (line.trim()==="") els.push(<div key={i} style={{ height:5 }}/>);
    else els.push(<div key={i} style={{ lineHeight:1.75, fontSize:13 }}>{line}</div>);
    i++;
  }
  return <>{els}</>;
}

// ─── Meal Photo Card ─────────────────────────────────────────
function MealCard({ title, subtitle, query, onClick, color }) {
  const [photo, setPhoto] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    spoon.getMealPhoto(query).then(img => { if (img) setPhoto(img); });
  }, [query]);
  return (
    <button onClick={onClick} style={{ border:"none", background:"transparent", padding:0, cursor:"pointer", borderRadius:16, overflow:"hidden", position:"relative", width:"100%", textAlign:"left", boxShadow:C.shadowMd, transition:"transform .2s" }}
      onMouseEnter={e=>e.currentTarget.style.transform="translateY(-3px)"}
      onMouseLeave={e=>e.currentTarget.style.transform="translateY(0)"}>
      <div style={{ height:110, background:photo?`url(${photo}) center/cover`:`linear-gradient(135deg,${color||C.g2},${C.g1})`, position:"relative" }}>
        {photo && !loaded && <div style={{ position:"absolute", inset:0, background:color||C.g2, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>🍽️</div>}
        {photo && <img src={photo} alt="" onLoad={()=>setLoaded(true)} style={{ display:"none" }}/>}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }}/>
        <div style={{ position:"absolute", bottom:10, left:12, right:12 }}>
          <div style={{ fontSize:13, fontWeight:700, color:"#fff", lineHeight:1.3 }}>{title}</div>
          {subtitle && <div style={{ fontSize:11, color:"rgba(255,255,255,0.75)", marginTop:2 }}>{subtitle}</div>}
        </div>
      </div>
    </button>
  );
}

// ─── Notification Toast ───────────────────────────────────────
function Toast({ message, type = "info", onClose }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, []);
  const colors = { info: C.b2, success: C.g2, warning: C.o2, tip: C.g1 };
  return (
    <div style={{ position:"fixed", top:70, left:"50%", transform:"translateX(-50%)", zIndex:200, maxWidth:340, width:"calc(100% - 32px)", background:colors[type]||C.g2, borderRadius:14, padding:"12px 16px", boxShadow:"0 8px 32px rgba(0,0,0,0.2)", display:"flex", alignItems:"flex-start", gap:10, animation:"slideDown .3s ease" }}>
      <div style={{ flex:1, fontSize:13, color:"#fff", lineHeight:1.5 }}>{message}</div>
      <button onClick={onClose} style={{ background:"none", border:"none", color:"rgba(255,255,255,0.7)", cursor:"pointer", fontSize:16, padding:0, flexShrink:0 }}>✕</button>
    </div>
  );
}

// ─── Nav Button ───────────────────────────────────────────────
function NavBtn({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} style={{ flex:1, padding:"9px 4px 7px", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:2, fontFamily:"inherit", position:"relative", transition:"all .2s" }}>
      <span style={{ fontSize:22, display:"block", transition:"transform .3s cubic-bezier(.34,1.56,.64,1), filter .2s", transform:active?"scale(1.2)":"scale(1)", filter:active?`drop-shadow(0 0 6px ${C.g2})`:"none" }}>{icon}</span>
      <span style={{ fontSize:9.5, fontWeight:active?700:400, color:active?C.g2:C.textFaint, letterSpacing:.3, transition:"color .2s" }}>{label}</span>
      {active && <div style={{ position:"absolute", bottom:0, left:"50%", transform:"translateX(-50%)", width:18, height:3, background:C.g2, borderRadius:"3px 3px 0 0", animation:"navBar .25s ease" }}/>}
    </button>
  );
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("splash");
  const [lang, setLang] = useState("sw");
  const [authTab, setAuthTab] = useState("signup");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [onboardStep, setOnboardStep] = useState(1);
  const [mainTab, setMainTab] = useState("home");
  const [selGroup, setSelGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState(null);
  const [todayTip, setTodayTip] = useState("");
  const [authErr, setAuthErr] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [sidePanel, setSidePanel] = useState(false);
  const [signInPhotos, setSignInPhotos] = useState([]);
  const [toast, setToast] = useState(null);
  const [feedbackState, setFeedbackState] = useState({});
  const [adminUsers, setAdminUsers] = useState([]);
  const [showAdmin, setShowAdmin] = useState(false);

  const [form, setForm] = useState({ first_name:"", last_name:"", age:"", gender:"", region:"Dar es Salaam", health:"Mzima/Sina tatizo", budget:"Wastani (TZS 5,000-20,000/siku)", goal:"Afya nzuri na nguvu", activity:"Wastani", mode:"simple", dislikes:"" });
  const [email, setEmail] = useState(""); const [pass, setPass] = useState("");
  const [siEmail, setSiEmail] = useState(""); const [siPass, setSiPass] = useState("");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sw = lang === "sw";

  const showToast = useCallback((message, type = "info") => setToast({ message, type }), []);

  // ── Splash ────────────────────────────────────────────────
  useEffect(() => { const t = setTimeout(() => setScreen("lang"), 2800); return () => clearTimeout(t); }, []);

  // ── Auth listener ─────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async u => {
      if (u) {
        setUser(u);
        try {
          const rows = await sb.select("profiles", `uid=eq.${u.uid}&limit=1`);
          if (rows?.length > 0) {
            const p = rows[0];
            setProfile(p);
            setLang(p.language || "sw");
            const tips = TIPS[p.language || "sw"];
            setTodayTip(tips[Math.floor(Math.random() * tips.length)]);
            // Load chat history
            const chats = await sb.select("chats", `uid=eq.${u.uid}&order=created_at.desc&limit=20`);
            if (chats?.length > 0) {
              const msgs = chats.reverse().flatMap(c => [
                { role:"user", content:c.question },
                { role:"assistant", content:c.answer }
              ]);
              setMessages(msgs);
            }
            setScreen("welcome");
          } else {
            if (u.displayName) setForm(f => ({ ...f, first_name:u.displayName.split(" ")[0]||"", last_name:u.displayName.split(" ").slice(1).join(" ")||"" }));
            setScreen("onboard");
          }
        } catch(e) { setScreen("onboard"); }
      } else {
        setUser(null); setProfile(null); setScreen("lang");
      }
    });
    return unsub;
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  // ── Time-based notifications ──────────────────────────────
  useEffect(() => {
    if (screen !== "main" || !profile) return;
    const h = new Date().getHours();
    if (h >= 6 && h < 9) showToast(sw ? `🌅 Habari za asubuhi, ${profile.first_name}! ${todayTip}` : `🌅 Good morning, ${profile.first_name}! ${todayTip}`, "tip");
    else if (h >= 12 && h < 14) showToast(sw ? "🍽️ Wakati wa chakula cha mchana! Je, umepanga mlo wako?" : "🍽️ Lunch time! Have you planned your meal?", "info");
    else if (h >= 15 && h < 16) showToast(sw ? "💧 Kumbuka kunywa maji! Lita 2–3 kwa siku ni muhimu." : "💧 Remember to drink water! 2–3 liters daily is important.", "info");
  }, [screen]);

  // ── Fetch sign-in photos ──────────────────────────────────
  useEffect(() => {
    if (screen === "auth") spoon.getRandomPhotos(4).then(setSignInPhotos);
  }, [screen]);

  // ── Auth handlers ─────────────────────────────────────────
  const handleGoogle = async () => {
    setAuthLoading(true); setAuthErr("");
    try { await signInWithPopup(auth, googleProvider); }
    catch(e) { setAuthErr(sw ? "Imeshindwa kuingia na Google. Jaribu tena." : "Failed to sign in with Google. Try again."); }
    setAuthLoading(false);
  };

  const handleSignup = async () => {
    if (!email||!pass) return setAuthErr(sw?"Jaza barua pepe na nywila.":"Fill email and password.");
    if (pass.length < 6) return setAuthErr(sw?"Nywila iwe na herufi 6+.":"Password must be 6+ chars.");
    setAuthLoading(true); setAuthErr("");
    try { await createUserWithEmailAndPassword(auth, email, pass); }
    catch(e) { setAuthErr(e.code==="auth/email-already-in-use"?(sw?"Barua pepe tayari imetumika.":"Email already in use."):(sw?"Imeshindwa.":"Failed.")); }
    setAuthLoading(false);
  };

  const handleSignin = async () => {
    if (!siEmail||!siPass) return setAuthErr(sw?"Jaza barua pepe na nywila.":"Fill fields.");
    setAuthLoading(true); setAuthErr("");
    try { await signInWithEmailAndPassword(auth, siEmail, siPass); }
    catch(e) { setAuthErr(sw?"Barua pepe au nywila si sahihi.":"Email or password incorrect."); }
    setAuthLoading(false);
  };

  const handleOnboard = async () => {
    if (!form.first_name) return;
    setAuthLoading(true);
    try {
      const data = { ...form, uid:user.uid, language:lang, email:user.email||"", joined_at:new Date().toISOString() };
      await sb.upsert("profiles", data);
      setProfile(data);
      const tips = TIPS[lang];
      setTodayTip(tips[Math.floor(Math.random() * tips.length)]);
      setScreen("welcome");
    } catch(e) { console.error(e); }
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    if (window.confirm(sw?`Toka kwenye akaunti ya ${profile?.first_name}?`:`Sign out of ${profile?.first_name}'s account?`)) {
      await signOut(auth); setScreen("lang");
    }
  };

  // ── Send message ──────────────────────────────────────────
  const sendMessage = async text => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (msg.toLowerCase() === "admin123") {
      setInput("");
      const rows = await sb.select("profiles", "order=joined_at.desc&limit=50");
      setAdminUsers(rows || []);
      setShowAdmin(true); return;
    }
    setInput("");
    setMainTab("home");
    const updated = [...messages, { role:"user", content:msg }];
    setMessages(updated);
    setLoading(true);
    const prices = getPrices(profile?.region);
    const systemPrompt = buildPrompt(profile, prices, lang, profile?.mode || "simple");
    try {
      const res = await fetch("/.netlify/functions/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ messages:updated.slice(-6), systemPrompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      const reply = data.reply;
      setMessages([...updated, { role:"assistant", content:reply }]);
      if (user) {
        await sb.insert("chats", { uid:user.uid, question:msg, answer:reply.slice(0,2000), created_at:new Date().toISOString() });
      }
    } catch(e) {
      setMessages([...updated, { role:"assistant", content:sw?`Samahani, kuna tatizo. Jaribu tena.`:`Sorry, there was an error. Please try again.` }]);
    } finally { setLoading(false); }
  };

  const handleFeedback = async (type, msgIndex) => {
    const key = `${msgIndex}-${type}`;
    if (feedbackState[key]) return; // Already voted
    setFeedbackState(prev => ({ ...prev, [msgIndex]:type }));
    const question = messages[msgIndex-1]?.content || "";
    const answer = messages[msgIndex]?.content || "";
    await sb.insert("feedback", { uid:user?.uid||"anon", type, question:question.slice(0,200), answer:answer.slice(0,200), region:profile?.region||"?", created_at:new Date().toISOString() });
    showToast(type==="up" ? (sw?"Asante kwa maoni yako! 👍":"Thanks for your feedback! 👍") : (sw?"Tutaboresha ushauri huu. Asante! 👎":"We'll improve this advice. Thanks! 👎"), type==="up"?"success":"info");
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    const name = profile?.first_name || (sw?"Rafiki":"Friend");
    if (sw) return h<12?`Habari za asubuhi, ${name}!`:h<17?`Habari za mchana, ${name}!`:`Habari za jioni, ${name}!`;
    return h<12?`Good morning, ${name}!`:h<17?`Good afternoon, ${name}!`:`Good evening, ${name}!`;
  };

  // ── Global CSS ────────────────────────────────────────────
  const G = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300;0,9..144,600;0,9..144,700;1,9..144,300&family=Outfit:wght@300;400;500;600;700&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Outfit',sans-serif;background:${C.bg};}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes blink{0%,100%{opacity:.2;transform:scale(.75)}50%{opacity:1;transform:scale(1.1)}}
    @keyframes navBar{from{transform:translateX(-50%) scaleX(0)}to{transform:translateX(-50%) scaleX(1)}}
    @keyframes slideDown{from{opacity:0;transform:translate(-50%,-16px)}to{opacity:1;transform:translate(-50%,0)}}
    @keyframes logoIn{0%{opacity:0;transform:scale(.7)}60%{transform:scale(1.06)}100%{opacity:1;transform:scale(1)}}
    @keyframes sloganIn{from{opacity:0;letterSpacing:6px}to{opacity:1;letter-spacing:3px}}
    @keyframes spin{to{transform:rotate(360deg)}}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:rgba(26,71,49,0.15);border-radius:4px}
    input:focus,select:focus,textarea:focus{outline:none;border-color:${C.g2}!important;box-shadow:0 0 0 3px rgba(45,122,79,0.12)!important;}
    textarea::placeholder,input::placeholder{color:${C.textFaint};}
    .btn{background:linear-gradient(135deg,${C.g2},${C.g1});color:#fff;border:none;border-radius:14px;padding:14px;font-family:'Outfit',sans-serif;font-size:15px;font-weight:600;cursor:pointer;width:100%;transition:all .25s;letter-spacing:.2px;}
    .btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 8px 28px rgba(45,122,79,0.35);}
    .btn:disabled{opacity:.6;cursor:not-allowed;}
    .btn-out{background:transparent;color:${C.g2};border:2px solid ${C.g2};border-radius:14px;padding:13px;font-family:'Outfit',sans-serif;font-size:14px;font-weight:600;cursor:pointer;width:100%;transition:all .2s;}
    .btn-out:hover{background:${C.g4};}
    .card{background:${C.w};border-radius:18px;border:1px solid ${C.border};box-shadow:${C.shadow};}
    .sug:hover{border-color:${C.g2}!important;background:${C.g4}!important;transform:translateY(-2px);}
    .action-btn{background:transparent;border:1px solid ${C.border};border-radius:8px;color:${C.textMuted};font-size:12px;cursor:pointer;font-family:'Outfit',sans-serif;padding:5px 11px;font-weight:500;transition:all .2s;display:flex;align-items:center;gap:4px;}
    .action-btn:hover{border-color:${C.g2};color:${C.g2};}
    .side-panel{position:fixed;top:0;left:0;bottom:0;width:280px;background:${C.w};box-shadow:4px 0 32px rgba(13,31,18,0.15);z-index:100;display:flex;flex-direction:column;animation:slideRight .3s ease;}
    @keyframes slideRight{from{transform:translateX(-100%)}to{transform:translateX(0)}}
    .overlay{position:fixed;inset:0;background:rgba(13,31,18,0.45);z-index:99;animation:fadeIn .2s ease;}
    .f-input{width:100%;padding:11px 13px;border-radius:10px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};font-size:13.5px;font-family:'Outfit',sans-serif;}
    .f-select{width:100%;padding:11px 13px;border-radius:10px;border:1.5px solid ${C.border};background:${C.bg};color:${C.text};font-size:13.5px;font-family:'Outfit',sans-serif;}
    .mode-card{flex:1;padding:16px 12px;border-radius:14px;border:2px solid ${C.border};cursor:pointer;transition:all .2s;text-align:center;}
    .mode-card.on{border-color:${C.g2};background:${C.g4};}
    .chip{padding:7px 13px;border-radius:20px;border:1.5px solid ${C.border};cursor:pointer;font-size:12.5px;color:${C.textMid};transition:all .2s;font-family:'Outfit',sans-serif;background:${C.w};}
    .chip.on{border-color:${C.g2};background:${C.g4};color:${C.g1};font-weight:600;}
  `;

  // ════════════════════════════════════════════════════════════
  // SPLASH
  // ════════════════════════════════════════════════════════════
  if (screen === "splash") return (
    <div style={{ height:"100vh", background:C.g1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Outfit',sans-serif" }}>
      <style>{G}</style>
      <img src={logoImg} alt="NutriAdvisor" style={{ width:140, height:140, objectFit:"contain", animation:"logoIn 1.2s cubic-bezier(.34,1.56,.64,1) forwards", marginBottom:24 }}/>
      <div style={{ fontFamily:"'Fraunces',serif", fontSize:13, letterSpacing:3, color:"rgba(255,255,255,0.5)", textTransform:"uppercase", animation:"sloganIn 1.2s ease .7s both" }}>SMART NUTRITION. BETTER YOU.</div>
      <div style={{ position:"absolute", bottom:44, display:"flex", gap:7 }}>
        {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:"50%", background:"rgba(255,255,255,0.3)", animation:`blink 1.4s ease ${i*.22}s infinite` }}/>)}
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // LANGUAGE
  // ════════════════════════════════════════════════════════════
  if (screen === "lang") return (
    <div style={{ height:"100vh", background:C.g1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, fontFamily:"'Outfit',sans-serif" }}>
      <style>{G}</style>
      <div style={{ width:"100%", maxWidth:340, animation:"fadeUp .5s ease" }}>
        <img src={logoImg} alt="" style={{ width:64, height:64, objectFit:"contain", display:"block", margin:"0 auto 16px" }}/>
        <div style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:600, color:"#fff", textAlign:"center", marginBottom:4 }}>NutriAdvisor</div>
        <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)", textAlign:"center", marginBottom:36, letterSpacing:2, textTransform:"uppercase" }}>Choose Language · Chagua Lugha</div>
        <div style={{ display:"flex", flexDirection:"column", gap:11, marginBottom:28 }}>
          {[{code:"sw",flag:"🇹🇿",name:"Kiswahili",sub:"Lugha ya Tanzania"},{code:"en",flag:"🇬🇧",name:"English",sub:"International language"}].map(l=>(
            <button key={l.code} onClick={()=>setLang(l.code)} style={{ display:"flex", alignItems:"center", gap:14, padding:"15px 18px", borderRadius:14, border:`2px solid ${lang===l.code?"rgba(255,255,255,0.5)":"rgba(255,255,255,0.1)"}`, background:lang===l.code?"rgba(255,255,255,0.1)":"rgba(255,255,255,0.04)", cursor:"pointer", transition:"all .2s" }}>
              <span style={{ fontSize:30 }}>{l.flag}</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:15, fontWeight:600, color:"#fff" }}>{l.name}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.4)" }}>{l.sub}</div>
              </div>
              <div style={{ width:20, height:20, borderRadius:"50%", background:lang===l.code?"rgba(255,255,255,0.9)":"rgba(255,255,255,0.15)", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .2s" }}>
                {lang===l.code&&<span style={{ color:C.g1, fontSize:11, fontWeight:800 }}>✓</span>}
              </div>
            </button>
          ))}
        </div>
        <button className="btn" onClick={()=>setScreen("auth")} style={{ background:"rgba(255,255,255,0.15)", border:"2px solid rgba(255,255,255,0.3)", backdropFilter:"blur(8px)" }}>
          {lang==="sw"?"Endelea →":"Continue →"}
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // AUTH
  // ════════════════════════════════════════════════════════════
  if (screen === "auth") return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", fontFamily:"'Outfit',sans-serif", overflow:"hidden" }}>
      <style>{G}</style>
      {/* Food photos banner */}
      <div style={{ height:"32vh", flexShrink:0, position:"relative", background:C.g1 }}>
        {signInPhotos.length > 0 ? (
          <div style={{ display:"flex", height:"100%", gap:2 }}>
            {signInPhotos.slice(0,4).map((p,i)=>(
              <div key={i} style={{ flex:1, backgroundImage:`url(${p.img})`, backgroundSize:"cover", backgroundPosition:"center", opacity:.85 }}/>
            ))}
          </div>
        ) : (
          <div style={{ height:"100%", background:`linear-gradient(135deg,${C.g1},${C.b1})`, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <img src={logoImg} alt="" style={{ width:70, height:70, objectFit:"contain", opacity:.3 }}/>
          </div>
        )}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 20%, rgba(247,250,248,1) 100%)" }}/>
        <div style={{ position:"absolute", bottom:12, left:18 }}>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:600, color:C.text }}>NutriAdvisor</div>
          <div style={{ fontSize:12, color:C.textMuted }}>{sw?"Lishe bora. Maisha bora. 🇹🇿":"Smart nutrition. Better you. 🇹🇿"}</div>
        </div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"14px 18px 24px" }}>
        <div style={{ maxWidth:380, margin:"0 auto" }}>
          {/* Tabs */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:5, background:C.g4, borderRadius:12, padding:4, marginBottom:16 }}>
            {[["signup",sw?"Jisajili":"Sign Up"],["signin",sw?"Ingia":"Sign In"]].map(([t,l])=>(
              <button key={t} onClick={()=>{setAuthTab(t);setAuthErr("");}} style={{ padding:"9px", border:"none", borderRadius:9, fontFamily:"'Outfit',sans-serif", fontSize:13.5, cursor:"pointer", transition:"all .2s", background:authTab===t?C.w:"transparent", color:authTab===t?C.g2:C.textMuted, fontWeight:authTab===t?700:400, boxShadow:authTab===t?C.shadow:"none" }}>{l}</button>
            ))}
          </div>

          <div className="card" style={{ padding:"18px 16px" }}>
            {authErr && <div style={{ background:"#FEE8E0", border:"1px solid #E8472A", borderRadius:9, padding:"9px 12px", fontSize:12.5, color:"#C0392B", marginBottom:14, fontWeight:500 }}>⚠️ {authErr}</div>}

            {/* Google button */}
            <button onClick={handleGoogle} disabled={authLoading} style={{ width:"100%", padding:"12px", border:`1.5px solid ${C.border}`, borderRadius:12, background:C.w, color:C.text, fontSize:14, fontFamily:"'Outfit',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:14, fontWeight:600, transition:"all .2s", boxShadow:C.shadow }}>
              <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
              {sw?"Ingia na Google":"Continue with Google"}
            </button>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
              <div style={{ flex:1, height:1, background:C.border }}/><span style={{ fontSize:11, color:C.textFaint }}>{sw?"au":"or"}</span><div style={{ flex:1, height:1, background:C.border }}/>
            </div>

            {authTab==="signup" ? (
              <>
                {[[sw?"Barua pepe *":"Email *",email,setEmail,"email","you@gmail.com"],[sw?"Nywila * (herufi 6+)":"Password * (6+ chars)",pass,setPass,"password","••••••••"]].map(([l,v,set,t,p])=>(
                  <div key={l} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11.5, color:C.textMid, fontWeight:600, marginBottom:4 }}>{l}</div>
                    <input className="f-input" type={t} value={v} onChange={e=>set(e.target.value)} placeholder={p} onKeyDown={e=>e.key==="Enter"&&handleSignup()}/>
                  </div>
                ))}
                <button className="btn" onClick={handleSignup} disabled={authLoading} style={{ marginTop:4 }}>
                  {authLoading?(sw?"Inasajili...":"Creating account..."):(sw?"Unda Akaunti →":"Create Account →")}
                </button>
                <p style={{ textAlign:"center", fontSize:12.5, color:C.textMuted, marginTop:12 }}>{sw?"Una akaunti?":"Have account?"} <span style={{ color:C.g2, cursor:"pointer", fontWeight:700 }} onClick={()=>setAuthTab("signin")}>{sw?"Ingia":"Sign in"}</span></p>
              </>
            ) : (
              <>
                {[[sw?"Barua pepe":"Email",siEmail,setSiEmail,"email","you@gmail.com"],[sw?"Nywila":"Password",siPass,setSiPass,"password","••••••••"]].map(([l,v,set,t,p])=>(
                  <div key={l} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11.5, color:C.textMid, fontWeight:600, marginBottom:4 }}>{l}</div>
                    <input className="f-input" type={t} value={v} onChange={e=>set(e.target.value)} placeholder={p} onKeyDown={e=>e.key==="Enter"&&handleSignin()}/>
                  </div>
                ))}
                <button className="btn" onClick={handleSignin} disabled={authLoading} style={{ marginTop:4 }}>
                  {authLoading?(sw?"Inaingia...":"Signing in..."):(sw?"Ingia →":"Sign In →")}
                </button>
                <p style={{ textAlign:"center", fontSize:12.5, color:C.textMuted, marginTop:12 }}>{sw?"Huna akaunti?":"No account?"} <span style={{ color:C.g2, cursor:"pointer", fontWeight:700 }} onClick={()=>setAuthTab("signup")}>{sw?"Jisajili bure":"Sign up free"}</span></p>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // ONBOARDING
  // ════════════════════════════════════════════════════════════
  if (screen === "onboard") return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:C.bg, fontFamily:"'Outfit',sans-serif" }}>
      <style>{G}</style>
      {/* Header */}
      <div style={{ background:C.g1, padding:"14px 18px 18px", flexShrink:0 }}>
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:14 }}>
          <img src={logoImg} alt="" style={{ width:30, height:30, objectFit:"contain" }}/>
          <span style={{ fontFamily:"'Fraunces',serif", fontSize:16, fontWeight:600, color:"#fff" }}>NutriAdvisor</span>
        </div>
        <div style={{ display:"flex", gap:5 }}>
          {[1,2,3].map(n=><div key={n} style={{ flex:1, height:3, borderRadius:3, background:onboardStep>=n?C.g3:"rgba(255,255,255,0.2)", transition:"background .3s" }}/>)}
        </div>
        <div style={{ fontSize:11, color:"rgba(255,255,255,0.4)", marginTop:5 }}>{sw?`Hatua ${onboardStep} ya 3`:`Step ${onboardStep} of 3`}</div>
      </div>

      <div style={{ flex:1, overflowY:"auto", padding:"18px 18px 24px" }}>
        <div style={{ maxWidth:400, margin:"0 auto" }}>
          <div className="card" style={{ padding:"20px 18px" }}>
            {onboardStep===1 && (
              <>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:19, fontWeight:600, color:C.text, marginBottom:3 }}>{sw?"Habari! Niambie kuhusu wewe 👋":"Hello! Tell me about you 👋"}</div>
                <p style={{ fontSize:12.5, color:C.textMuted, marginBottom:16 }}>{sw?"Inasaidia kupata ushauri unaokufaa wewe":"Helps get advice that fits you perfectly"}</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  {[[sw?"Jina la Kwanza *":"First Name *","first_name",sw?"Jina lako":"Your name","text"],[sw?"Jina la Mwisho":"Last Name","last_name",sw?"Ukoo":"Family","text"]].map(([l,k,p,t])=>(
                    <div key={k}><div style={{ fontSize:11.5, color:C.textMid, fontWeight:600, marginBottom:4 }}>{l}</div><input className="f-input" type={t} value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})} placeholder={p}/></div>
                  ))}
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginTop:10 }}>
                  <div><div style={{ fontSize:11.5, color:C.textMid, fontWeight:600, marginBottom:4 }}>{sw?"Umri":"Age"}</div><input className="f-input" type="number" value={form.age} onChange={e=>setForm({...form,age:e.target.value})} placeholder="25"/></div>
                  <div><div style={{ fontSize:11.5, color:C.textMid, fontWeight:600, marginBottom:4 }}>{sw?"Jinsia":"Gender"}</div>
                    <select className="f-select" value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})}>
                      <option value="">{sw?"Chagua...":"Select..."}</option>
                      <option value="Mwanamke">{sw?"Mwanamke":"Female"}</option>
                      <option value="Mwanaume">{sw?"Mwanaume":"Male"}</option>
                      <option value="Nyingine">{sw?"Ningependa nisijulikane":"Prefer not to say"}</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginTop:10 }}><div style={{ fontSize:11.5, color:C.textMid, fontWeight:600, marginBottom:4 }}>{sw?"Mkoa":"Region"}</div>
                  <select className="f-select" value={form.region} onChange={e=>setForm({...form,region:e.target.value})}>
                    {REGIONS.map(r=><option key={r}>{r}</option>)}
                  </select>
                </div>
                <button className="btn" onClick={()=>form.first_name&&setOnboardStep(2)} style={{ marginTop:16 }}>{sw?"Endelea →":"Continue →"}</button>
              </>
            )}
            {onboardStep===2 && (
              <>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:19, fontWeight:600, color:C.text, marginBottom:3 }}>{sw?"Hali ya Kiafya":"Health Profile 🏥"}</div>
                <p style={{ fontSize:12.5, color:C.textMuted, marginBottom:16 }}>{sw?"Taarifa hii inabaki salama na inaboresha ushauri":"This stays private and improves your advice"}</p>
                {[[sw?"Hali ya Kiafya":"Health Condition","health",["Mzima/Sina tatizo","Kisukari","Shinikizo la damu","VVU/UKIMWI","Mjamzito","Mnyonyeshaji","Upungufu wa damu","Tatizo lingine"]],
                  [sw?"Bajeti ya Chakula":"Food Budget","budget",[{v:"Chini (TZS 1,000-5,000/siku)",l:"🟢 Chini — TZS 1,000–5,000"},{v:"Wastani (TZS 5,000-20,000/siku)",l:"🟡 Wastani — TZS 5,000–20,000"},{v:"Juu (TZS 20,000+/siku)",l:"🔴 Juu — TZS 20,000+"}]],
                  [sw?"Lengo Lako":"Your Goal","goal",[sw?"Afya nzuri na nguvu":"Good health and energy",sw?"Kupunguza uzito":"Lose weight",sw?"Kuongeza nguvu":"Gain energy",sw?"Kudhibiti kisukari":"Manage diabetes",sw?"Kudhibiti shinikizo":"Manage blood pressure",sw?"Lishe bora kwa familia":"Better family nutrition"]]
                ].map(([l,k,opts])=>(
                  <div key={k} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:11.5, color:C.textMid, fontWeight:600, marginBottom:4 }}>{l}</div>
                    <select className="f-select" value={form[k]} onChange={e=>setForm({...form,[k]:e.target.value})}>
                      {opts.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
                    </select>
                  </div>
                ))}
                <div style={{ display:"flex", gap:10, marginTop:4 }}>
                  <button className="btn-out" onClick={()=>setOnboardStep(1)} style={{ flex:1 }}>{sw?"← Rudi":"← Back"}</button>
                  <button className="btn" onClick={()=>setOnboardStep(3)} style={{ flex:2 }}>{sw?"Endelea →":"Continue →"}</button>
                </div>
              </>
            )}
            {onboardStep===3 && (
              <>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:19, fontWeight:600, color:C.text, marginBottom:3 }}>{sw?"Mtindo wa Ushauri":"Advice Style 🎯"}</div>
                <p style={{ fontSize:12.5, color:C.textMuted, marginBottom:16 }}>{sw?"Inabadilishwa wakati wowote kwenye mipangilio":"Change anytime in settings"}</p>
                <div style={{ display:"flex", gap:10, marginBottom:18 }}>
                  {[{v:"simple",icon:"🌿",t:sw?"Rahisi":"Simple",d:sw?"Mapendekezo ya chakula tu":"Just food recommendations"},{v:"detailed",icon:"📊",t:sw?"Kina":"Detailed",d:sw?"Kalori, protini na kiasi halisi":"Calories, protein & exact amounts"}].map(m=>(
                    <div key={m.v} className={`mode-card${form.mode===m.v?" on":""}`} onClick={()=>setForm({...form,mode:m.v})}>
                      <div style={{ fontSize:28, marginBottom:7 }}>{m.icon}</div>
                      <div style={{ fontSize:13.5, fontWeight:700, color:form.mode===m.v?C.g2:C.text, marginBottom:4 }}>{m.t}</div>
                      <div style={{ fontSize:11.5, color:C.textMuted, lineHeight:1.4 }}>{m.d}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginBottom:16 }}>
                  <div style={{ fontSize:11.5, color:C.textMid, fontWeight:600, marginBottom:10 }}>{sw?"Vyakula usivyopenda (optional)":"Foods you dislike (optional)"}</div>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:7 }}>
                    {["Ugali wa mtama","Dagaa","Maharage","Samaki","Maziwa","Mayai","Mchicha","Nyama"].map(f=>{
                      const dis = form.dislikes ? form.dislikes.split(",").filter(Boolean) : [];
                      const on = dis.includes(f);
                      return <label key={f} className={`chip${on?" on":""}`} onClick={()=>{ const d = on?dis.filter(x=>x!==f):[...dis,f]; setForm({...form,dislikes:d.join(",")}); }}>{f}</label>;
                    })}
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button className="btn-out" onClick={()=>setOnboardStep(2)} style={{ flex:1 }}>{sw?"← Rudi":"← Back"}</button>
                  <button className="btn" onClick={handleOnboard} disabled={authLoading} style={{ flex:2 }}>
                    {authLoading?(sw?"Inahifadhi...":"Saving..."):(sw?"✓ Anza NutriAdvisor":"✓ Start NutriAdvisor")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // WELCOME
  // ════════════════════════════════════════════════════════════
  if (screen === "welcome") return (
    <div style={{ height:"100vh", background:C.g1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Outfit',sans-serif" }}>
      <style>{G}</style>
      <div style={{ width:"100%", maxWidth:360, animation:"fadeUp .6s ease" }}>
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <img src={logoImg} alt="" style={{ width:72, height:72, objectFit:"contain", marginBottom:16 }}/>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:26, fontWeight:600, color:"#fff", marginBottom:5 }}>{getGreeting()}</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>{sw?"Karibu NutriAdvisor":"Welcome to NutriAdvisor"}</div>
        </div>
        <div style={{ background:"rgba(255,255,255,0.08)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:16, padding:"16px 18px", marginBottom:20 }}>
          <div style={{ fontSize:10.5, color:C.g3, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:8 }}>💡 {sw?"Kidokezo cha Leo":"Tip of the Day"}</div>
          <p style={{ fontSize:13.5, color:"rgba(255,255,255,0.85)", lineHeight:1.65 }}>{todayTip}</p>
        </div>
        <div style={{ display:"flex", gap:8, marginBottom:24, flexWrap:"wrap" }}>
          {[["📍",profile?.region||"Tanzania"],["🩺",(profile?.health||"Mzima").slice(0,14)],["💰",profile?.budget?.includes("Chini")?"Bajeti Chini":profile?.budget?.includes("Juu")?"Bajeti Juu":"Wastani"]].map(([ic,v],i)=>(
            <div key={i} style={{ background:"rgba(255,255,255,0.1)", borderRadius:20, padding:"5px 12px", fontSize:11.5, color:"rgba(255,255,255,0.7)", fontWeight:500 }}>{ic} {v}</div>
          ))}
        </div>
        <button className="btn" onClick={()=>setScreen("main")} style={{ background:"rgba(255,255,255,0.15)", border:"2px solid rgba(255,255,255,0.3)", fontSize:15 }}>
          {sw?"Anza Kupata Ushauri →":"Start Getting Advice →"}
        </button>
      </div>
    </div>
  );

  // ════════════════════════════════════════════════════════════
  // MAIN APP
  // ════════════════════════════════════════════════════════════
  const prices = getPrices(profile?.region);
  const mode = profile?.mode || "simple";
  const SUGGESTIONS = [
    { icon:"🍳", label:sw?"Leo":"Today", text:sw?`Nipe mpango wa chakula wa leo — ${profile?.health}, bajeti ${profile?.budget?.split("(")[0]}, ${profile?.region}`:`Today's meal plan — ${profile?.health}, budget ${profile?.budget?.split("(")[0]}, ${profile?.region}` },
    { icon:"📅", label:sw?"Wiki":"Week", text:sw?`Nipe mpango wa wiki mzima — ${profile?.health}, ${profile?.region}`:`Full week plan — ${profile?.health}, ${profile?.region}` },
    { icon:"🛒", label:sw?"Soko":"Market", text:sw?`Orodha ya kununua sokoni — ${profile?.region} na bei za sasa`:`Shopping list — ${profile?.region} current prices` },
    { icon:"💬", label:sw?"Ushauri":"Tips", text:sw?"Nipe vidokezo vya lishe kwa hali yangu":"Give me nutrition tips for my health condition" },
  ];

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:C.bg, fontFamily:"'Outfit',sans-serif", color:C.text, position:"relative" }}>
      <style>{G}</style>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} onClose={()=>setToast(null)}/>}

      {/* Side Panel */}
      {sidePanel && (
        <>
          <div className="overlay" onClick={()=>setSidePanel(false)}/>
          <div className="side-panel">
            <div style={{ background:C.g1, padding:"20px 18px 16px" }}>
              <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                <img src={logoImg} alt="" style={{ width:34, height:34, objectFit:"contain" }}/>
                <div>
                  <div style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:600, color:"#fff" }}>NutriAdvisor</div>
                  <div style={{ fontSize:10, color:C.g3, letterSpacing:.5 }}>SMART NUTRITION. BETTER YOU.</div>
                </div>
              </div>
              {profile && (
                <div style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"10px 12px" }}>
                  <div style={{ fontSize:14, fontWeight:600, color:"#fff" }}>{profile.first_name} {profile.last_name}</div>
                  <div style={{ fontSize:11.5, color:"rgba(255,255,255,0.45)", marginTop:1 }}>{profile.region} · {profile.health}</div>
                </div>
              )}
            </div>
            <div style={{ flex:1, overflowY:"auto", padding:"10px 0" }}>
              {[
                { icon:"👤", l:sw?"Wasifu Wangu":"My Profile", action:()=>{setMainTab("profile");setSidePanel(false);} },
                { icon:"⚙️", l:sw?"Mipangilio":"Settings", action:()=>setSidePanel(false) },
                { icon:"🔔", l:sw?"Arifa":"Notifications", action:()=>setSidePanel(false) },
                { icon:"📊", l:sw?"Mtindo wa Ushauri":"Advice Style", sub:mode==="simple"?(sw?"Rahisi":"Simple"):(sw?"Kina":"Detailed"), action:()=>setSidePanel(false) },
                { icon:"🌐", l:sw?"Lugha":"Language", sub:lang==="sw"?"Kiswahili":"English", action:()=>{setScreen("lang");setSidePanel(false);} },
                { icon:"📋", l:sw?"Sera ya Faragha":"Privacy Policy", action:()=>setSidePanel(false) },
                { icon:"❓", l:sw?"Msaada":"Help & Support", action:()=>setSidePanel(false) },
                { icon:"ℹ️", l:sw?"Kuhusu NutriAdvisor":"About", action:()=>setSidePanel(false) },
              ].map((item,i)=>(
                <button key={i} onClick={item.action} style={{ width:"100%", padding:"12px 18px", border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:13, textAlign:"left", fontFamily:"'Outfit',sans-serif", transition:"background .15s" }}
                  onMouseEnter={e=>e.currentTarget.style.background=C.g4}
                  onMouseLeave={e=>e.currentTarget.style.background="transparent"}>
                  <span style={{ fontSize:18, width:26, textAlign:"center" }}>{item.icon}</span>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:500, color:C.text }}>{item.l}</div>
                    {item.sub && <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>{item.sub}</div>}
                  </div>
                  <span style={{ color:C.textFaint, fontSize:14 }}>›</span>
                </button>
              ))}
              <div style={{ height:1, background:C.border, margin:"8px 18px" }}/>
              <button onClick={handleSignOut} style={{ width:"100%", padding:"12px 18px", border:"none", background:"transparent", cursor:"pointer", display:"flex", alignItems:"center", gap:13, fontFamily:"'Outfit',sans-serif" }}>
                <span style={{ fontSize:18, width:26, textAlign:"center" }}>🚪</span>
                <span style={{ fontSize:14, fontWeight:600, color:"#C0392B" }}>{sw?"Toka":"Sign Out"}</span>
              </button>
            </div>
            <div style={{ padding:"10px 18px", borderTop:`1px solid ${C.border}` }}>
              <div style={{ fontSize:11, color:C.textFaint, textAlign:"center" }}>NutriAdvisor v5.0 · Tanzania 🇹🇿</div>
            </div>
          </div>
        </>
      )}

      {/* ── Header ── */}
      <div style={{ padding:"11px 16px", background:"rgba(255,255,255,0.97)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, boxShadow:`0 1px 12px rgba(26,71,49,0.07)` }}>
        <button onClick={()=>setSidePanel(true)} style={{ width:36, height:36, borderRadius:10, border:`1px solid ${C.border}`, background:C.bg, cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", gap:4, padding:"8px 10px" }}>
          <div style={{ width:15, height:1.5, background:C.textMid, borderRadius:2 }}/><div style={{ width:11, height:1.5, background:C.textMid, borderRadius:2 }}/><div style={{ width:15, height:1.5, background:C.textMid, borderRadius:2 }}/>
        </button>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <img src={logoImg} alt="" style={{ width:26, height:26, objectFit:"contain" }}/>
          <span style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:600, color:C.text }}>NutriAdvisor</span>
        </div>
        <div style={{ background:C.g4, border:`1px solid ${C.borderMid}`, borderRadius:20, padding:"4px 10px", fontSize:11, color:C.g2, fontWeight:600 }}>📍{profile?.region?.split(" ")[0]||"TZ"}</div>
      </div>

      {/* ── Content ── */}
      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>

        {/* HOME */}
        <div style={{ position:"absolute", inset:0, overflowY:"auto", display:mainTab==="home"?"flex":"none", flexDirection:"column", padding:"12px 14px 0" }}>
          {/* Welcome banner */}
          {messages.length===0 && (
            <div style={{ background:`linear-gradient(135deg,${C.g1},${C.g2})`, borderRadius:16, padding:"14px 16px", marginBottom:12, flexShrink:0, animation:"fadeUp .4s ease" }}>
              <div style={{ fontSize:15, fontWeight:600, color:"#fff", marginBottom:3 }}>{getGreeting()} 👋</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.65)", lineHeight:1.55 }}>{sw?`Nipo hapa kukusaidia na lishe — kwa hali yako ya ${profile?.health||"afya"}`:`I'm here to help with nutrition — for your ${profile?.health||"health"}`}</div>
            </div>
          )}

          {/* Suggestions */}
          {messages.length===0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:12, flexShrink:0 }}>
              {SUGGESTIONS.map((s,i)=>(
                <button key={i} className="sug" onClick={()=>sendMessage(s.text)} style={{ background:C.w, border:`1.5px solid ${C.border}`, borderRadius:13, padding:"11px 11px", cursor:"pointer", textAlign:"left", fontFamily:"'Outfit',sans-serif", display:"flex", alignItems:"flex-start", gap:8, boxShadow:C.shadow, transition:"all .2s", animation:`fadeUp ${.15+i*.06}s ease` }}>
                  <span style={{ fontSize:19, flexShrink:0 }}>{s.icon}</span>
                  <span>
                    <span style={{ fontSize:9.5, fontWeight:700, color:C.g2, display:"block", marginBottom:2, textTransform:"uppercase", letterSpacing:.5 }}>{s.label}</span>
                    <span style={{ fontSize:11.5, color:C.textMid, lineHeight:1.35 }}>{s.text.length>48?s.text.slice(0,48)+"…":s.text}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Admin */}
          {showAdmin && (
            <div className="card" style={{ padding:14, marginBottom:12, flexShrink:0, animation:"fadeUp .3s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:15, fontWeight:600 }}>📊 Admin Dashboard</div>
                <button onClick={()=>setShowAdmin(false)} style={{ background:"none", border:"none", color:C.textFaint, cursor:"pointer", fontSize:18 }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:7, marginBottom:12 }}>
                {[{bg:`linear-gradient(135deg,${C.g2},${C.g1})`,v:adminUsers.length,l:"Users"},{bg:`linear-gradient(135deg,${C.o2},${C.o1})`,v:adminUsers.filter(u=>u.mode==="detailed").length,l:"Detailed"},{bg:`linear-gradient(135deg,${C.b2},${C.b1})`,v:adminUsers.filter(u=>u.language==="sw").length,l:"Swahili"}].map((s,i)=>(
                  <div key={i} style={{ background:s.bg, borderRadius:10, padding:"10px 8px", textAlign:"center" }}>
                    <div style={{ fontSize:20, fontWeight:800, color:"#fff" }}>{s.v}</div>
                    <div style={{ fontSize:10, color:"rgba(255,255,255,0.75)" }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {adminUsers.slice(0,4).map((u,i)=>(
                <div key={i} style={{ background:C.bg, borderRadius:8, padding:"8px 10px", marginBottom:5, border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <strong style={{ fontSize:13 }}>{u.first_name} {u.last_name}</strong>
                    <span style={{ fontSize:10, color:C.textFaint }}>{u.region}</span>
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:1 }}>{u.health} · {u.mode==="detailed"?"📊 Detailed":"🌿 Simple"}</div>
                </div>
              ))}
            </div>
          )}

          {/* Messages */}
          <div style={{ flex:1 }}>
            {messages.map((m,i)=>(
              <div key={i} style={{ marginBottom:16, animation:"fadeUp .3s ease" }}>
                {/* Role header */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:27, height:27, borderRadius:8, background:m.role==="user"?`linear-gradient(135deg,${C.o2},${C.o1})`:`linear-gradient(135deg,${C.g2},${C.g1})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#fff", fontFamily:"'Fraunces',serif", flexShrink:0 }}>
                    {m.role==="user"?(profile?.first_name?.[0]?.toUpperCase()||"U"):"N"}
                  </div>
                  <span style={{ fontSize:12.5, fontWeight:700, color:m.role==="user"?C.o1:C.g2, fontFamily:"'Fraunces',serif" }}>
                    {m.role==="user"?(profile?.first_name||(sw?"Wewe":"You")):"NutriAdvisor"}
                    {m.role==="assistant"&&<span style={{ fontSize:10, color:C.textFaint, fontWeight:400, marginLeft:5, fontFamily:"'Outfit',sans-serif" }}>AI</span>}
                  </span>
                </div>
                {/* Bubble */}
                <div style={{ marginLeft:35, padding:"12px 14px", borderRadius:"4px 16px 16px 16px", background:m.role==="user"?C.g4:C.w, border:`1px solid ${m.role==="user"?C.borderMid:C.border}`, boxShadow:C.shadow }}>
                  {m.role==="assistant"?<FormatMsg text={m.content}/>:<div style={{ fontSize:13.5, lineHeight:1.7 }}>{m.content}</div>}
                </div>
                {/* Action buttons — like this Claude app */}
                {m.role==="assistant" && (
                  <div style={{ marginLeft:35, marginTop:6, display:"flex", alignItems:"center", gap:5, flexWrap:"wrap" }}>
                    {/* Copy */}
                    <button className="action-btn" id={`cp-${i}`} onClick={async()=>{
                      try { await navigator.clipboard.writeText(m.content); const b=document.getElementById(`cp-${i}`); if(b){const orig=b.innerHTML;b.innerHTML=`✓ ${sw?"Imenakiliwa":"Copied"}`;b.style.color=C.g2;b.style.borderColor=C.g2;setTimeout(()=>{b.innerHTML=orig;b.style.color="";b.style.borderColor="";},2000);}
                      } catch(e){}
                    }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                      {sw?"Nakili":"Copy"}
                    </button>
                    {/* Thumbs up */}
                    <button className="action-btn" id={`up-${i}`} onClick={()=>handleFeedback("up",i)} style={{ background:feedbackState[i]==="up"?C.g4:"transparent", color:feedbackState[i]==="up"?C.g2:undefined, borderColor:feedbackState[i]==="up"?C.g2:undefined }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={feedbackState[i]==="up"?C.g2:"none"} stroke="currentColor" strokeWidth="2"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3H14z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                    </button>
                    {/* Thumbs down */}
                    <button className="action-btn" id={`dn-${i}`} onClick={()=>handleFeedback("down",i)} style={{ background:feedbackState[i]==="down"?C.o4:"transparent", color:feedbackState[i]==="down"?C.o1:undefined, borderColor:feedbackState[i]==="down"?C.o1:undefined }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill={feedbackState[i]==="down"?C.o1:"none"} stroke="currentColor" strokeWidth="2"><path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z"/><path d="M17 2h2.67A2.31 2.31 0 0 1 22 4v7a2.31 2.31 0 0 1-2.33 2H17"/></svg>
                    </button>
                    {/* Market guide */}
                    <button className="action-btn" onClick={()=>setExpandedMsg(expandedMsg===i?null:i)} style={{ marginLeft:"auto" }}>
                      {expandedMsg===i?(sw?"▲ Funga":"▲ Close"):(sw?"▼ Bei za Soko":"▼ Market Prices")}
                    </button>
                  </div>
                )}
                {/* Market guide expanded */}
                {m.role==="assistant" && expandedMsg===i && (
                  <div style={{ marginLeft:35, marginTop:8, background:C.g4, border:`1px solid ${C.borderMid}`, borderRadius:12, padding:13, animation:"fadeUp .3s ease" }}>
                    <div style={{ fontWeight:700, color:C.g2, fontSize:13, marginBottom:9 }}>🛒 {sw?`Bei za Soko — ${profile?.region}`:`Market Prices — ${profile?.region}`}</div>
                    <div style={{ overflowX:"auto", borderRadius:9, border:`1px solid ${C.borderMid}` }}>
                      <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                        <thead><tr>{[sw?"Chakula":"Food",sw?"Kwa Mlo":"Per Meal",sw?"Bei ya Soko":"Market Price"].map((h,j)=>(
                          <th key={j} style={{ background:C.g2, color:"#fff", padding:"6px 9px", textAlign:"left", fontSize:11 }}>{h}</th>
                        ))}</tr></thead>
                        <tbody>
                          {[["Mchele","Kikombe 1 (200g)",`TZS ${Math.round((prices.mchele||2000)/6).toLocaleString()}/kk (1kg=vikombe 6)`],["Dagaa","Vijiko 4 (35g)",`TZS ${Math.round((prices.dagaa||4000)/28).toLocaleString()}/v4 (1kg=vijiko 28)`],["Maharage","Kikombe 1 (150g)",`TZS ${Math.round((prices.maharage||2500)/5).toLocaleString()}/kk (1kg=vikombe 5)`],["Mchicha","Kikombe 1 kupikwa",`TZS ${Math.round((prices.mchicha||300)/3).toLocaleString()}/kk (mfungu=vikombe 3)`],["Mayai","Mayai 2",`TZS ${prices.mayai?.toLocaleString()}/yai`],["Kuku","Gramu 120",`TZS ${Math.round((prices.kuku||9000)/4).toLocaleString()}/sehemu (1kg=sehemu 4)`]].map((row,ri)=>(
                            <tr key={ri} style={{ background:ri%2===0?C.g4:C.w }}>
                              {row.map((cell,ci)=><td key={ci} style={{ padding:"5px 9px", borderBottom:`1px solid ${C.border}`, color:C.textMid, fontSize:12 }}>{cell}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div style={{ fontSize:10.5, color:C.textFaint, marginTop:8, textAlign:"center" }}>📍 {profile?.region} · {new Date().toLocaleDateString(sw?"sw-TZ":"en-US",{month:"long",year:"numeric"})}</div>
                  </div>
                )}
              </div>
            ))}

            {/* Loading */}
            {loading && (
              <div style={{ marginBottom:16, animation:"fadeUp .3s ease" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:6 }}>
                  <div style={{ width:27, height:27, borderRadius:8, background:`linear-gradient(135deg,${C.g2},${C.g1})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:800, color:"#fff", fontFamily:"'Fraunces',serif" }}>N</div>
                  <span style={{ fontSize:12.5, fontWeight:700, color:C.g2, fontFamily:"'Fraunces',serif" }}>NutriAdvisor <span style={{ fontSize:10, color:C.textFaint, fontWeight:400, fontFamily:"'Outfit',sans-serif" }}>AI</span></span>
                </div>
                <div style={{ marginLeft:35, padding:"12px 16px", background:C.w, border:`1px solid ${C.border}`, borderRadius:"4px 16px 16px 16px", boxShadow:C.shadow, display:"flex", alignItems:"center", gap:5 }}>
                  <span style={{ fontSize:13, color:C.textMuted }}>{sw?"Ninafikiri…":"Thinking…"}</span>
                  {[0,1,2].map(d=><div key={d} style={{ width:6, height:6, borderRadius:"50%", background:C.g2, animation:`blink 1.2s ease ${d*.2}s infinite` }}/>)}
                </div>
              </div>
            )}
            <div ref={bottomRef} style={{ height:12 }}/>
          </div>
        </div>

        {/* MEAL PLAN */}
        <div style={{ position:"absolute", inset:0, overflowY:"auto", display:mainTab==="mealplan"?"block":"none", padding:"14px 14px" }}>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600, marginBottom:3 }}>{sw?"Mpango wa Chakula":"Meal Planner"}</div>
          <p style={{ color:C.textMuted, fontSize:12.5, marginBottom:14 }}>{sw?"Gusa chaguo lolote kupata mpango wako binafsi":"Tap any option to generate your personal plan"}</p>

          {/* Meal photo cards */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:16 }}>
            <MealCard title={sw?"Mpango wa Leo":"Today's Plan"} subtitle={profile?.region} query="tanzanian breakfast food" color={C.g2} onClick={()=>{ sendMessage(sw?`Nipe mpango wa chakula wa leo — ${profile?.health}, bajeti ${profile?.budget?.split("(")[0]}, ${profile?.region}`:`Today's meal plan — ${profile?.health}, budget ${profile?.budget?.split("(")[0]}, ${profile?.region}`); setMainTab("home"); }}/>
            <MealCard title={sw?"Wiki Nzima":"Full Week"} subtitle="7 days" query="healthy african meal spread" color={C.b2} onClick={()=>{ sendMessage(sw?`Nipe mpango wa wiki mzima — ${profile?.health}, ${profile?.region}`:`Full week plan — ${profile?.health}, ${profile?.region}`); setMainTab("home"); }}/>
            <MealCard title={sw?"Familia ya 4":"Family of 4"} subtitle={profile?.budget?.split("(")[0]} query="family dinner african food" color={C.o2} onClick={()=>{ sendMessage(sw?`Mpango wa wiki kwa familia ya watu 4 — ${profile?.region}`:`Week plan for family of 4 — ${profile?.region}`); setMainTab("home"); }}/>
            <MealCard title={sw?"Bajeti Ndogo":"Tight Budget"} subtitle="TZS 3,000/siku" query="affordable tanzanian food" color={C.g1} onClick={()=>{ sendMessage(sw?`Mpango wa wiki kwa bajeti TZS 3,000/siku — ${profile?.region}`:`Week plan for tight budget TZS 3,000/day — ${profile?.region}`); setMainTab("home"); }}/>
          </div>

          {/* Budget info */}
          {[{e:"🟢",t:sw?"Bajeti Chini":"Low Budget",sub:"TZS 1,000–5,000/siku",p:sw?"Ugali + dagaa + maharage + mchicha":"Ugali + dagaa + beans + mchicha",c:"~1,800 kcal"},{e:"🟡",t:sw?"Bajeti Wastani":"Average Budget",sub:"TZS 5,000–20,000/siku",p:sw?"Wali/tambi + samaki + kuku + mboga":"Rice/pasta + fish + chicken + vegs",c:"~2,000 kcal"},{e:"🔴",t:sw?"Bajeti Kubwa":"High Budget",sub:"TZS 20,000+/siku",p:sw?"Pilau + nyama + samaki bora + matunda":"Pilau + meat + premium fish + fruits",c:"~2,200 kcal"}].map((c,i)=>(
            <div key={i} className="card" style={{ padding:"13px 15px", marginBottom:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:3 }}>
                <div style={{ fontSize:13.5, fontWeight:700, color:C.g2, fontFamily:"'Fraunces',serif" }}>{c.e} {c.t}</div>
                <span style={{ fontSize:11, background:C.g4, color:C.g2, padding:"3px 9px", borderRadius:20, fontWeight:600 }}>{c.c}</span>
              </div>
              <div style={{ fontSize:11, color:C.textFaint, marginBottom:3 }}>{c.sub}</div>
              <div style={{ fontSize:12.5, color:C.textMuted, lineHeight:1.5 }}>{c.p}</div>
            </div>
          ))}
        </div>

        {/* GROUPS */}
        <div style={{ position:"absolute", inset:0, overflowY:"auto", display:mainTab==="groups"?"block":"none", padding:"14px 14px" }}>
          {!selGroup ? (
            <>
              <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600, marginBottom:3 }}>{sw?"Vikundi vya Lishe":"Nutrition Groups"}</div>
              <p style={{ color:C.textMuted, fontSize:12.5, marginBottom:14 }}>{sw?"Gusa kikundi kupata ushauri maalum":"Tap a group for specialized advice"}</p>

              {/* Food groups with photos */}
              {mode==="simple" && (
                <>
                  <div style={{ fontSize:11, color:C.textFaint, fontWeight:600, letterSpacing:.8, textTransform:"uppercase", marginBottom:10 }}>{sw?"Makundi ya Chakula":"Food Groups"}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9, marginBottom:16 }}>
                    {(FOOD_GROUPS[lang]||FOOD_GROUPS.sw).map((g,i)=>(
                      <button key={i} onClick={()=>{ sendMessage(sw?`Nielezee kikundi cha ${g.name} na vyakula vya Tanzania`:`Tell me about ${g.name} and Tanzanian foods`); setMainTab("home"); }} style={{ background:C.w, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"13px 12px", cursor:"pointer", textAlign:"left", fontFamily:"'Outfit',sans-serif", boxShadow:C.shadow, transition:"all .2s" }}
                        onMouseEnter={e=>{e.currentTarget.style.borderColor=g.color;e.currentTarget.style.transform="translateY(-2px)";}}
                        onMouseLeave={e=>{e.currentTarget.style.borderColor=C.border;e.currentTarget.style.transform="translateY(0)";}}>
                        <div style={{ fontSize:26, marginBottom:7 }}>{g.icon}</div>
                        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{g.name}</div>
                        <div style={{ fontSize:11, color:C.textMuted, lineHeight:1.3, marginBottom:7 }}>{g.desc}</div>
                        <div style={{ width:22, height:3, background:g.color, borderRadius:3 }}/>
                      </button>
                    ))}
                  </div>
                </>
              )}

              {/* Health groups */}
              <div style={{ fontSize:11, color:C.textFaint, fontWeight:600, letterSpacing:.8, textTransform:"uppercase", marginBottom:10 }}>{sw?"Hali za Kiafya":"Health Conditions"}</div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:9 }}>
                {Object.entries(GROUPS).map(([k,g])=>(
                  <GroupCard key={k} g={g} lang={lang} onClick={()=>setSelGroup(k)}/>
                ))}
              </div>
            </>
          ) : (
            <div style={{ animation:"fadeUp .3s ease" }}>
              <button onClick={()=>setSelGroup(null)} style={{ background:"transparent", border:`1.5px solid ${C.border}`, borderRadius:10, padding:"7px 14px", color:C.textMuted, fontSize:13, fontFamily:"'Outfit',sans-serif", cursor:"pointer", marginBottom:14, fontWeight:600 }}>← {sw?"Rudi":"Back"}</button>
              {(()=>{
                const g=GROUPS[selGroup];
                const tips=sw?g.tips_sw:g.tips_en;
                return (
                  <>
                    <GroupHero g={g} lang={lang}/>
                    <button onClick={()=>{ sendMessage(sw?g.ask_sw||`Nipe ushauri wa lishe kwa ${g.sw}`:g.ask_en||`Give me nutrition advice for ${g.en}`); setMainTab("home"); }} style={{ width:"100%", padding:"13px", background:`linear-gradient(135deg,${C.g2},${C.g1})`, border:"none", borderRadius:13, color:"#fff", fontSize:14, fontFamily:"'Outfit',sans-serif", fontWeight:700, cursor:"pointer", marginBottom:16, boxShadow:`0 4px 18px rgba(45,122,79,0.35)`, transition:"all .2s" }}>
                      {sw?`Uliza AI Kuhusu ${g.sw} →`:`Ask AI About ${g.en} →`}
                    </button>
                    {tips.map((t,i)=>(
                      <div key={i} style={{ background:C.w, borderLeft:`4px solid ${g.color||C.g2}`, borderRadius:"0 13px 13px 0", padding:"12px 14px", marginBottom:9, boxShadow:C.shadow }}>
                        <div style={{ fontSize:12.5, color:C.textMid, lineHeight:1.65 }}>{t}</div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </div>

        {/* PROFILE */}
        <div style={{ position:"absolute", inset:0, overflowY:"auto", display:mainTab==="profile"?"block":"none", padding:"14px 14px" }}>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:20, fontWeight:600, marginBottom:14 }}>{sw?"Wasifu Wangu":"My Profile"}</div>
          <div className="card" style={{ padding:18, marginBottom:12, textAlign:"center" }}>
            <div style={{ width:68, height:68, borderRadius:"50%", background:`linear-gradient(135deg,${C.g2},${C.g1})`, display:"flex", alignItems:"center", justifyContent:"center", margin:"0 auto 11px", fontFamily:"'Fraunces',serif", fontSize:28, fontWeight:700, color:"#fff" }}>
              {profile?.first_name?.[0]?.toUpperCase()||"N"}
            </div>
            <div style={{ fontFamily:"'Fraunces',serif", fontSize:19, fontWeight:600, marginBottom:3 }}>{profile?.first_name} {profile?.last_name}</div>
            <div style={{ fontSize:13, color:C.textMuted, marginBottom:12 }}>{profile?.email}</div>
            <div style={{ display:"flex", justifyContent:"center", gap:7, flexWrap:"wrap" }}>
              {[["📍",profile?.region||"Tanzania"],["🩺",(profile?.health||"Mzima").slice(0,14)],["🎯",(profile?.goal||"Afya nzuri").slice(0,14)]].map(([ic,v],i)=>(
                <div key={i} style={{ background:C.g4, border:`1px solid ${C.borderMid}`, borderRadius:20, padding:"4px 11px", fontSize:11.5, color:C.g2, fontWeight:600 }}>{ic} {v}</div>
              ))}
            </div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:9, marginBottom:12 }}>
            {[{icon:"💬",l:sw?"Mazungumzo":"Chats",v:messages.filter(m=>m.role==="user").length},{icon:"🌿",l:sw?"Mtindo":"Mode",v:mode==="simple"?(sw?"Rahisi":"Simple"):(sw?"Kina":"Detailed")},{icon:"📅",l:sw?"Siku":"Days",v:profile?.joined_at?Math.floor((Date.now()-new Date(profile.joined_at).getTime())/(86400000)):0}].map((s,i)=>(
              <div key={i} className="card" style={{ padding:"12px 9px", textAlign:"center" }}>
                <div style={{ fontSize:22, marginBottom:4 }}>{s.icon}</div>
                <div style={{ fontFamily:"'Fraunces',serif", fontSize:17, fontWeight:700, color:C.g2, marginBottom:2 }}>{s.v}</div>
                <div style={{ fontSize:10.5, color:C.textFaint }}>{s.l}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:"14px 16px", marginBottom:12 }}>
            {[[sw?"Jina":"Name",`${profile?.first_name||""} ${profile?.last_name||""}`],[sw?"Mkoa":"Region",profile?.region||"—"],[sw?"Umri":"Age",profile?.age||"—"],[sw?"Jinsia":"Gender",profile?.gender||"—"],[sw?"Hali ya Kiafya":"Health",profile?.health||"—"],[sw?"Bajeti":"Budget",profile?.budget?.split("(")[0]||"—"],[sw?"Lengo":"Goal",profile?.goal||"—"],[sw?"Mtindo wa Ushauri":"Advice Mode",mode==="detailed"?(sw?"Kina":"Detailed"):(sw?"Rahisi":"Simple")],[sw?"Alijiunga":"Joined",profile?.joined_at?new Date(profile.joined_at).toLocaleDateString(sw?"sw-TZ":"en-US",{day:"numeric",month:"long",year:"numeric"}):"—"]].map(([l,v],i,arr)=>(
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"9px 0", borderBottom:i<arr.length-1?`1px solid ${C.border}`:"none" }}>
                <span style={{ fontSize:13, color:C.textMuted }}>{l}</span>
                <span style={{ fontSize:13, fontWeight:600, color:C.text, textAlign:"right", maxWidth:"55%" }}>{v}</span>
              </div>
            ))}
          </div>
          <button className="btn-out" onClick={handleSignOut} style={{ borderColor:"#C0392B", color:"#C0392B" }}>{sw?"Toka kwenye Akaunti":"Sign Out"}</button>
        </div>
      </div>

      {/* Input */}
      {mainTab==="home" && (
        <div style={{ padding:"9px 13px 7px", borderTop:`1px solid ${C.border}`, background:"rgba(255,255,255,0.97)", backdropFilter:"blur(16px)", flexShrink:0 }}>
          <div style={{ display:"flex", gap:8, alignItems:"flex-end" }}>
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder={sw?"Uliza kuhusu lishe, chakula, au bei…":"Ask about nutrition, food, or prices…"} rows={1} style={{ flex:1, padding:"11px 14px", borderRadius:22, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:13.5, fontFamily:"'Outfit',sans-serif", resize:"none", maxHeight:88, overflowY:"auto", lineHeight:1.5, transition:"all .2s" }}/>
            <button onClick={()=>sendMessage()} disabled={loading||!input.trim()} style={{ width:42, height:42, borderRadius:"50%", border:"none", flexShrink:0, background:loading||!input.trim()?C.border:`linear-gradient(135deg,${C.g2},${C.g1})`, color:loading||!input.trim()?C.textFaint:"#fff", fontSize:17, cursor:loading||!input.trim()?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .22s", boxShadow:loading||!input.trim()?"none":`0 4px 14px rgba(45,122,79,0.35)` }}>↑</button>
          </div>
          <p style={{ color:C.textFaint, fontSize:10, marginTop:5, textAlign:"center" }}>{sw?"Ushauri wa elimu tu · Wasiliana na daktari kwa dharura":"Educational only · Contact a doctor for emergencies"}</p>
        </div>
      )}

      {/* Bottom Nav */}
      <div style={{ background:"rgba(255,255,255,0.97)", borderTop:`1px solid ${C.border}`, display:"flex", flexShrink:0, boxShadow:`0 -2px 14px rgba(26,71,49,0.07)` }}>
        <NavBtn icon="🏡" label={sw?"Nyumbani":"Home"} active={mainTab==="home"} onClick={()=>setMainTab("home")}/>
        <NavBtn icon="🍽️" label={sw?"Mpango":"Meals"} active={mainTab==="mealplan"} onClick={()=>setMainTab("mealplan")}/>
        <NavBtn icon="🌿" label={sw?"Vikundi":"Groups"} active={mainTab==="groups"} onClick={()=>{setMainTab("groups");setSelGroup(null);}}/>
        <NavBtn icon="🪴" label={sw?"Wasifu":"Profile"} active={mainTab==="profile"} onClick={()=>setMainTab("profile")}/>
      </div>
    </div>
  );
}

// ─── Group Card with Photo ────────────────────────────────────
function GroupCard({ g, lang, onClick }) {
  const [photo, setPhoto] = useState(null);
  const sw = lang === "sw";
  useEffect(() => { if (g.spoon) spoon.getMealPhoto(g.spoon).then(p => p && setPhoto(p)); }, []);
  return (
    <button onClick={onClick} style={{ background:C.w, border:`1.5px solid ${C.border}`, borderRadius:14, overflow:"hidden", cursor:"pointer", textAlign:"left", boxShadow:C.shadow, transition:"all .2s", fontFamily:"'Outfit',sans-serif" }}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow=C.shadowMd;}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=C.shadow;}}>
      <div style={{ height:70, background:photo?`url(${photo}) center/cover`:`linear-gradient(135deg,${g.color||C.g2},${C.g1})`, position:"relative" }}>
        {!photo && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:28 }}>{g.icon}</div>}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 30%, rgba(0,0,0,0.4))" }}/>
      </div>
      <div style={{ padding:"10px 12px" }}>
        <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:2 }}>{sw?g.sw:g.en}</div>
        <div style={{ width:18, height:3, background:g.color||C.g2, borderRadius:3 }}/>
      </div>
    </button>
  );
}

// ─── Group Hero with Photo ────────────────────────────────────
function GroupHero({ g, lang }) {
  const [photo, setPhoto] = useState(null);
  const sw = lang === "sw";
  useEffect(() => { if (g.spoon) spoon.getMealPhoto(g.spoon).then(p => p && setPhoto(p)); }, []);
  return (
    <div style={{ borderRadius:16, overflow:"hidden", marginBottom:16, boxShadow:C.shadowMd }}>
      <div style={{ height:140, background:photo?`url(${photo}) center/cover`:`linear-gradient(135deg,${g.color||C.g2},${C.g1})`, position:"relative" }}>
        {!photo && <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"center", justifyContent:"center", fontSize:52 }}>{g.icon}</div>}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 50%)" }}/>
        <div style={{ position:"absolute", bottom:14, left:16 }}>
          <div style={{ fontFamily:"'Fraunces',serif", fontSize:22, fontWeight:600, color:"#fff" }}>{sw?g.sw:g.en}</div>
        </div>
      </div>
    </div>
  );
}
