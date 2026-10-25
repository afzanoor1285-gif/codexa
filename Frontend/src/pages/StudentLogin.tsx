import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight, GraduationCap } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const StudentLogin = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState("");
  const [degree, setDegree] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", degree: "", email: "", password: "" });
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
  const degreeOptions = [
    { value: "BSCS", label: "BCS / BS Computer Science" },
    { value: "BSAI", label: "BS Artificial Intelligence (AI)" },
    { value: "BSSE", label: "BS Software Engineering (BSSE)" },
    { value: "BSIT", label: "BS Information Technology (BSIT)" },
    { value: "BSDS", label: "BS Data Science" },
    { value: "BSCY", label: "BS Cyber Security" },
    { value: "BSCE", label: "BS Computer Engineering" },
    { value: "BEE", label: "BS Electrical Engineering (BEE)" },
    { value: "BSEE", label: "BS Electronics Engineering" },
    { value: "BSTE", label: "BS Telecom Engineering" },
    { value: "BSCSE", label: "BS Computer Systems Engineering" },
    { value: "OTHER", label: "Other" },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({ name: "", degree: "", email: "", password: "" });

    const nextErrors = { name: "", degree: "", email: "", password: "" };
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email.trim()) {
      nextErrors.email = "Email is required.";
    } else if (!emailRegex.test(email.trim())) {
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
    if (nextErrors.name || nextErrors.degree || nextErrors.email || nextErrors.password) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/login" : "/signup";
      const body: { email: string; password: string; role: "student"; name?: string; degree?: string } = {
        email: email.trim().toLowerCase(),
        password,
        role: "student", // Always send role so backend can validate
      };
      if (!isLogin) {
        body.name = name.trim();
      }
      if (!isLogin && degree) {
        body.degree = degree;
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

      if (!data.token || data.user?.role !== "student") {
        setError("This account could not be verified as a Student.");
        return;
      }

      localStorage.setItem("codexa_token", data.token);
      localStorage.setItem("codexa_user", JSON.stringify(data.user));

      // Student should always go to Student Dashboard
      navigate("/student/dashboard");
    } catch (err) {
      setError("Network error. Please try again.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Left Side - Decorative */}
      <div className="hidden lg:flex flex-1 bg-secondary items-center justify-center p-12">
        <div className="max-w-lg text-center">
          <div className="w-20 h-20 rounded-2xl bg-white/10 flex items-center justify-center mx-auto mb-8">
            <GraduationCap className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">
            Learn & Improve
          </h2>
          <p className="text-white/70 text-lg leading-relaxed">
            Get detailed feedback on your assignments, understand where you went
            wrong, and track your progress throughout the course.
          </p>
          <div className="flex items-center justify-center gap-8 mt-10 text-white/60">
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Clear</div>
              <div className="text-sm">Feedback</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Fair</div>
              <div className="text-sm">Grading</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white">Fast</div>
              <div className="text-sm">Results</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
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
              {isLogin ? "Welcome back, Student" : "Create Student Account"}
            </h1>
            <p className="text-muted-foreground">
              {isLogin
                ? "Sign in with your student email and password. Department is not needed."
                : "Create an account with the same email your teacher added to the class. Department is optional."}
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
                  placeholder="afza noor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-12"
                  required
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
                  placeholder="student@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-12 pl-12"
                  required
                />
                {fieldErrors.email && <p className="text-destructive text-sm">{fieldErrors.email}</p>}
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="degree">Degree / Department (optional)</Label>
                <select
                  id="degree"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choose later / not provided</option>
                  {degreeOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {fieldErrors.degree && <p className="text-destructive text-sm">{fieldErrors.degree}</p>}
              </div>
            )}

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
                  required
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

            <Button type="submit" className="w-full h-12 bg-secondary hover:bg-secondary/90 text-white" disabled={loading}>
              {loading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </form>

          {/* Toggle */}
          <p className="text-center text-muted-foreground mt-6">
            {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              onClick={() => {
                setIsLogin((current) => !current);
                setError("");
                setFieldErrors({ name: "", degree: "", email: "", password: "" });
              }}
              className="text-secondary font-semibold hover:underline"
            >
              {isLogin ? "Sign up" : "Sign in"}
            </button>
          </p>

          {/* Teacher Link */}
          <p className="text-center text-muted-foreground mt-4 text-sm">
            Are you a teacher?{" "}
            <Link to="/teacher/login" className="text-secondary hover:underline">
              Login here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};

export default StudentLogin;
