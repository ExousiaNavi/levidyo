export async function showCameraLoading(cameraLoading) {
    if (cameraLoading) {
      cameraLoading.classList.remove("hidden");
    }
    // hideCameraError();
  }

export async function hideCameraLoading(cameraLoading) {
    if (cameraLoading) {
      cameraLoading.classList.add("hidden");
    }
  }