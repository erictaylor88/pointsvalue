import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'pointsvalue',
    timestamp: new Date().toISOString(),
  })
}
