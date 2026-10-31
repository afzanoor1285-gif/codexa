import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mail, Lock, ArrowRight, GraduationCap } from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { STUDENT_PROGRAMS, STUDENT_SEMESTERS } from "@/lib/student-programs";

const StudentLogin = () => {
  const [searchParams] = useSearchParams();
  const inviteClassId = searchParams.get("join");
  const [isLogin, setIsLogin] = useState(!inviteClassId || searchParams.get("register") !== "1");
  const [name, setName] = useState("");
  const [degree, setDegree] = useState(searchParams.get("degree") || "");
  const [semester, setSemester] = useState(searchParams.get("semester") || "");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", degree: "", semester: "", email: "", password: "" });
  const navigate = useNavigate();
  const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
  const switchAuthMode = (loginMode: boolean) => {
    setIsLogin(loginMode);
    setError("");
    setFieldErrors({ name: "", degree: "", semester: "", email: "", password: "" });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({ name: "", degree: "", semester: "", email: "", password: "" });

    const nextErrors = { name: "", degree: "", semester: "", email: "", password: "" };
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
    if (!isLogin && !degree) {
      nextErrors.degree = "Please select your degree / department.";
    }
    if (!isLogin && !semester) {
      nextErrors.semester = "Please select your current semester.";
    }
    if (nextErrors.name || nextErrors.degree || nextErrors.semester || nextErrors.email || nextErrors.password) {
      setFieldErrors(nextErrors);
      return;
    }

    setLoading(true);
    try {
      const endpoint = isLogin ? "/login" : "/signup";
      const body: { email: string; password: string; role: "student"; name?: string; degree?: string; semester?: number } = {
        email: email.trim().toLowerCase(),
        password,
        role: "student", // Always send role so backend can validate
      };
      if (!isLogin) {
        body.name = name.trim();
      }
      if (!isLogin) {
        body.degree = degree;
        body.semester = Number(semester);
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();
      if (!response.ok) {
        const requestError = data.error || data.message || "Unable to submit form.";
        if (!isLogin && requestError.toLowerCase().includes("already registered")) {
          switchAuthMode(true);
          setError(inviteClassId
            ? "This email already has an account. Sign in to join the class."
            : "This email already has an account. Sign in to continue.");
          return;
        }
        setError(requestError);
        return;
      }

      if (!data.token || data.user?.role !== "student") {
        setError("This account could not be verified as a Student.");
        return;
      }

      localStorage.setItem("codexa_token", data.token);
      localStorage.setItem("codexa_user", JSON.stringify(data.user));

      if (inviteClassId) {
        try {
          const enrollmentResponse = await fetch(
            `${API_BASE_URL}/api/classes/${encodeURIComponent(inviteClassId)}/enroll`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${data.token}` },
            },
          );
          const enrollmentData = await enrollmentResponse.json();
          if (!enrollmentResponse.ok) {
            navigate(`/student/courses?joinError=${encodeURIComponent(enrollmentData.error || "Unable to join this class.")}`);
            return;
          }
        } catch {
          navigate(`/student/courses?joinError=${encodeURIComponent("Your account is ready, but enrollment couldn't be completed. Try joining from My Courses.")}`);
          return;
        }
      }
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
                ? "Sign in with your student email and 6-digit password."
                : "Choose your program and semester so we can show you the right classes."}
            </p>
          </div>

          {inviteClassId && (
            <p className="mb-5 rounded-lg border border-secondary/20 bg-secondary/5 p-3 text-sm text-muted-foreground">
              Your teacher invited you to a class. Sign in or create your account to join it.
            </p>
          )}

          <div className="mb-6 grid grid-cols-2 rounded-lg bg-muted p-1" aria-label="Student account action">
            {[{ login: true, label: "Sign in" }, { login: false, label: "Create account" }].map((option) => (
              <button
                key={option.label}
                type="button"
                aria-pressed={isLogin === option.login}
                onClick={() => switchAuthMode(option.login)}
                className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  isLogin === option.login
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
          <p className="mb-5 text-sm text-muted-foreground">
            {isLogin
              ? "New to Codexa? Choose Create account, then select your program and semester. Matching classes will appear on your dashboard."
              : "After registration, matching classes will appear on your dashboard. Join the right class there."}
          </p>

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
                <Label htmlFor="degree">Degree / Department</Label>
                <select
                  id="degree"
                  value={degree}
                  onChange={(e) => setDegree(e.target.value)}
                  className="h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select your program</option>
                  {STUDENT_PROGRAMS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
                {fieldErrors.degree && <p className="text-destructive text-sm">{fieldErrors.degree}</p>}
              </div>
            )}

            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="semester">Current semester</Label>
                <select
                  id="semester"
                  value={semester}
                  onChange={(event) => setSemester(event.target.value)}
                  className="h-12 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                >
                  <option value="">Select your semester</option>
                  {STUDENT_SEMESTERS.map((value) => (
                    <option key={value} value={value}>Semester {value}</option>
                  ))}
                </select>
                {fieldErrors.semester && <p className="text-destructive text-sm">{fieldErrors.semester}</p>}
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
                <p className="text-xs text-muted-foreground">Use exactly 6 numbers, for example 123456.</p>
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
              onClick={() => switchAuthMode(!isLogin)}
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
