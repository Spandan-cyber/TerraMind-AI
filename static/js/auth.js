// ==========================================
// TERRAMIND AUTHENTICATION CONTROLLER
// ==========================================

function showAuthMessage(form, message, isError = true) {
  let msgBox = form.querySelector(".auth-message-box");
  if (!msgBox) {
    msgBox = document.createElement("div");
    msgBox.className = "auth-message-box mt-3 px-4 py-2.5 rounded-xl text-xs font-medium text-center transition-all duration-300";
    form.insertBefore(msgBox, form.querySelector("button[type='submit']"));
  }
  
  if (isError) {
    msgBox.className = "auth-message-box mt-3 px-4 py-2.5 rounded-xl text-xs font-medium text-center bg-red-500/10 border border-red-500/30 text-red-400 backdrop-blur-md animate-pulse";
  } else {
    msgBox.className = "auth-message-box mt-3 px-4 py-2.5 rounded-xl text-xs font-medium text-center bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 backdrop-blur-md";
  }
  
  msgBox.textContent = message;
  msgBox.style.display = "block";
}

function clearAuthMessage(form) {
  const msgBox = form.querySelector(".auth-message-box");
  if (msgBox) {
    msgBox.textContent = "";
    msgBox.style.display = "none";
  }
}

// ===============================
// 1. LOGIN CONTROLLER
// ===============================
const loginForm = document.getElementById("loginForm");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAuthMessage(loginForm);

    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const submitBtn = loginForm.querySelector("button[type='submit']");
    const submitBtnText = submitBtn ? submitBtn.querySelector("div") : null;
    const originalText = submitBtnText ? submitBtnText.textContent : "Access Radar";

    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";

    if (!email || !password) {
      showAuthMessage(loginForm, "Please enter both your email address and password.");
      return;
    }

    // Set loading state
    if (submitBtn) submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = "Connecting to Radar...";

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (submitBtnText) submitBtnText.textContent = "Access Granted ✓";
        showAuthMessage(loginForm, "Redirecting to your workspace...", false);
        setTimeout(() => {
          window.location.href = "/dashboard";
        }, 500);
      } else {
        showAuthMessage(loginForm, data.message || "Invalid credentials. Please check your login details.");
        if (submitBtn) submitBtn.disabled = false;
        if (submitBtnText) submitBtnText.textContent = originalText;
      }
    } catch (err) {
      console.error("Login error:", err);
      showAuthMessage(loginForm, "Network error. Please check your connection and try again.");
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = originalText;
    }
  });
}

// ===============================
// 2. REGISTER CONTROLLER
// ===============================
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearAuthMessage(registerForm);

    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const phoneInput = document.getElementById("phone");
    const confirmInput = document.getElementById("confirmPassword");
    const submitBtn = registerForm.querySelector("button[type='submit']");
    const submitBtnText = submitBtn ? submitBtn.querySelector("div") : null;
    const originalText = submitBtnText ? submitBtnText.textContent : "Initialize Account";

    const name = nameInput ? nameInput.value.trim() : "";
    const email = emailInput ? emailInput.value.trim() : "";
    const password = passwordInput ? passwordInput.value.trim() : "";
    const phone = phoneInput ? phoneInput.value.trim() : "";
    const confirm = confirmInput ? confirmInput.value.trim() : "";

    if (!email || !password) {
      showAuthMessage(registerForm, "Please provide an email address and password.");
      return;
    }

    if (confirmInput && password !== confirm) {
      showAuthMessage(registerForm, "Passwords do not match. Please re-enter.");
      return;
    }

    if (password.length < 6) {
      showAuthMessage(registerForm, "Password must be at least 6 characters long.");
      return;
    }

    // Set loading state
    if (submitBtn) submitBtn.disabled = true;
    if (submitBtnText) submitBtnText.textContent = "Deploying Farm...";

    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password, phone })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        if (data.logged_in) {
          if (submitBtnText) submitBtnText.textContent = "Farm Deployed ✓";
          showAuthMessage(registerForm, "Account initialized! Opening workspace...", false);
          setTimeout(() => {
            window.location.href = "/dashboard";
          }, 600);
        } else {
          showAuthMessage(registerForm, data.message || "Registration successful! Redirecting to login...", false);
          setTimeout(() => {
            window.location.href = "/login";
          }, 1500);
        }
      } else {
        showAuthMessage(registerForm, data.message || "Registration failed. Please check your details.");
        if (submitBtn) submitBtn.disabled = false;
        if (submitBtnText) submitBtnText.textContent = originalText;
      }
    } catch (err) {
      console.error("Registration error:", err);
      showAuthMessage(registerForm, "Network error. Please try again.");
      if (submitBtn) submitBtn.disabled = false;
      if (submitBtnText) submitBtnText.textContent = originalText;
    }
  });
}

// ===============================
// 3. PASSWORD TOGGLE
// ===============================
const togglePassword = document.querySelector(".toggle-password");
const passwordInput = document.getElementById("password");

if (togglePassword && passwordInput) {
  togglePassword.addEventListener("click", () => {
    const type = passwordInput.getAttribute("type") === "password" ? "text" : "password";
    passwordInput.setAttribute("type", type);
    const icon = togglePassword.querySelector("i");
    if (icon) {
      icon.classList.toggle("fa-eye");
      icon.classList.toggle("fa-eye-slash");
    }
  });
}

// ===============================
// 4. GOOGLE OAUTH BUTTONS
// ===============================
document.querySelectorAll(".google-btn, a[href='/auth/google'], a[href='/login/google']").forEach(button => {
  button.addEventListener("click", (e) => {
    // Let regular navigation proceed to /auth/google
  });
});
