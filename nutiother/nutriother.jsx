import { useState, useRef, useEffect, useCallback } from "react";

// Firebase — imported from firebase.js (already initialized there)
import { auth, db, googleProvider } from "./firebase";
import {
  signInWithPopup, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, onAuthStateChanged, signOut
} from "firebase/auth";
import {
  doc, setDoc, getDoc, collection, addDoc, getDocs
} from "firebase/firestore";

// API Key — for OpenAI backend calls
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

// ─── Color System — Warm African Sunset ──────────────────────
const C = {
  // Primary — warm orange/sunset
  primary: "#E8621A",
  primaryDark: "#C4501A",
  primaryLight: "#F28C5A",
  primaryBg: "#FEF3EC",
  primaryBorder: "rgba(232,98,26,0.2)",

  // Secondary — deep red/earth
  secondary: "#B83214",
  secondaryBg: "#FEE8E0",

  // Accent — warm gold
  accent: "#D4870A",
  accentBg: "#FEF6E4",

  // Success — warm green
  success: "#2D7A3A",
  successBg: "#EAF5ED",

  // Neutrals
  bg: "#FFFAF7",
  bgCard: "#FFFFFF",
  bgDim: "#FEF3EC",
  text: "#1A0A00",
  textMid: "#5C3010",
  textMuted: "#9C6840",
  textFaint: "#D4A882",
  border: "rgba(232,98,26,0.12)",
  borderMid: "rgba(232,98,26,0.25)",
  shadow: "0 2px 16px rgba(232,98,26,0.08)",
  shadowMd: "0 4px 24px rgba(232,98,26,0.12)",
};

// ─── Regions ──────────────────────────────────────────────────
const REGIONS = [
  "Dar es Salaam","Dodoma","Arusha","Mwanza","Tanga","Morogoro",
  "Pwani","Lindi","Mara","Mbeya","Ruvuma","Iringa","Kagera",
  "Kigoma","Kilimanjaro","Rukwa","Shinyanga","Singida","Tabora",
  "Mtwara","Zanzibar","Pemba","Njombe","Simiyu","Geita","Katavi",
  "Songwe","Kaskazini Unguja","Kusini Unguja"
];

// ─── Food Prices ──────────────────────────────────────────────
const PRICES = {
  "Dar es Salaam": { mchele:3200,dagaa:10000,maharage:2500,mchicha:500,kuku:10000,samaki:15000,mayai:500,viazi:1200,chips:2000,ndizi_1:300,unga:1500,tambi:2500,karanga:3000,maziwa:2000,chapati:500,maandazi_1:300 },
  "Mwanza": { mchele:3000,dagaa:10000,maharage:2200,mchicha:300,kuku:8000,samaki_tilapia:15000,mayai:500,viazi:1000,chips:1500,ndizi_1:300,unga:1500,tambi:2200,karanga:2500,maziwa:2000,chapati:500,maandazi:300 },
  "Arusha": { mchele:3200,dagaa:10000,maharage:2800,mchicha:400,kuku:9500,samaki_tilapia:15000,mayai:500,viazi:1500,chips:2500,ndizi_1:300,unga:1500,tambi:2800,karanga:3500,maziwa:1800,chapati:500,maandazi:300 },
  "Dodoma": { mchele:3000,dagaa:10000,maharage:2500,mchicha:500,kuku:10000,samaki_tilapia:15000,mayai:500,viazi:1100,chips:2000,ndizi_1:300,unga:1500,tambi:2300,karanga:2800,maziwa:2000,chapati:500,maandazi:300 },
};
const DEFAULT_PRICES = PRICES["Dar es Salaam"];
const getPrices = (r) => PRICES[r] || DEFAULT_PRICES;

// ─── Tips ─────────────────────────────────────────────────────
const TIPS_SW = [
  "Dagaa ina calcium mara 10 zaidi ya maziwa! 🦴 Kikombe 1 kinatoa calcium yote unayohitaji kwa siku nzima.",
  "Unapopika mchicha, chemsha dakika 3 tu. Kupika zaidi kunapoteza vitamin C hadi 50%! 🥬",
  "Papai moja lina vitamin C mara 3 zaidi ya machungwa. Bei nafuu, lishe nyingi! 🍈",
  "Kunywa glasi ya maji kabla ya kula kunasaidia kuhisi kushiba haraka. 💧",
  "Karanga zina protini nyingi kama nyama — gramu 100 = protini gramu 26! 🥜",
  "Vitamini D inapatikana BURE — jua la asubuhi dakika 20-30 kabla ya saa 10! ☀️",
  "Mchicha una iron mara 3 zaidi ukiliwa na vitamin C (machungwa/nyanya). 🍊",
  "Ndizi mbivu moja inatoa nishati ya haraka na potassium muhimu kwa moyo. 🍌",
];
const TIPS_EN = [
  "Dagaa has 10x more calcium than milk! 🦴 1 cup provides all your daily calcium needs.",
  "When cooking mchicha, boil only 3 minutes. Cooking longer destroys up to 50% of vitamin C! 🥬",
  "One papaya has 3x more vitamin C than an orange. Affordable and very nutritious! 🍈",
  "Drinking a glass of water before eating helps you feel full faster. 💧",
  "Groundnuts have as much protein as meat — 100g = 26g protein! 🥜",
  "Vitamin D is FREE — morning sun for 20-30 minutes before 10am! ☀️",
  "Mchicha has 3x more iron when eaten with vitamin C (orange/tomato). 🍊",
  "One ripe banana provides quick energy and potassium important for the heart. 🍌",
];

// ─── Groups ───────────────────────────────────────────────────
const GROUPS = {
  pregnant: { icon:"🤰", title_sw:"Wajawazito", title_en:"Pregnant Women", color: C.primary,
    ask_sw:"Nipe mpango wa chakula wa leo kwa mama mjamzito, bajeti ya wastani. Format fupi na tables.",
    ask_en:"Give me today's meal plan for a pregnant woman, average budget. Short format with tables.",
    tips_sw:["Iron: Dagaa vijiko 4 + mchicha vikombe 1.5 kila siku. Kula na machungwa!","Calcium: Maziwa vikombe 2 + dagaa kila siku kwa mfupa wa mtoto.","Folate: Mchicha vikombe 2 + maharage kikombe 1 kila siku.","Kalori: Unahitaji +300 kalori zaidi kwa siku = 2,100-2,300 kcal jumla."],
    tips_en:["Iron: 4 tbsp dagaa + 1.5 cups mchicha daily. Always with orange!","Calcium: 2 cups milk + dagaa daily for baby's bones.","Folate: 2 cups mchicha + 1 cup beans daily.","Calories: Need +300 more daily = 2,100-2,300 kcal total."] },
  children: { icon:"👶", title_sw:"Watoto 0-12", title_en:"Children 0-12", color:"#9C27B0",
    ask_sw:"Mtoto wangu ana miaka 3 anaonekana mwembamba. Nipe mpango wa chakula na kalori.",
    ask_en:"My child is 3 years old and looks thin. Give me a meal plan with calories.",
    tips_sw:["Miezi 0-6: Maziwa ya mama PEKE YAKE. Hakuna maji wala uji.","Vitamin A: Papai + viazi vitamu + mchicha kila siku. Kuzuia upofu.","Miaka 1-3: Ugali 120g + maharage + mboga. Mlo mara 5/siku.","Iron: Dagaa vijiko 3 + maharage kila siku + vitamin C kila wakati."],
    tips_en:["Months 0-6: Breastmilk ONLY. No water or porridge.","Vitamin A: Papaya + sweet potato + mchicha daily. Prevents blindness.","Age 1-3: Ugali 120g + beans + vegetables. 5 meals per day.","Iron: 3 tbsp dagaa + beans daily + vitamin C always."] },
  diabetes: { icon:"🩸", title_sw:"Kisukari", title_en:"Diabetes", color:"#E53935",
    ask_sw:"Nina kisukari. Nipe mpango wa chakula wa leo na kalori, vyakula vya Tanzania, bajeti TZS 5,000.",
    ask_en:"I have diabetes. Give me today's meal plan with calories, Tanzanian foods, budget TZS 5,000.",
    tips_sw:["Punguza ugali hadi 150g tu (GI 70). Bora: ugali wa mtama (GI 55).","Chips = kalori 400! Badilisha na viazi vya kuchemsha (kalori 87 tu).","Mboga vikombe 2 kwa kila mlo — kabichi, mchicha, bamia, bilinganya.","Epuka soda na juisi — sukari nyingi sana. Maji au chai bila sukari."],
    tips_en:["Reduce ugali to 150g only (GI 70). Better: sorghum ugali (GI 55).","Chips = 400 calories! Replace with boiled potato (only 87 cal).","2 cups vegetables per meal — cabbage, mchicha, okra, eggplant.","Avoid soda and juice — too much sugar. Water or unsweetened tea."] },
  hiv: { icon:"💊", title_sw:"VVU/UKIMWI", title_en:"HIV/AIDS", color:"#1565C0",
    ask_sw:"Ninaishi na VVU. Nipe mpango wa chakula na kalori na kiasi cha kutosha.",
    ask_en:"I am living with HIV. Give me a meal plan with adequate calories and quantities.",
    tips_sw:["Unahitaji kalori 10% zaidi: mwanaume 2,400-2,700/siku.","Protini kila mlo: mayai 2-3 + maharage + dagaa kila siku.","Vitamin C: Machungwa 2 au guava 1 kila siku kwa kinga.","Milo midogo mara 5-6 ikiwa hamu ya kula ni ndogo."],
    tips_en:["You need 10% more calories: men 2,400-2,700/day.","Protein every meal: 2-3 eggs + beans + dagaa daily.","Vitamin C: 2 oranges or 1 guava daily for immunity.","Small meals 5-6 times if appetite is low."] },
  hypertension: { icon:"❤️", title_sw:"Shinikizo la Damu", title_en:"Hypertension", color:"#C62828",
    ask_sw:"Nina shinikizo la damu. Nipe mpango wa chakula na kalori, vyakula vya Tanzania.",
    ask_en:"I have high blood pressure. Give me a meal plan with calories, Tanzanian foods.",
    tips_sw:["Chumvi chini ya gramu 5/siku — kijiko 1 tu kwa siku nzima!","Ndizi 1-2 + viazi vitamu + maharage kikombe 1 kila siku (potassium).","Epuka chips na vyakula vya kukaanga — mafuta mengi = shinikizo zaidi.","Punguza uzito ikiwa una uzito mkubwa — inasaidia sana!"],
    tips_en:["Less than 5g salt/day — just 1 teaspoon for the whole day!","1-2 bananas + sweet potato + 1 cup beans daily (potassium).","Avoid chips and fried foods — too much fat = more pressure.","Lose weight if overweight — it helps a lot!"] },
  elderly: { icon:"👴", title_sw:"Wazee 60+", title_en:"Elderly 60+", color:"#6D4C41",
    ask_sw:"Nina miaka 65. Nipe mpango wa chakula na kalori na kiasi, vyakula vya Tanzania.",
    ask_en:"I am 65 years old. Give me a meal plan with calories and portions, Tanzanian foods.",
    tips_sw:["Protini gramu 1.0-1.2/kg uzito kuzuia misuli kupotea.","Calcium: Maziwa vikombe 2 + dagaa kila siku kwa mifupa.","Vyakula laini ikiwa meno ni tatizo: uji, viazi, supu, mayai.","Maji vikombe 6-8/siku — wazee hawahisi kiu hata wakiwa na kiu!"],
    tips_en:["Protein 1.0-1.2g/kg body weight to prevent muscle loss.","Calcium: 2 cups milk + dagaa daily for bones.","Soft foods if teeth are a problem: porridge, potatoes, soup, eggs.","6-8 cups water/day — elderly don't feel thirst even when thirsty!"] },
  malaria: { icon:"🌡️", title_sw:"Kupona Malaria", title_en:"Malaria Recovery", color:"#00838F",
    ask_sw:"Ninapona malaria. Nipe mpango wa chakula na kalori kusaidia damu na nguvu.",
    ask_en:"I am recovering from malaria. Give me a meal plan with calories to rebuild blood and energy.",
    tips_sw:["Iron: Dagaa + mchicha + maharage kila siku. Kila wakati na machungwa!","Unahitaji kalori 10-15% zaidi wakati wa kupona.","Maji lita 3/siku — malaria inachoshesha mwili sana.","Mlo mara 5-6 hata kama huna hamu — mwili unahitaji nishati."],
    tips_en:["Iron: Dagaa + mchicha + beans daily. Always with orange!","You need 10-15% more calories during recovery.","3 liters water/day — malaria dehydrates the body severely.","Eat 5-6 times even without appetite — body needs energy."] },
  obesity: { icon:"⚖️", title_sw:"Kupunguza Uzito", title_en:"Weight Loss", color:"#558B2F",
    ask_sw:"Nataka kupunguza uzito. Nipe mpango wa chakula wa kalori chache lakini wa kujaza.",
    ask_en:"I want to lose weight. Give me a low calorie but filling meal plan.",
    tips_sw:["Punguza kalori 300-500 tu kwa siku — haraka sana kunaweza kudhuru.","Jaza nusu ya sahani na mboga (30-50 kcal/kikombe tu).","Maji glasi 2 dakika 30 kabla ya kila mlo — hupunguza kalori 13%.","Epuka chips (400 kcal) na soda (130 kcal) — zinajaza bila lishe."],
    tips_en:["Reduce only 300-500 calories per day — too fast can be harmful.","Fill half your plate with vegetables (only 30-50 kcal/cup).","2 glasses water 30 minutes before each meal — reduces intake 13%.","Avoid chips (400 kcal) and soda (130 kcal) — empty calories."] },
};

// ─── Suggestions by profile ───────────────────────────────────
const getSuggestions = (user, lang) => {
  const sw = lang === "sw";
  const region = user?.region || "Dar es Salaam";
  const health = user?.health || "Mzima/Sina tatizo";
  const budget = user?.budget?.split("(")[0] || "TZS 5,000";
  return [
    { icon:"📅", label: sw?"Leo":"Today", text: sw?`Nipe mpango wa chakula wa leo — ${health}, bajeti ${budget}, ${region}`:`Give me today's meal plan — ${health}, budget ${budget}, ${region}` },
    { icon:"📆", label: sw?"Wiki":"Weekly", text: sw?`Nipe mpango wa wiki mzima — ${health}, ${region}`:`Give me a full week meal plan — ${health}, ${region}` },
    { icon:"🛒", label: sw?"Soko":"Market", text: sw?`Orodha ya kununua sokoni kwa wiki — ${region} na bei za sasa`:`Shopping list for the week — ${region} with current prices` },
    { icon:"🔍", label: sw?"Tafuta":"Search", text: sw?"Niambie kalori na lishe ya dagaa — kiasi na bei":"Tell me calories and nutrition of dagaa — portions and prices" },
    { icon:"💧", label: sw?"Maji":"Water", text: sw?"Umuhimu wa maji kwa mwili na dalili za upungufu wa maji":"Importance of water for the body and signs of dehydration" },
    { icon:"⚖️", label: sw?"Uzito":"Weight", text: sw?`Nataka kupunguza uzito kwa vyakula vya ${region}, nipe mpango`:`I want to lose weight using ${region} foods, give me a plan` },
  ];
};

// ─── Build System Prompt ──────────────────────────────────────
function buildPrompt(user, prices, lang) {
  const sw = lang === "sw";
  const p = prices || DEFAULT_PRICES;
  return `You are NutriAdvisor AI — a warm, knowledgeable nutrition advisor for Tanzania. ${sw ? "Jibu kwa Kiswahili." : "Reply in English."}

CRITICAL FORMAT RULES:
1. SHORT compact format — no long paragraphs ever
2. Every meal: name + small table (kalori/bei/kiasi)
3. NEVER suggest ugali for breakfast
4. Chips maximum 2x per week
5. Always include calories for every food
6. Breakfast ONLY: mkate/chapati/maandazi/tambi/uji/oatmeal + chai + tunda
7. Vary foods — never repeat same staple two days running

MEAL FORMAT:
**🌅 ${sw?"Asubuhi":"Breakfast"}**
[Food name]
| | |
|---|---|
| 🔥 ${sw?"Kalori":"Calories"} | X kcal |
| 💰 ${sw?"Bei":"Price"} | TZS X |
| ⚖️ ${sw?"Kiasi":"Portion"} | [amounts] |

END EVERY PLAN WITH summary table:
| ${sw?"Mlo":"Meal"} | ${sw?"Kalori":"Calories"} | ${sw?"Bei":"Price"} |
showing totals and budget remaining.

REGIONAL PRICES (${user?.region || "Dar es Salaam"}):
Mchele: TZS ${p.mchele}/kg | Dagaa: TZS ${p.dagaa}/kg | Maharage: TZS ${p.maharage}/kg
Mchicha: TZS ${p.mchicha}/mfungu | Kuku: TZS ${p.kuku}/kg | Samaki: TZS ${p.samaki}/kg
Mayai: TZS ${p.mayai}/yai | Viazi: TZS ${p.viazi}/kg | Chips: TZS ${p.chips}/sehemu
Chapati: TZS ${p.chapati} | Maandazi: TZS ${p.maandazi} | Tambi: TZS ${p.tambi}/kg

CALORIES:
Ugali 200g=220kcal|Wali¾cup=170kcal|Chips150g=400kcal|Tambi150g=220kcal
Viazi3pcs=130kcal|Dagaa4tbsp=80kcal|Samaki100g=120kcal|Kuku100g=165kcal
Maharage1cup=230kcal|Mayai2=140kcal|Mchicha1cup=40kcal|Kabichi1cup=35kcal
Ndizi1=90kcal|Papai150g=60kcal|Machungwa1=60kcal|Maandazi1=150kcal|Chapati1=200kcal

USER: ${user?.firstName||"Mtumiaji"} | ${user?.region||"Tanzania"} | ${user?.health||"Mzima"} | ${user?.budget||"Wastani"} | Age: ${user?.age||"?"} | Goal: ${user?.goal||"Afya nzuri"}
Dislikes: ${user?.dislikes?.join(",")||"None"} | Preferences: ${user?.preferences?.join(",")||"None"}

${sw?"Malizia ushauri wa kimatibabu na: Wasiliana na daktari kwa ushauri zaidi.":"End medical advice with: Consult a doctor for more advice."}`;
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
        <div key={`t${i}`} style={{ overflowX:"auto", margin:"8px 0", borderRadius:10, border:`1px solid ${C.borderMid}`, boxShadow:C.shadow }}>
          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
            <thead><tr>{rows[0]?.trim().slice(1,-1).split("|").map((c,j)=>(
              <th key={j} style={{ background:C.primary, color:"#fff", padding:"7px 10px", textAlign:"left", fontWeight:600, fontSize:12, whiteSpace:"nowrap" }}>{c.trim()}</th>
            ))}</tr></thead>
            <tbody>{rows.slice(1).map((row,ri)=>(
              <tr key={ri} style={{ background:ri%2===0?C.primaryBg:"#fff" }}>
                {row.trim().slice(1,-1).split("|").map((c,ci)=>(
                  <td key={ci} style={{ padding:"7px 10px", borderBottom:`1px solid ${C.border}`, color:C.textMid, fontSize:13 }}>{c.trim()}</td>
                ))}
              </tr>
            ))}</tbody>
          </table>
        </div>
      );
      continue;
    }
    if (line.startsWith("## ")) els.push(<div key={i} style={{ fontWeight:700, color:C.primary, fontSize:14, marginTop:14, marginBottom:3 }}>{line.slice(3)}</div>);
    else if (line.startsWith("### ")) els.push(<div key={i} style={{ fontWeight:700, color:C.accent, fontSize:13, marginTop:10, marginBottom:2 }}>{line.slice(4)}</div>);
    else if (line.startsWith("**") && line.endsWith("**")) els.push(<div key={i} style={{ fontWeight:700, color:C.text, marginTop:6, marginBottom:2 }}>{line.replace(/\*\*/g,"")}</div>);
    else if (line.match(/\*\*(.+?)\*\*/)) els.push(<div key={i} style={{ lineHeight:1.7, fontSize:13 }} dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.+?)\*\*/g,"<strong>$1</strong>") }}/>);
    else if (line.startsWith("- ")||line.startsWith("• ")) els.push(<div key={i} style={{ paddingLeft:14, position:"relative", marginBottom:3, lineHeight:1.6, fontSize:13 }}><span style={{ position:"absolute", left:2, color:C.primary }}>•</span>{line.slice(2)}</div>);
    else if (/^\d+\./.test(line)) els.push(<div key={i} style={{ paddingLeft:16, marginBottom:3, lineHeight:1.6, fontSize:13 }}>{line}</div>);
    else if (line.trim()==="") els.push(<div key={i} style={{ height:5 }}/>);
    else els.push(<div key={i} style={{ lineHeight:1.75, fontSize:13 }}>{line}</div>);
    i++;
  }
  return <>{els}</>;
}

// ═══════════════════════════════════════════════════════════════
// MAIN APP
// ═══════════════════════════════════════════════════════════════
export default function App() {
  const [screen, setScreen] = useState("lang"); // lang|splash|auth|onboard|welcome|main
  const [lang, setLang] = useState("sw");
  const [authTab, setAuthTab] = useState("signup");
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [onboardStep, setOnboardStep] = useState(1);
  const [mainTab, setMainTab] = useState("home");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedMsg, setExpandedMsg] = useState(null);
  const [todayTip, setTodayTip] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [adminUsers, setAdminUsers] = useState([]);

  // Form state
  const [form, setForm] = useState({ firstName:"", lastName:"", age:"", gender:"", region:"Dar es Salaam", health:"Mzima/Sina tatizo", budget:"Wastani (TZS 5,000-20,000/siku)", goal:"Afya nzuri na nguvu", activity:"Wastani", dislikes:[], preferences:[] });
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [siEmail, setSiEmail] = useState("");
  const [siPass, setSiPass] = useState("");

  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const sw = lang === "sw";

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);
        const snap = await getDoc(doc(db, "users", u.uid));
        if (snap.exists()) {
          const data = snap.data();
          setProfile(data);
          setLang(data.language || "sw");
          const tips = data.language === "en" ? TIPS_EN : TIPS_SW;
          setTodayTip(tips[Math.floor(Math.random() * tips.length)]);
          setScreen("welcome");
        } else {
          setScreen("onboard");
        }
      } else {
        setUser(null); setProfile(null); setScreen("lang");
      }
    });
    return unsub;
  }, []);
// Handle redirect result
import("firebase/auth").then(({ getRedirectResult }) => {
  getRedirectResult(auth).catch(console.error);
});
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:"smooth" }); }, [messages, loading]);

  const saveProfile = async (uid, data) => {
    await setDoc(doc(db, "users", uid), { ...data, updatedAt: new Date().toISOString() });
  };

  const logActivity = async (type, detail) => {
    try {
      await addDoc(collection(db, "activity"), {
        type, detail, uid: user?.uid||"anon",
        name: profile?.firstName||"?", region: profile?.region||"?",
        time: new Date().toISOString(),
      });
    } catch(e) {}
  };

  const handleGoogle = async () => {
    setAuthLoading(true); setAuthError("");
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const u = result.user;
      const snap = await getDoc(doc(db, "users", u.uid));
      if (!snap.exists()) {
        setForm(f => ({ ...f, firstName: u.displayName?.split(" ")[0]||"", lastName: u.displayName?.split(" ").slice(1).join(" ")||"" }));
        setScreen("onboard");
      }
    } catch(e) { setAuthError(sw?"Imeshindwa kuingia na Google.":"Failed to sign in with Google."); }
    setAuthLoading(false);
  };

  const handleSignup = async () => {
    if (!email||!pass) return setAuthError(sw?"Jaza barua pepe na nywila.":"Fill email and password.");
    if (pass.length < 6) return setAuthError(sw?"Nywila iwe na herufi 6+.":"Password must be 6+ characters.");
    setAuthLoading(true); setAuthError("");
    try { await createUserWithEmailAndPassword(auth, email, pass); }
    catch(e) { setAuthError(e.code==="auth/email-already-in-use" ? (sw?"Barua pepe tayari imetumika.":"Email already in use.") : (sw?"Imeshindwa. Jaribu tena.":"Failed. Try again.")); }
    setAuthLoading(false);
  };

  const handleSignin = async () => {
    if (!siEmail||!siPass) return setAuthError(sw?"Jaza barua pepe na nywila.":"Fill email and password.");
    setAuthLoading(true); setAuthError("");
    try { await signInWithEmailAndPassword(auth, siEmail, siPass); }
    catch(e) { setAuthError(sw?"Barua pepe au nywila si sahihi.":"Email or password incorrect."); }
    setAuthLoading(false);
  };

  const handleOnboard = async () => {
    if (!form.firstName) return;
    setAuthLoading(true);
    try {
      const data = { ...form, language: lang, email: user?.email||"", joinedAt: new Date().toISOString() };
      await saveProfile(user.uid, data);
      setProfile(data);
      const tips = lang === "en" ? TIPS_EN : TIPS_SW;
      setTodayTip(tips[Math.floor(Math.random() * tips.length)]);
      await logActivity("signup", `${form.firstName} — ${form.region} — ${form.health}`);
      setScreen("welcome");
    } catch(e) {}
    setAuthLoading(false);
  };

  const handleSignOut = async () => {
    if (window.confirm(sw?`Toka kwenye akaunti ya ${profile?.firstName}?`:`Sign out of ${profile?.firstName}'s account?`))
      await signOut(auth);
  };

  const sendMessage = async (text) => {
    const msg = (text || input).trim();
    if (!msg || loading) return;
    if (msg.toLowerCase() === "admin123") {
      setInput("");
      const snap = await getDocs(collection(db, "users"));
      setAdminUsers(snap.docs.map(d => d.data()));
      setShowAdmin(true); return;
    }
    setInput("");
    const updated = [...messages, { role:"user", content:msg }];
    setMessages(updated);
    setLoading(true);
    await logActivity("question", msg.slice(0,100));
    const prices = getPrices(profile?.region);
    const systemPrompt = buildPrompt(profile, prices, lang);
    try {
      const res = await fetch("/.netlify/functions/chat", {
        method:"POST",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ messages: updated.slice(-6), systemPrompt }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setMessages([...updated, { role:"assistant", content: data.reply }]);
      if (user) {
        await addDoc(collection(db, "users", user.uid, "chats"), {
          q: msg, a: data.reply, time: new Date().toISOString()
        });
      }
    } catch(e) {
      setMessages([...updated, { role:"assistant", content:`⚠️ ${e.message}` }]);
    } finally { setLoading(false); }
  };

  const getGreeting = () => {
    const h = new Date().getHours();
    const name = profile?.firstName || (sw?"Rafiki":"Friend");
    if (sw) return h<12?`Habari za asubuhi, ${name}! ☀️`:h<17?`Habari za mchana, ${name}! 🌤️`:`Habari za jioni, ${name}! 🌙`;
    return h<12?`Good morning, ${name}! ☀️`:h<17?`Good afternoon, ${name}! 🌤️`:`Good evening, ${name}! 🌙`;
  };

  // ── Global styles ─────────────────────────────────────────
  const G = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
    *{box-sizing:border-box;margin:0;padding:0;}
    body{font-family:'Plus Jakarta Sans',sans-serif;}
    @keyframes fadeUp{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:translateY(0)}}
    @keyframes fadeIn{from{opacity:0}to{opacity:1}}
    @keyframes blink{0%,100%{opacity:.2;transform:scale(.8)}50%{opacity:1;transform:scale(1.1)}}
    @keyframes pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
    @keyframes slideUp{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
    ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:${C.primaryBorder};border-radius:4px}
    input:focus,select:focus,textarea:focus{outline:none;border-color:${C.primary}!important;box-shadow:0 0 0 3px rgba(232,98,26,0.12)!important;}
    textarea::placeholder,input::placeholder{color:${C.textFaint};}
    .btn-primary{background:linear-gradient(135deg,${C.primary},${C.primaryDark});color:#fff;border:none;border-radius:14px;padding:14px 20px;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:700;cursor:pointer;width:100%;transition:all .2s;box-shadow:0 4px 20px rgba(232,98,26,0.3);}
    .btn-primary:hover{transform:translateY(-1px);box-shadow:0 8px 28px rgba(232,98,26,0.4);}
    .btn-secondary{background:${C.bgCard};color:${C.primary};border:2px solid ${C.primary};border-radius:14px;padding:13px 20px;font-family:'Plus Jakarta Sans',sans-serif;font-size:15px;font-weight:600;cursor:pointer;width:100%;transition:all .2s;}
    .btn-secondary:hover{background:${C.primaryBg};}
    .card{background:${C.bgCard};border-radius:16px;border:1px solid ${C.border};box-shadow:${C.shadow};}
    .sug:hover{border-color:${C.primary}!important;background:${C.primaryBg}!important;transform:translateY(-2px);}
    .gc:hover{transform:translateY(-3px);box-shadow:${C.shadowMd}!important;}
    .nbtn:hover{color:${C.primary}!important;}
    .sbtn:not(:disabled):hover{transform:scale(1.08);box-shadow:0 6px 20px rgba(232,98,26,0.4)!important;}
    .chip:hover{background:${C.primaryBg}!important;border-color:${C.primary}!important;}
  `;

  // ────────────────────────────────────────────────────────────
  // SCREEN: LANGUAGE SELECTOR
  // ────────────────────────────────────────────────────────────
  if (screen === "lang") return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg, #1A0800 0%, #3D1000 50%, #1A0500 100%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:28, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <style>{G}</style>
      <div style={{ width:"100%", maxWidth:360, animation:"slideUp .7s ease" }}>
        {/* App name */}
        <div style={{ textAlign:"center", marginBottom:40 }}>
          <div style={{ fontSize:64, marginBottom:16, animation:"pulse 2s ease infinite" }}>🌅</div>
          <div style={{ fontSize:32, fontWeight:800, color:"#fff", marginBottom:6 }}>NutriAdvisor AI</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)", fontStyle:"italic" }}>Smart Nutrition. Better You.</div>
        </div>

        {/* Language question */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:18, fontWeight:700, color:"rgba(255,255,255,0.9)", marginBottom:6 }}>Choose your language</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)" }}>Chagua lugha yako / Select your language</div>
        </div>

        {/* Language options */}
        <div style={{ display:"flex", flexDirection:"column", gap:14, marginBottom:32 }}>
          {[
            { code:"sw", flag:"🇹🇿", name:"Kiswahili", sub:"Lugha ya Tanzania" },
            { code:"en", flag:"🇬🇧", name:"English", sub:"International language" },
          ].map(l => (
            <button key={l.code} onClick={() => { setLang(l.code); }} style={{ display:"flex", alignItems:"center", gap:16, padding:"18px 20px", borderRadius:16, border:`2px solid ${lang===l.code?C.primary:"rgba(255,255,255,0.1)"}`, background:lang===l.code?"rgba(232,98,26,0.2)":"rgba(255,255,255,0.05)", cursor:"pointer", transition:"all .2s", textAlign:"left" }}>
              <span style={{ fontSize:36 }}>{l.flag}</span>
              <div>
                <div style={{ fontSize:17, fontWeight:700, color:"#fff" }}>{l.name}</div>
                <div style={{ fontSize:13, color:"rgba(255,255,255,0.5)" }}>{l.sub}</div>
              </div>
              {lang===l.code && <div style={{ marginLeft:"auto", width:24, height:24, borderRadius:"50%", background:C.primary, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontSize:14, fontWeight:700 }}>✓</div>}
            </button>
          ))}
        </div>

        <button className="btn-primary" onClick={() => setScreen("splash")} style={{ fontSize:17 }}>
          {lang==="sw" ? "Endelea →" : "Continue →"}
        </button>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────
  // SCREEN: SPLASH
  // ────────────────────────────────────────────────────────────
  if (screen === "splash") return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg, #1A0800 0%, #3D1000 50%, #1A0500 100%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"space-between", padding:"40px 24px 36px", fontFamily:"'Plus Jakarta Sans',sans-serif", overflowY:"auto" }}>
      <style>{G}</style>
      <div style={{ width:"100%", maxWidth:360 }}>
        {/* Logo area */}
        <div style={{ textAlign:"center", marginBottom:36, animation:"slideUp .6s ease" }}>
          <div style={{ width:90, height:90, borderRadius:24, background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:44, margin:"0 auto 18px", boxShadow:`0 8px 32px rgba(232,98,26,0.5)`, animation:"pulse 3s ease infinite" }}>🌅</div>
          <div style={{ fontSize:30, fontWeight:800, color:"#fff", marginBottom:4 }}>NutriAdvisor AI</div>
          <div style={{ fontSize:13, color:"rgba(255,255,255,0.45)", fontStyle:"italic" }}>Smart Nutrition. Better You. 🇹🇿</div>
        </div>

        {/* Feature cards */}
        <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:36 }}>
          {[
            { icon:"🤖", t: sw?"AI Mshauri wa Lishe":"AI Nutrition Advisor", d: sw?"Maswali yoyote — Kiswahili au Kiingereza":"Any questions — Swahili or English" },
            { icon:"📊", t: sw?"Kalori za Kila Chakula":"Every Food's Calories", d: sw?"Data halisi kutoka TFNC Tanzania":"Real data from TFNC Tanzania" },
            { icon:"🛒", t: sw?"Bei za Soko Lako":"Your Local Market Prices", d: sw?"Makoa 29 ya Tanzania":"All 29 Tanzania regions" },
            { icon:"💰", t: sw?"Bajeti Yoyote":"Any Budget", d: sw?"TZS 1,000 hadi 20,000+ kwa siku":"TZS 1,000 to 20,000+ per day" },
          ].map((f,i) => (
            <div key={i} style={{ display:"flex", gap:14, alignItems:"center", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:14, padding:"14px 16px", animation:`slideUp ${.6+i*.1}s ease` }}>
              <span style={{ fontSize:24, flexShrink:0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize:14, fontWeight:700, color:C.primaryLight, marginBottom:2 }}>{f.t}</div>
                <div style={{ fontSize:12, color:"rgba(255,255,255,0.5)" }}>{f.d}</div>
              </div>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={() => setScreen("auth")} style={{ marginBottom:14, fontSize:16 }}>
          {sw?"Anza Sasa — Bila Malipo →":"Start Now — Free →"}
        </button>
        <p style={{ textAlign:"center", fontSize:13, color:"rgba(255,255,255,0.35)" }}>
          {sw?"Una akaunti?":"Have an account?"}{" "}
          <span style={{ color:C.primaryLight, cursor:"pointer", fontWeight:600 }} onClick={() => { setAuthTab("signin"); setScreen("auth"); }}>
            {sw?"Ingia hapa":"Sign in here"}
          </span>
        </p>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────
  // SCREEN: AUTH
  // ────────────────────────────────────────────────────────────
  if (screen === "auth") return (
    <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", padding:"24px 20px", fontFamily:"'Plus Jakarta Sans',sans-serif", overflowY:"auto" }}>
      <style>{G}</style>
      <div style={{ width:"100%", maxWidth:380, animation:"fadeUp .4s ease" }}>
        {/* Header */}
        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:28 }}>
          <button onClick={() => setScreen("splash")} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.textMuted }}>←</button>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:C.text }}>{sw?"Karibu!":"Welcome!"}</div>
            <div style={{ fontSize:13, color:C.textMuted }}>{authTab==="signup"?(sw?"Fungua akaunti ya bure":"Create free account"):(sw?"Ingia kwenye akaunti":"Sign into your account")}</div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6, background:C.primaryBg, borderRadius:14, padding:5, marginBottom:22, border:`1px solid ${C.border}` }}>
          {[["signup", sw?"📝 Jisajili":"📝 Sign Up"], ["signin", sw?"🔑 Ingia":"🔑 Sign In"]].map(([t,l]) => (
            <button key={t} onClick={() => { setAuthTab(t); setAuthError(""); }} style={{ padding:"10px", border:"none", borderRadius:11, fontFamily:"'Plus Jakarta Sans',sans-serif", fontSize:13, cursor:"pointer", transition:"all .2s", background:authTab===t?C.bgCard:"transparent", color:authTab===t?C.primary:C.textMuted, fontWeight:authTab===t?700:500, boxShadow:authTab===t?C.shadow:"none" }}>{l}</button>
          ))}
        </div>

        <div className="card" style={{ padding:"22px 20px" }}>
          {authError && <div style={{ background:C.secondaryBg, border:`1px solid ${C.secondary}`, borderRadius:10, padding:"10px 14px", fontSize:13, color:C.secondary, marginBottom:16, fontWeight:500 }}>⚠️ {authError}</div>}

          {/* Google */}
          <button onClick={handleGoogle} disabled={authLoading} style={{ width:"100%", padding:"13px", border:`1.5px solid ${C.border}`, borderRadius:12, background:C.bgCard, color:C.text, fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:10, marginBottom:18, fontWeight:600, transition:"all .2s" }}>
            <span style={{ fontSize:20 }}>G</span> {sw?"Ingia na Google":"Continue with Google"}
          </button>

          <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
            <div style={{ flex:1, height:1, background:C.border }}/>
            <span style={{ fontSize:12, color:C.textFaint }}>{sw?"au":"or"}</span>
            <div style={{ flex:1, height:1, background:C.border }}/>
          </div>

          {authTab === "signup" ? (
            <>
              {[
                [sw?"Barua pepe *":"Email *", email, setEmail, "email", "mfano@gmail.com"],
                [sw?"Nywila * (herufi 6+)":"Password * (6+ chars)", pass, setPass, "password", "••••••••"],
              ].map(([l,v,set,t,p]) => (
                <div key={l} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, color:C.textMid, fontWeight:600, marginBottom:5 }}>{l}</div>
                  <input type={t} value={v} onChange={e=>set(e.target.value)} placeholder={p} onKeyDown={e=>e.key==="Enter"&&handleSignup()} style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, fontFamily:"inherit" }}/>
                </div>
              ))}
              <button className="btn-primary" onClick={handleSignup} disabled={authLoading} style={{ marginTop:4 }}>
                {authLoading?(sw?"Inasajili...":"Signing up..."):(sw?"Fungua Akaunti →":"Create Account →")}
              </button>
              <p style={{ textAlign:"center", fontSize:13, color:C.textMuted, marginTop:14 }}>
                {sw?"Una akaunti?":"Have an account?"}{" "}<span style={{ color:C.primary, cursor:"pointer", fontWeight:700 }} onClick={()=>setAuthTab("signin")}>{sw?"Ingia":"Sign in"}</span>
              </p>
            </>
          ) : (
            <>
              {[
                [sw?"Barua pepe":"Email", siEmail, setSiEmail, "email", "mfano@gmail.com"],
                [sw?"Nywila":"Password", siPass, setSiPass, "password", "••••••••"],
              ].map(([l,v,set,t,p]) => (
                <div key={l} style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, color:C.textMid, fontWeight:600, marginBottom:5 }}>{l}</div>
                  <input type={t} value={v} onChange={e=>set(e.target.value)} placeholder={p} onKeyDown={e=>e.key==="Enter"&&handleSignin()} style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, fontFamily:"inherit" }}/>
                </div>
              ))}
              <button className="btn-primary" onClick={handleSignin} disabled={authLoading} style={{ marginTop:4 }}>
                {authLoading?(sw?"Inaingia...":"Signing in..."):(sw?"Ingia →":"Sign In →")}
              </button>
              <p style={{ textAlign:"center", fontSize:13, color:C.textMuted, marginTop:14 }}>
                {sw?"Huna akaunti?":"No account?"}{" "}<span style={{ color:C.primary, cursor:"pointer", fontWeight:700 }} onClick={()=>setAuthTab("signup")}>{sw?"Jisajili bure":"Sign up free"}</span>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────
  // SCREEN: ONBOARDING
  // ────────────────────────────────────────────────────────────
  if (screen === "onboard") {
    const F = ({ label, value, onChange, type="text", placeholder }) => (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, color:C.textMid, fontWeight:600, marginBottom:5 }}>{label}</div>
        <input type={type} value={value} onChange={onChange} placeholder={placeholder} style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif" }}/>
      </div>
    );
    const S = ({ label, value, onChange, options }) => (
      <div style={{ marginBottom:14 }}>
        <div style={{ fontSize:12, color:C.textMid, fontWeight:600, marginBottom:5 }}>{label}</div>
        <select value={value} onChange={onChange} style={{ width:"100%", padding:"12px 14px", borderRadius:10, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
          {options.map(o=><option key={o.v||o} value={o.v||o}>{o.l||o}</option>)}
        </select>
      </div>
    );

    return (
      <div style={{ minHeight:"100vh", background:C.bg, display:"flex", flexDirection:"column", alignItems:"center", padding:"20px 20px", fontFamily:"'Plus Jakarta Sans',sans-serif", overflowY:"auto" }}>
        <style>{G}</style>
        <div style={{ width:"100%", maxWidth:380, animation:"fadeUp .4s ease" }}>
          {/* Progress bar */}
          <div style={{ marginBottom:22 }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:8 }}>
              {[1,2,3].map(n=>(
                <div key={n} style={{ display:"flex", alignItems:"center", gap:6 }}>
                  <div style={{ width:28, height:28, borderRadius:"50%", background:onboardStep>=n?C.primary:C.border, color:onboardStep>=n?"#fff":C.textFaint, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700 }}>{onboardStep>n?"✓":n}</div>
                  <span style={{ fontSize:11, color:onboardStep>=n?C.primary:C.textFaint, fontWeight:600 }}>{n===1?(sw?"Habari":"Info"):n===2?(sw?"Afya":"Health"):(sw?"Malengo":"Goals")}</span>
                </div>
              ))}
            </div>
            <div style={{ height:4, background:C.border, borderRadius:4 }}>
              <div style={{ height:"100%", width:`${((onboardStep-1)/2)*100}%`, background:C.primary, borderRadius:4, transition:"width .4s" }}/>
            </div>
          </div>

          <div className="card" style={{ padding:"22px 20px" }}>
            {onboardStep === 1 && (
              <>
                <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:4 }}>{sw?"Habari! Niambie kuhusu wewe 👋":"Hello! Tell me about you 👋"}</div>
                <p style={{ fontSize:12, color:C.textMuted, marginBottom:18 }}>{sw?"Hii inasaidia kupata ushauri unaokufaa":"This helps get advice that fits you"}</p>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <F label={sw?"Jina la Kwanza *":"First Name *"} value={form.firstName} onChange={e=>setForm({...form,firstName:e.target.value})} placeholder={sw?"Jina lako":"Your name"}/>
                  <F label={sw?"Jina la Mwisho":"Last Name"} value={form.lastName} onChange={e=>setForm({...form,lastName:e.target.value})} placeholder={sw?"Ukoo":"Family"}/>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                  <F label={sw?"Umri":"Age"} value={form.age} onChange={e=>setForm({...form,age:e.target.value})} type="number" placeholder="25"/>
                  <S label={sw?"Jinsia":"Gender"} value={form.gender} onChange={e=>setForm({...form,gender:e.target.value})} options={[{v:"",l:sw?"Chagua...":"Select..."},{v:"Mwanamke",l:sw?"Mwanamke":"Female"},{v:"Mwanaume",l:sw?"Mwanaume":"Male"},{v:"Nyingine",l:sw?"Ningependa nisijulikane":"Prefer not to say"}]}/>
                </div>
                <S label={sw?"Mkoa":"Region"} value={form.region} onChange={e=>setForm({...form,region:e.target.value})} options={REGIONS}/>
                <button className="btn-primary" onClick={()=>form.firstName&&setOnboardStep(2)}>{sw?"Endelea →":"Continue →"}</button>
              </>
            )}
            {onboardStep === 2 && (
              <>
                <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:4 }}>{sw?"Hali yako ya Kiafya 🏥":"Your Health Status 🏥"}</div>
                <p style={{ fontSize:12, color:C.textMuted, marginBottom:18 }}>{sw?"Taarifa hii inabaki salama — inasaidia AI kukupa ushauri sahihi":"This stays private — helps AI give you accurate advice"}</p>
                <S label={sw?"Hali ya Kiafya":"Health Condition"} value={form.health} onChange={e=>setForm({...form,health:e.target.value})} options={["Mzima/Sina tatizo","Kisukari","Shinikizo la damu","VVU/UKIMWI","Mjamzito","Mnyonyeshaji","Upungufu wa damu","Tatizo lingine"]}/>
                <S label={sw?"Bajeti ya Chakula":"Food Budget"} value={form.budget} onChange={e=>setForm({...form,budget:e.target.value})} options={[{v:"Chini (TZS 1,000-5,000/siku)",l:"🟢 Chini — TZS 1,000-5,000/siku"},{v:"Wastani (TZS 5,000-20,000/siku)",l:"🟡 Wastani — TZS 5,000-20,000/siku"},{v:"Juu (TZS 20,000+/siku)",l:"🔴 Juu — TZS 20,000+/siku"}]}/>
                <S label={sw?"Shughuli za Mwili":"Physical Activity"} value={form.activity} onChange={e=>setForm({...form,activity:e.target.value})} options={[{v:"Chini sana",l:sw?"🪑 Nakaa sana":"🪑 Very sedentary"},{v:"Wastani",l:sw?"🚶 Natembea kidogo":"🚶 Light activity"},{v:"Hai",l:sw?"🏃 Mazoezi mara 3/wiki":"🏃 Exercise 3x/week"},{v:"Hai sana",l:sw?"💪 Mazoezi kila siku":"💪 Daily exercise"}]}/>
                <div style={{ display:"flex", gap:10 }}>
                  <button className="btn-secondary" onClick={()=>setOnboardStep(1)} style={{ flex:1 }}>{sw?"← Rudi":"← Back"}</button>
                  <button className="btn-primary" onClick={()=>setOnboardStep(3)} style={{ flex:2 }}>{sw?"Endelea →":"Continue →"}</button>
                </div>
              </>
            )}
            {onboardStep === 3 && (
              <>
                <div style={{ fontSize:20, fontWeight:800, color:C.text, marginBottom:4 }}>{sw?"Malengo na Mapendeleo 🎯":"Goals & Preferences 🎯"}</div>
                <p style={{ fontSize:12, color:C.textMuted, marginBottom:18 }}>{sw?"Hii inasaidia AI kupanga chakula kinachokufaa":"This helps AI plan food that fits you"}</p>
                <S label={sw?"Lengo lako kuu":"Your main goal"} value={form.goal} onChange={e=>setForm({...form,goal:e.target.value})} options={[sw?"Afya nzuri na nguvu":"Good health and energy",sw?"Kupunguza uzito":"Lose weight",sw?"Kuongeza uzito/misuli":"Gain weight/muscle",sw?"Kudhibiti kisukari":"Manage diabetes",sw?"Kudhibiti shinikizo":"Manage blood pressure",sw?"Nguvu zaidi":"More energy",sw?"Lishe bora kwa familia":"Better family nutrition"]}/>
                <div style={{ marginBottom:14 }}>
                  <div style={{ fontSize:12, color:C.textMid, fontWeight:600, marginBottom:8 }}>{sw?"Vyakula usivyopenda (optional)":"Foods you dislike (optional)"}</div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:6 }}>
                    {["Ugali wa mtama","Dagaa","Maharage","Samaki","Maziwa","Mayai","Mchicha","Nyama"].map(f=>(
                      <label key={f} style={{ display:"flex", alignItems:"center", gap:7, fontSize:13, color:C.textMid, cursor:"pointer", padding:"6px 10px", borderRadius:8, background:form.dislikes.includes(f)?C.secondaryBg:C.bg, border:`1px solid ${form.dislikes.includes(f)?C.secondary:C.border}`, transition:"all .2s" }}>
                        <input type="checkbox" checked={form.dislikes.includes(f)} onChange={e=>setForm({...form,dislikes:e.target.checked?[...form.dislikes,f]:form.dislikes.filter(d=>d!==f)})} style={{ accentColor:C.primary }}/>
                        {f}
                      </label>
                    ))}
                  </div>
                </div>
                <div style={{ display:"flex", gap:10 }}>
                  <button className="btn-secondary" onClick={()=>setOnboardStep(2)} style={{ flex:1 }}>{sw?"← Rudi":"← Back"}</button>
                  <button className="btn-primary" onClick={handleOnboard} disabled={authLoading} style={{ flex:2 }}>
                    {authLoading?(sw?"Inahifadhi...":"Saving..."):(sw?"✅ Maliza →":"✅ Finish →")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ────────────────────────────────────────────────────────────
  // SCREEN: WELCOME
  // ────────────────────────────────────────────────────────────
  if (screen === "welcome") return (
    <div style={{ minHeight:"100vh", background:`linear-gradient(160deg, #1A0800 0%, #3D1000 60%, #1A0500 100%)`, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:24, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>
      <style>{G}</style>
      <div style={{ width:"100%", maxWidth:360, animation:"slideUp .6s ease" }}>
        {/* Greeting */}
        <div style={{ textAlign:"center", marginBottom:28 }}>
          <div style={{ fontSize:54, marginBottom:14 }}>🌅</div>
          <div style={{ fontSize:26, fontWeight:800, color:"#fff", marginBottom:6 }}>{getGreeting()}</div>
          <div style={{ fontSize:14, color:"rgba(255,255,255,0.5)" }}>{sw?"Karibu NutriAdvisor AI":"Welcome to NutriAdvisor AI"}</div>
        </div>

        {/* Tip of the day */}
        <div style={{ background:"rgba(232,98,26,0.15)", border:"1px solid rgba(232,98,26,0.3)", borderRadius:16, padding:"18px 20px", marginBottom:20 }}>
          <div style={{ fontSize:11, color:C.primaryLight, fontWeight:700, marginBottom:8, letterSpacing:1.5, textTransform:"uppercase" }}>
            💡 {sw?"Kidokezo cha Leo":"Tip of the Day"}
          </div>
          <p style={{ color:"rgba(255,255,255,0.85)", fontSize:14, lineHeight:1.7 }}>{todayTip}</p>
        </div>

        {/* Profile summary pills */}
        <div style={{ display:"flex", gap:8, marginBottom:28, flexWrap:"wrap", justifyContent:"center" }}>
          {[
            ["📍", profile?.region||"Tanzania"],
            ["🏥", (profile?.health||"Mzima").slice(0,15)],
            ["💰", profile?.budget?.includes("Chini")?"Bajeti Chini":profile?.budget?.includes("Juu")?"Bajeti Juu":"Wastani"],
          ].map(([ic,v],i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:5, background:"rgba(255,255,255,0.08)", borderRadius:20, padding:"6px 14px", border:"1px solid rgba(255,255,255,0.12)" }}>
              <span style={{ fontSize:14 }}>{ic}</span>
              <span style={{ fontSize:12, color:"rgba(255,255,255,0.7)", fontWeight:500 }}>{v}</span>
            </div>
          ))}
        </div>

        <button className="btn-primary" onClick={() => setScreen("main")} style={{ fontSize:16, padding:"16px" }}>
          {sw?"Anza Kupata Ushauri →":"Start Getting Advice →"}
        </button>
      </div>
    </div>
  );

  // ────────────────────────────────────────────────────────────
  // SCREEN: MAIN APP
  // ────────────────────────────────────────────────────────────
  const prices = getPrices(profile?.region);
  const suggestions = getSuggestions(profile, lang);

  return (
    <div style={{ height:"100vh", display:"flex", flexDirection:"column", background:C.bg, fontFamily:"'Plus Jakarta Sans',sans-serif", color:C.text }}>
      <style>{G}</style>

      {/* ── Header ── */}
      <div style={{ padding:"12px 16px", background:"rgba(255,255,255,0.97)", backdropFilter:"blur(16px)", borderBottom:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"space-between", flexShrink:0, boxShadow:`0 1px 12px rgba(232,98,26,0.06)` }}>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:38, height:38, borderRadius:10, background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20, boxShadow:`0 4px 12px rgba(232,98,26,0.3)` }}>🌅</div>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:C.text, lineHeight:1.2 }}>NutriAdvisor AI</div>
            <div style={{ fontSize:10, color:C.primary, fontWeight:600 }}>Smart Nutrition. Better You. 🇹🇿</div>
          </div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          {/* Region badge */}
          <div style={{ background:C.primaryBg, border:`1px solid ${C.primaryBorder}`, borderRadius:20, padding:"4px 10px", fontSize:11, color:C.primary, fontWeight:600 }}>📍 {profile?.region?.split(" ")[0]||"TZ"}</div>
          {/* Avatar */}
          <div onClick={handleSignOut} style={{ width:34, height:34, borderRadius:"50%", background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, cursor:"pointer", boxShadow:`0 2px 8px rgba(232,98,26,0.3)` }}>
            {profile?.firstName?.[0]?.toUpperCase()||"👤"}
          </div>
        </div>
      </div>

      {/* ── Content Area ── */}
      <div style={{ flex:1, overflow:"hidden", position:"relative" }}>

        {/* HOME TAB */}
        <div style={{ position:"absolute", inset:0, overflowY:"auto", display:mainTab==="home"?"block":"none", padding:"14px 14px 0" }}>

          {/* Welcome banner */}
          {messages.length === 0 && (
            <div style={{ background:`linear-gradient(135deg, ${C.primary}, ${C.primaryDark})`, borderRadius:16, padding:"16px 18px", marginBottom:14, animation:"fadeUp .4s ease", boxShadow:C.shadowMd }}>
              <div style={{ fontSize:15, fontWeight:700, color:"#fff", marginBottom:4 }}>{getGreeting()} 👋</div>
              <div style={{ fontSize:12, color:"rgba(255,255,255,0.75)", lineHeight:1.6 }}>
                {sw?`Nipo hapa kukusaidia na lishe — kwa hali yako ya ${profile?.health||"afya nzuri"} na bajeti yako.`:`I'm here to help with nutrition — for your ${profile?.health||"health"} and budget.`}
              </div>
            </div>
          )}

          {/* Suggestions grid */}
          {messages.length === 0 && (
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
              {suggestions.map((s,i) => (
                <button key={i} className="sug" onClick={() => sendMessage(s.text)} style={{ background:C.bgCard, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"13px 12px", cursor:"pointer", textAlign:"left", fontFamily:"inherit", display:"flex", alignItems:"flex-start", gap:9, boxShadow:C.shadow, transition:"all .2s", animation:`fadeUp ${.2+i*.06}s ease` }}>
                  <span style={{ fontSize:20, flexShrink:0 }}>{s.icon}</span>
                  <span>
                    <span style={{ fontSize:10, fontWeight:700, color:C.primary, display:"block", marginBottom:3, textTransform:"uppercase", letterSpacing:.5 }}>{s.label}</span>
                    <span style={{ fontSize:12, color:C.textMid, lineHeight:1.45 }}>{s.text.length>50?s.text.slice(0,50)+"…":s.text}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Admin Dashboard */}
          {showAdmin && (
            <div className="card" style={{ padding:16, marginBottom:14, animation:"fadeUp .3s ease" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
                <div style={{ fontSize:16, fontWeight:800 }}>📊 Admin Dashboard</div>
                <button onClick={()=>setShowAdmin(false)} style={{ background:"none", border:"none", color:C.textFaint, cursor:"pointer", fontSize:20 }}>✕</button>
              </div>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                {[
                  { bg:`linear-gradient(135deg,${C.primary},${C.primaryDark})`, v:adminUsers.length, l:sw?"Watumiaji":"Users" },
                  { bg:`linear-gradient(135deg,${C.accent},#9a5f00)`, v:adminUsers.filter(u=>u.health!=="Mzima/Sina tatizo").length, l:sw?"Wana Hali":"Conditions" },
                  { bg:C.successBg, v:adminUsers.filter(u=>u.region==="Dar es Salaam").length, l:"DSM", tc:C.success },
                  { bg:C.primaryBg, v:adminUsers.filter(u=>u.language==="sw").length, l:"Swahili", tc:C.primary },
                ].map((s,i) => (
                  <div key={i} style={{ background:s.bg, borderRadius:12, padding:"12px 14px", textAlign:"center", border:s.tc?`1px solid ${s.tc}33`:undefined }}>
                    <div style={{ fontSize:22, fontWeight:800, color:s.tc||"#fff" }}>{s.v}</div>
                    <div style={{ fontSize:11, color:s.tc?C.textMuted:"rgba(255,255,255,0.8)", fontWeight:600 }}>{s.l}</div>
                  </div>
                ))}
              </div>
              {adminUsers.slice(-5).reverse().map((u,i) => (
                <div key={i} style={{ background:C.bg, borderRadius:10, padding:"9px 12px", marginBottom:6, border:`1px solid ${C.border}` }}>
                  <div style={{ display:"flex", justifyContent:"space-between" }}>
                    <strong style={{ fontSize:13 }}>{u.firstName} {u.lastName}</strong>
                    <span style={{ fontSize:10, color:C.textFaint }}>{u.region}</span>
                  </div>
                  <div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{u.health} · {u.budget?.split("(")[0]}</div>
                </div>
              ))}
            </div>
          )}

          {/* Messages — Claude style full width */}
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {messages.map((m,i) => (
              <div key={i} style={{ marginBottom:18, animation:"fadeUp .3s ease" }}>
                {/* Role header */}
                <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7, padding:"0 2px" }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:m.role==="user"?`linear-gradient(135deg,${C.accent},${C.primary})`:`linear-gradient(135deg,${C.primary},${C.primaryDark})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14, flexShrink:0 }}>
                    {m.role==="user"?(profile?.firstName?.[0]?.toUpperCase()||"👤"):"🌅"}
                  </div>
                  <span style={{ fontSize:13, fontWeight:700, color:m.role==="user"?C.accent:C.primary }}>
                    {m.role==="user"?(profile?.firstName||sw?"Wewe":"You"):"NutriAdvisor AI"}
                  </span>
                </div>
                {/* Bubble */}
                <div style={{ marginLeft:36, padding:"13px 15px", borderRadius:"4px 16px 16px 16px", background:m.role==="user"?C.primaryBg:C.bgCard, border:`1px solid ${m.role==="user"?C.primaryBorder:C.border}`, boxShadow:C.shadow }}>
                  {m.role==="assistant"?<FormatMsg text={m.content}/>:<div style={{ fontSize:14, lineHeight:1.7 }}>{m.content}</div>}
                </div>
                {/* Expand button for AI */}
                {m.role==="assistant" && (
                  <div style={{ marginLeft:36, marginTop:7 }}>
                    <button onClick={()=>setExpandedMsg(expandedMsg===i?null:i)} style={{ background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, color:C.primary, fontSize:12, cursor:"pointer", fontFamily:"inherit", padding:"5px 12px", fontWeight:600, display:"flex", alignItems:"center", gap:4 }}>
                      {expandedMsg===i?(sw?"▲ Funga":"▲ Close"):(sw?"▼ Mwongozo wa Soko + Vidokezo":"▼ Market Guide + Tips")}
                    </button>
                    {expandedMsg===i && (
                      <div style={{ marginTop:10, background:C.primaryBg, border:`1px solid ${C.primaryBorder}`, borderRadius:14, padding:14, animation:"fadeUp .3s ease" }}>
                        {/* Shopping guide */}
                        <div style={{ fontWeight:700, color:C.primary, fontSize:13, marginBottom:10 }}>🛒 {sw?`Mwongozo wa Kununua — ${profile?.region}`:`Shopping Guide — ${profile?.region}`}</div>
                        <div style={{ overflowX:"auto", marginBottom:14, borderRadius:10, border:`1px solid ${C.borderMid}` }}>
                          <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12 }}>
                            <thead><tr>{[sw?"Chakula":"Food",sw?"Kwa Mlo":"Per Meal",sw?"Unakuwa Unanunua":"You Buy",sw?"Bei ya Soko":"Market Price"].map((h,j)=>(
                              <th key={j} style={{ background:C.primary, color:"#fff", padding:"7px 10px", textAlign:"left", whiteSpace:"nowrap", fontWeight:700 }}>{h}</th>
                            ))}</tr></thead>
                            <tbody>
                              {[
                                ["Mchele","Kikombe 1 (200g)",`1kg=vikombe 6 | TZS ${prices.mchele?.toLocaleString()}/kg`,`TZS ${Math.round((prices.mchele||2000)/6).toLocaleString()}/kk`],
                                ["Dagaa","Vijiko 4 (35g)",`1kg=vijiko 28 | TZS ${prices.dagaa?.toLocaleString()}/kg`,`TZS ${Math.round((prices.dagaa||4000)/28).toLocaleString()}/vijiko4`],
                                ["Maharage","Kikombe 1 (150g)",`1kg=vikombe 5 | TZS ${prices.maharage?.toLocaleString()}/kg`,`TZS ${Math.round((prices.maharage||2500)/5).toLocaleString()}/kk`],
                                ["Mchicha","Kikombe 1 kupikwa",`Mfungu 1=vikombe 3 | TZS ${prices.mchicha?.toLocaleString()}`,`TZS ${Math.round((prices.mchicha||300)/3).toLocaleString()}/kk`],
                                ["Mayai","Mayai 2",`Tray 30=TZS ${((prices.mayai||300)*30).toLocaleString()}`,`TZS ${prices.mayai?.toLocaleString()}/yai`],
                                ["Kuku","Gramu 120",`1kg=sehemu 4 | TZS ${prices.kuku?.toLocaleString()}/kg`,`TZS ${Math.round((prices.kuku||9000)/4).toLocaleString()}/sehemu`],
                              ].map((row,ri) => (
                                <tr key={ri} style={{ background:ri%2===0?C.primaryBg:"#fff" }}>
                                  {row.map((cell,ci) => <td key={ci} style={{ padding:"6px 10px", borderBottom:`1px solid ${C.border}`, color:C.textMid, fontSize:12 }}>{cell}</td>)}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        {/* Shopping tips */}
                        <div style={{ fontWeight:700, color:C.accent, fontSize:13, marginBottom:8 }}>💡 {sw?"Vidokezo vya Ununuzi":"Shopping Tips"}</div>
                        {[
                          sw?`🏪 Soko bora: ${profile?.region==="Dar es Salaam"?"Soko la Tandale (mboga), Bandari ya Msasani (samaki)":"Soko kuu la wilaya yako"}`:`🏪 Best market: ${profile?.region==="Dar es Salaam"?"Tandale market (vegs), Msasani harbor (fish)":"Your local main market"}`,
                          sw?"⏰ Wakati bora: Asubuhi 7-9am kwa mboga safi. Jioni 5-7pm bei zinashuka.":"⏰ Best time: Morning 7-9am for fresh vegetables. Evening 5-7pm prices drop.",
                          sw?"🛍️ Okoa pesa: Nunua kwa wingi — maharage 2kg, mchele 5kg, unga 3kg.":"🛍️ Save money: Buy in bulk — beans 2kg, rice 5kg, flour 3kg.",
                        ].map((tip,ti) => (
                          <div key={ti} style={{ fontSize:12, color:C.textMid, lineHeight:1.6, marginBottom:6, padding:"6px 10px", background:"rgba(232,98,26,0.06)", borderRadius:8, borderLeft:`3px solid ${C.primaryLight}` }}>{tip}</div>
                        ))}
                        <div style={{ fontSize:11, color:C.textFaint, marginTop:10, textAlign:"center" }}>
                          📍 {profile?.region} — {new Date().toLocaleDateString(sw?"sw-TZ":"en-US",{month:"long",year:"numeric"})}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Loading */}
          {loading && (
            <div style={{ marginBottom:18, animation:"fadeUp .3s ease" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:7 }}>
                <div style={{ width:28, height:28, borderRadius:8, background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>🌅</div>
                <span style={{ fontSize:13, fontWeight:700, color:C.primary }}>NutriAdvisor AI</span>
              </div>
              <div style={{ marginLeft:36, padding:"13px 18px", background:C.bgCard, border:`1px solid ${C.border}`, borderRadius:"4px 16px 16px 16px", boxShadow:C.shadow, display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ fontSize:13, color:C.textMuted }}>{sw?"Ninafikiri…":"Thinking…"}</span>
                {[0,1,2].map(d=><div key={d} style={{ width:7, height:7, borderRadius:"50%", background:C.primary, animation:`blink 1.2s ease-in-out ${d*.2}s infinite` }}/>)}
              </div>
            </div>
          )}
          <div ref={bottomRef} style={{ height:14 }}/>
        </div>

        {/* MEAL PLAN TAB */}
        <div style={{ position:"absolute", inset:0, overflowY:"auto", display:mainTab==="mealplan"?"block":"none", padding:"14px 14px" }}>
          <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>{sw?"📅 Mpango wa Chakula":"📅 Meal Planner"}</div>
          <p style={{ color:C.textMuted, fontSize:12, marginBottom:18 }}>{sw?"Bonyeza chaguo lolote kupata mpango wako binafsi":"Tap any option to generate your personal plan"}</p>

          {/* Quick buttons */}
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:18 }}>
            {[
              { icon:"🌅", label:sw?"Leo tu":"Just Today", text:sw?`Nipe mpango wa chakula wa leo — ${profile?.health}, bajeti ${profile?.budget?.split("(")[0]}, ${profile?.region}`:`Give me today's meal plan — ${profile?.health}, budget ${profile?.budget?.split("(")[0]}, ${profile?.region}` },
              { icon:"📆", label:sw?"Wiki Nzima":"Full Week", text:sw?`Nipe mpango wa wiki mzima 7 siku — ${profile?.health}, ${profile?.region}`:`Give me a full 7-day plan — ${profile?.health}, ${profile?.region}` },
              { icon:"👨‍👩‍👧", label:sw?"Familia ya 4":"Family of 4", text:sw?`Mpango wa wiki kwa familia ya watu 4 — ${profile?.region}, bajeti ${profile?.budget?.split("(")[0]}`:`Week plan for family of 4 — ${profile?.region}, budget ${profile?.budget?.split("(")[0]}` },
              { icon:"💰", label:sw?"Bajeti Ndogo":"Tight Budget", text:sw?`Mpango wa wiki kwa bajeti ndogo TZS 3,000/siku — ${profile?.region}`:`Week plan for very tight budget TZS 3,000/day — ${profile?.region}` },
            ].map((b,i) => (
              <button key={i} className="gc" onClick={()=>{ sendMessage(b.text); setMainTab("home"); }} style={{ background:C.bgCard, border:`1.5px solid ${C.border}`, borderRadius:14, padding:"16px 12px", cursor:"pointer", textAlign:"center", boxShadow:C.shadow, transition:"all .2s", fontFamily:"inherit" }}>
                <div style={{ fontSize:30, marginBottom:7 }}>{b.icon}</div>
                <div style={{ fontSize:13, fontWeight:700, color:C.text }}>{b.label}</div>
              </button>
            ))}
          </div>

          {/* Budget cards */}
          {[
            { e:"🟢", t:sw?"Bajeti Chini":"Low Budget", sub:"TZS 1,000-5,000/siku", p:sw?"Ugali/muhogo + dagaa + maharage + mchicha. Familia ya 4 ~ kalori 1,800/siku.":"Ugali/cassava + dagaa + beans + mchicha. Family of 4 ~1,800 kcal/day.", c:"~1,800 kcal" },
            { e:"🟡", t:sw?"Bajeti Wastani":"Average Budget", sub:"TZS 5,000-20,000/siku", p:sw?"Wali/tambi + samaki mara 3/wiki + kuku mara 2/wiki + mboga + chips mara 2/wiki.":"Rice/pasta + fish 3x/week + chicken 2x/week + vegs + chips 2x/week.", c:"~2,000 kcal" },
            { e:"🔴", t:sw?"Bajeti Kubwa":"High Budget", sub:"TZS 20,000+/siku", p:sw?"Pilau + nyama + samaki bora + matunda mbalimbali + maziwa + supplements.":"Pilau + meat + premium fish + varied fruits + milk + supplements.", c:"~2,200 kcal" },
          ].map((c,i) => (
            <div key={i} className="card" style={{ padding:"14px 16px", marginBottom:10 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:5 }}>
                <div style={{ fontSize:14, fontWeight:700, color:C.primary }}>{c.e} {c.t}</div>
                <span style={{ fontSize:11, background:C.primaryBg, color:C.primary, padding:"4px 10px", borderRadius:20, fontWeight:700 }}>{c.c}</span>
              </div>
              <div style={{ fontSize:11, color:C.textFaint, fontWeight:600, marginBottom:4 }}>{c.sub}</div>
              <div style={{ fontSize:12.5, color:C.textMuted, lineHeight:1.65 }}>{c.p}</div>
            </div>
          ))}
        </div>

        {/* GROUPS TAB */}
        <div style={{ position:"absolute", inset:0, overflowY:"auto", display:mainTab==="groups"?"block":"none", padding:"14px 14px" }}>
          {!selectedGroup ? (
            <>
              <div style={{ fontSize:22, fontWeight:800, marginBottom:4 }}>{sw?"👥 Vikundi vya Lishe":"👥 Nutrition Groups"}</div>
              <p style={{ color:C.textMuted, fontSize:12, marginBottom:16 }}>{sw?"Bonyeza kikundi kupata ushauri na kalori maalum":"Tap a group for specialized advice with calories"}</p>
              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
                {Object.entries(GROUPS).map(([k,g]) => (
                  <div key={k} className="gc card" onClick={()=>{ setSelectedGroup(k); logActivity("group_view",g.title_sw); }} style={{ padding:"16px 12px", cursor:"pointer", textAlign:"center", transition:"all .2s" }}>
                    <div style={{ fontSize:30, marginBottom:8 }}>{g.icon}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:C.text, marginBottom:3 }}>{sw?g.title_sw:g.title_en}</div>
                    <div style={{ width:30, height:3, background:g.color||C.primary, borderRadius:3, margin:"0 auto" }}/>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ animation:"fadeUp .3s ease" }}>
              <button onClick={()=>setSelectedGroup(null)} style={{ background:"transparent", border:`1.5px solid ${C.border}`, borderRadius:10, padding:"7px 14px", color:C.textMuted, fontSize:13, fontFamily:"inherit", cursor:"pointer", marginBottom:16, fontWeight:600, display:"flex", alignItems:"center", gap:5 }}>← {sw?"Rudi":"Back"}</button>
              {(() => {
                const g = GROUPS[selectedGroup];
                const tips = sw?g.tips_sw:g.tips_en;
                return (
                  <>
                    <div style={{ textAlign:"center", padding:"10px 0 18px" }}>
                      <div style={{ fontSize:48, marginBottom:10 }}>{g.icon}</div>
                      <div style={{ fontSize:22, fontWeight:800, marginBottom:6 }}>{sw?g.title_sw:g.title_en}</div>
                      <button onClick={()=>{ sendMessage(sw?g.ask_sw:g.ask_en); setMainTab("home"); }} style={{ display:"inline-flex", alignItems:"center", gap:8, padding:"13px 24px", background:`linear-gradient(135deg,${C.primary},${C.primaryDark})`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontFamily:"inherit", fontWeight:700, cursor:"pointer", boxShadow:`0 4px 16px rgba(232,98,26,0.35)`, marginBottom:18, transition:"all .2s" }}>
                        🤖 {sw?`Uliza AI Kuhusu ${g.title_sw} →`:`Ask AI About ${g.title_en} →`}
                      </button>
                    </div>
                    {tips.map((t,i) => (
                      <div key={i} style={{ background:C.bgCard, borderLeft:`4px solid ${g.color||C.primary}`, borderRadius:"0 14px 14px 0", padding:"13px 15px", marginBottom:10, boxShadow:C.shadow }}>
                        <div style={{ fontSize:13, color:g.color||C.primary, fontWeight:700, marginBottom:4 }}>
                          {i===0?"💊":i===1?"🥗":i===2?"📊":"💡"} {sw?"Kidokezo":"Tip"} {i+1}
                        </div>
                        <div style={{ fontSize:13, color:C.textMid, lineHeight:1.65 }}>{t}</div>
                      </div>
                    ))}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>

      {/* ── Input Bar ── */}
      {mainTab === "home" && (
        <div style={{ padding:"10px 14px 8px", borderTop:`1px solid ${C.border}`, background:"rgba(255,255,255,0.97)", backdropFilter:"blur(16px)", flexShrink:0 }}>
          <div style={{ display:"flex", gap:9, alignItems:"flex-end", maxWidth:720, margin:"0 auto" }}>
            <textarea ref={inputRef} value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();sendMessage();}}} placeholder={sw?"Uliza swali lako kuhusu lishe, kalori, au chakula…":"Ask about nutrition, calories, or any food…"} rows={1} style={{ flex:1, padding:"12px 16px", borderRadius:22, border:`1.5px solid ${C.border}`, background:C.bg, color:C.text, fontSize:14, fontFamily:"inherit", resize:"none", maxHeight:90, overflowY:"auto", lineHeight:1.5, transition:"all .2s" }}/>
            <button className="sbtn" onClick={()=>sendMessage()} disabled={loading||!input.trim()} style={{ width:44, height:44, borderRadius:"50%", border:"none", flexShrink:0, background:loading||!input.trim()?C.border:`linear-gradient(135deg,${C.primary},${C.primaryDark})`, color:loading||!input.trim()?C.textFaint:"#fff", fontSize:18, cursor:loading||!input.trim()?"not-allowed":"pointer", display:"flex", alignItems:"center", justifyContent:"center", transition:"all .22s", boxShadow:loading||!input.trim()?"none":`0 4px 14px rgba(232,98,26,0.4)` }}>↑</button>
          </div>
          <p style={{ color:C.textFaint, fontSize:10, marginTop:6, textAlign:"center" }}>{sw?"Ushauri wa elimu tu · Wasiliana na daktari kwa dharura 🏥":"Educational advice only · Contact a doctor for emergencies 🏥"}</p>
        </div>
      )}

      {/* ── Bottom Nav ── */}
      <div style={{ background:"rgba(255,255,255,0.97)", borderTop:`1px solid ${C.border}`, display:"flex", flexShrink:0, boxShadow:`0 -2px 12px rgba(232,98,26,0.06)` }}>
        {[
          ["home","🏠",sw?"Nyumbani":"Home"],
          ["mealplan","📅",sw?"Mpango":"Meal Plan"],
          ["groups","👥",sw?"Vikundi":"Groups"]
        ].map(([tab,icon,label]) => (
          <button key={tab} className="nbtn" onClick={()=>{ setMainTab(tab); if(tab!=="groups")setSelectedGroup(null); }} style={{ flex:1, padding:"10px 4px 8px", border:"none", background:"transparent", cursor:"pointer", display:"flex", flexDirection:"column", alignItems:"center", gap:3, fontFamily:"inherit", fontSize:10, color:mainTab===tab?C.primary:C.textMuted, transition:"color .2s", fontWeight:mainTab===tab?700:500 }}>
            <span style={{ fontSize:20 }}>{icon}</span>
            {label}
            {mainTab===tab && <div style={{ width:20, height:3, background:C.primary, borderRadius:2, marginTop:1 }}/>}
          </button>
        ))}
      </div>
    </div>
  );
}
