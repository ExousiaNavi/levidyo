export async function showCameraError(cameraError, message) {
    if (cameraError) {
      cameraError.querySelector("p").textContent = message;
      cameraError.classList.remove("hidden");
    }
    if (cameraLoading) {
      cameraLoading.classList.add("hidden");
    }
  }

export async function hideCameraError(cameraError) {
    if (cameraError) {
      cameraError.classList.add("hidden");
    }
  }