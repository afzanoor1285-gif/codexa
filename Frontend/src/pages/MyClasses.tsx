import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  BookOpen,
  Search,
  Bell,
  Settings,
  LogOut,
  ChevronRight,
  Loader,
  Plus,
  Copy,
  Trash2,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import MobileNavigation from "@/components/MobileNavigation";
import { getToken } from "@/lib/auth";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  getStudentProgramLabel,
  STUDENT_PROGRAMS,
  STUDENT_SEMESTERS,
} from "@/lib/student-programs";

interface Class {
  id: string;
  name: string;
  code: string;
  section: string;
  studentCount: number;
  invitedCount?: number;
  degree?: string;
  semester?: number;
}

interface Student {
  name: string;
  email: string;
  degree?: string | null;
  semester?: number | null;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

const MyClasses = () => {
  const navigate = useNavigate();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState<string | null>(null);
  const [className, setClassName] = useState("");
  const [classCode, setClassCode] = useState("");
  const [section, setSection] = useState("");
  const [classProgram, setClassProgram] = useState("");
  const [classSemester, setClassSemester] = useState("");
  const [copiedClassId, setCopiedClassId] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [classToDelete, setClassToDelete] = useState<Class | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      const token = localStorage.getItem("codexa_token");
      
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch classes");
      }

      const data = await response.json();
      
      setClasses(data.classes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const openCreateForm = async () => {
    setShowCreateForm(true);
    setCreateError(null);
    setStudentsError(null);
    setStudentsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/students`, {
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to load students");
      }
      setStudents(data.students || []);
    } catch (err) {
      setStudentsError(err instanceof Error ? err.message : "Unable to load students");
    } finally {
      setStudentsLoading(false);
    }
  };

  const toggleStudent = (email: string) => {
    setSelectedStudents((current) =>
      current.includes(email)
        ? current.filter((selectedEmail) => selectedEmail !== email)
        : [...current, email],
    );
  };

  const handleCreateClass = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreateError(null);
    setCreateLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken() ?? ""}`,
        },
        body: JSON.stringify({
          name: className,
          code: classCode,
          section,
          degree: classProgram,
          semester: Number(classSemester),
          invited_emails: selectedStudents,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to create class");
      }

      setClassName("");
      setClassCode("");
      setSection("");
      setClassProgram("");
      setClassSemester("");
      setSelectedStudents([]);
      setShowCreateForm(false);
      await fetchClasses();
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Unable to create class");
    } finally {
      setCreateLoading(false);
    }
  };

  const filteredClasses = classes.filter(
    (cls) =>
      cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cls.code.toLowerCase().includes(searchTerm.toLowerCase())
  );
  const eligibleStudents = students.filter(
    (student) =>
      student.degree === classProgram
      && String(student.semester || "") === classSemester,
  );

  const createJoinLink = (classRecord: Class) => {
    const joinUrl = new URL("/student/login", window.location.origin);
    joinUrl.searchParams.set("join", classRecord.id);
    joinUrl.searchParams.set("register", "1");
    if (classRecord.degree) joinUrl.searchParams.set("degree", classRecord.degree);
    if (classRecord.semester) joinUrl.searchParams.set("semester", String(classRecord.semester));
    return joinUrl.toString();
  };

  const copyJoinLink = async (classRecord: Class) => {
    try {
      await navigator.clipboard.writeText(createJoinLink(classRecord));
      setCopiedClassId(classRecord.id);
      setCopyError(null);
    } catch {
      setCopyError("Couldn't copy the class link. Please check clipboard access and try again.");
    }
  };

  const handleClassClick = (classId: string) => {
    navigate(`/teacher/class/${classId}`);
  };

  const handleDeleteClass = async () => {
    if (!classToDelete) return;
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classToDelete.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken() ?? ""}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to delete class.");
      setClassToDelete(null);
      await fetchClasses();
    } catch (deleteError) {
      setDeleteError(deleteError instanceof Error ? deleteError.message : "Unable to delete class.");
      setClassToDelete(null);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("codexa_token");
    localStorage.removeItem("codexa_user");
    navigate("/teacher/login");
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
          {[
            { icon: BookOpen, label: "My Classes", id: "classes" },
            { icon: Users, label: "Students", id: "students" },
            { icon: Settings, label: "Settings", id: "settings" },
          ].map((item) => (
            <button
              key={item.id}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-colors ${
                item.id === "classes"
                  ? "bg-secondary/10 text-secondary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="absolute bottom-4 left-4 right-4">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground hover:text-destructive transition-colors w-full"
          >
            <LogOut className="w-5 h-5" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3 z-10">
          <MobileNavigation
            items={[
              { label: "My Classes", icon: BookOpen, href: "/teacher/classes" },
              { label: "Teacher Dashboard", icon: Users, href: "/teacher/dashboard" },
              { label: "Sign Out", icon: LogOut, href: "/teacher/login", onSelect: handleLogout },
            ]}
          />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">My Classes</h1>
            <p className="text-sm text-muted-foreground">
              Manage your courses and assignments
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Button onClick={openCreateForm} className="flex items-center gap-2 px-3 sm:px-4">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Create Class</span>
            </Button>
            <Button variant="outline" size="icon">
              <Bell className="w-5 h-5" />
            </Button>
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-semibold">
              T
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6">
          {deleteError && (
            <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
              {deleteError}
            </p>
          )}
          {showCreateForm && (
            <form
              onSubmit={handleCreateClass}
              className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Create a class</h2>
                  <p className="text-sm text-muted-foreground">
                    Create a class for a specific program and semester. Matching students will find it on their dashboard.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowCreateForm(false)}
                >
                  Cancel
                </Button>
              </div>
              {createError && (
                <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                  {createError}
                </p>
              )}
              <div className="grid gap-4 md:grid-cols-3">
                <Input
                  aria-label="Class name"
                  placeholder="Class name (e.g. Data Structures)"
                  value={className}
                  onChange={(event) => setClassName(event.target.value)}
                  required
                />
                <Input
                  aria-label="Class code"
                  placeholder="Course code (e.g. CS201)"
                  value={classCode}
                  onChange={(event) => setClassCode(event.target.value)}
                  required
                />
                <Input
                  aria-label="Section"
                  placeholder="Section (e.g. Fall 2026 - A)"
                  value={section}
                  onChange={(event) => setSection(event.target.value)}
                  required
                />
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="class-program" className="mb-2 block text-sm font-semibold text-foreground">
                    Student program
                  </label>
                  <select
                    id="class-program"
                    value={classProgram}
                    onChange={(event) => {
                      setClassProgram(event.target.value);
                      setSelectedStudents([]);
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Choose a program</option>
                    {STUDENT_PROGRAMS.map((program) => (
                      <option key={program.value} value={program.value}>{program.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="class-semester" className="mb-2 block text-sm font-semibold text-foreground">
                    Semester
                  </label>
                  <select
                    id="class-semester"
                    value={classSemester}
                    onChange={(event) => {
                      setClassSemester(event.target.value);
                      setSelectedStudents([]);
                    }}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    required
                  >
                    <option value="">Choose semester</option>
                    {STUDENT_SEMESTERS.map((semester) => (
                      <option key={semester} value={semester}>Semester {semester}</option>
                    ))}
                  </select>
                </div>
              </div>
              <details className="mt-5 rounded-lg border border-border p-3">
                <summary className="cursor-pointer text-sm font-medium text-foreground">
                  Optional: invite registered students now
                </summary>
                <p className="my-3 text-sm text-muted-foreground">
                  Selected students will get a course registration notification. They must register themselves from My Courses.
                </p>
                <h3 className="mb-2 text-sm font-semibold text-foreground">Matching students</h3>
                {!classProgram || !classSemester ? (
                  <p className="text-sm text-muted-foreground">
                    Choose a program and semester above to see matching students.
                  </p>
                ) : studentsLoading ? (
                  <div className="flex items-center gap-2 py-3 text-sm text-muted-foreground">
                    <Loader className="h-4 w-4 animate-spin" />
                    Loading students...
                  </div>
                ) : studentsError ? (
                  <p className="text-sm text-destructive" role="alert">{studentsError}</p>
                ) : students.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students are registered yet. Add students from the{" "}
                    <Link to="/teacher/dashboard" className="font-medium text-secondary hover:underline">
                      Students page
                    </Link>
                    , then return here to assign them to this class.
                  </p>
                ) : eligibleStudents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No students are registered in {getStudentProgramLabel(classProgram)}, semester {classSemester}, yet.
                  </p>
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                    {eligibleStudents.map((student) => (
                      <label key={student.email} className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.email)}
                          onChange={() => toggleStudent(student.email)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span className="text-foreground">{student.name}</span>
                        <span className="break-all text-muted-foreground">{student.email}</span>
                        <span className="rounded-full bg-secondary/10 px-2 py-1 text-xs text-secondary">
                          {getStudentProgramLabel(student.degree)} · Semester {student.semester}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </details>
              <Button type="submit" className="mt-5" disabled={createLoading || !classProgram || !classSemester}>
                {createLoading ? (
                  <>
                    <Loader className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Class"
                )}
              </Button>
            </form>
          )}

          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search classes by name or code..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader className="w-8 h-8 text-muted-foreground animate-spin" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive rounded-lg p-4 mb-6">
              {error}
            </div>
          ) : filteredClasses.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                {searchTerm
                  ? "No classes found matching your search"
                  : "No classes yet. Create your first class to get started."}
              </p>
              {!searchTerm && (
                <Button onClick={openCreateForm} className="mt-4">
                  <Plus className="mr-2 h-4 w-4" />
                  Create Class
                </Button>
              )}
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredClasses.map((cls) => (
                <div
                  key={cls.id}
                  onClick={() => handleClassClick(cls.id)}
                  className="group bg-card rounded-2xl border border-border p-4 sm:p-6 hover:border-secondary/50 hover:shadow-lg transition-all cursor-pointer"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {cls.name}
                      </h3>
                      <p className="text-sm text-muted-foreground">{cls.code}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        aria-label={`Delete ${cls.name}`}
                        title="Delete class"
                        onClick={(event) => {
                          event.stopPropagation();
                          setDeleteError(null);
                          setClassToDelete(cls);
                        }}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors" />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-foreground">{cls.section}</p>
                    <p className="text-sm text-muted-foreground">
                      {getStudentProgramLabel(cls.degree)}
                      {cls.semester ? ` · Semester ${cls.semester}` : ""}
                    </p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{cls.studentCount} Students</span>
                    </div>
                    {!!cls.invitedCount && (
                      <p className="text-xs text-muted-foreground">
                        {cls.invitedCount} course {cls.invitedCount === 1 ? "invitation" : "invitations"} sent
                      </p>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={(event) => {
                        event.stopPropagation();
                        void copyJoinLink(cls);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      {copiedClassId === cls.id ? "Invitation link copied" : "Copy class invitation link"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {copyError && (
            <p className="mt-4 text-sm text-destructive" role="alert">{copyError}</p>
          )}
        </div>
      </main>
      <AlertDialog
        open={classToDelete !== null}
        onOpenChange={(open) => {
          if (!open && !deleteLoading) setClassToDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {classToDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the class and its student enrollment list. Existing assignment and submission records are kept, but students will no longer find or access this class.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteLoading}
              onClick={(event) => {
                event.preventDefault();
                void handleDeleteClass();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteLoading ? "Deleting..." : "Delete class"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MyClasses;
