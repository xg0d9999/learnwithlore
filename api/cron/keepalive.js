import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return res.status(500).json({ error: 'Supabase credentials missing' });
  }

  // Create the Supabase client
  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    // We try to query the profiles table which is common in this project
    // Even if it returns an RLS error, the fact that Supabase responds means it is ACTIVE.
    const { data, error } = await supabase.from('profiles').select('id').limit(1);

    if (error) {
      // PGRST301 is a common "JWT expired" or similar, but here it might be RLS
      // We consider the ping successful if we reached the Supabase instance
      return res.status(200).json({ 
        success: true, 
        message: 'Supabase instance reached', 
        details: error.message,
        code: error.code 
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Ping successful: query executed', 
      count: data?.length 
    });
  } catch (error) {
    console.error('Ping error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || 'Unknown error' 
    });
  }
}
