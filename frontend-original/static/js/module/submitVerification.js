// submitVerification.js
export async function submitVerification({ face, front, back, username }) {
  try {
    const response = await fetch('/submit-verification', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        face,
        front,
        back,
        username,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to submit verification data');
    }

    const result = await response.json();
    return result; // { success: true/false, message: "..."}
  } catch (error) {
    console.error('Submission failed:', error);
    return { success: false, message: 'Server error' };
  }
}


export async function showVerificationLoader() {
  document.getElementById("verificationLoader").classList.remove("hidden");
  document.getElementById("loaderSpinner").classList.remove("hidden");
  document.getElementById("loaderSuccess").classList.add("hidden");
  document.getElementById("loaderError").classList.add("hidden");
}

export async function showVerificationSuccess() {
  document.getElementById("loaderSpinner").classList.add("hidden");
  document.getElementById("loaderSuccess").classList.remove("hidden");
}

export async function showVerificationError() {
  document.getElementById("loaderSpinner").classList.add("hidden");
  document.getElementById("loaderError").classList.remove("hidden");
}

export async function hideVerificationLoader() {
  setTimeout(() => {
    document.getElementById("verificationLoader").classList.add("hidden");
  }, 1500); // Small delay to show success/error
}