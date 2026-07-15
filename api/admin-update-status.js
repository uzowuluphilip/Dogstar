const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const adminSecret = req.headers['x-admin-secret'];
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    const { orderId, newStatus } = req.body || {};

    if (!orderId || !newStatus) {
      return res.status(400).json({ error: 'Missing orderId or newStatus' });
    }

    if (!['approved', 'rejected'].includes(newStatus)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    const supabaseAdmin = createClient(
      process.env.SUPABASE_URL || 'https://kcbneewtmthghebkeghr.supabase.co',
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const { error } = await supabaseAdmin
      .from('gift_card_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      throw error;
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('admin-update-status error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};