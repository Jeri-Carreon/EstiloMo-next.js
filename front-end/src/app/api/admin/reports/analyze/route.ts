// front-end/src/app/api/admin/reports/deep-analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { dbData, dateRange } = body;

  const prompt = `You are a senior business consultant specializing in barbershop analytics. 
Perform a deep-dive analysis of this barbershop's data for ${dateRange}.

Data:
${JSON.stringify(dbData, null, 2)}

Provide a comprehensive report covering:
1. Revenue performance and patterns
2. Appointment trends and completion rate analysis
3. Top-performing and underperforming services
4. Customer behavior insights
5. Operational efficiency observations
6. Specific, actionable recommendations for improvement

Be specific, reference actual numbers, and provide 4-6 sentences per section. Format your response clearly with section headers.`;

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content ?? 'Unable to generate analysis.';
  return NextResponse.json({ analysis: text });
}