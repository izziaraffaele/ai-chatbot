"use client";

import { Link2, Upload, X } from "lucide-react";
import type React from "react";
import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface ImageUploadProps {
  value?: string;
  onChange?: (value: string) => void;
  onBlur?: () => void;
  className?: string;
  accept?: string;
  maxSizeMB?: number;
}

export const ImageUpload = (props: ImageUploadProps) => {
  const {
    value,
    onChange,
    onBlur,
    className,
    accept = "image/*",
    maxSizeMB = 5,
  } = props;
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlValue, setUrlValue] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertToBase64 = useCallback(
    (file: File): Promise<string> => {
      return new Promise((resolve, reject) => {
        // Check file size
        const maxSizeBytes = maxSizeMB * 1024 * 1024;
        if (file.size > maxSizeBytes) {
          reject(new Error(`File size must be less than ${maxSizeMB}MB`));
          return;
        }

        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result);
          } else {
            reject(new Error("Failed to convert image to base64"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });
    },
    [maxSizeMB]
  );

  const handleFileChange = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const base64 = await convertToBase64(file);
        onChange?.(base64);
        onBlur?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to upload image");
      }
    },
    [convertToBase64, onChange, onBlur]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileChange(file);
      }
    },
    [handleFileChange]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        handleFileChange(file);
      } else {
        setError("Please drop a valid image file");
      }
    },
    [handleFileChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleRemove = useCallback(() => {
    onChange?.("");
    onBlur?.();
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [onChange, onBlur]);

  const handleClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleUrlSubmit = useCallback(() => {
    if (urlValue) {
      onChange?.(urlValue);
      onBlur?.();
      setShowUrlInput(false);
      setUrlValue("");
    }
  }, [urlValue, onChange, onBlur]);

  const handleToggleUrlInput = useCallback(() => {
    setShowUrlInput((prev) => !prev);
    setUrlValue("");
    setError(null);
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      {value ? (
        <div className="relative inline-block">
          <div className="overflow-hidden rounded-lg border border-border">
            <img alt="Preview" className="h-32 w-32 object-cover" src={value} />
          </div>
          <Button
            className="-right-2 -top-2 absolute h-6 w-6 rounded-full"
            onClick={handleRemove}
            size="icon"
            type="button"
            variant="destructive"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : showUrlInput ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              onChange={(e) => setUrlValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleUrlSubmit();
                }
              }}
              placeholder="https://example.com/image.jpg"
              type="url"
              value={urlValue}
            />
            <Button onClick={handleUrlSubmit} type="button" variant="default">
              Add
            </Button>
          </div>
          <Button
            className="w-full"
            onClick={handleToggleUrlInput}
            type="button"
            variant="ghost"
          >
            Cancel
          </Button>
        </div>
      ) : (
        <>
          <div
            className={cn(
              "flex h-32 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-border border-dashed transition-colors hover:border-primary",
              isDragging && "border-primary bg-primary/5",
              error && "border-destructive"
            )}
            onClick={handleClick}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                handleClick();
              }
            }}
            role="button"
            tabIndex={0}
          >
            <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-muted-foreground text-sm">
              Click or drag image to upload
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              Max size: {maxSizeMB}MB
            </p>
          </div>
          <Button
            className="w-full"
            onClick={handleToggleUrlInput}
            type="button"
            variant="outline"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Or use image URL
          </Button>
        </>
      )}

      <input
        accept={accept}
        className="hidden"
        onChange={handleInputChange}
        ref={fileInputRef}
        type="file"
      />

      {error && <p className="text-destructive text-sm">{error}</p>}
    </div>
  );
};
