import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Plus,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  Bell,
  FileText,
  Loader,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

interface Assignment {
  id: string;
  title: string;
  description: string;
  deadline: string;
  createdAt: string;
  total_students: number;
  submitted_students: number;
  pending_students: number;
}

interface ClassData {
  id: string;
  name: string;
  code: string;
  section: string;
  studentCount: number;
}

const API_BASE_URL = "http://127.0.0.1:5000";

const ClassDetail = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const [classData, setClassData] = useState<ClassData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignmentSort, setAssignmentSort] = useState<"newest" | "oldest" | "deadline">("newest");
  const [deadlineDisplay, setDeadlineDisplay] = useState<"date_time" | "date_only" | "relative">("date_time");

  const fetchClassData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("codexa_token");

      // Fetch class details and assignments
      const response = await fetch(
        `${API_BASE_URL}/api/classes/${classId}/assignments`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to fetch class data");
      }

      const data = await response.json();

      if (data.class && data.assignments) {
        setClassData(data.class);
        setAssignments(data.assignments);
      } else {
        throw new Error("The server returned invalid class data");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setClassData(null);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    fetchClassData();
  }, [fetchClassData]);

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
        if (!response.ok) throw new Error(data.error || "Unable to load assignment preferences.");
        if (active) {
          setAssignmentSort(data.settings?.assignment?.default_sort ?? "newest");
          setDeadlineDisplay(data.settings?.assignment?.deadline_display ?? "date_time");
        }
      } catch (preferenceError) {
        console.error("Failed to load assignment preferences:", preferenceError);
      }
    };
    void loadPreferences();
    return () => {
      active = false;
    };
  }, []);

  const handleCreateAssignment = () => {
    navigate(`/teacher/create-assignment/${classId}`);
  };

  const handleViewStudents = (assignmentId: string) => {
    navigate(`/teacher/assignment/${assignmentId}/students`);
  };

  const getSubmissionPercentage = (submitted: number, total: number) => {
    if (total === 0) return 0;
    return Math.round((submitted / total) * 100);
  };

  const sortedAssignments = [...assignments].sort((left, right) => {
    if (assignmentSort === "deadline") {
      return new Date(left.deadline).getTime() - new Date(right.deadline).getTime();
    }
    const leftTime = new Date(left.createdAt || 0).getTime();
    const rightTime = new Date(right.createdAt || 0).getTime();
    return assignmentSort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
  });

  const formatDeadline = (deadline: string) => {
    const date = new Date(deadline);
    if (deadlineDisplay === "date_only") return date.toLocaleDateString();
    if (deadlineDisplay === "relative") {
      const days = Math.ceil((date.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
      if (days === 0) return "Due today";
      if (days === 1) return "Due tomorrow";
      if (days > 1) return `Due in ${days} days`;
      return `${Math.abs(days)} days overdue`;
    }
    return date.toLocaleString();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 bottom-0 w-64 bg-card border-r border-border p-4 hidden lg:block">
        <Link to="/" className="flex items-center gap-2 mb-8 px-2">
          <BrandLogo className="w-10 h-10 object-contain" />
          <span className="text-xl font-bold text-foreground">Codexa</span>
        </Link>

        <nav className="space-y-1">
          <button
            onClick={() => navigate("/teacher/classes")}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors text-muted-foreground hover:bg-muted hover:text-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Classes
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate("/teacher/classes")}
              className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {classData?.name} - {classData?.code}
              </h1>
              <p className="text-sm text-muted-foreground">{classData?.section}</p>
            </div>
          </div>
          <Button
            onClick={handleCreateAssignment}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Assignment
          </Button>
        </header>

        <div className="p-6">
          {location.state?.assignmentCreated && (
            <div className="bg-accent/10 text-accent rounded-lg p-4 mb-6" role="status">
              Assignment created successfully.
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
              {error}
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-6">
                No assignments created yet
              </p>
              <Button onClick={handleCreateAssignment}>
                <Plus className="w-4 h-4 mr-2" />
                Create First Assignment
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-6">
                <p className="text-sm text-muted-foreground">
                  {assignments.length} Assignments
                </p>
              </div>

              {sortedAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="bg-card rounded-2xl border border-border p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        {assignment.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-4 gap-4 mb-4">
                    {/* Total Students */}
                    <div className="bg-muted/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Total Students
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-foreground">
                        {assignment.total_students}
                      </p>
                    </div>

                    {/* Submitted */}
                    <div className="bg-accent/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-4 h-4 text-accent" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Submitted
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-accent">
                        {assignment.submitted_students}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {getSubmissionPercentage(
                          assignment.submitted_students,
                          assignment.total_students
                        )}
                        %
                      </p>
                    </div>

                    {/* Pending */}
                    <div className="bg-yellow-500/10 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Pending
                        </span>
                      </div>
                      <p className="text-2xl font-bold text-yellow-600">
                        {assignment.pending_students}
                      </p>
                    </div>

                    {/* Deadline */}
                    <div className="bg-muted/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-muted-foreground" />
                        <span className="text-xs font-medium text-muted-foreground">
                          Deadline
                        </span>
                      </div>
                      <p className="text-sm font-medium text-foreground">
                        {formatDeadline(assignment.deadline)}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => handleViewStudents(assignment.id)}
                      className="flex-1"
                    >
                      <Users className="w-4 h-4 mr-2" />
                      View Students
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default ClassDetail;
