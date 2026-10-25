import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowRight, Check, Users, GraduationCap } from "lucide-react";

const benefits = [
  "Completely free to use",
  "No hidden charges",
  "Unlimited submissions",
  "24/7 support",
];

const CTASection = () => {
  return (
    <section className="py-20 lg:py-32 bg-hero relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/10 rounded-full blur-3xl" />
      </div>

      <div className="relative container mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 max-w-3xl mx-auto">
          Ready to Get Started?
          <span className="text-gradient"> It's Free!</span>
        </h2>
        <p className="text-lg lg:text-xl text-white/70 max-w-2xl mx-auto mb-8">
          Join educators and students using Codexa to ensure academic integrity and get meaningful feedback.
        </p>

        {/* Benefits */}
        <div className="flex flex-wrap items-center justify-center gap-4 lg:gap-6 mb-10">
          {benefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-2 text-white/80">
              <Check className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium">{benefit}</span>
            </div>
          ))}
        </div>

        {/* CTA Buttons - Separate for Teacher and Student */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-lg mx-auto">
          <Link to="/teacher/login" className="flex-1">
            <Button variant="hero" size="xl" className="w-full group">
              <Users className="w-5 h-5 mr-2" />
              Teacher Login
              <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
            </Button>
          </Link>
          <Link to="/student/login" className="flex-1">
            <Button variant="heroOutline" size="xl" className="w-full group">
              <GraduationCap className="w-5 h-5 mr-2" />
              Student Login
            </Button>
          </Link>
        </div>

      
      </div>
    </section>
  );
};

export default CTASection;
