import { loadModels } from "./module/models.js";
import { setupCameraAndRunDetection } from "./module/camera.js";
import { hideCameraLoading, showCameraLoading } from "./module/loader.js";
import { runDetection } from "./module/detection.js";
import { showCameraError, hideCameraError } from "./module/error.js";
import { captureFace } from "./module/capture.js";
import { getCapturedFace, setCapturedFace } from "./module/state.js";
import { delete_uploaded_face } from "./module/delete.js";

document.addEventListener("DOMContentLoaded", async () => {
  const cameraPage = document.getElementById("cameraPage");
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const overlay = document.getElementById("overlay");
  const ctxOverlay = overlay.getContext("2d");
  const cameraLoading = document.getElementById("cameraLoading");
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  const captureBtn = document.getElementById("capture");
  const nextToStep3 = document.getElementById("nextToStep3");
  const submitKycFinal = document.getElementById("submitKycFinal");
  const statusText = document.getElementById("statusText"); //not on dom
  // const loader = document.getElementById("skeleton-loader");
  // const con = document.getElementById("skeleton-loader-container");
  const cameraError = document.getElementById("cameraError");
  const previewPage = document.getElementById("previewPage");
  const previewImage = document.getElementById("previewImage");
  const tryAgainBtn = document.getElementById("tryAgain");
  const continueBtn = document.getElementById("continue");
  const smainLoader = document.getElementById("mainLoader");
  const sloaderContent = document.getElementById("loader-content");

  let shouldFaceUser = true;
  let stream = null;
  let detectionInterval = null;
  let loaderHidden = false;
  let modelsLoaded = false;
  let capturedFace = await getCapturedFace();
  // ===========================
  // FUNCTIONS
  // ===========================
  async function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      stream = null;
    }
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
  }

  async function stopCameraForced() {
    const video = document.querySelector("video");

    // Stop all tracks in the stream
    if (video?.srcObject) {
      video.srcObject.getTracks().forEach((track) => {
        track.stop(); // Force stop each track
      });
      video.srcObject = null; // Disconnect the stream
    }

    // Optional: Stop the video element itself
    if (video) {
      video.pause();
      video.srcObject = null;
    }

    // Clear detection interval if set
    if (
      typeof detectionInterval !== "undefined" &&
      detectionInterval !== null
    ) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }

    // Release stream variable if used
    if (typeof stream !== "undefined") {
      stream = null;
    }

    // Optional: Log to confirm
    console.log("Camera forcibly stopped.");
  }

  // ===========================
  // EVENT BINDINGS
  // ===========================
  if (submitKycFinal) {
    submitKycFinal.addEventListener("click", async () => {
      await stopCameraForced();
      sloaderContent.textContent = "submitting KYC";
      smainLoader.classList.remove("hidden");
      setTimeout(() => {
        smainLoader.classList.add("hidden");
      }, 3000);
    });
  }

  if (nextToStep3) {
    nextToStep3.addEventListener("click", async () => {
      try {
        await stopCamera();
        sloaderContent.textContent = "Loading camera";
        smainLoader.classList.remove("hidden");
        setTimeout(() => {
          smainLoader.classList.add("hidden");
        }, 3000);
        // await loadModels(modelsLoaded);
        await setupCameraAndRunDetection(
          shouldFaceUser,
          stream,
          video,
          overlay,
          canvas,
          () =>
            showCameraLoading(cameraLoading, () =>
              hideCameraError(cameraLoading)
            ), // wrapped with params,
          () => hideCameraLoading(cameraLoading), // wrapped with params,
          () => stopCamera(),
          () =>
            runDetection(
              detectionInterval,
              isMobile,
              overlay,
              video,
              captureBtn,
              statusText,
              ctxOverlay,
              loaderHidden
              // loader,
              // con
            ),
          cameraError,
          showCameraError
        );
      } catch (error) {
        console.log("Initialization of camera error:", error);
      }
    });
  }
  if (tryAgainBtn) {
    tryAgainBtn.addEventListener("click", async () => {
      // const uploadedFilename =
      //   document.getElementById("uploadedFilename").value;
      // console.log(uploadedFilename);

      const fullPath = localStorage.getItem("capturedFace");
      // const filename = fullPath.split("/").pop();
      // console.log(filename);

      let filename = "";
      if (fullPath && typeof fullPath === "string") {
        filename = fullPath.split("/").pop();
        console.log(filename);
        await delete_uploaded_face(filename);
      } else {
        console.warn("No captured face found in localStorage.");
      }

      // await delete_uploaded_face(filename);

      if (previewPage) previewPage.classList.add("hidden");
      if (cameraPage) cameraPage.classList.remove("hidden");

      const frozenFrame = document.getElementById("frozenFrame");
      if (frozenFrame) frozenFrame.remove();

      if (video) video.classList.remove("hidden");

      if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
      }

      await stopCamera();
      await runDetection(
        detectionInterval,
        isMobile,
        overlay,
        video,
        captureBtn,
        statusText,
        ctxOverlay,
        loaderHidden
        // loader,
        // con
      );
    });
  }

  if (captureBtn) {
    captureBtn.addEventListener("click", async () => {
      const success = await captureFace(
        captureBtn,
        detectionInterval,
        cameraPage,
        video,
        canvas,
        capturedFace,
        setCapturedFace
      );

      if (success) {
        console.log("✅ Face captured successfully:", await getCapturedFace());
        await stopCamera();
        cameraPage.classList.add("hidden");
        previewPage.classList.remove("hidden");
        previewImage.src = await getCapturedFace();
        captureBtn.disabled = false;
        continueBtn.classList.remove("hidden");
      } else {
        console.log("❌ Failed to capture face.");
        // Optionally re-enable capture button for retry
        cameraPage.classList.add("hidden");
        previewPage.classList.remove("hidden");
        continueBtn.classList.add("hidden");
        previewImage.src = `https://static.vecteezy.com/system/resources/previews/017/178/222/original/round-cross-mark-symbol-with-transparent-background-free-png.png`;
        captureBtn.disabled = false;
      }

      // ✅ Remove frozen frame after capture
      const frozenFrame = document.getElementById("frozenFrame");
      if (frozenFrame) {
        frozenFrame.remove();
        video.classList.remove("hidden"); // Show video again
      }
    });
  }

  if (continueBtn) {
    continueBtn.addEventListener("click", async () => {
      await stopCamera();
      // tryAgainBtn.classList.add("hidden")
      continueBtn.classList.add("hidden");
      document.getElementById("nextToStep4").disabled = false;
    });
  }

  // ===========================
  // INIT
  // ===========================
  try {
    await loadModels(modelsLoaded);
  } catch (error) {
    console.log("Initialization error:", error);
  }
});
