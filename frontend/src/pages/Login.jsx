import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();

    setError("");
    setSubmitting(true);

    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your email and password."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">

        <div className="login-brand">
          <div className="brand-badge">EDABIP</div>

          <h1>Enterprise Data Analytics</h1>

          <p>
            Business Intelligence Dashboard for monitoring enterprise
            performance, metrics and departmental analytics.
          </p>

          <div className="login-feature">
            ✓ Business Intelligence Analytics
          </div>

          <div className="login-feature">
            ✓ Real-time Activity Monitoring
          </div>

          <div className="login-feature">
            ✓ Department Performance Insights
          </div>
        </div>

        <div className="login-card">
          <div className="login-card-header">
            <span>EDABIP Mini</span>
            <h2>Welcome Back</h2>
            <p>Sign in to access your analytics dashboard</p>
          </div>

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Email Address</label>

              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
              />
            </div>

            {error && (
              <div className="login-error">
                {error}
              </div>
            )}

            <button
              className="login-button"
              type="submit"
              disabled={submitting}
            >
              {submitting ? "Signing in..." : "Sign In"}
            </button>

          </form>

          <p className="login-footer">
            Enterprise Data Analytics & Business Intelligence Platform
          </p>
        </div>

      </div>
    </div>
  );
}

export default Login;