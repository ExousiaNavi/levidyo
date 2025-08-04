import { loadModels } from "./module/models.js";
import { setupCameraAndRunDetection, startIDCamera } from "./module/camera.js";
import { hideCameraLoading, showCameraLoading } from "./module/loader.js";
import { runDetection } from "./module/detection.js";
import { showCameraError, hideCameraError } from "./module/error.js";
import { captureFace, captureID } from "./module/capture.js";
import { showFinalReview } from "./module/review.js";
import { delete_uploaded_face, delete_uploaded_id } from "./module/delete.js";
import { submitVerification, showVerificationLoader,showVerificationSuccess,showVerificationError,hideVerificationLoader } from "./module/submitVerification.js";
import {
  setStep,
  getStep,
  setShouldFaceUser,
  getShouldFaceUser,
  setCapturedFace,
  getCapturedFace,
  setCapturedFront,
  getCapturedFront,
  setCapturedBack,
  getCapturedBack,
  setRetryFace,
  getRetryFace,
  setRetryFront,
  getRetryFront,
  setRetryBack,
  getRetryBack,
  setUsername,
  getUsername,
} from "./module/state.js";

import { usernameValidation } from "./module/username.js";
import {
  file_selection,
  preventDefaults,
  handleDrop,
  unhighlight,
  highlight,
  uploadToServer,
  resetUploader,
} from "./module/upload.js";
document.addEventListener("DOMContentLoaded", async () => {
  // ===========================
  // ELEMENT REFERENCES
  // ===========================
  const con = document.getElementById("skeleton-loader-container");
  const loader = document.getElementById("skeleton-loader");
  const previewPage = document.getElementById("previewPage");
  const cameraPage = document.getElementById("cameraPage");
  const previewImage = document.getElementById("previewImage");
  const tryAgainBtn = document.getElementById("tryAgain");
  const submitBtn = document.getElementById("submit");
  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const overlay = document.getElementById("overlay");
  const ctxOverlay = overlay.getContext("2d");
  const captureBtn = document.getElementById("capture");
  const switchCamera = document.getElementById("switchCamera");
  const statusText = document.getElementById("statusText");
  const cameraLoading = document.getElementById("cameraLoading");
  const cameraError = document.getElementById("cameraError");
  // const faceUploadBtn = document.getElementById("faceUploadBtn");
  const faceUploadWrapper = document.getElementById("face-upload-wrapper");
  // const retryCameraBtn = document.getElementById("retryCamera");

  // ID Capture Elements
  const idCapturePage = document.getElementById("idCapturePage");
  const idVideo = document.getElementById("idVideo");
  const idCanvas = document.getElementById("idCanvas");
  const idOverlay = document.getElementById("idOverlay");
  const idCaptureTitle = document.getElementById("idCaptureTitle");
  const captureIDBtn = document.getElementById("captureID");

  // Final Review
  const finalReviewPage = document.getElementById("finalReviewPage");
  const reviewFace = document.getElementById("reviewFace");
  const reviewFront = document.getElementById("reviewFront");
  const reviewBack = document.getElementById("reviewBack");
  // const retryFaceBtn = document.getElementById("retryFace");
  const retryFrontBtn = document.getElementById("retryFront");
  const retryBackBtn = document.getElementById("retryBack");
  const finalSubmitBtn = document.getElementById("finalSubmit");

  // DOM Elements
  const fileFaceInput = document.getElementById("image-upload");
  const uploadBtn = document.getElementById("upload-btn");
  const previewContainer = document.getElementById("preview-container");
  const imagePreview = document.getElementById("image-preview");
  const fileName = document.getElementById("file-name");
  const fileSize = document.getElementById("file-size");
  const removeBtn = document.getElementById("remove-btn");
  const progressContainer = document.getElementById("progress-container");
  const progressBar = document.getElementById("progress-bar");
  const progressPercent = document.getElementById("progress-percent");

  // username
  const usernamePage = document.getElementById("usernamePage");
  const usernameBtn = document.getElementById("continueBtn");
  // ===========================
  // STATE VARIABLES
  // ===========================
  let loaderHidden = false;
  let stream = null;
  let detectionInterval = null;
  let modelsLoaded = false;

  // let currentStep = await getStep(); // face -> idFront -> idBack -> review
  let capturedFace = await getCapturedFace();
  // let capturedFront = await getCapturedFront();
  // let capturedBack = await getCapturedBack();
  let shouldFaceUser = await getShouldFaceUser(); // front camera default
  // let cardModelsLoaded = false;
  // let cardModel = null;

  // ===========================
  // INITIAL LOADER
  // ===========================
  if (loader) {
    con.style.opacity = "1";
    loader.style.opacity = "1";
    document.body.style.overflow = "hidden";
  }

  // Check device capabilities
  const supports = navigator.mediaDevices.getSupportedConstraints();
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );

  // Enable flip if supported
  if (supports["facingMode"]) {
    switchCamera.disabled = false;
  }

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

  async function updateInstruction(instruction) {
    console.log(instruction);
  }

  // ===========================
  // EVENT BINDINGS
  // ===========================
  if (captureBtn) {
    captureBtn.addEventListener("click", async () => {
      await captureFace(
        captureBtn,
        detectionInterval,
        cameraPage,
        video,
        canvas,
        capturedFace,
        previewPage,
        previewImage,
        submitBtn,
        setCapturedFace
        // getCapturedFace
      );
    });
  }

  // if (switchCamera) {
  //   switchCamera.addEventListener("click", async () => {
  //     shouldFaceUser = !shouldFaceUser;
  //     setShouldFaceUser(shouldFaceUser);
  //     // Stop previous streams (face or ID)
  //     if (stream) {
  //       stream.getTracks().forEach((track) => track.stop());
  //       stream = null;
  //     }

  //     // Clear video sources
  //     if (video) video.srcObject = null;
  //     if (idVideo) idVideo.srcObject = null;

  //     await new Promise((resolve) => setTimeout(resolve, 100));

  //     // Decide which camera to restart based on the active page
  //     if (!idCapturePage.classList.contains("hidden")) {
  //       await startIDCamera(
  //         currentStep,
  //         idCaptureTitle,
  //         stream,
  //         idVideo,
  //         idOverlay,
  //         isMobile,
  //         shouldFaceUser,
  //         stopCamera
  //       );
  //     } else {
  //       await setupCameraAndRunDetection(
  //         shouldFaceUser,
  //         stream,
  //         video,
  //         overlay,
  //         canvas,
  //         () =>
  //           showCameraLoading(cameraLoading, () =>
  //             hideCameraError(cameraLoading)
  //           ), // wrapped with params,
  //         () => hideCameraLoading(cameraLoading), // wrapped with params,
  //         () => stopCamera(),
  //         () =>
  //           runDetection(
  //             detectionInterval,
  //             isMobile,
  //             overlay,
  //             video,
  //             captureBtn,
  //             statusText,
  //             ctxOverlay,
  //             loaderHidden,
  //             loader,
  //             con
  //           ),
  //         cameraError,
  //         showCameraError
  //       );
  //     }
  //   });
  // }

  if (tryAgainBtn) {
    tryAgainBtn.addEventListener("click", async () => {
      const uploadedFilename =
        document.getElementById("uploadedFilename").value;
      console.log(uploadedFilename);

      await delete_uploaded_face(uploadedFilename);

      if (previewPage) previewPage.classList.add("hidden");
      if (cameraPage) cameraPage.classList.remove("hidden");

      const frozenFrame = document.getElementById("frozenFrame");
      if (frozenFrame) frozenFrame.remove();

      if (video) video.classList.remove("hidden");

      if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
      }
      await runDetection(
        detectionInterval,
        isMobile,
        overlay,
        video,
        captureBtn,
        statusText,
        ctxOverlay,
        loaderHidden,
        loader,
        con
      );
    });
  }

  if (submitBtn) {
    submitBtn.addEventListener("click", async () => {
      let r = localStorage.getItem("retryFace");
      console.log(r);
      const isRetri = r === true || r === "true"; // explicit
      console.log(isRetri);
      if (isRetri) {
        console.log("ginagawa");
        await showFinalReview(
          idCapturePage,
          finalReviewPage,
          reviewFace,
          reviewFront,
          reviewBack,
          await getCapturedFace(),
          await getCapturedFront(),
          await getCapturedBack()
        );
        if (previewPage) previewPage.classList.add("hidden");
        if (finalReviewPage) finalReviewPage.classList.remove("hidden");
      } else {
        if (previewPage) previewPage.classList.add("hidden");
        if (idCapturePage) idCapturePage.classList.remove("hidden");
        setStep("idFront");
        await startIDCamera(
          await getStep(),
          idCaptureTitle,
          stream,
          idVideo,
          idOverlay,
          isMobile,
          await getShouldFaceUser(),
          stopCamera
        );
      }
    });
  }

  if (captureIDBtn) {
    captureIDBtn.addEventListener("click", async () => {
      let ri = localStorage.getItem("retryFront");
      console.log(ri);
      const isRetriID = ri === true || ri === "true"; // explicit
      if (isRetriID) {
        if (finalReviewPage) finalReviewPage.classList.remove("hidden");
        if (idCapturePage) idCapturePage.classList.add("hidden");
      }

      await captureID(
        isRetriID,
        idCanvas,
        idVideo,
        await getStep(),
        await getCapturedFront(),
        await getCapturedBack(),
        await getShouldFaceUser(),
        async () =>
          startIDCamera(
            await getStep(),
            idCaptureTitle,
            stream,
            idVideo,
            idOverlay,
            isMobile,
            await getShouldFaceUser(),
            () => stopCamera()
            // () => setStep()
          ),
        updateInstruction,
        setStep,
        setShouldFaceUser,
        setCapturedFront,
        setCapturedBack,
        async () =>
          showFinalReview(
            idCapturePage,
            finalReviewPage,
            reviewFace,
            reviewFront,
            reviewBack,
            await getCapturedFace(),
            await getCapturedFront(),
            await getCapturedBack()
          )
      );
    });
  }

  // if (retryCameraBtn) {
  //   retryCameraBtn.addEventListener("click", setupCameraAndRunDetection);
  // }

  // if (retryFaceBtn) {
  //   retryFaceBtn.addEventListener("click", async () => {
  //     try {
  //       await setStep("face");
  //       await setRetryFace(true);
  //       await setRetryBack(false);
  //       await setRetryFront(false);

  //       if (finalReviewPage) finalReviewPage.classList.add("hidden");
  //       if (previewPage) previewPage.classList.add("hidden");
  //       if (cameraPage) cameraPage.classList.remove("hidden");

  //       const frozenFrame = document.getElementById("frozenFrame");
  //       if (frozenFrame) frozenFrame.remove();

  //       if (video) video.classList.remove("hidden");

  //       if (detectionInterval) {
  //         clearInterval(detectionInterval);
  //         detectionInterval = null;
  //       }

  //       await runDetection(
  //         detectionInterval,
  //         isMobile,
  //         overlay,
  //         video,
  //         captureBtn,
  //         statusText,
  //         ctxOverlay,
  //         loaderHidden,
  //         loader,
  //         con
  //       );
  //     } catch (error) {
  //       console.error("Error in retryFaceBtn click handler:", error);
  //     }
  //   });
  // }

  if (retryFrontBtn) {
    retryFrontBtn.addEventListener("click", async () => {
      // Show loader before any await
      document.getElementById("retryLoader")?.classList.remove("hidden");

      await setStep("idFront");

      const uploadedFilenameIdFront = document.getElementById(
        "uploadedFilenameIdFront"
      ).value;
      console.log(uploadedFilenameIdFront);

      await delete_uploaded_id(uploadedFilenameIdFront);

      await setRetryFace(false);
      await setRetryBack(false);
      await setRetryFront(true);

      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }

      if (video) video.srcObject = null;
      if (idVideo) idVideo.srcObject = null;

      await new Promise((resolve) => setTimeout(resolve, 100));
      if (finalReviewPage) finalReviewPage.classList.add("hidden");
      if (idCapturePage) idCapturePage.classList.remove("hidden");

      await startIDCamera(
        await getStep(),
        idCaptureTitle,
        stream,
        idVideo,
        idOverlay,
        isMobile,
        await getShouldFaceUser(),
        stopCamera
      );

      // ✅ Hide loader once camera setup is done
      document.getElementById("retryLoader")?.classList.add("hidden");
    });
  }

  if (retryBackBtn) {
    retryBackBtn.addEventListener("click", async () => {
      // Show loader before any await
      document.getElementById("retryLoader")?.classList.remove("hidden");
      await setStep("idBack");

      const uploadedFilenameIdBack = document.getElementById(
        "uploadedFilenameIdBack"
      ).value;
      console.log(uploadedFilenameIdBack);

      await delete_uploaded_id(uploadedFilenameIdBack);

      await setRetryFace(false);
      await setRetryBack(false);
      await setRetryFront(true);

      // Stop previous streams (face or ID)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }

      // Clear video sources
      if (video) video.srcObject = null;
      if (idVideo) idVideo.srcObject = null;

      await new Promise((resolve) => setTimeout(resolve, 100));
      if (finalReviewPage) finalReviewPage.classList.add("hidden");
      if (idCapturePage) idCapturePage.classList.remove("hidden");

      await startIDCamera(
        await getStep(),
        idCaptureTitle,
        stream,
        idVideo,
        idOverlay,
        isMobile,
        await getShouldFaceUser(),
        stopCamera
      );

      // ✅ Hide loader once camera setup is done
      document.getElementById("retryLoader")?.classList.add("hidden");
    });
  }

  if (removeBtn) {
    // Remove file
    removeBtn.addEventListener("click", async () => {
      await resetUploader(
        fileFaceInput,
        imagePreview,
        fileName,
        fileSize,
        previewContainer,
        uploadBtn,
        progressContainer,
        progressBar,
        progressPercent
      );
    });
  }

  // username events
  if (usernameBtn) {
    usernameBtn.addEventListener("click", async () => {
      const usernameInput = document.getElementById("username").value;
      const usernameError = document.getElementById("username-error");
      const usernameSuccess = document.getElementById("successLoaderUsername");
      try {
        const isValid = await usernameValidation(usernameInput, setUsername);

        if (!isValid) {
          // ❌ Username invalid
          // alert("Invalid username. Please try again.");
          usernameError.classList.remove("hidden");
          setTimeout(() => usernameError.classList.add("hidden"), 3000);
          return;
        }

        // ✅ Username is valid
        console.log("Username validated successfully");
        usernameSuccess.classList.remove("hidden");
        setTimeout(() => usernameSuccess.classList.add("hidden"), 3000);
        usernamePage.classList.add("hidden");
        cameraPage.classList.remove("hidden");
      } catch (error) {
        // 🚨 Handle network or server errors
        console.error("Validation error:", error);
        alert("An error occurred while validating the username.");
      }
    });
  }
  // NOT NEEDED FOR THIS UPDATES
  // if (faceUploadBtn) {
  //   faceUploadBtn.addEventListener("click", async () => {
  //     let currentStep = await getStep();
  //     localStorage.setItem("manual", "1");
  //     console.log(currentStep);
  //     // alert("yes")
  //     if (cameraPage) cameraPage.classList.add("hidden");

  //     if (video) video.classList.add("hidden");

  //     if (detectionInterval) {
  //       clearInterval(detectionInterval);
  //       detectionInterval = null;
  //     }

  //     faceUploadWrapper.classList.remove("hidden");

  //     await file_selection(
  //       fileFaceInput,
  //       imagePreview,
  //       fileName,
  //       fileSize,
  //       previewContainer,
  //       uploadBtn
  //     );

  //     await resetUploader(
  //       fileFaceInput,
  //       imagePreview,
  //       fileName,
  //       fileSize,
  //       previewContainer,
  //       uploadBtn,
  //       progressContainer,
  //       progressBar,
  //       progressPercent
  //     );

  //     // Handle drag and drop
  //     const dropArea = document.querySelector(".border-dashed");

  //     ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
  //       dropArea.addEventListener(eventName, (e) => preventDefaults(e), false);
  //     });

  //     ["dragenter", "dragover"].forEach((eventName) => {
  //       dropArea.addEventListener(
  //         eventName,
  //         async (e) => {
  //           await highlight(dropArea);
  //         },
  //         false
  //       );
  //     });

  //     ["dragleave", "drop"].forEach((eventName) => {
  //       dropArea.addEventListener(
  //         eventName,
  //         async (e) => {
  //           await unhighlight(dropArea);
  //         },
  //         false
  //       );
  //     });

  //     dropArea.addEventListener(
  //       "drop",
  //       async (e) => await handleDrop(e),
  //       false
  //     );

  //     await uploadToServer(
  //       uploadBtn,
  //       fileFaceInput,
  //       progressContainer,
  //       progressBar,
  //       progressPercent,
  //       imagePreview,
  //       fileName,
  //       fileSize,
  //       previewContainer,
  //       async () =>
  //         showFinalReview(
  //           faceUploadWrapper,
  //           finalReviewPage,
  //           reviewFace,
  //           reviewFront,
  //           reviewBack,
  //           await getCapturedFace(),
  //           await getCapturedFront(),
  //           await getCapturedBack()
  //         )
  //       // currentStep
  //     );

  //     // await resetUploader(
  //     //   fileFaceInput,
  //     //   imagePreview,
  //     //   fileName,
  //     //   fileSize,
  //     //   previewContainer,
  //     //   uploadBtn,
  //     //   progressContainer,
  //     //   progressBar,
  //     //   progressPercent
  //     // );
  //   });
  // }

  if (finalSubmitBtn) {
    finalSubmitBtn.addEventListener("click", async () => {
      await showVerificationLoader();
      const payload = {
        face: await getCapturedFace(),
        front: await getCapturedFront(),
        back: await getCapturedBack(),
        username: await getUsername(),
      };

      console.log("Submit all images", payload);

      const result = await submitVerification(payload);

      if (result.success) {
        await showVerificationSuccess()
        await resetState();
        // alert("✅ Submitted successfully!");
      } else {
        await showVerificationError()
        // alert("❌ Submission failed: " + result.message);
      }

      await hideVerificationLoader()
      window.location.reload();
    });
  }

  //reset state
  async function resetState() {
    await setUsername("");
    await setStep("face");
    await setRetryFace(false);
    await setRetryFront(false);
    await setRetryBack(false);
    await setCapturedFace("");
    await setCapturedFront("");
    await setCapturedBack("");
    localStorage.setItem("manual", 0);
  }
  // Handle page visibility changes
  document.addEventListener("visibilitychange", async () => {
    if (document.hidden) {
      stopCamera();
    } else if (
      !stream &&
      cameraPage &&
      !cameraPage.classList.contains("hidden")
    ) {
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
            loaderHidden,
            loader,
            con
          ),
        cameraError,
        showCameraError
      );
    }
  });

  // Handle orientation changes
  window.addEventListener("orientationchange", () => {
    if (stream) {
      setTimeout(() => {
        if (overlay && video) {
          overlay.width = video.videoWidth;
          overlay.height = video.videoHeight;
        }
      }, 500);
    }
  });

  // Add resize observer to handle container size changes
  const resizeObserver = new ResizeObserver(() => {
    if (stream && video && idVideo) {
      // Recalculate video display when container size changes
      const videoAspect = video.videoWidth / video.videoHeight;
      const videoIdAspect = idVideo.videoWidth / idVideo.videoHeight;
      const wrapper = document.getElementById("camera-wrapper");
      const wrapperId = document.getElementById("camera-id-wrapper");
      const wrapperAspect = wrapper.clientWidth / wrapper.clientHeight;
      const wrapperIdAspect = wrapperId.clientWidth / wrapperId.clientHeight;

      if (videoAspect > wrapperAspect && videoIdAspect > wrapperIdAspect) {
        video.style.width = "100%";
        video.style.height = "auto";
        idVideo.style.width = "100%";
        idVideo.style.height = "auto";
      } else {
        video.style.width = "auto";
        video.style.height = "100%";
        idVideo.style.width = "auto";
        idVideo.style.height = "100%";
      }
    }
  });

  // Observe the camera wrapper
  const cameraWrapper = document.getElementById("camera-wrapper");
  if (cameraWrapper) {
    resizeObserver.observe(cameraWrapper);
  }

  // ===========================
  // INIT
  // ===========================
  try {
    await loadModels(modelsLoaded);
    await resetState();
    // await loadCardModels(); // ✅ ensures coco-ssd loads only when needed
    await setupCameraAndRunDetection(
      shouldFaceUser,
      stream,
      video,
      overlay,
      canvas,
      () =>
        showCameraLoading(cameraLoading, () => hideCameraError(cameraLoading)), // wrapped with params,
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
          loaderHidden,
          loader,
          con
        ),
      cameraError,
      showCameraError
    );
  } catch (error) {
    console.log("Initialization error:", error);
    // alert("Failed to initialize application. Please refresh the page.");
  }
});
