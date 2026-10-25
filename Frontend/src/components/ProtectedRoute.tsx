import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getToken, verifySession } from "@/lib/auth";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRole?: "teacher" | "student";
}

const ProtectedRoute = ({ children, allowedRole }: ProtectedRouteProps) => {
  const location = useLocation();
  const [status, setStatus] = useState<"checking" | "allowed" | "denied" | "error">("checking");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    if (!getToken()) {
      setStatus("denied");
      return () => {
        active = false;
      };
    }

    verifySession()
      .then((user) => {
        if (active) {
          setStatus(!allowedRole || user.role === allowedRole ? "allowed" : "denied");
        }
      })
      .catch((verificationError: unknown) => {
        if (active) {
          setError(
            verificationError instanceof Error
              ? verificationError.message
              : "Unable to verify your session.",
          );
          setStatus(getToken() ? "error" : "denied");
        }
      });

    return () => {
      active = false;
    };
  }, [allowedRole]);

  if (status === "checking") {
    return <div role="status" className="p-6 text-center text-muted-foreground">Verifying session...</div>;
  }

  if (status === "denied") {
    return <Navigate to={allowedRole ? `/${allowedRole}/login` : "/"} state={{ from: location }} replace />;
  }

  if (status === "error") {
    return <div role="alert" className="p-6 text-center text-destructive">{error}</div>;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
