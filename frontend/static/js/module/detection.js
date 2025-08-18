// Global variables for face detection state
let validFaceTimer = null;
let holdStillStartTime = null;
let isCapturing = false;
let lastCaptureTime = 0;

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

      // Default state
      let color = "red";
      let message = "Align your face properly";

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
        const eyeSlope = Math.abs(leftEye[0].y - rightEye[3].y);
        const noseOffset = Math.abs((leftEye[0].x + rightEye[3].x) / 2 - nose[3].x);

        // Detection parameters
        const isHorizontallyCentered = faceCenterX >= oblongX + oblongWidth * 0.4 &&
                                      faceCenterX <= oblongX + oblongWidth * 0.6;
        const isTopPositioned = y >= oblongY && y <= oblongY + oblongHeight * 0.45;
        const isBottomClear = y + height <= oblongY + oblongHeight * 0.8;
        const isFaceCentered = isHorizontallyCentered && isTopPositioned && isBottomClear;
        const isUpright = eyeSlope < 8 && noseOffset < 14;

        // Size detection
        const areaRatio = (width * height) / (overlay.width * overlay.height);
        const isFaceBigEnough = areaRatio > 0.07 && areaRatio <= 0.16;
        const isFaceTooClose = areaRatio > 0.18;

        // Decision logic
        if (isFaceBigEnough && isFaceCentered && isUpright) {
          color = "lime";
          
          // Start timer if not already running and not recently captured
          const now = Date.now();
          if (!validFaceTimer && now - lastCaptureTime > 5000) {
            holdStillStartTime = now;
            validFaceTimer = setTimeout(() => {
              if (!isCapturing) {
                isCapturing = true;
                document.getElementById("capture").click();
                lastCaptureTime = Date.now();
                setTimeout(() => {
                  isCapturing = false;
                  validFaceTimer = null;
                }, 3000); // Cooldown period
              }
            }, 5000);
          }

          // Update countdown message
          if (validFaceTimer) {
            const elapsed = Date.now() - holdStillStartTime;
            const remaining = Math.max(0, 3 - Math.floor(elapsed / 1000));
            message = `✅ Hold still for ${remaining}s...`;
            
            // Update progress bar if exists
            if (document.getElementById("countdown-bar")) {
              const progress = Math.min(100, (elapsed / 5000) * 100);
              document.getElementById("countdown-bar").style.width = `${progress}%`;
            }
          }
        } else {
          // Reset timer if conditions aren't met
          if (validFaceTimer) {
            clearTimeout(validFaceTimer);
            validFaceTimer = null;
            if (document.getElementById("countdown-bar")) {
              document.getElementById("countdown-bar").style.width = "0%";
            }
          }
          
          // Position feedback messages
          if (isFaceTooClose) {
            message = "📏 Move slightly back";
          } else if (!isFaceBigEnough) {
            message = "📷 Move closer";
          } else if (!isHorizontallyCentered) {
            message = "↔️ Center horizontally";
          } else if (!isTopPositioned) {
            message = "⬇️ Move face to top";
          } else if (!isBottomClear) {
            message = "⬆️ Keep space below face";
          } else if (!isUpright) {
            message = "↕️ Keep head straight";
          }
        }

        // Update debug info
        if (document.querySelector("#face_position_debug")) {
          document.querySelector("#face_position_debug").innerHTML = `
            X: ${faceCenterX.toFixed(0)} (${(oblongX + oblongWidth * 0.4).toFixed(0)}-${(oblongX + oblongWidth * 0.6).toFixed(0)}),
            Y: ${y.toFixed(0)} (${oblongY.toFixed(0)}-${(oblongY + oblongHeight * 0.35).toFixed(0)})
          `;
        }
      }

      // UI updates
      if (document.querySelector("#face_position")) {
        document.querySelector("#face_position").innerHTML = message;
      }
      if (captureBtn) {
        captureBtn.disabled = color !== "lime";
        captureBtn.classList.toggle("opacity-50", color !== "lime");
      }
      if (statusText) statusText.textContent = message;

      // Visual feedback
      ctxOverlay.clearRect(0, 0, overlay.width, overlay.height);
      ctxOverlay.fillStyle = "rgba(0, 0, 0, 0.67)";
      ctxOverlay.fillRect(0, 0, overlay.width, overlay.height);

      // Draw oval
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

      // Draw border
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