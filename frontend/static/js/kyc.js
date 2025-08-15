import { loadModels } from "./module/models.js";
import { setupCameraAndRunDetection, startIDCamera } from "./module/camera.js";
import { hideCameraLoading, showCameraLoading } from "./module/loader.js";
import { runDetection } from "./module/detection.js";
import { showCameraError, hideCameraError } from "./module/error.js";
import { captureFace, captureID } from "./module/capture.js";
import { getCapturedFace, setCapturedFace } from "./module/state.js";
import { delete_uploaded_face } from "./module/delete.js";
import { showOrientationGuide } from "./module/animation.js";
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
  const nextToStep4 = document.getElementById("nextToStep4");
  const nextToStep2 = document.getElementById("nextToStep2");
  const nextToStep3 = document.getElementById("nextToStep3");
  const submitKycFinal = document.getElementById("submitKycFinal");
  const statusText = document.getElementById("statusText"); //not on dom
  // const loader = document.getElementById("skeleton-loader");
  // const con = document.getElementById("skeleton-loader-container");
  const cameraError = document.getElementById("cameraError");
  const previewPage = document.getElementById("previewPage");
  const previewImage = document.getElementById("previewImage");
  const tryAgainBtn = document.getElementById("tryAgain");
  const continueBtn = document.getElementById("continueFaceBtn");
  const smainLoader = document.getElementById("mainLoader");
  const sloaderContent = document.getElementById("loader-content");
  const sloaderContent2 = document.getElementById("loader-content2");

  // For ID capture Front
  const idCapturePage = document.getElementById("idCapturePage");
  const idCaptureTitle = document.getElementById("idCaptureTitle");
  const idVideo = document.getElementById("idVideo");
  const idCanvas = document.getElementById("idCanvas");
  const idOverlay = document.getElementById("idOverlay");
  const captureFrontIdBtn = document.getElementById("captureIdFront");

  // For ID capture Back
  const idBackCapturePage = document.getElementById("idBackCapturePage");
  const idBackCaptureTitle = document.getElementById("idBackCaptureTitle");
  const idBackVideo = document.getElementById("idBackVideo");
  const idBackCanvas = document.getElementById("idBackCanvas");
  const idBackOverlay = document.getElementById("idBackOverlay");
  const captureBackIdBtn = document.getElementById("captureIdBack");

  const guide = document.getElementById("orientationGuide");
  const sideText = document.getElementById("guideSideText");
  const frontContent = document.getElementById("frontGuideContent");
  const backContent = document.getElementById("backGuideContent");

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

  async function stopCameraForced(videoElement) {
    if (!videoElement) return;

    const currentStream = videoElement.srcObject;
    if (currentStream instanceof MediaStream) {
      currentStream.getTracks().forEach((track) => {
        track.stop();
      });
    }

    videoElement.pause();
    videoElement.srcObject = null;

    if (
      typeof detectionInterval !== "undefined" &&
      detectionInterval !== null
    ) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }

    console.log(`Camera forcibly stopped for video id=${videoElement.id}`);
  }

  async function clearCamera() {
    await stopCameraForced(document.getElementById("idVideo"));
    await stopCameraForced(document.getElementById("idBackVideo"));
    await stopCameraForced(document.getElementById("video"));
  }
  // ===========================
  // EVENT BINDINGS
  // ===========================
  if (submitKycFinal) {
    submitKycFinal.addEventListener("click", async () => {
      await clearCamera();
      sloaderContent.textContent = "submitting KYC";
      smainLoader.classList.remove("hidden");
      setTimeout(() => {
        smainLoader.classList.add("hidden");
      }, 3000);
    });
  }

  if (nextToStep2) {
    nextToStep2.addEventListener("click", async () => {
      document.getElementById("orientationGuide").classList.remove("hidden");
      await showOrientationGuide(
        "front",
        guide,
        sideText,
        frontContent,
        backContent
      );
      // alert("Please capture your ID before proceeding to the next step.");
      await stopCamera();
      await startIDCamera(
        // await getStep(),
        // idCaptureTitle,
        stream,
        idVideo,
        idOverlay,
        isMobile
        // await getShouldFaceUser(),
        // stopCamera
      );
    });
  }

  // retry camera for id capture when no back camera found
  document
    .getElementById("retryCameraBtn")
    .addEventListener("click", async () => {
      await clearCamera();
      document.getElementById("cameraError").classList.add("hidden");
      await startIDCamera(
        // await getStep(),
        // idCaptureTitle,
        stream,
        idVideo,
        idOverlay,
        isMobile
        // await getShouldFaceUser(),
        // stopCamera
      );
    });

  if (captureFrontIdBtn) {
    captureFrontIdBtn.addEventListener("click", async () => {
      const success = await captureID(
        "idFront",
        idCanvas,
        idVideo,
        shouldFaceUser,
        startIDCamera
      );

      if (success) {
        console.log("✅ ID front captured successfully.");
        await clearCamera();
        idCapturePage.classList.add("hidden");
        // open the id preview page
        document
          .getElementById("frontIdPreviewPage")
          .classList.remove("hidden");
        document.getElementById("frontIdPreviewImage").src =
          localStorage.getItem("frontUpload");
        document.getElementById("nextToStep3").disabled = false;
      } else {
        console.log("❌ Failed to capture ID front.");
      }
    });
  }

  // Close handlers
  // document.getElementById("closeGuideBtn").addEventListener("click", () => {
  //   document.getElementById("orientationGuide").classList.add("hidden");
  // });

  document.getElementById("gotItBtn").addEventListener("click", () => {
    document.getElementById("orientationGuide").classList.add("hidden");
  });
  // Call this when showing front/back capture:
  // showOrientationGuide('front') or showOrientationGuide('back')

  document
    .getElementById("tryAgainFontId")
    .addEventListener("click", async () => {
      document.getElementById("nextToStep3").disabled = true;

      // Reset the front ID preview
      document.getElementById("frontIdPreviewPage").classList.add("hidden");
      document.getElementById("frontIdPreviewImage").src = "";

      // Show the ID capture page again
      idCapturePage.classList.remove("hidden");

      // Clear the local storage for front upload
      localStorage.removeItem("frontUpload");

      // Restart the camera
      await startIDCamera(
        // await getStep(),
        // idCaptureTitle,
        stream,
        idVideo,
        idOverlay,
        isMobile
        // await getShouldFaceUser(),
        // stopCamera
      );
    });

  document.getElementById("backToStep1").addEventListener("click", async () => {
    await clearCamera();
  });

  document
    .getElementById("continueFrontId")
    .addEventListener("click", async (e) => {
      document.getElementById("nextToStep3").disabled = false;
      await clearCamera();
      e.currentTarget.classList.add("hidden"); // Works for the clicked button
      // this.classList.add("hidden");
      // alert(
      //   "Back ID capture is not implemented yet. Please proceed with the next steps."
      // );
    });

  // ===========================
  // ID Back Capture
  // ===========================
  if (nextToStep3) {
    nextToStep3.addEventListener("click", async () => {
      document.getElementById("orientationGuide").classList.remove("hidden");
      await showOrientationGuide(
        "back",
        guide,
        sideText,
        frontContent,
        backContent
      );
      // alert("Please capture your ID before proceeding to the next step.");
      await stopCamera();
      await startIDCamera(
        // await getStep(),
        // idCaptureTitle,
        stream,
        idBackVideo,
        idBackOverlay,
        isMobile
        // await getShouldFaceUser(),
        // stopCamera
      );
    });
  }
  if (captureBackIdBtn) {
    captureBackIdBtn.addEventListener("click", async () => {
      const success = await captureID(
        "idBack",
        idBackCanvas,
        idBackVideo,
        shouldFaceUser,
        startIDCamera
      );

      if (success) {
        console.log("✅ ID front captured successfully.");
        await clearCamera();
        idBackCapturePage.classList.add("hidden");
        // open the id preview page
        document.getElementById("backIdPreviewPage").classList.remove("hidden");
        document.getElementById("backIdPreviewImage").src =
          localStorage.getItem("backUpload");
        document.getElementById("nextToStep4").disabled = false;
      } else {
        console.log("❌ Failed to capture ID Back.");
      }
    });
  }
  document
    .getElementById("tryAgainBackId")
    .addEventListener("click", async () => {
      document.getElementById("nextToStep4").disabled = true;
      // Reset the front ID preview
      document.getElementById("backIdPreviewPage").classList.add("hidden");
      document.getElementById("backIdPreviewImage").src = "";

      // Show the ID capture page again
      idBackCapturePage.classList.remove("hidden");

      // Clear the local storage for front upload
      localStorage.removeItem("backUpload");

      // Restart the camera
      await startIDCamera(
        // await getStep(),
        // idCaptureTitle,
        stream,
        idBackVideo,
        idBackOverlay,
        isMobile
        // await getShouldFaceUser(),
        // stopCamera
      );
    });
  document
    .getElementById("continueBackId")
    .addEventListener("click", async (e) => {
      document.getElementById("nextToStep4").disabled = false;
      await clearCamera();
      e.currentTarget.classList.add("hidden"); // Works for the clicked button
      // this.classList.add("hidden");
      // alert(
      //   "Back ID capture is not implemented yet. Please proceed with the next steps."
      // );
    });
  document.getElementById("backToStep2").addEventListener("click", async () => {
    await clearCamera();
  });

  function showFaceGuide() {
    document.getElementById("faceGuide").classList.remove("hidden");
  }
  function hideFaceGuide() {
    document.getElementById("faceGuide").classList.add("hidden");
  }

  document
    .getElementById("startFaceCaptureBtn")
    .addEventListener("click", hideFaceGuide);

  if (nextToStep4) {
    nextToStep4.addEventListener("click", async () => {
      try {
        await stopCamera();
        showFaceGuide();

        // sloaderContent.textContent = "Loading camera";
        // smainLoader.classList.remove("hidden");
        // setTimeout(() => {
        //   smainLoader.classList.add("hidden");
        // }, 3000);
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
      document.getElementById("nextToStep5").disabled = true;
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
        document.getElementById("nextToStep5").disabled = false;
        // continueBtn.classList.remove("hidden");
      } else {
        console.log("❌ Failed to capture face.");
        // Optionally re-enable capture button for retry
        cameraPage.classList.add("hidden");
        previewPage.classList.remove("hidden");
        // continueBtn.classList.add("hidden");
        previewImage.src = `https://static.vecteezy.com/system/resources/previews/017/178/222/original/round-cross-mark-symbol-with-transparent-background-free-png.png`;
        captureBtn.disabled = true;
        document.getElementById("nextToStep5").disabled = true;
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
      document.getElementById("nextToStep5").disabled = false;
    });
  }

  document.getElementById("backToStep3").addEventListener("click", async () => {
    await clearCamera();
  });
  // ===========================
  // INIT
  // ===========================
  try {
    await loadModels(
      modelsLoaded,
      sloaderContent,
      sloaderContent2,
      smainLoader
    );
  } catch (error) {
    console.log("Initialization error:", error);
  }
});
