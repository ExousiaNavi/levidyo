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
  const retryFaceBtn = document.getElementById("retryFace");
  const retryFrontBtn = document.getElementById("retryFront");
  const retryBackBtn = document.getElementById("retryBack");
  const finalSubmitBtn = document.getElementById("finalSubmit");

  // ===========================
  // STATE VARIABLES
  // ===========================
  let loaderHidden = false;
  let stream = null;
  let detectionInterval = null;
  let modelsLoaded = false;

  let currentStep = "face";
  let capturedFace = null;
  let capturedFront = null;
  let capturedBack = null;

  // Camera state (front/back)
  let shouldFaceUser = true;

  if (loader) {
    con.style.opacity = "1";
    loader.style.opacity = "1";
    document.body.style.overflow = "hidden";
  }

  video.style.transform = "scaleX(-1)";
  idVideo.style.transform = "scaleX(-1)";

  // ===========================
  // FUNCTIONS
  // ===========================
  function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
  }

  async function loadModels() {
    if (modelsLoaded) return;
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri("/static/models"),
      faceapi.nets.faceLandmark68Net.loadFromUri("/static/models"),
    ]);
    modelsLoaded = true;
  }

  function runDetection() {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
    if (detectionInterval) clearInterval(detectionInterval);

    detectionInterval = setInterval(async () => {
      const isMobile = window.matchMedia("(max-width: 500px)").matches;
      const oblongHeight = isMobile
        ? overlay.height * 0.75
        : overlay.height * 0.7;
      const oblongWidth = isMobile ? overlay.width * 0.8 : overlay.width * 0.4;
      const oblongX = (overlay.width - oblongWidth) / 2;
      const oblongY = (overlay.height - oblongHeight) / 2 - 50;

      let color = "red";
      let message = "Align your face properly";

      const result = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks();

      if (result) {
        const { x, y, width, height } = result.detection.box;
        const faceCenterY = y + height / 2;
        const landmarks = result.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();

        const eyeSlope = Math.abs(leftEye[0].y - rightEye[3].y);
        const noseOffset = Math.abs(
          (leftEye[0].x + rightEye[3].x) / 2 - nose[3].x
        );
        const paddingW = oblongWidth * 0.2;
        const paddingTop = oblongHeight * 0.15;
        const paddingBottom = oblongHeight * 0.15;

        const isHorizontallyInside =
          x >= oblongX + paddingW - oblongWidth * 0.1 &&
          x + width <= oblongX + oblongWidth - paddingW + oblongWidth * 0.1;

        const isTopInside =
          y >= oblongY - oblongHeight * 0.1 &&
          y <= oblongY + paddingTop + oblongHeight * 0.2;

        const isBottomInside =
          y + height >= oblongY + oblongHeight - paddingBottom - 80 &&
          y + height <= oblongY + oblongHeight - paddingBottom + 40;

        const isFaceCentered =
          isHorizontallyInside && isTopInside && isBottomInside;
        const isTooHigh = faceCenterY < oblongY + paddingTop;
        const isUpright = eyeSlope < 8 && noseOffset < 12;

        const areaRatio = (width * height) / (overlay.width * overlay.height);
        const isFaceBigEnough = areaRatio > 0.2 && areaRatio <= 0.32;
        const isFaceTooClose = areaRatio > 0.32;

        if (isFaceBigEnough && isFaceCentered && isUpright) {
          color = "lime";
          message = "✅ Perfect position!";
        } else if (isFaceTooClose) {
          message = "📏 Move slightly back.";
        } else if (!isFaceBigEnough) {
          message = "📷 Move closer.";
        } else if (!isHorizontallyInside) {
          message = "↔️ Center face.";
        } else if (!isTopInside) {
          message = "⬇️ Lower forehead.";
        } else if (!isBottomInside) {
          message = "⬆️ Lift chin.";
        } else if (!isFaceCentered) {
          message = isTooHigh ? "⬇️ Lower chin." : "↔️ Center face.";
        } else {
          message = "↕️ Keep head upright.";
        }

        document.querySelector("#face_position").innerHTML = message;
      }

      captureBtn.disabled = color !== "lime";
      captureBtn.classList.toggle("opacity-50", color !== "lime");
      if (statusText) statusText.textContent = message;

      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.fillStyle = "rgba(0, 0, 0, 0.67)";
      ctxOverlay.fillRect(0, 0, overlay.width, overlay.height);

      ctxOverlay.save();
      ctxOverlay.globalCompositeOperation = "destination-out";
      ctxOverlay.beginPath();
      ctxOverlay.ellipse(
        overlay.width / 2,
        oblongY + oblongHeight / 2,
        oblongWidth / 2,
        oblongHeight / 2,
        0,
        0,
        Math.PI * 2
      );
      ctxOverlay.fill();
      ctxOverlay.restore();

      ctxOverlay.save();
      ctxOverlay.beginPath();
      ctxOverlay.ellipse(
        overlay.width / 2,
        oblongY + oblongHeight / 2,
        oblongWidth / 2,
        oblongHeight / 2,
        0,
        0,
        Math.PI * 2
      );
      ctxOverlay.strokeStyle = color;
      ctxOverlay.lineWidth = 4;
      ctxOverlay.shadowBlur = 15;
      ctxOverlay.shadowColor = color;
      ctxOverlay.stroke();
      ctxOverlay.restore();

      if (!loaderHidden && loader) {
        con.style.opacity = "0";
        loader.style.opacity = "0";
        setTimeout(() => (loader.style.display = "none"), 400);
        loaderHidden = true;
        document.querySelector("#mdh").classList.remove("hidden");
        con.classList.add("hidden");
      }
    }, 200);
  }

  async function setupCameraAndRunDetection() {
    stopCamera();

    const constraints = {
      audio: false,
      video: {
        facingMode: shouldFaceUser ? "user" : "environment",
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
    };

    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
      video.srcObject = stream;
      await video.play();

      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      video.style.transform = shouldFaceUser ? "scaleX(-1)" : "scaleX(1)";
      runDetection();
    } catch (error) {
      alert("Unable to access camera: " + error.message);
    }
  }

  function captureFace() {
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    clearInterval(detectionInterval);

    const frozenFrame = document.createElement("img");
    frozenFrame.src = canvas.toDataURL("image/png");
    frozenFrame.id = "frozenFrame";
    frozenFrame.className = "absolute top-0 left-0 w-full h-full object-cover";
    cameraPage.appendChild(frozenFrame);
    video.classList.add("hidden");

    document.getElementById("captureLoader").classList.remove("hidden");

    canvas.toBlob((blob) => {
      const formData = new FormData();
      formData.append("image", blob, "captured.png");
      formData.append("message", "hidden message here");

      fetch("/upload-image", { method: "POST", body: formData })
        .then((res) => res.json())
        .then((data) => {
          submitBtn.textContent = "✅ Next";
          cameraPage.classList.add("hidden");
          previewPage.classList.add("fade-in");
          previewPage.classList.remove("hidden");
          previewImage.src = data.image_url;
        })
        .catch(console.error)
        .finally(() => {
          document.getElementById("captureLoader").classList.add("hidden");
        });
    }, "image/png");
  }

  function proceedToIDCapture() {
    previewPage.classList.add("hidden");
    idCapturePage.classList.remove("hidden");
    currentStep = "idFront";
    startIDCamera();
  }

  function startIDCamera() {
    const label =
      currentStep === "idFront" ? "Capture Front of ID" : "Capture Back of ID";
    idCaptureTitle.textContent = label;

    navigator.mediaDevices
      .getUserMedia({ video: true })
      .then((cameraStream) => {
        idVideo.srcObject = cameraStream;
        idVideo.play();
        idOverlay.width = idVideo.videoWidth || 640;
        idOverlay.height = idVideo.videoHeight || 480;
      })
      .catch(console.error);
  }

  function captureID() {
    const ctx = idCanvas.getContext("2d");
    ctx.drawImage(idVideo, 0, 0, idCanvas.width, idCanvas.height);
    const img = idCanvas.toDataURL("image/png");

    if (currentStep === "idFront") {
      capturedFront = img;
      currentStep = "idBack";
      startIDCamera();
    } else if (currentStep === "idBack") {
      capturedBack = img;
      showFinalReview();
    }
  }

  function showFinalReview() {
    idCapturePage.classList.add("hidden");
    finalReviewPage.classList.remove("hidden");

    reviewFace.src = capturedFace;
    reviewFront.src = capturedFront;
    reviewBack.src = capturedBack;
  }

  // ===========================
  // EVENT BINDINGS
  // ===========================
  captureBtn.addEventListener("click", captureFace);

  switchCamera.addEventListener("click", async () => {
    shouldFaceUser = !shouldFaceUser;
    await setupCameraAndRunDetection();
  });

  tryAgainBtn.addEventListener("click", () => {
    previewPage.classList.add("hidden");
    cameraPage.classList.remove("hidden");

    const frozenFrame = document.getElementById("frozenFrame");
    if (frozenFrame) frozenFrame.remove();

    video.classList.remove("hidden");

    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
    runDetection();
  });

  submitBtn.addEventListener("click", proceedToIDCapture);
  captureIDBtn.addEventListener("click", captureID);

  retryFaceBtn.addEventListener("click", () => {
    finalReviewPage.classList.add("hidden");
    cameraPage.classList.remove("hidden");
  });

  retryFrontBtn.addEventListener("click", () => {
    finalReviewPage.classList.add("hidden");
    idCapturePage.classList.remove("hidden");
    currentStep = "idFront";
    startIDCamera();
  });

  retryBackBtn.addEventListener("click", () => {
    finalReviewPage.classList.add("hidden");
    idCapturePage.classList.remove("hidden");
    currentStep = "idBack";
    startIDCamera();
  });

  finalSubmitBtn.addEventListener("click", () => {
    console.log("Submit all images", {
      capturedFace,
      capturedFront,
      capturedBack,
    });
    alert("Submitted successfully!");
  });

  // ===========================
  // INIT
  // ===========================
  navigator.mediaDevices.getUserMedia({video:true})
    .then(s => document.querySelector('video').srcObject = s)
    .catch(e => alert(e.name));
  await loadModels();
  await setupCameraAndRunDetection();

});
