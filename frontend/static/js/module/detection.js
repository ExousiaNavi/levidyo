export async function runDetection(
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
) {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
  if (detectionInterval) clearInterval(detectionInterval);

  detectionInterval = setInterval(async () => {
    try {
      const oblongHeight = isMobile
        ? overlay.height * 0.75
        : overlay.height * 0.7;
      const oblongWidth = isMobile ? overlay.width * 0.65 : overlay.width * 0.7;
      const oblongX = (overlay.width - oblongWidth) / 2;
      const oblongY = (overlay.height - oblongHeight) / 2 - 90;
      //original
      let color = "red";
      // let color = "lime";
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
          x >= oblongX + paddingW - oblongWidth * 0.4 &&
          x + width <= oblongX + oblongWidth - paddingW + oblongWidth * 0.4;

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
          message = `↔️ Center your face.`;
        } else if (!isTopInside) {
          message = "⬇️ Lower forehead.";
        } else if (!isBottomInside) {
          message = "⬆️ Lift chin.";
        } else if (!isFaceCentered) {
          message = isTooHigh ? "⬇️ Lower chin." : "↔️ Center face.";
        } else {
          message = "↕️ Keep head upright.";
        }

        if (document.querySelector("#face_position")) {
          document.querySelector("#face_position").innerHTML = message;
        }
      }

      if (captureBtn) {
        captureBtn.disabled = color !== "lime";
        captureBtn.classList.toggle("opacity-50", color !== "lime");
      }
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
        setTimeout(() => {
          loader.style.display = "none";
          if (document.querySelector("#mdh")) {
            document.querySelector("#mdh").classList.remove("hidden");
          }
          con.classList.add("hidden");
        }, 400);
        loaderHidden = true;
      }
    } catch (error) {
      console.error("Detection error:", error);
    }
  }, 200);
}
