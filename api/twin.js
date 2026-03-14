// api/twin.js — Vercel serverless function
// Generates AI Twin profile using Gemini 2.5 Flash
// Same GEMINI_API_KEY env var as api/image.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { jobTitle, words } = req.body || {}
  if (!jobTitle || !Array.isArray(words) || words.length !== 3) {
    return res.status(400).json({ error: 'jobTitle (string) and words (array of 3) are required' })
  }

  const prompt = `You are a creative AI persona designer for a Singapore AI literacy booth.
A visitor works as a "${jobTitle}" and describes themselves with these 3 words: "${words.join(', ')}".

Create their AI Twin — a supercharged AI version of them. Return ONLY valid JSON, no markdown, no preamble:

{
  "twin_name": "<codename in format WORD-NUMBER like ARIA-7 or NEXUS-3>",
  "twin_full_name": "<3-5 word descriptive subtitle>",
  "origin_quote": "<one punchy witty line about what this AI was trained on, max 15 words>",
  "stats": [
    { "label": "<relevant skill>", "human": "<human value>", "ai": "<AI value>" },
    { "label": "<relevant skill>", "human": "<human value>", "ai": "<AI value>" },
    { "label": "<relevant skill>", "human": "<human value>", "ai": "<AI value>" },
    { "label": "<relevant skill>", "human": "<human value>", "ai": "<AI value>" },
    { "label": "Emotional Intelligence", "human": "✅ Innate", "ai": "❌ Simulated" }
  ],
  "mission": "<one sentence at superhuman scale>",
  "human_superpower": "<one sentence genuine compliment specific to these 3 words>",
  "tagline": "<8-12 word tagline celebrating the human>",
  "image_prompt": "<DALL-E style prompt: futuristic holographic avatar for a ${jobTitle}, abstract tech, no text>"
}`

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.9 }
        })
      }
    )
    
    const rawText = await response.text()
    if (!rawText) throw new Error('Empty response from Gemini API')
    
    const data = JSON.parse(rawText)
    if (data.error) throw new Error(data.error.message)
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Extract and clean JSON from the response
    let clean = text.replace(/```json|```/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start === -1 || end === -1) throw new Error('No JSON object found in response')
    clean = clean.slice(start, end + 1)

    // Fix common JSON issues from LLM output
    const sanitized = clean
      .replace(/,\s*}/g, '}')       // trailing commas before }
      .replace(/,\s*\]/g, ']')      // trailing commas before ]
      .replace(/[\x00-\x1F\x7F]/g, (c) => {  // unescaped control chars
        if (c === '\n' || c === '\r' || c === '\t') return c
        return ''
      })

    const parsed = JSON.parse(sanitized)
    return res.status(200).json(parsed)
  } catch (err) {
    console.error('[api/twin] Error:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to generate twin profile' })
  }
}
