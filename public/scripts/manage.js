const urlParams = new URLSearchParams(window.location.search);
const postId = urlParams.get("id");
const token = urlParams.get("token");

if (!postId || !token) {
  document.getElementById("errorMessage").textContent =
    "Invalid management link";
  document.getElementById("errorMessage").style.display = "block";
  document.getElementById("deleteSection").style.display = "none";
}

document.getElementById("deleteBtn").addEventListener("click", async () => {
  const deleteBtn = document.getElementById("deleteBtn");
  const errorMessage = document.getElementById("errorMessage");
  const successMessage = document.getElementById("successMessage");
  const deleteSection = document.getElementById("deleteSection");

  deleteBtn.disabled = true;
  deleteBtn.textContent = "Deleting...";
  errorMessage.style.display = "none";

  try {
    const response = await fetch(`/api/manage/${postId}/${token}`, {
      method: "DELETE",
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Failed to delete post");
    }

    deleteSection.style.display = "none";
    successMessage.style.display = "block";
  } catch (error) {
    errorMessage.textContent = error.message;
    errorMessage.style.display = "block";
    deleteBtn.disabled = false;
    deleteBtn.textContent = "Yes, Delete My Post";
  }
});
