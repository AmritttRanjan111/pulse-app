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

    // CHANGED: Using 'gemini-flash-latest' which is the most reliable alias
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
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

    if (data.error) {
      return res.status(data.error.code || 500).json({
        error: "Google API Error",
        message: data.error.message
      });
    }

    if (!data.candidates || data.candidates.length === 0) {
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
      // Clean backticks just in case
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