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
  const encodedGallery = document.getElementById("encodedGallery");
  const decodeBtnGallery = document.getElementById("decodeBtnGallery");
  const decodedMessageGallery = document.getElementById("decodedMessageGallery");
  const statusText = document.getElementById("statusText");

  // ===========================
  // STATE VARIABLES
  // ===========================
  let selectedFilename = null;
  let loaderHidden = false;
  let stream = null;
  let detectionInterval = null;
  let isSubmitting = false;
  let modelsLoaded = false;

  // ===========================
  // INITIAL LOADER
  // ===========================
  if (loader) {
    con.style.opacity = "1";
    loader.style.opacity = "1";
    document.body.style.overflow = "hidden";
  }

  // Mirror camera
  video.style.transform = "scaleX(-1)";

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

  async function runDetection() {
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
    if (detectionInterval) clearInterval(detectionInterval);

    detectionInterval = setInterval(async () => {
      const isMobile = window.matchMedia("(max-width: 500px)").matches;
      const oblongHeight = isMobile ? overlay.height * 0.75 : overlay.height * 0.7;
      const oblongWidth = isMobile ? overlay.width * 0.8 : overlay.width * 0.4;
      const oblongX = (overlay.width - oblongWidth) / 2;
      const oblongY = (overlay.height - oblongHeight) / 2 - 50;

      let color = "red";
      let message = "Align your face properly";

      const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks();

      if (result) {
        const { x, y, width, height } = result.detection.box;
        const faceCenterY = y + height / 2;
        const landmarks = result.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();

        const eyeSlope = Math.abs(leftEye[0].y - rightEye[3].y);
        const noseOffset = Math.abs(((leftEye[0].x + rightEye[3].x) / 2) - nose[3].x);
        const paddingW = oblongWidth * 0.2;
        const paddingTop = oblongHeight * 0.15;
        const paddingBottom = oblongHeight * 0.15;

        const isHorizontallyInside =
          x >= oblongX + paddingW - oblongWidth * 0.1 &&
          x + width <= oblongX + oblongWidth - paddingW + oblongWidth * 0.1;

        const isTopInside = y >= oblongY - oblongHeight * 0.1 &&
                            y <= oblongY + paddingTop + oblongHeight * 0.2;

        const isBottomInside =
          y + height >= oblongY + oblongHeight - paddingBottom - 80 &&
          y + height <= oblongY + oblongHeight - paddingBottom + 40;

        const isFaceCentered = isHorizontallyInside && isTopInside && isBottomInside;
        const isTooHigh = faceCenterY < oblongY + paddingTop;
        const isUpright = eyeSlope < 8 && noseOffset < 12;

        const areaRatio = (width * height) / (overlay.width * overlay.height);
        const isFaceBigEnough = areaRatio > 0.2 && areaRatio <= 0.32;
        const isFaceTooClose = areaRatio > 0.32;

        if (isFaceBigEnough && isFaceCentered && isUpright) {
          color = "lime";
          message = "✅ Perfect position! Hold still for a moment.";
        } else if (isFaceTooClose) {
          message = "📏 Move slightly back from the camera.";
        } else if (!isFaceBigEnough) {
          message = "📷 Move a bit closer to the camera.";
        } else if (!isHorizontallyInside) {
          message = "↔️ Move face to the center.";
        } else if (!isTopInside) {
          message = "⬇️ Lower your forehead slightly.";
        } else if (!isBottomInside) {
          message = "⬆️ Lift your chin a little.";
        } else if (!isFaceCentered) {
          message = isTooHigh ? "⬇️ Lower your chin slightly." : "↔️ Center your face.";
        } else {
          message = "↕️ Keep your head upright.";
        }

        document.querySelector("#face_position").innerHTML = message;
      }

      // UI Feedback
      if (captureBtn) {
        captureBtn.disabled = color !== "lime";
        captureBtn.classList.toggle("opacity-50", color !== "lime");
      }
      if (statusText) statusText.textContent = message;

      // Overlay
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.fillStyle = "rgba(0, 0, 0, 0.67)";
      ctxOverlay.fillRect(0, 0, overlay.width, overlay.height);

      ctxOverlay.save();
      ctxOverlay.globalCompositeOperation = "destination-out";
      ctxOverlay.beginPath();
      ctxOverlay.ellipse(overlay.width / 2, oblongY + oblongHeight / 2, oblongWidth / 2, oblongHeight / 2, 0, 0, Math.PI * 2);
      ctxOverlay.fill();
      ctxOverlay.restore();

      ctxOverlay.save();
      ctxOverlay.beginPath();
      ctxOverlay.ellipse(overlay.width / 2, oblongY + oblongHeight / 2, oblongWidth / 2, oblongHeight / 2, 0, 0, Math.PI * 2);
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

  function setupCameraAndRunDetection() {
    if (stream) return runDetection();
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then((cameraStream) => {
        stream = cameraStream;
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.addEventListener("loadeddata", () => {
          video.play().then(() => {
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            runDetection();
          });
        });
      })
      .catch(console.error);
  }

  async function captureImage() {
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

  function tryAgain() {
    previewPage.classList.add("hidden");
    cameraPage.classList.remove("hidden");
    const frozenFrame = document.getElementById("frozenFrame");
    if (frozenFrame) frozenFrame.remove();
    video.classList.remove("hidden");
    // ✅ Restart detection even if stream exists
    if (detectionInterval) {
      clearInterval(detectionInterval);
      detectionInterval = null;
    }
    runDetection(); 
  }

  function submitImage() {
    isSubmitting = false;
    submitBtn.disabled = false;
    submitBtn.textContent = "✅ Next";
    previewPage.classList.add("hidden");
    cameraPage.classList.remove("hidden");
    const frozenFrame = document.getElementById("frozenFrame");
    if (frozenFrame) frozenFrame.remove();
    video.classList.remove("hidden");
    if (!detectionInterval) runDetection();
  }

  function decodeImage() {
    if (!selectedFilename) return;
    fetch(`/decode-image?filename=${selectedFilename}`)
      .then((res) => res.json())
      .then((data) => {
        decodedMessageGallery.textContent = "🧩 Decoded Key: " + data.message;
      })
      .catch(console.error);
  }

  // ===========================
  // EVENT BINDINGS (Safe)
  // ===========================
  captureBtn?.addEventListener("click", captureImage);
  tryAgainBtn?.addEventListener("click", tryAgain);
  submitBtn?.addEventListener("click", submitImage);
  decodeBtnGallery?.addEventListener("click", decodeImage);

  // ===========================
  // INIT
  // ===========================
  await loadModels();
  setupCameraAndRunDetection();
});
