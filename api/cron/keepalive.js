export default async function handler(req, res) {
  // Check for authorization header if you want to restrict it to Vercel Cron
  // const authHeader = req.headers.authorization;
  // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  //   return res.status(401).end('Unauthorized');
  // }

  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials missing' });
  }

  try {
    // A simple HEAD request to the REST API is enough to show activity
    const response = await fetch(`${supabaseUrl}/rest/v1/`, {
      method: 'GET',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    if (response.ok) {
      return res.status(200).json({ success: true, message: 'Supabase pinged successfully' });
    } else {
      return res.status(response.status).json({ success: false, message: 'Ping failed', status: response.statusText });
    }
  } catch (error) {
    console.error('Ping error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
