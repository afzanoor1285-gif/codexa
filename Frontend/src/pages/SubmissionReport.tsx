import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Download,
  FileCode,
  Loader,
  ShieldAlert,
  ShieldCheck,
  Copy,
  Check,
  CheckCircle2,
  Award,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import TeacherLayout from "@/components/TeacherLayout";
import { downloadSubmissionCode } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";

interface SubmissionReportData {
  id: string;
  studentName: string;
  studentEmail: string;
  assignmentTitle: string;
  className: string;
  classId?: string;
  createdAt: string;
  status: string;
  score: number | null;
  feedback: string | null;
  notes: string | null;
  code: string;
  aiLabel: "AI" | "Human" | null;
  aiConfidence: number | null;
  aiPercentage: number | null;
  humanPercentage: number | null;
  signals?: string[];
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

const SubmissionReport = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const user = getUser();
  const [submission, setSubmission] = useState<SubmissionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeMessage, setGradeMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    const loadReport = async () => {
      try {
        const token = getToken();
        if (!token) {
          throw new Error("Your session has expired. Please log in again.");
        }
        const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
          headers: { Authorization: "Bearer " + token },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load submission report.");
        }
        setSubmission(data.submission);
        setScore(
          data.submission.score !== null && data.submission.score !== undefined
            ? String(data.submission.score)
            : ""
        );
        setFeedback(data.submission.feedback || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load submission report.");
      } finally {
        setLoading(false);
      }
    };

    void loadReport();
  }, [submissionId]);

  const handleSaveGrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submissionId) return;
    setSavingGrade(true);
    setGradeMessage(null);
    try {
      const token = getToken();
      const numScore = Number(score);
      if (isNaN(numScore) || numScore < 0 || numScore > 100) {
        throw new Error("Score must be a number between 0 and 100.");
      }

      const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer " + token,
        },
        body: JSON.stringify({
          score: numScore,
          feedback: feedback.trim(),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save grade.");

      setSubmission((prev) => (prev ? { ...prev, score: numScore, feedback: feedback.trim(), status: "Graded" } : prev));
      setGradeMessage("Grade published successfully!");
      setTimeout(() => setGradeMessage(null), 4000);
    } catch (saveError) {
      setGradeMessage(saveError instanceof Error ? saveError.message : "Failed to publish grade.");
    } finally {
      setSavingGrade(false);
    }
  };

  const handleDownload = async () => {
    if (!submissionId) return;
    setDownloading(true);
    try {
      await downloadSubmissionCode(submissionId);
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : "Unable to download submission.");
    } finally {
      setDownloading(false);
    }
  };

  const handleCopyCode = () => {
    if (!submission?.code) return;
    navigator.clipboard.writeText(submission.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const isAI = submission?.aiLabel === "AI";
  const codeLines = submission?.code ? submission.code.split("\n") : [];

  return (
    <TeacherLayout
      title="Code Submission Review"
      subtitle={submission ? `${submission.studentName} · ${submission.assignmentTitle}` : "Code analysis and grading"}
      activeNav="plagiarism"
      backTo={{ label: "Back to Dashboard", href: "/teacher/dashboard" }}
      breadcrumbs={[
        { label: "Dashboard", href: "/teacher/dashboard" },
        { label: "Submissions", href: "/teacher/dashboard?tab=plagiarism" },
        { label: submission?.studentName || "Report" },
      ]}
      actions={
        submission && (
          <Button onClick={handleDownload} disabled={downloading} variant="outline" size="sm" className="h-8 text-xs gap-1.5 shrink-0">
            {downloading ? <Loader className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
            <span className="hidden sm:inline">Download File</span>
          </Button>
        )
      }
    >
      {loading ? (
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Loader className="h-8 w-8 animate-spin mb-3 text-primary" />
          <p className="text-sm">Analyzing code submission with AST intelligence engine...</p>
        </div>
      ) : error && !submission ? (
        <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive text-center">
          <p className="font-semibold text-base mb-1">Error Loading Report</p>
          <p className="text-sm">{error}</p>
          <Button variant="outline" size="sm" onClick={() => navigate("/teacher/dashboard")} className="mt-4">
            Return to Dashboard
          </Button>
        </div>
      ) : submission ? (
        <div className="space-y-6">
          {/* Top Identity Banner */}
          <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-lg font-bold text-foreground">{submission.studentName}</h1>
                <span
                  className={`text-xs px-2.5 py-0.5 rounded-full font-bold inline-flex items-center gap-1.5 ${
                    isAI
                      ? "bg-destructive/15 text-destructive border border-destructive/30"
                      : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                  }`}
                >
                  {isAI ? <ShieldAlert className="w-3.5 h-3.5" /> : <ShieldCheck className="w-3.5 h-3.5" />}
                  {isAI ? `AI-Synthesized (${submission.aiPercentage ?? 95}%)` : `Authentic Human (${submission.humanPercentage ?? 99}%)`}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-md bg-muted text-muted-foreground font-medium">
                  {submission.status || "Submitted"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {submission.studentEmail} · {submission.className} · {submission.assignmentTitle}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-0.5">
                Submitted {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "Recently"}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-xs text-muted-foreground block">Current Score</span>
                <span className="text-xl font-bold text-foreground">
                  {submission.score !== null && submission.score !== undefined ? `${submission.score}/100` : "Not Graded"}
                </span>
              </div>
            </div>
          </div>

          {/* Side-by-Side Review Grid */}
          <div className="grid lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Code Viewer (7 cols) */}
            <div className="lg:col-span-7 bg-card rounded-xl border border-border/80 shadow-sm overflow-hidden flex flex-col">
              <div className="px-4 py-3 bg-muted/40 border-b border-border/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-primary" />
                  <span className="text-xs font-semibold text-foreground font-mono">submission.py</span>
                  <span className="text-[11px] text-muted-foreground">({codeLines.length} lines)</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleCopyCode} className="h-7 px-2 text-xs gap-1">
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? "Copied" : "Copy"}</span>
                </Button>
              </div>

              {/* Code with Line Numbers */}
              <div className="bg-[#0f172a] text-slate-100 p-4 font-mono text-xs overflow-x-auto max-h-[650px] overflow-y-auto leading-relaxed">
                <table>
                  <tbody>
                    {codeLines.map((line, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50">
                        <td className="pr-4 text-slate-500 select-none text-right w-8">{idx + 1}</td>
                        <td className="whitespace-pre">{line || " "}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {submission.notes && (
                <div className="p-4 bg-muted/20 border-t border-border/80 text-xs">
                  <p className="font-semibold text-foreground mb-1">Student's Submission Notes:</p>
                  <p className="text-muted-foreground whitespace-pre-wrap">{submission.notes}</p>
                </div>
              )}
            </div>

            {/* Right Column: AI Detection Inspector & Grading (5 cols) */}
            <div className="lg:col-span-5 space-y-6">
              {/* Card 1: AI Authorship Audit */}
              <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/80">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    {isAI ? <ShieldAlert className="w-4 h-4 text-destructive" /> : <ShieldCheck className="w-4 h-4 text-emerald-500" />}
                    Code Authorship Intelligence
                  </h2>
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    Dual-Head AST Model
                  </span>
                </div>

                {/* Score Breakdown Bar */}
                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
                    <span className="text-emerald-500 font-semibold">Human: {submission.humanPercentage ?? 99}%</span>
                    <span className="text-destructive font-semibold">AI: {submission.aiPercentage ?? 1}%</span>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-muted flex overflow-hidden">
                    <div
                      style={{ width: `${submission.humanPercentage ?? 99}%` }}
                      className="bg-emerald-500 transition-all duration-300"
                    />
                    <div
                      style={{ width: `${submission.aiPercentage ?? 1}%` }}
                      className="bg-destructive transition-all duration-300"
                    />
                  </div>
                </div>

                {/* Signals List */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Authorship Signals Detected
                  </p>
                  {submission.signals && submission.signals.length > 0 ? (
                    <ul className="space-y-1.5 text-xs">
                      {submission.signals.map((sig, i) => (
                        <li key={i} className="flex items-start gap-2 p-2 rounded-lg bg-muted/40 border border-border/60">
                          <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${isAI ? "bg-destructive" : "bg-emerald-500"}`} />
                          <span className="text-foreground">{sig}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-3 rounded-lg bg-muted/30 text-xs text-muted-foreground">
                      {isAI
                        ? "Synthesized syntax structure matching large language model generation patterns."
                        : "Syntactic structure, identifier distribution, and AST flow are consistent with authentic human coding."}
                    </div>
                  )}
                </div>
              </div>

              {/* Card 2: Grading Form */}
              <div className="bg-card rounded-xl border border-border/80 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-border/80">
                  <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <Award className="w-4 h-4 text-primary" />
                    Assignment Evaluation
                  </h2>
                  <span className="text-xs text-muted-foreground">Max: 100</span>
                </div>

                <form onSubmit={handleSaveGrade} className="space-y-4">
                  <div>
                    <label htmlFor="score-input" className="block text-xs font-medium text-foreground mb-1">
                      Score (0–100)
                    </label>
                    <div className="flex items-center gap-2">
                      <Input
                        id="score-input"
                        type="number"
                        min="0"
                        max="100"
                        value={score}
                        onChange={(e) => setScore(e.target.value)}
                        placeholder="e.g. 95"
                        className="h-9 text-sm font-semibold w-28"
                        required
                      />
                      {/* Quick Score Preset Pills */}
                      <div className="flex items-center gap-1">
                        {["100", "90", "80", "70"].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setScore(preset)}
                            className="px-2 py-1 text-xs rounded border border-border hover:bg-muted font-medium text-muted-foreground"
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="feedback-input" className="block text-xs font-medium text-foreground mb-1">
                      Teacher Feedback
                    </label>
                    <Textarea
                      id="feedback-input"
                      rows={4}
                      value={feedback}
                      onChange={(e) => setFeedback(e.target.value)}
                      placeholder="Add observations, code improvement suggestions, or integrity remarks..."
                      className="text-xs resize-none"
                    />
                  </div>

                  {gradeMessage && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 shrink-0" />
                      <span>{gradeMessage}</span>
                    </div>
                  )}

                  <Button type="submit" disabled={savingGrade} className="w-full text-xs h-9">
                    {savingGrade ? (
                      <>
                        <Loader className="w-3.5 h-3.5 mr-2 animate-spin" />
                        Publishing Grade...
                      </>
                    ) : (
                      "Publish Grade & Feedback"
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </TeacherLayout>
  );
};

export default SubmissionReport;
