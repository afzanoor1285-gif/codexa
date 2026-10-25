import { getToken } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";

export interface AIPredictionResponse {
  prediction: "AI" | "Human";
  confidence: number;
}

export interface AIPredictionError {
  error: string;
}

export const downloadSubmissionCode = async (submissionId: string): Promise<void> => {
  const token = getToken();
  if (!token) {
    throw new Error("Your session has expired. Please log in again.");
  }

  const response = await fetch(
    `${API_BASE_URL}/api/submissions/${submissionId}/download`,
    { headers: { Authorization: "Bearer " + token } },
  );
  if (!response.ok) {
    const error: AIPredictionError = await response.json().catch(() => ({ error: "" }));
    throw new Error(error.error || "Unable to download this submission.");
  }

  const blob = await response.blob();
  const downloadUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = downloadUrl;
  link.download = `submission-${submissionId}.txt`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 1000);
};

export const predictAICode = async (code: string): Promise<AIPredictionResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + (getToken() ?? ""),
      },
      body: JSON.stringify({ code }),
    });

    if (!response.ok) {
      const errorData: AIPredictionError = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json() as AIPredictionResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
};

export const predictAICodePlainText = async (code: string): Promise<AIPredictionResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/predict-ai`, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Authorization: "Bearer " + (getToken() ?? ""),
      },
      body: code,
    });

    if (!response.ok) {
      const errorData: AIPredictionError = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    return await response.json() as AIPredictionResponse;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unexpected error occurred");
  }
};
