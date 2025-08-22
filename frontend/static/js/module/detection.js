// Global variables for face detection state
let validFaceTimer = null;
let holdStillStartTime = null;
let isCapturing = false;
let lastCaptureTime = 0;
let lastValidPositionTime = 0;
let gracePeriodActive = false;
let lastFaceCenterX = null;
let lastFaceCenterY = null;

// Angle smoothing history
let eyeSlopeHistory = [];
let noseOffsetHistory = [];

// Smoothing function (moving average)
function smoothValue(history, value, maxLen = 8) { // increased from 5 to 8
  history.push(value);
  if (history.length > maxLen) history.shift();
  return history.reduce((a, b) => a + b, 0) / history.length;
}

export async function runDetection(
  detectionInterval,
  isMobile,
  overlay,
  video,
  captureBtn,
  statusText,
  ctxOverlay,
  loaderHidden
) {
  const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224 });
  if (detectionInterval) clearInterval(detectionInterval);

  detectionInterval = setInterval(async () => {
    try {
      // Frame dimensions
      const oblongHeight = isMobile ? overlay.height * 0.75 : overlay.height * 0.7;
      const oblongWidth = isMobile ? overlay.width * 0.7 : overlay.width * 0.7;
      const oblongX = (overlay.width - oblongWidth) / 2;
      const oblongY = (overlay.height - oblongHeight) / 2 - 90;

      let color = "red";
      let message = "Position your face in the frame";

      const result = await faceapi.detectSingleFace(video, options).withFaceLandmarks();

      if (result) {
        const { x, y, width, height } = result.detection.box;
        const faceCenterX = x + width / 2;
        const faceCenterY = y + height / 2;
        const landmarks = result.landmarks;

        // Orientation checks
        const leftEye = landmarks.getLeftEye();
        const rightEye = landmarks.getRightEye();
        const nose = landmarks.getNose();
        const rawEyeSlope = Math.abs(leftEye[0].y - rightEye[3].y);
        const rawNoseOffset = Math.abs((leftEye[0].x + rightEye[3].x) / 2 - nose[3].x);

        // Smooth values
        const eyeSlope = smoothValue(eyeSlopeHistory, rawEyeSlope, 8);
        const noseOffset = smoothValue(noseOffsetHistory, rawNoseOffset, 8);

        // Size detection
        const areaRatio = (width * height) / (overlay.width * overlay.height);
        const isFaceBigEnough = areaRatio > 0.06 && areaRatio <= 0.18;
        const isFaceTooClose = areaRatio > 0.19;

        // Position checks
        const isHorizontallyCentered =
          faceCenterX >= oblongX + oblongWidth * 0.35 &&
          faceCenterX <= oblongX + oblongWidth * 0.65;
        const isTopPositioned =
          y >= oblongY - oblongHeight * 0.1 &&
          y <= oblongY + oblongHeight * 0.5;
        const isBottomClear = y + height <= oblongY + oblongHeight * 0.85;

        // Angle checks (looser tolerance)
        const isUpright = eyeSlope < 20 && noseOffset < 30;

        // Motion buffer (allow small wiggle)
        const wiggleThreshold = 15; // pixels
        if (lastFaceCenterX !== null && lastFaceCenterY !== null) {
          const dx = Math.abs(faceCenterX - lastFaceCenterX);
          const dy = Math.abs(faceCenterY - lastFaceCenterY);
          if (dx < wiggleThreshold && dy < wiggleThreshold) {
            lastValidPositionTime = Date.now();
          }
        }
        lastFaceCenterX = faceCenterX;
        lastFaceCenterY = faceCenterY;

        const now = Date.now();

        // Perfect position (slightly looser)
        const isPerfectPosition = isFaceBigEnough &&
          faceCenterX >= oblongX + oblongWidth * 0.4 &&
          faceCenterX <= oblongX + oblongWidth * 0.6 &&
          y >= oblongY &&
          y <= oblongY + oblongHeight * 0.45 &&
          y + height <= oblongY + oblongHeight * 0.8 &&
          eyeSlope < 17 &&
          noseOffset < 25;

        // Buffer zone
        const isWithinBufferZones = isFaceBigEnough &&
          isHorizontallyCentered &&
          isTopPositioned &&
          isBottomClear &&
          isUpright;

        // Grace period logic (1.2s)
        if (isPerfectPosition) {
          lastValidPositionTime = now;
          gracePeriodActive = false;
          color = "lime";
          message = "✅ Perfect! Hold still";
        } else if (isWithinBufferZones && (now - lastValidPositionTime < 1200 || gracePeriodActive)) {
          gracePeriodActive = true;
          color = "orange";
          message = "🟡 Keep holding...";
        } else {
          gracePeriodActive = false;
          color = "red";

          // Feedback
          if (isFaceTooClose) message = "📏 Move back slightly";
          else if (!isFaceBigEnough) message = "📷 Move a bit closer";
          else if (!isHorizontallyCentered) message = "↔️ Adjust left or right";
          else if (!isTopPositioned) message = "⬇️ Move down slightly";
          else if (!isBottomClear) message = "⬆️ Move up slightly";
          else if (!isUpright) message = "↕️ Straighten your head";
        }

        // Timer for auto capture (faster, 3s)
        if (isPerfectPosition && !validFaceTimer && now - lastCaptureTime > 5000) {
          holdStillStartTime = now;
          validFaceTimer = setTimeout(() => {
            if (!isCapturing) {
              isCapturing = true;
              document.getElementById("capture").click();
              lastCaptureTime = Date.now();
              setTimeout(() => {
                isCapturing = false;
                validFaceTimer = null;
              }, 3000);
            }
          }, 3000); // reduced from 5000ms
        }

        // Reset timer if moved out of position
        if (!isPerfectPosition && !gracePeriodActive && validFaceTimer) {
          clearTimeout(validFaceTimer);
          validFaceTimer = null;
        }

        // Countdown UI
        if (validFaceTimer) {
          const elapsed = now - holdStillStartTime;
          const remaining = Math.max(0, 3 - Math.floor(elapsed / 1000));
          message = `✅ Auto-capturing in ${remaining}s...`;

          const bar = document.getElementById("countdown-bar");
          if (bar) {
            const progress = Math.min(100, (elapsed / 3000) * 100);
            bar.style.width = `${progress}%`;
          }
        } else {
          const bar = document.getElementById("countdown-bar");
          if (bar) bar.style.width = "0%";
        }
      }

      // UI updates
      const facePosEl = document.querySelector("#face_position");
      if (facePosEl) facePosEl.innerHTML = message;
      if (captureBtn) {
        captureBtn.disabled = color !== "lime";
        captureBtn.classList.toggle("opacity-50", color !== "lime");
      }
      if (statusText) statusText.textContent = message;

      // Visual overlay
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.fillStyle = "rgba(0, 0, 0, 0.67)";
      ctxOverlay.fillRect(0, 0, overlay.width, overlay.height);

      // Cut-out oval
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

      // Border
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
    } catch (error) {
      console.error("Detection error:", error);
      if (validFaceTimer) {
        clearTimeout(validFaceTimer);
        validFaceTimer = null;
      }
    }
  }, 200);

  return detectionInterval;
}
