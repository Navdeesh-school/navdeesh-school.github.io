/* ═══════════════════════════════════════════════════════════════
   NAVDEESH PORTFOLIO — Main Script
   Cinematic loading experience with audio-synced door animation
   Features: skip experience, mute/volume controls, auto volume fade
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  /* ── State ── */
  let activeSection = "home";
  let mobileOpen = false;
  let isTransitioning = false;
  let audio = null;
  let isMuted = false;
  let userVolume = 1.0;       // What the user has set (0–1)
  let experienceStarted = false;
  let loadingTimeline = null;
  let autoFadeTimer = null;
  let volumeBeforeMute = 1.0;

  /* ── DOM References ── */
  const $ = (id) => document.getElementById(id);

  const els = {
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
    var interval  = 50; // ms per tick

    var fadeInterval = setInterval(function () {
      var elapsed  = Date.now() - startTime;
      var progress = Math.min(elapsed / durationMs, 1);
      // ease-in-out quadratic
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
    audio.volume  = 1.0; // Start at 100%
    userVolume    = 1.0;
    if (els.volumeSlider) els.volumeSlider.value = 10;

    var playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(function () {
        // Autoplay blocked — proceed silently
      });
    }

    /* ── After 20 seconds, fade volume to ~0.7% automatically ── */
    autoFadeTimer = setTimeout(function () {
      if (!audio) return;
      userVolume = 0.007;
      if (!isMuted) {
        fadeAudioVolume(0.007, 2000);
      } else {
        if (els.volumeSlider) els.volumeSlider.value = 1;
      }
    }, 20000);

    /* ── Hide audio controls when music finishes ── */
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
    /* Clear any pending auto-fade timer */
    if (autoFadeTimer) {
      clearTimeout(autoFadeTimer);
      autoFadeTimer = null;
    }
    /* Fade volume to 0 over 0.5 seconds, then stop completely */
    fadeAudioVolume(0, 500);
    /* Hide controls after the fade */
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

    /* ── Progress bar: 0% → 92% over 14.7 seconds ── */
    loadingTimeline.to(els.progressBar, {
      width: "92%",
      duration: 14.7,
      ease: "power2.inOut",
    }, 0);

    /* ── Progress text + glow tracker ── */
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

    /* ─── PHASE 1: Door crack (14.7s) ─── */
    loadingTimeline.to(els.doorLeft, { rotationY: -8, duration: 0.3, ease: "power2.out" }, 14.7);
    loadingTimeline.to(els.doorRight, { rotationY: 8, duration: 0.3, ease: "power2.out" }, 14.7);

    /* ─── Light leak begins (14.8s) ─── */
    loadingTimeline.to(els.doorLight, { opacity: 0.3, duration: 0.2, ease: "power2.out" }, 14.8);

    /* ─── PHASE 2: Doors open fully at audio drop (15.0s) ─── */
    loadingTimeline.to(els.doorLeft, { rotationY: -115, duration: 0.6, ease: "power4.out" }, 15.0);
    loadingTimeline.to(els.doorRight, { rotationY: 115, duration: 0.6, ease: "power4.out" }, 15.0);

    /* Light intensifies */
    loadingTimeline.to(els.doorLight, { opacity: 1, duration: 0.6, ease: "power2.out" }, 15.0);

    /* Door shadows */
    loadingTimeline.to(els.doorShadowLeft, { opacity: 0.6, duration: 0.3, ease: "power2.out" }, 15.1);
    loadingTimeline.to(els.doorShadowRight, { opacity: 0.6, duration: 0.3, ease: "power2.out" }, 15.1);

    /* ─── Progress bar finishes (15.2s → 16s) ─── */
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

    /* Fade out loading text */
    loadingTimeline.to(els.progressText, { opacity: 0, duration: 0.3, ease: "power2.inOut" }, 15.4);
    loadingTimeline.to(els.progressGlow, { opacity: 0, duration: 0.3 }, 15.4);

    /* Fade out door overlay */
    loadingTimeline.to(els.doorOverlay, { opacity: 0, duration: 0.5, ease: "power2.inOut" }, 15.6);

    /* Fade out loading screen */
    loadingTimeline.to(els.loadingScreen, { opacity: 0, duration: 0.4, ease: "power2.inOut" }, 15.8);
  }

  /* ═══════════════════════════════════════════════════
     SKIP EXPERIENCE
     ═══════════════════════════════════════════════════ */

  function skipExperience() {
    /* Kill the loading timeline if it's running */
    if (loadingTimeline) {
      loadingTimeline.kill();
      loadingTimeline = null;
    }

    /* Clear the auto-fade timer (it'll be re-triggered from onSequenceComplete) */
    if (autoFadeTimer) {
      clearTimeout(autoFadeTimer);
      autoFadeTimer = null;
    }

    /* Immediately hide all overlays */
    if (els.enterScreen)   els.enterScreen.style.display   = "none";
    if (els.loadingScreen) els.loadingScreen.style.display = "none";
    if (els.doorOverlay)   els.doorOverlay.style.display   = "none";
    if (els.skipBtn)       els.skipBtn.style.display       = "none";

    /* Allow scrolling */
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    /* After 0.5 seconds, fade volume to ~0.7% */
    autoFadeTimer = setTimeout(function () {
      if (!audio) return;
      userVolume = 0.007;
      if (!isMuted) {
        fadeAudioVolume(0.007, 2000);
      } else {
        if (els.volumeSlider) els.volumeSlider.value = 1;
      }
    }, 500);

    /* Fade in main UI */
    gsap.to(els.mainUI, {
      opacity: 1,
      duration: 0.6,
      ease: "power2.out",
      onComplete: function () {
        showAudioControls();
      },
    });

    /* Animate home section content in */
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
    /* Hide overlays from DOM flow */
    if (els.enterScreen)   els.enterScreen.style.display   = "none";
    if (els.loadingScreen) els.loadingScreen.style.display = "none";
    if (els.doorOverlay)   els.doorOverlay.style.display   = "none";

    /* Hide skip button now that the experience is complete */
    hideSkipButton();

    /* Allow scrolling */
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";

    /* Fade in main UI */
    gsap.to(els.mainUI, {
      opacity: 1,
      duration: 0.6,
      ease: "power2.out",
      onComplete: function () {
        showAudioControls();
      },
    });

    /* Animate home section content in */
    animateSectionIn("home");

    experienceStarted = false;
  }

  /* ═══════════════════════════════════════════════════
     SECTION NAVIGATION
     ═══════════════════════════════════════════════════ */

  function switchSection(sectionId) {
    if (sectionId === activeSection || isTransitioning) return;

    isTransitioning = true;
    closeMobileMenu();

    /* Scroll content to top */
    if (els.contentArea) els.contentArea.scrollTop = 0;

    var currentEl = document.getElementById("section-" + activeSection);
    var nextEl    = document.getElementById("section-" + sectionId);

    /* Fade out current section */
    gsap.to(currentEl, {
      opacity: 0,
      y: -16,
      duration: 0.25,
      ease: "power2.in",
      onComplete: function () {
        /* Hide current, show next */
        currentEl.style.display = "none";
        nextEl.style.display    = "block";

        /* Double rAF to ensure the browser has painted the new section */
        requestAnimationFrame(function () {
          requestAnimationFrame(function () {
            /* Section visible at final position — let animateSectionIn handle children */
            gsap.set(nextEl, { opacity: 1, y: 0 });

            activeSection  = sectionId;
            isTransitioning = false;
            animateSectionIn(sectionId);
          });
        });
      },
    });

    /* Update sidebar active state */
    updateSidebarActive(sectionId);
  }

  function animateSectionIn(sectionId) {
    var sectionEl = document.getElementById("section-" + sectionId);
    if (!sectionEl) return;

    /* Stagger-animate child elements */
    var children = sectionEl.children;
    gsap.set(children, { opacity: 0, y: 20 });

    gsap.to(children, {
      opacity: 1,
      y: 0,
      duration: 0.5,
      stagger: 0.08,
      ease: "power2.out",
    });

    /* Animate mark bars (if subject section) */
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
      item.addEventListener("click", function () {
        var sectionId = item.getAttribute("data-section");
        if (sectionId) switchSection(sectionId);
      });
      item.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var sectionId = item.getAttribute("data-section");
          if (sectionId) switchSection(sectionId);
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
     ENTER SCREEN
     ═══════════════════════════════════════════════════ */

  function initEnterScreen() {
    if (!els.enterScreen) return;

    function enter() {
      if (experienceStarted) return;
      experienceStarted = true;

      /* Fade out enter screen */
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
     INITIALIZATION
     ═══════════════════════════════════════════════════ */

  function init() {
    /* Prevent scrolling during intro */
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";

    /* Generate grain noise texture */
    initGrain();

    /* Setup enter screen */
    initEnterScreen();

    /* Setup skip button */
    initSkipButton();

    /* Setup audio controls */
    initAudioControls();

    /* Setup sidebar navigation */
    initSidebar();

    /* Setup mobile menu */
    initMobileMenu();
  }

  /* Start when DOM is ready */
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

})();
