import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

export async function OPTIONS() {
  return NextResponse.json({}, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { providerData } = body;

    if (!providerData) {
      return NextResponse.json({ error: 'No provider data provided' }, { status: 400, headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      }});
    }

    // Call Python script to use the real ML model
    return new Promise((resolve) => {
      const pythonProcess = spawn('python3', [
        path.join(process.cwd(), 'ml_predict.py'),
        '--data', JSON.stringify(providerData)
      ]);

      let output = '';
      let errorOutput = '';

      pythonProcess.stdout.on('data', (data: Buffer) => {
        output += data.toString();
      });

      pythonProcess.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      pythonProcess.on('close', (code: number) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            resolve(NextResponse.json({
              success: true,
              predictions: result.predictions,
              modelInfo: result.modelInfo
            }, {
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
              }
            }));
          } catch (e) {
            console.error('Error parsing Python output:', e);
            resolve(NextResponse.json({ 
              error: 'Failed to parse ML predictions' 
            }, { status: 500, headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type',
            }}));
          }
        } else {
          console.error('Python script failed:', errorOutput);
          resolve(NextResponse.json({ 
            error: 'ML prediction failed', 
            details: errorOutput 
          }, { status: 500, headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }}));
        }
      });
    });

  } catch (error) {
    console.error('Error in ML predict endpoint:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500, headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }});
  }
} 