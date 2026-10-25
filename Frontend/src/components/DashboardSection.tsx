import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Users, GraduationCap, AlertTriangle, TrendingUp, FileCode, Clock, CheckCircle2, XCircle } from "lucide-react";

const DashboardSection = () => {
  const [activeTab, setActiveTab] = useState<"teacher" | "student">("teacher");

  return (
    <section id="dashboards" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
            Dashboards
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Insights for
            <span className="text-gradient"> Everyone</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Purpose-built dashboards for teachers and students, each designed to show exactly what matters most.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex bg-muted rounded-xl p-1.5">
            <button
              onClick={() => setActiveTab("teacher")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === "teacher"
                  ? "bg-card text-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Users className="w-4 h-4" />
              Teacher Dashboard
            </button>
            <button
              onClick={() => setActiveTab("student")}
              className={`flex items-center gap-2 px-6 py-3 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === "student"
                  ? "bg-card text-foreground shadow-md"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <GraduationCap className="w-4 h-4" />
              Student Dashboard
            </button>
          </div>
        </div>

        {/* Dashboard Preview */}
        <div className="relative max-w-6xl mx-auto">
          {/* Teacher Dashboard */}
          {activeTab === "teacher" && (
            <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden animate-scale-in">
              {/* Header */}
              <div className="bg-primary px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gradient-accent flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-semibold">Teacher Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8">
                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  {[
                    { icon: FileCode, label: "Submissions", value: "247", change: "+12 today" },
                    { icon: AlertTriangle, label: "Flagged", value: "23", change: "9.3%" },
                    { icon: Clock, label: "Pending", value: "18", change: "Grading..." },
                    { icon: TrendingUp, label: "Avg Score", value: "78.4", change: "+2.3%" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-muted/50 rounded-xl p-4">
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <stat.icon className="w-4 h-4" />
                        <span className="text-sm font-medium">{stat.label}</span>
                      </div>
                      <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                      <div className="text-xs text-muted-foreground mt-1">{stat.change}</div>
                    </div>
                  ))}
                </div>

                {/* Plagiarism Heatmap Preview */}
                <div className="grid lg:grid-cols-2 gap-6">
                  <div className="bg-muted/30 rounded-xl p-5 border border-border">
                    <h4 className="font-semibold text-foreground mb-4">Plagiarism Heatmap</h4>
                    <div className="grid grid-cols-10 gap-1">
                      {Array.from({ length: 50 }).map((_, i) => (
                        <div
                          key={i}
                          className={`h-6 rounded ${
                            Math.random() > 0.7
                              ? "bg-destructive/60"
                              : Math.random() > 0.4
                              ? "bg-yellow-500/40"
                              : "bg-accent/30"
                          }`}
                        />
                      ))}
                    </div>
                    <div className="flex items-center gap-4 mt-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-accent/30" /> Low</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-yellow-500/40" /> Medium</span>
                      <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-destructive/60" /> High</span>
                    </div>
                  </div>

                  <div className="bg-muted/30 rounded-xl p-5 border border-border">
                    <h4 className="font-semibold text-foreground mb-4">Recent Submissions</h4>
                    <div className="space-y-3">
                      {[
                        { name: "Ayesha", status: "flagged", score: "87%" },
                        { name: "Ambar", status: "clean", score: "92%" },
                        { name: "Manahil", status: "clean", score: "78%" },
                        { name: "Hajra", status: "flagged", score: "45%" },
                      ].map((student) => (
                        <div key={student.name} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-sm font-medium text-secondary">
                              {student.name.split(" ").map(n => n[0]).join("")}
                            </div>
                            <span className="text-sm font-medium text-foreground">{student.name}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                              student.status === "flagged" 
                                ? "bg-destructive/10 text-destructive" 
                                : "bg-accent/10 text-accent"
                            }`}>
                              {student.status}
                            </span>
                            <span className="text-sm text-muted-foreground w-12 text-right">{student.score}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Student Dashboard */}
          {activeTab === "student" && (
            <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden animate-scale-in">
              {/* Header */}
              <div className="bg-secondary px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4 text-white" />
                  </div>
                  <span className="text-white font-semibold">Student Dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                  <div className="w-3 h-3 rounded-full bg-white/20" />
                </div>
              </div>

              {/* Content */}
              <div className="p-6 lg:p-8">
                {/* Assignment Result */}
                <div className="bg-muted/30 rounded-xl p-6 border border-border mb-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h4 className="text-lg font-bold text-foreground mb-1">Assignment #5: Binary Search Tree</h4>
                      <p className="text-sm text-muted-foreground">Data Structures - CS201</p>
                    </div>
                    <div className="text-right">
                      <div className="text-3xl font-bold text-accent">85/100</div>
                      <div className="text-sm text-muted-foreground">Grade: B+</div>
                    </div>
                  </div>

                  {/* Feedback Items */}
                  <div className="space-y-4">
                    <h5 className="font-semibold text-foreground text-sm">Detailed Feedback</h5>
                    
                    <div className="flex items-start gap-3 p-4 bg-accent/5 rounded-lg border border-accent/20">
                      <CheckCircle2 className="w-5 h-5 text-accent mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Correct Implementation (+40)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your insert() and search() functions work correctly for all test cases.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/20">
                      <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Edge Case Missing (-10)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Your delete() function doesn't handle the case when deleting a node with two children. Consider using in-order successor approach.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3 p-4 bg-destructive/5 rounded-lg border border-destructive/20">
                      <XCircle className="w-5 h-5 text-destructive mt-0.5 shrink-0" />
                      <div>
                        <p className="font-medium text-foreground text-sm">Code Similarity Detected (-5)</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Lines 45-52 show 78% similarity with a StackOverflow answer. Please ensure original work or proper citation.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Overview */}
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="bg-muted/30 rounded-xl p-4 border border-border text-center">
                    <div className="text-2xl font-bold text-foreground mb-1">82.4%</div>
                    <div className="text-sm text-muted-foreground">Course Average</div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border text-center">
                    <div className="text-2xl font-bold text-accent mb-1">5/6</div>
                    <div className="text-sm text-muted-foreground">Assignments Done</div>
                  </div>
                  <div className="bg-muted/30 rounded-xl p-4 border border-border text-center">
                    <div className="text-2xl font-bold text-foreground mb-1">97%</div>
                    <div className="text-sm text-muted-foreground">Originality Score</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <Button variant="hero" size="lg">
            See Full Demo
          </Button>
        </div>
      </div>
    </section>
  );
};

export default DashboardSection;
