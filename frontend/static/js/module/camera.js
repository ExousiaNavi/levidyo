// setup camera for face capture and initialize detection
export async function setupCameraAndRunDetection(
  shouldFaceUser,
  stream,
  video,
  overlay,
  canvas,
  showCameraLoading,
  hideCameraLoading,
  stopCamera,
  runDetection,
  cameraError,
  showCameraError
) {
  await showCameraLoading();
  await stopCamera();

  // Get the camera container dimensions
  const cameraWrapper = document.getElementById("camera-wrapper");
  const wrapperWidth = cameraWrapper.clientWidth;
  const wrapperHeight = cameraWrapper.clientHeight;

  // Set up constraints - let browser choose optimal resolution
  const constraints = {
    audio: false,
    video: {
      facingMode: shouldFaceUser ? "user" : "environment",
      width: { ideal: 1280 }, // Let browser decide based on device capabilities
      height: { ideal: 720 },
    },
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = async () => {
        // Calculate aspect ratios
        const videoAspect = video.videoWidth / video.videoHeight;
        const wrapperAspect = wrapperWidth / wrapperHeight;

        // Set canvas dimensions to match video stream
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Center and scale video properly
        if (videoAspect > wrapperAspect) {
          // Video is wider than container (landscape)
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.left = "0";
          video.style.top = "50%";
          video.style.transform = `translateY(-50%) ${
            shouldFaceUser ? "scaleX(-1)" : ""
          }`;
        } else {
          // Video is taller than container (portrait)
          video.style.width = "100%";
          video.style.height = "100%";
          video.style.left = "50%";
          video.style.top = "0";
          video.style.transform = `translateX(-50%) ${
            shouldFaceUser ? "scaleX(-1)" : ""
          }`;
        }

        // video.style.position = "absolute";
        // video.style.objectFit = "cover";
        await hideCameraLoading();
        resolve();
      };
      video.onerror = reject;
      video.play().catch(reject);
    });

    await runDetection();
  } catch (error) {
    console.error("Camera error:", error);

    await showCameraError(
      cameraError,
      `Could not access camera: ${error.message}`
    );

    // Fallback to basic constraints
    try {
      const fallbackStream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: true, // Let browser choose completely
      });
      video.srcObject = fallbackStream;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = async () => {
          // Same positioning logic as above
          const videoAspect = video.videoWidth / video.videoHeight;
          const wrapperAspect = wrapperWidth / wrapperHeight;

          overlay.width = video.videoWidth;
          overlay.height = video.videoHeight;

          if (videoAspect > wrapperAspect) {
            video.style.width = "100%";
            video.style.height = "100%";
            video.style.left = "0";
            video.style.top = "50%";
            video.style.transform = `translateY(-50%) ${
              shouldFaceUser ? "scaleX(-1)" : ""
            }`;
          } else {
            video.style.width = "auto";
            video.style.height = "100%";
            video.style.left = "50%";
            video.style.top = "0";
            video.style.transform = `translateX(-50%) ${
              shouldFaceUser ? "scaleX(-1)" : ""
            }`;
          }

          await hideCameraLoading();
          resolve();
        };
        video.play().catch(reject);
      });

      await runDetection();
    } catch (fallbackError) {
      console.error("Fallback camera error:", fallbackError);
      await showCameraError(
        cameraError,
        `Camera error: ${fallbackError.message}. Please try again.`
      );
    }
  }
}

// setup camera for back and front
export async function startIDCamera(
  stream, // variables
  idVideo, // variables
  idOverlay, // variables
  stopCamera // function
) {
  const isMobile = window.innerWidth <= 768; // Detect mobile
  try {
    // Always request the back (environment) camera
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { exact: "environment" }, // Force back camera only
        width: { ideal: isMobile ? 720 : 1280 },
        height: { ideal: isMobile ? 1280 : 720 }, // Higher for portrait
        aspectRatio: 1.585, // ID card ratio
      },
    });

    idVideo.srcObject = stream;
    await idVideo.play();
    await adjustOverlaySize();

  } catch (error) {
    console.error("Back camera not available:", error);
    const cameraError = document.getElementById("cameraError");
    if (cameraError) {
      cameraError.classList.remove("hidden");
    }
    // alert("Back camera is required to capture your ID. Please enable permissions or switch to a device with a back camera.");
    // if (stopCamera) stopCamera();
  }

  async function adjustOverlaySize() {
    const ctx = idOverlay.getContext("2d");

    async function detectLoop() {
      // 🔥 Dynamically adjust overlay size every frame
      idOverlay.width = idVideo.clientWidth;
      idOverlay.height = idVideo.clientHeight;

      const overlayWidth = idOverlay.width;
      const overlayHeight = idOverlay.height;

      const isMobile = window.innerWidth <= 768;

      const guideHeight = isMobile ? overlayHeight * 0.76 : overlayHeight *0.75;
      const guideWidth = isMobile ? overlayWidth * 0.65 : overlayWidth * 0.55;
      const guideX = (overlayWidth - guideWidth) / 2;
      const guideY = (overlayHeight - guideHeight) / 2;

      ctx.clearRect(0, 0, overlayWidth, overlayHeight);
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, overlayWidth, overlayHeight);

      ctx.save();
      ctx.globalCompositeOperation = "destination-out";
      ctx.fillRect(guideX, guideY, guideWidth, guideHeight);
      ctx.restore();

      // Green border
      ctx.beginPath();
      ctx.rect(guideX, guideY, guideWidth, guideHeight);
      ctx.lineWidth = 4;
      ctx.strokeStyle = "green";
      ctx.shadowBlur = 15;
      ctx.shadowColor = "green";
      ctx.stroke();

      // Grid lines
      const thirdW = guideWidth / 3;
      const thirdH = guideHeight / 3;
      ctx.beginPath();
      ctx.moveTo(guideX + thirdW, guideY);
      ctx.lineTo(guideX + thirdW, guideY + guideHeight);
      ctx.moveTo(guideX + 2 * thirdW, guideY);
      ctx.lineTo(guideX + 2 * thirdW, guideY + guideHeight);
      ctx.moveTo(guideX, guideY + thirdH);
      ctx.lineTo(guideX + guideWidth, guideY + thirdH);
      ctx.moveTo(guideX, guideY + 2 * thirdH);
      ctx.lineTo(guideX + guideWidth, guideY + 2 * thirdH);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
      ctx.stroke();

      requestAnimationFrame(detectLoop);
    }

    await detectLoop();
  }
}
