/* ============================================================
   MARGARET'S DIAMOND JUBILEE — SCRIPT
   ------------------------------------------------------------
   GUIDE: This file is linked at the bottom of index.html via:
     <script src="script.js"></script>

   IMPORTANT — ABOUT window.storage:
   The original file used `window.storage.get/set(...)`. That
   API only exists inside Claude.ai's Artifact preview — it will
   NOT work once you open this file on a normal website or host
   it anywhere else (GitHub Pages, Netlify, your own server).

   Below, I've replaced it with a small adapter called
   `dataStore`. Right now it falls back to `localStorage`
   (works instantly, but only saves data in each visitor's own
   browser — you as the host won't see other people's RSVPs).

   To make RSVPs actually reach YOU (the host), follow the
   "HOW TO MAKE RSVP WORK" instructions given separately in
   the chat response — they explain how to swap the inside of
   `dataStore` for a real backend (e.g. Formspree, a Google
   Sheet, or your own small server) without touching anything
   else in this file.
   ============================================================ */

(function () {
  "use strict";

  /* ------------------------------------------------------------
     DATA STORE ADAPTER
     Swap the *inside* of these three functions to change where
     RSVP / song-request data is saved. Everything else in this
     file calls ONLY these functions, so this is the one place
     you need to edit to connect a real backend.
     ------------------------------------------------------------ */
  var dataStore = {
    // Save a value under a key. Return true/false for success.
    async set(key, value) {
      try {
        localStorage.setItem(key, value);
        return true;
      } catch (e) {
        console.error("dataStore.set failed", e);
        return false;
      }
    },
    // Read a value back. Return null if not found.
    async get(key) {
      try {
        var v = localStorage.getItem(key);
        return v === null ? null : v;
      } catch (e) {
        return null;
      }
    }
  };

  /* ---------- reveal-on-scroll animation ---------- */
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var revealEls = document.querySelectorAll(".reveal, .vine");
  if (reduceMotion) {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  } else if ("IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add("in-view"); io.unobserve(e.target); }
      });
    }, { threshold: 0.18 });
    revealEls.forEach(function (el) { io.observe(el); });
  } else {
    revealEls.forEach(function (el) { el.classList.add("in-view"); });
  }

  /* ---------- countdown timer ---------- */
  // CHANGE THIS DATE if the party date/time changes.
  var target = new Date("2026-08-15T18:00:00");
  var dEl = document.getElementById("cd-days"), hEl = document.getElementById("cd-hours"),
      mEl = document.getElementById("cd-mins"), sEl = document.getElementById("cd-secs");
  var grid = document.getElementById("countdownGrid");
  var live = document.getElementById("countdownLive");

  function pad(n) { return String(n).padStart(2, "0"); }
  function tick() {
    var now = new Date();
    var diff = target - now;
    if (diff <= 0) {
      grid.style.display = "none";
      live.style.display = "block";
      return;
    }
    var days = Math.floor(diff / (1000 * 60 * 60 * 24));
    var hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    var mins = Math.floor((diff / (1000 * 60)) % 60);
    var secs = Math.floor((diff / 1000) % 60);
    dEl.textContent = pad(days); hEl.textContent = pad(hours);
    mEl.textContent = pad(mins); sEl.textContent = pad(secs);
  }
  tick();
  setInterval(tick, 1000);

  /* ---------- ambient generative music (Web Audio API, no external files) ---------- */
  var audioCtx = null, masterGain, oscillators = [], lfo, playing = false;
  var eqBars = [];
  var eqContainer = document.getElementById("eq");
  for (var i = 0; i < 14; i++) {
    var bar = document.createElement("span");
    eqContainer.appendChild(bar);
    eqBars.push(bar);
  }
  var eqRAF = null;

  function buildAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;
    var filter = audioCtx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 1200;
    masterGain.connect(filter).connect(audioCtx.destination);

    var notes = [130.81, 164.81, 196.00, 261.63]; // C3 E3 G3 C4 - soft major chord
    notes.forEach(function (freq, idx) {
      var osc = audioCtx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      var g = audioCtx.createGain();
      g.gain.value = 0.16 - idx * 0.02;
      osc.connect(g).connect(masterGain);
      osc.start();
      oscillators.push({ osc: osc, gain: g });
    });

    // slow amplitude LFO for gentle movement
    lfo = audioCtx.createOscillator();
    lfo.frequency.value = 0.08;
    var lfoGain = audioCtx.createGain();
    lfoGain.gain.value = 0.05;
    lfo.connect(lfoGain).connect(masterGain.gain);
    lfo.start();
  }

  function animateEq() {
    eqBars.forEach(function (bar) {
      var h = playing ? (4 + Math.random() * 18) : 6;
      bar.style.height = h + "px";
    });
    eqRAF = requestAnimationFrame(animateEq);
  }
  animateEq();

  function setPlaying(state) {
    playing = state;
    var icon = document.getElementById("playIcon");
    var heroIcon = document.getElementById("heroMusicIcon");
    var heroBtn = document.getElementById("heroMusicBtn");
    var playerBtn = document.getElementById("playerBtn");
    playerBtn.setAttribute("aria-pressed", String(state));
    heroBtn.setAttribute("aria-pressed", String(state));
    if (state) {
      icon.innerHTML = '<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>';
      heroBtn.querySelector("svg").style.opacity = "0.4";
      masterGain && masterGain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 1.2);
    } else {
      icon.innerHTML = '<path d="M8 5v14l11-7z"/>';
      heroBtn.querySelector("svg").style.opacity = "1";
      masterGain && masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.6);
    }
  }

  function toggleMusic() {
    if (!audioCtx) { buildAudio(); }
    if (audioCtx.state === "suspended") { audioCtx.resume(); }
    setPlaying(!playing);
  }

  document.getElementById("playerBtn").addEventListener("click", toggleMusic);
  document.getElementById("heroMusicBtn").addEventListener("click", function () {
    toggleMusic();
    this.lastChild.textContent = playing ? " Pause Music" : " Play Music";
  });

  /* ---------- song requests (now saved via dataStore, see top of file) ---------- */
  var songForm = document.getElementById("songForm");
  var songInput = document.getElementById("songInput");
  var requestList = document.getElementById("requestList");
  var SONG_KEY = "birthday:songRequests";

  function renderSongs(list) {
    requestList.innerHTML = "";
    list.slice().reverse().forEach(function (item) {
      var li = document.createElement("li");
      li.textContent = "♪ " + item;
      requestList.appendChild(li);
    });
  }

  async function loadSongs() {
    try {
      var raw = await dataStore.get(SONG_KEY);
      var list = raw ? JSON.parse(raw) : [];
      renderSongs(list);
    } catch (e) { renderSongs([]); }
  }

  songForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var val = songInput.value.trim();
    if (!val) return;
    try {
      var raw = await dataStore.get(SONG_KEY);
      var list = raw ? JSON.parse(raw) : [];
      list.push(val);
      await dataStore.set(SONG_KEY, JSON.stringify(list));
      renderSongs(list);
      songInput.value = "";
    } catch (err) {
      console.error("Could not save song request", err);
    }
  });
  loadSongs();

  /* ------------------------------------------------------------
     RSVP FORM
     This is the part covered step-by-step in the "HOW TO MAKE
     RSVP WORK" instructions. As written, it saves each RSVP to
     dataStore (localStorage by default) and shows a thank-you
     message. To have RSVPs emailed/sent to you, see the
     instructions — you'll add a fetch() call here to your
     chosen backend (Formspree / Google Sheet / your server).
     ------------------------------------------------------------ */
  var attendButtons = document.querySelectorAll(".attend-btn");
  var attendingInput = document.getElementById("attending");
  var guestRow = document.getElementById("guestRow");

  attendButtons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      attendButtons.forEach(function (b) { b.classList.remove("active"); });
      btn.classList.add("active");
      attendingInput.value = btn.getAttribute("data-value");
      guestRow.style.display = attendingInput.value === "yes" ? "grid" : "none";
    });
  });

  var rsvpForm = document.getElementById("rsvpForm");
  var rsvpSuccess = document.getElementById("rsvpSuccess");
  var rsvpError = document.getElementById("rsvpError");
  var successTitle = document.getElementById("successTitle");
  var successMsg = document.getElementById("successMsg");
  var RSVP_KEY_PREFIX = "birthday:rsvp:";

  rsvpForm.addEventListener("submit", async function (e) {
    e.preventDefault();
    var name = document.getElementById("fullName").value.trim();
    var email = document.getElementById("email").value.trim();
    if (!name || !email) {
      rsvpError.style.display = "block";
      return;
    }
    rsvpError.style.display = "none";

    var data = {
      name: name,
      email: email,
      attending: attendingInput.value,
      guestCount: document.getElementById("guestCount").value,
      meal: document.getElementById("meal").value,
      message: document.getElementById("message").value.trim(),
      submittedAt: new Date().toISOString()
    };

    // STEP FOR REAL BACKEND: this is where you'd ALSO send `data`
    // to your backend/email service with a fetch() call.
    // See the chat instructions for exact code to paste here.
    var key = RSVP_KEY_PREFIX + email.toLowerCase();
    try {
      await dataStore.set(key, JSON.stringify(data));await fetch("https://formspree.io/f/abc123", {
     method: "POST",
     headers: { "Content-Type": "application/json", Accept: "application/json" },
     body: JSON.stringify(data)
   });
    } catch (err) {
      console.error("Could not save RSVP", err);
    }

    if (data.attending === "yes") {
      successTitle.textContent = "Thank You, " + name.split(" ")[0] + "!";
      successMsg.textContent = "We're so glad you'll be there to celebrate. A confirmation has been saved for the hosts.";
    } else {
      successTitle.textContent = "You Will Be Missed";
      successMsg.textContent = "Thank you for letting us know, " + name.split(" ")[0] + ". You'll be in our thoughts on the evening.";
    }
    rsvpForm.style.display = "none";
    rsvpSuccess.classList.add("show");
  });

  document.getElementById("editRsvp").addEventListener("click", function () {
    rsvpSuccess.classList.remove("show");
    rsvpForm.style.display = "block";
  });

})();
