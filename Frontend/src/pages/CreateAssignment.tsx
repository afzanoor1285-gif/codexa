import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  ArrowLeft,
  Loader,
  Calendar,
  FileText,
  Pen,
} from "lucide-react";
import BrandLogo from "@/components/BrandLogo";

const API_BASE_URL = "http://127.0.0.1:5000";

const CreateAssignment = () => {
  const { classId } = useParams<{ classId: string }>();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errors, setErrors] = useState({
    title: "",
    description: "",
    dueDate: "",
  });

  const validate = () => {
    const newErrors = { title: "", description: "", dueDate: "" };

    if (!title.trim()) {
      newErrors.title = "Title is required";
    } else if (title.length < 5) {
      newErrors.title = "Title must be at least 5 characters";
    }

    if (!description.trim()) {
      newErrors.description = "Description is required";
    } else if (description.length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    }

    if (!dueDate) {
      newErrors.dueDate = "Due date is required";
    } else {
      const selectedDate = new Date(dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.dueDate = "Due date must be in the future";
      }
    }

    setErrors(newErrors);
    return !newErrors.title && !newErrors.description && !newErrors.dueDate;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem("codexa_token");
      const response = await fetch(`${API_BASE_URL}/assignments/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          description,
          course: classId,
          deadline: new Date(dueDate).toISOString(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to create assignment");
      }

      navigate(`/teacher/class/${classId}`, {
        state: { assignmentCreated: true },
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
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
        <header className="sticky top-0 bg-card/95 backdrop-blur-sm border-b border-border px-6 py-4 flex items-center gap-4 z-10">
          <button
            onClick={() => navigate(`/teacher/class/${classId}`)}
            className="lg:hidden p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">
              Create Assignment
            </h1>
            <p className="text-sm text-muted-foreground">
              Add a new assignment to your class
            </p>
          </div>
        </header>

        <div className="p-6">
          <div className="max-w-2xl">
            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg p-4 flex items-start gap-3">
                  <FileText className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium">Error</p>
                    <p className="text-sm">{error}</p>
                  </div>
                </div>
              )}

              {/* Title Field */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Pen className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor="title" className="text-base font-semibold">
                    Assignment Title
                  </Label>
                </div>
                <Input
                  id="title"
                  placeholder="e.g., Binary Search Tree Implementation"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={errors.title ? "border-destructive" : ""}
                />
                {errors.title && (
                  <p className="text-sm text-destructive mt-2">{errors.title}</p>
                )}
              </div>

              {/* Description Field */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor="description" className="text-base font-semibold">
                    Description
                  </Label>
                </div>
                <textarea
                  id="description"
                  placeholder="Provide detailed instructions for the assignment..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={`w-full min-h-[150px] px-4 py-3 rounded-lg border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary ${
                    errors.description ? "border-destructive" : "border-border"
                  }`}
                />
                {errors.description && (
                  <p className="text-sm text-destructive mt-2">
                    {errors.description}
                  </p>
                )}
              </div>

              {/* Due Date Field */}
              <div className="bg-card rounded-2xl border border-border p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Calendar className="w-5 h-5 text-muted-foreground" />
                  <Label htmlFor="dueDate" className="text-base font-semibold">
                    Due Date
                  </Label>
                </div>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className={errors.dueDate ? "border-destructive" : ""}
                />
                {errors.dueDate && (
                  <p className="text-sm text-destructive mt-2">{errors.dueDate}</p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button
                  type="submit"
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <FileText className="w-4 h-4 mr-2" />
                      Create Assignment
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate(`/teacher/class/${classId}`)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CreateAssignment;
