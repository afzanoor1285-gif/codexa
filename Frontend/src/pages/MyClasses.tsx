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
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import MobileNavigation from "@/components/MobileNavigation";
import { getToken } from "@/lib/auth";

interface Class {
  id: string;
  name: string;
  code: string;
  section: string;
  studentCount: number;
}

interface Student {
  name: string;
  email: string;
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
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

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
          student_emails: selectedStudents,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to create class");
      }

      setClassName("");
      setClassCode("");
      setSection("");
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

  const handleClassClick = (classId: string) => {
    navigate(`/teacher/class/${classId}`);
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
          {showCreateForm && (
            <form
              onSubmit={handleCreateClass}
              className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-6"
            >
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Create a class</h2>
                  <p className="text-sm text-muted-foreground">
                    Add class details and choose the students who belong to it.
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

              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold text-foreground">Class students</h3>
                {studentsLoading ? (
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
                ) : (
                  <div className="max-h-48 space-y-2 overflow-y-auto rounded-lg border border-border p-3">
                    {students.map((student) => (
                      <label key={student.email} className="flex cursor-pointer flex-wrap items-center gap-3 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(student.email)}
                          onChange={() => toggleStudent(student.email)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                        <span className="text-foreground">{student.name}</span>
                        <span className="break-all text-muted-foreground">{student.email}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <Button type="submit" className="mt-5" disabled={createLoading || studentsLoading}>
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
                    <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-secondary transition-colors" />
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-foreground">{cls.section}</p>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="w-4 h-4" />
                      <span>{cls.studentCount} Students</span>
                    </div>
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

export default MyClasses;
