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

    const prompt = `Analyze this business idea and return ONLY JSON:

"${idea}"`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    const data = await response.json();

    let text = data.candidates[0].content.parts[0].text;
    text = text.replace(/```json|```/g, '').trim();

    const parsed = JSON.parse(text);

    return res.status(200).json(parsed);

  } catch (error) {
    return res.status(500).json({
      error: error.message
    });
  }
}