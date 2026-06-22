// front-end/src/app/api/admin/reports/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';

import { getAdminUser } from '@/lib/supabase/getUser';

export async function POST(req: NextRequest) {
  const user = await getAdminUser()
    if (!user || !["OWNER"].includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

  const body = await req.json();
  const { dbData, dateRange } = body;

  const prompt = `You are a business analyst for a barbershop. Analyze this data for ${dateRange} and respond ONLY with a valid JSON object, no markdown, no backticks, no explanation.

Data:
${JSON.stringify(dbData, null, 2)}

Return exactly this JSON structure:
{
  "insights": [
    { "icon": "💡", "title": "string", "body": "string" },
    { "icon": "📈", "title": "string", "body": "string" },
    { "icon": "🎯", "title": "string", "body": "string" }
  ],
  "revenueTrend": <number, positive or negative integer>,
  "avgTrend": <number>,
  "apptTrend": <number>,
  "rateTrend": <number>,
  "weeklyInsight": "<one sentence about the revenue/transaction trend>",
  "serviceRecommendation": "<one sentence recommending which service to focus on>"
}`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('OpenAI error:', errText);
    return NextResponse.json({ error: 'OpenAI request failed' }, { status: 500 });
  }
  
  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? '{}';

  try {
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return NextResponse.json(parsed);
  } catch {
    return NextResponse.json({
      insights: [],
      revenueTrend: 0,
      avgTrend: 0,
      apptTrend: 0,
      rateTrend: 0,
      weeklyInsight: '',
      serviceRecommendation: '',
    });
  }
}