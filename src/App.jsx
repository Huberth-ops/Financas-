import { useState, useEffect, useMemo } from "react";
import { db } from "./firebase";
import { doc, setDoc, onSnapshot } from "firebase/firestore";

const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

const INITIAL_EXPENSES = [
  { id: "1", name: "CARTÃO", value: 2672, paid: false },
  { id: "2", name: "ADIANTAMENTO", value: 2000, paid: false },
  { id: "3", name: "AÇOUGUE E FEIRA", value: 2000, paid: false },
  { id: "4", name: "MACEDO", value: 1000, paid: false },
  { id: "5", name: "CARRO", value: 850, paid: false },
  { id: "6", name: "EMPRÉSTIMO EMP. 9/18", value: 500, paid: false },
  { id: "7", name: "FARMÁCIA", value: 400, paid: false },
  { id: "8", name: "CELULAR 7/10", value: 351, paid: false },
  { id: "9", name: "GASOLINA", value: 300, paid: false },
  { id: "10", name: "ÁGUA/GÁS ELZA", value: 270, paid: false },
  { id: "11", name: "LUZ", value: 231.58, paid: false },
  { id: "12", name: "ÁGUA", value: 188.95, paid: false },
  { id: "13", name: "CARTÃO C6", value: 130, paid: false },
  { id: "14", name: "INTERNET", value: 100, paid: false },
  { id: "15", name: "VIVO", value: 100, paid: false },
  { id: "16", name: "TAXA MEI", value: 86.05, paid: false },
  { id: "17", name: "CABELO", value: 80, paid: false },
  { id: "18", name: "ÓLEO MOTO", value: 41, paid: false },
  { id: "19", name: "BATERIA CELULAR 5/10", value: 26, paid: false },
];

const fmt = (v) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const now = new Date();
const CUR_YEAR = now.getFullYear();
const CUR_MONTH = now.getMonth();
function monthKey(y, m) { return `${y}-${String(m).padStart(2,"0")}`; }

export default function App() {
  const [selYear, setSelYear] = useState(CUR_YEAR);
  const [selMonth, setSelMonth] = useState(CUR_MONTH);
  const [tab, setTab] = useState("contas");
  const [monthData, setMonthData] = useState(null);
  const [allMonths, setAllMonths] = useState({});
  const [goals, setGoals] = useState([]);
  const [settings, setSettings] = useState({ familyName: "Família Silva", name1: "Huberth", name2: "Vanessa" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [showCopy, setShowCopy] = useState(false);
  const [copySource, setCopySource] = useState("");

  // Income
  const [newIncomeName, setNewIncomeName] = useState("");
  const [newIncomeValue, setNewIncomeValue] = useState("");
  const [showAddIncome, setShowAddIncome] = useState(false);

  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [editGoalId, setEditGoalId] = useState(null);

  const [editingSettings, setEditingSettings] = useState(false);
  const [settingsDraft, setSettingsDraft] = useState({});

  const key = monthKey(selYear, selMonth);

  // Load current month
  useEffect(() => {
    setLoading(true);
    const ref = doc(db, "months", key);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setMonthData(snap.data());
      } else {
        const isApril2025 = selYear === 2025 && selMonth === 3;
        setMonthData({ salary: isApril2025 ? 11400 : 0, expenses: isApril2025 ? INITIAL_EXPENSES : [] });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [key]);

  // Load ALL months for annual summary
  useEffect(() => {
    const unsubList = [];
    for (let m = 0; m < 12; m++) {
      const k = monthKey(selYear, m);
      const ref = doc(db, "months", k);
      const unsub = onSnapshot(ref, (snap) => {
        setAllMonths(prev => ({ ...prev, [k]: snap.exists() ? snap.data() : null }));
      });
      unsubList.push(unsub);
    }
    // Also watch 2025 data
    if (selYear !== 2025) {
      const k = monthKey(2025, 3);
      const ref = doc(db, "months", k);
      const unsub = onSnapshot(ref, (snap) => {
        setAllMonths(prev => ({ ...prev, [k]: snap.exists() ? snap.data() : null }));
      });
      unsubList.push(unsub);
    }
    return () => unsubList.forEach(u => u());
  }, [selYear]);

  // Load goals
  useEffect(() => {
    const ref = doc(db, "settings", "goals");
    const unsub = onSnapshot(ref, (snap) => {
      setGoals(snap.exists() ? snap.data().list || [] : []);
    });
    return () => unsub();
  }, []);

  // Load settings
  useEffect(() => {
    const ref = doc(db, "settings", "app");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setSettings(snap.data());
    });
    return () => unsub();
  }, []);

  async function saveMonth(data) {
    setSaving(true);
    try { await setDoc(doc(db, "months", key), data); }
    finally { setSaving(false); }
  }
  async function saveGoals(list) { await setDoc(doc(db, "settings", "goals"), { list }); }
  async function saveSettings(s) { await setDoc(doc(db, "settings", "app"), s); }

  function togglePaid(id) {
    const updated = { ...monthData, expenses: monthData.expenses.map(e => e.id === id ? { ...e, paid: !e.paid } : e) };
    setMonthData(updated); saveMonth(updated);
  }
  function addIncome() {
    if (!newIncomeName.trim() || !newIncomeValue) return;
    const inc = { id: Date.now().toString(), name: newIncomeName.trim(), value: Number(newIncomeValue) };
    const incomes = [...(monthData.incomes || []), inc];
    const updated = { ...monthData, incomes, salary: incomes.reduce((s, i) => s + i.value, 0) };
    setMonthData(updated); saveMonth(updated);
    setNewIncomeName(""); setNewIncomeValue(""); setShowAddIncome(false);
  }
  function removeIncome(id) {
    const incomes = (monthData.incomes || []).filter(i => i.id !== id);
    const updated = { ...monthData, incomes, salary: incomes.reduce((s, i) => s + i.value, 0) };
    setMonthData(updated); saveMonth(updated);
  }
  function addExpense() {
    if (!newName.trim() || !newValue) return;
    const exp = { id: Date.now().toString(), name: newName.toUpperCase().trim(), value: Number(newValue), paid: false };
    const updated = { ...monthData, expenses: [...monthData.expenses, exp] };
    setMonthData(updated); saveMonth(updated);
    setNewName(""); setNewValue(""); setShowAdd(false);
  }
  function removeExpense(id) {
    const updated = { ...monthData, expenses: monthData.expenses.filter(e => e.id !== id) };
    setMonthData(updated); saveMonth(updated);
  }
  function copyFromMonth() {
    if (!copySource) return;
    const src = allMonths[copySource];
    if (!src) return;
    const expenses = src.expenses.map(e => ({ ...e, paid: false, id: Date.now().toString() + Math.random() }));
    const incomes = (src.incomes || []).map(i => ({ ...i, id: Date.now().toString() + Math.random() }));
    const salary = incomes.length > 0 ? incomes.reduce((s, i) => s + i.value, 0) : (src.salary || 0);
    const copied = { salary, incomes, expenses };
    setMonthData(copied); saveMonth(copied); setShowCopy(false);
  }

  function saveGoal() {
    if (!goalName.trim() || !goalTarget) return;
    let list;
    if (editGoalId) {
      list = goals.map(g => g.id === editGoalId ? { ...g, name: goalName, target: Number(goalTarget), saved: Number(goalSaved || 0) } : g);
    } else {
      list = [...goals, { id: Date.now().toString(), name: goalName, target: Number(goalTarget), saved: Number(goalSaved || 0) }];
    }
    setGoals(list); saveGoals(list);
    setGoalName(""); setGoalTarget(""); setGoalSaved(""); setShowGoalForm(false); setEditGoalId(null);
  }
  function deleteGoal(id) { const list = goals.filter(g => g.id !== id); setGoals(list); saveGoals(list); }
  function startEditGoal(g) { setEditGoalId(g.id); setGoalName(g.name); setGoalTarget(String(g.target)); setGoalSaved(String(g.saved || 0)); setShowGoalForm(true); }
  function updateGoalSaved(id, val) { const list = goals.map(g => g.id === id ? { ...g, saved: Number(val) } : g); setGoals(list); saveGoals(list); }

  function saveSettingsEdit() { saveSettings(settingsDraft); setSettings(settingsDraft); setEditingSettings(false); }

  const expenses = monthData?.expenses || [];
  const salary = Number(monthData?.salary || 0);
  const totalExp = expenses.reduce((s, e) => s + Number(e.value), 0);
  const totalPaid = expenses.filter(e => e.paid).reduce((s, e) => s + Number(e.value), 0);
  const totalPending = totalExp - totalPaid;
  const balance = salary - totalExp;
  const paidCount = expenses.filter(e => e.paid).length;

  const isRed = balance < 0;
  const isWarn = balance >= 0 && balance < 500;
  const statusColor = isRed ? "#e11d48" : isWarn ? "#d97706" : "#059669";
  const statusBg = isRed ? "#fff1f2" : isWarn ? "#fffbeb" : "#ecfdf5";
  const statusLabel = isRed ? "NO VERMELHO" : isWarn ? "ATENÇÃO" : "POSITIVO";
  const statusIcon = isRed ? "⚠️" : isWarn ? "⚡" : "✅";

  // Annual data
  const annualData = useMemo(() => {
    return MONTHS_SHORT.map((label, i) => {
      const k = monthKey(selYear, i);
      const d = allMonths[k];
      if (!d) return { label, salary: 0, expenses: 0, balance: 0, hasData: false };
      const sal = d.incomes?.length > 0 ? d.incomes.reduce((s, inc) => s + Number(inc.value), 0) : Number(d.salary || 0);
      if (!sal) return { label, salary: 0, expenses: 0, balance: 0, hasData: false };
      const exp = (d.expenses || []).reduce((s, e) => s + Number(e.value), 0);
      return { label, salary: sal, expenses: exp, balance: sal - exp, hasData: true };
    });
  }, [allMonths, selYear]);

  const annualTotals = useMemo(() => {
    const months = annualData.filter(d => d.hasData);
    return {
      totalReceita: months.reduce((s, d) => s + d.salary, 0),
      totalGasto: months.reduce((s, d) => s + d.expenses, 0),
      totalSaldo: months.reduce((s, d) => s + d.balance, 0),
      mesesPositivos: months.filter(d => d.balance >= 0).length,
      mesesNegativos: months.filter(d => d.balance < 0).length,
      mesesComDados: months.length,
    };
  }, [annualData]);

  // Available months to copy from
  const availableMonthsToCopy = useMemo(() => {
    return Object.entries(allMonths)
      .filter(([k, d]) => d && d.expenses && d.expenses.length > 0 && k !== key)
      .map(([k]) => {
        const [y, m] = k.split("-").map(Number);
        return { key: k, label: `${MONTHS_SHORT[m]}/${y}` };
      }).sort((a, b) => b.key.localeCompare(a.key));
  }, [allMonths, key]);

  const maxExpense = Math.max(...annualData.map(d => d.expenses), 1);

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#fafaf9",color:"#9ca3af",fontFamily:"'Instrument Sans',sans-serif",fontSize:14 }}>
      Carregando...
    </div>
  );

  return (
    <div style={{ background:"#f8f7f4", minHeight:"100vh", maxWidth:480, margin:"0 auto", paddingBottom:90, fontFamily:"'Instrument Sans', 'DM Sans', sans-serif", color:"#1c1917" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        ::-webkit-scrollbar { display:none; }
        input,select,button,textarea { font-family:'Instrument Sans','DM Sans',sans-serif; }

        .app-bg { background:#f8f7f4; }

        /* HEADER */
        .hdr { padding:32px 20px 0; }
        .hdr-family { font-family:'Playfair Display',serif; font-size:26px; font-weight:800; color:#1c1917; line-height:1.1; }
        .hdr-family span { color:#2563eb; }
        .hdr-sub { font-size:12px; color:#78716c; margin-top:3px; letter-spacing:.3px; }
        .edit-link { font-size:11px; color:#2563eb; cursor:pointer; text-decoration:underline; margin-left:8px; }

        /* STATUS BADGE */
        .status-pill { display:inline-flex; align-items:center; gap:5px; padding:5px 12px; border-radius:99px; font-size:11px; font-weight:700; letter-spacing:.8px; border:1.5px solid; }

        /* MONTHS */
        .month-scroll { display:flex; gap:6px; padding:16px 20px 0; overflow-x:auto; scrollbar-width:none; }
        .m-btn { flex-shrink:0; padding:6px 13px; border-radius:99px; border:1.5px solid #e7e5e4; background:#fff; color:#78716c; font-size:12px; font-weight:500; cursor:pointer; transition:all .15s; }
        .m-btn.active { background:#1c1917; border-color:#1c1917; color:#fff; font-weight:700; }
        .m-btn.has-data:not(.active) { border-color:#2563eb; color:#2563eb; }

        /* CARDS */
        .card { background:#fff; border:1.5px solid #e7e5e4; border-radius:20px; padding:20px; margin:12px 16px 0; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .card-title { font-size:10px; font-weight:700; color:#a8a29e; text-transform:uppercase; letter-spacing:1.8px; margin-bottom:14px; }

        /* BALANCE */
        .bal-amount { font-family:'Playfair Display',serif; font-size:40px; font-weight:800; line-height:1; }
        .bal-grid { display:grid; grid-template-columns:1fr 1fr 1fr; gap:0; margin-top:16px; padding-top:14px; border-top:1.5px solid #f5f5f4; }
        .bal-item { text-align:center; }
        .bal-item:not(:last-child) { border-right:1.5px solid #f5f5f4; }
        .bal-label { font-size:9px; color:#a8a29e; text-transform:uppercase; letter-spacing:1px; display:block; margin-bottom:4px; }
        .bal-val { font-size:14px; font-weight:700; }

        /* TABS */
        .tab-wrap { display:flex; background:#fff; border:1.5px solid #e7e5e4; border-radius:14px; margin:12px 16px 0; padding:4px; gap:4px; }
        .tab-btn { flex:1; padding:9px 4px; border:none; background:none; color:#78716c; font-size:12px; font-weight:600; cursor:pointer; border-radius:10px; transition:all .15s; font-family:'Instrument Sans',sans-serif; }
        .tab-btn.active { background:#1c1917; color:#fff; }

        /* EXPENSE LIST */
        .exp-row { display:flex; align-items:center; gap:10px; padding:11px 0; border-bottom:1.5px solid #f5f5f4; }
        .exp-row:last-child { border-bottom:none; }
        .check-box { width:22px; height:22px; border-radius:7px; border:2px solid #d6d3d1; background:none; cursor:pointer; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .15s; }
        .check-box.on { background:#059669; border-color:#059669; }
        .exp-name { flex:1; font-size:13px; font-weight:500; color:#1c1917; }
        .exp-name.done { color:#d6d3d1; text-decoration:line-through; }
        .exp-val { font-size:13px; font-weight:700; color:#e11d48; }
        .exp-val.done { color:#d6d3d1; }
        .del-x { background:none; border:none; color:#d6d3d1; cursor:pointer; font-size:14px; padding:2px 4px; transition:color .15s; }
        .del-x:hover { color:#e11d48; }

        /* PROGRESS */
        .prog-track { height:5px; background:#f5f5f4; border-radius:3px; overflow:hidden; }
        .prog-fill { height:100%; border-radius:3px; transition:width .4s; }

        /* INPUTS */
        .field { background:#fafaf9; border:1.5px solid #e7e5e4; color:#1c1917; padding:11px 14px; border-radius:12px; font-size:14px; width:100%; outline:none; transition:border-color .15s; }
        .field:focus { border-color:#2563eb; }
        .btn { padding:11px 18px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; border:none; font-family:'Instrument Sans',sans-serif; transition:all .15s; letter-spacing:.2px; }
        .btn-dark { background:#1c1917; color:#fff; }
        .btn-dark:hover { background:#292524; }
        .btn-green { background:#059669; color:#fff; }
        .btn-red { background:#e11d48; color:#fff; }
        .btn-ghost { background:none; border:1.5px solid #e7e5e4; color:#78716c; }
        .btn-ghost:hover { border-color:#1c1917; color:#1c1917; }
        .btn-sm { padding:7px 12px; font-size:12px; border-radius:9px; }
        .row { display:flex; gap:8px; }

        /* STATS */
        .stat-grid { display:grid; grid-template-columns:1fr 1fr; gap:10px; }
        .stat-box { background:#fafaf9; border:1.5px solid #f5f5f4; border-radius:14px; padding:14px; }
        .stat-lbl { font-size:9px; color:#a8a29e; text-transform:uppercase; letter-spacing:1.2px; display:block; margin-bottom:5px; }
        .stat-val { font-family:'Playfair Display',serif; font-size:19px; font-weight:700; }

        /* ANNUAL BARS */
        .bar-chart { display:flex; gap:6px; align-items:flex-end; height:100px; padding:0 4px; }
        .bar-col { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
        .bar-stack { width:100%; border-radius:4px 4px 0 0; transition:height .4s; }
        .bar-lbl { font-size:9px; color:#a8a29e; font-weight:500; }

        /* ANNUAL MONTH LIST */
        .ann-row { display:flex; align-items:center; justify-content:space-between; padding:10px 0; border-bottom:1.5px solid #f5f5f4; cursor:pointer; }
        .ann-row:last-child { border-bottom:none; }
        .ann-month { font-size:13px; font-weight:600; color:#1c1917; }
        .ann-sub { font-size:11px; color:#a8a29e; }
        .ann-bal { font-family:'Playfair Display',serif; font-size:15px; font-weight:700; }

        /* GOALS */
        .goal-card { background:#fafaf9; border:1.5px solid #e7e5e4; border-radius:14px; padding:14px; margin-bottom:10px; }

        /* NAV */
        .bot-nav { position:fixed; bottom:0; left:50%; transform:translateX(-50%); width:100%; max-width:480px; background:#fff; border-top:1.5px solid #e7e5e4; display:flex; z-index:100; padding-bottom:env(safe-area-inset-bottom,0); }
        .nav-btn { flex:1; padding:11px 4px 13px; border:none; background:none; color:#a8a29e; cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:3px; font-size:9px; font-weight:600; letter-spacing:.6px; text-transform:uppercase; transition:color .15s; font-family:'Instrument Sans',sans-serif; }
        .nav-btn.active { color:#1c1917; }
        .nav-icon { font-size:18px; line-height:1; }

        /* SAVING DOT */
        .dot { width:6px; height:6px; border-radius:50%; background:#2563eb; animation:blink 1s infinite; }
        @keyframes blink { 0%,100%{opacity:1}50%{opacity:.2} }

        /* SETTINGS MODAL */
        .modal-bg { position:fixed; inset:0; background:rgba(0,0,0,.3); z-index:200; display:flex; align-items:flex-end; }
        .modal { background:#fff; border-radius:24px 24px 0 0; padding:28px 20px 40px; width:100%; max-width:480px; margin:0 auto; }
        .modal-title { font-family:'Playfair Display',serif; font-size:18px; font-weight:700; margin-bottom:18px; display:flex; justify-content:space-between; align-items:center; }

        .empty { text-align:center; color:#a8a29e; font-size:13px; padding:28px 0; }
        .total-row { display:flex; justify-content:space-between; padding-top:10px; margin-top:4px; border-top:1.5px solid #f5f5f4; }
      `}</style>

      {/* HEADER */}
      <div className="hdr">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div className="hdr-family">
              {settings.familyName?.split(" ")[0]} <span>{settings.familyName?.split(" ").slice(1).join(" ")}</span>
            </div>
            <div className="hdr-sub">
              {settings.name1} & {settings.name2} · {MONTHS[selMonth]} {selYear}
              <span className="edit-link" onClick={() => { setSettingsDraft({...settings}); setEditingSettings(true); }}>editar</span>
            </div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6,marginTop:4}}>
            <div className="status-pill" style={{background:statusBg,color:statusColor,borderColor:statusColor+"44"}}>
              {statusIcon} {statusLabel}
            </div>
            {saving && <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#2563eb"}}><div className="dot"/><span>Salvando</span></div>}
          </div>
        </div>
      </div>

      {/* MONTHS */}
      <div className="month-scroll">
        {MONTHS_SHORT.map((m, i) => {
          const k = monthKey(selYear, i);
          const hasData = allMonths[k]?.salary > 0;
          return (
            <button key={i} className={`m-btn${selMonth===i&&selYear===CUR_YEAR?" active":""}${hasData&&!(selMonth===i&&selYear===CUR_YEAR)?" has-data":""}`}
              onClick={() => { setSelMonth(i); setSelYear(CUR_YEAR); }}>
              {m}
            </button>
          );
        })}
        {!(selYear===2025&&selMonth===3) && (
          <button className={`m-btn${selYear===2025&&selMonth===3?" active":""}`}
            onClick={() => { setSelYear(2025); setSelMonth(3); }}>
            Abr/25
          </button>
        )}
      </div>

      {/* BALANCE CARD */}
      <div className="card">
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
          <div>
            <div className="card-title" style={{marginBottom:6}}>Saldo do mês</div>
            <div className="bal-amount" style={{color:statusColor}}>{fmt(balance)}</div>
          </div>
          {isRed && <div style={{fontSize:11,color:"#e11d48",background:"#fff1f2",border:"1.5px solid #fecdd3",borderRadius:10,padding:"6px 10px",maxWidth:130,textAlign:"center",lineHeight:1.4}}>
            Faltam<br/><strong>{fmt(Math.abs(balance))}</strong>
          </div>}
        </div>
        <div className="bal-grid">
          <div className="bal-item">
            <span className="bal-label">Receita</span>
            <span className="bal-val" style={{color:"#059669"}}>{fmt(salary)}</span>
          </div>
          <div className="bal-item">
            <span className="bal-label">Total</span>
            <span className="bal-val" style={{color:"#e11d48"}}>{fmt(totalExp)}</span>
          </div>
          <div className="bal-item">
            <span className="bal-label">A pagar</span>
            <span className="bal-val" style={{color:"#d97706"}}>{fmt(totalPending)}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tab-wrap">
        {[["contas","📋 Contas"],["resumo","📊 Resumo"],["metas","🎯 Metas"],["anual","📅 Ano"]].map(([v,l]) => (
          <button key={v} className={`tab-btn${tab===v?" active":""}`} onClick={() => setTab(v)}>{l}</button>
        ))}
      </div>

      {/* ── CONTAS ── */}
      {tab === "contas" && (<>
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div className="card-title" style={{marginBottom:0}}>💰 Receitas do mês</div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowAddIncome(!showAddIncome)}>+ Adicionar</button>
          </div>

          {/* Income list */}
          {(monthData?.incomes||[]).length === 0 && (
            <div style={{fontSize:12,color:"#a8a29e",textAlign:"center",padding:"8px 0 4px"}}>Nenhuma receita adicionada</div>
          )}
          {(monthData?.incomes||[]).map(inc => (
            <div key={inc.id} style={{display:"flex",alignItems:"center",gap:10,padding:"9px 0",borderBottom:"1.5px solid #f5f5f4"}}>
              <span style={{flex:1,fontSize:13,fontWeight:500,color:"#1c1917"}}>{inc.name}</span>
              <span style={{fontSize:14,fontWeight:700,color:"#059669"}}>{fmt(inc.value)}</span>
              <button className="del-x" onClick={() => removeIncome(inc.id)}>✕</button>
            </div>
          ))}

          {/* Total receita */}
          {(monthData?.incomes||[]).length > 0 && (
            <div style={{display:"flex",justifyContent:"space-between",paddingTop:10,marginTop:4,borderTop:"1.5px solid #f5f5f4"}}>
              <span style={{fontSize:11,color:"#a8a29e",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Total receita</span>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:800,color:"#059669"}}>{fmt(salary)}</span>
            </div>
          )}

          {/* Add income form */}
          {showAddIncome && (
            <div style={{marginTop:12,display:"flex",flexDirection:"column",gap:8,padding:"12px",background:"#fafaf9",borderRadius:12,border:"1.5px solid #e7e5e4"}}>
              <input className="field" placeholder="Descrição (ex: Salário, Bico, Vanessa)" value={newIncomeName} onChange={e => setNewIncomeName(e.target.value)} />
              <input className="field" type="number" placeholder="Valor (R$)" value={newIncomeValue} onChange={e => setNewIncomeValue(e.target.value)} />
              <div className="row">
                <button className="btn btn-green" style={{flex:1}} onClick={addIncome}>Salvar</button>
                <button className="btn btn-ghost" onClick={() => { setShowAddIncome(false); setNewIncomeName(""); setNewIncomeValue(""); }}>Cancelar</button>
              </div>
            </div>
          )}

          {/* Progress bar */}
          {expenses.length > 0 && (<>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#a8a29e",marginBottom:5,fontWeight:500,marginTop:14}}>
              <span>{paidCount}/{expenses.length} pagas</span>
              <span>{fmt(totalPaid)} pagos</span>
            </div>
            <div className="prog-track">
              <div className="prog-fill" style={{width:`${expenses.length?(paidCount/expenses.length)*100:0}%`,background:"#059669"}} />
            </div>
          </>)}
        </div>

        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
            <div className="card-title" style={{marginBottom:0}}>Contas · {MONTHS_SHORT[selMonth]}</div>
            <div style={{display:"flex",gap:6}}>
              {availableMonthsToCopy.length > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCopy(!showCopy)}>📋 Copiar</button>
              )}
            </div>
          </div>

          {showCopy && (
            <div style={{background:"#fafaf9",border:"1.5px solid #e7e5e4",borderRadius:12,padding:12,marginBottom:14}}>
              <div style={{fontSize:12,color:"#78716c",marginBottom:8,fontWeight:600}}>Copiar contas de qual mês?</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {availableMonthsToCopy.map(m => (
                  <button key={m.key} className={`m-btn${copySource===m.key?" active":""}`}
                    style={{fontSize:12}} onClick={() => setCopySource(m.key)}>
                    {m.label}
                  </button>
                ))}
              </div>
              <div className="row">
                <button className="btn btn-dark btn-sm" style={{flex:1}} onClick={copyFromMonth} disabled={!copySource}>Copiar contas</button>
                <button className="btn btn-ghost btn-sm" onClick={() => { setShowCopy(false); setCopySource(""); }}>Cancelar</button>
              </div>
              <div style={{fontSize:11,color:"#a8a29e",marginTop:8}}>⚠️ Isso substitui as contas do mês atual. Salário é mantido.</div>
            </div>
          )}

          {expenses.length === 0 && <div className="empty">Nenhuma conta adicionada</div>}
          {expenses.map(e => (
            <div key={e.id} className="exp-row">
              <div className={`check-box${e.paid?" on":""}`} onClick={() => togglePaid(e.id)}>
                {e.paid && <span style={{color:"#fff",fontSize:12,fontWeight:800}}>✓</span>}
              </div>
              <span className={`exp-name${e.paid?" done":""}`}>{e.name}</span>
              <span className={`exp-val${e.paid?" done":""}`}>{fmt(e.value)}</span>
              <button className="del-x" onClick={() => removeExpense(e.id)}>✕</button>
            </div>
          ))}
          {expenses.length > 0 && (
            <div className="total-row">
              <span style={{fontSize:12,color:"#a8a29e",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px"}}>Total</span>
              <span style={{fontFamily:"'Playfair Display',serif",fontSize:16,fontWeight:800,color:"#e11d48"}}>{fmt(totalExp)}</span>
            </div>
          )}
        </div>

        <div className="card">
          {!showAdd ? (
            <button className="btn btn-dark" style={{width:"100%"}} onClick={() => setShowAdd(true)}>+ Adicionar conta</button>
          ) : (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input className="field" placeholder="Nome da conta (ex: LUZ)" value={newName} onChange={e => setNewName(e.target.value)} />
              <input className="field" type="number" placeholder="Valor (R$)" value={newValue} onChange={e => setNewValue(e.target.value)} />
              <div className="row">
                <button className="btn btn-green" style={{flex:1}} onClick={addExpense}>Salvar</button>
                <button className="btn btn-ghost" onClick={() => { setShowAdd(false); setNewName(""); setNewValue(""); }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>
      </>)}

      {/* ── RESUMO ── */}
      {tab === "resumo" && (<>
        <div className="card">
          <div className="card-title">Situação · {MONTHS_SHORT[selMonth]}/{selYear}</div>
          <div className="stat-grid">
            <div className="stat-box">
              <span className="stat-lbl">Receita</span>
              <span className="stat-val" style={{color:"#059669"}}>{fmt(salary)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-lbl">Total contas</span>
              <span className="stat-val" style={{color:"#e11d48"}}>{fmt(totalExp)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-lbl">Já pago</span>
              <span className="stat-val" style={{color:"#059669"}}>{fmt(totalPaid)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-lbl">A pagar</span>
              <span className="stat-val" style={{color:"#d97706"}}>{fmt(totalPending)}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-title">Saldo final</div>
          <div style={{background:statusBg,border:`1.5px solid ${statusColor}33`,borderRadius:14,padding:"16px"}}>
            <div style={{fontFamily:"'Playfair Display',serif",fontSize:34,fontWeight:800,color:statusColor}}>{fmt(balance)}</div>
            <div style={{fontSize:12,color:statusColor,marginTop:6,fontWeight:500}}>
              {isRed ? `⚠️ Faltam ${fmt(Math.abs(balance))} para cobrir tudo`
                : isWarn ? "⚡ Margem baixa — qualquer imprevisto coloca no vermelho"
                : `✅ Sobram ${fmt(balance)} após pagar todas as contas`}
            </div>
          </div>
        </div>

        {salary > 0 && (
          <div className="card">
            <div className="card-title">% comprometido do salário</div>
            <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
              <span style={{color:"#78716c"}}>Contas vs Salário</span>
              <span style={{fontWeight:700,color:statusColor}}>{((totalExp/salary)*100).toFixed(1)}%</span>
            </div>
            <div className="prog-track" style={{height:10}}>
              <div className="prog-fill" style={{width:`${Math.min(100,(totalExp/salary)*100)}%`,background:statusColor}}/>
            </div>
            <div style={{fontSize:11,color:"#a8a29e",marginTop:8}}>
              {(totalExp/salary)>0.95?"🔴 Crítico: quase 100% em contas":(totalExp/salary)>0.80?"🟡 Alto: pouca margem":"🟢 Controlado"}
            </div>
          </div>
        )}

        <div className="card">
          <div className="card-title">Contas pagas vs pendentes</div>
          <div style={{display:"flex",gap:10}}>
            <div style={{flex:1,background:"#ecfdf5",border:"1.5px solid #a7f3d0",borderRadius:12,padding:14,textAlign:"center"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:800,color:"#059669"}}>{paidCount}</div>
              <div style={{fontSize:10,color:"#6ee7b7",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",margin:"2px 0"}}>Pagas</div>
              <div style={{fontSize:12,color:"#059669",fontWeight:600}}>{fmt(totalPaid)}</div>
            </div>
            <div style={{flex:1,background:"#fffbeb",border:"1.5px solid #fde68a",borderRadius:12,padding:14,textAlign:"center"}}>
              <div style={{fontFamily:"'Playfair Display',serif",fontSize:28,fontWeight:800,color:"#d97706"}}>{expenses.length-paidCount}</div>
              <div style={{fontSize:10,color:"#fcd34d",fontWeight:700,textTransform:"uppercase",letterSpacing:"1px",margin:"2px 0"}}>Pendentes</div>
              <div style={{fontSize:12,color:"#d97706",fontWeight:600}}>{fmt(totalPending)}</div>
            </div>
          </div>
        </div>
      </>)}

      {/* ── METAS ── */}
      {tab === "metas" && (<>
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:showGoalForm?14:0}}>
            <div className="card-title" style={{marginBottom:0}}>Metas financeiras</div>
            {!showGoalForm && <button className="btn btn-dark btn-sm" onClick={() => { setShowGoalForm(true); setEditGoalId(null); setGoalName(""); setGoalTarget(""); setGoalSaved(""); }}>+ Nova meta</button>}
          </div>
          {showGoalForm && (
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <input className="field" placeholder="Nome da meta (ex: Reserva emergência)" value={goalName} onChange={e => setGoalName(e.target.value)} />
              <input className="field" type="number" placeholder="Valor alvo (R$)" value={goalTarget} onChange={e => setGoalTarget(e.target.value)} />
              <input className="field" type="number" placeholder="Valor já guardado (R$)" value={goalSaved} onChange={e => setGoalSaved(e.target.value)} />
              <div className="row">
                <button className="btn btn-green" style={{flex:1}} onClick={saveGoal}>{editGoalId?"Salvar":"Criar"}</button>
                <button className="btn btn-ghost" onClick={() => { setShowGoalForm(false); setEditGoalId(null); }}>Cancelar</button>
              </div>
            </div>
          )}
        </div>

        {goals.length === 0 && !showGoalForm && <div className="card"><div className="empty">Nenhuma meta ainda. Crie a primeira!</div></div>}

        {goals.map(g => {
          const pct = Math.min(100, g.target>0?(g.saved/g.target)*100:0);
          const done = pct >= 100;
          const gc = done?"#059669":pct>60?"#d97706":"#2563eb";
          return (
            <div key={g.id} className="card" style={{marginTop:10}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
                <div>
                  <div style={{fontSize:14,fontWeight:700,color:"#1c1917"}}>{g.name}</div>
                  <div style={{fontSize:12,color:"#a8a29e",marginTop:2}}>Meta: {fmt(g.target)}</div>
                </div>
                <div style={{display:"flex",gap:6}}>
                  <button className="btn btn-ghost btn-sm" onClick={() => startEditGoal(g)}>✏️</button>
                  <button className="btn btn-sm" style={{background:"#fff1f2",color:"#e11d48",border:"1.5px solid #fecdd3"}} onClick={() => deleteGoal(g.id)}>✕</button>
                </div>
              </div>
              <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                <span style={{color:"#78716c"}}>Guardado: <strong style={{color:gc}}>{fmt(g.saved)}</strong></span>
                <span style={{fontWeight:800,color:gc}}>{pct.toFixed(0)}%</span>
              </div>
              <div className="prog-track" style={{height:8}}>
                <div className="prog-fill" style={{width:`${Math.max(2,pct)}%`,background:gc}}/>
              </div>
              {done
                ? <div style={{fontSize:12,color:"#059669",marginTop:8,fontWeight:700}}>🎉 Meta atingida!</div>
                : <div style={{fontSize:12,color:"#a8a29e",marginTop:8}}>Faltam <strong style={{color:"#1c1917"}}>{fmt(g.target-g.saved)}</strong></div>}
              <input className="field" type="number" placeholder="Atualizar valor guardado (Enter)"
                style={{marginTop:10,fontSize:13,padding:"8px 12px"}}
                onKeyDown={e => { if(e.key==="Enter"&&e.target.value){ updateGoalSaved(g.id,e.target.value); e.target.value=""; }}}
                onBlur={e => { if(e.target.value){ updateGoalSaved(g.id,e.target.value); e.target.value=""; }}} />
            </div>
          );
        })}
      </>)}

      {/* ── ANUAL ── */}
      {tab === "anual" && (<>
        <div className="card">
          <div className="card-title">Resumo do ano · {selYear}</div>
          <div className="stat-grid" style={{marginBottom:14}}>
            <div className="stat-box">
              <span className="stat-lbl">Total recebido</span>
              <span className="stat-val" style={{color:"#059669",fontSize:16}}>{fmt(annualTotals.totalReceita)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-lbl">Total gasto</span>
              <span className="stat-val" style={{color:"#e11d48",fontSize:16}}>{fmt(annualTotals.totalGasto)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-lbl">Saldo do ano</span>
              <span className="stat-val" style={{color:annualTotals.totalSaldo>=0?"#059669":"#e11d48",fontSize:16}}>{fmt(annualTotals.totalSaldo)}</span>
            </div>
            <div className="stat-box">
              <span className="stat-lbl">Meses</span>
              <span style={{fontSize:13,fontWeight:600}}>
                <span style={{color:"#059669"}}>{annualTotals.mesesPositivos} positivos</span>
                {annualTotals.mesesNegativos > 0 && <span style={{color:"#e11d48"}}> · {annualTotals.mesesNegativos} neg.</span>}
              </span>
            </div>
          </div>

          {/* BAR CHART */}
          <div className="card-title" style={{marginBottom:10}}>Gastos por mês</div>
          <div className="bar-chart">
            {annualData.map((d, i) => (
              <div key={i} className="bar-col">
                {d.hasData ? (
                  <div className="bar-stack" style={{height:`${(d.expenses/maxExpense)*80}px`,background: d.balance<0?"#e11d48":d.balance<500?"#d97706":"#059669",minHeight:4}} title={`${d.label}: ${fmt(d.expenses)}`}/>
                ) : (
                  <div style={{height:4,background:"#f5f5f4",borderRadius:4,width:"100%"}}/>
                )}
                <span className="bar-lbl">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Mês a mês</div>
          {annualData.filter(d => d.hasData).length === 0 && <div className="empty">Nenhum dado lançado em {selYear}</div>}
          {annualData.map((d, i) => {
            if (!d.hasData) return null;
            const c = d.balance<0?"#e11d48":d.balance<500?"#d97706":"#059669";
            return (
              <div key={i} className="ann-row" onClick={() => { setSelMonth(i); setTab("contas"); }}>
                <div>
                  <div className="ann-month">{MONTHS[i]}</div>
                  <div className="ann-sub">{fmt(d.salary)} recebido · {fmt(d.expenses)} gasto</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div className="ann-bal" style={{color:c}}>{fmt(d.balance)}</div>
                  <div style={{fontSize:10,color:c,fontWeight:700}}>{d.balance<0?"VERMELHO":d.balance<500?"ATENÇÃO":"OK"}</div>
                </div>
              </div>
            );
          })}
        </div>
      </>)}

      {/* BOTTOM NAV */}
      <nav className="bot-nav">
        {[["contas","📋","Contas"],["resumo","📊","Resumo"],["metas","🎯","Metas"],["anual","📅","Ano"]].map(([v,ic,l]) => (
          <button key={v} className={`nav-btn${tab===v?" active":""}`} onClick={() => setTab(v)}>
            <span className="nav-icon">{ic}</span>{l}
          </button>
        ))}
      </nav>

      {/* SETTINGS MODAL */}
      {editingSettings && (
        <div className="modal-bg" onClick={() => setEditingSettings(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-title">
              Editar dados
              <button className="btn btn-ghost btn-sm" onClick={() => setEditingSettings(false)}>✕</button>
            </div>
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              <div>
                <div style={{fontSize:11,color:"#a8a29e",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:5}}>Nome da família</div>
                <input className="field" placeholder="ex: Família Silva" value={settingsDraft.familyName||""} onChange={e => setSettingsDraft(p=>({...p,familyName:e.target.value}))} />
              </div>
              <div>
                <div style={{fontSize:11,color:"#a8a29e",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:5}}>Nome 1</div>
                <input className="field" placeholder="ex: Huberth" value={settingsDraft.name1||""} onChange={e => setSettingsDraft(p=>({...p,name1:e.target.value}))} />
              </div>
              <div>
                <div style={{fontSize:11,color:"#a8a29e",textTransform:"uppercase",letterSpacing:"1px",fontWeight:700,marginBottom:5}}>Nome 2</div>
                <input className="field" placeholder="ex: Vanessa" value={settingsDraft.name2||""} onChange={e => setSettingsDraft(p=>({...p,name2:e.target.value}))} />
              </div>
              <button className="btn btn-dark" style={{marginTop:4}} onClick={saveSettingsEdit}>Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
