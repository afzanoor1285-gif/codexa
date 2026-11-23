import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  UserPlus,
} from "lucide-react";
import TeacherLayout from "@/components/TeacherLayout";

interface Assignment {
  id: string;
  assignment_number: number;
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
  degree: string;
  semester: number;
  studentEmails: string[];
  invitedEmails: string[];
}

interface Student {
  name: string;
  email: string;
  degree?: string | null;
  semester?: number | null;
}

interface StudentRosterUpdate {
  class_student_count?: number;
  student_emails?: string[];
  invited_emails?: string[];
  message?: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

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
  const [manageStudentsOpen, setManageStudentsOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentEmails, setSelectedStudentEmails] = useState<string[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [studentsMessage, setStudentsMessage] = useState<string | null>(null);
  const [addStudentsLoading, setAddStudentsLoading] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentEmail, setNewStudentEmail] = useState("");

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
        let errorMsg = "Failed to fetch class data";
        try {
          const errData = await response.json();
          errorMsg = errData.error || errorMsg;
        } catch {
          errorMsg = `Server error (${response.status}): ${response.statusText}`;
        }
        throw new Error(errorMsg);
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

  const openStudentManager = useCallback(async () => {
    setManageStudentsOpen(true);
    setStudentsError(null);
    setStudentsMessage(null);
    setStudentsLoading(true);
    try {
      const token = localStorage.getItem("codexa_token");
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${token ?? ""}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to load students.");
      setStudents(data.students || []);
    } catch (studentError) {
      setStudentsError(studentError instanceof Error ? studentError.message : "Unable to load students.");
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (location.state?.openStudentManager) {
      void openStudentManager();
    }
  }, [location.state?.openStudentManager, openStudentManager]);

  const toggleStudentSelection = (email: string) => {
    setSelectedStudentEmails((current) =>
      current.includes(email)
        ? current.filter((selectedEmail) => selectedEmail !== email)
        : [...current, email],
    );
  };

  const applyStudentRosterUpdate = (data: StudentRosterUpdate) => {
    const allEmails = [
      ...(data.student_emails || []),
      ...(data.invited_emails || []),
    ];
    const classStudentCount = data.class_student_count
      ?? new Set(allEmails.map((email) => email.trim().toLowerCase())).size;
    setClassData((current) => current
      ? {
          ...current,
          studentEmails: data.student_emails || current.studentEmails,
          invitedEmails: data.invited_emails || current.invitedEmails,
          studentCount: classStudentCount,
        }
      : current);
    setAssignments((current) => current.map((assignment) => ({
      ...assignment,
      total_students: classStudentCount,
      pending_students: Math.max(
        classStudentCount - assignment.submitted_students,
        0,
      ),
    })));
  };

  const addStudentsToClass = async () => {
    if (!classId || selectedStudentEmails.length === 0) return;
    setAddStudentsLoading(true);
    setStudentsError(null);
    setStudentsMessage(null);
    try {
      const token = localStorage.getItem("codexa_token");
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({ student_emails: selectedStudentEmails }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to add students.");
      applyStudentRosterUpdate(data);
      setSelectedStudentEmails([]);
      setStudentsMessage(data.message || "Students added to class.");
    } catch (studentError) {
      setStudentsError(studentError instanceof Error ? studentError.message : "Unable to add students.");
    } finally {
      setAddStudentsLoading(false);
    }
  };

  const addNewStudentToClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!classId) return;
    setAddStudentsLoading(true);
    setStudentsError(null);
    setStudentsMessage(null);
    try {
      const token = localStorage.getItem("codexa_token");
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/students`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token ?? ""}`,
        },
        body: JSON.stringify({
          student: {
            name: newStudentName.trim(),
            email: newStudentEmail.trim(),
          },
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to add this student.");
      applyStudentRosterUpdate(data);
      setNewStudentName("");
      setNewStudentEmail("");
      setStudentsMessage(
        `${data.message || "Student added to class."}. They can access the class after registering with this email and matching program details.`,
      );
    } catch (studentError) {
      setStudentsError(studentError instanceof Error ? studentError.message : "Unable to add this student.");
    } finally {
      setAddStudentsLoading(false);
    }
  };

  const invitedEmails = new Set(
    (classData?.invitedEmails || []).map((email) => email.toLowerCase()),
  );
  const enrolledEmails = new Set(
    (classData?.studentEmails || []).map((email) => email.toLowerCase()),
  );
  const eligibleStudents = students.filter(
    (student) =>
      student.degree === classData?.degree
      && String(student.semester || "") === String(classData?.semester)
      && !invitedEmails.has(student.email.toLowerCase())
      && !enrolledEmails.has(student.email.toLowerCase()),
  );

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
    <TeacherLayout
      title={classData ? `${classData.name} (${classData.code})` : "Class Details"}
      subtitle={classData?.section}
      activeNav="myclasses"
      backTo={{ label: "My Classes", href: "/teacher/classes" }}
      breadcrumbs={[
        { label: "My Classes", href: "/teacher/classes" },
        { label: classData ? `${classData.name}` : "Class Details" },
      ]}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void openStudentManager()}
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Add Students</span>
          </Button>
          <Button
            size="sm"
            onClick={handleCreateAssignment}
            className="flex items-center gap-1.5 h-8 text-xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Create Assignment</span>
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
          {manageStudentsOpen && (
            <section className="mb-6 rounded-2xl border border-border bg-card p-4 sm:p-6" aria-labelledby="manage-students-title">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 id="manage-students-title" className="font-semibold text-foreground">Add students to this class</h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Add a matching registered student, or enter a new student's name and email. Students appear in the class roster right away; new students need a Codexa account with matching program details to access assignments.
                  </p>
                </div>
                <Button type="button" variant="ghost" onClick={() => setManageStudentsOpen(false)}>
                  Close
                </Button>
              </div>
              {studentsError && <p className="mb-3 text-sm text-destructive" role="alert">{studentsError}</p>}
              {studentsMessage && <p className="mb-3 text-sm text-accent" role="status">{studentsMessage}</p>}
              {studentsLoading ? (
                <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
                  <Loader className="h-4 w-4 animate-spin" /> Loading students...
                </div>
              ) : (
                <div className="space-y-5">
                  {eligibleStudents.length === 0 ? (
                    <p className="rounded-lg bg-muted/50 p-4 text-sm text-muted-foreground">
                      No registered students match this class yet. Add one by name and email below.
                    </p>
                  ) : (
                    <div>
                      <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                        {eligibleStudents.map((student) => (
                          <label key={student.email} className="flex cursor-pointer flex-wrap items-center gap-3 rounded-lg px-2 py-2 text-sm hover:bg-muted/50">
                            <input
                              type="checkbox"
                              checked={selectedStudentEmails.includes(student.email)}
                              onChange={() => toggleStudentSelection(student.email)}
                              className="h-4 w-4 rounded border-border accent-primary"
                            />
                            <span className="font-medium text-foreground">{student.name}</span>
                            <span className="break-all text-muted-foreground">{student.email}</span>
                          </label>
                        ))}
                      </div>
                      <Button
                        type="button"
                        className="mt-4"
                        onClick={() => void addStudentsToClass()}
                        disabled={addStudentsLoading || selectedStudentEmails.length === 0}
                      >
                        {addStudentsLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                        Add {selectedStudentEmails.length || ""} selected students
                      </Button>
                    </div>
                  )}
                  <form onSubmit={addNewStudentToClass} className="space-y-3 rounded-lg border border-border p-4">
                    <h3 className="font-medium text-foreground">Add a student by email</h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Input
                        aria-label="Student name"
                        autoComplete="name"
                        placeholder="Student name"
                        value={newStudentName}
                        onChange={(event) => setNewStudentName(event.target.value)}
                        required
                      />
                      <Input
                        aria-label="Student email"
                        autoComplete="email"
                        type="email"
                        placeholder="student@example.com"
                        value={newStudentEmail}
                        onChange={(event) => setNewStudentEmail(event.target.value)}
                        required
                      />
                    </div>
                    <Button type="submit" disabled={addStudentsLoading || !classData}>
                      {addStudentsLoading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <UserPlus className="mr-2 h-4 w-4" />}
                      Add Student
                    </Button>
                  </form>
                </div>
              )}
            </section>
          )}
          {location.state?.assignmentCreated && (
            <div className="bg-accent/10 text-accent rounded-lg p-4 mb-6" role="status">
              Assignment {location.state.assignmentNumber} created successfully.
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
                  className="bg-card rounded-2xl border border-border p-4 sm:p-6 hover:shadow-lg transition-shadow"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-foreground mb-1">
                        Assignment {assignment.assignment_number}: {assignment.title}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        {assignment.description}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4 sm:gap-4 md:grid-cols-4">
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
      </TeacherLayout>
  );
};

export default ClassDetail;
