import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const TeacherLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "" });
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({ name: "", email: "", password: "" });

    const nextErrors = { name: "", email: "", password: "" };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailRegex.test(email)) {
      nextErrors.email = "Please enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Password is required.";
    } else if (!/^[0-9]{6}$/.test(password)) {
      nextErrors.password = "Password must contain exactly six numeric digits.";
    }

    if (!isLogin && !name.trim()) {
      nextErrors.name = "Full name is required.";
    }

    if (nextErrors.name || nextErrors.email || nextErrors.password) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/login" : "/signup";
      const body: { email: string; password: string; role: "teacher"; name?: string } = {
        email: email.trim().toLowerCase(),
        password,
        role: "teacher", // Always send role so backend can validate
      };
      if (!isLogin) {
        body.name = name.trim();
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.error || data.message || "Unable to submit form.");
        return;
      }

      if (!data.token || data.user?.role !== "teacher") {
        setError("This account could not be verified as a Teacher.");
        return;
      }

      localStorage.setItem("codexa_token", data.token);
      localStorage.setItem("codexa_user", JSON.stringify(data.user));

      // Teacher should always go to Teacher Dashboard
      navigate("/teacher/dashboard");

    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 mb-8">
            <BrandLogo className="w-10 h-10 object-contain" />
            <span className="text-2xl font-bold text-foreground">Codexa</span>
          </Link>

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {isLogin ? "Welcome back, Teacher" : "Create Teacher Account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Sign in to access your dashboard and manage assignments"
                : "Join Codexa to streamline your grading workflow"}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Dr. John Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                />
                {fieldErrors.name && <p className="text-destructive text-sm">{fieldErrors.name}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="teacher@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-12"
                />
                {fieldErrors.email && <p className="text-destructive text-sm">{fieldErrors.email}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  maxLength={6}
                  inputMode="numeric"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  className="h-12 pl-12"
                />
                {fieldErrors.password && <p className="text-destructive text-sm">{fieldErrors.password}</p>}
              </div>
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <Link to="#" className="text-sm text-secondary hover:underline">
                  Forgot password?
                </Link>
              </div>
            )}

            {error && <p className="text-destructive text-sm">{error}</p>}

            <Button type="submit" variant="hero" size="lg" className="w-full" disabled={loading}>
              {loading ? "Loading..." : isLogin ? "Sign In" : "Create Account"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-secondary font-semibold hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>

          {/* Student Link */}
          <p className="text-center text-muted-foreground mt-4 text-sm">
            Are you a student?{" "}
            <Link to="/student/login" className="text-secondary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>

      {/* Right Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-primary items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <BrandLogo className="w-20 h-20 object-contain mx-auto mb-8" />
          <h2 className="text-3xl font-bold text-white mb-4">
            Empower Your Teaching
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Detect plagiarism, automate grading, and provide meaningful feedback
            to your students—all in one powerful platform.
          </p>
          <div className="flex items-center justify-center gap-8 mt-10 text-white/60">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">70%</div>
              <div className="text-sm">Less Grading Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">99%</div>
              <div className="text-sm">Detection Accuracy</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">500+</div>
              <div className="text-sm">Universities</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherLogin;
