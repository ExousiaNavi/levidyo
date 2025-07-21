document.addEventListener("DOMContentLoaded", () => {
  const con = document.getElementById("skeleton-loader-container");
  const loader = document.getElementById("skeleton-loader");
  if (loader) {
    con.style.opacity = "1";
    loader.style.opacity = "1";
    document.body.style.overflow = "hidden"; // Disable scrolling
  }

  const video = document.getElementById("video");
  const canvas = document.getElementById("canvas");
  const overlay = document.getElementById("overlay");
  const ctxOverlay = overlay.getContext("2d");
  const captureBtn = document.getElementById("capture");
  const encodedGallery = document.getElementById("encodedGallery");
  const decodeBtnGallery = document.getElementById("decodeBtnGallery");
  const decodedMessageGallery = document.getElementById("decodedMessageGallery");
  const statusText = document.getElementById("statusText");

  function getWidthMultiplier() {
    return window.innerWidth < 768 ? 1.5 : 0.6;
  }

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
      const isMobile = window.innerWidth < 768;
      const diameter = isMobile
        ? Math.min(overlay.width, overlay.height)
        : Math.min(overlay.width, overlay.height) * getWidthMultiplier();
      const radius = diameter / 2;
      const circleX = overlay.width / 2;
      const circleY = overlay.height / 2;

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

        const padding = radius * 0.3;
        const isFaceCentered =
          Math.abs(faceCenterX - circleX) < padding &&
          Math.abs(faceCenterY - circleY) < padding;
        const isUpright = eyeSlope < 8 && noseOffset < 12;

        const faceArea = width * height;
        const frameArea = overlay.width * overlay.height;
        const areaRatio = faceArea / frameArea;
        const isFaceBigEnough = areaRatio > 0.15 && areaRatio <= 0.18;

        if (isFaceBigEnough && isFaceCentered && isUpright) {
          color = "lime";
          message = "";
        } else if (!isFaceBigEnough) {
          message = "Move closer to the camera";
        } else if (!isFaceCentered) {
          message = "Center your face inside the circle";
        } else {
          message = "Align your face properly";
        }

        console.log("Distance from center:", {
          x: Math.abs(faceCenterX - circleX),
          y: Math.abs(faceCenterY - circleY),
          areaRatio: areaRatio,
        });
      }

      captureBtn.disabled = color !== "lime";
      captureBtn.classList.toggle("opacity-50", color !== "lime");
      if (statusText) statusText.textContent = message;

      // Dim background
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.fillStyle = "rgba(0, 0, 0, 0.67)";
      ctxOverlay.fillRect(0, 0, overlay.width, overlay.height);

      // Cut out circle
      ctxOverlay.save();
      ctxOverlay.globalCompositeOperation = "destination-out";
      ctxOverlay.beginPath();
      ctxOverlay.arc(circleX, circleY, radius, 0, Math.PI * 2);
      ctxOverlay.fill();
      ctxOverlay.restore();

      // Circle border glow
      ctxOverlay.save();
      ctxOverlay.beginPath();
      ctxOverlay.arc(circleX, circleY, radius, 0, Math.PI * 2);
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
        loaderConHidden = true;
        document.querySelector("#mdh").classList.remove("hidden");
        con.classList.add("hidden");
      }
    }, 200);
  }

  function setupCameraAndRunDetection() {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        video.srcObject = stream;
        video.setAttribute("playsinline", true);

        video.addEventListener("loadeddata", () => {
          video.play().then(() => {
            const vw = video.videoWidth;
            let vh = video.videoHeight;

            const isMobile = window.innerWidth < 768;
            if (isMobile) {
              vh = Math.min(vh * 1.1, window.innerHeight);
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

  setupCameraAndRunDetection();

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
    fetch(`/decode-image?filename=${selectedFilename}`)
      .then((res) => res.json())
      .then((data) => {
        decodedMessageGallery.textContent = "🧩 Decoded Key: " + data.message;
      })
      .catch(console.error);
  };

  window.addEventListener("load", loadGallery);
});
