export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).send('Method Not Allowed');
  }

  try {
    const { idea } = req.body;
    if (!idea) return res.status(400).json({ error: 'No idea provided' });

    const API_KEY = process.env.GEMINI_API_KEY;

    // =======================================================================
    // 1. THE DATA ENGINE (Parallel Fetching of Free APIs)
    // =======================================================================
    
    // API 1: Reddit JSON (100% Free, No Key needed)
    // We search Reddit for the business idea to find real pain points.
    const fetchReddit = async () => {
      try {
        const query = encodeURIComponent(idea.split(' ').slice(0, 3).join(' ')); // take first 3 words
        const redRes = await fetch(`https://www.reddit.com/search.json?q=${query}&limit=3`);
        const redData = await redRes.json();
        const comments = redData.data.children.map(c => c.data.title).join(" | ");
        return `Real internet chatter: ${comments}`;
      } catch (e) {
        return "No specific Reddit data found.";
      }
    };

    // API 2: (SLOT FOR NEWS API)
    const fetchNews = async () => {
      // TODO: Add NewsAPI fetch here later
      return "General news indicates growing interest in this sector.";
    };

    // API 3: (SLOT FOR WORLD BANK)
    const fetchWorldBank = async () => {
      // TODO: Add World Bank demographic fetch here later
      return "Macro trends show a growing middle class with disposable income.";
    };

    // Run all APIs at the exact same time so the user doesn't wait!
    const [redditResult, newsResult, macroResult] = await Promise.allSettled([
      fetchReddit(),
      fetchNews(),
      fetchWorldBank()
    ]);

    // Extract the data safely (if one fails, we just use a blank string)
    const injectedRedditData = redditResult.status === 'fulfilled' ? redditResult.value : '';
    const injectedNewsData = newsResult.status === 'fulfilled' ? newsResult.value : '';
    const injectedMacroData = macroResult.status === 'fulfilled' ? macroResult.value : '';


    // =======================================================================
    // 2. THE GEMINI SUPER-PROMPT
    // =======================================================================

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `You are an expert Big-4 market research analyst. Generate a comprehensive market research report for this business idea:
              
IDEA: ${idea}

CRITICAL INSTRUCTION: You must base your analysis, trends, and personas on the following REAL WORLD DATA that I have scraped from live APIs:
- REDDIT CHATTER: ${injectedRedditData}
- NEWS TRENDS: ${injectedNewsData}
- MACRO DATA: ${injectedMacroData}

You MUST return ONLY a valid JSON object matching EXACTLY this structure:

{
  "businessTitle": "A short 3-4 word title for the idea",
  "viabilityScore": 85,
  "scoreVerdict": "A 1-sentence verdict on why it got this score based on the Reddit/News data.",
  "market": {
    "tam": "e.g. ₹10,000 Cr",
    "sam": "e.g. ₹2,000 Cr",
    "som": "e.g. ₹50 Cr",
    "summary": "A 2-sentence summary of the market size."
  },
  "survey": {
    "keyFinding": "A 1-sentence key takeaway explicitly mentioning 'Based on a simulated demographic of n=512...'",
    "results": [
      {"label": "Specific Metric 1", "percentage": 46.8},
      {"label": "Specific Metric 2", "percentage": 31.2},
      {"label": "Specific Metric 3", "percentage": 22.0}
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
    {"initials": "KS", "name": "Dynamically pick a relevant expert (e.g., Kunal Shah)", "role": "Real Title", "quote": "A highly critical 3-sentence analysis of this idea. Point out a specific operational flaw."},
    {"initials": "PG", "name": "Dynamically pick a 2nd expert (e.g., Paul Graham)", "role": "Real Title", "quote": "A critical 3-sentence analysis focusing on unit economics."}
  ],
  "gtm": "A short paragraph outlining a 90-day go-to-market plan."
}`
            }]
          }],
          generationConfig: {
            response_mime_type: "application/json",
          }
        })
      }
    );

    const data = await response.json();

    if (data.error) {
      return res.status(data.error.code || 500).json({ error: "Google API Error", message: data.error.message });
    }

    if (!data.candidates || data.candidates.length === 0) {
      return res.status(500).json({ error: "No response from AI", full: data });
    }

    const text = data.candidates[0].content.parts[0].text;
    
    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (e) {
      const cleanedText = text.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleanedText);
    }

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}