import { Button } from "@/components/ui/button";
import { ArrowRight, Shield, Sparkles, FileCheck } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen bg-hero overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 pt-32 lg:pt-40 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left Content */}
          <div className="text-center lg:text-left">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm mb-6 animate-fade-in">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span className="text-sm font-medium text-white/90">AI-Powered Academic Integrity</span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight mb-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Detect Plagiarism.
              <br />
              <span className="text-gradient">Grade Smarter.</span>
              <br />
              Teach Better.
            </h1>

            {/* Subheadline */}
            <p className="text-lg lg:text-xl text-white/70 max-w-xl mx-auto lg:mx-0 mb-8 animate-fade-in" style={{ animationDelay: '0.2s' }}>
              The only tool that identifies where code was copied from—GitHub, StackOverflow, or ChatGPT—and provides transparent, AI-powered grading with actionable feedback.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start animate-fade-in" style={{ animationDelay: '0.3s' }}>
              <a href="#dashboards">
                <Button variant="hero" size="xl" className="group">
                  Explore Platform
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              </a>
              <a href="#how-it-works">
                <Button variant="heroOutline" size="xl">
                  Learn More
                </Button>
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-6 mt-10 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            
              <div className="flex items-center gap-2 text-white/60">
                <FileCheck className="w-5 h-5 text-accent" />
                <span className="text-sm">FERPA Ready</span>
              </div>
      
            </div>
          </div>

          {/* Right Content - Code Preview */}
          <div className="relative animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <div className="relative">
              {/* Floating Card */}
              <div className="absolute -top-6 -left-6 z-10 bg-card rounded-xl p-4 shadow-card animate-float hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                    <span className="text-destructive font-bold text-sm">87%</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Plagiarism Detected</p>
                    <p className="text-sm font-semibold text-foreground">Source: GitHub</p>
                  </div>
                </div>
              </div>

              {/* Main Terminal Window */}
              <div className="bg-[#1a1f2e] rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                {/* Terminal Header */}
                <div className="flex items-center gap-2 px-4 py-3 bg-[#141821] border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-destructive/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                  <div className="w-3 h-3 rounded-full bg-accent/80" />
                  <span className="ml-4 text-xs text-white/40 font-mono">plagiarism_report.json</span>
                </div>
                
                {/* Terminal Content */}
                <div className="p-6 font-mono text-sm">
                  <div className="space-y-2">
                    <div className="text-white/40">{"{"}</div>
                    <div className="pl-4">
                      <span className="text-secondary">"status"</span>
                      <span className="text-white/60">: </span>
                      <span className="text-accent">"analysis_complete"</span>
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-secondary">"similarity_score"</span>
                      <span className="text-white/60">: </span>
                      <span className="text-orange-400">87.3</span>
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-secondary">"sources_found"</span>
                      <span className="text-white/60">: [</span>
                    </div>
                    <div className="pl-8">
                      <span className="text-white/40">{"{"}</span>
                    </div>
                    <div className="pl-12">
                      <span className="text-secondary">"origin"</span>
                      <span className="text-white/60">: </span>
                      <span className="text-accent">"github.com/user/repo"</span>
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="pl-12">
                      <span className="text-secondary">"match"</span>
                      <span className="text-white/60">: </span>
                      <span className="text-orange-400">73.2</span>
                    </div>
                    <div className="pl-8">
                      <span className="text-white/40">{"}"}</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-white/60">]</span>
                      <span className="text-white/40">,</span>
                    </div>
                    <div className="pl-4">
                      <span className="text-secondary">"feedback"</span>
                      <span className="text-white/60">: </span>
                      <span className="text-accent">"Code structure matches..."</span>
                    </div>
                    <div className="text-white/40">{"}"}</div>
                  </div>
                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-accent">▶</span>
                    <span className="text-white/60">Generating detailed report...</span>
                    <span className="inline-block w-2 h-4 bg-secondary animate-pulse" />
                  </div>
                </div>
              </div>

              {/* Floating Grade Card */}
              <div className="absolute -bottom-4 -right-4 z-10 bg-card rounded-xl p-4 shadow-card animate-float-delayed hidden lg:block">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <span className="text-accent font-bold text-sm">A-</span>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Auto-Graded</p>
                    <p className="text-sm font-semibold text-foreground">85/100 Points</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Wave */}
      <div className="absolute bottom-0 left-0 right-0">
        <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path 
            d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" 
            className="fill-background"
          />
        </svg>
      </div>
    </section>
  );
};

export default HeroSection;
