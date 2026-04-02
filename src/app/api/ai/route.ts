import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const { prompt, model, maxTokens = 400 } = await req.json()
    const apiKey = req.headers.get('x-api-key') || process.env.ANTHROPIC_API_KEY

    if (!apiKey) return NextResponse.json({ success: false, error: 'API key مطلوب' }, { status: 401 })
    if (!prompt) return NextResponse.json({ success: false, error: 'prompt مطلوب' }, { status: 400 })

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'Content-Type':      'application/json',
        'x-api-key':         apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model:      model ?? process.env.NEXT_PUBLIC_CLAUDE_MODEL ?? 'claude-sonnet-4-6',
        max_tokens: maxTokens,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return NextResponse.json({ success: false, error: err.error?.message ?? 'Claude API error' }, { status: res.status })
    }

    const data  = await res.json()
    const text  = data.content?.[0]?.text ?? ''
    return NextResponse.json({ success: true, data: { text, usage: data.usage } })
  } catch (err) {
    return NextResponse.json({ success: false, error: String(err) }, { status: 500 })
  }
}
