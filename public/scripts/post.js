// Character counter
const description = document.getElementById("description");
const charCount = document.getElementById("charCount");

description.addEventListener("input", () => {
  charCount.textContent = description.value.length;
});

// Form submission
const form = document.getElementById("postForm");
const successMessage = document.getElementById("successMessage");
const errorMessage = document.getElementById("errorMessage");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const submitBtn = form.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  submitBtn.textContent = "Posting...";

  errorMessage.style.display = "none";

  try {
    const formData = {
      location: document.getElementById("location").value,
      category: document.getElementById("category").value,
      description: document.getElementById("description").value,
      expiresInDays: parseInt(document.getElementById("expiresInDays").value),
    };

    const response = await fetch("/api/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to create post");
    }

    // Store post data for email verification
    window.postData = {
      id: data.id,
      sessionToken: data.sessionToken,
      expiresAt: data.expiresAt,
    };

    form.style.display = "none";
    successMessage.style.display = "block";
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
    submitBtn.disabled = false;
    submitBtn.textContent = "Post My Connection";
  }
});

// Email link form submission
document
  .getElementById("emailLinkForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Sending code...";

    try {
      const email = document.getElementById("posterEmail").value;
      const notifyOnReply = document.getElementById("notifyOnReply").checked;

      const response = await fetch("/api/poster-verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: window.postData.id,
          email: email,
          sessionToken: window.postData.sessionToken,
          notifyOnReply: notifyOnReply,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send code");
      }

      window.posterEmail = email;
      document.getElementById("emailLinkForm").style.display = "none";
      document.getElementById("posterVerificationForm").style.display = "block";
    } catch (error) {
      alert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Send Verification Code";
    }
  });

// Poster verification form
document
  .getElementById("posterVerificationForm")
  .addEventListener("submit", async (e) => {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Verifying...";

    try {
      const code = document.getElementById("posterCode").value;

      const response = await fetch("/api/poster-verification/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: window.postData.id,
          email: window.posterEmail,
          code: code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Invalid code");
      }

      document.getElementById("posterVerificationForm").style.display = "none";
      document.getElementById("emailSentConfirmation").style.display = "block";
    } catch (error) {
      alert(error.message);
      submitBtn.disabled = false;
      submitBtn.textContent = "Verify & Send Link";
    }
  });

// Resend poster code
document
  .getElementById("resendPosterCode")
  .addEventListener("click", async () => {
    const btn = document.getElementById("resendPosterCode");
    btn.disabled = true;
    btn.textContent = "Sending...";

    try {
      const notifyOnReply = document.getElementById("notifyOnReply").checked;

      await fetch("/api/poster-verification/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId: window.postData.id,
          email: window.posterEmail,
          sessionToken: window.postData.sessionToken,
          notifyOnReply: notifyOnReply,
        }),
      });

      alert("New code sent! Check your email.");
    } catch (error) {
      alert("Failed to resend code");
    } finally {
      btn.disabled = false;
      btn.textContent = "Resend Code";
    }
  });

// Skip email - show link directly
document.getElementById("skipEmail").addEventListener("click", () => {
  const inboxUrl = `/inbox.html?session=${window.postData.sessionToken}`;

  document.getElementById("inboxLinkButton").href = inboxUrl;
  document.getElementById("inboxLinkText").value =
    window.location.origin + inboxUrl;

  document.getElementById("emailLinkForm").style.display = "none";
  document.getElementById("manualInboxLink").style.display = "block";
});
