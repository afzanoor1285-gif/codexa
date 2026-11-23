import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  Search,
  CheckCircle,
  Clock,
  Download,
  FileCode,
  Loader,
  Users,
  UserPlus,
} from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";
import { downloadSubmissionCode } from "@/lib/api";

interface Student {
  id: string;
  name: string;
  email: string;
  status: "submitted" | "pending";
  enrollmentStatus?: "enrolled" | "invited";
  submittedAt?: string;
  score?: number;
  aiLabel?: "AI" | "Human" | null;
  aiPercentage?: number | null;
  humanPercentage?: number | null;
  aiConfidence?: number | null;
}

interface AssignmentData {
  id: string;
  title: string;
  classId: string;
  className: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

const StudentListView = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const navigate = useNavigate();

  const [assignment, setAssignment] = useState<AssignmentData | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "submitted" | "pending"
  >("all");
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    "student",
    "status",
    "ai_result",
  ]);
  const [resultsSort, setResultsSort] = useState<
    "student_name" | "submission_time" | "score" | "ai_result"
  >("student_name");
  const [preferencesError, setPreferencesError] = useState<string | null>(null);

  const fetchStudentSubmissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("codexa_token");

      const response = await fetch(
        `${API_BASE_URL}/api/assignments/${assignmentId}/submissions`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch submissions");
      }

      const data = await response.json();

      if (!data.assignment || !Array.isArray(data.submissions)) {
        throw new Error("The server returned an invalid submissions response.");
      }
      setAssignment(data.assignment);
      setStudents(data.submissions);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setAssignment(null);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [assignmentId]);

  useEffect(() => {
    void fetchStudentSubmissions();
  }, [fetchStudentSubmissions]);

  useEffect(() => {
    let active = true;
    const loadPreferences = async () => {
      const token = localStorage.getItem("codexa_token");
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load teacher table preferences.");
        }
        if (active && Array.isArray(data.settings?.grading?.visible_columns)) {
          const columns = data.settings.grading.visible_columns as string[];
          setVisibleColumns(
            data.settings.grading.show_confidence === false
              ? columns.filter((column) => column !== "confidence")
              : columns,
          );
          setResultsSort(data.settings.grading.results_sort ?? "student_name");
        }
      } catch (preferenceError) {
        if (active) {
          setPreferencesError(
            preferenceError instanceof Error
              ? preferenceError.message
              : "Unable to load table preferences.",
          );
        }
      }
    };
    void loadPreferences();
    return () => {
      active = false;
    };
  }, []);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.email.toLowerCase().includes(searchTerm.toLowerCase());

    if (filterStatus === "all") return matchesSearch;
    return matchesSearch && student.status === filterStatus;
  }).sort((left, right) => {
    if (resultsSort === "submission_time") {
      return new Date(right.submittedAt ?? 0).getTime() - new Date(left.submittedAt ?? 0).getTime();
    }
    if (resultsSort === "score") {
      return (right.score ?? -1) - (left.score ?? -1);
    }
    if (resultsSort === "ai_result") {
      return (left.aiLabel ?? "").localeCompare(right.aiLabel ?? "");
    }
    return left.name.localeCompare(right.name);
  });

  const submittedCount = students.filter((s) => s.status === "submitted").length;
  const pendingCount = students.filter((s) => s.status === "pending").length;

  return (
    <TeacherLayout
      title={assignment?.title || "Assignment Submissions"}
      subtitle={assignment?.className}
      activeNav="myclasses"
      backTo={{
        label: assignment?.className ? `Back to ${assignment.className}` : "Back to Class",
        href: assignment?.classId ? `/teacher/class/${assignment.classId}` : "/teacher/classes",
      }}
      breadcrumbs={[
        { label: "My Classes", href: "/teacher/classes" },
        {
          label: assignment?.className || "Class",
          href: assignment?.classId ? `/teacher/class/${assignment.classId}` : "/teacher/classes",
        },
        { label: assignment?.title || "Assignment" },
        { label: "Submissions" },
      ]}
      actions={
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0 h-8 text-xs gap-1.5"
          disabled={!assignment}
          onClick={() => {
            if (!assignment) return;
            navigate(`/teacher/class/${assignment.classId}`, {
              state: { openStudentManager: true },
            });
          }}
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Add Students</span>
        </Button>
      }
    >
      <div className="space-y-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
              {error}
            </div>
          ) : (
            <>
              {/* Stats Cards */}
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                      <Users className="w-5 h-5 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Total Students
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-foreground">
                    {students.length}
                  </p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-accent" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Submitted
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-accent">
                    {submittedCount}
                  </p>
                </div>

                <div className="bg-card rounded-2xl border border-border p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                      <Clock className="w-5 h-5 text-yellow-600" />
                    </div>
                    <span className="text-sm font-medium text-muted-foreground">
                      Pending
                    </span>
                  </div>
                  <p className="text-3xl font-bold text-yellow-600">
                    {pendingCount}
                  </p>
                </div>
              </div>

              {/* Filters and Search */}
              <div className="mb-6 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    className="pl-10"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 flex-wrap">
                  {["all", "submitted", "pending"].map((status) => (
                    <Button
                      key={status}
                      variant={
                        filterStatus === status ? "default" : "outline"
                      }
                      onClick={() =>
                        setFilterStatus(
                          status as "all" | "submitted" | "pending"
                        )
                      }
                      className="capitalize"
                    >
                      {status === "all"
                        ? "All Students"
                        : status === "submitted"
                          ? "Submitted"
                          : "Pending"}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Students List */}
              {preferencesError && (
                <p role="alert" className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  {preferencesError}
                </p>
              )}
              {filteredStudents.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {searchTerm || filterStatus !== "all"
                      ? "No students found"
                      : "No students assigned"}
                  </p>
                </div>
              ) : (
                <div className="bg-card rounded-2xl border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px]">
                      <thead>
                        <tr className="border-b border-border bg-muted/50">
                          {visibleColumns.includes("student") && <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Student Name</th>}
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Email
                          </th>
                          {visibleColumns.includes("status") && <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>}
                          {visibleColumns.includes("submission_time") && <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Submitted Date</th>}
                          {visibleColumns.includes("ai_result") && <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">AI-vs-human model output</th>}
                          {visibleColumns.includes("confidence") && <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Uncalibrated model score</th>}
                          {visibleColumns.includes("score") && <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Score</th>}
                          <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredStudents.map((student) => (
                          <tr
                            key={student.id}
                            className="border-b border-border hover:bg-muted/50 transition-colors"
                          >
                            {visibleColumns.includes("student") && <td className="px-6 py-4 text-sm text-foreground font-medium">{student.name}</td>}
                            <td className="px-6 py-4 text-sm text-muted-foreground">
                              {student.email}
                            </td>
                            {visibleColumns.includes("status") && <td className="px-6 py-4 text-sm">
                              <div className="flex items-center gap-2">
                                {student.status === "submitted" ? (
                                  <>
                                    <CheckCircle className="w-4 h-4 text-accent" />
                                    <span className="text-accent font-medium">
                                      Submitted
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    <Clock className="w-4 h-4 text-yellow-600" />
                                    <span className="text-yellow-600 font-medium">
                                      {student.enrollmentStatus === "invited" ? "Invited" : "Pending"}
                                    </span>
                                  </>
                                )}
                              </div>
                            </td>}
                            {visibleColumns.includes("submission_time") && <td className="px-6 py-4 text-sm text-muted-foreground">
                              {student.submittedAt
                                ? new Date(
                                    student.submittedAt
                                  ).toLocaleDateString()
                                : "-"}
                            </td>}
                            {visibleColumns.includes("ai_result") && <td className="px-6 py-4 text-sm text-foreground">
                              {student.status !== "submitted" ? "-" : student.aiLabel
                                ? `${student.aiLabel} · AI ${student.aiPercentage?.toFixed(1) ?? "—"}% / Human ${student.humanPercentage?.toFixed(1) ?? "—"}%`
                                : "Analysis unavailable"}
                            </td>}
                            {visibleColumns.includes("confidence") && <td className="px-6 py-4 text-sm text-foreground">
                              {student.aiConfidence !== null && student.aiConfidence !== undefined
                                ? `${(student.aiConfidence * 100).toFixed(1)}%`
                                : "-"}
                            </td>}
                            {visibleColumns.includes("score") && <td className="px-6 py-4 text-sm font-medium text-foreground">
                              {student.score !== null && student.score !== undefined ? `${student.score}%` : "-"}
                            </td>}
                            <td className="px-6 py-4 text-sm">
                              {student.status === "submitted" && (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-accent hover:text-accent"
                                    onClick={() => navigate(`/teacher/submission/${student.id}`)}
                                  >
                                    <FileCode className="mr-2 h-4 w-4" />
                                    Open code & report
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-accent hover:text-accent"
                                    onClick={async () => {
                                      try {
                                        await downloadSubmissionCode(student.id);
                                      } catch (err) {
                                        window.alert(err instanceof Error ? err.message : "Unable to download submission.");
                                      }
                                    }}
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </Button>
                                </div>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </TeacherLayout>
  );
};

export default StudentListView;
