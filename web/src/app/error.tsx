"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[50vh] animate-fade-in">
      <div className="glass-card rounded-xl p-8 text-center max-w-md">
        <div className="flex justify-center mb-4">
          <div className="h-12 w-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
            <svg
              className="h-6 w-6 text-rose-400"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
          </div>
        </div>
        <h2 className="text-lg font-bold text-text-primary mb-2">
          Something went wrong
        </h2>
        <p className="text-sm text-text-muted mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="px-4 py-2 text-sm font-semibold bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 rounded-lg hover:bg-indigo-500/25 transition-all"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
