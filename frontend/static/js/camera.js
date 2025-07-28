document.addEventListener("DOMContentLoaded", () => {
  const con = document.getElementById("skeleton-loader-container");
  const loader = document.getElementById("skeleton-loader");
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

  async function loadModels() {
    await faceapi.nets.tinyFaceDetector.loadFromUri("/static/models");
    await faceapi.nets.faceLandmark68Net.loadFromUri("/static/models");
  }

  async function runDetection() {
    await loadModels();
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });

    setInterval(async () => {
      const isMobile = window.innerWidth < 500;

      const oblongHeight = isMobile
        ? overlay.height * 0.75
        : overlay.height * 0.65;
      const oblongWidth = isMobile ? overlay.width * 0.8 : overlay.width * 0.6;
      const oblongX = (overlay.width - oblongWidth) / 2;
      const oblongY = (overlay.height - oblongHeight) / 2;
      const ellipseX = oblongX + oblongWidth / 2;
      const ellipseY = oblongY + oblongHeight / 2;

      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
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
      ctxOverlay.strokeStyle = "black";
      ctxOverlay.lineWidth = 2;
      ctxOverlay.stroke();

      const detections = await faceapi
        .detectSingleFace(video, options)
        .withFaceLandmarks();

      if (detections) {
        const box = detections.detection.box;
        const { x, y, width, height } = box;

        const areaRatio = (width * height) / (overlay.width * overlay.height);
        const isFaceBigEnough = areaRatio > 0.1;

        const faceCenterX = x + width / 2;
        const faceCenterY = y + height / 2;
        const horizontalOffset = Math.abs(faceCenterX - ellipseX);
        const verticalOffset = Math.abs(faceCenterY - ellipseY);
        const isFaceCentered = horizontalOffset < oblongWidth / 4;
        const isVerticallyCentered = verticalOffset < oblongHeight / 5;

        const landmarks = detections.landmarks;
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();

        const eyeSlope =
          (rightEye[0].y - leftEye[3].y) / (rightEye[0].x - leftEye[3].x);
        const isUpright = Math.abs(eyeSlope) < 0.2;

        const isTooHigh = faceCenterY < ellipseY;

        const topFaceThreshold = oblongY + oblongHeight * 0.1;
        const isTopVisible = y < topFaceThreshold;

        let color = "red";
        let message = "";

        if (
          isFaceBigEnough &&
          isFaceCentered &&
          isUpright &&
          // isTopVisible &&
          isVerticallyCentered
        ) {
          color = "lime";
          message = "";
        } else if (!isFaceBigEnough) {
          message = "Move closer to the camera";
        } else if (!isTopVisible) {
          message = "Lift your head slightly";
        } else if (!isVerticallyCentered) {
          message = "Center your full face — not too high or low";
        } else if (!isFaceCentered) {
          message = isTooHigh
            ? "Lower your chin slightly"
            : "Center your face in the frame";
        } else {
          message = "Keep your head upright";
        }

        ctxOverlay.beginPath();
        ctxOverlay.rect(x, y, width, height);
        ctxOverlay.strokeStyle = color;
        ctxOverlay.lineWidth = 2;
        ctxOverlay.stroke();

        if (message) {
          ctxOverlay.font = "16px sans-serif";
          ctxOverlay.fillStyle = "black";
          ctxOverlay.fillText(message, x, y - 10);
        }

        // Debug threshold line
        ctxOverlay.beginPath();
        ctxOverlay.moveTo(0, topFaceThreshold);
        ctxOverlay.lineTo(overlay.width, topFaceThreshold);
        ctxOverlay.strokeStyle = "rgba(255, 0, 0, 0.5)";
        ctxOverlay.lineWidth = 1;
        ctxOverlay.stroke();

        console.log("DEBUG ➤", {
          eyeSlope,
          areaRatio,
          isFaceBigEnough,
          isFaceCentered,
          isVerticallyCentered,
          isUpright,
          isTopVisible,
          message,
        });
      }
    }, 100);
  }

  function setupCameraAndRunDetection() {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.addEventListener("loadeddata", () => {
          video.play().then(() => {
            // Set a fixed, portrait-oriented working size
            // const desiredWidth = 360;
            // const desiredHeight = 480;

            // overlay.width = desiredWidth;
            // overlay.height = desiredHeight;
            // canvas.width = desiredWidth;
            // canvas.height = desiredHeight;
            overlay.width = video.videoWidth;
            overlay.height = video.videoHeight;
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            // Keep video resolution native, don't force width/height
            // video.setAttribute("width", desiredWidth);
            // video.setAttribute("height", desiredHeight);

            // overlay.style.width = ${desiredWidth}px;
            // overlay.style.height = ${desiredHeight}px;

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

  decodeBtnGallery.onclick = () => {
    if (!selectedFilename) return;
    fetch("/decode-image?filename=${selectedFilename}")
      .then((res) => res.json())
      .then((data) => {
        decodedMessageGallery.textContent = "🧩 Decoded Key: " + data.message;
      })
      .catch(console.error);
  };

  window.addEventListener("load", loadGallery);
});
