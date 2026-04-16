import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5050/api";

// Proxy to backend agents
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  try {
    const { agent: agentName } = await params;
    const body = await request.json();
    const token = request.headers.get("authorization") || "";

    const res = await fetch(`${API_BASE}/agents/${agentName}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": token,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const res = await fetch(`${API_BASE}/agents`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ agents: [] });
  }
}
