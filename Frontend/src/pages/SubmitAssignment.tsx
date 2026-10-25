import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Upload,
  FileCode,
  X,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";
import { getToken, getUser } from "@/lib/auth";

interface AssignmentDetails {
  id: string;
  title: string;
  description: string;
  course: string;
  deadline: string;
  status: string;
}

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

const SubmitAssignment = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const [files, setFiles] = useState<File[]>([]);
  const [code, setCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentDetails | null>(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [notes, setNotes] = useState("");
  const user = getUser();

  useEffect(() => {
    const loadAssignment = async () => {
      if (!assignmentId) {
        setAssignmentError("Please choose an assignment from your dashboard first.");
        setAssignmentLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/assignments/`, {
          headers: { Authorization: `Bearer ${getToken() ?? ""}` },
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load this assignment");
        }
        const selectedAssignment = (data.assignments || []).find(
          (item: AssignmentDetails) => item.id === assignmentId,
        );
        if (!selectedAssignment) {
          throw new Error("This assignment is not available for your account.");
        }
        if (selectedAssignment.status === "submitted") {
          throw new Error("You have already submitted this assignment.");
        }
        setAssignment(selectedAssignment);
      } catch (error) {
        setAssignmentError(
          error instanceof Error ? error.message : "Unable to load this assignment",
        );
      } finally {
        setAssignmentLoading(false);
      }
    };

    loadAssignment();
  }, [assignmentId]);

  const readFilesContent = async (fileList: File[]) => {
    const contents: string[] = [];
    for (const file of fileList) {
      const content = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = (e) => reject(e);
        reader.readAsText(file);
      });
      contents.push(`// ${file.name}\n${content}`);
    }
    setCode(contents.join('\n\n'));
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles((prev) => [...prev, ...newFiles]);
      readFilesContent([...files, ...newFiles]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles((prev) => [...prev, ...newFiles]);
      readFilesContent([...files, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => {
      const newFiles = prev.filter((_, i) => i !== index);
      readFilesContent(newFiles);
      return newFiles;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    if (!assignmentId || !assignment) {
      setSubmitError("Choose a valid assignment before submitting.");
      return;
    }
    if (!code.trim()) {
      setSubmitError("Upload a code file or enter your code before submitting.");
      return;
    }
    setIsSubmitting(true);

    const payload = {
      assignment_id: assignmentId,
      code,
      notes,
    };

    try {
      const response = await fetch(`${API_BASE_URL}/api/submissions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem("codexa_token")}`,
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        setIsSubmitted(true);
      } else {
        const errorData = await response.json();
        setSubmitError(errorData.error || 'Failed to submit assignment');
      }
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="w-20 h-20 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-accent" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Assignment Submitted!</h1>
          <p className="text-muted-foreground mb-8">
            Your submission for {assignment?.title || "this assignment"} has been received and is now visible to your teacher.
          </p>
          <div className="space-y-3">
            <Link to="/student/dashboard">
              <Button variant="hero" className="w-full">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border px-4 py-3 sm:px-6 sm:py-4">
        <div className="container mx-auto flex items-center gap-4">
          <Link to="/student/dashboard" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex min-w-0 items-center gap-2">
            <BrandLogo className="h-9 w-9 shrink-0 object-contain sm:h-10 sm:w-10" />
            <span className="truncate text-lg font-bold text-foreground sm:text-xl">Codexa</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <h1 className="mb-2 text-2xl font-bold text-foreground sm:text-3xl">Submit Assignment</h1>
          <p className="text-muted-foreground">
            Submit your work for the selected class assignment.
          </p>
        </div>

        {assignmentLoading ? (
          <div className="rounded-xl border border-border bg-card p-6 text-muted-foreground">
            Loading assignment...
          </div>
        ) : assignmentError ? (
          <div className="rounded-xl bg-destructive/10 p-5 text-destructive" role="alert">
            <p>{assignmentError}</p>
            <Link to="/student/dashboard" className="mt-3 inline-block font-medium underline">
              Return to dashboard
            </Link>
          </div>
        ) : assignment ? (
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
            <h2 className="font-semibold text-foreground mb-2">{assignment.title}</h2>
            <p className="text-sm text-muted-foreground">{assignment.course}</p>
            <p className="mt-3 text-sm text-foreground">{assignment.description}</p>
            <p className="mt-3 text-sm text-muted-foreground">
              Submitting as {user?.name || user?.email || "Student"}
              {assignment.deadline && ` · Due ${new Date(assignment.deadline).toLocaleDateString()}`}
            </p>
          </div>

          {/* File Upload */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
            <h2 className="font-semibold text-foreground mb-4">Upload Code Files</h2>
            
            <div
              className={`border-2 border-dashed rounded-xl p-5 text-center transition-colors sm:p-8 ${
                dragActive 
                  ? "border-secondary bg-secondary/5" 
                  : "border-border hover:border-secondary/50"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <Upload className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-foreground font-medium mb-1">
                Drag and drop your files here
              </p>
              <p className="text-sm text-muted-foreground mb-4">
                or click to browse
              </p>
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
                accept=".py,.java,.cpp,.c,.js,.ts,.jsx,.tsx,.rb,.go,.rs"
              />
              <label htmlFor="file-upload">
                <Button type="button" variant="outline" asChild>
                  <span>Browse Files</span>
                </Button>
              </label>
              <p className="text-xs text-muted-foreground mt-4">
                Supported: .py, .java, .cpp, .c, .js, .ts, .rb, .go, .rs
              </p>
            </div>

            {/* File List */}
            {files.length > 0 && (
              <div className="mt-4 space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between gap-3 p-3 bg-muted/50 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <FileCode className="w-5 h-5 text-secondary" />
                      <div className="min-w-0">
                        <p className="break-all text-sm font-medium text-foreground">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="p-1 hover:bg-destructive/10 rounded text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
            <Label htmlFor="code" className="font-semibold text-foreground">Code</Label>
            <Textarea
              id="code"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              placeholder="Paste your code here, or upload one or more code files above."
              className="mt-3 min-h-56 font-mono text-sm"
              required
            />
          </div>

          {/* Additional Notes */}
          <div className="bg-card rounded-2xl border border-border p-4 sm:p-6">
            <h2 className="font-semibold text-foreground mb-4">Additional Notes (Optional)</h2>
            <Textarea
              placeholder="Add any notes or comments for your instructor..."
              className="min-h-24"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>

          {/* Acknowledgment */}
          <div className="bg-muted/50 rounded-xl p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground mb-1">Academic Integrity</p>
              <p>
                By submitting this assignment, you confirm that this is your own original work. 
                Any external sources or references have been properly cited.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          {submitError && (
            <p className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive" role="alert">
              {submitError}
            </p>
          )}
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:gap-4">
            <Button
              type="submit"
              variant="hero"
              size="lg"
              disabled={!code.trim() || isSubmitting}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="w-5 h-5 mr-2" />
                  Submit Assignment
                </>
              )}
            </Button>
            <Link to="/student/dashboard" className="w-full sm:w-auto">
              <Button type="button" variant="outline" size="lg" className="w-full">
                Cancel
              </Button>
            </Link>
          </div>
        </form>
        ) : null}
      </main>
    </div>
  );
};

export default SubmitAssignment;
