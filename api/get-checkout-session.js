const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sessionId = req.query?.session_id;

  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

    return res.status(200).json({
      customerEmail: session.customer_details?.email || null,
      amountTotal: session.amount_total / 100,
      currency: session.currency,
      lineItems: session.line_items.data.map((item) => ({
        name: item.description,
        quantity: item.quantity,
        amount: item.amount_total / 100,
      })),
      paymentStatus: session.payment_status,
    });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
};
