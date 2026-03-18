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

    // Using the stable flash-latest endpoint
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
                  text: `You are an expert Big-4 market research analyst. Generate a comprehensive market research report for this business idea:
                  
${idea}

You MUST return ONLY a valid JSON object matching EXACTLY this structure. Do not add any extra keys, and do not use markdown formatting outside the JSON:

{
  "businessTitle": "A short 3-4 word title for the idea",
  "viabilityScore": 85,
  "scoreVerdict": "A 1-sentence verdict on why it got this score.",
  "market": {
    "tam": "e.g. ₹10,000 Cr",
    "sam": "e.g. ₹2,000 Cr",
    "som": "e.g. ₹50 Cr",
    "summary": "A 2-sentence summary of the market size."
  },
  "survey": {
    "keyFinding": "A 1-sentence key takeaway from synthetic consumers.",
    "results": [
      {"label": "Price Sensitivity", "percentage": 45},
      {"label": "Quality Focus", "percentage": 55},
      {"label": "Brand Loyalty", "percentage": 30}
    ]
  },
  "competitors": "A short paragraph analyzing top 3 likely competitors.",
  "personas": [
    {"name": "Name 1", "demo": "Age, Location", "desc": "1-sentence description"},
    {"name": "Name 2", "demo": "Age, Location", "desc": "1-sentence description"},
    {"name": "Name 3", "demo": "Age, Location", "desc": "1-sentence description"}
  ],
  "trends": [
    {"name": "Trend 1", "velocity": "High"},
    {"name": "Trend 2", "velocity": "Medium"}
  ],
  "pricing": "A short paragraph on the best pricing strategy.",
  "experts": [
    {"initials": "SJ", "name": "Steve Jobs", "role": "Product Visionary", "quote": "A realistic synthetic quote about this idea."},
    {"initials": "WB", "name": "Warren Buffett", "role": "Value Investor", "quote": "A realistic synthetic quote about this idea."}
  ],
  "gtm": "A short paragraph outlining a 90-day go-to-market plan."
}`
                }
              ]
            }
          ],
          // This forces Gemini to output valid JSON
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
      // Fallback to strip markdown if the model accidentally includes it
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