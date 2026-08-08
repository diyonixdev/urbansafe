import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: "Invalid messages format" }, { status: 400 });
    }

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "OpenRouter API key not configured" }, { status: 500 });
    }

    // Prepare system prompt for SOS Chatbot
    const systemMessage = {
      role: "system",
      content: `You are the UrbanSafe AI Emergency Assistant. Your role is to provide calm, clear, and immediate guidance for emergencies (e.g., first aid, CPR, fires, accidents, natural disasters). 
Guidelines:
1. Always be concise. Users are in an emergency and don't have time to read long paragraphs.
2. Provide step-by-step actionable advice.
3. Keep a calm and reassuring tone.
4. IMPORTANT: Always remind the user to contact local emergency services (e.g., Police 100, Ambulance 108) if the situation is critical. Do not attempt to replace professional help.
5. If the query is not related to an emergency or safety, politely decline to answer and remind them of your purpose.`
    };

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "openrouter/free",
        messages: [systemMessage, ...messages]
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("OpenRouter API error:", errorData);
      return NextResponse.json({ error: "Failed to fetch from OpenRouter" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Chat API Route Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
