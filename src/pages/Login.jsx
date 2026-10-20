
import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { API_URL } from "../utils/api";
import { GraduationCap, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    const data = new FormData(e.currentTarget);

    const email = String(data.get("email") || "").trim();
    const password = String(data.get("password") || "");

    setLoading(true);

    try {
      const response = await fetch(
        `${API_URL}/api/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error || "Login failed. Please try again."
        );
      }

      const redirectTo = location.state?.from?.pathname || "/dashboard";
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(
        err.message || "Could not connect to the server."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <Link to="/" className="auth-logo">
          <GraduationCap size={30} />
          <span>LearnQuest</span>
        </Link>

        <h1>Welcome Back!</h1>
        <p>Log in to continue your learning journey.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="loginEmail">Email Address</label>

          <input
            id="loginEmail"
            name="email"
            type="email"
            placeholder="name@university.edu"
            autoComplete="email"
            aria-invalid={Boolean(error)}
            required
          />

          <label htmlFor="loginPassword">Password</label>

          <div className="password-field">
            <input
              id="loginPassword"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              autoComplete="current-password"
              aria-invalid={Boolean(error)}
              required
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={
                showPassword ? "Hide password" : "Show password"
              }
            >
              {showPassword ? (
                <EyeOff size={20} />
              ) : (
                <Eye size={20} />
              )}
            </button>
          </div>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="btn-primary auth-submit"
            disabled={loading}
          >
            {loading ? "Logging In..." : "Log In"}
          </button>
        </form>

        <p className="auth-footer">
          Don't have an account?{" "}
          <Link to="/signup">Sign Up</Link>
        </p>
      </div>
    </div>
  );
}
