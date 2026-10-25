import { useEffect, useRef, useState } from "react";
import { Camera, Loader } from "lucide-react";
import { getToken } from "@/lib/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:5000";
const MAX_PHOTO_SIZE = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ProfilePhotoProps {
  initials: string;
  role: "teacher" | "student";
  size?: "default" | "large";
}

const ProfilePhoto = ({ initials, role, size = "default" }: ProfilePhotoProps) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const photoUrlRef = useRef<string | null>(null);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadPhoto = async () => {
      const token = getToken();
      if (!token) return;
      try {
        const response = await fetch(`${API_BASE_URL}/api/profile/photo`, {
          headers: { Authorization: "Bearer " + token },
        });
        if (response.status === 404) return;
        if (!response.ok) {
          throw new Error("Unable to load your profile picture.");
        }
        const url = URL.createObjectURL(await response.blob());
        if (active) {
          photoUrlRef.current = url;
          setPhotoUrl(url);
        } else {
          URL.revokeObjectURL(url);
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load your profile picture.");
        }
      }
    };

    void loadPhoto();
    return () => {
      active = false;
      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current);
      }
    };
  }, []);

  const handlePhotoChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_PHOTO_SIZE) {
      setError("Choose an image that is 2 MB or smaller.");
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      setError("Choose a JPEG, PNG, GIF, or WebP image.");
      return;
    }

    const token = getToken();
    if (!token) {
      setError("Your session has expired. Please log in again.");
      return;
    }

    setError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("photo", file);
      const response = await fetch(`${API_BASE_URL}/api/profile/photo`, {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: formData,
      });
      const responseText = await response.text();
      let data: { error?: string; message?: string } = {};
      try {
        data = JSON.parse(responseText);
      } catch {
        throw new Error(
          response.status === 404
            ? "The photo upload API is not available. Restart the backend, then try again."
            : `Upload failed (HTTP ${response.status}). Please try again.`,
        );
      }
      if (!response.ok) {
        throw new Error(data.error || "Unable to update your profile picture.");
      }

      const imageResponse = await fetch(`${API_BASE_URL}/api/profile/photo`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!imageResponse.ok) {
        throw new Error("Picture was saved, but could not be loaded. Refresh the page to try again.");
      }
      const nextUrl = URL.createObjectURL(await imageResponse.blob());
      if (photoUrlRef.current) {
        URL.revokeObjectURL(photoUrlRef.current);
      }
      photoUrlRef.current = nextUrl;
      setPhotoUrl(nextUrl);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Unable to update your profile picture.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="sr-only"
        onChange={handlePhotoChange}
        aria-label="Choose a profile picture"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        aria-label={photoUrl ? "Change profile picture" : "Add profile picture"}
        title="Click to choose or change your profile picture"
        className={`group relative flex ${size === "large" ? "h-20 w-20 text-xl" : "h-10 w-10"} items-center justify-center overflow-hidden rounded-full ${
          role === "teacher"
            ? "bg-primary text-primary-foreground"
            : "bg-secondary text-white"
        } font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`}
      >
        {photoUrl ? (
          <img src={photoUrl} alt={`${role} profile`} className="h-full w-full object-cover" />
        ) : (
          <span>{initials || (role === "teacher" ? "T" : "S")}</span>
        )}
        <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {uploading ? <Loader className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
        </span>
      </button>
      {error && (
        <p role="alert" className="fixed right-4 top-16 z-50 max-w-64 rounded-lg bg-destructive px-3 py-2 text-xs text-destructive-foreground shadow-lg">
          {error}
        </p>
      )}
    </div>
  );
};

export default ProfilePhoto;
