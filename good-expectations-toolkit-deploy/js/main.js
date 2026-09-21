/*!
 * Good Expectations Toolkit — shared front-end behavior
 * Handles: mobile nav toggle, hero card-stack settle animation,
 * scroll reveal for section headers, FAQ accordion (native <details>,
 * no JS needed there), and progressive form validation + submission.
 */
(function () {
  "use strict";

  /* ---------------- Mobile nav ---------------- */
  var header = document.querySelector(".site-header");
  var toggle = document.querySelector(".nav-toggle");
  if (header && toggle) {
    toggle.addEventListener("click", function () {
      var isOpen = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    document.querySelectorAll(".nav-links a").forEach(function (a) {
      a.addEventListener("click", function () {
        header.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  /* ---------------- Hero card-stack settle (single orchestrated moment) ---------------- */
  // CSS animation handles the motion; this just marks the cards settled
  // so state is correct if animation is skipped (reduced motion) or replayed.
  var cards = document.querySelectorAll(".card-stack .index-card");
  cards.forEach(function (card) {
    card.addEventListener("animationend", function () {
      card.classList.add("settled");
    });
  });

  /* ---------------- Scroll reveal ---------------- */
  var revealEls = document.querySelectorAll(".reveal");
  if (revealEls.length) {
    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (entry.isIntersecting) {
              entry.target.classList.add("is-visible");
              io.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
      );
      revealEls.forEach(function (el) { io.observe(el); });
    } else {
      revealEls.forEach(function (el) { el.classList.add("is-visible"); });
    }
  }

  /* ---------------- Form handling ---------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  function setFieldError(field, message) {
    var wrap = field.closest(".field");
    if (!wrap) return;
    var msg = wrap.querySelector(".error-msg");
    if (message) {
      wrap.classList.add("has-error");
      if (msg) msg.textContent = message;
      field.setAttribute("aria-invalid", "true");
    } else {
      wrap.classList.remove("has-error");
      if (msg) msg.textContent = "";
      field.removeAttribute("aria-invalid");
    }
  }

  function validateField(field) {
    var value = field.value.trim();
    if (field.hasAttribute("required") && !value) {
      setFieldError(field, "This field is required.");
      return false;
    }
    if (field.type === "email" && value && !EMAIL_RE.test(value)) {
      setFieldError(field, "Enter a valid email address.");
      return false;
    }
    if (field.hasAttribute("minlength") && value.length < Number(field.getAttribute("minlength"))) {
      setFieldError(field, "Please add a bit more detail (min " + field.getAttribute("minlength") + " characters).");
      return false;
    }
    setFieldError(field, "");
    return true;
  }

  document.querySelectorAll("form[data-form]").forEach(function (form) {
    var fields = form.querySelectorAll("input, textarea, select");
    var status = form.querySelector(".form-status");
    var submitBtn = form.querySelector('button[type="submit"]');

    fields.forEach(function (field) {
      field.addEventListener("blur", function () { validateField(field); });
      field.addEventListener("input", function () {
        if (field.closest(".field").classList.contains("has-error")) validateField(field);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: if filled, silently "succeed" without sending anywhere.
      var honeypot = form.querySelector('input[name="company_website"]');
      if (honeypot && honeypot.value) {
        showStatus(status, "success", "Thanks! We'll be in touch shortly.");
        form.reset();
        return;
      }

      var valid = true;
      fields.forEach(function (field) {
        if (!validateField(field)) valid = false;
      });
      if (!valid) {
        showStatus(status, "error", "Please fix the highlighted fields and try again.");
        var firstError = form.querySelector(".has-error input, .has-error textarea, .has-error select");
        if (firstError) firstError.focus();
        return;
      }

      var endpoint = form.getAttribute("data-endpoint") || "/api/contact";
      var formData = new FormData(form);
      var payload = {};
      formData.forEach(function (val, key) { payload[key] = val; });

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.dataset.originalText = submitBtn.textContent;
        submitBtn.textContent = "Sending…";
      }
      showStatus(status, null, "");

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) throw new Error("Request failed");
          return res.json().catch(function () { return {}; });
        })
        .then(function () {
          showStatus(status, "success", form.dataset.successMessage || "Thanks — your message is on its way. We'll reply within one business day.");
          form.reset();
        })
        .catch(function () {
          showStatus(
            status,
            "error",
            "Something went wrong sending this. Please try again, or email us directly at hello@goodexpectationstoolkit.com."
          );
        })
        .finally(function () {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = submitBtn.dataset.originalText || "Send message";
          }
        });
    });
  });

  function showStatus(statusEl, type, message) {
    if (!statusEl) return;
    statusEl.classList.remove("success", "error", "visible");
    if (!message) return;
    statusEl.textContent = message;
    statusEl.classList.add(type, "visible");
    statusEl.setAttribute("role", type === "error" ? "alert" : "status");
  }

  /* ---------------- Footer year ---------------- */
  document.querySelectorAll("[data-year]").forEach(function (el) {
    el.textContent = new Date().getFullYear();
  });
})();
