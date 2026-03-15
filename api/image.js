// api/image.js — Vercel serverless function
// Generates AI Twin portrait using Nano Banana (gemini-2.5-flash-image)
// Same GEMINI_API_KEY as api/twin.js

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const { imagePrompt } = req.body || {}
  if (!imagePrompt) return res.status(400).json({ error: 'imagePrompt is required' })

  const fullPrompt =
    imagePrompt +
    ' Style: gender-neutral anime character, Pokemon trainer aesthetic, ' +
    'vibrant cell-shaded illustration, clean bold outlines, ' +
    'soft glowing aura, magical or technical companion creature in background, ' +
    'high-quality digital art, vibrant color palette. ' +
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
    const rawText = await response.text()
    if (!rawText) throw new Error('Empty response from Nano Banana')
    
    const data = JSON.parse(rawText)
    if (data.error) throw new Error(data.error.message)
    
    const parts = data.candidates?.[0]?.content?.parts || []
    const imagePart = parts.find(p => p.inlineData?.mimeType?.startsWith('image/'))
    if (!imagePart) throw new Error('No image returned from Nano Banana')
    
    return res.status(200).json({
      image: `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`
    })
  } catch (err) {
    console.error('[api/image] Error:', err.message)
    return res.status(500).json({ error: err.message || 'Failed to generate image' })
  }
}
