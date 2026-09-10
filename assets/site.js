// mobile hamburger menu
  const navHamburger = document.getElementById('navHamburger');
  const navLinks = document.getElementById('navLinks');
  function closeNavMenu() {
    navLinks.classList.remove('open');
    navHamburger.setAttribute('aria-expanded', 'false');
  }
  navHamburger.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    navHamburger.setAttribute('aria-expanded', String(isOpen));
  });
  navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', closeNavMenu));
  window.addEventListener('resize', () => { if (window.innerWidth > 1100) closeNavMenu(); });

  // Grouped nav. Pointer devices open on hover; touch and keyboard open on
  // click, so the top-level item is a real button rather than a dead link.
  (function () {
    const items = [...document.querySelectorAll('.nav-item.has-sub')];
    const hoverable = window.matchMedia('(hover: hover) and (min-width: 1101px)');
    const setOpen = (item, open) => {
      if (open) item.setAttribute('data-open', ''); else item.removeAttribute('data-open');
      item.querySelector('.nav-top').setAttribute('aria-expanded', open ? 'true' : 'false');
    };
    const closeAll = (except) => items.forEach(i => { if (i !== except) setOpen(i, false); });

    items.forEach(item => {
      const btn = item.querySelector('.nav-top');
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const open = item.hasAttribute('data-open');
        closeAll(item); setOpen(item, !open);
      });
      item.addEventListener('mouseenter', () => { if (hoverable.matches) { closeAll(item); setOpen(item, true); } });
      item.addEventListener('mouseleave', () => { if (hoverable.matches) setOpen(item, false); });
      // Choosing a destination should close the menu, on every size.
      item.querySelectorAll('.nav-sub a').forEach(a =>
        a.addEventListener('click', () => { setOpen(item, false); closeNavMenu(); }));
    });
    document.addEventListener('click', () => closeAll(null));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(null); });
  })();

  // logo returns home — smooth-scroll rather than reload when already on the homepage
  const brandLink = document.querySelector('.brand-link');
  brandLink.addEventListener('click', (e) => {
    const onHome = location.pathname === '/' || /\/index\.html$/.test(location.pathname);
    if (!onHome) return;
    e.preventDefault();
    closeNavMenu();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });

  // hero rotating background
  // Only present on the page that owns it now that the site is split.
  if (document.getElementById('heroBg')) {
    const heroSlides = document.querySelectorAll('#heroBg .slide');
    const heroDotsWrap = document.getElementById('heroDots');
    let heroIdx = 0;
    heroSlides.forEach((s, i) => {
      const d = document.createElement('button');
      d.type = 'button';
      d.setAttribute('aria-label', 'Show hero image ' + (i + 1));
      if (i === 0) d.classList.add('active');
      d.addEventListener('click', () => { heroGoTo(i); restartHero(); });
      heroDotsWrap.appendChild(d);
    });
    function heroGoTo(i) {
      heroSlides[heroIdx].classList.remove('active');
      heroDotsWrap.children[heroIdx].classList.remove('active');
      heroIdx = i;
      heroSlides[heroIdx].classList.add('active');
      heroDotsWrap.children[heroIdx].classList.add('active');
    }
    let heroTimer = setInterval(() => heroGoTo((heroIdx + 1) % heroSlides.length), 5000);
    function restartHero() {
      clearInterval(heroTimer);
      heroTimer = setInterval(() => heroGoTo((heroIdx + 1) % heroSlides.length), 5000);
    }

  }

  // scroll fade-in
  const els = document.querySelectorAll('.fade-up');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in-view'); io.unobserve(e.target); } });
  }, { threshold: 0.15 });
  els.forEach(el => io.observe(el));

  // before/after sliders
  document.querySelectorAll('[data-ba]').forEach(slider => {
    const before = slider.querySelector('.ba-before');
    const handle = slider.querySelector('.ba-handle');
    let dragging = false;
    function setPos(clientX) {
      const rect = slider.getBoundingClientRect();
      let pct = ((clientX - rect.left) / rect.width) * 100;
      pct = Math.max(0, Math.min(100, pct));
      before.style.width = pct + '%';
      handle.style.left = pct + '%';
    }
    slider.addEventListener('mousedown', e => { dragging = true; setPos(e.clientX); });
    window.addEventListener('mousemove', e => { if (dragging) setPos(e.clientX); });
    window.addEventListener('mouseup', () => dragging = false);
    slider.addEventListener('touchstart', e => { dragging = true; setPos(e.touches[0].clientX); }, { passive: true });
    // non-passive: without preventDefault the browser scrolls the page while dragging
    slider.addEventListener('touchmove', e => {
      if (!dragging) return;
      e.preventDefault();
      setPos(e.touches[0].clientX);
    }, { passive: false });
    slider.addEventListener('touchend', () => dragging = false);
  });

  // testimonial carousel
  // Only present on the page that owns it now that the site is split.
  if (document.getElementById('carSlides')) {
    const track = document.getElementById('carSlides');
    const slides = track.children;
    const dotsWrap = document.getElementById('carDots');
    let idx = 0;
    for (let i = 0; i < slides.length; i++) {
      const b = document.createElement('button');
      if (i === 0) b.classList.add('active');
      b.addEventListener('click', () => { goTo(i); restartCarousel(); });
      dotsWrap.appendChild(b);
    }
    function goTo(i) {
      idx = i;
      track.style.transform = `translateX(-${i * 100}%)`;
      [...dotsWrap.children].forEach((d, di) => d.classList.toggle('active', di === i));
    }
    let carTimer = setInterval(() => goTo((idx + 1) % slides.length), 6000);
    function restartCarousel() {
      clearInterval(carTimer);
      carTimer = setInterval(() => goTo((idx + 1) % slides.length), 6000);
    }

  }

  // smile quiz
  // Only present on the page that owns it now that the site is split.
  if (document.getElementById('quizProgress')) {
    const quizSteps = document.querySelectorAll('.quiz-step');
    const quizProgress = document.getElementById('quizProgress');
    const totalQ = 3;
    let qStep = 0;
    const answers = [];
    for (let i = 0; i < totalQ; i++) {
      const bar = document.createElement('span');
      bar.innerHTML = '<i></i>';
      quizProgress.appendChild(bar);
    }
    function updateProgress() {
      [...quizProgress.children].forEach((b, i) => {
        b.classList.toggle('done', i < qStep);
        b.classList.toggle('active', i === qStep);
      });
    }
    function showStep(i) {
      quizSteps.forEach(s => s.classList.toggle('active', +s.dataset.step === i));
      updateProgress();
    }

    // educational content combining AGE + CONCERN together, not two disconnected facts
    const ageGroupOf = {
      'Myself': 'adult',
      'My child (under 12)': 'child',
      'My teen (13\u201318)': 'teen'
    };
    // matrix: [concern][ageGroup] -> what to actually expect for THAT combination
    const matrix = {
      'Crowded or crooked teeth': {
        child: 'For a child under 12, we\u2019ll first check whether early (Phase 1) treatment is needed to guide incoming permanent teeth \u2014 full braces or aligners, if needed, usually come later once more adult teeth are in.',
        teen: 'For teens, crowding is typically corrected with traditional braces or clear aligners \u2014 most teen cases run 12\u201324 months depending on severity.',
        adult: 'As an adult, clear aligners are a popular way to fix crowding discreetly, often over 12\u201318 months for mild-to-moderate cases.'
      },
      'Gaps between teeth': {
        child: 'For a child, we\u2019ll check whether a gap is likely to close on its own as more teeth come in, or whether early guidance would help.',
        teen: 'Gaps in teens are usually closed with braces or aligners, sometimes alongside a bite check to rule out other causes.',
        adult: 'As an adult, gap-closing cases with aligners or braces are often on the shorter end of treatment timelines.'
      },
      "Bite doesn't line up": {
        child: 'Bite issues in children are exactly why the American Association of Orthodontists recommends a first evaluation by age 7 \u2014 early (Phase 1) treatment can guide jaw growth before all permanent teeth arrive.',
        teen: 'Bite issues (over/underbite) in teens may need a more detailed exam \u2014 sometimes with appliances beyond braces alone.',
        adult: 'Bite issues in adults usually call for a detailed exam first, since correction may involve more than braces or aligners alone.'
      },
      'Not sure \u2014 just want an opinion': {
        child: 'For a child, a free exam with X-rays will show whether now is the right time to start, or whether it\u2019s best to keep monitoring.',
        teen: 'A full exam with X-rays at your free consultation will identify what treatment, if any, actually fits your teen\u2019s case.',
        adult: 'A full exam with X-rays at your free consultation will identify what treatment, if any, actually fits your case.'
      }
    };
    const timelineInfo = {
      'As soon as possible': "Since you're ready now, ask about the soonest available slot when you call.",
      'Within the next 6 months': 'That gives time to plan around insurance benefits or any pre-treatment steps.',
      'Just exploring options for now': 'No pressure \u2014 a free consultation is a no-commitment way to get real numbers and a timeline.'
    };

    // The quiz no longer asks for contact details \u2014 Weave's form in #book is the one
    // place a lead is captured, so asking here too would mean typing it twice.
    function renderResults() {
      const who = answers[0] || 'Myself';
      const concern = answers[1] || 'Not sure \u2014 just want an opinion';
      const timeline = answers[2] || 'Just exploring options for now';
      const ageGroup = ageGroupOf[who] || 'adult';
      document.getElementById('quizResultTitle').textContent = "Here's what to know before your visit.";
      document.getElementById('quizResultBody').textContent =
        (matrix[concern] || matrix['Not sure \u2014 just want an opinion'])[ageGroup];
      const list = document.getElementById('quizResultList');
      list.innerHTML = '';
      [
        'Your free exam includes X-rays and a full walkthrough of options with Dr. LeBourdais or Dr. Collison \u2014 no pressure, no obligation.',
        timelineInfo[timeline]
      ].forEach(text => {
        const li = document.createElement('li');
        li.className = 'quiz-result-item';
        li.innerHTML = '<b>\u2192</b><span>' + text + '</span>';
        list.appendChild(li);
      });
    }

    quizSteps.forEach((step, si) => {
      if (si >= totalQ) return;
      const opts = step.querySelectorAll('.quiz-opt');
      const backBtn = step.querySelector('.quiz-back');
      opts.forEach(opt => {
        opt.addEventListener('click', () => {
          opts.forEach(o => o.classList.remove('selected'));
          opt.classList.add('selected');
          answers[si] = opt.textContent;
          setTimeout(() => {
            qStep = si + 1;
            if (qStep === totalQ) renderResults();
            showStep(qStep);
          }, 350);
        });
      });
      if (backBtn) backBtn.addEventListener('click', () => {
        qStep = si - 1;
        showStep(qStep);
      });
    });
    showStep(0);

  }

  // Team profiles. A card only becomes interactive once it has a .team-bio, so the
  // Only present on the page that owns it now that the site is split.
  if (document.getElementById('teamModal')) {
    // section looks exactly as it does now until someone's details actually arrive.
    const teamModal = document.getElementById('teamModal');
    const tmAvatar = document.getElementById('tmAvatar');
    const tmName = document.getElementById('tmName');
    const tmRole = document.getElementById('tmRole');
    const tmBio = document.getElementById('tmBio');
    let tmLastFocus = null;

    function closeTeamModal() {
      teamModal.hidden = true;
      document.body.style.overflow = '';
      if (tmLastFocus) tmLastFocus.focus();
    }
    function openTeamModal(card) {
      const photo = card.querySelector('.team-photo');
      const initials = card.querySelector('.team-initials');
      tmAvatar.innerHTML = '';
      if (photo) {
        const img = document.createElement('img');
        img.src = photo.getAttribute('src');
        img.alt = '';
        tmAvatar.appendChild(img);
      } else if (initials) {
        tmAvatar.textContent = initials.textContent;
      }
      tmName.textContent = card.dataset.name || '';
      tmRole.textContent = card.dataset.role || '';
      tmBio.textContent = card.querySelector('.team-bio').textContent.trim();
      tmLastFocus = card;
      teamModal.hidden = false;
      document.body.style.overflow = 'hidden';
      teamModal.querySelector('.tm-close').focus();
    }

    document.querySelectorAll('.team-card').forEach(card => {
      const bio = card.querySelector('.team-bio');
      if (!bio || !bio.textContent.trim()) return;   // no bio yet — leave the card inert
      card.classList.add('has-bio');
      card.tabIndex = 0;
      card.setAttribute('role', 'button');
      card.setAttribute('aria-haspopup', 'dialog');
      const more = document.createElement('div');
      more.className = 'tm-more';
      more.textContent = 'Read more \u2192';
      card.appendChild(more);
      card.addEventListener('click', () => openTeamModal(card));
      card.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openTeamModal(card); }
      });
    });

    teamModal.querySelectorAll('[data-tm-close]').forEach(el => el.addEventListener('click', closeTeamModal));
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && !teamModal.hidden) closeTeamModal();
    });
  }

