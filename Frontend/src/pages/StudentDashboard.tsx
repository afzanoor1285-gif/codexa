import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getToken, getUser, logout } from "@/lib/auth";
import {
  FileCode,
  CheckCircle2,
  Clock,
  Upload,
  TrendingUp,
  Award,
  Bell,
  Settings,
  LogOut,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import BrandLogo from "@/components/BrandLogo";
import ProfilePhoto from "@/components/ProfilePhoto";
import AccountSettingsDialog from "@/components/AccountSettingsDialog";
import MobileNavigation from "@/components/MobileNavigation";

interface Assignment {
  id: string;
  name: string;
  description: string;
  course: string;
  status: "graded" | "pending" | "submitted" | "not_submitted";
  score: number | null;
  maxScore: number;
  feedback: string | null;
  submittedAt?: string;
  gradedAt?: string;
  dueDate?: string;
  humanPercentage: number | null;
  aiPrediction?: {
    prediction: "AI Generated" | "Human Written";
    confidence: number;
  };
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
type ChartPeriod = "week" | "month" | "year" | "all";

const StudentDashboard = () => {
  const [user, setUser] = useState(getUser);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("all");
  const [assignmentsLoading, setAssignmentsLoading] = useState(true);
  const [assignmentsError, setAssignmentsError] = useState<string | null>(null);
  const studentName = user?.name?.trim() || user?.email?.split("@")[0] || "Student";
  const initials = studentName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  useEffect(() => {
    const updateUser = (event: Event) => {
      const updatedUser = (event as CustomEvent<ReturnType<typeof getUser>>).detail;
      setUser(updatedUser);
    };
    window.addEventListener("codexa:user-updated", updateUser);
    return () => window.removeEventListener("codexa:user-updated", updateUser);
  }, []);

  useEffect(() => {
    const loadAssignments = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Your session has expired. Please log in again.");
        }
        const headers = { Authorization: `Bearer ${token}` };
        const [assignmentsResponse, gradesResponse] = await Promise.all([
          fetch(`${API_BASE_URL}/assignments/`, { cache: "no-store", headers }),
          fetch(`${API_BASE_URL}/api/student/grades`, { cache: "no-store", headers }),
        ]);
        const [assignmentsData, gradesData] = await Promise.all([
          assignmentsResponse.json(),
          gradesResponse.json(),
        ]);
        if (!assignmentsResponse.ok) {
          throw new Error(assignmentsData.error || "Unable to load assignments");
        }
        if (!gradesResponse.ok) {
          throw new Error(gradesData.error || "Unable to load your grades");
        }
        setAssignmentsError(null);
        const assignmentRecords = new Map<string, {
            id: string;
            title: string;
            description: string;
            course: string;
            deadline: string;
            status?: Assignment["status"];
            submittedAt?: string | null;
            gradedAt?: string | null;
            score?: number | null;
            feedback?: string | null;
            humanPercentage?: number | null;
            aiLabel?: "AI" | "Human" | null;
            aiConfidence?: number | null;
          }>();
        for (const assignment of assignmentsData.assignments || []) {
          assignmentRecords.set(assignment.id, assignment);
        }
        for (const grade of gradesData.grades || []) {
          const existing = assignmentRecords.get(grade.assignmentId);
          assignmentRecords.set(grade.assignmentId, {
            ...existing,
            ...grade,
            id: grade.assignmentId,
            title: grade.title || existing?.title || "Assignment",
            description: grade.description || existing?.description || "",
            course: grade.course || existing?.course || "",
            deadline: grade.deadline || existing?.deadline || "",
          });
        }
        const loadedAssignments = [...assignmentRecords.values()].map((assignment) => ({
            id: assignment.id,
            name: assignment.title,
            description: assignment.description,
            course: assignment.course,
            status: assignment.status || "not_submitted",
            score: assignment.score ?? null,
            maxScore: 100,
            feedback: assignment.feedback || null,
            humanPercentage: assignment.humanPercentage ?? null,
            aiPrediction: assignment.aiLabel
              ? {
                  prediction: assignment.aiLabel === "AI" ? "AI Generated" : "Human Written",
                  confidence: assignment.aiConfidence ?? 0,
                }
              : undefined,
            dueDate: assignment.deadline
              ? new Date(assignment.deadline).toLocaleDateString()
              : "Not set",
            submittedAt: assignment.submittedAt || undefined,
            gradedAt: assignment.gradedAt || undefined,
          }));
        setAssignments(loadedAssignments);
        setSelectedAssignment((current) =>
          current
            ? loadedAssignments.find((assignment) => assignment.id === current.id) || current
            : null,
        );
      } catch (error) {
        setAssignmentsError(
          error instanceof Error ? error.message : "Unable to load assignments",
        );
      } finally {
        setAssignmentsLoading(false);
      }
    };

    const refreshAssignments = () => {
      void loadAssignments();
    };
    refreshAssignments();
    window.addEventListener("focus", refreshAssignments);
    const refreshInterval = window.setInterval(refreshAssignments, 30000);
    return () => {
      window.removeEventListener("focus", refreshAssignments);
      window.clearInterval(refreshInterval);
    };
  }, []);

  const gradedAssignments = assignments
    .filter((assignment) => assignment.score !== null)
    .sort((a, b) => (a.submittedAt || "").localeCompare(b.submittedAt || ""));
  const scoredAssignments = assignments.filter((assignment) => assignment.score !== null);
  const humanWrittenAssignments = assignments.filter(
    (assignment) => assignment.humanPercentage !== null,
  );
  const submittedCount = assignments.filter(
    (assignment) => assignment.status !== "not_submitted",
  ).length;
  const pendingCount = assignments.filter(
    (assignment) => assignment.status === "submitted" || assignment.status === "pending",
  ).length;
  const averageScore = scoredAssignments.length
    ? Math.round(
        scoredAssignments.reduce((total, assignment) => total + assignment.score!, 0) /
          scoredAssignments.length,
      )
    : null;
  const averageHumanPercentage = humanWrittenAssignments.length
    ? Math.round(
        humanWrittenAssignments.reduce(
          (total, assignment) => total + assignment.humanPercentage!,
          0,
        ) / humanWrittenAssignments.length,
      )
    : null;
  const latestFeedback = [...assignments]
    .filter((assignment) => assignment.feedback)
    .sort((a, b) =>
      (b.gradedAt || b.submittedAt || "").localeCompare(a.gradedAt || a.submittedAt || ""),
    )[0];
  const dashboardUnavailable = assignmentsLoading || assignmentsError !== null;
  const now = new Date();
  const chartStart = chartPeriod === "all" ? new Date(0) : new Date(now);
  if (chartPeriod === "week") {
    chartStart.setDate(now.getDate() - 6);
  } else if (chartPeriod === "month") {
    chartStart.setDate(now.getDate() - 29);
  } else {
    chartStart.setDate(1);
    chartStart.setMonth(now.getMonth() - 11);
  }
  chartStart.setHours(0, 0, 0, 0);

  const chartBuckets = new Map<string, { date: Date; total: number; count: number }>();
  for (const assignment of gradedAssignments) {
    const gradeDate = new Date(assignment.gradedAt || assignment.submittedAt || "");
    if (Number.isNaN(gradeDate.getTime()) || gradeDate < chartStart || gradeDate > now) continue;
    const bucketDate = new Date(gradeDate);
    if (chartPeriod === "year") {
      bucketDate.setDate(1);
      bucketDate.setHours(0, 0, 0, 0);
    } else if (chartPeriod !== "all") {
      bucketDate.setHours(0, 0, 0, 0);
    }
    const bucketKey = chartPeriod === "all"
      ? assignment.id
      : chartPeriod === "year"
        ? `${bucketDate.getFullYear()}-${bucketDate.getMonth()}`
        : `${bucketDate.getFullYear()}-${bucketDate.getMonth()}-${bucketDate.getDate()}`;
    const bucket = chartBuckets.get(bucketKey) || { date: bucketDate, total: 0, count: 0 };
    bucket.total += assignment.score!;
    bucket.count += 1;
    chartBuckets.set(bucketKey, bucket);
  }
  const progressChartData = chartPeriod === "all"
    ? gradedAssignments
        .filter((assignment) => {
          const date = new Date(assignment.gradedAt || assignment.submittedAt || "");
          return !Number.isNaN(date.getTime()) && date <= now;
        })
        .sort((a, b) =>
          new Date(a.gradedAt || a.submittedAt || "").getTime() -
          new Date(b.gradedAt || b.submittedAt || "").getTime(),
        )
        .map((assignment) => ({
          name: assignment.name,
          score: assignment.score!,
          date: new Date(assignment.gradedAt || assignment.submittedAt || "").toLocaleDateString(),
          assignments: 1,
        }))
    : [...chartBuckets.values()]
        .sort((a, b) => a.date.getTime() - b.date.getTime())
        .map(({ date, total, count }) => ({
          name: chartPeriod === "week"
            ? date.toLocaleDateString(undefined, { weekday: "short" })
            : chartPeriod === "year"
              ? date.toLocaleDateString(undefined, { month: "short", year: "2-digit" })
              : date.toLocaleDateString(undefined, { day: "numeric", month: "short" }),
          score: Math.round(total / count),
          date: date.toLocaleDateString(),
          assignments: count,
        }));

  const stats = [
    { icon: Award, label: "Course Average", value: dashboardUnavailable || averageScore === null ? "—" : `${averageScore}%`, color: "secondary" },
    { icon: FileCode, label: "Assignments", value: dashboardUnavailable ? "—" : `${submittedCount}/${assignments.length}`, color: "accent" },
    { icon: CheckCircle2, label: "Human-written", value: dashboardUnavailable || averageHumanPercentage === null ? "—" : `${averageHumanPercentage}%`, color: "accent" },
    { icon: Clock, label: "Awaiting Grade", value: dashboardUnavailable ? "—" : pendingCount.toString(), color: "yellow" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <AccountSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} role="student" />
      <Dialog
        open={selectedAssignment !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedAssignment(null);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {selectedAssignment && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedAssignment.name}</DialogTitle>
                <DialogDescription>
                  {selectedAssignment.course} · {selectedAssignment.status === "graded" ? "Graded" : "Submitted"}
                </DialogDescription>
              </DialogHeader>
              {selectedAssignment.score !== null ? (
                <div className="space-y-4">
                  <div className="rounded-xl bg-accent/10 p-5">
                    <p className="text-sm text-muted-foreground">Your score</p>
                    <p className="mt-1 text-3xl font-bold text-foreground">
                      {selectedAssignment.score}
                      <span className="text-lg font-medium text-muted-foreground"> / 100</span>
                    </p>
                    {selectedAssignment.gradedAt && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Graded {new Date(selectedAssignment.gradedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-foreground">Teacher feedback</h4>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                      {selectedAssignment.feedback || "No written feedback was provided."}
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your submission has been received. The grade will appear here once your teacher publishes it.
                </p>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
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
            { icon: TrendingUp, label: "Overview", active: true },
            { icon: FileCode, label: "My Assignments", active: false },
            { icon: Upload, label: "Submit Code", active: false, href: "/student/submit" },
            { icon: Award, label: "Grades", active: false },
            { icon: Settings, label: "Settings", active: false },
          ].map((item) => (
            item.href ? (
              <Link
                key={item.label}
                to={item.href}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  item.active
                    ? "bg-secondary/10 text-secondary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="w-5 h-5" />
                {item.label}
              </Link>
            ) : (
              <button
                key={item.label}
                onClick={() => {
                  if (item.label === "Settings") setSettingsOpen(true);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                  item.active
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
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 justify-between z-10">
          <MobileNavigation
            items={[
              { label: "Overview", icon: TrendingUp, href: "/student/dashboard" },
              { label: "My Assignments", icon: FileCode, href: "/student/dashboard#my-assignments" },
              { label: "Submit Code", icon: Upload, href: "/student/submit" },
              { label: "Grades and Progress", icon: Award, href: "/student/dashboard#your-progress" },
              { label: "Settings", icon: Settings, onSelect: () => setSettingsOpen(true) },
              { label: "Sign Out", icon: LogOut, href: "/", onSelect: logout },
            ]}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">Student Dashboard</h1>
            <p className="text-sm text-muted-foreground">
              <span className="block truncate">Welcome back, {studentName} · {user?.email || "Email unavailable"} · {user?.degree || "Degree not provided"}</span>
            </p>
            {user?.bio && <p className="mt-1 max-w-xl text-sm text-muted-foreground">{user.bio}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Button variant="outline" size="icon" className="hidden sm:inline-flex">
              <Bell className="w-5 h-5" />
            </Button>
            <ProfilePhoto initials={initials} role="student" />
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {/* Stats Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {stats.map((stat) => (
              <div key={stat.label} className="bg-card rounded-2xl p-5 border border-border">
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    stat.color === "secondary" ? "bg-secondary/10 text-secondary" :
                    stat.color === "yellow" ? "bg-yellow-500/10 text-yellow-600" :
                    "bg-accent/10 text-accent"
                  }`}>
                    <stat.icon className="w-5 h-5" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">{stat.label}</span>
                </div>
                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Quick Action */}
          <div className="mb-8">
            <Link to="/student/dashboard#my-assignments">
              <Button variant="hero" size="lg">
                <Upload className="w-5 h-5 mr-2" />
                Choose an Assignment to Submit
              </Button>
            </Link>
          </div>

          {/* Main Grid */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Assignments List */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 id="my-assignments" className="font-semibold text-foreground">My Assignments</h3>
              </div>
              <div className="divide-y divide-border">
                {assignmentsLoading ? (
                  <p className="px-6 py-8 text-sm text-muted-foreground">Loading assignments...</p>
                ) : assignmentsError ? (
                  <p className="px-6 py-8 text-sm text-destructive" role="alert">{assignmentsError}</p>
                ) : assignments.length === 0 ? (
                  <p className="px-6 py-8 text-sm text-muted-foreground">
                    No assignments have been added to your classes yet.
                  </p>
                ) : assignments.map((assignment) => (
                  <div key={assignment.id}>
                    <Link
                      to={assignment.status !== "not_submitted" ? "#" : `/student/submit/${assignment.id}`}
                      onClick={(event) => {
                        if (assignment.status !== "not_submitted") {
                          event.preventDefault();
                          setSelectedAssignment(assignment);
                        }
                      }}
                      aria-label={
                        assignment.score !== null
                          ? `${assignment.name}, score ${assignment.score} out of 100. View grade and feedback.`
                          : assignment.status !== "not_submitted"
                            ? `${assignment.name}, submitted. View submission status.`
                            : `Submit ${assignment.name}`
                      }
                      className={`block px-6 py-4 transition-colors ${
                        assignment.status !== "not_submitted"
                          ? "cursor-pointer hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                          : "hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary"
                      }`}
                    >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <p className="font-medium text-foreground">{assignment.name}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            assignment.status === "graded" || assignment.status === "submitted" ? "bg-accent/10 text-accent" :
                            assignment.status === "pending" ? "bg-yellow-500/10 text-yellow-600" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {assignment.status === "graded" ? "Graded" : 
                             assignment.status === "submitted" ? "Submitted" :
                             assignment.status === "pending" ? "Pending" : "Not Submitted"}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground">{assignment.course}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{assignment.description}</p>
                      </div>
                      <div className="text-right">
                        {assignment.score !== null ? (
                          <>
                            <p className="text-lg font-bold text-foreground">{assignment.score}/{assignment.maxScore}</p>
                            <p className="text-sm text-accent font-medium">Click to view feedback</p>
                            {assignment.aiPrediction && (
                              <p className="text-xs text-muted-foreground mt-1">
                                {assignment.aiPrediction.prediction} ({Math.round(assignment.aiPrediction.confidence * 100)}% confidence)
                              </p>
                            )}
                          </>
                        ) : assignment.status === "submitted" ? (
                          <p className="text-sm font-medium text-accent">
                            Submitted{assignment.submittedAt ? ` · ${new Date(assignment.submittedAt).toLocaleDateString()}` : ""}
                          </p>
                        ) : assignment.status === "pending" ? (
                          <p className="text-sm text-muted-foreground">Processing...</p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Due: {assignment.dueDate}</p>
                        )}
                    </div>
                    </div>
                    </Link>
                  </div>
                ))}
              </div>
            </div>

            {/* Latest Feedback */}
            <div className="bg-card rounded-2xl border border-border overflow-hidden">
              <div className="px-6 py-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Latest Feedback</h3>
                {latestFeedback && (
                  <p className="text-sm text-muted-foreground">
                    {latestFeedback.name}
                    {latestFeedback.score !== null ? ` · ${latestFeedback.score}/100` : ""}
                  </p>
                )}
              </div>
              <div className="p-6">
                {latestFeedback ? (
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {latestFeedback.feedback}
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    Teacher feedback will appear here when it is available.
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Progress Chart */}
          <div id="your-progress" className="mt-6 bg-card rounded-2xl border border-border p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold text-foreground">Your Progress</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  {chartPeriod === "all"
                    ? "Scores across all graded assignments"
                    : `Average score by ${chartPeriod === "year" ? "month" : "graded day"}`}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1 sm:flex" aria-label="Progress chart period">
                {([
                  ["all", "All"],
                  ["week", "Weekly"],
                  ["month", "Monthly"],
                  ["year", "Yearly"],
                ] as const).map(([period, label]) => (
                  <button
                    key={period}
                    type="button"
                    aria-pressed={chartPeriod === period}
                    onClick={() => setChartPeriod(period)}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors sm:px-3 sm:text-sm ${
                      chartPeriod === period
                        ? "bg-background text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="h-64 rounded-xl bg-muted/30 p-4">
              {progressChartData.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={progressChartData}
                    margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis
                      dataKey="name"
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(score: number) => `${score}%`}
                    />
                    <Tooltip
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.date
                          ? `${payload[0].payload.date} · ${payload[0].payload.assignments} graded`
                          : ""
                      }
                      formatter={(score: number) => [`${score}/100`, "Average score"]}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        borderColor: "hsl(var(--border))",
                        borderRadius: "0.75rem",
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="score"
                      stroke="hsl(var(--secondary))"
                      strokeWidth={3}
                      dot={{ r: 4, fill: "hsl(var(--secondary))" }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <TrendingUp className="mb-2 h-10 w-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {assignmentsLoading
                      ? "Loading your progress..."
                      : assignmentsError
                        ? "Progress is unavailable because assignments could not be loaded."
                        : "Your scores will appear here after assignments are graded."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default StudentDashboard;
