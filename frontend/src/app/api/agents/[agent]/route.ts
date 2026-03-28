import { NextRequest, NextResponse } from "next/server";
import { getAgent, agentNames } from "@/agents";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ agent: string }> }
) {
  try {
    const { agent: agentName } = await params;
    const body = await request.json();
    const { input, sessionId = "default" } = body;

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    if (!agentNames.includes(agentName)) {
      return NextResponse.json(
        { error: `Agent "${agentName}" not found. Available: ${agentNames.join(", ")}` },
        { status: 404 }
      );
    }

    const agent = getAgent(agentName);
    const result = await agent.run(input, sessionId);

    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// List available agents
export async function GET() {
  return NextResponse.json({ agents: agentNames });
}
