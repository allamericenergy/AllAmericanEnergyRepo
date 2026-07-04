import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../../lib/api";

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("superadmin@allamericanenergy.local");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError("");
    try {
      const response = await api.post("/auth/login", { email, password });
      localStorage.setItem("aae_access_token", response.data.accessToken);
      localStorage.setItem("aae_role", response.data.user.role);
      navigate("/");
    } catch {
      setError("Login failed. Check credentials and API availability.");
    }
  }

  return (
    <main className="login-page">
      <form className="login-card" onSubmit={submit}>
        <span className="eyebrow">AllAmericanEnergy CRM</span>
        <h1>Sign in</h1>
        <label>
          Email
          <input value={email} onChange={(event) => setEmail(event.target.value)} type="email" />
        </label>
        <label>
          Password
          <input value={password} onChange={(event) => setPassword(event.target.value)} type="password" />
        </label>
        {error ? <p className="error">{error}</p> : null}
        <button type="submit">Log in</button>
        <a href="mailto:admin@allamericanenergy.local">Request access</a>
      </form>
    </main>
  );
}
