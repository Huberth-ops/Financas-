import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  doc, getDoc, setDoc, onSnapshot, collection, getDocs
} from "firebase/firestore";

// ── CONSTANTS ─────────────────────────────────────────────────────────────────
const MONTHS = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
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

function monthKey(year, month) { return `${year}-${String(month).padStart(2, "0")}`; }

// ── APP ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [selYear, setSelYear] = useState(CUR_YEAR);
  const [selMonth, setSelMonth] = useState(CUR_MONTH);
  const [tab, setTab] = useState("contas"); // contas | resumo | metas
  const [monthData, setMonthData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // new expense form
  const [newName, setNewName] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  // new goal form
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [goalName, setGoalName] = useState("");
  const [goalTarget, setGoalTarget] = useState("");
  const [goalSaved, setGoalSaved] = useState("");
  const [editGoalId, setEditGoalId] = useState(null);

  const key = monthKey(selYear, selMonth);

  // ── LOAD MONTH ──────────────────────────────────────────────────────────────
  useEffect(() => {
    setLoading(true);
    const ref = doc(db, "months", key);
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) {
        setMonthData(snap.data());
      } else {
        // Initialize with April data or empty
        const isApril2025 = selYear === 2025 && selMonth === 3;
        setMonthData({
          salary: isApril2025 ? 11400 : 0,
          expenses: isApril2025 ? INITIAL_EXPENSES : [],
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, [key]);

  // ── LOAD GOALS ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const ref = doc(db, "settings", "goals");
    const unsub = onSnapshot(ref, (snap) => {
      if (snap.exists()) setGoals(snap.data().list || []);
      else setGoals([]);
    });
    return () => unsub();
  }, []);

  // ── SAVE MONTH ──────────────────────────────────────────────────────────────
  async function saveMonth(data) {
    setSaving(true);
    try {
      await setDoc(doc(db, "months", key), data);
    } finally {
      setSaving(false);
    }
  }

  async function saveGoals(list) {
    await setDoc(doc(db, "settings", "goals"), { list });
  }

  // ── HANDLERS ────────────────────────────────────────────────────────────────
  function togglePaid(id) {
    const updated = {
      ...monthData,
      expenses: monthData.expenses.map(e =>
        e.id === id ? { ...e, paid: !e.paid } : e
      )
    };
    setMonthData(updated);
    saveMonth(updated);
  }

  function updateSalary(val) {
    const updated = { ...monthData, salary: Number(val) };
    setMonthData(updated);
    saveMonth(updated);
  }

  function addExpense() {
    if (!newName.trim() || !newValue) return;
    const exp = {
      id: Date.now().toString(),
      name: newName.toUpperCase().trim(),
      value: Number(newValue),
      paid: false
    };
    const updated = { ...monthData, expenses: [...monthData.expenses, exp] };
    setMonthData(updated);
    saveMonth(updated);
    setNewName(""); setNewValue(""); setShowAdd(false);
  }

  function removeExpense(id) {
    const updated = { ...monthData, expenses: monthData.expenses.filter(e => e.id !== id) };
    setMonthData(updated);
    saveMonth(updated);
  }

  function saveGoal() {
    if (!goalName.trim() || !goalTarget) return;
    let list;
    if (editGoalId) {
      list = goals.map(g => g.id === editGoalId
        ? { ...g, name: goalName, target: Number(goalTarget), saved: Number(goalSaved || 0) }
        : g);
    } else {
      list = [...goals, {
        id: Date.now().toString(),
        name: goalName,
        target: Number(goalTarget),
        saved: Number(goalSaved || 0)
      }];
    }
    setGoals(list);
    saveGoals(list);
    setGoalName(""); setGoalTarget(""); setGoalSaved("");
    setShowGoalForm(false); setEditGoalId(null);
  }

  function deleteGoal(id) {
    const list = goals.filter(g => g.id !== id);
    setGoals(list);
    saveGoals(list);
  }

  function editGoal(g) {
    setEditGoalId(g.id);
    setGoalName(g.name);
    setGoalTarget(String(g.target));
    setGoalSaved(String(g.saved || 0));
    setShowGoalForm(true);
  }

  function updateGoalSaved(id, val) {
    const list = goals.map(g => g.id === id ? { ...g, saved: Number(val) } : g);
    setGoals(list);
    saveGoals(list);
  }

  // ── COMPUTED ─────────────────────────────────────────────────────────────────
  const expenses = monthData?.expenses || [];
  const salary = Number(monthData?.salary || 0);
  const totalExp = expenses.reduce((s, e) => s + Number(e.value), 0);
  const totalPaid = expenses.filter(e => e.paid).reduce((s, e) => s + Number(e.value), 0);
  const totalPending = totalExp - totalPaid;
  const balance = salary - totalExp;
  const paidCount = expenses.filter(e => e.paid).length;

  const statusColor = balance < 0 ? "#f43f5e" : balance < 500 ? "#f59e0b" : "#10b981";
  const statusLabel = balance < 0 ? "NO VERMELHO" : balance < 500 ? "ATENÇÃO" : "POSITIVO";
  const statusBg = balance < 0 ? "rgba(244,63,94,.12)" : balance < 500 ? "rgba(245,158,11,.12)" : "rgba(16,185,129,.12)";

  if (loading) return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#09101f",color:"#64748b",fontFamily:"DM Sans,sans-serif",fontSize:14 }}>
      Carregando...
    </div>
  );

  return (
    <div style={{ background:"#09101f", minHeight:"100vh", maxWidth:480, margin:"0 auto", paddingBottom:90, fontFamily:"DM Sans, sans-serif", color:"#f1f5f9" }}>
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        input, select, button { font-family: 'DM Sans', sans-serif; }

        .hdr { padding: 28px 20px 0; }
        .hdr-top { display: flex; justify-content: space-between; align-items: flex-start; }
        .hdr-title { font-family: 'Syne', sans-serif; font-size: 21px; font-weight: 800; }
        .hdr-title span { color: #3b82f6; }
        .badge { display:inline-flex;align-items:center;gap:5px;padding:4px 10px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:.6px; }
        .saving-dot { width:7px;height:7px;border-radius:50%;background:#3b82f6;animation:pulse 1s infinite; }
        @keyframes pulse { 0%,100%{opacity:1}50%{opacity:.3} }

        .month-row { display:flex;gap:6px;flex-wrap:wrap;padding:14px 20px 0; }
        .m-btn { background:#111827;border:1px solid #1f2d45;color:#94a3b8;padding:5px 10px;border-radius:8px;font-size:12px;cursor:pointer;transition:all .15s; }
        .m-btn.active { background:#3b82f6;border-color:#3b82f6;color:#fff;font-weight:600; }
        .m-btn:hover:not(.active) { border-color:#3b82f6;color:#f1f5f9; }

        .card { background:#111827;border:1px solid #1f2d45;border-radius:16px;padding:18px;margin:12px 16px 0; }
        .card-title { font-family:'Syne',sans-serif;font-size:11px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:1.5px;margin-bottom:14px; }

        .balance-card { background:linear-gradient(135deg,#0c1a33,#112244);border-color:#1a3060; }
        .bal-label { font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:6px; }
        .bal-amount { font-family:'Syne',sans-serif;font-size:38px;font-weight:800;line-height:1; }
        .bal-row { display:flex;justify-content:space-between;margin-top:18px;padding-top:14px;border-top:1px solid #1a3060; }
        .bal-item label { font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.8px;display:block;margin-bottom:4px; }
        .bal-item span { font-size:15px;font-weight:600; }

        .tab-bar { display:flex;background:#111827;border:1px solid #1f2d45;border-radius:12px;margin:12px 16px 0;overflow:hidden; }
        .tab-btn { flex:1;padding:11px 6px;border:none;background:none;color:#64748b;font-size:13px;font-weight:500;cursor:pointer;transition:all .15s;font-family:'DM Sans',sans-serif; }
        .tab-btn.active { background:#3b82f6;color:#fff;font-weight:600; }

        .exp-item { display:flex;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid #1a2235;transition:background .1s; }
        .exp-item:last-child { border-bottom:none; }
        .checkbox { width:22px;height:22px;border-radius:7px;border:2px solid #1f3a60;background:none;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .15s; }
        .checkbox.checked { background:#10b981;border-color:#10b981; }
        .exp-name { flex:1;font-size:14px;font-weight:500;transition:color .15s; }
        .exp-name.paid { color:#475569;text-decoration:line-through; }
        .exp-val { font-size:14px;font-weight:700;color:#f43f5e; }
        .exp-val.paid { color:#475569; }
        .del-btn { background:none;border:none;color:#2d3f55;cursor:pointer;padding:4px;border-radius:6px;display:flex;align-items:center;transition:color .15s; }
        .del-btn:hover { color:#f43f5e; }

        .input-field { background:#0f1d35;border:1px solid #1f3a60;color:#f1f5f9;padding:11px 14px;border-radius:10px;font-size:14px;width:100%;outline:none;transition:border-color .15s; }
        .input-field:focus { border-color:#3b82f6; }
        .btn { padding:11px 18px;border-radius:10px;font-size:13px;font-weight:700;cursor:pointer;border:none;font-family:'Syne',sans-serif;transition:all .2s;letter-spacing:.3px; }
        .btn-blue { background:#3b82f6;color:#fff; }
        .btn-blue:hover { background:#2563eb; }
        .btn-green { background:#10b981;color:#fff; }
        .btn-outline { background:none;border:1px solid #1f3a60;color:#94a3b8; }
        .btn-outline:hover { border-color:#3b82f6;color:#f1f5f9; }
        .btn-sm { padding:7px 12px;font-size:12px; }
        .btn-row { display:flex;gap:8px;margin-top:10px; }

        .stat-grid { display:grid;grid-template-columns:1fr 1fr;gap:10px; }
        .stat-box { background:#0f1a2e;border:1px solid #1a2d45;border-radius:12px;padding:14px; }
        .stat-box label { font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:1px;display:block;margin-bottom:6px; }
        .stat-box span { font-size:18px;font-weight:700;font-family:'Syne',sans-serif; }

        .progress-wrap { margin-top:4px; }
        .progress-track { height:5px;background:#1a2d45;border-radius:3px;overflow:hidden;margin:4px 0; }
        .progress-fill { height:100%;border-radius:3px;transition:width .5s; }

        .goal-item { background:#0f1a2e;border:1px solid #1a2d45;border-radius:12px;padding:14px;margin-bottom:10px; }
        .goal-hdr { display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px; }
        .goal-name { font-size:14px;font-weight:600; }
        .goal-actions { display:flex;gap:6px; }

        .salary-row { display:flex;align-items:center;gap:10px;margin-bottom:14px; }
        .salary-row label { font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:1px;white-space:nowrap; }
        .salary-input { background:#0f1d35;border:1px solid #1f3a60;color:#f1f5f9;padding:9px 12px;border-radius:10px;font-size:15px;font-weight:700;font-family:'Syne',sans-serif;width:100%;outline:none; }
        .salary-input:focus { border-color:#3b82f6; }

        .nav { position:fixed;bottom:0;left:50%;transform:translateX(-50%);width:100%;max-width:480px;background:#0d1525;border-top:1px solid #1a2d45;display:flex;z-index:100; }
        .nav-btn { flex:1;padding:11px 4px 14px;border:none;background:none;color:#475569;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:4px;font-size:10px;font-family:'DM Sans',sans-serif;font-weight:500;transition:color .15s; }
        .nav-btn.active { color:#3b82f6; }
        .nav-icon { font-size:20px;line-height:1; }

        .empty { text-align:center;color:#475569;font-size:13px;padding:28px 0; }
        .section-note { font-size:12px;color:#475569;margin-top:4px; }
      `}</style>

      {/* HEADER */}
      <div className="hdr">
        <div className="hdr-top">
          <div>
            <div className="hdr-title">Família <span>Silva</span></div>
            <div style={{fontSize:12,color:"#475569",marginTop:2}}>Huberth & Vanessa · {MONTHS[selMonth]} {selYear}</div>
          </div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end",gap:6}}>
            <div className="badge" style={{background:statusBg,color:statusColor,border:`1px solid ${statusColor}33`}}>
              {balance < 0 ? "🔴" : balance < 500 ? "🟡" : "🟢"} {statusLabel}
            </div>
            {saving && <div style={{display:"flex",alignItems:"center",gap:4,fontSize:10,color:"#3b82f6"}}><div className="saving-dot"/><span>Salvando...</span></div>}
          </div>
        </div>
      </div>

      {/* MONTH SELECTOR */}
      <div className="month-row">
        {MONTHS_SHORT.map((m, i) => (
          <button key={i} className={`m-btn ${selMonth === i && selYear === CUR_YEAR ? "active" : ""}`}
            onClick={() => { setSelMonth(i); setSelYear(CUR_YEAR); }}>
            {m}
          </button>
        ))}
        {!(selYear === 2025 && selMonth === 3) && CUR_YEAR !== 2025 && (
          <button className="m-btn" style={{fontSize:10}} onClick={() => { setSelYear(2025); setSelMonth(3); }}>
            Abr/25 ↗
          </button>
        )}
      </div>

      {/* BALANCE CARD */}
      <div className="card balance-card">
        <div className="bal-label">Saldo do mês</div>
        <div className="bal-amount" style={{color: statusColor}}>{fmt(balance)}</div>
        <div className="bal-row">
          <div className="bal-item">
            <label>Receita</label>
            <span style={{color:"#10b981"}}>{fmt(salary)}</span>
          </div>
          <div className="bal-item">
            <label>Total Contas</label>
            <span style={{color:"#f43f5e"}}>{fmt(totalExp)}</span>
          </div>
          <div className="bal-item">
            <label>A pagar</label>
            <span style={{color:"#f59e0b"}}>{fmt(totalPending)}</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="tab-bar">
        <button className={`tab-btn ${tab === "contas" ? "active" : ""}`} onClick={() => setTab("contas")}>
          📋 Contas
        </button>
        <button className={`tab-btn ${tab === "resumo" ? "active" : ""}`} onClick={() => setTab("resumo")}>
          📊 Resumo
        </button>
        <button className={`tab-btn ${tab === "metas" ? "active" : ""}`} onClick={() => setTab("metas")}>
          🎯 Metas
        </button>
      </div>

      {/* ── TAB: CONTAS ── */}
      {tab === "contas" && (
        <>
          {/* Salary */}
          <div className="card">
            <div className="salary-row">
              <label>Salário</label>
              <input className="salary-input" type="number"
                value={monthData?.salary || ""}
                placeholder="0,00"
                onChange={e => updateSalary(e.target.value)} />
            </div>

            {/* Progress bar of paid */}
            {expenses.length > 0 && (
              <div className="progress-wrap">
                <div style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:4}}>
                  <span>{paidCount}/{expenses.length} pagas</span>
                  <span>{fmt(totalPaid)} pagos</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{width:`${expenses.length ? (paidCount/expenses.length)*100 : 0}%`, background:"#10b981"}} />
                </div>
              </div>
            )}
          </div>

          {/* Expense list */}
          <div className="card">
            <div className="card-title">Contas do mês · {paidCount}/{expenses.length} pagas</div>
            {expenses.length === 0 && <div className="empty">Nenhuma conta adicionada</div>}
            {expenses.map(e => (
              <div key={e.id} className="exp-item">
                <div className={`checkbox ${e.paid ? "checked" : ""}`} onClick={() => togglePaid(e.id)}>
                  {e.paid && <span style={{color:"#fff",fontSize:13,fontWeight:700}}>✓</span>}
                </div>
                <span className={`exp-name ${e.paid ? "paid" : ""}`}>{e.name}</span>
                <span className={`exp-val ${e.paid ? "paid" : ""}`}>{fmt(e.value)}</span>
                <button className="del-btn" onClick={() => removeExpense(e.id)}>✕</button>
              </div>
            ))}

            {/* Total row */}
            {expenses.length > 0 && (
              <div style={{borderTop:"1px solid #1a2235",paddingTop:12,marginTop:4,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontSize:13,color:"#64748b",fontWeight:600}}>TOTAL</span>
                <span style={{fontFamily:"Syne",fontSize:16,fontWeight:800,color:"#f43f5e"}}>{fmt(totalExp)}</span>
              </div>
            )}
          </div>

          {/* Add expense */}
          <div className="card">
            {!showAdd ? (
              <button className="btn btn-blue" style={{width:"100%"}} onClick={() => setShowAdd(true)}>
                + Adicionar conta
              </button>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input className="input-field" placeholder="Nome da conta (ex: ÁGUA)" value={newName}
                  onChange={e => setNewName(e.target.value)} />
                <input className="input-field" type="number" placeholder="Valor (R$)" value={newValue}
                  onChange={e => setNewValue(e.target.value)} />
                <div className="btn-row">
                  <button className="btn btn-green" style={{flex:1}} onClick={addExpense}>Salvar</button>
                  <button className="btn btn-outline" onClick={() => { setShowAdd(false); setNewName(""); setNewValue(""); }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── TAB: RESUMO ── */}
      {tab === "resumo" && (
        <>
          <div className="card">
            <div className="card-title">Situação financeira · {MONTHS[selMonth]}</div>
            <div className="stat-grid">
              <div className="stat-box">
                <label>Receita</label>
                <span style={{color:"#10b981"}}>{fmt(salary)}</span>
              </div>
              <div className="stat-box">
                <label>Total contas</label>
                <span style={{color:"#f43f5e"}}>{fmt(totalExp)}</span>
              </div>
              <div className="stat-box">
                <label>Já pago</label>
                <span style={{color:"#10b981"}}>{fmt(totalPaid)}</span>
              </div>
              <div className="stat-box">
                <label>A pagar</label>
                <span style={{color:"#f59e0b"}}>{fmt(totalPending)}</span>
              </div>
            </div>

            {/* Saldo final */}
            <div style={{marginTop:14,background:statusBg,border:`1px solid ${statusColor}33`,borderRadius:12,padding:"14px 16px"}}>
              <div style={{fontSize:11,color:statusColor,textTransform:"uppercase",letterSpacing:"1px",marginBottom:4}}>Saldo final</div>
              <div style={{fontFamily:"Syne",fontSize:30,fontWeight:800,color:statusColor}}>{fmt(balance)}</div>
              <div style={{fontSize:12,color:statusColor,marginTop:4,opacity:.8}}>
                {balance < 0
                  ? `⚠️ Faltam ${fmt(Math.abs(balance))} para cobrir as contas`
                  : balance < 500
                  ? `⚠️ Margem muito baixa — qualquer imprevisto entra no vermelho`
                  : `✅ Sobram ${fmt(balance)} após pagar todas as contas`}
              </div>
            </div>
          </div>

          {/* Comprometimento */}
          <div className="card">
            <div className="card-title">% do salário comprometido</div>
            {salary > 0 ? (
              <>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:13,marginBottom:8}}>
                  <span style={{color:"#64748b"}}>Contas vs Salário</span>
                  <span style={{fontWeight:700,color: (totalExp/salary)>0.9?"#f43f5e":"#f59e0b"}}>
                    {((totalExp / salary) * 100).toFixed(1)}%
                  </span>
                </div>
                <div className="progress-track" style={{height:10}}>
                  <div className="progress-fill" style={{
                    width:`${Math.min(100,(totalExp/salary)*100)}%`,
                    background: (totalExp/salary) > 0.9 ? "#f43f5e" : (totalExp/salary) > 0.7 ? "#f59e0b" : "#10b981"
                  }}/>
                </div>
                <div className="section-note" style={{marginTop:8}}>
                  {(totalExp/salary) > 0.95
                    ? "🔴 Crítico: quase 100% do salário em contas fixas"
                    : (totalExp/salary) > 0.80
                    ? "🟡 Alto: pouca margem de segurança"
                    : "🟢 Controlado"}
                </div>
              </>
            ) : <div className="empty">Informe o salário na aba Contas</div>}
          </div>

          {/* Contas pagas vs pendentes */}
          <div className="card">
            <div className="card-title">Status das contas</div>
            <div style={{display:"flex",gap:10}}>
              <div style={{flex:1,background:"rgba(16,185,129,.08)",border:"1px solid rgba(16,185,129,.2)",borderRadius:10,padding:12,textAlign:"center"}}>
                <div style={{fontSize:24,fontFamily:"Syne",fontWeight:800,color:"#10b981"}}>{paidCount}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>PAGAS</div>
                <div style={{fontSize:12,color:"#10b981",marginTop:2}}>{fmt(totalPaid)}</div>
              </div>
              <div style={{flex:1,background:"rgba(245,158,11,.08)",border:"1px solid rgba(245,158,11,.2)",borderRadius:10,padding:12,textAlign:"center"}}>
                <div style={{fontSize:24,fontFamily:"Syne",fontWeight:800,color:"#f59e0b"}}>{expenses.length - paidCount}</div>
                <div style={{fontSize:11,color:"#64748b",marginTop:2}}>PENDENTES</div>
                <div style={{fontSize:12,color:"#f59e0b",marginTop:2}}>{fmt(totalPending)}</div>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ── TAB: METAS ── */}
      {tab === "metas" && (
        <>
          <div className="card">
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom: showGoalForm ? 14 : 0}}>
              <div className="card-title" style={{marginBottom:0}}>Metas financeiras</div>
              {!showGoalForm && (
                <button className="btn btn-blue btn-sm" onClick={() => { setShowGoalForm(true); setEditGoalId(null); setGoalName(""); setGoalTarget(""); setGoalSaved(""); }}>
                  + Nova meta
                </button>
              )}
            </div>

            {showGoalForm && (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                <input className="input-field" placeholder="Nome da meta (ex: Reserva emergência)" value={goalName}
                  onChange={e => setGoalName(e.target.value)} />
                <input className="input-field" type="number" placeholder="Valor alvo (R$)" value={goalTarget}
                  onChange={e => setGoalTarget(e.target.value)} />
                <input className="input-field" type="number" placeholder="Valor já guardado (R$)" value={goalSaved}
                  onChange={e => setGoalSaved(e.target.value)} />
                <div className="btn-row">
                  <button className="btn btn-green" style={{flex:1}} onClick={saveGoal}>
                    {editGoalId ? "Salvar" : "Criar meta"}
                  </button>
                  <button className="btn btn-outline" onClick={() => { setShowGoalForm(false); setEditGoalId(null); }}>Cancelar</button>
                </div>
              </div>
            )}
          </div>

          {goals.length === 0 && !showGoalForm && (
            <div className="card"><div className="empty">Nenhuma meta criada ainda.<br/>Crie sua primeira meta acima!</div></div>
          )}

          {goals.map(g => {
            const pct = Math.min(100, g.target > 0 ? (g.saved / g.target) * 100 : 0);
            const achieved = pct >= 100;
            return (
              <div key={g.id} className="card" style={{marginTop:10}}>
                <div className="goal-hdr">
                  <div>
                    <div className="goal-name">{g.name}</div>
                    <div style={{fontSize:12,color:"#64748b",marginTop:2}}>Meta: {fmt(g.target)}</div>
                  </div>
                  <div className="goal-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => editGoal(g)}>✏️</button>
                    <button className="btn btn-sm" style={{background:"rgba(244,63,94,.1)",color:"#f43f5e",border:"1px solid rgba(244,63,94,.2)"}} onClick={() => deleteGoal(g.id)}>✕</button>
                  </div>
                </div>

                {/* Progress */}
                <div style={{display:"flex",justifyContent:"space-between",fontSize:12,marginBottom:6}}>
                  <span style={{color:"#64748b"}}>Guardado: <strong style={{color: achieved?"#10b981":"#f1f5f9"}}>{fmt(g.saved)}</strong></span>
                  <span style={{fontWeight:700,color: achieved?"#10b981":pct>60?"#f59e0b":"#f43f5e"}}>{pct.toFixed(0)}%</span>
                </div>
                <div className="progress-track" style={{height:8}}>
                  <div className="progress-fill" style={{
                    width:`${Math.max(2,pct)}%`,
                    background: achieved?"#10b981":pct>60?"#f59e0b":"#3b82f6"
                  }}/>
                </div>

                {achieved ? (
                  <div style={{fontSize:12,color:"#10b981",marginTop:8,fontWeight:600}}>🎉 Meta atingida!</div>
                ) : (
                  <div style={{fontSize:12,color:"#64748b",marginTop:8}}>
                    Faltam <strong style={{color:"#f1f5f9"}}>{fmt(g.target - g.saved)}</strong> para atingir
                  </div>
                )}

                {/* Quick update saved */}
                <div style={{marginTop:10,display:"flex",gap:8,alignItems:"center"}}>
                  <input className="input-field" type="number" placeholder="Atualizar valor guardado"
                    style={{fontSize:13,padding:"8px 12px"}}
                    onBlur={e => { if(e.target.value) { updateGoalSaved(g.id, e.target.value); e.target.value=""; } }}
                    onKeyDown={e => { if(e.key==="Enter" && e.target.value){ updateGoalSaved(g.id, e.target.value); e.target.value=""; }}}
                  />
                </div>
              </div>
            );
          })}
        </>
      )}

      {/* BOTTOM NAV */}
      <nav className="nav">
        <button className={`nav-btn ${tab==="contas"?"active":""}`} onClick={() => setTab("contas")}>
          <span className="nav-icon">📋</span>Contas
        </button>
        <button className={`nav-btn ${tab==="resumo"?"active":""}`} onClick={() => setTab("resumo")}>
          <span className="nav-icon">📊</span>Resumo
        </button>
        <button className={`nav-btn ${tab==="metas"?"active":""}`} onClick={() => setTab("metas")}>
          <span className="nav-icon">🎯</span>Metas
        </button>
      </nav>
    </div>
  );
}
