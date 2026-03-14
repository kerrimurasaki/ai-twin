import express from 'express'
import cors from 'cors'
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

// Load .env.local manually
const __dirname = dirname(fileURLToPath(import.meta.url))
const envPath = resolve(__dirname, '.env.local')
try {
  const lines = readFileSync(envPath, 'utf8').split('\n')
  for (const line of lines) {
    const [key, ...rest] = line.split('=')
    if (key && rest.length) process.env[key.trim()] = rest.join('=').trim()
  }
} catch {
  console.warn('⚠️  No .env.local found — add your GEMINI_API_KEY')
}

const app = express()
app.use(cors())
app.use(express.json())

// ── /api/twin ────────────────────────────────────────────────────────────────
app.post('/api/twin', async (req, res) => {
  const { jobTitle, words } = req.body || {}
  if (!jobTitle || !Array.isArray(words) || words.length !== 3) {
    return res.status(400).json({ error: 'jobTitle and words[3] required' })
  }

  const prompt = `You are a creative AI persona designer for a Singapore AI literacy booth.
A visitor works as a "${jobTitle}" and describes themselves with these 3 words: "${words.join(', ')}".

Create their AI Twin — a supercharged AI version of them. Return ONLY valid JSON, no markdown, no preamble:

{
  "twin_name": "<codename in format WORD-NUMBER like ARIA-7 or NEXUS-3>",
  "twin_full_name": "<3-5 word descriptive subtitle, e.g. 'Adaptive Reasoning Intelligence Assistant'>",
  "origin_quote": "<one punchy witty line about what this AI was trained on, max 15 words>",
  "stats": [
    { "label": "<relevant skill for this job>", "human": "<human-scale value>", "ai": "<superhuman AI value>" },
    { "label": "<relevant skill for this job>", "human": "<human-scale value>", "ai": "<superhuman AI value>" },
    { "label": "<relevant skill for this job>", "human": "<human-scale value>", "ai": "<superhuman AI value>" },
    { "label": "<relevant skill for this job>", "human": "<human-scale value>", "ai": "<superhuman AI value>" },
    { "label": "Emotional Intelligence", "human": "✅ Innate", "ai": "❌ Simulated" }
  ],
  "mission": "<one sentence: what this AI twin does at superhuman scale, specific to the job>",
  "human_superpower": "<one sentence: what the human can do that the AI twin cannot, a genuine compliment specific to these 3 words>",
  "tagline": "<final punchy 8-12 word tagline that celebrates the human, not the AI>",
  "image_prompt": "<prompt for an AI image generator: a futuristic holographic avatar portrait representing a ${jobTitle}, professional glowing abstract tech aesthetic, NOT a photorealistic person, suitable for Singapore professional audience, 1:1 square, no text, no words, no letters>"
}`

  try {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`
    console.log('[twin] Calling Gemini API...')
    const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { maxOutputTokens: 2048, temperature: 0.9 }
        })
      }
    )
    console.log('[twin] Gemini response status:', response.status)
    const rawText = await response.text()
    if (!rawText) {
      return res.status(500).json({ error: 'Empty response from Gemini API' })
    }
    const data = JSON.parse(rawText)
    if (data.error) {
      console.error('[twin] Gemini API error:', data.error.message)
      return res.status(500).json({ error: data.error.message })
    }
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    // Extract and clean JSON from the response
    let clean = ''
    try {
      clean = text.replace(/```json|```/g, '').trim()
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
      console.log('[twin] Successfully parsed twin:', parsed.twin_name)
      return res.status(200).json(parsed)
    } catch (parseErr) {
      console.error('[twin] JSON Parsing Failed. Error:', parseErr.message)
      console.error('[twin] Full text received:', text)
      console.error('[twin] Attempted to parse:', clean)
      return res.status(500).json({ error: 'Failed to parse AI response. The model may have generated malformed JSON.' })
    }
  } catch (err) {
    console.error('[twin] Error:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to generate twin profile' })
  }
})

// ── /api/image ───────────────────────────────────────────────────────────────
app.post('/api/image', async (req, res) => {
  const { imagePrompt } = req.body || {}
  if (!imagePrompt) return res.status(400).json({ error: 'imagePrompt required' })

  const fullPrompt =
    imagePrompt +
    ' Style: holographic trading card portrait, iridescent neon energy, ' +
    'futuristic abstract avatar, dark background with cyan and violet accents, ' +
    'glowing light trails, professional Singapore tech aesthetic. ' +
    'No text, no words, no letters, no numbers anywhere in the image.'

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseModalities: ['IMAGE'],
            imageConfig: { aspectRatio: '1:1' }
          }
        })
      }
    )
    const data = await response.json()
    if (data.error) return res.status(500).json({ error: data.error.message })
    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'))
    if (!imagePart) return res.status(500).json({ error: 'No image returned from Nano Banana' })
    return res.status(200).json({
      image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
    })
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Failed to generate image' })
  }
})

app.listen(3001, () => {
  console.log('✅ API proxy running on http://localhost:3001')
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'PASTE_YOUR_KEY_HERE') {
    console.warn('⚠️  GEMINI_API_KEY not set — add it to .env.local')
  }
})
