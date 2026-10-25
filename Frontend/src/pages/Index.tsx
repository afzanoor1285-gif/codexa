import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorksSection from "@/components/HowItWorksSection";
import DashboardSection from "@/components/DashboardSection";
import CTASection from "@/components/CTASection";
import Footer from "@/components/Footer";

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Codexa</title>
        <meta 
          name="description" 
          content="Detect code plagiarism with source identification from GitHub, StackOverflow & ChatGPT. AI-powered assignment grading with transparent feedback for educators." 
        />
        <meta name="keywords" content="plagiarism detection, code plagiarism, academic integrity, AI grading, assignment checker, educational technology" />
        <link rel="canonical" href="https://codexa.ai" />
      </Helmet>

      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <HeroSection />
          <FeaturesSection />
          <HowItWorksSection />
          <DashboardSection />
    
          <CTASection />
        </main>
        <Footer />
      </div>
    </>
  );
};

export default Index;
