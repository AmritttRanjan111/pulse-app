export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { idea } = req.body;

    if (!idea) {
      return res.status(400).json({ error: 'No idea provided' });
    }

    const API_KEY = process.env.GEMINI_API_KEY;

    // Updated URL: Using v1beta and the direct model path
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: `Return ONLY JSON market research for this idea:
                  
                  ${idea}
                  
                  Include exactly these keys:
                  - viabilityScore
                  - market
                  - competitors
                  - personas
                  - pricing
                  - gtm`
                }
              ]
            }
          ],
          generationConfig: {
            response_mime_type: "application/json",
          }
        })
      }
    );

    const data = await response.json();

    // Catching specific Google API errors early
    if (data.error) {
      return res.status(data.error.code || 500).json({
        error: "Google API Error",
        message: data.error.message,
        details: data.error.status
      });
    }

    if (!data.candidates || !data.candidates[0].content || !data.candidates[0].content.parts) {
      return res.status(500).json({
        error: "No response from AI",
        full: data
      });
    }

    const text = data.candidates[0].content.parts[0].text;
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      // Fallback: If it still returns markdown triple backticks, strip them
      const cleanedText = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleanedText);
    }

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}