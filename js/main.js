const SUPABASE_URL = "https://kcbneewtmthghebkeghr.supabase.co";
const SUPABASE_KEY = "sb_publishable_8L_MKngPudQh6cdvf1BzTg_vOFt7XeK";
const supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
let pendingTicketUrl = null;

supabaseClient.auth.getSession().then((result) => {
  console.log('Supabase auth session check:', result);
}).catch((error) => {
  console.error('Supabase auth session check failed:', error);
});

document.addEventListener('DOMContentLoaded', async () => {
  const authModal = document.getElementById('auth-modal');
  const authForm = document.getElementById('auth-form');
  const authEmailInput = document.getElementById('auth-email');
  const authPasswordInput = document.getElementById('auth-password');
  const authConfirmPasswordInput = document.getElementById('auth-confirm-password');
  const closeButton = document.querySelector('.auth-modal__close');
  const backdrop = document.querySelector('.auth-modal__backdrop');
  const eyeButtons = document.querySelectorAll('.auth-eye-toggle');
  const openEyeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>';
  const closedEyeSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/><line x1="2" x2="22" y1="2" y2="22"/></svg>';

  const checkAuthAndProceed = async (destinationUrl) => {
    try {
      const { data: { session } } = await supabaseClient.auth.getSession();

      if (session) {
        window.open(destinationUrl, '_blank', 'noopener,noreferrer');
        return;
      }
    } catch (error) {
      console.error('Unable to check auth session:', error);
    }

    pendingTicketUrl = destinationUrl;

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

    if (pendingTicketUrl) {
      window.open(pendingTicketUrl, '_blank', 'noopener,noreferrer');
      pendingTicketUrl = null;
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
          const message = error.message || '';
          const existingAccountError = /already/i.test(message) && /(registered|exist)/i.test(message);

          if (existingAccountError) {
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

          setAuthMessage(error.message);
          return;
        }

        if (data?.session) {
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
  if (!tourList) return;

  try {
    const response = await fetch('assets/data/tour-dates.json');
    if (!response.ok) {
      throw new Error(`Failed to load tour dates: ${response.status}`);
    }

    const tours = await response.json();
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
          checkAuthAndProceed(tour.vipUrl);
        });
        actions.appendChild(vipLink);
      }

      const ticketsLink = document.createElement('a');
      ticketsLink.href = tour.ticketsUrl || '#';
      ticketsLink.className = 'tour-button tour-button--light';
      ticketsLink.textContent = 'TICKETS';
      ticketsLink.addEventListener('click', (event) => {
        event.preventDefault();
        checkAuthAndProceed(tour.ticketsUrl || '#');
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
});
