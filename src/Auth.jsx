import { useState } from "react";
import { auth } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from "firebase/auth";

export default function Auth() {
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [familyName, setFamilyName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const errorMap = {
    "auth/email-already-in-use": "Este e-mail já está cadastrado.",
    "auth/invalid-email": "E-mail inválido.",
    "auth/weak-password": "Senha muito fraca. Use pelo menos 6 caracteres.",
    "auth/user-not-found": "E-mail não encontrado.",
    "auth/wrong-password": "Senha incorreta.",
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/too-many-requests": "Muitas tentativas. Tente novamente mais tarde.",
  };

  async function handleSubmit() {
    setError("");
    if (!email || !password) { setError("Preencha e-mail e senha."); return; }
    if (mode === "register" && !familyName.trim()) { setError("Informe o nome da família."); return; }
    setLoading(true);
    try {
      if (mode === "register") {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(errorMap[e.code] || "Erro ao autenticar. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight:"100vh", background:"#f8f7f4", display:"flex", flexDirection:"column",
      alignItems:"center", justifyContent:"center", padding:"24px 20px",
      fontFamily:"'Instrument Sans','DM Sans',sans-serif"
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600;700&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing:border-box; margin:0; padding:0; }
        .auth-field {
          background:#fff; border:1.5px solid #e7e5e4; color:#1c1917;
          padding:13px 16px; border-radius:12px; font-size:15px;
          width:100%; outline:none; transition:border-color .15s;
          font-family:'Instrument Sans',sans-serif;
        }
        .auth-field:focus { border-color:#2563eb; }
        .auth-btn {
          width:100%; padding:14px; border-radius:12px; border:none;
          background:#1c1917; color:#fff; font-size:15px; font-weight:700;
          cursor:pointer; font-family:'Instrument Sans',sans-serif;
          transition:background .15s; letter-spacing:.2px;
        }
        .auth-btn:hover { background:#292524; }
        .auth-btn:disabled { opacity:.5; cursor:not-allowed; }
        .auth-link { color:#2563eb; cursor:pointer; font-weight:600; text-decoration:underline; }
      `}</style>

      <div style={{width:"100%", maxWidth:400}}>
        {/* Logo */}
        <div style={{textAlign:"center", marginBottom:36}}>
          <div style={{fontFamily:"'Playfair Display',serif", fontSize:32, fontWeight:800, color:"#1c1917", lineHeight:1}}>
            Controle de <span style={{color:"#2563eb"}}>Finanças</span>
          </div>
          <div style={{fontSize:13, color:"#a8a29e", marginTop:6}}>Controle financeiro para casais</div>
        </div>

        {/* Card */}
        <div style={{background:"#fff", border:"1.5px solid #e7e5e4", borderRadius:20, padding:28, boxShadow:"0 2px 12px rgba(0,0,0,.06)"}}>
          <div style={{fontSize:18, fontWeight:700, color:"#1c1917", marginBottom:20}}>
            {mode === "login" ? "Entrar na sua conta" : "Criar conta"}
          </div>

          <div style={{display:"flex", flexDirection:"column", gap:12}}>
            {mode === "register" && (
              <input className="auth-field" placeholder="Nome da família (ex: Família Silva)"
                value={familyName} onChange={e => setFamilyName(e.target.value)} />
            )}
            <input className="auth-field" type="email" placeholder="E-mail"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />
            <input className="auth-field" type="password" placeholder="Senha (mín. 6 caracteres)"
              value={password} onChange={e => setPassword(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSubmit()} />

            {error && (
              <div style={{background:"#fff1f2", border:"1.5px solid #fecdd3", borderRadius:10, padding:"10px 14px", fontSize:13, color:"#e11d48", fontWeight:500}}>
                {error}
              </div>
            )}

            <button className="auth-btn" onClick={handleSubmit} disabled={loading}>
              {loading ? "Aguarde..." : mode === "login" ? "Entrar" : "Criar conta"}
            </button>
          </div>

          <div style={{textAlign:"center", fontSize:13, color:"#78716c", marginTop:18}}>
            {mode === "login" ? (
              <>Não tem conta?{" "}
                <span className="auth-link" onClick={() => { setMode("register"); setError(""); }}>Criar agora</span>
              </>
            ) : (
              <>Já tem conta?{" "}
                <span className="auth-link" onClick={() => { setMode("login"); setError(""); }}>Entrar</span>
              </>
            )}
          </div>
        </div>

        <div style={{textAlign:"center", fontSize:11, color:"#d6d3d1", marginTop:24}}>
          Seus dados são privados e seguros 🔒
        </div>
      </div>
    </div>
  );
}
