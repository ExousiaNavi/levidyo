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
