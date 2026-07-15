const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || 'https://kcbneewtmthghebkeghr.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { data: orders, error: ordersError } = await supabaseAdmin
      .from('gift_card_orders')
      .select('*')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (ordersError) {
      throw ordersError;
    }

    const combinedResults = [];

    for (const order of orders) {
      const { data: entries, error: entriesError } = await supabaseAdmin
        .from('gift_card_entries')
        .select('*')
        .eq('order_id', order.id);

      if (entriesError) {
        throw entriesError;
      }

      const signedEntries = [];

      for (const entry of entries || []) {
        const frontResult = await supabaseAdmin.storage
          .from('gift-card-uploads')
          .createSignedUrl(entry.front_image_path, 3600);
        const backResult = await supabaseAdmin.storage
          .from('gift-card-uploads')
          .createSignedUrl(entry.back_image_path, 3600);

        signedEntries.push({
          ...entry,
          frontImageUrl: frontResult.data?.signedUrl || null,
          backImageUrl: backResult.data?.signedUrl || null
        });
      }

      combinedResults.push({
        ...order,
        entries: signedEntries
      });
    }

    return res.status(200).json({ orders: combinedResults });
  } catch (error) {
    console.error('admin-list-orders error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};