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
  const authTabs = document.querySelectorAll('.auth-tab');
  const loginForm = document.getElementById('login-form');
  const signupForm = document.getElementById('signup-form');
  const closeButton = document.querySelector('.auth-modal__close');
  const backdrop = document.querySelector('.auth-modal__backdrop');

  const setActiveAuthTab = (tabName) => {
    authTabs.forEach((tab) => {
      const isActive = tab.dataset.tab === tabName;
      tab.classList.toggle('auth-tab--active', isActive);
    });

    if (loginForm && signupForm) {
      loginForm.hidden = tabName !== 'login';
      signupForm.hidden = tabName !== 'signup';
    }
  };

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

  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      setActiveAuthTab(tab.dataset.tab);
    });
  });

  if (loginForm) {
    loginForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const errorElement = loginForm.querySelector('.auth-error');
      const emailInput = loginForm.querySelector('input[type="email"]');
      const passwordInput = loginForm.querySelector('input[type="password"]');

      if (errorElement) {
        errorElement.hidden = true;
        errorElement.textContent = '';
      }

      try {
        const { error } = await supabaseClient.auth.signInWithPassword({
          email: emailInput?.value.trim() || '',
          password: passwordInput?.value || ''
        });

        if (error) {
          if (errorElement) {
            errorElement.hidden = false;
            errorElement.textContent = error.message;
          }
          return;
        }

        if (authModal) {
          authModal.hidden = true;
        }

        if (pendingTicketUrl) {
          window.open(pendingTicketUrl, '_blank', 'noopener,noreferrer');
          pendingTicketUrl = null;
        }

        console.log('Logged in successfully');
      } catch (error) {
        if (errorElement) {
          errorElement.hidden = false;
          errorElement.textContent = error.message;
        }
      }
    });
  }

  if (signupForm) {
    signupForm.addEventListener('submit', async (event) => {
      event.preventDefault();

      const errorElement = signupForm.querySelector('.auth-error');
      const emailInput = signupForm.querySelector('input[type="email"]');
      const passwordInput = signupForm.querySelector('input[type="password"]');

      if (errorElement) {
        errorElement.hidden = true;
        errorElement.textContent = '';
      }

      try {
        const { data, error } = await supabaseClient.auth.signUp({
          email: emailInput?.value.trim() || '',
          password: passwordInput?.value || ''
        });

        if (error) {
          if (errorElement) {
            errorElement.hidden = false;
            errorElement.textContent = error.message;
          }
          return;
        }

        if (errorElement) {
          errorElement.hidden = false;
          errorElement.textContent = 'Account created! Check your email to confirm, then log in.';
        }
      } catch (error) {
        if (errorElement) {
          errorElement.hidden = false;
          errorElement.textContent = error.message;
        }
      }
    });
  }

  setActiveAuthTab('login');

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
