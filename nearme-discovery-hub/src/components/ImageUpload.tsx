import { useRef, useState, useCallback } from "react";
import { UploadCloud, X, Loader2 } from "lucide-react";
import { uploadImage } from "@/services/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  onUpload: (url: string) => void;
  currentUrl?: string;
  className?: string;
  label?: string;
}

export function ImageUpload({ onUpload, currentUrl, className, label }: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);

  const processFile = useCallback(
    async (file: File) => {
      const allowed = ["image/jpeg", "image/png", "image/webp"];
      if (!allowed.includes(file.type)) {
        toast.error("Only JPEG, PNG, and WebP images are allowed.");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image must be smaller than 5 MB.");
        return;
      }

      setPreview(URL.createObjectURL(file));
      setUploading(true);
      try {
        const url = await uploadImage(file);
        onUpload(url);
        toast.success("Image uploaded.");
      } catch {
        setPreview(currentUrl ?? null);
        toast.error("Upload failed. Please try again.");
      } finally {
        setUploading(false);
      }
    },
    [onUpload, currentUrl]
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    e.target.value = "";
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  const clear = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPreview(null);
    onUpload("");
  };

  return (
    <div className={cn("space-y-1.5", className)}>
      {label && <p className="text-sm font-medium leading-none">{label}</p>}

      <div
        role="button"
        tabIndex={0}
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "relative flex items-center justify-center rounded-xl border-2 border-dashed transition-colors cursor-pointer select-none overflow-hidden",
          preview ? "aspect-video border-transparent" : "aspect-video",
          dragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50 hover:bg-muted/30",
          uploading && "pointer-events-none"
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleChange}
        />

        {preview ? (
          <>
            <img
              src={preview}
              alt="Preview"
              className="w-full h-full object-cover"
            />
            {uploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                <Loader2 className="h-7 w-7 animate-spin text-primary" />
              </div>
            )}
            {!uploading && (
              <button
                type="button"
                onClick={clear}
                className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-background/80 shadow hover:bg-background transition-colors"
                aria-label="Remove image"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 p-6 text-muted-foreground">
            {uploading ? (
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            ) : (
              <>
                <UploadCloud className="h-8 w-8" />
                <p className="text-sm font-medium">Click or drag to upload</p>
                <p className="text-xs">JPEG, PNG, WebP · max 5 MB</p>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
