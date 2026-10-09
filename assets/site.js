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
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
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
    let pct = 50;
    // The handle was a bare <div>: draggable with a mouse or finger and operable
    // by nothing else, which is a WCAG 2.1.1 (Keyboard, Level A) failure. Giving
    // it slider semantics and arrow keys costs nothing visually.
    handle.setAttribute('role', 'slider');
    handle.setAttribute('tabindex', '0');
    handle.setAttribute('aria-label', 'Reveal more of the before or after photo');
    handle.setAttribute('aria-valuemin', '0');
    handle.setAttribute('aria-valuemax', '100');
    handle.setAttribute('aria-orientation', 'horizontal');
    function setPct(next) {
      pct = Math.max(0, Math.min(100, next));
      before.style.width = pct + '%';
      handle.style.left = pct + '%';
      handle.setAttribute('aria-valuenow', Math.round(pct));
      handle.setAttribute('aria-valuetext', Math.round(pct) + '% before, ' + Math.round(100 - pct) + '% after');
    }
    function setPos(clientX) {
      const rect = slider.getBoundingClientRect();
      setPct(((clientX - rect.left) / rect.width) * 100);
    }
    setPct(pct);
    handle.addEventListener('keydown', e => {
      const step = { ArrowLeft: -5, ArrowRight: 5, ArrowDown: -5, ArrowUp: 5,
                     PageDown: -20, PageUp: 20, Home: -100, End: 100 }[e.key];
      if (step === undefined) return;
      e.preventDefault();
      setPct(e.key === 'Home' ? 0 : e.key === 'End' ? 100 : pct + step);
    });
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
      // Without a label these announce as bare unlabelled buttons (WCAG 4.1.2).
      b.type = 'button';
      b.setAttribute('aria-label', `Show review ${i + 1} of ${slides.length}`);
      if (i === 0) { b.classList.add('active'); b.setAttribute('aria-current', 'true'); }
      b.addEventListener('click', () => { goTo(i); restartCarousel(); });
      dotsWrap.appendChild(b);
    }
    function goTo(i) {
      idx = i;
      track.style.transform = `translateX(-${i * 100}%)`;
      [...dotsWrap.children].forEach((d, di) => {
        d.classList.toggle('active', di === i);
        if (di === i) d.setAttribute('aria-current', 'true'); else d.removeAttribute('aria-current');
      });
    }
    // WCAG 2.2.2 (Pause, Stop, Hide) is Level A: content that moves on its own for
    // more than five seconds must be pausable. It also just reads badly -- the
    // quote was being pulled away mid-sentence on the one page people come to in
    // order to read. So: never auto-advance for someone who asked for reduced
    // motion, and pause while a pointer is over it or focus is inside it.
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const carousel = track.closest('.carousel') || track.parentElement;
    let carTimer = null;
    // Hover and keyboard focus are separate reasons to hold, and collapsing them
    // into one flag broke it: focusin fires BEFORE click, so clicking a dot set
    // the flag, and the restart in the click handler was then refused by that
    // same flag. The carousel stopped for good. Keyboard focus is also checked
    // with :focus-visible, so a mouse click does not count as "tabbed into it".
    let hovering = false, keyboardIn = false;
    const canRun = () => !hovering && !keyboardIn && !document.hidden && !reduceMotion.matches;
    function startCarousel() {
      if (carTimer || !canRun()) return;
      carTimer = setInterval(() => goTo((idx + 1) % slides.length), 4500);
    }
    function stopCarousel() {
      clearInterval(carTimer);
      carTimer = null;
    }
    function restartCarousel() {
      stopCarousel();
      startCarousel();
    }
    carousel.addEventListener('mouseenter', () => { hovering = true; stopCarousel(); });
    carousel.addEventListener('mouseleave', () => { hovering = false; startCarousel(); });
    carousel.addEventListener('focusin', e => {
      if (e.target.matches(':focus-visible')) { keyboardIn = true; stopCarousel(); }
    });
    carousel.addEventListener('focusout', e => {
      if (!carousel.contains(e.relatedTarget)) { keyboardIn = false; startCarousel(); }
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopCarousel(); else startCarousel();
    });
    reduceMotion.addEventListener('change', () => {
      if (reduceMotion.matches) stopCarousel(); else startCarousel();
    });
    startCarousel();

  }

  // Dr. Collison's portrait slot: crossfades her professional shot with the
  // family photo, matching the slider the practice's current site uses. Same
  // rules as the testimonial carousel, for the same reason (WCAG 2.2.2): dots
  // to control it, pause on hover and focus, and no rotation at all for someone
  // who asked their OS for reduced motion.
  if (document.getElementById('collisonPhotos')) {
    const slot = document.getElementById('collisonPhotos');
    const shots = [...slot.querySelectorAll('.doc-shot')];
    const dotWrap = slot.querySelector('.doc-rotator-dots');
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    // Separate flags, for the reason spelled out on the carousel above.
    let i = 0, timer = null, hovering = false, keyboardIn = false;

    dotWrap.removeAttribute('aria-hidden');
    const dots = shots.map((img, n) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.setAttribute('aria-label', n === 0 ? 'Show Dr. Collison' : 'Show Dr. Collison with her family');
      b.setAttribute('aria-pressed', n === 0 ? 'true' : 'false');
      b.addEventListener('click', () => { show(n); restart(); });
      dotWrap.appendChild(b);
      return b;
    });

    function show(n) {
      i = n;
      shots.forEach((s, k) => s.classList.toggle('is-on', k === n));
      dots.forEach((d, k) => d.setAttribute('aria-pressed', k === n ? 'true' : 'false'));
    }
    function start() {
      if (timer || hovering || keyboardIn || document.hidden || reduce.matches) return;
      timer = setInterval(() => show((i + 1) % shots.length), 4000);
    }
    function stop() { clearInterval(timer); timer = null; }
    function restart() { stop(); start(); }

    slot.addEventListener('mouseenter', () => { hovering = true; stop(); });
    slot.addEventListener('mouseleave', () => { hovering = false; start(); });
    slot.addEventListener('focusin', e => {
      if (e.target.matches(':focus-visible')) { keyboardIn = true; stop(); }
    });
    slot.addEventListener('focusout', e => {
      if (!slot.contains(e.relatedTarget)) { keyboardIn = false; start(); }
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); else start(); });
    reduce.addEventListener('change', () => { if (reduce.matches) stop(); else start(); });
    start();
  }

  // FAQ tabs. The markup ships every panel visible so the page works without
  // JavaScript and prints in full; this upgrades it into a real tablist.
  if (document.getElementById('faqTabs')) {
    const tablist = document.getElementById('faqTabs');
    const tabs = [...tablist.querySelectorAll('.faq-tab')];
    const panels = tabs.map(t => document.getElementById(t.dataset.panel));

    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Question categories');

    function select(i, focus) {
      tabs.forEach((t, n) => {
        const on = n === i;
        t.setAttribute('aria-selected', on ? 'true' : 'false');
        // Only the selected tab is in the tab order; arrows move between them.
        t.setAttribute('tabindex', on ? '0' : '-1');
        panels[n].hidden = !on;
      });
      if (focus) tabs[i].focus();
    }

    tabs.forEach((t, i) => {
      const panel = panels[i];
      t.id = t.id || `faqtab-${t.dataset.panel}`;
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', panel.id);
      panel.setAttribute('role', 'tabpanel');
      panel.setAttribute('aria-labelledby', t.id);
      panel.setAttribute('tabindex', '0');
      t.addEventListener('click', () => select(i));
      t.addEventListener('keydown', e => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (step === undefined && e.key !== 'Home' && e.key !== 'End') return;
        e.preventDefault();
        const next = e.key === 'Home' ? 0
          : e.key === 'End' ? tabs.length - 1
          : (i + step + tabs.length) % tabs.length;
        select(next, true);
      });
    });

    // Deep links. The nav drops down to #money, and unlike the other dropdowns
    // this one switches a tab in place instead of scrolling the page, so the
    // hash has to drive the tabs rather than the browser's anchor jump.
    function fromHash(focus) {
      const id = location.hash.slice(1);
      const i = tabs.findIndex(t => t.dataset.panel === id);
      if (i === -1) return false;
      select(i, focus);
      // Nothing to scroll to: the panel is already at the top of the card.
      document.querySelector('.faq-card').scrollIntoView({ block: 'start' });
      return true;
    }

    if (!fromHash(false)) select(0);
    window.addEventListener('hashchange', () => fromHash(false));
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

