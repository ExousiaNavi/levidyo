document.addEventListener("DOMContentLoaded", () => {
  const loader = document.getElementById("loader");
  if (loader) loader.style.opacity = "1";

  const frameImage = new Image();
  frameImage.src = "/static/logo/b.png";
  frameImage.crossOrigin = "Anonymous";

  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const overlay = document.getElementById("overlay");
  const ctxOverlay = overlay.getContext("2d");
  const captureBtn = document.getElementById("capture");
  const encodedGallery = document.getElementById("encodedGallery");
  const decodeBtnGallery = document.getElementById("decodeBtnGallery");
  const decodedMessageGallery = document.getElementById("decodedMessageGallery");
  const statusText = document.getElementById("statusText");

  let width_multiplier = 0.7;
  if (window.innerWidth < 768) {
    console.log(window.innerWidth, "is smaller than 768px, adjusting width_multiplier");
    width_multiplier = 0.9;
  }

  let selectedFilename = null;
  let loaderHidden = false;

  async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/static/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/static/models");
  }

  async function runDetection() {
    await loadModels();
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });

    const buffer = document.createElement("canvas");
    const ctxBuffer = buffer.getContext("2d");

    setInterval(async () => {
      const frameWidth = overlay.width * width_multiplier;
      const frameHeight = overlay.height;
      const centerX = (overlay.width - frameWidth) / 2;
      const centerY = (overlay.height - frameHeight) / 2 + 40;

      buffer.width = overlay.width;
      buffer.height = overlay.height;

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

        const padding = 40;
        const frameCenterX = centerX + frameWidth / 2;
        const frameCenterY = centerY + frameHeight * 0.4;
        const isFaceCentered =
          Math.abs(faceCenterX - frameCenterX) < padding &&
          Math.abs(faceCenterY - frameCenterY) < padding;
        const isUpright = eyeSlope < 10 && noseOffset < 15;

        const faceArea = width * height;
        const frameArea = overlay.width * overlay.height;
        const minFaceAreaRatio = 0.05;
        const isFaceBigEnough = faceArea / frameArea > minFaceAreaRatio;

        if (isFaceBigEnough && isFaceCentered && isUpright) {
          color = "lime";
          message = "";
        } else if (!isFaceBigEnough) {
          message = "Move closer to the camera";
        } else {
          message = "Align your face properly";
        }
      }

      captureBtn.disabled = color !== "lime";
      captureBtn.classList.toggle("opacity-50", color !== "lime");
      if (statusText) statusText.textContent = message;

      ctxBuffer.clearRect(0, 0, buffer.width, buffer.height);
      ctxBuffer.drawImage(video, 0, 0, buffer.width, buffer.height);

      ctxBuffer.globalCompositeOperation = "destination-in";
      if (frameImage.complete && frameImage.naturalWidth !== 0) {
        ctxBuffer.drawImage(frameImage, centerX, centerY, frameWidth, frameHeight);
      } else {
        ctxBuffer.fillRect(centerX, centerY, frameWidth, frameHeight);
      }
      ctxBuffer.globalCompositeOperation = "source-over";

      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctxOverlay.fillRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.drawImage(buffer, 0, 0);

      if (frameImage.complete && frameImage.naturalWidth !== 0) {
        const offCanvas = document.createElement("canvas");
        offCanvas.width = frameWidth;
        offCanvas.height = frameHeight;
        const offCtx = offCanvas.getContext("2d");
        offCtx.drawImage(frameImage, 0, 0, frameWidth, frameHeight);

        ctxOverlay.save();
        ctxOverlay.filter = `drop-shadow(0 0 ${color === "lime" ? 20 : 10}px ${color})`;
        ctxOverlay.globalCompositeOperation = "lighter";
        ctxOverlay.drawImage(offCanvas, centerX, centerY);
        ctxOverlay.restore();
      }

      if (!loaderHidden && loader) {
        loader.style.opacity = "0";
        setTimeout(() => loader.style.display = "none", 400);
        loaderHidden = true;
      }
    }, 200);
  }

  function setupCameraAndRunDetection() {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        video.srcObject = stream;
        video.setAttribute("playsinline", true);

        video.addEventListener("loadeddata", () => {
          video.play().then(() => {
            const vw = video.videoWidth;
            let vh = video.videoHeight;

            // Adjust height for mobile
            if (window.innerWidth < 768) {
                console.log('dwadwadw', window.innerWidth);
              vh = Math.min(vh * 1.2, window.innerHeight * 1);
            //   vh = 2000;
              console.log("Adjusted height for mobile:", vh);
            }

            overlay.width = vw;
            overlay.height = vh;
            canvas.width = vw;
            canvas.height = vh;
            video.width = vw;
            video.height = vh;

            runDetection();
          });
        });
      })
      .catch(console.error);
  }

  frameImage.onload = setupCameraAndRunDetection;
  frameImage.onerror = () => {
    console.error("Failed to load frame image, using fallback");
    setupCameraAndRunDetection();
  };

  captureBtn.onclick = () => {
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const formData = new FormData();
      formData.append("image", blob, "captured.png");
      formData.append("message", "hidden message here");

      fetch("/upload-image", {
        method: "POST",
        body: formData,
      })
        .then((res) => res.json())
        .then(() => loadGallery())
        .catch(console.error);
    }, "image/png");
  };

  function loadGallery() {
    fetch("/list-encoded-images")
      .then((res) => res.json())
      .then((data) => {
        encodedGallery.innerHTML = "";
        data.files.reverse().forEach((fn) => {
          const img = document.createElement("img");
          img.src = data.base_url + fn;
          img.className = `cursor-pointer rounded-xl border-4 border-transparent hover:border-blue-500 active:border-green-500 transition-all`.trim();
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

  decodeBtnGallery.onclick = () => {
    if (!selectedFilename) return;
    fetch(`/decode-image?filename=${selectedFilename}`)
      .then((res) => res.json())
      .then((data) => {
        decodedMessageGallery.textContent = "🧩 Decoded Key: " + data.message;
      })
      .catch(console.error);
  };

  window.addEventListener("load", loadGallery);
});
