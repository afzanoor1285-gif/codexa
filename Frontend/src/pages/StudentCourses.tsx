import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { BookOpen, Bell, FileCode, Loader, LogOut, Settings, TrendingUp, Upload, Award, Users, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import BrandLogo from "@/components/BrandLogo";
import ProfilePhoto from "@/components/ProfilePhoto";
import AccountSettingsDialog from "@/components/AccountSettingsDialog";
import MobileNavigation from "@/components/MobileNavigation";
import { getStudentProgramLabel } from "@/lib/student-programs";
import { getToken, getUser, logout, type AuthUser } from "@/lib/auth";

interface StudentClass {
  id: string;
  name: string;
  code: string;
  section: string;
  degree: string;
  semester: number;
  teacherName: string;
  enrolled: boolean;
  invited: boolean;
}

interface CourseNotification {
  id: string;
  type: "course_invitation";
  title: string;
  message: string;
  course_id: string;
  course_name: string;
  teacher_name: string;
  created_at: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

const StudentCourses = () => {
  const [user, setUser] = useState<AuthUser | null>(getUser);
  const [searchParams] = useSearchParams();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [notifications, setNotifications] = useState<CourseNotification[]>([]);
  const [notificationsError, setNotificationsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [joiningClassId, setJoiningClassId] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(searchParams.get("joinError"));
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
      setUser((event as CustomEvent<AuthUser | null>).detail);
    };
    window.addEventListener("codexa:user-updated", updateUser);
    return () => window.removeEventListener("codexa:user-updated", updateUser);
  }, []);

  useEffect(() => {
    let active = true;
    const loadNotifications = async () => {
      try {
        const token = getToken();
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const response = await fetch(`${API_BASE_URL}/api/student/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load notifications.");
        if (active) {
          setNotifications(data.notifications || []);
          setNotificationsError(null);
        }
      } catch (loadError) {
        if (active) {
          setNotificationsError(
            loadError instanceof Error ? loadError.message : "Unable to load notifications.",
          );
        }
      }
    };
    void loadNotifications();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    const loadClasses = async () => {
      if (!user?.degree || !user.semester) {
        setClasses([]);
        setError(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const token = getToken();
        if (!token) throw new Error("Your session has expired. Please log in again.");
        const response = await fetch(`${API_BASE_URL}/api/student/classes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load your courses.");
        if (active) setClasses(data.classes || []);
      } catch (loadError) {
        if (active) {
          setError(
            loadError instanceof TypeError
              ? "Couldn't connect to Codexa. Check your connection and try again."
              : loadError instanceof Error
                ? loadError.message
                : "Unable to load your courses.",
          );
          setClasses([]);
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadClasses();
    return () => {
      active = false;
    };
  }, [user?.degree, user?.semester, reloadKey]);

  const handleJoinClass = async (classId: string) => {
    const token = getToken();
    if (!token) {
      setJoinError("Your session has expired. Please log in again.");
      return;
    }
    setJoiningClassId(classId);
    setJoinError(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/classes/${classId}/enroll`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to join this course.");
      setClasses((current) =>
        current.map((classRecord) =>
          classRecord.id === classId ? { ...classRecord, enrolled: true } : classRecord,
        ),
      );
      setNotifications((current) => current.filter((notification) => notification.course_id !== classId));
    } catch (joinError) {
      setJoinError(joinError instanceof Error ? joinError.message : "Unable to join this course.");
    } finally {
      setJoiningClassId(null);
    }
  };

  const dismissNotification = async (notificationId: string) => {
    const token = getToken();
    if (!token) {
      setJoinError("Your session has expired. Please log in again.");
      return;
    }
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/student/notifications/${notificationId}/read`,
        { method: "POST", headers: { Authorization: `Bearer ${token}` } },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to update notification.");
      setNotifications((current) => current.filter((notification) => notification.id !== notificationId));
    } catch (notificationError) {
      setJoinError(notificationError instanceof Error ? notificationError.message : "Unable to update notification.");
    }
  };

  const registeredCount = classes.filter((classRecord) => classRecord.enrolled).length;

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-border bg-card p-4 lg:block">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <BrandLogo className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold text-foreground">Codexa</span>
        </Link>
        <nav className="space-y-1">
          {[
            { icon: TrendingUp, label: "Overview", href: "/student/dashboard" },
            { icon: FileCode, label: "My Assignments", href: "/student/dashboard#my-assignments" },
            { icon: Upload, label: "Submit Code", href: "/student/submit" },
            { icon: Award, label: "Grades", href: "/student/dashboard#your-progress" },
            { icon: BookOpen, label: "My Courses", href: "/student/courses", active: true },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.href}
              aria-current={item.active ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                item.active ? "bg-secondary/10 text-secondary" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          ))}
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Settings className="h-5 w-5" />
            Settings
          </button>
        </nav>
        <div className="absolute bottom-4 left-4 right-4">
          <Link
            to="/"
            onClick={logout}
            className="flex items-center gap-3 px-4 py-3 text-sm text-muted-foreground transition-colors hover:text-destructive"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Link>
        </div>
      </aside>

      <main className="lg:ml-64">
        <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm sm:px-6 sm:py-4">
          <MobileNavigation
            items={[
              { label: "Overview", icon: TrendingUp, href: "/student/dashboard" },
              { label: "My Assignments", icon: FileCode, href: "/student/dashboard#my-assignments" },
              { label: "Submit Code", icon: Upload, href: "/student/submit" },
              { label: "Grades and Progress", icon: Award, href: "/student/dashboard#your-progress" },
              { label: "My Courses", icon: BookOpen, href: "/student/courses" },
              { label: "Settings", icon: Settings, onSelect: () => setSettingsOpen(true) },
              { label: "Sign Out", icon: LogOut, href: "/", onSelect: logout },
            ]}
          />
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-bold text-foreground sm:text-2xl">My Courses</h1>
            <p className="truncate text-sm text-muted-foreground">
              {studentName} · {user?.email || "Email unavailable"} · {user?.degree || "Degree not provided"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 sm:gap-4">
            <Button
              variant="outline"
              size="icon"
              className="relative hidden sm:inline-flex"
              aria-label={`${notifications.length} unread notifications`}
              onClick={() => document.getElementById("course-notifications")?.scrollIntoView({ behavior: "smooth" })}
              disabled={notifications.length === 0}
            >
              <Bell className="h-5 w-5" />
              {notifications.length > 0 && (
                <span className="absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                  {notifications.length}
                </span>
              )}
            </Button>
            <ProfilePhoto initials={initials} role="student" />
          </div>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          {(notifications.length > 0 || notificationsError) && (
            <section id="course-notifications" className="scroll-mt-24 rounded-2xl border border-secondary/20 bg-secondary/5 p-4 sm:p-6" aria-labelledby="course-notifications-title">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 id="course-notifications-title" className="font-semibold text-foreground">
                    Course registration notifications
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your teacher invited you. Registration is completed by you.
                  </p>
                </div>
                {notifications.length > 0 && (
                  <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-semibold text-secondary">
                    {notifications.length} new
                  </span>
                )}
              </div>
              {notificationsError ? (
                <p className="text-sm text-destructive" role="alert">{notificationsError}</p>
              ) : (
                <div className="space-y-3">
                  {notifications.map((notification) => {
                    const classRecord = classes.find((item) => item.id === notification.course_id);
                    return (
                      <article key={notification.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-4">
                        <div className="min-w-0">
                          <p className="font-medium text-foreground">{notification.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          {classRecord && !classRecord.enrolled && (
                            <Button
                              size="sm"
                              onClick={() => void handleJoinClass(classRecord.id)}
                              disabled={joiningClassId !== null}
                            >
                              {joiningClassId === classRecord.id ? "Registering..." : "Register"}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => void dismissNotification(notification.id)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              )}
            </section>
          )}
          <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-foreground">Courses for your cohort</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {user?.degree
                  ? `${getStudentProgramLabel(user.degree)}${user.semester ? ` · Semester ${user.semester}` : ""}. Register for courses when you're ready.`
                  : "Set your program and semester to find courses created for your cohort."}
              </p>
            </div>

            {joinError && (
              <p className="mb-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive" role="alert">
                {joinError}
              </p>
            )}

            {!user?.degree || !user.semester ? (
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-muted-foreground">
                  Add your degree and current semester in Settings to see matching courses.
                </p>
                <Button className="mt-3" variant="outline" onClick={() => setSettingsOpen(true)}>
                  Set up my program
                </Button>
              </div>
            ) : loading ? (
              <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader className="h-4 w-4 animate-spin" /> Loading your courses...
              </div>
            ) : error ? (
              <div className="rounded-xl bg-muted/50 p-4">
                <p className="text-sm text-destructive" role="alert">{error}</p>
                <Button className="mt-3" variant="outline" onClick={() => setReloadKey((key) => key + 1)}>
                  Try again
                </Button>
              </div>
            ) : (
              <>
                <div className="mb-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Available courses</p>
                    <p className="mt-1 text-2xl font-bold text-foreground">{classes.length}</p>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-4">
                    <p className="text-sm text-muted-foreground">Registered courses</p>
                    <p className="mt-1 text-2xl font-bold text-secondary">{registeredCount}</p>
                  </div>
                </div>

                {classes.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center">
                    <BookOpen className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
                    <p className="font-medium text-foreground">No courses available yet</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Courses created for your program and semester will appear here.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {classes.map((classRecord) => (
                      <article key={classRecord.id} className="rounded-xl border border-border p-4 sm:p-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <h3 className="break-words font-semibold text-foreground">{classRecord.name}</h3>
                            <p className="mt-1 text-sm text-muted-foreground">
                              {classRecord.code} · {classRecord.section}
                            </p>
                            <p className="mt-2 text-sm text-muted-foreground">
                              Semester {classRecord.semester} · {classRecord.teacherName}
                            </p>
                          </div>
                          {classRecord.enrolled ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent" role="status">
                              <CheckCircle2 className="h-3.5 w-3.5" /> Registered
                            </span>
                          ) : (
                            <div className="flex flex-col items-start gap-2">
                              {classRecord.invited && (
                                <span className="rounded-full bg-secondary/10 px-2.5 py-1 text-xs font-medium text-secondary">
                                  Teacher invited you
                                </span>
                              )}
                              <Button
                                size="sm"
                                onClick={() => void handleJoinClass(classRecord.id)}
                                disabled={joiningClassId !== null}
                              >
                                {joiningClassId === classRecord.id ? (
                                  <><Loader className="mr-2 h-4 w-4 animate-spin" /> Registering...</>
                                ) : (
                                  <><Users className="mr-2 h-4 w-4" /> Register</>
                                )}
                              </Button>
                            </div>
                          )}
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </>
            )}
          </section>
        </div>
      </main>
      <AccountSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} role="student" />
    </div>
  );
};

export default StudentCourses;
