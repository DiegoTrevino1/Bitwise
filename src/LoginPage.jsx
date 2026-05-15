import { useState } from "react";
import "./LoginPage.css";
import { apiFetch, saveToken } from "./api";

function LoginPage({ onBack, onLoginSuccess }) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
  };

  const handleSubmit = async () => {
    setError(null);
    if (!username.trim() || !password) {
      setError("Username and password are required.");
      return;
    }
    if (mode === "register" && password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const data = await apiFetch(path, {
        method: "POST",
        body: JSON.stringify({ username: username.trim(), password }),
      });
      saveToken(data.token);
      onLoginSuccess?.(data.user);
    } catch (e) {
      setError(e.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-shell">
      <div className="auth-card">
        <div className="auth-header">
          <div className="logo">
            <div className="logo-icon">CWU</div>
            <div>
              <div className="logo-text">ARCHQUEST</div>
              <div className="logo-sub">CWU · Computer Architecture</div>
            </div>
          </div>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === "login" ? "active" : ""}
            onClick={() => switchMode("login")}
          >
            Login
          </button>
          <button
            className={mode === "register" ? "active" : ""}
            onClick={() => switchMode("register")}
          >
            Register
          </button>
        </div>

        <div className="auth-body">
          {/* USERNAME (for both login + register) */}
          <div className="input-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          {/* PASSWORD */}
          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onKeyDown={(e) => mode === "login" && e.key === "Enter" && handleSubmit()}
            />
          </div>

          {/* CONFIRM PASSWORD (register only) */}
          {mode === "register" && (
            <div className="input-group">
              <label>Confirm Password</label>
              <input
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          )}

          {error && (
            <div style={{ color: "var(--red)", fontSize: "13px", marginBottom: "8px" }}>
              {error}
            </div>
          )}

          <button className="auth-btn" onClick={handleSubmit} disabled={busy}>
            {busy ? "…" : mode === "login" ? "Log In" : "Create Account"}
          </button>

          <button className="auth-back" onClick={onBack}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
