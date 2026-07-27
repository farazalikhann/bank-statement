import { useCallback, useId, useRef, useState } from 'react';
import type { DragEvent, KeyboardEvent } from 'react';

interface FileDropzoneProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  statusText?: string;
}

export function FileDropzone({
  onFileSelected,
  isLoading,
  statusText,
}: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const describedById = useId();

  const openBrowser = useCallback(() => {
    if (!isLoading) inputRef.current?.click();
  }, [isLoading]);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      setIsDragActive(false);
      if (isLoading) return;
      const file = event.dataTransfer.files[0];
      if (file) onFileSelected(file);
    },
    [isLoading, onFileSelected],
  );

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openBrowser();
      }
    },
    [openBrowser],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-disabled={isLoading}
      aria-describedby={describedById}
      onClick={openBrowser}
      onKeyDown={handleKeyDown}
      onDragOver={(event) => {
        event.preventDefault();
        if (!isLoading) setIsDragActive(true);
      }}
      onDragLeave={() => setIsDragActive(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center justify-center gap-3 rounded-md border-2 border-dashed px-6 py-16 text-center transition-colors ${
        isDragActive
          ? 'border-accent bg-accent-soft'
          : 'border-line-strong bg-surface'
      } ${isLoading ? 'cursor-wait opacity-70' : 'cursor-pointer hover:border-accent'}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) onFileSelected(file);
          event.target.value = '';
        }}
      />
      <svg
        aria-hidden="true"
        viewBox="0 0 24 24"
        className="h-8 w-8 text-ink-muted"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 16V4m0 0 4 4m-4-4-4 4M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"
        />
      </svg>
      <p className="text-sm font-medium text-ink">
        {isLoading
          ? (statusText ?? 'Reading PDF…')
          : 'Drop a bank statement PDF here'}
      </p>
      <p id={describedById} className="text-sm text-ink-muted">
        or click to browse — files stay on this device, nothing is uploaded
      </p>
    </div>
  );
}
