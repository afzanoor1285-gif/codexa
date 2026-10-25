import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getUser, logout } from "@/lib/auth";
import { ArrowRight, LogOut, ShieldCheck, BookOpen, ClipboardCheck } from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();

  const user = useMemo(() => getUser(), []);
  const roleLabel = user?.role === "teacher" ? "Teacher" : "Student";

  const handleSignOut = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Codexa Dashboard</p>
              <h1 className="mt-3 text-4xl font-semibold text-white">Welcome back, {user?.email ?? "Codexa user"}</h1>
              <p className="mt-3 max-w-2xl text-slate-400">
                You are signed in as a {roleLabel}. This dashboard is protected by JWT authentication and will stay secured until you sign out.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button variant="outline" onClick={handleSignOut} className="gap-2">
                <LogOut className="h-4 w-4" />
                Sign out
              </Button>
              <Button className="gap-2" onClick={() => navigate("/student/submit")}> 
                <ArrowRight className="h-4 w-4" />
                Continue
              </Button>
            </div>
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/10 text-cyan-300">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm text-slate-400">Secure token storage</p>
              <p className="mt-3 text-2xl font-semibold text-white">JWT in localStorage</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/10 text-violet-300">
                <BookOpen className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm text-slate-400">Role-aware experience</p>
              <p className="mt-3 text-2xl font-semibold text-white">{roleLabel} access</p>
            </div>
            <div className="rounded-3xl border border-white/10 bg-slate-900 p-6">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                <ClipboardCheck className="h-5 w-5" />
              </div>
              <p className="mt-5 text-sm text-slate-400">Protected route</p>
              <p className="mt-3 text-2xl font-semibold text-white">Secure access</p>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-white/10 bg-slate-900 p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm text-slate-400">Current role</p>
                <p className="mt-1 text-xl font-semibold text-white">{roleLabel}</p>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-slate-200">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                Active session
              </div>
            </div>
            <div className="mt-6 rounded-3xl border border-white/10 bg-slate-950 p-5">
              <p className="text-sm text-slate-400">If you want to manage assignments, continue to the student submission page or sign out to switch accounts.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
