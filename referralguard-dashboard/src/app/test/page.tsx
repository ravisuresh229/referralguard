export default function Test() {
  return (
    <div className="min-h-screen bg-black">
      <div className="p-8">
        <h1 className="text-4xl font-bold text-white mb-4">Tailwind Test</h1>
        <div className="bg-red-500 p-4 rounded">
          <p className="text-white">If this box is red with white text, Tailwind is working</p>
        </div>
        <div className="mt-4 bg-gradient-to-r from-blue-500 to-purple-500 p-4 rounded">
          <p className="text-white">If this has a gradient, advanced Tailwind is working</p>
        </div>
      </div>
    </div>
  );
} 