import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BookOpen,
  Check,
  Code2,
  Eye,
  EyeOff,
  FileBarChart2,
  HelpCircle,
  Loader,
  Moon,
  Palette,
  ShieldCheck,
  Sun,
  UserRound,
  Accessibility,
  Monitor,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import ProfilePhoto from "@/components/ProfilePhoto";
import { getToken, getUser, logout, type AuthUser } from "@/lib/auth";
import {
  applyAccessibilityPreferences,
  applyTheme,
  type ThemePreference,
} from "@/lib/theme";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
const NAV_ITEMS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "security", label: "Security", icon: ShieldCheck },
  { id: "analysis", label: "Code analysis", icon: Code2 },
  { id: "assignment", label: "Assignments", icon: BookOpen, teacherOnly: true },
  { id: "grading", label: "Grading & reports", icon: FileBarChart2, teacherOnly: true },
  { id: "accessibility", label: "Accessibility", icon: Accessibility },
  { id: "support", label: "Help & support", icon: HelpCircle },
] as const;

type SettingsSection = (typeof NAV_ITEMS)[number]["id"];
type FontSize = "small" | "default" | "large";
type SettingsState = {
  appearance: {
    theme: ThemePreference;
    compact_layout: boolean;
    reduced_motion: boolean;
    font_size: FontSize;
  };
  notifications: {
    assignment_deadline_reminders: boolean;
    submission_confirmation: boolean;
    code_analysis_completed: boolean;
    teacher_feedback: boolean;
    grades_published: boolean;
    submission_received: boolean;
    email_notifications: boolean;
  };
  analysis: {
    language: string;
    file_type: string;
    show_model_confidence: boolean;
    report_format: "text";
  };
  assignment: {
    default_sort: "newest" | "oldest" | "deadline";
    deadline_display: "date_time" | "date_only" | "relative";
    submission_notifications: boolean;
  };
  grading: {
    report_format: "text";
    results_sort: "student_name" | "submission_time" | "score" | "ai_result";
    visible_columns: string[];
    show_confidence: boolean;
  };
};

const DEFAULT_SETTINGS: SettingsState = {
  appearance: { theme: "system", compact_layout: false, reduced_motion: false, font_size: "default" },
  notifications: {
    assignment_deadline_reminders: false,
    submission_confirmation: false,
    code_analysis_completed: false,
    teacher_feedback: false,
    grades_published: false,
    submission_received: false,
    email_notifications: false,
  },
  analysis: { language: "python", file_type: ".py", show_model_confidence: true, report_format: "text" },
  assignment: { default_sort: "newest", deadline_display: "date_time", submission_notifications: true },
  grading: {
    report_format: "text",
    results_sort: "student_name",
    visible_columns: ["student", "status", "ai_result"],
    show_confidence: true,
  },
};

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "teacher" | "student";
}

interface ApiSettingsResponse {
  settings: Partial<SettingsState>;
  user: AuthUser & { student_id?: string; semester?: string; department?: string; designation?: string };
  email_notifications_available: boolean;
  deadline_reminders_available: boolean;
  pdf_reports_available: boolean;
  support_available: boolean;
  deletion_request_pending: boolean;
}

const AccountSettingsDialog = ({ open, onOpenChange, role }: AccountSettingsDialogProps) => {
  const navigate = useNavigate();
  const [section, setSection] = useState<SettingsSection>("profile");
  const [user, setUser] = useState<ApiSettingsResponse["user"] | null>(null);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [department, setDepartment] = useState("");
  const [designation, setDesignation] = useState("");
  const [settings, setSettings] = useState<SettingsState>(DEFAULT_SETTINGS);
  const initialAppearance = useRef({ ...DEFAULT_SETTINGS.appearance });
  const [emailAvailable, setEmailAvailable] = useState(false);
  const [deadlineAvailable, setDeadlineAvailable] = useState(false);
  const [pdfAvailable, setPdfAvailable] = useState(false);
  const [supportAvailable, setSupportAvailable] = useState(false);
  const [deletionRequestPending, setDeletionRequestPending] = useState(false);
  const [supportCategory, setSupportCategory] = useState<"problem" | "feedback">("problem");
  const [supportMessage, setSupportMessage] = useState("");
  const [sendingSupport, setSendingSupport] = useState(false);
  const [requestingDeletion, setRequestingDeletion] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);

  const visibleSections = useMemo(
    () => NAV_ITEMS.filter((item) => !("teacherOnly" in item) || !item.teacherOnly || role === "teacher"),
    [role],
  );

  useEffect(() => {
    if (!open) return;
    let active = true;
    const loadSettings = async () => {
      const token = getToken();
      if (!token) {
        setError("Your session has expired. Please log in again.");
        return;
      }
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        const response = await fetch(`${API_BASE_URL}/api/settings`, {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load settings.");
        if (!active) return;
        const loaded = { ...DEFAULT_SETTINGS, ...data.settings } as SettingsState;
        loaded.appearance = { ...DEFAULT_SETTINGS.appearance, ...data.settings.appearance };
        loaded.notifications = { ...DEFAULT_SETTINGS.notifications, ...data.settings.notifications };
        loaded.analysis = { ...DEFAULT_SETTINGS.analysis, ...data.settings.analysis };
        if (role === "teacher") {
          loaded.assignment = { ...DEFAULT_SETTINGS.assignment, ...data.settings.assignment };
          loaded.grading = { ...DEFAULT_SETTINGS.grading, ...data.settings.grading };
        }
        setSettings(loaded);
        initialAppearance.current = { ...loaded.appearance };
        setUser(data.user);
        setName(data.user.name ?? "");
        setBio(data.user.bio ?? "");
        setDepartment(data.user.department ?? "");
        setDesignation(data.user.designation ?? "");
        setEmailAvailable(Boolean(data.email_notifications_available));
        setDeadlineAvailable(Boolean(data.deadline_reminders_available));
        setPdfAvailable(Boolean(data.pdf_reports_available));
        setSupportAvailable(Boolean(data.support_available));
        setDeletionRequestPending(Boolean(data.deletion_request_pending));
        localStorage.setItem("codexa_user", JSON.stringify(data.user));
        applyTheme(loaded.appearance.theme);
        applyAccessibilityPreferences(
          loaded.appearance.reduced_motion,
          loaded.appearance.font_size,
          loaded.appearance.compact_layout,
        );
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load settings.");
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadSettings();
    return () => {
      active = false;
    };
  }, [open, role]);

  const updateSection = <K extends keyof SettingsState>(
    sectionName: K,
    key: keyof SettingsState[K],
    value: SettingsState[K][keyof SettingsState[K]],
  ) => {
    setSettings((current) => ({
      ...current,
      [sectionName]: { ...current[sectionName], [key]: value },
    }));
    setSuccess(null);
  };

  const saveAllSettings = async () => {
    const token = getToken();
    if (!token) throw new Error("Your session has expired. Please log in again.");
    if (!name.trim()) throw new Error("Please enter your name.");

    const profileResponse = await fetch(`${API_BASE_URL}/api/profile`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({
        name: name.trim(),
        bio: bio.trim(),
        theme: settings.appearance.theme,
        ...(role === "teacher" ? { department: department.trim(), designation: designation.trim() } : {}),
      }),
    });
    const profileData = await profileResponse.json();
    if (!profileResponse.ok || !profileData.user) {
      throw new Error(profileData.error || "Unable to save profile details.");
    }

    const settingsToSave = role === "teacher"
      ? settings
      : {
          appearance: settings.appearance,
          notifications: settings.notifications,
          analysis: settings.analysis,
        };
    const settingsResponse = await fetch(`${API_BASE_URL}/api/settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
      body: JSON.stringify({ settings: settingsToSave }),
    });
    const settingsData = await settingsResponse.json();
    if (!settingsResponse.ok) {
      throw new Error(
        "Profile was saved, but preferences could not be saved: " +
          (settingsData.error || "Please try again."),
      );
    }

    const updatedUser = { ...profileData.user, settings: settingsData.settings };
    localStorage.setItem("codexa_user", JSON.stringify(updatedUser));
    setUser(updatedUser);
    applyTheme(settings.appearance.theme);
    applyAccessibilityPreferences(
      settings.appearance.reduced_motion,
      settings.appearance.font_size,
      settings.appearance.compact_layout,
    );
    initialAppearance.current = { ...settings.appearance };
    window.dispatchEvent(new CustomEvent("codexa:user-updated", { detail: updatedUser }));
    setSuccess("Your settings have been saved.");
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await saveAllSettings();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    if (newPassword !== confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }
    if (!/^[0-9]{6}$/.test(newPassword)) {
      setError("For this account, use exactly six numeric digits as the new password.");
      return;
    }
    const token = getToken();
    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }
    setChangingPassword(true);
    try {
      const response = await fetch(`${API_BASE_URL}/api/security/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to change password.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setSuccess("Password updated successfully.");
    } catch (passwordError) {
      setError(passwordError instanceof Error ? passwordError.message : "Unable to change password.");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = () => {
    logout();
    onOpenChange(false);
    navigate(role === "teacher" ? "/teacher/login" : "/student/login", { replace: true });
  };

  const handleSupportSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const token = getToken();
    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }
    setSendingSupport(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/support/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ category: supportCategory, message: supportMessage.trim() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to send your message.");
      setSupportMessage("");
      setSuccess(data.message || "Your message was sent.");
    } catch (supportError) {
      setError(supportError instanceof Error ? supportError.message : "Unable to send your message.");
    } finally {
      setSendingSupport(false);
    }
  };

  const handleDeletionRequest = async () => {
    if (!window.confirm("Submit a request for an administrator to review your account deletion? This does not immediately delete your account.")) return;
    const token = getToken();
    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }
    setRequestingDeletion(true);
    setError(null);
    setSuccess(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/account/deletion-request`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ confirm: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to record deletion request.");
      setDeletionRequestPending(true);
      setSuccess(data.message);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unable to record deletion request.");
    } finally {
      setRequestingDeletion(false);
    }
  };

  const setTheme = (theme: ThemePreference) => {
    updateSection("appearance", "theme", theme);
    applyTheme(theme);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    if (!nextOpen) {
      applyTheme(initialAppearance.current.theme);
      applyAccessibilityPreferences(
        initialAppearance.current.reduced_motion,
        initialAppearance.current.font_size,
        initialAppearance.current.compact_layout,
      );
    }
    onOpenChange(nextOpen);
  };

  const controlClass = "rounded-xl border border-border bg-card p-4";
  const fieldLabelClass = "mb-1.5 block text-sm font-medium text-foreground";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[94vh] w-[calc(100vw-1rem)] max-w-6xl flex-col gap-0 overflow-hidden rounded-2xl border-border bg-background p-0 shadow-2xl">
        <DialogHeader className="border-b border-border bg-card px-5 py-4 text-left sm:px-7">
          <DialogTitle className="text-xl">Settings</DialogTitle>
          <DialogDescription>Manage your Codexa profile, preferences, and account security.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 flex-1 overflow-hidden md:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="Settings sections" className="flex gap-2 overflow-x-auto border-b border-border bg-card/60 p-3 md:flex-col md:overflow-x-visible md:overflow-y-auto md:border-b-0 md:border-r md:p-4">
            {visibleSections.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setSection(id);
                  setError(null);
                  setSuccess(null);
                }}
                aria-current={section === id ? "page" : undefined}
                className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:w-full ${
                  section === id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {label}
              </button>
            ))}
          </nav>

          <div className="min-h-0 overflow-y-auto p-4 sm:p-6 md:p-7">
            {loading ? (
              <div role="status" className="flex min-h-64 items-center justify-center gap-3 text-muted-foreground">
                <Loader className="h-5 w-5 animate-spin" /> Loading your settings...
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {section === "profile" && (
                  <>
                    <SectionHeading title="Profile settings" description="Your verified account identity and public profile." />
                    <div className={`${controlClass} flex flex-col gap-4 sm:flex-row sm:items-center`}>
                      <ProfilePhoto initials={(name || user?.email || "U").split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase()} role={role} size="large" />
                      <div>
                        <p className="font-semibold text-foreground">{name || user?.email}</p>
                        <p className="mt-1 text-sm text-muted-foreground">Select the profile photo to upload or replace it.</p>
                        <p className="text-xs text-muted-foreground">JPEG, PNG, GIF, WebP · up to 2 MB</p>
                      </div>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className={fieldLabelClass} htmlFor="settings-name">Full name</label>
                        <Input id="settings-name" value={name} onChange={(event) => setName(event.target.value)} maxLength={80} autoComplete="name" />
                      </div>
                      <div>
                        <label className={fieldLabelClass} htmlFor="settings-email">Registered email</label>
                        <Input id="settings-email" value={user?.email ?? ""} readOnly disabled />
                        <p className="mt-1 text-xs text-muted-foreground">Changing email requires a verified account process.</p>
                      </div>
                    </div>
                    {role === "student" ? (
                      <div className={`${controlClass} grid gap-4 sm:grid-cols-2`}>
                        <ReadOnlyValue label="Student ID" value={user?.student_id} />
                        <ReadOnlyValue label="Department / degree" value={user?.department ?? user?.degree} />
                        <ReadOnlyValue label="Semester" value={user?.semester} />
                        <p className="text-xs text-muted-foreground sm:col-span-2">Student ID, email, degree, and semester are read-only here.</p>
                      </div>
                    ) : (
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label className={fieldLabelClass} htmlFor="settings-department">Department</label>
                          <Input id="settings-department" value={department} onChange={(event) => setDepartment(event.target.value)} maxLength={100} />
                        </div>
                        <div>
                          <label className={fieldLabelClass} htmlFor="settings-designation">Designation</label>
                          <Input id="settings-designation" value={designation} onChange={(event) => setDesignation(event.target.value)} maxLength={100} placeholder="e.g. Lecturer" />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className={fieldLabelClass} htmlFor="settings-bio">About me</label>
                      <Textarea id="settings-bio" value={bio} onChange={(event) => setBio(event.target.value)} maxLength={300} rows={4} placeholder="A short introduction..." />
                      <p className="mt-1 text-right text-xs text-muted-foreground">{bio.length}/300</p>
                    </div>
                  </>
                )}

                {section === "appearance" && (
                  <>
                    <SectionHeading title="Appearance" description="Choose how Codexa looks on this device." />
                    <div className="grid gap-3 sm:grid-cols-3">
                      {([
                        { value: "light", label: "Light", Icon: Sun },
                        { value: "dark", label: "Dark", Icon: Moon },
                        { value: "system", label: "System", Icon: Monitor },
                      ] as const).map(({ value, label, Icon }) => (
                        <button key={value} type="button" aria-pressed={settings.appearance.theme === value} onClick={() => setTheme(value)} className={`${controlClass} flex items-center gap-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${settings.appearance.theme === value ? "border-primary bg-primary/5 text-foreground ring-1 ring-primary" : "text-muted-foreground hover:bg-muted"}`}>
                          <Icon className="h-5 w-5" /> {label} mode
                          {settings.appearance.theme === value && <Check className="ml-auto h-4 w-4 text-primary" />}
                        </button>
                      ))}
                    </div>
                    <PreferenceToggle title="Compact layout" description="Reduce spacing in cards and dashboard sections." checked={settings.appearance.compact_layout} onChange={(value) => updateSection("appearance", "compact_layout", value)} />
                  </>
                )}

                {section === "notifications" && (
                  <>
                    <SectionHeading title="Notifications" description="Choose which account emails Codexa may send for supported events." />
                    {!emailAvailable && <Notice>This server has no email provider configured. Email notification controls are unavailable until EMAIL_ADDRESS and EMAIL_PASSWORD are configured.</Notice>}
                    <PreferenceToggle title="Email notifications" description="Allow Codexa to send event emails to your registered address." checked={settings.notifications.email_notifications} disabled={!emailAvailable} onChange={(value) => updateSection("notifications", "email_notifications", value)} />
                    <div className="space-y-3">
                      <PreferenceToggle title="Assignment deadline reminders" description={deadlineAvailable ? "Get reminders before an assignment deadline." : "Not available: this project has no scheduled reminder service."} checked={settings.notifications.assignment_deadline_reminders} disabled={!deadlineAvailable || !emailAvailable} onChange={(value) => updateSection("notifications", "assignment_deadline_reminders", value)} />
                      {role === "student" ? (
                        <>
                          <PreferenceToggle title="Submission confirmation" description="Email me when my submission is received." checked={settings.notifications.submission_confirmation} disabled={!emailAvailable || !settings.notifications.email_notifications} onChange={(value) => updateSection("notifications", "submission_confirmation", value)} />
                          <PreferenceToggle title="Code analysis completed" description="Email me when analysis for a submitted assignment is ready." checked={settings.notifications.code_analysis_completed} disabled={!emailAvailable || !settings.notifications.email_notifications} onChange={(value) => updateSection("notifications", "code_analysis_completed", value)} />
                          <PreferenceToggle title="Teacher feedback received" description="Email me when a teacher adds feedback." checked={settings.notifications.teacher_feedback} disabled={!emailAvailable || !settings.notifications.email_notifications} onChange={(value) => updateSection("notifications", "teacher_feedback", value)} />
                          <PreferenceToggle title="Marks / grades published" description="Email me when a grade is recorded." checked={settings.notifications.grades_published} disabled={!emailAvailable || !settings.notifications.email_notifications} onChange={(value) => updateSection("notifications", "grades_published", value)} />
                        </>
                      ) : (
                        <PreferenceToggle title="New submission received" description="Email me when a student submits an assignment." checked={settings.notifications.submission_received} disabled={!emailAvailable || !settings.notifications.email_notifications} onChange={(value) => {
                          updateSection("notifications", "submission_received", value);
                          updateSection("assignment", "submission_notifications", value);
                        }} />
                      )}
                    </div>
                  </>
                )}

                {section === "security" && (
                  <>
                    <SectionHeading title="Security & privacy" description="Manage your password and current account session." />
                    <form onSubmit={handlePasswordChange} className={`${controlClass} space-y-4`}>
                      <h3 className="font-semibold text-foreground">Change password</h3>
                      <PasswordField id="current-password" label="Current password" value={currentPassword} onChange={setCurrentPassword} visible={showPasswords} onToggle={() => setShowPasswords((value) => !value)} />
                      <PasswordField id="new-password" label="New password" value={newPassword} onChange={setNewPassword} visible={showPasswords} onToggle={() => setShowPasswords((value) => !value)} />
                      <PasswordField id="confirm-password" label="Confirm new password" value={confirmPassword} onChange={setConfirmPassword} visible={showPasswords} onToggle={() => setShowPasswords((value) => !value)} />
                      <p className="text-xs text-muted-foreground">Current Codexa accounts require exactly six numeric digits. Your new password is verified against the current password and stored as a secure hash.</p>
                      <Button type="submit" disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}>
                        {changingPassword && <Loader className="h-4 w-4 animate-spin" />} Update password
                      </Button>
                    </form>
                    <div className={`${controlClass} space-y-3`}>
                      <h3 className="font-semibold text-foreground">Sessions</h3>
                      <p className="text-sm text-muted-foreground">This app uses a stateless 24-hour JWT and does not track individual devices or login history.</p>
                      <Button variant="outline" onClick={handleLogout}>Sign out from this device</Button>
                      <p className="text-xs text-muted-foreground">Sign out from all devices and recent login activity are unavailable until server-side session tracking is added.</p>
                    </div>
                    <div className={`${controlClass} space-y-3`}>
                      <h3 className="font-semibold text-foreground">Account deletion</h3>
                      {deletionRequestPending ? (
                        <p role="status" className="text-sm text-muted-foreground">Your deletion request is recorded and awaiting administrator review.</p>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">This records a request for administrator review; it does not immediately delete your account.</p>
                          <Button type="button" variant="destructive" onClick={handleDeletionRequest} disabled={requestingDeletion}>
                            {requestingDeletion && <Loader className="h-4 w-4 animate-spin" />}
                            Request account deletion
                          </Button>
                        </>
                      )}
                    </div>
                  </>
                )}

                {section === "analysis" && (
                  <>
                    <SectionHeading title="Code analysis preferences" description="Display preferences do not change the detector or its accuracy." />
                    <div className="grid gap-4 sm:grid-cols-2">
                      <SelectField label="Preferred programming language" value={settings.analysis.language} onChange={(value) => updateSection("analysis", "language", value)} options={[["python", "Python"], ["javascript", "JavaScript"], ["java", "Java"], ["cpp", "C++"], ["other", "Other"]]} />
                      <SelectField label="Preferred code file type" value={settings.analysis.file_type} onChange={(value) => updateSection("analysis", "file_type", value)} options={[[".py", ".py"], [".js", ".js"], [".java", ".java"], [".cpp", ".cpp"], [".txt", ".txt"]]} />
                    </div>
                    <PreferenceToggle title="Show model confidence when available" description="Display confidence values provided by the current model." checked={settings.analysis.show_model_confidence} onChange={(value) => updateSection("analysis", "show_model_confidence", value)} />
                    <div className={controlClass}>
                      <p className="text-sm font-medium text-foreground">Report export format</p>
                      <p className="mt-1 text-sm text-muted-foreground">{pdfAvailable ? "PDF reports are configured." : "Text/code download is currently supported. PDF report exports are not configured."}</p>
                    </div>
                  </>
                )}

                {section === "assignment" && role === "teacher" && (
                  <>
                    <SectionHeading title="Assignment preferences" description="Set defaults for managing your assignments and submissions." />
                    <SelectField label="Default assignment sorting" value={settings.assignment.default_sort} onChange={(value) => updateSection("assignment", "default_sort", value as SettingsState["assignment"]["default_sort"])} options={[["newest", "Newest first"], ["oldest", "Oldest first"], ["deadline", "Deadline"]]} />
                    <SelectField label="Deadline display" value={settings.assignment.deadline_display} onChange={(value) => updateSection("assignment", "deadline_display", value as SettingsState["assignment"]["deadline_display"])} options={[["date_time", "Date and time"], ["date_only", "Date only"], ["relative", "Relative time"]]} />
                    <PreferenceToggle title="Submission notifications" description="Email me when a student submits an assignment." checked={settings.assignment.submission_notifications && settings.notifications.submission_received} disabled={!emailAvailable || !settings.notifications.email_notifications} onChange={(value) => {
                      updateSection("assignment", "submission_notifications", value);
                      updateSection("notifications", "submission_received", value);
                    }} />
                  </>
                )}

                {section === "grading" && role === "teacher" && (
                  <>
                    <SectionHeading title="Grading & report preferences" description="Keep authorship estimates separate from similarity/plagiarism findings." />
                    <SelectField label="Default results table sorting" value={settings.grading.results_sort} onChange={(value) => updateSection("grading", "results_sort", value as SettingsState["grading"]["results_sort"])} options={[["student_name", "Student name"], ["submission_time", "Submission time"], ["score", "Score"], ["ai_result", "AI result"]]} />
                    <div className={`${controlClass} space-y-3`}>
                      <h3 className="text-sm font-semibold text-foreground">Visible result columns</h3>
                      {[
                        ["student", "Student"],
                        ["status", "Submission status"],
                        ["ai_result", "AI vs. human estimate"],
                        ["confidence", "Model confidence"],
                        ["submission_time", "Submission date"],
                        ["score", "Grade"],
                      ].map(([key, label]) => (
                        <CheckboxPreference
                          key={key}
                          label={label}
                          checked={settings.grading.visible_columns.includes(key)}
                          disabled={key === "student"}
                          onChange={(checked) => updateSection("grading", "visible_columns", checked
                            ? [...settings.grading.visible_columns, key]
                            : settings.grading.visible_columns.filter((column) => column !== key))}
                        />
                      ))}
                    </div>
                    <PreferenceToggle title="Show confidence only when available" description="Never infer or fabricate confidence values." checked={settings.grading.show_confidence} onChange={(value) => updateSection("grading", "show_confidence", value)} />
                    <p className="text-sm text-muted-foreground">Exports currently support submitted code as plain text only. PDF reports are not available.</p>
                  </>
                )}

                {section === "accessibility" && (
                  <>
                    <SectionHeading title="Accessibility" description="Adjust motion, spacing, and text size for comfortable use." />
                    <PreferenceToggle title="Reduce animations" description="Minimize transitions and animations across Codexa." checked={settings.appearance.reduced_motion} onChange={(value) => {
                      updateSection("appearance", "reduced_motion", value);
                      applyAccessibilityPreferences(value, settings.appearance.font_size, settings.appearance.compact_layout);
                    }} />
                    <div>
                      <label className={fieldLabelClass} htmlFor="font-size-setting">Text size</label>
                      <select id="font-size-setting" className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" value={settings.appearance.font_size} onChange={(event) => {
                        const value = event.target.value as FontSize;
                        updateSection("appearance", "font_size", value);
                        applyAccessibilityPreferences(settings.appearance.reduced_motion, value, settings.appearance.compact_layout);
                      }}>
                        <option value="small">Small</option><option value="default">Default</option><option value="large">Large</option>
                      </select>
                    </div>
                    <PreferenceToggle title="Compact dashboard layout" description="Use less spacing while retaining keyboard focus indicators." checked={settings.appearance.compact_layout} onChange={(value) => {
                      updateSection("appearance", "compact_layout", value);
                      applyAccessibilityPreferences(settings.appearance.reduced_motion, settings.appearance.font_size, value);
                    }} />
                  </>
                )}

                {section === "support" && (
                  <>
                    <SectionHeading title="Help & support" description="Project information and answers to common questions." />
                    <div className={`${controlClass} space-y-4`}>
                      <h3 className="font-semibold text-foreground">FAQs</h3>
                      <Faq question="Does the AI writing estimate prove that code was AI-generated?" answer="No. It is a model estimate and may be wrong. It is not proof and should not be the only basis for an academic decision." />
                      <Faq question="Is the AI estimate a plagiarism score?" answer="No. AI-vs-human authorship estimation is different from checking code against external sources. Similarity results are only shown when an actual similarity checker provides them." />
                      <Faq question="Why are deadline emails unavailable?" answer="This project currently has no background scheduler to send reminders before due dates." />
                      <Faq question="Can I export a PDF report?" answer="No. The current download feature exports submitted code as text; PDF report generation is not configured." />
                    </div>
                    <div className={controlClass}>
                      <h3 className="font-semibold text-foreground">Codexa project</h3>
                      <p className="mt-1 text-sm text-muted-foreground">Codexa · Student and teacher assignment platform with AI-authorship analysis.</p>
                      <p className="mt-2 text-sm text-muted-foreground">Application version: 0.0.0</p>
                      <p className="mt-3 text-xs text-muted-foreground">Feedback delivery and account deletion review require a configured support/admin contact, which is not available in this environment.</p>
                    </div>
                    <form onSubmit={handleSupportSubmit} className={`${controlClass} space-y-4`}>
                      <div>
                        <h3 className="font-semibold text-foreground">Report a problem or send feedback</h3>
                        <p className="mt-1 text-sm text-muted-foreground">
                          {supportAvailable ? "Your message will be emailed to the configured Codexa support address." : "Support email is not configured on this server; messages cannot currently be delivered."}
                        </p>
                      </div>
                      <label className="block">
                        <span className={fieldLabelClass}>Message type</span>
                        <select value={supportCategory} onChange={(event) => setSupportCategory(event.target.value as "problem" | "feedback")} disabled={!supportAvailable} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <option value="problem">Report a problem</option>
                          <option value="feedback">Send feedback</option>
                        </select>
                      </label>
                      <label className="block">
                        <span className={fieldLabelClass}>Message</span>
                        <Textarea value={supportMessage} onChange={(event) => setSupportMessage(event.target.value)} maxLength={3000} rows={4} required disabled={!supportAvailable} placeholder="Describe the issue or feedback..." />
                      </label>
                      <Button type="submit" disabled={!supportAvailable || sendingSupport || !supportMessage.trim()}>
                        {sendingSupport && <Loader className="h-4 w-4 animate-spin" />}
                        Send to support
                      </Button>
                    </form>
                  </>
                )}

                {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
                {success && <p role="status" className="rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm text-foreground">{success}</p>}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border bg-card/60 px-4 py-3 sm:px-6">
          <p className="hidden text-xs text-muted-foreground sm:block">Settings are saved to your Codexa account.</p>
          <div className="ml-auto flex gap-2">
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)} disabled={saving || changingPassword}>Close</Button>
            {!["security", "support"].includes(section) && (
              <Button type="button" onClick={handleSave} disabled={loading || saving}>
                {saving ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save changes
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const SectionHeading = ({ title, description }: { title: string; description: string }) => (
  <div className="border-b border-border pb-4">
    <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{description}</p>
  </div>
);

const ReadOnlyValue = ({ label, value }: { label: string; value?: string | null }) => (
  <div>
    <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
    <p className="mt-1 text-sm text-foreground">{value?.trim() || "Not provided"}</p>
  </div>
);

const Notice = ({ children }: { children: React.ReactNode }) => (
  <div className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 p-3 text-sm text-foreground">{children}</div>
);

const PreferenceToggle = ({
  title,
  description,
  checked,
  disabled = false,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (value: boolean) => void;
}) => (
  <label className={`flex items-start justify-between gap-4 rounded-xl border border-border bg-card p-4 ${disabled ? "opacity-60" : "cursor-pointer hover:bg-muted/50"}`}>
    <span>
      <span className="block text-sm font-medium text-foreground">{title}</span>
      <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
    </span>
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
  </label>
);

const SelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[][];
  onChange: (value: string) => void;
}) => (
  <div>
    <label className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
    </select>
  </div>
);

const CheckboxPreference = ({ label, checked, disabled = false, onChange }: { label: string; checked: boolean; disabled?: boolean; onChange: (value: boolean) => void }) => (
  <label className="flex items-center gap-3 text-sm text-foreground">
    <input type="checkbox" checked={checked} disabled={disabled} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    {label}
  </label>
);

const PasswordField = ({
  id,
  label,
  value,
  onChange,
  visible,
  onToggle,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  visible: boolean;
  onToggle: () => void;
}) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-foreground">{label}</label>
    <div className="relative">
      <Input id={id} type={visible ? "text" : "password"} value={value} onChange={(event) => onChange(event.target.value)} inputMode="numeric" autoComplete="off" maxLength={6} />
      <button type="button" onClick={onToggle} aria-label={visible ? "Hide password" : "Show password"} className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  </div>
);

const Faq = ({ question, answer }: { question: string; answer: string }) => (
  <details className="group border-b border-border pb-3 last:border-0 last:pb-0">
    <summary className="cursor-pointer list-none text-sm font-medium text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{question}</summary>
    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{answer}</p>
  </details>
);

export default AccountSettingsDialog;
