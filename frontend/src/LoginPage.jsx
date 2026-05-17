import { useState } from "react";
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
    <div className="bw-auth-shell">
      <div className="bw-auth-card">
        <div className="bw-auth-header">
          <div className="bw-logo">
            <div className="bw-logo-icon">⚡</div>
            <div>
              <div className="bw-logo-name">Bitwise</div>
              <div className="bw-logo-sub">CWU · Computer Architecture</div>
            </div>
          </div>
        </div>

        <div className="bw-auth-tabs">
          <button
            className={`bw-auth-tab${mode === "login" ? " on" : ""}`}
            onClick={() => switchMode("login")}
          >
            Log in
          </button>
          <button
            className={`bw-auth-tab${mode === "register" ? " on" : ""}`}
            onClick={() => switchMode("register")}
          >
            Register
          </button>
        </div>

        <div className="bw-auth-body">
          <div className="bw-input-group">
            <label className="bw-input-label">Username</label>
            <input
              className="bw-input"
              type="text"
              placeholder="Enter username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
            />
          </div>

          <div className="bw-input-group">
            <label className="bw-input-label">Password</label>
            <input
              className="bw-input"
              type="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onKeyDown={(e) => mode === "login" && e.key === "Enter" && handleSubmit()}
            />
          </div>

          {mode === "register" && (
            <div className="bw-input-group">
              <label className="bw-input-label">Confirm Password</label>
              <input
                className="bw-input"
                type="password"
                placeholder="Confirm password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              />
            </div>
          )}

          {error && <div className="bw-auth-err">{error}</div>}

          <button className="bw-auth-submit" onClick={handleSubmit} disabled={busy}>
            {busy ? "…" : mode === "login" ? "Log In" : "Create Account"}
          </button>

          <button className="bw-auth-back" onClick={onBack}>
            ← Back to Home
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
