import { Shield, Brain, MessageSquareText, GitCompare, Zap, BarChart3 } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Smart Plagiarism Detection",
    description: "Goes beyond similarity scores. Identifies exact sources from GitHub, StackOverflow, ChatGPT, and online tutorials.",
    color: "secondary",
  },
  {
    icon: Brain,
    title: "AI-Powered Grading",
    description: "Automatically grades coding assignments using test cases in secure sandbox environments with intelligent scoring.",
    color: "accent",
  },
  {
    icon: MessageSquareText,
    title: "Transparent Feedback",
    description: "Students receive clear, constructive explanations for every mark deduction—helping them learn from mistakes.",
    color: "secondary",
  },
  {
    icon: GitCompare,
    title: "AST Code Analysis",
    description: "Abstract Syntax Tree analysis detects structural similarities even when variable names and formatting change.",
    color: "accent",
  },
  {
    icon: Zap,
    title: "Instant Results",
    description: "Get plagiarism reports and grades in seconds, not hours. Process hundreds of submissions simultaneously.",
    color: "secondary",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description: "Visual heatmaps, performance graphs, and trend analysis for teachers to quickly identify patterns.",
    color: "accent",
  },
];

const FeaturesSection = () => {
  return (
    <section id="features" className="py-20 lg:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="inline-block px-4 py-1.5 rounded-full bg-secondary/10 text-secondary text-sm font-semibold mb-4">
            Features
          </span>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            Everything You Need for
            <span className="text-gradient"> Academic Integrity</span>
          </h2>
          <p className="text-lg text-muted-foreground">
            Codexa combines cutting-edge AI with practical tools to save teachers time and help students learn.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className="group relative bg-card rounded-2xl p-6 lg:p-8 shadow-card hover:shadow-xl transition-all duration-300 border border-border hover:border-secondary/30 hover:-translate-y-1"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              {/* Icon */}
              <div 
                className={`w-14 h-14 rounded-xl flex items-center justify-center mb-5 transition-transform duration-300 group-hover:scale-110 ${
                  feature.color === 'secondary' 
                    ? 'bg-secondary/10 text-secondary' 
                    : 'bg-accent/10 text-accent'
                }`}
              >
                <feature.icon className="w-7 h-7" />
              </div>

              {/* Content */}
              <h3 className="text-xl font-bold text-foreground mb-3">
                {feature.title}
              </h3>
              <p className="text-muted-foreground leading-relaxed">
                {feature.description}
              </p>

              {/* Hover Gradient */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-secondary/5 to-accent/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
