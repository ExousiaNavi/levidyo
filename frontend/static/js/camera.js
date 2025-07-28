document.addEventListener("DOMContentLoaded", () => {
  const con = document.getElementById("skeleton-loader-container");
  const loader = document.getElementById("skeleton-loader");
  const previewPage = document.getElementById("previewPage");
  const cameraPage = document.getElementById("cameraPage");
  const previewImage = document.getElementById("previewImage");
  const tryAgainBtn = document.getElementById("tryAgain");
  const submitBtn = document.getElementById("submit");
  if (loader) {
    con.style.opacity = "1";
    loader.style.opacity = "1";
    document.body.style.overflow = "hidden";
  }

  const video = document.getElementById("video");
  video.style.transform = "scaleX(-1)"; //remove the mirror effect
  const canvas = document.getElementById("canvas");
  const overlay = document.getElementById("overlay");
  const ctxOverlay = overlay.getContext("2d");
  const captureBtn = document.getElementById("capture");
  const encodedGallery = document.getElementById("encodedGallery");
  const decodeBtnGallery = document.getElementById("decodeBtnGallery");
  const decodedMessageGallery = document.getElementById(
    "decodedMessageGallery"
  );
  const statusText = document.getElementById("statusText");

  let selectedFilename = null;
  let loaderConHidden = false;
  let loaderHidden = false;
  let stream = null;
  let isSubmitting = false; // ✅ prevent duplicate

  async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/static/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/static/models");
  }

  async function runDetection() {
    await loadModels();
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });

    setInterval(async () => {
      // const isMobile = window.innerWidth < 500;
      const isMobile = window.matchMedia("(max-width: 500px)").matches;
      console.log(isMobile);

      const oblongHeight = isMobile
        ? overlay.height * 0.75
        : overlay.height * 0.7;
      // const oblongWidth = isMobile ? overlay.width * 0.8 : oblongHeight * 0.65;
      const oblongWidth = isMobile ? overlay.width * 0.8 : overlay.width * 0.4;

      const oblongX = (overlay.width - oblongWidth) / 2;
      const oblongY = (overlay.height - oblongHeight) / 2 - 50;

      const centerX = overlay.width / 2;
      const ellipseX = centerX;
      const ellipseY = oblongY + oblongHeight / 2;

      let color = "red";
      let message = "Align your face properly";

      const result = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks();

      if (result) {
        const { x, y, width, height } = result.detection.box;
        const faceCenterX = x + width / 2;
        const faceCenterY = y + height / 2;

        const landmarks = result.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();

        const eyeSlope = Math.abs(leftEye[0].y - rightEye[3].y);
        const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
        const noseX = nose[3].x;
        const noseOffset = Math.abs(eyeCenterX - noseX);

        const paddingW = oblongWidth * 0.2;
        const paddingTop = oblongHeight * 0.15;
        const paddingBottom = oblongHeight * 0.15;

        // ✅ Face edges
        const faceLeft = x;
        const faceRight = x + width;
        const faceTop = y;
        const faceBottom = y + height;

        const leftLimit = oblongX + paddingW;
        const rightLimit = oblongX + oblongWidth - paddingW;

        const horizontalTolerance = oblongWidth * 0.1; // 10% tolerance

        const isHorizontallyInside =
          faceLeft >= leftLimit - horizontalTolerance &&
          faceRight <= rightLimit + horizontalTolerance;

        const isTopInside =
          faceTop >= oblongY - oblongHeight * 0.1 &&
          faceTop <= oblongY + paddingTop + oblongHeight * 0.2;

        const bottomLimit = oblongY + oblongHeight - paddingBottom;
        const isBottomInside =
          faceBottom >= bottomLimit - 80 && faceBottom <= bottomLimit + 40;

        const isFaceCentered =
          isHorizontallyInside && isTopInside && isBottomInside;

        const isTooHigh = faceCenterY < oblongY + paddingTop;
        const isUpright = eyeSlope < 8 && noseOffset < 12;

        const faceArea = width * height;
        const frameArea = overlay.width * overlay.height;
        const areaRatio = faceArea / frameArea;
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
          message = "↔️ Move face to the center (left/right).";
        } else if (!isTopInside) {
          message = "⬇️ Lower your forehead slightly.";
        } else if (!isBottomInside) {
          message = "⬆️ Lift your chin a little.";
        } else if (!isFaceCentered) {
          message = isTooHigh
            ? "⬇️ Lower your chin slightly."
            : "↔️ Center your face in the frame.";
        } else {
          message = "↕️ Keep your head upright.";
        }

        document.querySelector("#face_position").innerHTML = `${message}`;
        console.log("DEBUG ➤", {
          eyeSlope,
          noseOffset,
          faceCenterX,
          faceCenterY,
          areaRatio,
          isFaceCentered,
          isTooHigh,
          isUpright,
          isFaceBigEnough,
          // isTopVisible,
          message,
        });
      }

      // UI Feedback
      captureBtn.disabled = color !== "lime";
      captureBtn.classList.toggle("opacity-50", color !== "lime");
      if (statusText) statusText.textContent = message;

      // Dim background
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.fillStyle = "rgba(0, 0, 0, 0.67)";
      ctxOverlay.fillRect(0, 0, overlay.width, overlay.height);

      ctxOverlay.save();
      ctxOverlay.globalCompositeOperation = "destination-out";
      ctxOverlay.beginPath();
      ctxOverlay.ellipse(
        ellipseX,
        ellipseY,
        oblongWidth / 2,
        oblongHeight / 2,
        0,
        0,
        Math.PI * 2
      );
      ctxOverlay.fill();
      ctxOverlay.restore();

      // Draw border
      ctxOverlay.save();
      ctxOverlay.beginPath();
      ctxOverlay.ellipse(
        ellipseX,
        ellipseY,
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

      // Hide loader
      if (!loaderHidden && loader) {
        con.style.opacity = "0";
        loader.style.opacity = "0";
        setTimeout(() => (loader.style.display = "none"), 400);
        loaderHidden = true;
        loaderConHidden = true;
        document.querySelector("#mdh").classList.remove("hidden");
        con.classList.add("hidden");
      }
    }, 200);
  }

  function setupCameraAndRunDetection() {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
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

  setupCameraAndRunDetection();

  captureBtn.onclick = () => {
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataURL = canvas.toDataURL("image/png");

    // Show preview page
    cameraPage.classList.add("hidden");
    previewPage.classList.add("fade-in"); // ✅ animation
    previewPage.classList.remove("hidden");
    previewImage.src = dataURL;

    // Stop camera
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    // canvas.toBlob((blob) => {
    //   const formData = new FormData();
    //   formData.append("image", blob, "captured.png");
    //   formData.append("message", "hidden message here");

    //   fetch("/upload-image", {
    //     method: "POST",
    //     body: formData,
    //   })
    //     .then((res) => res.json())
    //     .then(() => loadGallery())
    //     .catch(console.error);
    // }, "image/png");
  };

  function loadGallery() {
    fetch("/list-encoded-images")
      .then((res) => res.json())
      .then((data) => {
        encodedGallery.innerHTML = "";
        data.files.reverse().forEach((fn) => {
          const img = document.createElement("img");
          img.src = data.base_url + fn;
          img.className =
            "cursor-pointer rounded-xl border-4 border-transparent hover:border-blue-500 active:border-green-500 transition-all";
          img.dataset.filename = fn;

          img.onclick = () => {
            Array.from(encodedGallery.children).forEach((i) =>
              i.classList.remove("border-blue-500", "border-green-500")
            );
            img.classList.add("border-blue-500");
            selectedFilename = fn;
            decodeBtnGallery.classList.remove("hidden");
          };

          encodedGallery.prepend(img);
        });
      })
      .catch(console.error);
  }

  tryAgainBtn.onclick = () => {
    previewPage.classList.add("hidden");
    cameraPage.classList.remove("hidden");
    setupCameraAndRunDetection();
    // loadGallery()
  };

  submitBtn.onclick = () => {
    if (isSubmitting) return; // ✅ avoid duplicate
    isSubmitting = true;
    submitBtn.disabled = true;
    submitBtn.textContent = "⏳ Submitting...";

    canvas.toBlob((blob) => {
      const formData = new FormData();
      formData.append("image", blob, "captured.png");
      formData.append("message", "hidden message here");

      fetch("/upload-image", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then(() => {
          submitBtn.textContent = "✅ Submitted!";
        })
        .catch(console.error)
        .finally(() => {
          setTimeout(() => {
            isSubmitting = false;
            submitBtn.disabled = false;
            submitBtn.textContent = "Submit";
            previewPage.classList.add("hidden");
            cameraPage.classList.remove("hidden");
            setupCameraAndRunDetection();
            // loadGallery()
          }, 2000);
        });
    }, "image/png");
  };
  

  decodeBtnGallery.onclick = () => {
    if (!selectedFilename) return;
    fetch(`/decode-image?filename=${selectedFilename}`)
      .then((res) => res.json())
      .then((data) => {
        decodedMessageGallery.textContent = "🧩 Decoded Key: " + data.message;
      })
      .catch(console.error);
  };

  // window.addEventListener("load", loadGallery);
});
