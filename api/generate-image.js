export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const { prompt, styling, image } = req.body;
  const apiKey = process.env.VITE_FREEPIK_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Freepik API Key not configured in Vercel environment' });
  }

  try {
    const response = await fetch('https://api.freepik.com/v1/ai/text-to-image', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-freepik-api-key': apiKey
      },
      body: JSON.stringify({
        prompt,
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
