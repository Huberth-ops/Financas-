import React, { useState, useEffect } from "react";
import ReactDOM from "react-dom/client";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import App from "./App.jsx";
import Auth from "./Auth.jsx";

function Root() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u || null));
    return () => unsub();
  }, []);

  if (user === undefined) return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:"100vh", background:"#f8f7f4", fontFamily:"'Instrument Sans',sans-serif", fontSize:14, color:"#a8a29e" }}>
      Carregando...
    </div>
  );

  if (!user) return <Auth />;
  return <App user={user} onSignOut={() => signOut(auth)} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode><Root /></React.StrictMode>
);
