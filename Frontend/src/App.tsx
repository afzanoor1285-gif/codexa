import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import TeacherLogin from "./pages/TeacherLogin";
import StudentLogin from "./pages/StudentLogin";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import SubmitAssignment from "./pages/SubmitAssignment";
import MyClasses from "./pages/MyClasses";
import ClassDetail from "./pages/ClassDetail";
import CreateAssignment from "./pages/CreateAssignment";
import StudentListView from "./pages/StudentListView";
import SubmissionReport from "./pages/SubmissionReport";
import ProtectedRoute from "./components/ProtectedRoute";
import { initializeTheme } from "./lib/theme";

const queryClient = new QueryClient();

const App = () => {
  useEffect(() => {
    initializeTheme();
  }, []);

  return (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/teacher/login" element={<TeacherLogin />} />
            <Route path="/student/login" element={<StudentLogin />} />
            <Route path="/teacher/dashboard" element={
              <ProtectedRoute allowedRole="teacher">
                <TeacherDashboard />
              </ProtectedRoute>
            } />
            <Route path="/teacher/classes" element={
              <ProtectedRoute allowedRole="teacher">
                <MyClasses />
              </ProtectedRoute>
            } />
            <Route path="/teacher/class/:classId" element={
              <ProtectedRoute allowedRole="teacher">
                <ClassDetail />
              </ProtectedRoute>
            } />
            <Route path="/teacher/create-assignment/:classId" element={
              <ProtectedRoute allowedRole="teacher">
                <CreateAssignment />
              </ProtectedRoute>
            } />
            <Route path="/teacher/assignment/:assignmentId/students" element={
              <ProtectedRoute allowedRole="teacher">
                <StudentListView />
              </ProtectedRoute>
            } />
            <Route path="/teacher/submission/:submissionId" element={
              <ProtectedRoute allowedRole="teacher">
                <SubmissionReport />
              </ProtectedRoute>
            } />
            <Route path="/student/dashboard" element={
              <ProtectedRoute allowedRole="student">
                <StudentDashboard />
              </ProtectedRoute>
            } />
            <Route path="/student/submit" element={
              <ProtectedRoute allowedRole="student">
                <SubmitAssignment />
              </ProtectedRoute>
            } />
            <Route path="/student/submit/:assignmentId" element={
              <ProtectedRoute allowedRole="student">
                <SubmitAssignment />
              </ProtectedRoute>
            } />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  </HelmetProvider>
  );
};

export default App;
