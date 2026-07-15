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

    const { data: order, error: orderError } = await supabaseAdmin
      .from('gift_card_orders')
      .select('id,user_id,event_name,total_amount')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return res.status(404).json({ error: orderError?.message || 'Order not found' });
    }

    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(order.user_id);
    if (userError || !userData?.user?.email) {
      throw userError || new Error('Unable to retrieve user email');
    }

    const customerEmail = userData.user.email;

    const { error } = await supabaseAdmin
      .from('gift_card_orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      throw error;
    }

    const emailType = newStatus === 'approved' ? 'gift_approved' : 'gift_rejected';
    const endpoint = `${req.headers.origin || 'https://officialdogstar.com'}/api/send-email`;

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: emailType,
        to: customerEmail,
        data: {
          eventName: order.event_name,
          totalAmount: order.total_amount,
          orderId: order.id
        }
      })
    }).then(async (emailResponse) => {
      if (!emailResponse.ok) {
        const errorPayload = await emailResponse.json().catch(() => ({}));
        console.error('send-email failed:', emailResponse.status, errorPayload);
      }
    }).catch((emailError) => {
      console.error('send-email request failed:', emailError);
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('admin-update-status error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
};