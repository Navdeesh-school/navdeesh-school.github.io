/* ═══════════════════════════════════════════════════════════════
   NAVDEESH PORTFOLIO — Main Script
   Cinematic loading experience with audio-synced door animation
   Features: skip experience, mute/volume controls, auto volume fade,
             carousels with touch/swipe, smooth scroll index
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── State ── */
  var activeSection = "home";
  var mobileOpen = false;
  var isTransitioning = false;
  var audio = null;
  var isMuted = false;
  var userVolume = 1.0;
  var experienceStarted = false;
  var loadingTimeline = null;
  var autoFadeTimer = null;
  var volumeBeforeMute = 1.0;
  var FIRST_VISIT_KEY = "navdeesh_portfolio_visited";

  /* ── DOM References ── */
  var $ = function (id) { return document.getElementById(id); };

  var els = {
    grain:             $("grain"),
    enterScreen:       $("enterScreen"),
    loadingScreen:     $("loadingScreen"),
    progressBar:       $("progressBar"),
    progressGlow:      $("progressGlow"),
    progressText:      $("progressText"),
    doorOverlay:       $("doorOverlay"),
    doorLight:         $("doorLight"),
    doorLeft:          $("doorLeft"),
    doorRight:         $("doorRight"),
    doorShadowLeft:    $("doorShadowLeft"),
    doorShadowRight:   $("doorShadowRight"),
    mainUI:            $("mainUI"),
    sidebar:           $("sidebar"),
    contentArea:       $("contentArea"),
    sectionWrapper:    $("sectionWrapper"),
    mobileHeader:      $("mobileHeader"),
    mobileMenuBtn:     $("mobileMenuBtn"),
    menuIcon:          $("menuIcon"),
    closeIcon:         $("closeIcon"),
    mobileOverlay:     $("mobileOverlay"),
    skipBtn:           $("skipBtn"),
    audioControls:     $("audioControls"),
    muteBtn:           $("muteBtn"),
    volumeOnIcon:      $("volumeOnIcon"),
    volumeOffIcon:     $("volumeOffIcon"),
    volumeSlider:      $("volumeSlider"),
    closeAudioBtn:     $("closeAudioBtn"),
  };

  /* ═══════════════════════════════════════════════════
     GRAIN NOISE GENERATOR
     ═══════════════════════════════════════════════════ */

  function initGrain() {
    var canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    var ctx = canvas.getContext("2d");
    if (!ctx) return;
    var imageData = ctx.createImageData(256, 256);
    for (var i = 0; i < imageData.data.length; i += 4) {
      var v = Math.random() * 255;
      imageData.data[i]     = v;
      imageData.data[i + 1] = v;
      imageData.data[i + 2] = v;
      imageData.data[i + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);
    if (els.grain) {
      els.grain.style.backgroundImage = "url(" + canvas.toDataURL() + ")";
      els.grain.style.backgroundSize  = "256px 256px";
      els.grain.style.animation       = "grain-shift 0.5s steps(8) infinite";
    }
  }

  /* ═══════════════════════════════════════════════════
     VOLUME FADE (raw interval — no GSAP dependency)
     ═══════════════════════════════════════════════════ */

  function fadeAudioVolume(targetVol, durationMs) {
    if (!audio) return;
    var startVol  = audio.volume;
    var diff      = targetVol - startVol;
    var startTime = Date.now();
    var interval  = 50;

    var fadeInterval = setInterval(function () {
      var elapsed  = Date.now() - startTime;
      var progress = Math.min(elapsed / durationMs, 1);
      var eased    = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      var newVol = startVol + diff * eased;
      audio.volume = newVol;
      userVolume   = newVol;

      if (els.volumeSlider) els.volumeSlider.value = Math.round(newVol * 100);

      if (progress >= 1) {
        clearInterval(fadeInterval);
        audio.volume = targetVol;
        userVolume   = targetVol;
        if (els.volumeSlider) els.volumeSlider.value = Math.round(targetVol * 100);
      }
    }, interval);
  }

  /* ═══════════════════════════════════════════════════
     AUDIO SYSTEM
     ═══════════════════════════════════════════════════ */

  function initAudio() {
    audio = new Audio("audio.mp3");
    audio.preload = "auto";
    audio.volume  = 1.0;
    userVolume    = 1.0;
    if (els.volumeSlider) els.volumeSlider.value = 10;

    var playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(function () {});
    }

    autoFadeTimer = setTimeout(function () {
      if (!audio) return;
      userVolume = 0.007;
      if (!isMuted) {
        fadeAudioVolume(0.007, 2000);
      } else {
        if (els.volumeSlider) els.volumeSlider.value = 1;
      }
    }, 20000);

    audio.addEventListener("ended", function () {
      hideAudioControls();
    });
  }

  /* ═══════════════════════════════════════════════════
     MUTE / VOLUME CONTROLS
     ═══════════════════════════════════════════════════ */

  function toggleMute() {
    if (!audio) return;
    isMuted = !isMuted;

    if (isMuted) {
      volumeBeforeMute = userVolume;
      audio.volume = 0;
      if (els.volumeOnIcon)  els.volumeOnIcon.style.display  = "none";
      if (els.volumeOffIcon) els.volumeOffIcon.style.display = "block";
      if (els.volumeSlider)  els.volumeSlider.value = 0;
    } else {
      audio.volume = volumeBeforeMute;
      if (els.volumeOnIcon)  els.volumeOnIcon.style.display  = "block";
      if (els.volumeOffIcon) els.volumeOffIcon.style.display = "none";
      if (els.volumeSlider)  els.volumeSlider.value = Math.round(volumeBeforeMute * 100);
    }
  }

  function onVolumeChange(e) {
    if (!audio) return;
    var val = parseInt(e.target.value, 10) / 100;
    userVolume = val;

    if (val === 0) {
      isMuted = true;
      volumeBeforeMute = 0.01;
      audio.volume = 0;
      if (els.volumeOnIcon)  els.volumeOnIcon.style.display  = "none";
      if (els.volumeOffIcon) els.volumeOffIcon.style.display = "block";
    } else {
      isMuted = false;
      audio.volume = val;
      if (els.volumeOnIcon)  els.volumeOnIcon.style.display  = "block";
      if (els.volumeOffIcon) els.volumeOffIcon.style.display = "none";
    }
  }

  function initAudioControls() {
    if (els.muteBtn) {
      els.muteBtn.addEventListener("click", toggleMute);
    }
    if (els.volumeSlider) {
      els.volumeSlider.addEventListener("input", onVolumeChange);
    }
    if (els.closeAudioBtn) {
      els.closeAudioBtn.addEventListener("click", stopAudio);
    }
  }

  function stopAudio() {
    if (!audio) return;
    if (autoFadeTimer) {
      clearTimeout(autoFadeTimer);
      autoFadeTimer = null;
    }
    fadeAudioVolume(0, 500);
    setTimeout(function () {
      hideAudioControls();
      audio.pause();
      audio.currentTime = 0;
      audio = null;
    }, 550);
  }

  function showAudioControls() {
    if (!els.audioControls) return;
    els.audioControls.classList.add("audio-controls-visible");
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        els.audioControls.classList.add("audio-controls-fade-in");
      });
    });
  }

  function hideAudioControls() {
    if (!els.audioControls) return;
    els.audioControls.classList.remove("audio-controls-fade-in");
    setTimeout(function () {
      els.audioControls.classList.remove("audio-controls-visible");
    }, 400);
  }

  /* ═══════════════════════════════════════════════════
     LOADING BAR + DOOR ANIMATION (GSAP Timeline)
     ═══════════════════════════════════════════════════ */

  function runLoadingSequence() {
    initAudio();

    var progressProxy = { val: 0 };

    loadingTimeline = gsap.timeline({
      onComplete: function () {
        loadingTimeline.kill();
        loadingTimeline = null;
        onSequenceComplete();
      },
    });

    loadingTimeline.to(els.progressBar, {
      width: "92%",
      duration: 14.7,
      ease: "power2.inOut",
    }, 0);

    loadingTimeline.to(progressProxy, {
      val: 92,
      duration: 14.7,
      ease: "power2.inOut",
      onUpdate: function () {
        var v = Math.round(progressProxy.val);
        if (els.progressText)  els.progressText.textContent  = v + "%";
        if (els.progressGlow) els.progressGlow.style.left   = v + "%";
      },
    }, 0);

    loadingTimeline.to(els.doorLeft, { rotationY: -8, duration: 0.3, ease: "power2.out" }, 14.7);
    loadingTimeline.to(els.doorRight, { rotationY: 8, duration: 0.3, ease: "power2.out" }, 14.7);

    loadingTimeline.to(els.doorLight, { opacity: 0.3, duration: 0.2, ease: "power2.out" }, 14.8);

    loadingTimeline.to(els.doorLeft, { rotationY: -115, duration: 0.6, ease: "power4.out" }, 15.0);
    loadingTimeline.to(els.doorRight, { rotationY: 115, duration: 0.6, ease: "power4.out" }, 15.0);

    loadingTimeline.to(els.doorLight, { opacity: 1, duration: 0.6, ease: "power2.out" }, 15.0);

    loadingTimeline.to(els.doorShadowLeft, { opacity: 0.6, duration: 0.3, ease: "power2.out" }, 15.1);
    loadingTimeline.to(els.doorShadowRight, { opacity: 0.6, duration: 0.3, ease: "power2.out" }, 15.1);

    loadingTimeline.to(progressProxy, {
      val: 100,
      duration: 0.8,
      ease: "power2.inOut",
      onUpdate: function () {
        var v = Math.round(progressProxy.val);
        if (els.progressText)  els.progressText.textContent  = v + "%";
        if (els.progressGlow) els.progressGlow.style.left   = v + "%";
      },
    }, 15.2);

    loadingTimeline.to(els.progressBar, { width: "100%", duration: 0.8, ease: "power2.inOut" }, 15.2);

    loadingTimeline.to(els.progressText, { opacity: 0, duration: 0.3, ease: "power2.inOut" }, 15.4);
    loadingTimeline.to(els.progressGlow, { opacity: 0, duration: 0.3 }, 15.4);

    loadingTimeline.to(els.doorOverlay, { opacity: 0, duration: 0.5, ease: "power2.inOut" }, 15.6);

    loadingTimeline.to(els.loadingScreen, { opacity: 0, duration: 0.4, ease: "power2.inOut" }, 15.8);
  }

  /* ═══════════════════════════════════════════════════
     SKIP EXPERIENCE
     ═══════════════════════════════════════════════════ */

  function skipExperience() {
    if (loadingTimeline) {
      loadingTimeline.kill();
      loadingTimeline = null;
    }

    if (autoFadeTimer) {
      clearTimeout(autoFadeTimer);
      autoFadeTimer = null;
    }

    if (els.enterScreen)   els.enterScreen.style.display   = "none";
    if (els.loadingScreen) els.loadingScreen.style.display = "none";
    if (els.doorOverlay)   els.doorOverlay.style.display   = "none";
    if (els.skipBtn)       els.skipBtn.style.display       = "none";

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    /* Mark experience as completed so it doesn't replay */
    try { localStorage.setItem(FIRST_VISIT_KEY, "true"); } catch (e) {}

    autoFadeTimer = setTimeout(function () {
      if (!audio) return;
      userVolume = 0.007;
      if (!isMuted) {
        fadeAudioVolume(0.007, 2000);
      } else {
        if (els.volumeSlider) els.volumeSlider.value = 1;
      }
    }, 500);

    gsap.to(els.mainUI, {
      opacity: 1,
      duration: 0.6,
      ease: "power2.out",
      onComplete: function () {
        showAudioControls();
      },
    });

    animateSectionIn("home");
    experienceStarted = false;
  }

  function showSkipButton() {
    if (!els.skipBtn) return;
    els.skipBtn.style.display = "flex";
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        gsap.to(els.skipBtn, { opacity: 1, duration: 0.5, ease: "power2.out", delay: 0.5 });
      });
    });
  }

  function hideSkipButton() {
    if (!els.skipBtn) return;
    gsap.to(els.skipBtn, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.in",
      onComplete: function () {
        els.skipBtn.style.display = "none";
      },
    });
  }

  /* ═══════════════════════════════════════════════════
     SEQUENCE COMPLETE → SHOW MAIN UI
     ═══════════════════════════════════════════════════ */

  function onSequenceComplete() {
    if (els.enterScreen)   els.enterScreen.style.display   = "none";
    if (els.loadingScreen) els.loadingScreen.style.display = "none";
    if (els.doorOverlay)   els.doorOverlay.style.display   = "none";

    hideSkipButton();

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    /* Mark experience as completed so it doesn't replay */
    try { localStorage.setItem(FIRST_VISIT_KEY, "true"); } catch (e) {}

    gsap.to(els.mainUI, {
      opacity: 1,
      duration: 0.6,
      ease: "power2.out",
      onComplete: function () {
        showAudioControls();
      },
    });

    animateSectionIn("home");
    experienceStarted = false;
  }

  /* ═══════════════════════════════════════════════════
     SECTION NAVIGATION
     ═══════════════════════════════════════════════════ */

  function switchSection(sectionId) {
    if (sectionId === activeSection || isTransitioning) return;

    isTransitioning = true;

    if (els.contentArea) els.contentArea.scrollTop = 0;

    var currentEl = document.getElementById("section-" + activeSection);
    var nextEl    = document.getElementById("section-" + sectionId);

    gsap.to(currentEl, {
      opacity: 0,
      y: -16,
      duration: 0.25,
      ease: "power2.in",
      onComplete: function () {
        currentEl.style.display = "none";
        nextEl.style.display    = "block";

        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            gsap.set(nextEl, { opacity: 1, y: 0 });

            activeSection  = sectionId;
            isTransitioning = false;
            animateSectionIn(sectionId);
          });
        });
      },
    });

    updateSidebarActive(sectionId);
  }

  function animateSectionIn(sectionId) {
    var sectionEl = document.getElementById("section-" + sectionId);
    if (!sectionEl) return;

    var children = sectionEl.children;
    gsap.set(children, { opacity: 0, y: 20 });

    gsap.to(children, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: "power2.out",
    });

    var bars = sectionEl.querySelectorAll(".mark-card-bar-fill[data-width]");
    bars.forEach(function (bar) {
      var w = bar.getAttribute("data-width");
      setTimeout(function () {
        bar.style.width = w + "%";
      }, 400);
    });
  }

  /* ═══════════════════════════════════════════════════
     SIDEBAR
     ═══════════════════════════════════════════════════ */

  function updateSidebarActive(sectionId) {
    var items = document.querySelectorAll(".sidebar-item");
    items.forEach(function (item) {
      if (item.getAttribute("data-section") === sectionId) {
        item.classList.add("sidebar-item-active");
      } else {
        item.classList.remove("sidebar-item-active");
      }
    });
  }

  function initSidebar() {
    var items = document.querySelectorAll(".sidebar-item");
    items.forEach(function (item) {
      var lastNavAt = 0;

      function handleNav() {
        var sectionId = item.getAttribute("data-section");
        if (sectionId) {
          var wasOpen = mobileOpen;
          closeMobileMenu();
          setTimeout(function () {
            switchSection(sectionId);
          }, wasOpen ? 280 : 0);
        }
      }

      function handleNavInput(e) {
        var now = Date.now();
        if (now - lastNavAt < 320) return;
        lastNavAt = now;

        if (e && e.type === "touchend") {
          e.preventDefault();
        }

        handleNav();
      }

      /* Click for desktop */
      item.addEventListener("click", handleNavInput);

      /* Pointer + touch fallback for mobile devices */
      item.addEventListener("pointerup", function (e) {
        if (e.pointerType === "mouse") return;
        handleNavInput(e);
      });
      item.addEventListener("touchend", handleNavInput, { passive: false });

      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleNavInput(e);
        }
      });
      item.setAttribute("role", "button");
      item.setAttribute("tabindex", "0");
    });
  }

  /* ═══════════════════════════════════════════════════
     MOBILE MENU
     ═══════════════════════════════════════════════════ */

  function openMobileMenu() {
    mobileOpen = true;
    if (els.sidebar)       els.sidebar.classList.add("portfolio-sidebar-open");
    if (els.mobileOverlay) els.mobileOverlay.style.opacity = "1";
    if (els.mobileOverlay) els.mobileOverlay.style.pointerEvents = "auto";
    if (els.menuIcon)      els.menuIcon.style.display  = "none";
    if (els.closeIcon)     els.closeIcon.style.display = "block";
  }

  function closeMobileMenu() {
    mobileOpen = false;
    if (els.sidebar)       els.sidebar.classList.remove("portfolio-sidebar-open");
    if (els.mobileOverlay) els.mobileOverlay.style.opacity = "0";
    if (els.mobileOverlay) els.mobileOverlay.style.pointerEvents = "none";
    if (els.menuIcon)      els.menuIcon.style.display  = "block";
    if (els.closeIcon)     els.closeIcon.style.display = "none";
  }

  function toggleMobileMenu() {
    if (mobileOpen) closeMobileMenu();
    else openMobileMenu();
  }

  function initMobileMenu() {
    if (els.mobileMenuBtn) {
      els.mobileMenuBtn.addEventListener("click", toggleMobileMenu);
    }
    if (els.mobileOverlay) {
      els.mobileOverlay.addEventListener("click", closeMobileMenu);
    }
    if (els.mobileOverlay) {
      els.mobileOverlay.style.pointerEvents = "none";
    }
  }

  /* ═══════════════════════════════════════════════════
     CAROUSEL SYSTEM
     ═══════════════════════════════════════════════════ */

  function initCarousels() {
    var carousels = document.querySelectorAll(".carousel[data-carousel]");

    carousels.forEach(function (carousel) {
      var viewport = carousel.querySelector(".carousel-viewport");
      var track    = carousel.querySelector(".carousel-track");
      var slides   = carousel.querySelectorAll(".carousel-slide");
      var prevBtn  = carousel.querySelector(".carousel-arrow-left");
      var nextBtn  = carousel.querySelector(".carousel-arrow-right");
      var dotsBox  = carousel.querySelector(".carousel-dots");

      if (!track || !slides.length || !viewport) return;

      var currentIndex = 0;
      var totalSlides  = slides.length;
      var isAnimating  = false;

      /* ── Generate dots ── */
      if (dotsBox) {
        for (var i = 0; i < totalSlides; i++) {
          var dot = document.createElement("button");
          dot.className = "carousel-dot" + (i === 0 ? " carousel-dot-active" : "");
          dot.setAttribute("aria-label", "Go to slide " + (i + 1));
          dot.setAttribute("data-index", i);
          dotsBox.appendChild(dot);
        }
      }

      var dots = carousel.querySelectorAll(".carousel-dot");

      function goToSlide(index) {
        if (isAnimating) return;
        if (index < 0) index = totalSlides - 1;
        if (index >= totalSlides) index = 0;
        currentIndex = index;
        isAnimating = true;

        /* Calculate offset percentage based on viewport width */
        var viewportWidth = viewport.offsetWidth;
        var offset = -(currentIndex * viewportWidth);

        gsap.to(track, {
          x: offset + "px",
          duration: 0.4,
          ease: "power2.out",
          onComplete: function () {
            isAnimating = false;
          },
        });

        /* Update dots */
        dots.forEach(function (d, di) {
          if (di === currentIndex) {
            d.classList.add("carousel-dot-active");
          } else {
            d.classList.remove("carousel-dot-active");
          }
        });
      }

      /* ── Arrow buttons ── */
      if (prevBtn) {
        prevBtn.addEventListener("click", function () {
          goToSlide(currentIndex - 1);
        });
      }
      if (nextBtn) {
        nextBtn.addEventListener("click", function () {
          goToSlide(currentIndex + 1);
        });
      }

      /* ── Dot buttons ── */
      dots.forEach(function (dot) {
        dot.addEventListener("click", function () {
          var idx = parseInt(dot.getAttribute("data-index"), 10);
          goToSlide(idx);
        });
      });

      /* ── Touch / Swipe ── */
      var startX = 0;
      var startY = 0;
      var isDragging = false;
      var isHorizontal = null;

      carousel.addEventListener("touchstart", function (e) {
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        isDragging = true;
        isHorizontal = null;
      }, { passive: true });

      carousel.addEventListener("touchmove", function (e) {
        if (!isDragging || isHorizontal === false) return;
        var dx = e.touches[0].clientX - startX;
        var dy = e.touches[0].clientY - startY;

        /* Determine swipe direction on first significant move */
        if (isHorizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) {
          isHorizontal = Math.abs(dx) > Math.abs(dy);
        }
      }, { passive: true });

      carousel.addEventListener("touchend", function (e) {
        if (!isDragging || !isHorizontal) {
          isDragging = false;
          isHorizontal = null;
          return;
        }
        isDragging = false;
        isHorizontal = null;

        var endX = e.changedTouches[0].clientX;
        var diff = startX - endX;

        if (Math.abs(diff) > 40) {
          if (diff > 0) {
            goToSlide(currentIndex + 1);
          } else {
            goToSlide(currentIndex - 1);
          }
        }
      }, { passive: true });

      /* ── Handle resize: recalculate position ── */
      var resizeTimer = null;
      window.addEventListener("resize", function () {
        if (resizeTimer) clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function () {
          var viewportWidth = viewport.offsetWidth;
          var offset = -(currentIndex * viewportWidth);
          gsap.set(track, { x: offset + "px" });
        }, 150);
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     INDEX LINK SMOOTH SCROLL
     ═══════════════════════════════════════════════════ */

  function initIndexLinks() {
    var links = document.querySelectorAll(".index-link[data-scroll]");

    links.forEach(function (link) {
      link.addEventListener("click", function (e) {
        e.preventDefault();
        var targetId = link.getAttribute("data-scroll");
        var target = document.getElementById(targetId);
        if (!target || !els.contentArea) return;

        /* Calculate offset of target relative to the content area */
        var contentRect = els.contentArea.getBoundingClientRect();
        var targetRect  = target.getBoundingClientRect();
        var scrollTop   = els.contentArea.scrollTop + targetRect.top - contentRect.top - 24;

        els.contentArea.scrollTo({
          top: scrollTop,
          behavior: "smooth",
        });
      });
    });
  }

  /* ═══════════════════════════════════════════════════
     ENTER SCREEN
     ═══════════════════════════════════════════════════ */

  function initEnterScreen() {
    if (!els.enterScreen) return;

    function enter() {
      if (experienceStarted) return;
      experienceStarted = true;

      gsap.to(els.enterScreen, {
        opacity: 0,
        duration: 0.4,
        ease: "power2.in",
        onComplete: function () {
          els.enterScreen.style.display = "none";
          runLoadingSequence();
          showSkipButton();
        },
      });
    }

    els.enterScreen.addEventListener("click", enter);
    els.enterScreen.addEventListener("keydown", function (e) {
      if (e.key === "Enter") enter();
    });
  }

  /* ═══════════════════════════════════════════════════
     SKIP BUTTON
     ═══════════════════════════════════════════════════ */

  function initSkipButton() {
    if (!els.skipBtn) return;
    els.skipBtn.addEventListener("click", function (e) {
      e.stopPropagation();
      skipExperience();
    });
  }

  /* ═══════════════════════════════════════════════════
     IMAGE MODAL (Art Integration + Weekly Tests)
     ═══════════════════════════════════════════════════ */

  function initImageModal() {
    var modal      = document.getElementById("imageModal");
    var modalImg   = document.getElementById("modalImage");
    var modalCap   = document.getElementById("modalCaption");
    var closeBtn   = modal ? modal.querySelector(".image-modal-close") : null;
    var backdrop   = modal ? modal.querySelector(".image-modal-backdrop") : null;

    if (!modal || !modalImg) return;

    function openModal(src, caption) {
      modalImg.src = src;
      modalCap.textContent = caption || "";
      modal.classList.add("image-modal-active");
      document.body.style.overflow = "hidden";
    }

    function closeModal() {
      modal.classList.remove("image-modal-active");
      document.body.style.overflow = "";
      setTimeout(function () {
        modalImg.src = "";
      }, 350);
    }

    /* Attach click handlers to all art integration images */
    var artImgs = document.querySelectorAll(".art-integration-img");
    artImgs.forEach(function (img) {
      img.addEventListener("click", function (e) {
        e.stopPropagation();
        /* Find the sibling carousel-caption for description */
        var slide = img.closest(".carousel-slide");
        var caption = "";
        if (slide) {
          var capEl = slide.querySelector(".carousel-caption");
          if (capEl) {
            caption = capEl.textContent.trim();
          }
        }
        openModal(img.src, caption);
      });
    });

    /* Attach click handlers to weekly test images */
    var testImgs = document.querySelectorAll(".weekly-test-img");
    testImgs.forEach(function (img) {
      img.addEventListener("click", function (e) {
        e.stopPropagation();
        /* Use the test title as caption */
        var card = img.closest(".weekly-test-card");
        var caption = "";
        if (card) {
          var titleEl = card.querySelector(".weekly-test-title");
          if (titleEl) {
            caption = titleEl.textContent.trim();
          }
        }
        openModal(img.src, caption);
      });
    });

    /* Close handlers */
    if (closeBtn) {
      closeBtn.addEventListener("click", function (e) {
        e.stopPropagation();
        closeModal();
      });
    }
    if (backdrop) {
      backdrop.addEventListener("click", closeModal);
    }

    /* Close on Escape key */
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && modal.classList.contains("image-modal-active")) {
        closeModal();
      }
    });
  }

  /* ═══════════════════════════════════════════════════
     SKIP EXPERIENCE (returning visitor)
     ═══════════════════════════════════════════════════ */

  function showMainUIOnly() {
    /* Hide all experience-related overlays immediately */
    if (els.enterScreen)   els.enterScreen.style.display   = "none";
    if (els.loadingScreen) els.loadingScreen.style.display = "none";
    if (els.doorOverlay)   els.doorOverlay.style.display   = "none";
    if (els.skipBtn)       els.skipBtn.style.display       = "none";

    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    gsap.set(els.mainUI, { opacity: 1 });
    animateSectionIn("home");
  }

  /* ═══════════════════════════════════════════════════
     INITIALIZATION
     ═══════════════════════════════════════════════════ */

  function init() {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    initGrain();
    initSidebar();
    initMobileMenu();
    initCarousels();
    initIndexLinks();
    initImageModal();

    /* Check if this is a returning visitor */
    var hasVisited = false;
    try { hasVisited = localStorage.getItem(FIRST_VISIT_KEY) === "true"; } catch (e) {}

    if (hasVisited) {
      /* Returning visitor — skip the experience, show main UI directly */
      showMainUIOnly();
    } else {
      /* First-time visitor — show the full cinematic experience */
      initEnterScreen();
      initSkipButton();
      initAudioControls();
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
