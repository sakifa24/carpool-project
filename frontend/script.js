const API_BASE = "http://localhost:5000/api";

const loginTab = document.getElementById("loginTab");
const signupTab = document.getElementById("signupTab");
const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

loginTab.addEventListener("click", () => {
  loginTab.classList.add("active");
  signupTab.classList.remove("active");
  loginForm.classList.remove("hidden");
  signupForm.classList.add("hidden");
});

signupTab.addEventListener("click", () => {
  signupTab.classList.add("active");
  loginTab.classList.remove("active");
  signupForm.classList.remove("hidden");
  loginForm.classList.add("hidden");
});

// --- SIGNUP ---
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const university_id = document.getElementById("signupUniversityId").value;
  const name = document.getElementById("signupName").value;
  const email = document.getElementById("signupEmail").value;
  const phone = document.getElementById("signupPhone").value;
  const password = document.getElementById("signupPassword").value;

  try {
    const res = await fetch(`${API_BASE}/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ university_id, name, email, phone, password }),
    });
    const data = await res.json();
    document.getElementById("signupMessage").textContent = data.message || data.error;
  } catch (err) {
    document.getElementById("signupMessage").textContent = "Signup failed. Check server.";
  }
});

// --- LOGIN ---
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const res = await fetch(`${API_BASE}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("studentName", data.student.name);
      window.location.href = "dashboard.html";
    } else {
      document.getElementById("loginMessage").textContent = data.error;
    }
  } catch (err) {
    document.getElementById("loginMessage").textContent = "Login failed. Check server.";
  }
});