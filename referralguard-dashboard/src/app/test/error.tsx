'use client';

export default function Error({ error }: { error: Error }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black text-white">
      <div>
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <pre className="bg-red-900/80 p-4 rounded">{error.message}</pre>
      </div>
    </div>
  );
} 