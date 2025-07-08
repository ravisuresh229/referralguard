import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function GET() {
  return new Promise((resolve) => {
    // Path to the Python script relative to referralguard-dashboard
    const scriptPath = path.resolve(process.cwd(), '../analyze_cms_data.py');
    const cwd = path.resolve(process.cwd(), '..'); // project root
    const child = spawn('python3', [scriptPath], { cwd });
    let data = '';
    let error = '';

    child.stdout.on('data', (chunk) => {
      data += chunk;
    });
    child.stderr.on('data', (chunk) => {
      error += chunk;
    });
    child.on('close', (code) => {
      if (code === 0) {
        try {
          const json = JSON.parse(data.trim());
          resolve(NextResponse.json(json));
        } catch (e) {
          console.error('Invalid JSON output from Python script:', data);
          resolve(NextResponse.json({ error: 'Invalid JSON output from Python script', details: e instanceof Error ? e.message : String(e), raw: data }, { status: 500 }));
        }
      } else {
        console.error('Python script failed:', error);
        resolve(NextResponse.json({ error: 'Python script failed', details: error, raw: data }, { status: 500 }));
      }
    });
  });
} 