const adminPasswordInput = document.getElementById('admin-password');
const adminLoginBtn = document.getElementById('admin-login-btn');
const adminLoginError = document.getElementById('admin-login-error');
const adminLoginPanel = document.getElementById('admin-login');
const adminPanel = document.getElementById('admin-panel');
const adminOrders = document.getElementById('admin-orders');
const adminRefreshBtn = document.getElementById('admin-refresh-btn');
const adminStatus = document.getElementById('admin-status');
const adminToast = document.getElementById('admin-toast');

let adminSecret = '';

const showError = (element, message) => {
  if (!element) return;
  element.hidden = false;
  element.textContent = message;
};

const clearError = (element) => {
  if (!element) return;
  element.hidden = true;
  element.textContent = '';
};

const showToast = (message) => {
  if (!adminToast) return;
  adminToast.textContent = message;
  adminToast.hidden = false;
  setTimeout(() => {
    adminToast.hidden = true;
  }, 3000);
};

const formatCurrency = (value) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value || 0);
};

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Unknown date' : date.toLocaleString();
};

const buildEntryMarkup = (entry, index) => {
  return `
    <div class="admin-entry-card">
      <div class="admin-entry-card__header">
        <span>Card ${index + 1}: ${entry.brand || 'Unknown'}</span>
        <span>${entry.claimed_amount ? formatCurrency(entry.claimed_amount) : 'No amount'}</span>
      </div>
      <div class="admin-entry-card__body">
        <div>Code: <strong>${entry.code || 'N/A'}</strong></div>
        <div class="admin-entry-images">
          <div class="admin-entry-image">
            <span>Front</span>
            <img src="${entry.frontImageUrl || '#'}" alt="Front of gift card" />
          </div>
          <div class="admin-entry-image">
            <span>Back</span>
            <img src="${entry.backImageUrl || '#'}" alt="Back of gift card" />
          </div>
        </div>
      </div>
    </div>
  `;
};

const buildOrderCard = (order) => {
  const itemsMarkup = (order.items || []).map((item) => `
      <li>${item.name} × ${item.quantity}</li>
    `).join('');

  const entriesMarkup = (order.entries || []).map((entry, index) => buildEntryMarkup(entry, index)).join('');

  return `
    <section class="admin-order-card" data-order-id="${order.id}">
      <div class="admin-order-card__header">
        <div>
          <h2>${order.event_name || 'No event name'}</h2>
          <p>${formatDate(order.created_at)}</p>
        </div>
        <div class="admin-order-card__summary">
          <span>Total Requested</span>
          <strong>${order.total_amount ? formatCurrency(order.total_amount) : 'N/A'}</strong>
        </div>
      </div>
      <div class="admin-order-card__section">
        <h3>Items Purchased</h3>
        <ul class="admin-order-items">${itemsMarkup}</ul>
      </div>
      <div class="admin-order-card__section">
        <h3>Gift Card Entries</h3>
        ${entriesMarkup}
      </div>
      <div class="admin-order-card__actions">
        <button type="button" class="admin-button admin-button--success admin-action-approve">APPROVE</button>
        <button type="button" class="admin-button admin-button--danger admin-action-reject">REJECT</button>
      </div>
      <p class="admin-order-card__status" hidden></p>
    </section>
  `;
};

const renderOrders = (orders) => {
  if (!adminOrders) return;
  if (!orders || !orders.length) {
    adminOrders.innerHTML = '<p class="admin-empty">No pending orders at the moment.</p>';
    return;
  }

  adminOrders.innerHTML = orders.map(buildOrderCard).join('');
};

const fetchOrders = async () => {
  if (!adminSecret) return;
  if (adminStatus) adminStatus.textContent = 'Refreshing pending orders...';

  try {
    const response = await fetch('/api/admin-list-orders', {
      headers: {
        'x-admin-secret': adminSecret
      }
    });

    if (response.status === 401) {
      throw new Error('Incorrect password');
    }

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'Unable to fetch orders');
    }

    renderOrders(result.orders || []);
    if (adminStatus) adminStatus.textContent = `Loaded ${result.orders?.length || 0} pending orders.`;
  } catch (error) {
    if (adminStatus) adminStatus.textContent = 'Failed to load orders.';
    showError(adminLoginError, error.message || 'Unable to load orders');
  }
};

const handleOrderAction = async (orderId, newStatus, cardElement) => {
  if (!adminSecret) return;

  try {
    const response = await fetch('/api/admin-update-status', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminSecret
      },
      body: JSON.stringify({ orderId, newStatus })
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result?.error || 'Unable to update order status');
    }

    if (cardElement) {
      cardElement.remove();
      showToast(`Order ${newStatus.toUpperCase()} successfully`);
      if (adminStatus) {
        const remaining = adminOrders.querySelectorAll('.admin-order-card').length;
        adminStatus.textContent = `${remaining} pending orders remaining.`;
      }
    }
  } catch (error) {
    if (cardElement) {
      const statusEl = cardElement.querySelector('.admin-order-card__status');
      if (statusEl) {
        statusEl.hidden = false;
        statusEl.textContent = error.message || 'Unable to update status';
      }
    }
  }
};

if (adminLoginBtn) {
  adminLoginBtn.addEventListener('click', async () => {
    clearError(adminLoginError);

    if (!adminPasswordInput) return;
    const password = adminPasswordInput.value.trim();

    if (!password) {
      showError(adminLoginError, 'Please enter the admin password.');
      return;
    }

    adminSecret = password;

    try {
      const response = await fetch('/api/admin-list-orders', {
        headers: {
          'x-admin-secret': adminSecret
        }
      });

      if (response.status === 401) {
        throw new Error('Incorrect password');
      }

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result?.error || 'Unable to fetch orders');
      }

      if (adminLoginPanel) adminLoginPanel.hidden = true;
      if (adminPanel) adminPanel.hidden = false;
      renderOrders(result.orders || []);
      if (adminStatus) adminStatus.textContent = `Loaded ${result.orders?.length || 0} pending orders.`;
    } catch (error) {
      showError(adminLoginError, error.message || 'Login failed.');
    }
  });
}

if (adminRefreshBtn) {
  adminRefreshBtn.addEventListener('click', () => {
    clearError(adminLoginError);
    fetchOrders();
  });
}

if (adminOrders) {
  adminOrders.addEventListener('click', (event) => {
    const approveBtn = event.target.closest('.admin-action-approve');
    const rejectBtn = event.target.closest('.admin-action-reject');

    if (!approveBtn && !rejectBtn) return;

    const card = event.target.closest('.admin-order-card');
    const orderId = card?.dataset.orderId;

    if (!orderId) return;

    if (approveBtn) {
      handleOrderAction(orderId, 'approved', card);
    } else if (rejectBtn) {
      handleOrderAction(orderId, 'rejected', card);
    }
  });
}

const initAdminPage = () => {
  if (adminPanel) adminPanel.hidden = true;
  if (adminToast) adminToast.hidden = true;
};

initAdminPage();
