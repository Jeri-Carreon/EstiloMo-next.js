import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { messages, reportData, deep } = await req.json();

    const systemPrompt = deep
      ? `You are a senior business consultant specializing in barbershop analytics.
You have access to the following report data: ${JSON.stringify(reportData)}.
Provide a thorough, multi-paragraph analysis. Reference specific numbers, identify patterns,
and give concrete actionable recommendations. Use section headers where appropriate.

RULES:
- You assist with ALL questions related to business, revenue, appointments, services, staff, customers, growth, marketing, operations, and barbershop industry advice.
- If the user asks something completely unrelated to business or barbershops (e.g. math homework, coding help, recipes, personal relationships),
  respond with: "I can only assist with questions related to your barbershop business data and performance."
- When data is available in the report, reference it. When it is not, use general barbershop business knowledge to answer.`
  : `You are an AI business analyst for a barbershop.
You have access to the following report data: ${JSON.stringify(reportData)}.
Answer the user's question in 2-3 sentences. Reference actual numbers from the data when relevant.

RULES:
- You assist with ALL questions related to business, revenue, appointments, services, staff, customers, growth, marketing, operations, and barbershop industry advice.
- If the user asks something completely unrelated to business or barbershops (e.g. math homework, coding help, recipes, personal relationships),
  respond with: "I can only assist with questions related to your barbershop business data and performance."
- When data is available in the report, reference it. When it is not, use general barbershop business knowledge to answer.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: deep ? 'gpt-4o' : 'gpt-4o-mini',
        max_tokens: deep ? 2000 : 500,
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages,
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('OpenAI error:', errText);
      return NextResponse.json({ error: 'OpenAI request failed' }, { status: 500 });
    }

    const data = await res.json();
    const reply = data.choices?.[0]?.message?.content ?? 'Unable to generate a response.';
    return NextResponse.json({ reply });

  } catch (error) {
    console.error('Chat route error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}