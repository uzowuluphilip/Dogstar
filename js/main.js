const SUPABASE_URL = "https://kcbneewtmthghebkeghr.supabase.co";
const SUPABASE_KEY = "sb_publishable_8L_MKngPudQh6cdvf1BzTg_vOFt7XeK";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let pendingTourDateEntry = null;

supabaseClient.auth.getSession().then((result) => {
  console.log('Supabase auth session check:', result);
}).catch((error) => {
  console.error('Supabase auth session check failed:', error);
});

let activeTourDateEntry = null;

const isExistingAccountError = (error) => {
  const message = error?.message || error?.msg || '';
  const code = error?.code || error?.error_code || '';
  const normalizedCode = String(code).toLowerCase();

  return normalizedCode === 'user_already_exists'
    || normalizedCode === 'already_exists'
    || normalizedCode === 'already_registered'
    || (/already/i.test(message) && /(registered|exist|account)/i.test(message));
};

const openTicketModal = (tourDateEntry) => {
  const ticketModal = document.getElementById('ticket-modal');
  const ticketModalDate = document.querySelector('.ticket-modal__date');
  const ticketModalVenue = document.querySelector('.ticket-modal__venue');
  const ticketModalLocation = document.querySelector('.ticket-modal__location');
  const ticketModalPackages = document.querySelector('.ticket-modal__packages');
  const ticketModalTotal = document.querySelector('.ticket-modal__total-amount');
  const ticketModalCheckout = document.querySelector('.ticket-modal__checkout-btn');

  if (!tourDateEntry) return;

  activeTourDateEntry = tourDateEntry;

  if (ticketModalDate) ticketModalDate.textContent = tourDateEntry.displayDate || '';
  if (ticketModalVenue) ticketModalVenue.textContent = tourDateEntry.venue || '';
  if (ticketModalLocation) ticketModalLocation.textContent = tourDateEntry.location || '';

  if (ticketModalPackages) {
    ticketModalPackages.innerHTML = '';

    (tourDateEntry.packages || []).forEach((pkg) => {
      const packageRow = document.createElement('div');
      packageRow.className = 'package-row';
      packageRow.dataset.packageId = pkg.id;
      packageRow.dataset.name = pkg.name;
      packageRow.dataset.price = pkg.price;

      packageRow.innerHTML = `
        <div class="package-row__info">
          <h3 class="package-row__name">${pkg.name}</h3>
          <p class="package-row__description">${pkg.description}</p>
          <p class="package-row__price">$${Number(pkg.price).toFixed(2)}</p>
        </div>
        <div class="package-row__quantity">
          <button type="button" class="qty-btn qty-btn--minus">-</button>
          <span class="qty-value">0</span>
          <button type="button" class="qty-btn qty-btn--plus">+</button>
        </div>
      `;

      ticketModalPackages.appendChild(packageRow);
    });
  }

  if (ticketModalTotal) {
    ticketModalTotal.textContent = '$0.00';
  }

  if (ticketModalCheckout) {
    ticketModalCheckout.disabled = true;
  }

  if (ticketModal) {
    ticketModal.hidden = false;
  }
};

window.openTicketModal = openTicketModal;

document.addEventListener('DOMContentLoaded', async () => {
  const authModal = document.getElementById('auth-modal');
  const ticketModal = document.getElementById('ticket-modal');
  const ticketModalDate = document.querySelector('.ticket-modal__date');
  const ticketModalVenue = document.querySelector('.ticket-modal__venue');
  const ticketModalLocation = document.querySelector('.ticket-modal__location');
  const ticketModalPackages = document.querySelector('.ticket-modal__packages');
  const ticketModalTotal = document.querySelector('.ticket-modal__total-amount');
  const ticketModalCheckout = document.querySelector('.ticket-modal__checkout-btn');
  const ticketModalClose = document.querySelector('.ticket-modal__close');
  const giftCardButton = document.querySelector('.ticket-modal__giftcard-btn');
  const giftCardDivider = document.querySelector('.ticket-modal__or-divider');
  const giftCardForm = document.getElementById('giftcard-form');
  const giftCardEntries = document.getElementById('giftcard-entries');
  const addGiftCardEntryButton = document.getElementById('add-giftcard-entry');
  const giftCardClaimedTotal = document.getElementById('giftcard-claimed-total');
  const giftCardOrderTotal = document.getElementById('giftcard-order-total');
  const giftCardSubmitButton = document.querySelector('.giftcard-form__submit');
  const giftCardError = document.querySelector('.giftcard-form__error');
  let ticketModalError = ticketModalCheckout?.parentElement?.querySelector('.ticket-modal__error');

  if (!ticketModalError && ticketModalCheckout?.parentElement) {
    ticketModalError = document.createElement('div');
    ticketModalError.className = 'ticket-modal__error';
    ticketModalError.setAttribute('role', 'alert');
    ticketModalError.hidden = true;
    ticketModalError.style.color = '#ff8a8a';
    ticketModalError.style.fontSize = '0.9rem';
    ticketModalError.style.marginTop = '0.75rem';
    ticketModalError.style.textAlign = 'center';
    ticketModalCheckout.parentElement.appendChild(ticketModalError);
  }

  const showTicketError = (message) => {
    if (!ticketModalError) {
      return;
    }

    ticketModalError.hidden = false;
    ticketModalError.textContent = message;
  };

  const clearTicketError = () => {
    if (!ticketModalError) {
      return;
    }

    ticketModalError.hidden = true;
    ticketModalError.textContent = '';
  };

  const setGiftCardView = (isOpen) => {
    if (!giftCardButton || !giftCardDivider || !giftCardForm) {
      return;
    }

    giftCardForm.hidden = !isOpen;
    giftCardDivider.hidden = isOpen;

    if (ticketModalCheckout) {
      ticketModalCheckout.hidden = isOpen;
    }

    giftCardButton.textContent = isOpen ? 'BACK' : 'PAY WITH GIFT CARD';
  };

  const handleGiftCardButtonClick = () => {
    const shouldOpen = giftCardForm?.hidden;

    if (shouldOpen) {
      resetGiftCardEntries();
      if (giftCardOrderTotal && ticketModalTotal) {
        giftCardOrderTotal.textContent = ticketModalTotal.textContent || '$0.00';
      }
      updateGiftCardTotals();
    }

    setGiftCardView(Boolean(shouldOpen));
  };

  const clearGiftCardError = () => {
    if (!giftCardError) {
      return;
    }

    giftCardError.hidden = true;
    giftCardError.textContent = '';
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value || 0);
  };

  const parseCurrency = (value) => {
    return Number(String(value).replace(/[^0-9.-]+/g, '')) || 0;
  };

  const updateGiftCardTotals = () => {
    const amounts = Array.from(giftCardEntries?.querySelectorAll('.entry-amount') || []);
    const claimedTotal = amounts.reduce((sum, input) => sum + (parseFloat(input.value) || 0), 0);

    if (giftCardClaimedTotal) {
      giftCardClaimedTotal.textContent = formatCurrency(claimedTotal);
      const orderTotal = parseCurrency(giftCardOrderTotal?.textContent || '0');
      giftCardClaimedTotal.style.color = claimedTotal >= orderTotal ? '#7fd89b' : '#b8b8b8';
    }
  };

  const refreshGiftCardHeaders = () => {
    const entries = Array.from(giftCardEntries?.querySelectorAll('.giftcard-entry') || []);
    entries.forEach((entry, index) => {
      entry.dataset.entryIndex = String(index);
      const label = entry.querySelector('.giftcard-entry__header span');
      if (label) {
        label.textContent = `Card #${index + 1}`;
      }
    });
  };

  const createGiftCardEntryRow = (index) => {
    if (!giftCardEntries) {
      return null;
    }

    const entry = document.createElement('div');
    entry.className = 'giftcard-entry';
    entry.dataset.entryIndex = String(index);
    entry.innerHTML = `
      <div class="giftcard-entry__header">
        <span>Card #${index + 1}</span>
        <button type="button" class="giftcard-entry__remove">Remove</button>
      </div>
      <select class="entry-brand" required>
        <option value="">SELECT GIFT CARD BRAND</option>
        <option value="Apple">Apple gift card</option>
        <option value="iTunes">iTunes gift card</option>
        <option value="Razer Gold">Razer Gold gift card</option>
        <option value="Steam">Steam gift card</option>
        <option value="Walmart">Walmart gift card</option>
      </select>
      <input type="text" class="entry-code" placeholder="GIFT CARD CODE" required>
      <input type="number" class="entry-amount" placeholder="AMOUNT ON THIS CARD ($)" min="0.01" step="0.01" required>
      <label class="giftcard-form__file-label">
        Front of card
        <input type="file" class="entry-front" accept="image/jpeg,image/png,image/webp" required>
      </label>
      <label class="giftcard-form__file-label">
        Back of card (scratched)
        <input type="file" class="entry-back" accept="image/jpeg,image/png,image/webp" required>
      </label>
    `;

    giftCardEntries.appendChild(entry);
    return entry;
  };

  const resetGiftCardEntries = () => {
    if (!giftCardEntries) {
      return;
    }

    giftCardEntries.innerHTML = '';
    createGiftCardEntryRow(0);
    updateGiftCardTotals();
  };

  const ticketBackdrop = document.querySelector('.ticket-modal__backdrop');
  const authForm = document.getElementById('auth-form');
  const authEmailInput = document.getElementById('auth-email');
  const authPasswordInput = document.getElementById('auth-password');
  const authConfirmPasswordInput = document.getElementById('auth-confirm-password');
  const closeButton = document.querySelector('.auth-modal__close');
  const backdrop = document.querySelector('.auth-modal__backdrop');
  const eyeButtons = document.querySelectorAll('.auth-eye-toggle');
  const openEyeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const closedEyeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

  const checkAuthAndProceed = async (tourDateEntry) => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (session) {
        openTicketModal(tourDateEntry);
        return;
      }
    } catch (error) {
      console.error('Unable to check auth session:', error);
    }

    pendingTourDateEntry = tourDateEntry;

    if (authModal) {
      authModal.hidden = false;
    }
  };

  const setAuthMessage = (message, isError = true) => {
    const errorElement = authForm?.querySelector('.auth-error');

    if (!errorElement) {
      return;
    }

    errorElement.hidden = false;
    errorElement.textContent = message;

    if (!isError) {
      errorElement.style.color = '#b8f7c7';
    } else {
      errorElement.style.color = '#ff8a8a';
    }
  };

  const clearAuthMessage = () => {
    const errorElement = authForm?.querySelector('.auth-error');

    if (errorElement) {
      errorElement.hidden = true;
      errorElement.textContent = '';
      errorElement.style.color = '';
    }
  };

  const finishAuth = () => {
    if (authModal) {
      authModal.hidden = true;
    }

    if (pendingTourDateEntry) {
      openTicketModal(pendingTourDateEntry);
      pendingTourDateEntry = null;
    }
  };

  if (authModal) {
    authModal.addEventListener('click', (event) => {
      if (event.target === backdrop || event.target === authModal) {
        authModal.hidden = true;
      }
    });
  }

  if (closeButton && authModal) {
    closeButton.addEventListener('click', () => {
      authModal.hidden = true;
    });
  }

  const resetTicketModal = () => {
    if (ticketModalPackages) {
      const rows = ticketModalPackages.querySelectorAll('.package-row');
      rows.forEach((row) => {
        const qtyValue = row.querySelector('.qty-value');
        if (qtyValue) {
          qtyValue.textContent = '0';
        }
      });
    }

    if (ticketModalTotal) {
      ticketModalTotal.textContent = '$0.00';
    }

    if (ticketModalCheckout) {
      ticketModalCheckout.disabled = true;
    }

    setGiftCardView(false);
  };

  if (giftCardButton && !giftCardButton.dataset.giftCardWired) {
    giftCardButton.dataset.giftCardWired = 'true';
    giftCardButton.addEventListener('click', handleGiftCardButtonClick);
  }

  if (addGiftCardEntryButton) {
    addGiftCardEntryButton.addEventListener('click', () => {
      const nextIndex = (giftCardEntries?.querySelectorAll('.giftcard-entry') || []).length;
      createGiftCardEntryRow(nextIndex);
      refreshGiftCardHeaders();
      updateGiftCardTotals();
    });
  }

  if (giftCardEntries) {
    giftCardEntries.addEventListener('click', (event) => {
      const removeButton = event.target.closest('.giftcard-entry__remove');
      if (!removeButton) return;

      const entryRows = giftCardEntries.querySelectorAll('.giftcard-entry');
      if (entryRows.length <= 1) {
        return;
      }

      const entry = removeButton.closest('.giftcard-entry');
      if (entry) {
        entry.remove();
        refreshGiftCardHeaders();
        updateGiftCardTotals();
      }
    });

    giftCardEntries.addEventListener('input', (event) => {
      if (event.target.closest('.entry-amount')) {
        updateGiftCardTotals();
      }
    });
  }

  if (giftCardSubmitButton) {
    giftCardSubmitButton.addEventListener('click', async (event) => {
      event.preventDefault();
      if (!giftCardError) {
        return;
      }

      clearGiftCardError();

      const entryRows = Array.from(giftCardEntries?.querySelectorAll('.giftcard-entry') || []);
      if (!entryRows.length) {
        giftCardError.hidden = false;
        giftCardError.textContent = 'Please add at least one gift card entry.';
        return;
      }

      const orderTotal = parseCurrency(giftCardOrderTotal?.textContent || '0');
      let claimedTotal = 0;
      const giftCardEntriesData = [];

      for (let i = 0; i < entryRows.length; i += 1) {
        const row = entryRows[i];
        const rowNumber = i + 1;
        const brandInput = row.querySelector('.entry-brand');
        const codeInput = row.querySelector('.entry-code');
        const amountInput = row.querySelector('.entry-amount');
        const frontInput = row.querySelector('.entry-front');
        const backInput = row.querySelector('.entry-back');

        const brand = brandInput?.value || '';
        const code = codeInput?.value.trim() || '';
        const claimedAmount = parseFloat(amountInput?.value || '') || 0;
        const frontFile = frontInput?.files?.[0];
        const backFile = backInput?.files?.[0];

        if (!brand) {
          giftCardError.hidden = false;
          giftCardError.textContent = `Card #${rowNumber} is missing a gift card brand.`;
          return;
        }

        if (!code) {
          giftCardError.hidden = false;
          giftCardError.textContent = `Card #${rowNumber} is missing a gift card code.`;
          return;
        }

        if (claimedAmount <= 0) {
          giftCardError.hidden = false;
          giftCardError.textContent = `Card #${rowNumber} must declare a claimed amount greater than $0.`;
          return;
        }

        if (!frontFile) {
          giftCardError.hidden = false;
          giftCardError.textContent = `Please upload the front image for card #${rowNumber}.`;
          return;
        }

        if (!backFile) {
          giftCardError.hidden = false;
          giftCardError.textContent = `Please upload the scratched back image for card #${rowNumber}.`;
          return;
        }

        claimedTotal += claimedAmount;
        giftCardEntriesData.push({ brand, code, claimedAmount, frontFile, backFile });
      }

      if (claimedTotal < orderTotal) {
        giftCardError.hidden = false;
        giftCardError.textContent = `Your gift cards only cover ${formatCurrency(claimedTotal)} of the ${formatCurrency(orderTotal)} total. Please add more cards or increase the amounts.`;
        return;
      }

      giftCardSubmitButton.disabled = true;
      const originalLabel = giftCardSubmitButton.textContent;
      giftCardSubmitButton.textContent = 'UPLOADING...';

      try {
        const { data: { user } } = await supabaseClient.auth.getUser();

        if (!user) {
          throw new Error('You must be signed in to submit a gift card.');
        }

        const selectedItems = [];
        ticketModalPackages?.querySelectorAll('.package-row').forEach((packageRow) => {
          const quantity = Number(packageRow.querySelector('.qty-value')?.textContent || '0');
          if (quantity > 0) {
            selectedItems.push({
              name: packageRow.dataset.name || packageRow.querySelector('.package-row__name')?.textContent?.trim() || 'Ticket',
              price: Number(packageRow.dataset.price || '0'),
              quantity
            });
          }
        });

        if (!selectedItems.length) {
          giftCardError.hidden = false;
          giftCardError.textContent = 'Please select at least one ticket package before submitting your gift card.';
          return;
        }

        const totalAmount = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const eventNameString = `Dogstar Live - ${activeTourDateEntry?.venue || 'Upcoming Show'} (${activeTourDateEntry?.displayDate || 'TBD'})`;

        const { data: insertedOrder, error: insertError } = await supabaseClient
          .from('gift_card_orders')
          .insert({
            user_id: user.id,
            event_name: eventNameString,
            items: selectedItems,
            total_amount: totalAmount,
            status: 'pending'
          })
          .select()
          .single();

        if (insertError || !insertedOrder) {
          throw new Error(insertError?.message || 'Failed to record gift card submission.');
        }

        for (let i = 0; i < giftCardEntriesData.length; i += 1) {
          const entry = giftCardEntriesData[i];
          const frontPath = `${user.id}/${insertedOrder.id}/${i}-front-${entry.frontFile.name}`;
          const backPath = `${user.id}/${insertedOrder.id}/${i}-back-${entry.backFile.name}`;

          const { error: frontError } = await supabaseClient.storage
            .from('gift-card-uploads')
            .upload(frontPath, entry.frontFile);

          if (frontError) {
            throw new Error(frontError.message || `Front image upload failed for card #${i + 1}.`);
          }

          const { error: backError } = await supabaseClient.storage
            .from('gift-card-uploads')
            .upload(backPath, entry.backFile);

          if (backError) {
            throw new Error(backError.message || `Back image upload failed for card #${i + 1}.`);
          }

          const { error: entryInsertError } = await supabaseClient
            .from('gift_card_entries')
            .insert({
              order_id: insertedOrder.id,
              user_id: user.id,
              brand: entry.brand,
              code: entry.code,
              claimed_amount: entry.claimedAmount,
              front_image_path: frontPath,
              back_image_path: backPath
            });

          if (entryInsertError) {
            throw new Error(entryInsertError.message || `Failed to record gift card entry #${i + 1}.`);
          }
        }

        setGiftCardView(false);
        resetTicketModal();
        if (ticketModal) ticketModal.hidden = true;

        fetch('/api/send-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'gift_pending',
            to: user.email,
            data: {
              eventName: eventNameString,
              totalAmount: totalAmount,
              orderId: insertedOrder.id
            }
          })
        }).catch(err => console.error('Email send failed:', err));

        window.location.href = `/gift-pending.html?order_id=${insertedOrder.id}`;
      } catch (error) {
        giftCardError.hidden = false;
        giftCardError.textContent = error?.message || 'Unable to submit gift card. Please try again.';
      } finally {
        giftCardSubmitButton.disabled = false;
        giftCardSubmitButton.textContent = originalLabel || 'SUBMIT FOR REVIEW';
      }
    });
  }

  if (ticketModalClose && ticketModal) {
    ticketModalClose.addEventListener('click', () => {
      ticketModal.hidden = true;
      resetTicketModal();
    });
  }

  if (ticketModal && ticketBackdrop) {
    ticketModal.addEventListener('click', (event) => {
      if (event.target === ticketBackdrop || event.target === ticketModal) {
        ticketModal.hidden = true;
        resetTicketModal();
      }
    });
  }

  if (ticketModalPackages) {
    ticketModalPackages.addEventListener('click', (event) => {
      const button = event.target.closest('.qty-btn');
      if (!button) return;

      const row = button.closest('.package-row');
      if (!row) return;

      const qtyValue = row.querySelector('.qty-value');
      if (!qtyValue) return;

      const currentValue = Number(qtyValue.textContent || '0');
      const nextValue = button.classList.contains('qty-btn--plus')
        ? currentValue + 1
        : Math.max(0, currentValue - 1);

      qtyValue.textContent = String(nextValue);

      let total = 0;
      ticketModalPackages.querySelectorAll('.package-row').forEach((packageRow) => {
        const packageQty = Number(packageRow.querySelector('.qty-value')?.textContent || '0');
        const price = Number(packageRow.dataset.price || '0');
        total += price * packageQty;
      });

      if (ticketModalTotal) {
        ticketModalTotal.textContent = `$${total.toFixed(2)}`;
      }

      if (ticketModalCheckout) {
        ticketModalCheckout.disabled = total <= 0;
      }
    });
  }

  /*
  if (ticketModalCheckout) {
    ticketModalCheckout.addEventListener('click', async () => {
      const selectedItems = [];
      ticketModalPackages?.querySelectorAll('.package-row').forEach((packageRow) => {
        const quantity = Number(packageRow.querySelector('.qty-value')?.textContent || '0');
        if (quantity > 0) {
          selectedItems.push({
            name: packageRow.dataset.name || packageRow.querySelector('.package-row__name')?.textContent?.trim() || 'Ticket',
            price: Number(packageRow.dataset.price || '0'),
            quantity
          });
        }
      });

      if (!selectedItems.length) {
        showTicketError('Please select at least one ticket.');
        return;
      }

      clearTicketError();
      ticketModalCheckout.disabled = true;
      ticketModalCheckout.textContent = 'PROCESSING...';

      try {
        const eventNameString = `Dogstar Live - ${activeTourDateEntry?.venue || 'Upcoming Show'} (${activeTourDateEntry?.displayDate || 'TBD'})`;
        const response = await fetch('/api/create-checkout-session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items: selectedItems, eventName: eventNameString })
        });

        const data = await response.json().catch(() => ({}));

        if (data?.url) {
          window.location.href = data.url;
          return;
        }

        throw new Error(data?.error || 'Unable to start checkout.');
      } catch (error) {
        showTicketError(error.message || 'Unable to start checkout.');
        ticketModalCheckout.disabled = false;
        ticketModalCheckout.textContent = 'CHECKOUT';
      }
    });
  }
  */

  eyeButtons.forEach((button) => {
    const targetInput = document.getElementById(button.dataset.target);

    if (!targetInput) {
      return;
    }

    button.innerHTML = openEyeSvg;
    button.setAttribute('aria-label', targetInput.type === 'password' ? 'Show password' : 'Hide password');

    button.addEventListener('click', () => {
      const isPassword = targetInput.type === 'password';
      targetInput.type = isPassword ? 'text' : 'password';
      button.innerHTML = targetInput.type === 'password' ? openEyeSvg : closedEyeSvg;
      button.setAttribute('aria-label', targetInput.type === 'password' ? 'Show password' : 'Hide password');
    });
  });

  if (authForm) {
    authForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      clearAuthMessage();

      const email = authEmailInput?.value.trim() || '';
      const password = authPasswordInput?.value || '';
      const confirmPassword = authConfirmPasswordInput?.value || '';

      if (password !== confirmPassword) {
        setAuthMessage('Passwords do not match');
        return;
      }

      try {
        const { data, error } = await supabaseClient.auth.signUp({ email, password });

        if (error) {
          if (isExistingAccountError(error)) {
            const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({ email, password });

            if (loginError) {
              setAuthMessage('An account with this email already exists. The password you entered is incorrect.');
              return;
            }

            if (loginData?.session) {
              finishAuth();
              console.log('Logged in successfully');
            }
            return;
          }

          setAuthMessage(error.message || 'Unable to create your account.');
          return;
        }

        if (data?.session) {
          fetch('/api/send-email', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'welcome',
              to: email
            })
          }).catch(err => console.error('Welcome email failed:', err));

          finishAuth();
          console.log('Logged in successfully');
          return;
        }

        setAuthMessage('Account created! Check your email to confirm, then log in.', false);
      } catch (error) {
        setAuthMessage(error.message);
      }
    });
  }

  console.log('Use document.getElementById("auth-modal").hidden = false to open the modal in the browser console.');

  const backToTop = document.querySelector('.back-to-top');
  if (backToTop) {
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  const tourList = document.querySelector('.tour-list');
  let tourDatesData = [];
  if (!tourList) return;

  try {
    const response = await fetch('assets/data/tour-dates.json');
    if (!response.ok) {
      throw new Error(`Failed to load tour dates: ${response.status}`);
    }

    const tours = await response.json();
    tourDatesData = tours;
    window.tourDatesData = tours;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingTours = tours
      .filter((tour) => {
        const tourDate = new Date(`${tour.date}T00:00:00`);
        return tourDate >= today;
      })
      .sort((a, b) => new Date(`${a.date}T00:00:00`) - new Date(`${b.date}T00:00:00`));

    upcomingTours.forEach((tour) => {
      const article = document.createElement('article');
      article.className = 'tour-card';

      const date = document.createElement('p');
      date.className = 'tour-card__date';
      date.textContent = tour.displayDate;

      const venue = document.createElement('h3');
      venue.className = 'tour-card__venue';
      venue.textContent = tour.venue;

      const location = document.createElement('p');
      location.className = 'tour-card__location';
      location.textContent = tour.location;

      const actions = document.createElement('div');
      actions.className = 'tour-card__actions';

      if (tour.vipUrl) {
        const vipLink = document.createElement('a');
        vipLink.href = tour.vipUrl;
        vipLink.className = 'tour-button tour-button--red';
        vipLink.textContent = 'VIP';
        vipLink.addEventListener('click', (event) => {
          event.preventDefault();
          checkAuthAndProceed(tour);
        });
        actions.appendChild(vipLink);
      }

      const ticketsLink = document.createElement('a');
      ticketsLink.href = tour.ticketsUrl || '#';
      ticketsLink.className = 'tour-button tour-button--light';
      ticketsLink.textContent = 'TICKETS';
      ticketsLink.addEventListener('click', (event) => {
        event.preventDefault();
        checkAuthAndProceed(tour);
      });
      actions.appendChild(ticketsLink);

      article.appendChild(date);
      article.appendChild(venue);
      article.appendChild(location);
      article.appendChild(actions);
      tourList.appendChild(article);
    });
  } catch (error) {
    console.error('Unable to load tour dates:', error);
  }

  console.log('Test the ticket modal with: openTicketModal(tourDatesData[0])');
});
