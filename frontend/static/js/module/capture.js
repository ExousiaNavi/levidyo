export async function captureFace(
  captureBtn,
  detectionInterval,
  cameraPage,
  video,
  canvas,
  capturedFace,
  setCapturedFace,
  setOriginalCapturedFace
) {
  try {
    captureBtn.disabled = true;
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.remove("hidden");

    await new Promise((resolve) => setTimeout(resolve, 300));

    const ctx = canvas.getContext("2d");
    ctx.save();
    // ctx.scale(-1, 1);
    // ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    clearInterval(detectionInterval);

    const size = Math.min(canvas.width, canvas.height);
    const squareCanvas = document.createElement("canvas");
    squareCanvas.width = size;
    squareCanvas.height = size;

    const squareCtx = squareCanvas.getContext("2d");
    const offsetX = (canvas.width - size) / 2;
    const offsetY = (canvas.height - size) / 2;

    squareCtx.drawImage(canvas, offsetX, offsetY, size, size, 0, 0, size, size);

    const frozenFrame = document.createElement("img");
    frozenFrame.src = squareCanvas.toDataURL("image/png");
    frozenFrame.id = "frozenFrame";
    frozenFrame.className = "absolute top-0 left-0 w-full h-full object-cover";
    cameraPage.appendChild(frozenFrame);
    video.classList.add("hidden");

    return await new Promise((resolve) => {
      squareCanvas.toBlob(
        async (blob) => {
          try {
            const formData = new FormData();
            formData.append("image", blob, "captured.png");
            formData.append("message", "hidden message here");

            const response = await fetch("/upload-image", {
              method: "POST",
              body: formData,
            });

            if (!response.ok) throw new Error("Upload failed");

            const data = await response.json();

            if (!data.face_validated) {
              throw new Error("Face not detected");
            }

            // success path
            // capturedFace = data.image_url;
            capturedFace = data.image_base64;
            await setCapturedFace(capturedFace);
            await setOriginalCapturedFace(data.original_image_base64)
            const loader = document.getElementById("successLoader");
            if (loader) {
              loader.classList.remove("hidden");
              setTimeout(() => loader.classList.add("hidden"), 3000);
            }

            resolve(true);
          } catch (error) {
            console.error("Upload error:", error);
            const eloader = document.getElementById("errorLoader");
            if (eloader) {
              eloader.classList.remove("hidden");
              setTimeout(() => eloader.classList.add("hidden"), 3000);
            }
            resolve(false);
          } finally {
            if (captureLoader) captureLoader.classList.add("hidden");
          }
        },
        "image/png",
        1.0
      );
    });
  } catch (error) {
    console.error("Capture error:", error);
    alert("Failed to capture image. Please try again.");
    if (captureBtn) captureBtn.disabled = false;
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.add("hidden");
    return false;
  }
}

export async function captureID(
  side, // "front" or "back"
  idCanvas,
  idVideo,
  startIDCamera
) {
  try {
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.remove("hidden");
    await new Promise((resolve) => setTimeout(resolve, 200));

    const targetWidth = 506;
    const targetHeight = 319;
    const cardAspectRatio = 85.6 / 54;

    idCanvas.width = targetWidth;
    idCanvas.height = targetHeight;
    const ctx = idCanvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    const videoWidth = idVideo.videoWidth;
    const videoHeight = idVideo.videoHeight;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    const processCanvas = document.createElement("canvas");
    processCanvas.width = videoWidth;
    processCanvas.height = videoHeight;
    const processCtx = processCanvas.getContext("2d", {
      willReadFrequently: true,
    });
    processCtx.drawImage(idVideo, 0, 0, videoWidth, videoHeight);

    // Apply optimized image enhancement
    const enhancedImage = await optimizeImageForOCR(processCanvas);

    // High-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    const zoomFactor = isMobile ? 1.1 : 1.7;
    let drawWidth, drawHeight, offsetX = 0, offsetY = 0;

    if (isMobile) {
      // For mobile (rotated) - ensure full coverage
      const scale = Math.max(
        targetWidth / videoHeight, // Note swapped dimensions for rotation
        targetHeight / videoWidth
      ) * zoomFactor;
      drawWidth = videoWidth * scale;
      drawHeight = videoHeight * scale;
      
      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate(-Math.PI / 2);
      ctx.drawImage(
        enhancedImage,
        0,
        0,
        videoWidth,
        videoHeight,
        -drawWidth / 2,
        -drawHeight / 2,
        drawWidth,
        drawHeight
      );
      ctx.restore();
    } else {
      // For desktop - ensure full coverage
      const scale = Math.max(
        targetWidth / videoWidth,
        targetHeight / videoHeight
      ) * zoomFactor;
      drawWidth = videoWidth * scale;
      drawHeight = videoHeight * scale;
      offsetX = (targetWidth - drawWidth) / 2;
      offsetY = (targetHeight - drawHeight) / 2;
      
      ctx.drawImage(
        enhancedImage,
        0,
        0,
        videoWidth,
        videoHeight,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );
    }

    // High quality JPEG (but not huge)
    const imgBase64 = idCanvas.toDataURL("image/jpeg", 0.95);

    const response = await fetch("/kyc/document", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        image: imgBase64,
        side: side,
      }),
    });

    const verification = await response.json();
    console.log("Verification response:", verification);

    if (!response.ok) {
      throw new Error(verification.message || "Verification failed");
    }

    if (verification.status !== "success") {
      throw new Error(verification.message || "ID verification failed");
    }

    if (side === "idFront") {
      localStorage.setItem("frontUpload", imgBase64);
    } else {
      localStorage.setItem("backUpload", imgBase64);
    }
    return true;
  } catch (error) {
    console.log("ID capture error:", error);
    const errorloader = document.getElementById("errorLoader");
    errorloader.classList.remove("hidden");
    // Hide automatically after 3s
    setTimeout(() => errorloader.classList.add("hidden"), 3000);
    if (side === "idFront") {
      localStorage.setItem("frontUpload", "");
    } else {
      localStorage.setItem("backUpload", "");
    }
    return false;
  } finally {
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.add("hidden");
  }
}

// Optimized image enhancement for OCR (reduced brightness)
async function optimizeImageForOCR(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  // Conservative enhancement values
  const contrast = 1.1; // Mild contrast boost (10%)
  const brightness = 5; // Very slight brightness adjustment

  for (let i = 0; i < imageData.data.length; i += 4) {
    // Apply contrast with brightness adjustment
    const r = (imageData.data[i] - 128) * contrast + 128 + brightness;
    const g = (imageData.data[i + 1] - 128) * contrast + 128 + brightness;
    const b = (imageData.data[i + 2] - 128) * contrast + 128 + brightness;

    // Clamp values and apply
    imageData.data[i] = Math.min(255, Math.max(0, r));
    imageData.data[i + 1] = Math.min(255, Math.max(0, g));
    imageData.data[i + 2] = Math.min(255, Math.max(0, b));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function proceedToIDCapture(
  previewPage,
  idCapturePage,
  currentStep
) {
  if (previewPage) previewPage.classList.add("hidden");
  if (idCapturePage) idCapturePage.classList.remove("hidden");
  currentStep = "idFront";
  startIDCamera();
}
