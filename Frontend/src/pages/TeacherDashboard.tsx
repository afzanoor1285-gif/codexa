import { useState, useEffect, useMemo } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  FileCode,
  AlertTriangle,
  Clock,
  TrendingUp,
  PlusCircle,
  Download,
  Search,
  Eye,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  GraduationCap,
} from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";
import { Input } from "@/components/ui/input";
import { getToken } from "@/lib/auth";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  getStudentProgramLabel,
  STUDENT_SEMESTERS,
  STUDENT_PROGRAMS,
  UNSPECIFIED_PROGRAM,
} from "@/lib/student-programs";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

interface Student {
  name: string;
  email: string;
  degree?: string | null;
  semester?: number | null;
}

interface ClassItem {
  id: string;
  _id?: string;
  name: string;
  code: string;
  section?: string;
  studentCount?: number;
  student_emails?: string[];
}

interface AssignmentItem {
  id: string;
  _id?: string;
  title: string;
  name?: string;
  course: string;
  course_name?: string;
  deadline?: string | null;
  description?: string;
  assignment_number?: number;
}

interface SubmissionItem {
  id: string;
  _id?: string;
  student_name?: string;
  studentName?: string;
  student_email?: string;
  studentEmail?: string;
  assignment_title?: string;
  assignmentTitle?: string;
  assignment_id?: string;
  class_id?: string;
  status: string;
  score: number | null;
  aiLabel?: "AI" | "Human" | null;
  aiConfidence?: number | null;
  aiPercentage?: number | null;
  humanPercentage?: number | null;
  submitted_at?: string;
  createdAt?: string;
}

const TeacherDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [classPickerOpen, setClassPickerOpen] = useState(false);

  const tabParam = searchParams.get("tab") as "overview" | "assignments" | "students" | "plagiarism" | null;
  const [activeTab, setActiveTab] = useState<"overview" | "assignments" | "students" | "plagiarism">(
    tabParam || "overview"
  );

  useEffect(() => {
    if (tabParam && ["overview", "assignments", "students", "plagiarism"].includes(tabParam)) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);

  const handleTabChange = (tab: "overview" | "assignments" | "students" | "plagiarism") => {
    setActiveTab(tab);
    if (tab === "overview") {
      setSearchParams({});
    } else {
      setSearchParams({ tab });
    }
  };

  const [students, setStudents] = useState<Student[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionItem[]>([]);
  const [classes, setClasses] = useState<ClassItem[]>([]);
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters & search
  const [searchQuery, setSearchQuery] = useState("");
  const [submissionFilter, setSubmissionFilter] = useState<"all" | "ai" | "human" | "pending" | "graded">("all");
  const [studentProgramFilter, setStudentProgramFilter] = useState("all");

  // New student form
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDegree, setNewDegree] = useState("");
  const [newSemester, setNewSemester] = useState("");

  // Load classes, assignments, and submissions on mount
  useEffect(() => {
    const token = getToken();
    if (!token) return;

    const headers = { Authorization: `Bearer ${token}` };

    fetch(`${API_BASE_URL}/api/submissions`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.submissions) setSubmissions(data.submissions);
      })
      .catch((err) => console.error("Failed to fetch submissions:", err));

    fetch(`${API_BASE_URL}/api/classes`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.classes) setClasses(data.classes);
      })
      .catch((err) => console.error("Failed to fetch classes:", err));

    fetch(`${API_BASE_URL}/assignments/`, { headers })
      .then((res) => res.json())
      .then((data) => {
        if (data.assignments) setAssignments(data.assignments);
      })
      .catch((err) => console.error("Failed to fetch assignments:", err));
  }, []);

  // Load students when students tab is active
  useEffect(() => {
    if (activeTab === "students" && students.length === 0) {
      setLoading(true);
      const token = getToken();
      fetch(`${API_BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then(async (res) => {
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Unable to load students");
          return data;
        })
        .then((data) => {
          setStudents(data.students || []);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setLoading(false);
        });
    }
  }, [activeTab, students.length]);

  const handleAddStudent = async () => {
    if (!newName.trim() || !newEmail.trim() || !newDegree || !newSemester) return;
    try {
      const token = getToken();
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: newName.trim(),
          email: newEmail.trim(),
          degree: newDegree,
          semester: Number(newSemester),
        }),
      });
      if (response.ok) {
        setNewName("");
        setNewEmail("");
        setNewDegree("");
        setNewSemester("");
        const res = await fetch(`${API_BASE_URL}/api/students`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setStudents(data.students || []);
      } else {
        alert("Failed to add student");
      }
    } catch (error) {
      console.error(error);
      alert("Error adding student");
    }
  };

  const classMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const cls of classes) {
      const id = cls.id || cls._id || "";
      map.set(id, `${cls.name} (${cls.code})`);
    }
    return map;
  }, [classes]);

  // Derived statistics
  const totalSubmissions = submissions.length;
  const aiSubmissions = submissions.filter((s) => s.aiLabel === "AI");
  const humanSubmissions = submissions.filter((s) => s.aiLabel === "Human");
  const pendingReview = submissions.filter((s) => s.score === null || s.score === undefined);
  const gradedSubmissions = submissions.filter((s) => typeof s.score === "number" && !isNaN(s.score));
  const averageScore =
    gradedSubmissions.length > 0
      ? Math.round(gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / gradedSubmissions.length)
      : null;

  const humanPercent = totalSubmissions > 0 ? Math.round((humanSubmissions.length / totalSubmissions) * 100) : 100;
  const aiPercent = totalSubmissions > 0 ? Math.round((aiSubmissions.length / totalSubmissions) * 100) : 0;

  // Filtered submissions
  const filteredSubmissions = useMemo(() => {
    return submissions.filter((sub) => {
      const name = (sub.student_name || sub.studentName || "").toLowerCase();
      const email = (sub.student_email || sub.studentEmail || "").toLowerCase();
      const title = (sub.assignment_title || sub.assignmentTitle || "").toLowerCase();
      const q = searchQuery.trim().toLowerCase();

      const matchesSearch = !q || name.includes(q) || email.includes(q) || title.includes(q);
      if (!matchesSearch) return false;

      if (submissionFilter === "ai") return sub.aiLabel === "AI";
      if (submissionFilter === "human") return sub.aiLabel === "Human";
      if (submissionFilter === "pending") return sub.score === null || sub.score === undefined;
      if (submissionFilter === "graded") return typeof sub.score === "number";
      return true;
    });
  }, [submissions, searchQuery, submissionFilter]);

  // Filtered students
  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const matchesProgram =
        studentProgramFilter === "all" || (student.degree || UNSPECIFIED_PROGRAM) === studentProgramFilter;
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q || student.name.toLowerCase().includes(q) || student.email.toLowerCase().includes(q);
      return matchesProgram && matchesSearch;
    });
  }, [students, studentProgramFilter, searchQuery]);

  const handleExportCSV = () => {
    if (submissions.length === 0) {
      alert("No submissions available to export.");
      return;
    }
    const headers = [
      "Student Name",
      "Student Email",
      "Assignment",
      "Status",
      "Score",
      "AI Detection",
      "AI Confidence",
      "Human Originality %",
      "Submitted At",
    ];
    const rows = submissions.map((s) => [
      `"${s.student_name || s.studentName || "Student"}"`,
      `"${s.student_email || s.studentEmail || ""}"`,
      `"${s.assignment_title || s.assignmentTitle || "Assignment"}"`,
      `"${s.status || "Submitted"}"`,
      s.score !== null && s.score !== undefined ? `${s.score}` : "Not Graded",
      `"${s.aiLabel || "Unchecked"}"`,
      s.aiConfidence ? `${Math.round(s.aiConfidence * 100)}%` : "N/A",
      s.humanPercentage !== null && s.humanPercentage !== undefined ? `${s.humanPercentage}%` : "N/A",
      `"${s.submitted_at || s.createdAt || ""}"`,
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `codexa_submissions_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCreateAssignmentClick = () => {
    if (classes.length === 0) {
      navigate("/teacher/classes");
    } else if (classes.length === 1) {
      navigate(`/teacher/classes/${classes[0].id || classes[0]._id}/assignments/new`);
    } else {
      setClassPickerOpen(true);
    }
  };

  return (
    <TeacherLayout
      title="Teacher Dashboard"
      subtitle="Overview of classes, submissions, and code integrity audits"
      activeNav={activeTab}
      actions={
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search submissions or students..."
            className="pl-9 h-8 w-60 text-xs"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      }
    >
      {/* Class Selection Dialog for Creating Assignment */}
      <Dialog open={classPickerOpen} onOpenChange={setClassPickerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Select Class</DialogTitle>
            <DialogDescription>
              Choose which class you want to create an assignment for.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-3">
            {classes.map((c) => (
              <button
                key={c.id || c._id}
                onClick={() => {
                  setClassPickerOpen(false);
                  navigate(`/teacher/classes/${c.id || c._id}/assignments/new`);
                }}
                className="w-full flex items-center justify-between p-3 rounded-lg border border-border/80 hover:bg-muted/80 transition-colors text-left"
              >
                <div>
                  <p className="font-semibold text-sm text-foreground">{c.name}</p>
                  <p className="text-xs text-muted-foreground">{c.code} · {c.studentCount || 0} students</p>
                </div>
                <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-6">
        {/* TAB 1: OVERVIEW */}
        {activeTab === "overview" && (
          <>
            {/* Stats KPIs */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-card rounded-xl p-5 border border-border/80 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                    <FileCode className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Submissions
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">{totalSubmissions}</div>
                <div className="text-xs text-muted-foreground mt-1">Across all active classes</div>
              </div>

              <div className="bg-card rounded-xl p-5 border border-border/80 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    AI-Flagged
                  </span>
                </div>
                <div className="text-2xl font-bold text-destructive">{aiSubmissions.length}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {totalSubmissions > 0 ? `${aiPercent}% flagged by ML detector` : "No submissions yet"}
                </div>
              </div>

              <div className="bg-card rounded-xl p-5 border border-border/80 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Pending Review
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">{pendingReview.length}</div>
                <div className="text-xs text-muted-foreground mt-1">Ungraded student codes</div>
              </div>

              <div className="bg-card rounded-xl p-5 border border-border/80 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Average Score
                  </span>
                </div>
                <div className="text-2xl font-bold text-foreground">
                  {averageScore !== null ? `${averageScore}%` : "—"}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {gradedSubmissions.length > 0 ? `${gradedSubmissions.length} graded assignments` : "No graded papers"}
                </div>
              </div>
            </div>

            {/* Action Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-3 rounded-xl border border-border/80 shadow-sm">
              <div className="flex flex-wrap items-center gap-2">
                <Button onClick={handleCreateAssignmentClick} className="gap-2 text-xs h-8">
                  <PlusCircle className="w-3.5 h-3.5" />
                  Create Assignment
                </Button>
                <Button variant="outline" onClick={handleExportCSV} className="gap-2 text-xs h-8">
                  <Download className="w-3.5 h-3.5" />
                  Export CSV
                </Button>
                <Link to="/teacher/classes">
                  <Button variant="outline" className="gap-2 text-xs h-8">
                    <BookOpen className="w-3.5 h-3.5" />
                    Manage Classes
                  </Button>
                </Link>
              </div>

              {/* Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
                <span className="text-muted-foreground mr-1 hidden sm:inline">Filter:</span>
                {(
                  [
                    ["all", "All"],
                    ["ai", "AI Flagged"],
                    ["human", "Human"],
                    ["pending", "Pending"],
                    ["graded", "Graded"],
                  ] as const
                ).map(([fKey, label]) => (
                  <button
                    key={fKey}
                    onClick={() => setSubmissionFilter(fKey)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      submissionFilter === fKey
                        ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                        : "text-muted-foreground hover:bg-muted/80"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Real Code Originality & Integrity Distribution */}
            <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                <div>
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-500" />
                    Code Integrity & Plagiarism Distribution
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time analysis powered by AST structural syntax tree & lexical stylometrics
                  </p>
                </div>
                <div className="flex items-center gap-4 text-xs font-medium">
                  <span className="flex items-center gap-1.5 text-emerald-500">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    Human: {humanPercent}% ({humanSubmissions.length})
                  </span>
                  <span className="flex items-center gap-1.5 text-destructive">
                    <span className="w-2 h-2 rounded-full bg-destructive" />
                    AI Flagged: {aiPercent}% ({aiSubmissions.length})
                  </span>
                </div>
              </div>

              {totalSubmissions > 0 ? (
                <div className="space-y-3">
                  <div className="w-full h-2.5 rounded-full bg-muted flex overflow-hidden">
                    <div
                      style={{ width: `${humanPercent}%` }}
                      className="bg-emerald-500 transition-all duration-500"
                      title={`Human Verified: ${humanPercent}%`}
                    />
                    <div
                      style={{ width: `${aiPercent}%` }}
                      className="bg-destructive transition-all duration-500"
                      title={`AI Flagged: ${aiPercent}%`}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                      <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Original Student Code</p>
                      <p className="text-base font-bold text-foreground mt-0.5">{humanSubmissions.length} files</p>
                      <p className="text-[11px] text-muted-foreground">Within authentic human originality bounds</p>
                    </div>
                    <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                      <p className="text-xs text-destructive font-medium">Suspicious AI Synthesized</p>
                      <p className="text-base font-bold text-foreground mt-0.5">{aiSubmissions.length} files</p>
                      <p className="text-[11px] text-muted-foreground">Elevated AST syntactic & stylometric flags</p>
                    </div>
                    <div className="p-3 rounded-lg bg-muted/40 border border-border/80">
                      <p className="text-xs text-muted-foreground font-medium">Review Pipeline</p>
                      <p className="text-base font-bold text-foreground mt-0.5">{pendingReview.length} pending</p>
                      <p className="text-[11px] text-muted-foreground">Awaiting teacher grading or comment</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No code submissions logged yet. Once students submit their code, integrity distributions will render here automatically.
                </div>
              )}
            </div>

            {/* Main Content Grid: Submissions + Active Assignments */}
            <div className="grid lg:grid-cols-3 gap-6">
              {/* Recent Submissions Table */}
              <div className="lg:col-span-2 bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
                <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Recent Submissions</h2>
                    <p className="text-xs text-muted-foreground">
                      {filteredSubmissions.length} of {totalSubmissions} submissions shown
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleTabChange("plagiarism")} className="text-xs h-8">
                    View Reports
                  </Button>
                </div>

                <div className="divide-y divide-border/60 overflow-y-auto max-h-[500px]">
                  {filteredSubmissions.length === 0 ? (
                    <div className="p-8 text-center text-xs text-muted-foreground">
                      No submissions match the current filter.
                    </div>
                  ) : (
                    filteredSubmissions.slice(0, 10).map((sub) => {
                      const sName = sub.student_name || sub.studentName || sub.student_email || "Student";
                      const aTitle = sub.assignment_title || sub.assignmentTitle || "Assignment";
                      const initials = sName
                        .split(" ")
                        .map((n) => n[0])
                        .filter(Boolean)
                        .join("")
                        .slice(0, 2)
                        .toUpperCase();
                      const isAI = sub.aiLabel === "AI";
                      const subId = sub.id || sub._id;

                      return (
                        <div
                          key={subId}
                          className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/40 transition-colors ${
                            isAI ? "border-l-4 border-l-destructive bg-destructive/5" : ""
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-muted border border-border/80 flex items-center justify-center text-xs font-semibold text-foreground shrink-0">
                              {initials || "ST"}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-xs sm:text-sm text-foreground truncate">{sName}</p>
                              <p className="text-xs text-muted-foreground truncate">{aTitle}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 self-end sm:self-auto">
                            {sub.aiLabel && (
                              <span
                                className={`text-xs px-2.5 py-0.5 rounded-md font-semibold ${
                                  isAI
                                    ? "bg-destructive/15 text-destructive border border-destructive/25"
                                    : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25"
                                }`}
                              >
                                {sub.aiLabel} ({sub.aiConfidence ? Math.round(sub.aiConfidence * 100) : 0}%)
                              </span>
                            )}
                            <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                              {sub.status || "Submitted"}
                            </span>
                            <span className="text-xs font-semibold text-foreground w-12 text-right">
                              {sub.score !== null && sub.score !== undefined ? `${sub.score}/100` : "—"}
                            </span>
                            <Link to={`/teacher/submission/${subId}`}>
                              <Button
                                size="sm"
                                variant={sub.score === null || sub.score === undefined ? "default" : "outline"}
                                className="h-8 gap-1.5 text-xs font-semibold shrink-0"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                {sub.score === null || sub.score === undefined ? "Review & Grade" : "Review"}
                              </Button>
                            </Link>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Right Column: Classes & Active Assignments */}
              <div className="space-y-6 flex flex-col">
                {/* My Classes Quick Card */}
                <div className="bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">My Classes</h2>
                      <p className="text-xs text-muted-foreground">{classes.length} active courses</p>
                    </div>
                    <Link to="/teacher/classes">
                      <Button variant="ghost" size="sm" className="text-xs h-8">
                        View All
                      </Button>
                    </Link>
                  </div>

                  <div className="divide-y divide-border/60 p-2 space-y-1.5 overflow-y-auto max-h-[260px]">
                    {classes.length === 0 ? (
                      <div className="p-5 text-center text-xs text-muted-foreground">
                        <GraduationCap className="w-7 h-7 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="font-semibold text-foreground">No classes yet</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Create your first class to enroll students</p>
                        <Link to="/teacher/classes">
                          <Button variant="outline" size="sm" className="mt-2.5 text-xs h-7">
                            Create Class
                          </Button>
                        </Link>
                      </div>
                    ) : (
                      classes.map((cls) => {
                        const classId = cls.id || cls._id;
                        return (
                          <div key={classId} className="p-3 rounded-lg bg-muted/40 border border-border/50 hover:bg-muted/70 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0">
                                <Link to={`/teacher/class/${classId}`} className="font-semibold text-xs text-foreground hover:underline truncate block">
                                  {cls.name}
                                </Link>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                  {cls.code} · {cls.studentCount || (cls.student_emails?.length || 0)} enrolled
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center justify-between pt-2 mt-2 border-t border-border/40 text-xs">
                              <Link to={`/teacher/class/${classId}`} className="text-primary hover:underline font-medium text-[11px]">
                                Open Class →
                              </Link>
                              <Link to={`/teacher/classes/${classId}/assignments/new`}>
                                <span className="text-muted-foreground hover:text-foreground text-[11px]">
                                  + Assignment
                                </span>
                              </Link>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* Active Assignments Column */}
                <div className="bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
                  <div className="px-5 py-4 border-b border-border/80 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-foreground">Active Assignments</h2>
                      <p className="text-xs text-muted-foreground">{assignments.length} total assignments</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleCreateAssignmentClick} className="h-8 w-8 p-0">
                      <PlusCircle className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="divide-y divide-border/60 p-2 space-y-2 overflow-y-auto max-h-[300px]">
                    {assignments.length === 0 ? (
                      <div className="p-6 text-center text-xs text-muted-foreground">
                        <FileCode className="w-8 h-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="font-semibold text-foreground">No assignments yet</p>
                        <p className="text-xs text-muted-foreground mt-1">Create assignments to collect student code</p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleCreateAssignmentClick}
                          className="mt-3 text-xs h-8"
                        >
                          Create Assignment
                        </Button>
                      </div>
                    ) : (
                      assignments.map((assignment) => {
                        const classTitle = classMap.get(assignment.course) || assignment.course_name || "General Course";
                        const aSubmissions = submissions.filter(
                          (s) => s.assignment_id === assignment.id || s.assignment_title === assignment.title
                        );

                        return (
                          <div key={assignment.id} className="p-3 rounded-lg bg-muted/40 border border-border/50">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="font-semibold text-xs text-foreground">{assignment.title || assignment.name}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{classTitle}</p>
                              </div>
                              <span className="text-[11px] px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold shrink-0">
                                #{assignment.assignment_number || 1}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-muted-foreground mt-3 pt-2 border-t border-border/40">
                              <span>{aSubmissions.length} submissions</span>
                              <span>
                                {assignment.deadline
                                  ? `Due: ${new Date(assignment.deadline).toLocaleDateString()}`
                                  : "No due date"}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* TAB 2: ASSIGNMENTS VIEW */}
        {activeTab === "assignments" && (
          <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Course Assignments</h2>
                <p className="text-xs text-muted-foreground">
                  Create and manage coding assignments across your registered classes
                </p>
              </div>
              <Button onClick={handleCreateAssignmentClick} className="gap-2 text-xs h-8">
                <PlusCircle className="w-3.5 h-3.5" />
                New Assignment
              </Button>
            </div>

            {assignments.length === 0 ? (
              <div className="py-12 text-center text-xs text-muted-foreground">
                <FileCode className="w-10 h-10 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-sm font-semibold text-foreground">No assignments created yet</p>
                <p className="mt-1">Click the button above to add your first coding assignment.</p>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {assignments.map((assignment) => {
                  const classTitle = classMap.get(assignment.course) || assignment.course_name || "Course";
                  const aSubmissions = submissions.filter(
                    (s) => s.assignment_id === assignment.id || s.assignment_title === assignment.title
                  );
                  const aiFlaggedCount = aSubmissions.filter((s) => s.aiLabel === "AI").length;

                  return (
                    <div
                      key={assignment.id}
                      className="bg-card rounded-xl border border-border/80 p-4 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-xs px-2 py-0.5 rounded-md bg-primary/10 text-primary font-semibold">
                            Assignment #{assignment.assignment_number || 1}
                          </span>
                          {aiFlaggedCount > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-md bg-destructive/15 text-destructive font-semibold">
                              {aiFlaggedCount} Flagged
                            </span>
                          )}
                        </div>
                        <h3 className="font-semibold text-foreground text-sm">{assignment.title || assignment.name}</h3>
                        <p className="text-xs text-muted-foreground mt-1">{classTitle}</p>
                        {assignment.description && (
                          <p className="text-xs text-muted-foreground/80 mt-2 line-clamp-2">
                            {assignment.description}
                          </p>
                        )}
                      </div>

                      <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                        <span className="text-xs text-muted-foreground font-medium">
                          {aSubmissions.length} submissions
                        </span>
                        <Link to={`/teacher/class/${assignment.course}`}>
                          <Button variant="outline" size="sm" className="h-8 text-xs">
                            View Class
                          </Button>
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: STUDENTS MANAGEMENT */}
        {activeTab === "students" && (
          <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Enrolled Students</h2>
                <p className="text-xs text-muted-foreground">
                  Directory of registered students eligible for course enrollment
                </p>
              </div>
            </div>

            {/* Add Student Section */}
            <div className="p-4 rounded-xl bg-muted/30 border border-border/80">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                <GraduationCap className="w-4 h-4 text-primary" />
                Add New Student to Directory
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-3">
                <Input
                  placeholder="Full Name"
                  className="h-9 text-xs"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                />
                <Input
                  placeholder="student@university.edu"
                  className="h-9 text-xs"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                />
                <select
                  value={newDegree}
                  onChange={(e) => setNewDegree(e.target.value)}
                  className="h-9 rounded-md border border-input bg-card px-3 text-xs text-foreground"
                >
                  <option value="">Select Degree Program</option>
                  {STUDENT_PROGRAMS.map((program) => (
                    <option key={program.value} value={program.value}>
                      {program.label}
                    </option>
                  ))}
                </select>
                <select
                  value={newSemester}
                  onChange={(e) => setNewSemester(e.target.value)}
                  className="h-9 rounded-md border border-input bg-card px-3 text-xs text-foreground"
                >
                  <option value="">Select Semester</option>
                  {STUDENT_SEMESTERS.map((s) => (
                    <option key={s} value={s}>
                      Semester {s}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                onClick={handleAddStudent}
                disabled={!newName.trim() || !newEmail.trim() || !newDegree || !newSemester}
                size="sm"
                className="text-xs h-8"
              >
                Add Student to Registry
              </Button>
            </div>

            {/* Filter controls */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              <select
                value={studentProgramFilter}
                onChange={(e) => setStudentProgramFilter(e.target.value)}
                className="h-8 rounded-md border border-input bg-card px-3 text-xs w-full sm:max-w-xs"
              >
                <option value="all">All Programs</option>
                {STUDENT_PROGRAMS.map((program) => (
                  <option key={program.value} value={program.value}>
                    {program.label}
                  </option>
                ))}
                <option value={UNSPECIFIED_PROGRAM}>Unspecified Program</option>
              </select>
              <span className="text-xs text-muted-foreground">
                Showing {filteredStudents.length} of {students.length} students
              </span>
            </div>

            {loading ? (
              <div className="py-8 text-center text-xs text-muted-foreground">Loading student directory...</div>
            ) : error ? (
              <div className="py-8 text-center text-xs text-destructive">{error}</div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-8 text-center text-xs text-muted-foreground">No students match this query.</div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredStudents.map((s) => (
                  <div key={s.email} className="p-3.5 rounded-xl border border-border/80 bg-card shadow-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-xs sm:text-sm text-foreground truncate">{s.name}</p>
                      <span className="text-[11px] px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium shrink-0">
                        {getStudentProgramLabel(s.degree)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 truncate">{s.email}</p>
                    {s.semester && (
                      <p className="text-[11px] text-muted-foreground/80 mt-2">Semester {s.semester}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: PLAGIARISM & INTEGRITY AUDIT */}
        {activeTab === "plagiarism" && (
          <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                  <ShieldAlert className="w-5 h-5 text-destructive" />
                  Plagiarism & AI Detection Reports
                </h2>
                <p className="text-xs text-muted-foreground">
                  Full audit of flagged code submissions evaluated by the AST Code Intelligence engine
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportCSV} className="gap-2 text-xs h-8">
                <Download className="w-3.5 h-3.5" />
                Export Plagiarism Audit
              </Button>
            </div>

            <div className="divide-y divide-border/60">
              {submissions.filter((s) => s.aiLabel === "AI").length === 0 ? (
                <div className="py-12 text-center text-xs text-muted-foreground">
                  <ShieldCheck className="w-10 h-10 mx-auto text-emerald-500 mb-2" />
                  <p className="text-sm font-semibold text-foreground">Zero AI-flagged submissions</p>
                  <p className="mt-1">All current submissions have satisfied human code originality criteria.</p>
                </div>
              ) : (
                submissions
                  .filter((s) => s.aiLabel === "AI")
                  .map((sub) => {
                    const sName = sub.student_name || sub.studentName || sub.student_email || "Student";
                    const aTitle = sub.assignment_title || sub.assignmentTitle || "Assignment";
                    const subId = sub.id || sub._id;

                    return (
                      <div key={subId} className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-xs sm:text-sm text-foreground">{sName}</span>
                            <span className="text-xs px-2 py-0.5 rounded-md bg-destructive/15 text-destructive font-bold">
                              AI: {sub.aiConfidence ? Math.round(sub.aiConfidence * 100) : 95}% Confidence
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {aTitle} · Submitted: {sub.submitted_at || sub.createdAt || "Recent"}
                          </p>
                          <p className="text-xs text-muted-foreground/80 mt-1">
                            Human Originality: {sub.humanPercentage ?? 5}% · Flagged for review
                          </p>
                        </div>
                        <Link to={`/teacher/submission/${subId}`}>
                          <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                            <Eye className="w-3.5 h-3.5" />
                            Inspect AI Code Analysis
                          </Button>
                        </Link>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        )}
      </div>
    </TeacherLayout>
  );
};

export default TeacherDashboard;
