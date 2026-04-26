interface LoadingProps {
  message?: string;
  error?: Error | null;
}

export default function Loading({ message = 'Loading…', error }: LoadingProps) {
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="card-natural flex flex-col items-center gap-4 text-center max-w-md w-full">
        <div role="status" aria-live="polite" className="flex flex-col items-center">
          <div className="w-14 h-14 rounded-full border-4 border-on-surface/10 border-t-primary-container animate-spin" />
          <div className="mt-4 text-lg font-medium text-on-surface">{message}</div>
        </div>
        {error && (
          <div className="mt-2 text-sm text-on-surface-variant max-w-xs">
            {error.message || 'An error occurred while loading your data.'}
          </div>
        )}
      </div>
    </div>
  );
}
