import Link from 'next/link';
import React from 'react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f2027] via-[#2c5364] to-[#232526] flex flex-col items-center justify-center text-white px-4">
      <div className="max-w-2xl w-full text-center glassmorphism p-10 rounded-3xl shadow-2xl">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-[#00c6ff] to-[#0072ff]">Stop Losing Millions in Referral Revenue</h1>
        <p className="text-lg md:text-xl mb-4">Hospitals lose <span className="font-bold text-[#00c6ff]">$200-500M annually</span> to referral leakage.</p>
        <p className="text-lg md:text-xl mb-8">Our <span className="font-bold text-[#00c6ff]">AI-powered detection</span> delivers <span className="font-bold text-[#00c6ff]">87% accuracy</span>—so you can take action before revenue walks out the door.</p>
        <Link href="/" className="inline-block bg-[#00c6ff] hover:bg-[#0072ff] text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-200 mb-6">Live Demo</Link>
        <form className="bg-white/10 backdrop-blur-md rounded-xl p-6 flex flex-col gap-4 items-center mt-4">
          <h2 className="text-2xl font-semibold mb-2">Contact / Request Demo</h2>
          <input type="text" placeholder="Your Name" className="w-full px-4 py-2 rounded bg-white/20 text-white placeholder-gray-300 focus:outline-none" required />
          <input type="email" placeholder="Your Email" className="w-full px-4 py-2 rounded bg-white/20 text-white placeholder-gray-300 focus:outline-none" required />
          <textarea placeholder="Message" className="w-full px-4 py-2 rounded bg-white/20 text-white placeholder-gray-300 focus:outline-none" rows={3} required />
          <button type="submit" className="bg-[#00c6ff] hover:bg-[#0072ff] text-white font-bold py-2 px-6 rounded-full shadow transition-all duration-200">Request Demo</button>
        </form>
      </div>
    </div>
  );
} 