import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Download, FileCode, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import BrandLogo from "@/components/BrandLogo";
import { downloadSubmissionCode } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";

interface SubmissionReportData {
  id: string;
  studentName: string;
  studentEmail: string;
  assignmentTitle: string;
  className: string;
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
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

const SubmissionReport = () => {
  const { submissionId } = useParams<{ submissionId: string }>();
  const navigate = useNavigate();
  const user = getUser();
  const gradingSettings = user?.settings?.grading as { show_confidence?: boolean } | undefined;
  const analysisSettings = user?.settings?.analysis as { show_model_confidence?: boolean } | undefined;
  const showConfidence =
    gradingSettings?.show_confidence ??
    analysisSettings?.show_model_confidence ??
    true;
  const [submission, setSubmission] = useState<SubmissionReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const [savingGrade, setSavingGrade] = useState(false);
  const [gradeMessage, setGradeMessage] = useState<string | null>(null);

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
          throw new Error(data.error || "Unable to load this submission report.");
        }
        setSubmission(data.submission);
        setScore(data.submission.score === null ? "" : String(data.submission.score));
        setFeedback(data.submission.feedback || "");
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load this report.");
      } finally {
        setLoading(false);
      }
    };

    void loadReport();
  }, [submissionId]);

  const handleSaveGrade = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const numericScore = Number(score);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 100) {
      setError("Enter a score from 0 to 100.");
      return;
    }
    if (feedback.length > 5000) {
      setError("Feedback must be 5000 characters or fewer.");
      return;
    }

    setSavingGrade(true);
    setError(null);
    setGradeMessage(null);
    try {
      const token = getToken();
      if (!token) {
        throw new Error("Your session has expired. Please log in again.");
      }
      const response = await fetch(`${API_BASE_URL}/api/submissions/${submissionId}`, {
        method: "PUT",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ score: numericScore, feedback }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Unable to save this grade.");
      }
      setSubmission((current) =>
        current ? { ...current, score: numericScore, feedback: feedback.trim(), status: "graded" } : current,
      );
      setGradeMessage("Grade published. The student can now see it on their dashboard.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this grade.");
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

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed left-0 top-0 bottom-0 hidden w-64 border-r border-border bg-card p-4 lg:block">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <BrandLogo className="h-10 w-10 object-contain" />
          <span className="text-xl font-bold text-foreground">Codexa</span>
        </Link>
        <Button variant="ghost" className="w-full justify-start" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </aside>

      <main className="lg:ml-64">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur-sm sm:gap-4 sm:px-6 sm:py-4">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-bold text-foreground sm:text-2xl">Submission report</h1>
            <p className="hidden text-sm text-muted-foreground sm:block">Individual student submission and analysis</p>
          </div>
          {submission && (
            <Button onClick={handleDownload} disabled={downloading} className="shrink-0 px-2 sm:px-4">
              {downloading ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              <span className="hidden sm:inline">Download code</span>
            </Button>
          )}
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error && !submission ? (
            <div role="alert" className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>
          ) : submission && (
            <>
              {error && <div role="alert" className="rounded-lg bg-destructive/10 p-4 text-destructive">{error}</div>}
              <section className="grid gap-4 rounded-2xl border border-border bg-card p-4 sm:p-6 md:grid-cols-2">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">{submission.studentName}</h2>
                  <p className="break-all text-sm text-muted-foreground">{submission.studentEmail}</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">{submission.assignmentTitle}</p>
                  <p className="text-sm text-muted-foreground">{submission.className}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Submitted {submission.createdAt ? new Date(submission.createdAt).toLocaleString() : "date unavailable"}
                  </p>
                </div>
                {submission.notes && (
                  <div className="md:col-span-2">
                    <h3 className="text-sm font-medium text-foreground">Student notes</h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{submission.notes}</p>
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground">Grade this submission</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  AI analysis checks authorship only; review the code and enter the assignment score here.
                </p>
                <form className="mt-4 space-y-4" onSubmit={handleSaveGrade}>
                  <div className="max-w-xs space-y-2">
                    <label htmlFor="submission-score" className="text-sm font-medium text-foreground">
                      Score (0–100)
                    </label>
                    <Input
                      id="submission-score"
                      type="number"
                      min="0"
                      max="100"
                      step="1"
                      required
                      value={score}
                      onChange={(event) => setScore(event.target.value)}
                      placeholder="Enter score"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="submission-feedback" className="text-sm font-medium text-foreground">
                      Feedback for student
                    </label>
                    <Textarea
                      id="submission-feedback"
                      maxLength={5000}
                      rows={4}
                      value={feedback}
                      onChange={(event) => setFeedback(event.target.value)}
                      placeholder="Explain the grade and suggest improvements..."
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button type="submit" disabled={savingGrade}>
                      {savingGrade ? "Publishing..." : "Save grade & publish"}
                    </Button>
                    {gradeMessage && (
                      <p role="status" className="text-sm text-accent">{gradeMessage}</p>
                    )}
                  </div>
                </form>
              </section>

              <section className="rounded-2xl border border-border bg-card p-4 sm:p-6">
                <h2 className="text-lg font-semibold text-foreground">AI vs. human writing estimate</h2>
                {submission.aiPercentage !== null && submission.humanPercentage !== null ? (
                  <>
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div className="rounded-xl bg-muted p-4">
                        <p className="text-sm text-muted-foreground">Model result</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{submission.aiLabel}</p>
                      </div>
                      <div className="rounded-xl bg-yellow-500/10 p-4">
                        <p className="text-sm text-muted-foreground">AI writing estimate</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{submission.aiPercentage.toFixed(2)}%</p>
                      </div>
                      <div className="rounded-xl bg-accent/10 p-4">
                        <p className="text-sm text-muted-foreground">Human writing estimate</p>
                        <p className="mt-1 text-2xl font-bold text-foreground">{submission.humanPercentage.toFixed(2)}%</p>
                      </div>
                    </div>
                    {showConfidence && (
                      <p className="mt-4 text-sm text-muted-foreground">
                        Model confidence in its predicted label: {submission.aiConfidence !== null
                          ? `${(submission.aiConfidence * 100).toFixed(2)}%`
                          : "unavailable"}.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="mt-3 text-sm text-muted-foreground">
                    AI analysis is unavailable for this submission.
                  </p>
                )}
                <p className="mt-3 text-sm text-muted-foreground">
                  This is an automated authorship estimate, not a plagiarism or source-matching report. It can be wrong and should not be used as the sole basis for an academic decision.
                </p>
              </section>

              <section className="overflow-hidden rounded-2xl border border-border bg-card">
                <div className="flex items-center gap-2 border-b border-border px-4 py-4 sm:px-6">
                  <FileCode className="h-5 w-5 text-muted-foreground" />
                  <h2 className="font-semibold text-foreground">Submitted code</h2>
                </div>
                <pre className="max-h-[70vh] overflow-auto whitespace-pre-wrap break-words p-4 text-xs text-foreground sm:p-6 sm:text-sm">
                  <code>{submission.code}</code>
                </pre>
              </section>
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default SubmissionReport;
