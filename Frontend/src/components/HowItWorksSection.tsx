import { Upload, Search, FileText, CheckCircle } from "lucide-react";

const steps = [
  {
    number: "01",
    icon: Upload,
    title: "Upload Assignments",
    description: "Teachers upload student code submissions in any format. Supports Python, Java, C++, JavaScript, and more.",
  },
  {
    number: "02",
    icon: Search,
    title: "AI Analyzes Code",
    description: "Our AI scans code structure using AST analysis and searches across GitHub, StackOverflow, and web sources.",
  },
  {
    number: "03",
    icon: FileText,
    title: "Generate Reports",
    description: "Get detailed plagiarism reports showing exact sources, similarity scores, and highlighted code sections.",
  },
  {
    number: "04",
    icon: CheckCircle,
    title: "Auto-Grade & Feedback",
    description: "Assignments are graded automatically with clear, constructive feedback explaining every deduction.",
  },
];

const HowItWorksSection = () => {
  return (
    <section id="how-it-works" className="py-20 lg:py-32 bg-gradient-subtle">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-accent/10 text-accent text-sm font-semibold mb-4">
            How It Works
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Simple Process,
            <span className="text-gradient"> Powerful Results</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            From submission to feedback in minutes—not hours. Here's how Codexa streamlines academic evaluation.
          </p>
        </div>

        {/* Steps */}
        <div className="relative">
          {/* Connection Line */}
          <div className="hidden lg:block absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-secondary via-accent to-secondary opacity-20 -translate-y-1/2" />

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
            {steps.map((step, index) => (
              <div
                key={step.number}
                className="relative group"
              >
                {/* Card */}
                <div className="relative bg-card rounded-2xl p-6 lg:p-8 shadow-card hover:shadow-xl transition-all duration-300 border border-border hover:border-secondary/30 text-center h-full">
                  {/* Step Number */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-gradient-accent text-white text-sm font-bold flex items-center justify-center shadow-glow">
                    {index + 1}
                  </div>

                  {/* Icon */}
                  <div className="w-16 h-16 rounded-2xl bg-secondary/10 flex items-center justify-center mx-auto mt-4 mb-5 group-hover:scale-110 transition-transform duration-300">
                    <step.icon className="w-8 h-8 text-secondary" />
                  </div>

                  {/* Content */}
                  <h3 className="text-xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.description}
                  </p>
                </div>

                {/* Arrow for desktop */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 z-10 -translate-y-1/2">
                    <div className="w-6 h-6 rounded-full bg-background border-2 border-secondary/30 flex items-center justify-center">
                      <svg className="w-3 h-3 text-secondary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-8 mt-20 max-w-4xl mx-auto">
          {[
            { value: "< 30s", label: "Average Analysis Time" },
            { value: "99.2%", label: "Detection Accuracy" },
            { value: "10M+", label: "Code Sources Indexed" },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-4xl lg:text-5xl font-bold text-gradient mb-2">
                {stat.value}
              </div>
              <div className="text-muted-foreground font-medium">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorksSection;
