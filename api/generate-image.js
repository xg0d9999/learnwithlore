export default async function handler(req, res) {
  let prompt, styling, image;

  if (req.method === 'POST') {
    ({ prompt, styling, image } = req.body);
  } else if (req.method === 'GET') {
    prompt = req.query.prompt;
    try {
      styling = req.query.styling ? JSON.parse(req.query.styling) : null;
      image = req.query.image ? JSON.parse(req.query.image) : null;
    } catch (e) {
      // Keep defaults if parsing fails
    }
  } else {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const apiKey = process.env.VITE_FREEPIK_API_KEY;

  if (!apiKey || !prompt) {
    return res.status(400).json({ error: !apiKey ? 'API Key missing' : 'Prompt missing' });
  }

  try {
    const response = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey
      },
      body: JSON.stringify({
        prompt: `${prompt}, sophisticated digital art style, high resolution, professional lighting, no cartoon`,
        styling: styling || { style: 'digital-art' },
        image: image || { size: 'square_1_1' }
      })
    });

    const data = await response.json();

    if (!response.ok) {
      return res.status(response.status).json({ error: data.message || 'Freepik API Error' });
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error('Proxy error:', error);
    return res.status(500).json({ error: 'Internal Server Error during AI generation' });
  }
}
