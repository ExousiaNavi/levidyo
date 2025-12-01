// export async function captureFace(
//   captureBtn,
//   detectionInterval,
//   cameraPage,
//   video,
//   canvas,
//   capturedFace,
//   setCapturedFace,
//   setOriginalCapturedFace
// ) {
//   try {
//     captureBtn.disabled = true;
//     const captureLoader = document.getElementById("captureLoader");
//     if (captureLoader) captureLoader.classList.remove("hidden");

//     await new Promise((resolve) => setTimeout(resolve, 300));

//     const ctx = canvas.getContext("2d");
//     ctx.save();
//     // ctx.scale(-1, 1);
//     // ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
//     ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
//     ctx.restore();

//     clearInterval(detectionInterval);

//     const size = Math.min(canvas.width, canvas.height);
//     const squareCanvas = document.createElement("canvas");
//     squareCanvas.width = size;
//     squareCanvas.height = size;

//     const squareCtx = squareCanvas.getContext("2d");
//     const offsetX = (canvas.width - size) / 2;
//     const offsetY = (canvas.height - size) / 2;

//     squareCtx.drawImage(canvas, offsetX, offsetY, size, size, 0, 0, size, size);

//     const frozenFrame = document.createElement("img");
//     frozenFrame.src = squareCanvas.toDataURL("image/png");
//     frozenFrame.id = "frozenFrame";
//     frozenFrame.className = "absolute top-0 left-0 w-full h-full object-cover";
//     cameraPage.appendChild(frozenFrame);
//     video.classList.add("hidden");

//     return await new Promise((resolve) => {
//       squareCanvas.toBlob(
//         async (blob) => {
//           try {
//             const formData = new FormData();
//             formData.append("image", blob, "captured.png");
//             formData.append("message", "hidden message here");

//             const response = await fetch("/upload-image", {
//               method: "POST",
//               body: formData,
//             });

//             if (!response.ok) throw new Error("Upload failed");

//             const data = await response.json();

//             if (!data.face_validated) {
//               throw new Error("Face not detected");
//             }

//             // success path
//             // capturedFace = data.image_url;
//             capturedFace = data.image_base64;
//             await setCapturedFace(capturedFace);
//             await setOriginalCapturedFace(data.original_image_base64);
//             const loader = document.getElementById("successLoader");
//             if (loader) {
//               loader.classList.remove("hidden");
//               setTimeout(() => loader.classList.add("hidden"), 3000);
//             }

//             resolve(true);
//           } catch (error) {
//             console.error("Upload error:", error);
//             const eloader = document.getElementById("errorLoader");
//             if (eloader) {
//               eloader.classList.remove("hidden");
//               setTimeout(() => eloader.classList.add("hidden"), 3000);
//             }
//             resolve(false);
//           } finally {
//             if (captureLoader) captureLoader.classList.add("hidden");
//           }
//         },
//         "image/png",
//         1.0
//       );
//     });
//   } catch (error) {
//     console.error("Capture error:", error);
//     alert("Failed to capture image. Please try again.");
//     if (captureBtn) captureBtn.disabled = false;
//     const captureLoader = document.getElementById("captureLoader");
//     if (captureLoader) captureLoader.classList.add("hidden");
//     return false;
//   }
// }

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

    await new Promise(resolve => setTimeout(resolve, 300));
    clearInterval(detectionInterval);

    const videoWidth = video.videoWidth;
    const videoHeight = video.videoHeight;

    // --- Crop settings ---
    const CROP_TOP_RATIO = 0.1;    // crop 10% from top
    const CROP_BOTTOM_RATIO = 0.1; // crop 10% from bottom
    const cropTop = Math.floor(videoHeight * CROP_TOP_RATIO);
    const cropBottom = Math.floor(videoHeight * CROP_BOTTOM_RATIO);
    const croppedHeight = videoHeight - cropTop - cropBottom;
    console.log(`Cropping: top ${cropTop}px, bottom ${cropBottom}px`);

    // --- Resize settings ---
    const MAX_DIMENSION = 1280;
    const scale = Math.min(MAX_DIMENSION / videoWidth, MAX_DIMENSION / croppedHeight, 1);
    const captureWidth = Math.floor(videoWidth * scale);
    const captureHeight = Math.floor(croppedHeight * scale);

    console.log(`Final capture size: ${captureWidth}x${captureHeight}`);

    // --- Draw cropped video on canvas ---
    const outputCanvas = document.createElement("canvas");
    outputCanvas.width = captureWidth;
    outputCanvas.height = captureHeight;
    const ctx = outputCanvas.getContext("2d", { willReadFrequently: true });
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    ctx.drawImage(
      video,
      0,
      cropTop,
      videoWidth,
      croppedHeight,
      0,
      0,
      captureWidth,
      captureHeight
    );

    enhanceCanvasMildly(outputCanvas);

    // --- Display frozen frame ---
    const displayCtx = canvas.getContext("2d");
    displayCtx.imageSmoothingEnabled = true;
    displayCtx.imageSmoothingQuality = "high";
    displayCtx.clearRect(0, 0, canvas.width, canvas.height);
    displayCtx.drawImage(outputCanvas, 0, 0, canvas.width, canvas.height);

    const frozenFrame = document.createElement("img");
    frozenFrame.src = canvas.toDataURL("image/jpeg", 0.95);
    frozenFrame.id = "frozenFrame";
    frozenFrame.className = "absolute top-0 left-0 w-full h-full object-cover";
    cameraPage.appendChild(frozenFrame);
    video.classList.add("hidden");

    // --- Optimize and upload ---
    const finalBlob = await optimizeImageForQuota(outputCanvas);
    await uploadImage(finalBlob, capturedFace, setCapturedFace, setOriginalCapturedFace);

    if (captureLoader) captureLoader.classList.add("hidden");
    captureBtn.disabled = false;
    return true;

  } catch (error) {
    console.error("Capture error:", error);
    const errorLoader = document.getElementById("errorLoader");
    if (errorLoader) {
      errorLoader.textContent = error.message || "Capture failed. Please try again.";
      errorLoader.classList.remove("hidden");
      setTimeout(() => errorLoader.classList.add("hidden"), 3000);
    }
    captureBtn.disabled = false;
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.add("hidden");
    return false;
  }
}


function enhanceCanvasMildly(canvas) {
  const ctx = canvas.getContext("2d");
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  const contrast = 1.05, brightness = 3, saturation = 1.02;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2];
    const lum = 0.299*r + 0.587*g + 0.114*b;
    let newR = (r - 128) * contrast + 128 + brightness;
    let newG = (g - 128) * contrast + 128 + brightness;
    let newB = (b - 128) * contrast + 128 + brightness;
    data[i]   = Math.min(255, Math.max(0, lum + (newR - lum) * saturation));
    data[i+1] = Math.min(255, Math.max(0, lum + (newG - lum) * saturation));
    data[i+2] = Math.min(255, Math.max(0, lum + (newB - lum) * saturation));
  }

  ctx.putImageData(imgData, 0, 0);
}

async function optimizeImageForQuota(canvas) {
  const TARGET_MAX_SIZE = 1.8 * 1024 * 1024; // 1.8MB
  const MAX_DIM_REDUCTION = 0.7;
  let currentCanvas = canvas;
  let bestBlob = null;

  // Step 1: Reduce quality
  for (const quality of [0.75,0.65,0.55,0.45,0.35]) {
    const blob = await new Promise(r => currentCanvas.toBlob(r, "image/jpeg", quality));
    if (blob.size <= TARGET_MAX_SIZE) return blob;
    if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
  }

  // Step 2: Reduce dimensions if needed
  if (bestBlob && bestBlob.size > TARGET_MAX_SIZE) {
    let factor = 0.9;
    while (factor >= MAX_DIM_REDUCTION) {
      const reducedCanvas = document.createElement("canvas");
      reducedCanvas.width = Math.floor(currentCanvas.width * factor);
      reducedCanvas.height = Math.floor(currentCanvas.height * factor);
      const ctx = reducedCanvas.getContext("2d");
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(currentCanvas, 0, 0, reducedCanvas.width, reducedCanvas.height);
      const blob = await new Promise(r => reducedCanvas.toBlob(r, "image/jpeg", 0.7));
      if (blob.size <= TARGET_MAX_SIZE) return blob;
      if (!bestBlob || blob.size < bestBlob.size) bestBlob = blob;
      factor -= 0.1;
    }
  }

  // Step 3: Fallback to PNG
  if (bestBlob && bestBlob.size > TARGET_MAX_SIZE) {
    const pngBlob = await new Promise(r => currentCanvas.toBlob(r, "image/png"));
    if (pngBlob.size < bestBlob.size) bestBlob = pngBlob;
  }

  return bestBlob;
}

async function uploadImage(blob, capturedFace, setCapturedFace, setOriginalCapturedFace) {
  const formData = new FormData();
  formData.append("image", blob, "captured.jpg");
  formData.append("message", "hidden message");

  const response = await fetch("/upload-image", { method: "POST", body: formData });
  if (!response.ok) throw new Error("Upload failed");

  const data = await response.json();
  if (!data.face_validated) throw new Error("Face not detected");

  capturedFace = data.image_base64;
  await setCapturedFace(capturedFace);
  await setOriginalCapturedFace(data.original_image_base64);

  const loader = document.getElementById("successLoader");
  if (loader) {
    loader.classList.remove("hidden");
    setTimeout(() => loader.classList.add("hidden"), 3000);
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

    // Higher target resolution for better quality
    const targetWidth = 1012; // 2x original for better quality
    const targetHeight = 638;

    idCanvas.width = targetWidth;
    idCanvas.height = targetHeight;
    const ctx = idCanvas.getContext("2d", { willReadFrequently: true });
    ctx.clearRect(0, 0, targetWidth, targetHeight);

    const videoWidth = idVideo.videoWidth;
    const videoHeight = idVideo.videoHeight;
    const isMobile = /Mobi|Android/i.test(navigator.userAgent);

    // Create process canvas at video resolution
    const processCanvas = document.createElement("canvas");
    processCanvas.width = videoWidth;
    processCanvas.height = videoHeight;
    const processCtx = processCanvas.getContext("2d", {
      willReadFrequently: true,
    });

    // Draw video frame to process canvas
    processCtx.drawImage(idVideo, 0, 0, videoWidth, videoHeight);

    // Apply enhanced image processing
    const enhancedImage = await optimizeImageForOCR(processCanvas);

    // Configure high-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.filter = "contrast(1.05) brightness(1.02)"; // Mild global enhancement

    const zoomFactor = isMobile ? 1.0 : 1.2; // Reduced zoom to maintain quality
    let drawWidth,
      drawHeight,
      offsetX = 0,
      offsetY = 0;

    if (isMobile) {
      // For mobile (rotated) - maintain aspect ratio
      const scale =
        Math.min(targetWidth / videoHeight, targetHeight / videoWidth) *
        zoomFactor;

      drawWidth = videoWidth * scale;
      drawHeight = videoHeight * scale;

      ctx.save();
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate(-Math.PI / 2);

      // Draw with high quality scaling
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
      // For desktop - maintain aspect ratio and center
      const scale =
        Math.min(targetWidth / videoWidth, targetHeight / videoHeight) *
        zoomFactor;

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

    // Reset filter
    ctx.filter = "none";

    // Apply final sharpening
    await applySharpening(idCanvas);

    // Higher quality JPEG with better compression
    const imgBase64 = idCanvas.toDataURL("image/jpeg", 0.92);

    const response = await fetch("/upload-image-id", {
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
      localStorage.setItem("frontUpload", verification?.base64_original);
      // stored the processed id
      localStorage.setItem("frontUploadWaterMarked", verification?.base64_watermarked)
    } else {
      localStorage.setItem("backUpload", verification?.base64_original);
      localStorage.setItem("backUploadWaterMarked", verification?.base64_watermarked)
    }
    return true;
  } catch (error) {
    console.log("ID capture error:", error);
    const errorloader = document.getElementById("errorLoader");
    errorloader.classList.remove("hidden");
    setTimeout(() => errorloader.classList.add("hidden"), 3000);
    if (side === "idFront") {
      localStorage.setItem("frontUpload", "");
      localStorage.setItem("frontUploadWaterMarked", "");
    } else {
      localStorage.setItem("backUpload", "");
      localStorage.setItem("backUploadWaterMarked", "");
    }
    return false;
  } finally {
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.add("hidden");
  }
}

// Enhanced image optimization for OCR
async function optimizeImageForOCR(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  // More balanced enhancement values
  const contrast = 1.15;
  const brightness = 8;
  const saturation = 1.1;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Calculate luminance
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;

    // Apply contrast and brightness
    let newR = (r - 128) * contrast + 128 + brightness;
    let newG = (g - 128) * contrast + 128 + brightness;
    let newB = (b - 128) * contrast + 128 + brightness;

    // Apply saturation
    const satR = luminance + (newR - luminance) * saturation;
    const satG = luminance + (newG - luminance) * saturation;
    const satB = luminance + (newB - luminance) * saturation;

    // Clamp values
    data[i] = Math.min(255, Math.max(0, satR));
    data[i + 1] = Math.min(255, Math.max(0, satG));
    data[i + 2] = Math.min(255, Math.max(0, satB));
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

// Sharpening filter for better text clarity
async function applySharpening(canvas) {
  const ctx = canvas.getContext("2d");
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const width = canvas.width;
  const height = canvas.height;

  // Create a copy for original values
  const originalData = new Uint8ClampedArray(data);

  // Mild sharpening kernel
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = (y * width + x) * 4;

      // Apply simple sharpening to enhance edges
      for (let channel = 0; channel < 3; channel++) {
        const current = originalData[idx + channel];
        const above = originalData[((y - 1) * width + x) * 4 + channel];
        const below = originalData[((y + 1) * width + x) * 4 + channel];
        const left = originalData[(y * width + (x - 1)) * 4 + channel];
        const right = originalData[(y * width + (x + 1)) * 4 + channel];

        // Sharpening formula
        const sharpened = current * 2 - (above + below + left + right) / 4;
        data[idx + channel] = Math.min(255, Math.max(0, sharpened));
      }
    }
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
