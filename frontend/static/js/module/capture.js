export async function captureFace(
  captureBtn,
  detectionInterval,
  cameraPage,
  video,
  canvas,
  capturedFace,
  previewPage,
  previewImage,
  submitBtn,
  setCapturedFace
) {
  try {
    captureBtn.disabled = true;
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.remove("hidden");

    // Ensure frame is ready
    await new Promise((resolve) => setTimeout(resolve, 200));

    // Capture original frame (mirrored)
    const ctx = canvas.getContext("2d");
    ctx.save();
    ctx.scale(-1, 1);
    ctx.drawImage(video, -canvas.width, 0, canvas.width, canvas.height);
    ctx.restore();

    clearInterval(detectionInterval);

    // Create high-quality square crop
    const size = Math.min(canvas.width, canvas.height);
    const squareCanvas = document.createElement("canvas");
    squareCanvas.width = size;
    squareCanvas.height = size;

    const squareCtx = squareCanvas.getContext("2d");
    const offsetX = (canvas.width - size) / 2;
    const offsetY = (canvas.height - size) / 2;

    // Direct pixel copy (no resizing)
    squareCtx.drawImage(
      canvas,
      offsetX,
      offsetY, // Source X/Y
      size,
      size, // Source width/height
      0,
      0, // Destination X/Y
      size,
      size // Destination width/height (same as source = no resize)
    );

    // Display preview
    const frozenFrame = document.createElement("img");
    frozenFrame.src = squareCanvas.toDataURL("image/png");
    frozenFrame.id = "frozenFrame";
    frozenFrame.className = "absolute top-0 left-0 w-full h-full object-cover";
    cameraPage.appendChild(frozenFrame);
    video.classList.add("hidden");

    // Upload with maximum quality
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
          console.log(data)
          if (!data.face_validated){
            if (submitBtn) {
              capturedFace = "https://static.vecteezy.com/system/resources/previews/017/178/222/original/round-cross-mark-symbol-with-transparent-background-free-png.png"
              // Change icon to X
              submitBtn.innerHTML = '❌ Next'; 
              
              // Disable the button
              submitBtn.disabled = true;
              
              // Optional: Add disabled styling
              submitBtn.style.opacity = '0.6';
              submitBtn.style.cursor = 'not-allowed';
            }
          }else{

            capturedFace = data.image_url;
            //get the uploaded filename
            document.getElementById("uploadedFilename").value = data.filename;
            await setCapturedFace(capturedFace);
            // UI updates
            if (submitBtn) submitBtn.textContent = "✅ Next";
            // Disable the button
              submitBtn.disabled = false;
              // Optional: Add enabled styling
              submitBtn.style.opacity = '1';
              submitBtn.style.cursor = 'pointer';
          }
          if (cameraPage) cameraPage.classList.add("hidden");
          if (previewPage) {
            previewPage.classList.add("fade-in");
            previewPage.classList.remove("hidden");
          }
          if (previewImage) previewImage.src = capturedFace;
        } catch (error) {
          console.error("Upload error:", error);
          alert("Failed to upload image. Please try again.");
        } finally {
          if (captureLoader) captureLoader.classList.add("hidden");
          const loader = document.getElementById("successLoader");
          loader.classList.remove("hidden");
          // Hide automatically after 1.5s
          setTimeout(() => loader.classList.add("hidden"), 2000);
        }
      },
      "image/png", // Use PNG for lossless compression
      1.0 // Maximum quality (no compression)
    );
  } catch (error) {
    console.error("Capture error:", error);
    alert("Failed to capture image. Please try again.");
    if (captureBtn) captureBtn.disabled = false;
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.add("hidden");
  }
}

export async function captureID(
  isRetriID,
  idCanvas,
  idVideo,
  currentStep,
  capturedFront,
  capturedBack,
  shouldFaceUser,
  startIDCamera,
  updateInstruction,
  setStep,
  setShouldFaceUser,
  setCapturedFront,
  setCapturedBack,
  showFinalReview
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

    // Original scaling logic (unchanged)
    const videoAspectRatio = videoWidth / videoHeight;
    let drawWidth,
      drawHeight,
      offsetX = 0,
      offsetY = 0;
    const zoomFactor = isMobile ? 1.55 : 1.7;

    if (isMobile) {
      drawHeight = targetHeight;
      drawWidth = targetHeight * videoAspectRatio;

      if (drawWidth < targetWidth) {
        offsetX = (targetWidth - drawWidth) / 2;
        drawWidth = targetWidth;
      }

      drawWidth *= zoomFactor;
      drawHeight *= zoomFactor;
    } else {
      const scale = Math.max(
        targetWidth / videoWidth,
        targetHeight / videoHeight
      );
      drawWidth = videoWidth * scale * zoomFactor;
      drawHeight = videoHeight * scale * zoomFactor;
      offsetX = (targetWidth - drawWidth) / 2;
      offsetY = (targetHeight - drawHeight) / 2;
    }

    // High-quality rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.fillStyle = "#f8f8f8"; // Slightly off-white background
    ctx.fillRect(0, 0, targetWidth, targetHeight);

    ctx.save();
    if (isMobile) {
      ctx.translate(targetWidth / 2, targetHeight / 2);
      ctx.rotate(Math.PI / 2);
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
    } else {
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
    ctx.restore();

    // High quality but not max to avoid huge files (0.95 quality)
    const img = idCanvas.toDataURL("image/jpeg", 0.95);
    const blob = await fetch(img).then((res) => res.blob());
    const formData = new FormData();
    formData.append("image", blob, `id_${currentStep}.jpg`);
    formData.append("side", currentStep);

    const response = await fetch("/verify-id", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) throw new Error("Verification failed");
    const verification = await response.json();

    if (!verification.valid) {
      throw new Error(verification.message || "ID verification failed");
    }

    if (currentStep === "idFront") {
      setCapturedFront(verification.image_url);
      document.getElementById("uploadedFilenameIdFront").value =
        verification.filename;
      if (!isRetriID) {
        await setStep("idBack");
        await startIDCamera();
        await updateInstruction("Now capture the back side of your ID");
      } else {
        await showFinalReview();
      }
    } else {
      setCapturedBack(verification.image_url);
      document.getElementById("uploadedFilenameIdBack").value =
        verification.filename;
      await showFinalReview();
    }
  } catch (error) {
    console.error("ID capture error:", error);
    alert(error.message || "Failed to capture ID image. Please try again.");
    if (currentStep === "idFront") {
      await setShouldFaceUser(true);
      await startIDCamera();
    }
  } finally {
    const captureLoader = document.getElementById("captureLoader");
    if (captureLoader) captureLoader.classList.add("hidden");
    const loader = document.getElementById("successLoader");
    loader.classList.remove("hidden");
    // Hide automatically after 1.5s
    setTimeout(() => loader.classList.add("hidden"), 2000);
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
