import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Users,
  FileCode,
  AlertTriangle,
  Clock,
  TrendingUp,
  Upload,
  Download,
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  Filter,
  Eye,
  BookOpen,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import ProfilePhoto from "@/components/ProfilePhoto";
import AccountSettingsDialog from "@/components/AccountSettingsDialog";
import { Input } from "@/components/ui/input";
import { getUser, logout } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

const TeacherDashboard = () => {
  const [user, setUser] = useState(getUser);
  const [settingsOpen, setSettingsOpen] = useState(false);
  useEffect(() => {
    const updateUser = (event: Event) => {
      const updatedUser = (event as CustomEvent<ReturnType<typeof getUser>>).detail;
      setUser(updatedUser);
    };
    window.addEventListener("codexa:user-updated", updateUser);
    return () => window.removeEventListener("codexa:user-updated", updateUser);
  }, []);
  const teacherName = user?.name?.trim() || user?.email?.split("@")[0] || "Teacher";
  const teacherInitials = teacherName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const [activeTab, setActiveTab] = useState("students");
  const [students, setStudents] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');

  useEffect(() => {
    if (activeTab === "students") {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("codexa_token");
      fetch(`${API_BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(res => res.json())
        .then(data => {
          setStudents(data.students);
          setLoading(false);
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [activeTab]);

  useEffect(() => {
    // Fetch submissions on mount
    const token = localStorage.getItem("codexa_token");
    fetch(`${API_BASE_URL}/api/submissions`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        setSubmissions(data.submissions);
      })
      .catch(err => {
        console.error('Failed to fetch submissions:', err);
      });
  }, []);

  const handleAddStudent = async () => {
    if (!newName || !newEmail) return;
    try {
      const token = localStorage.getItem("codexa_token");
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newName, email: newEmail })
      });
      if (response.ok) {
        setNewName('');
        setNewEmail('');
        // Refetch students
        setLoading(true);
        fetch(`${API_BASE_URL}/api/students`, {
          headers: { Authorization: `Bearer ${token}` },
        })
          .then(res => res.json())
          .then(data => {
            setStudents(data.students);
            setLoading(false);
          })
          .catch(err => {
            setError(err.message);
            setLoading(false);
          });
      } else {
        alert('Failed to add student');
      }
    } catch (error) {
      console.error(error);
      alert('Error adding student');
    }
  };

  const totalSubmissions = submissions.length;
  const pendingReview = submissions.filter(s => s.score === null || s.score === undefined).length;
  const averageScore = submissions.filter(s => s.score !== null).length > 0 
    ? Math.round(submissions.filter(s => s.score !== null).reduce((sum, s) => sum + s.score, 0) / submissions.filter(s => s.score !== null).length)
    : 0;

  const stats = [
    { icon: FileCode, label: "Total Submissions", value: totalSubmissions.toString(), change: "", color: "secondary" },
    { icon: AlertTriangle, label: "AI-labeled", value: submissions.filter(s => s.aiLabel === 'AI').length.toString(), change: "", color: "destructive" },
    { icon: Clock, label: "Pending Review", value: pendingReview.toString(), change: "", color: "yellow" },
    { icon: TrendingUp, label: "Average Score", value: `${averageScore}%`, change: "", color: "accent" },
  ];

  const recentSubmissions = submissions.slice(0, 5).map((sub) => ({
    id: sub._id,
    name: sub.studentName,
    assignment: sub.assignmentTitle,
    status: sub.status,
    score: sub.score !== null && sub.score !== undefined ? `${sub.score}/100` : "-",
    time: sub.createdAt ? new Date(sub.createdAt).toLocaleString() : "Unknown",
    aiLabel: sub.aiLabel || null,
    aiConfidence: sub.aiConfidence || null
  }));

  const assignments = [];

  return (
    <div className="min-h-screen bg-background">
      <AccountSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} role="teacher" />
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-4 hidden lg:block">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 mb-8 px-2">
          <BrandLogo className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-foreground">Codexa</span>
        </Link>

        {/* Navigation */}
        <nav className="space-y-1">
          {[
            { icon: TrendingUp, label: "Overview", id: "overview" },
            { icon: BookOpen, label: "My Classes", id: "myclasses", href: "/teacher/classes" },
            { icon: FileCode, label: "Assignments", id: "assignments" },
            { icon: Users, label: "Students", id: "students" },
            { icon: AlertTriangle, label: "Plagiarism Reports", id: "plagiarism" },
            { icon: Settings, label: "Settings", id: "settings" },
          ].map((item) => (
            item.href ? (
              <Link
                key={item.id}
                to={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-secondary/10 text-secondary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ) : (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === "settings") {
                    setSettingsOpen(true);
                  } else {
                    setActiveTab(item.id);
                  }
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  activeTab === item.id
                    ? "bg-secondary/10 text-secondary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </button>
            )
          ))}
        </nav>

        {/* Bottom */}
        <div className="absolute bottom-4 left-4 right-4">
          <Link
            to="/"
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-destructive transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard</h1>
            <p className="text-sm text-muted-foreground">Welcome back, {teacherName}</p>
            {user?.bio && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{user.bio}</p>}
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden md:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search students..." className="pl-10 w-64" />
            </div>
            <Button variant="outline" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <ProfilePhoto initials={teacherInitials} role="teacher" />
          </div>
        </header>

        <div className="p-6">
          {activeTab === "students" ? (
            <div>
              <h2 className="text-2xl font-bold mb-4">Students</h2>
              <div className="mb-4 p-4 bg-muted rounded-lg">
                <h3 className="font-semibold mb-2">Add New Student</h3>
                <div className="flex gap-2 mb-2">
                  <Input
                    placeholder="Name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                  />
                  <Input
                    placeholder="Email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                  />
                </div>
                <Button onClick={handleAddStudent}>Add Student</Button>
              </div>
              {loading && <p>Loading students...</p>}
              {error && <p className="text-red-500">Error: {error}</p>}
              {!loading && !error && students.length === 0 && <p>No students found.</p>}
              {!loading && !error && students.length > 0 && (
                <ul className="space-y-2">
                  {students.map((student, index) => (
                    <li key={index} className="p-4 bg-card rounded-lg border">
                      <p className="font-medium">{student.name}</p>
                      <p className="text-sm text-muted-foreground">{student.email}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : null}
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    stat.color === "secondary" ? "bg-secondary/10 text-secondary" :
                    stat.color === "destructive" ? "bg-destructive/10 text-destructive" :
                    stat.color === "yellow" ? "bg-yellow-500/10 text-yellow-600" :
                    "bg-accent/10 text-accent"
                  }`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                <div className="text-sm text-muted-foreground mt-1">{stat.change}</div>
              </div>
            ))}
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap gap-3 mb-8">
            <Button variant="hero">
              <Upload className="w-4 h-4 mr-2" />
              Create Assignment
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Reports
            </Button>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filter Results
            </Button>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Recent Submissions */}
            <div className="lg:col-span-2 bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Recent Submissions</h3>
                <Button variant="ghost" size="sm">View All</Button>
              </div>
              <div className="divide-y divide-border">
                {recentSubmissions.map((submission) => (
                  <div key={submission.id} className={`px-6 py-4 flex items-center justify-between hover:bg-muted/50 transition-colors ${submission.aiLabel === 'AI' ? 'bg-yellow-500/5 border-l-4 border-l-yellow-500' : ''}`}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-sm font-semibold text-secondary">
                        {submission.name.split(" ").map(n => n[0]).join("")}
                      </div>
                      <div>
                        <p className="font-medium text-foreground">{submission.name}</p>
                        <p className="text-sm text-muted-foreground">{submission.assignment}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {submission.aiLabel && (
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          submission.aiLabel === 'AI' ? 'bg-yellow-500/10 text-yellow-600' : 'bg-accent/10 text-accent'
                        }`}>
                          {submission.aiLabel} ({submission.aiConfidence ? Math.round(submission.aiConfidence * 100) : 0}%)
                        </span>
                      )}
                      <span className="text-xs px-3 py-1 rounded-full font-medium bg-muted text-muted-foreground">
                        {submission.status}
                      </span>
                      <span className="text-sm font-medium text-foreground w-16 text-right">{submission.score}</span>
                      <Link
                        to={`/teacher/submission/${submission.id}`}
                        aria-label={`View ${submission.name}'s submission report`}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-md px-3 text-sm font-medium text-secondary hover:bg-secondary/10"
                      >
                        <Eye className="w-4 h-4" />
                        {submission.score === "-" ? "Grade" : "Review"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Assignments */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold text-foreground">Active Assignments</h3>
                <Button variant="ghost" size="sm">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </div>
              <div className="p-4 space-y-3">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 bg-muted/50 rounded-xl">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-medium text-foreground">{assignment.name}</p>
                        <p className="text-sm text-muted-foreground">{assignment.course}</p>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        assignment.status === "active" ? "bg-accent/10 text-accent" : "bg-muted text-muted-foreground"
                      }`}>
                        {assignment.status}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{assignment.submissions} submissions</span>
                      <span className="text-muted-foreground">Due: {assignment.deadline}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Plagiarism Heatmap */}
          <div className="mt-6 bg-card rounded-2xl border border-border p-6">
            <h3 className="font-semibold text-foreground mb-4">Plagiarism Overview - This Week</h3>
            <div className="grid grid-cols-10 lg:grid-cols-20 gap-1">
              {Array.from({ length: 40 }).map((_, i) => {
                const rand = Math.random();
                return (
                  <div
                    key={i}
                    className={`h-8 rounded ${
                      rand > 0.85 ? "bg-destructive/70" :
                      rand > 0.6 ? "bg-yellow-500/50" :
                      "bg-accent/30"
                    }`}
                    title={`Student ${i + 1}`}
                  />
                );
              })}
            </div>
            <div className="flex items-center gap-6 mt-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-accent/30" /> Low (0-30%)</span>
              <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-yellow-500/50" /> Medium (30-70%)</span>
              <span className="flex items-center gap-2"><span className="w-4 h-4 rounded bg-destructive/70" /> High (70%+)</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default TeacherDashboard;
