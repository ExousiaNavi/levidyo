// setup camera for face capture and initialize detection
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

  // Set up constraints - request higher resolution for better quality
  const constraints = {
    audio: false,
    video: {
      facingMode: shouldFaceUser ? "user" : "environment",
      width: { ideal: 1920, max: 3840 }, // Request higher resolution
      height: { ideal: 1080, max: 2160 },
      frameRate: { ideal: 30, max: 60 },
      // Add advanced constraints for better quality
      advanced: [
        { width: 3840, height: 2160 }, // 4K if available
        { width: 1920, height: 1080 }, // Full HD
        { width: 1280, height: 720 },  // HD fallback
      ]
    },
  };

  try {
    stream = await navigator.mediaDevices.getUserMedia(constraints);
    video.srcObject = stream;
    video.setAttribute("playsinline", "true");

    await new Promise((resolve, reject) => {
      video.onloadedmetadata = async () => {
        console.log(`Video resolution: ${video.videoWidth}x${video.videoHeight}`);
        
        // Set overlay and canvas to match actual video resolution
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Reset all styles first
        video.style.width = '';
        video.style.height = '';
        video.style.left = '';
        video.style.top = '';
        video.style.transform = '';
        video.style.objectFit = '';

        // Calculate aspect ratios
        const videoAspect = video.videoWidth / video.videoHeight;
        const wrapperAspect = wrapperWidth / wrapperHeight;

        // Optimize video display for maximum quality
        if (videoAspect > wrapperAspect) {
          // Video is wider than container - fit to height
          video.style.width = 'auto';
          video.style.height = '100%';
          video.style.objectFit = 'cover';
          video.style.left = '50%';
          video.style.top = '0';
          video.style.transform = `translateX(-50%) ${shouldFaceUser ? 'scaleX(-1)' : ''}`;
        } else {
          // Video is taller than container - fit to width
          video.style.width = '100%';
          video.style.height = 'auto';
          video.style.objectFit = 'cover';
          video.style.left = '0';
          video.style.top = '50%';
          video.style.transform = `translateY(-50%) ${shouldFaceUser ? 'scaleX(-1)' : ''}`;
        }

        // Ensure video takes full container
        video.style.position = 'absolute';
        video.style.maxWidth = 'none';
        video.style.maxHeight = 'none';

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

    // Fallback to basic constraints but still try for good quality
    try {
      console.log("Trying fallback camera constraints...");
      const fallbackConstraints = {
        audio: false,
        video: {
          facingMode: shouldFaceUser ? "user" : "environment",
          width: { min: 640, ideal: 1280 },
          height: { min: 480, ideal: 720 },
        },
      };

      const fallbackStream = await navigator.mediaDevices.getUserMedia(fallbackConstraints);
      video.srcObject = fallbackStream;

      await new Promise((resolve, reject) => {
        video.onloadedmetadata = async () => {
          console.log(`Fallback video resolution: ${video.videoWidth}x${video.videoHeight}`);
          
          // Set overlay and canvas to match actual video resolution
          overlay.width = video.videoWidth;
          overlay.height = video.videoHeight;
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;

          // Reset styles
          video.style.width = '';
          video.style.height = '';
          video.style.left = '';
          video.style.top = '';
          video.style.transform = '';
          video.style.objectFit = '';

          const videoAspect = video.videoWidth / video.videoHeight;
          const wrapperAspect = wrapperWidth / wrapperHeight;

          if (videoAspect > wrapperAspect) {
            video.style.width = 'auto';
            video.style.height = '100%';
            video.style.objectFit = 'cover';
            video.style.left = '50%';
            video.style.top = '0';
            video.style.transform = `translateX(-50%) ${shouldFaceUser ? 'scaleX(-1)' : ''}`;
          } else {
            video.style.width = '100%';
            video.style.height = 'auto';
            video.style.objectFit = 'cover';
            video.style.left = '0';
            video.style.top = '50%';
            video.style.transform = `translateY(-50%) ${shouldFaceUser ? 'scaleX(-1)' : ''}`;
          }

          video.style.position = 'absolute';
          video.style.maxWidth = 'none';
          video.style.maxHeight = 'none';

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
        `Camera error: ${fallbackError.message}. Please check camera permissions and try again.`
      );
    }
  }
}

// setup camera for back and front
// export async function startIDCamera(
//   stream, // variables
//   idVideo, // variables
//   idOverlay, // variables
//   stopCamera // function
// ) {
//   const isMobile = window.innerWidth <= 768; // Detect mobile
//   try {
//     // Always request the back (environment) camera
//     stream = await navigator.mediaDevices.getUserMedia({
//       audio: false,
//       video: {
//         // facingMode: { ideal: "user" }, // Try for back camera but fallback if unavailable
//         facingMode: { exact: "environment" }, // Force back camera only
//         width: { ideal: isMobile ? 720 : 1280 },
//         height: { ideal: isMobile ? 1280 : 720 }, // Higher for portrait
//         aspectRatio: 1.585, // ID card ratio
//       },
//     });

//     idVideo.srcObject = stream;
//     await idVideo.play();
//     await adjustOverlaySize();

//   } catch (error) {
//     console.error("Back camera not available:", error);
//     const cameraError = document.getElementById("cameraError");
//     if (cameraError) {
//       cameraError.classList.remove("hidden");
//     }
//     // alert("Back camera is required to capture your ID. Please enable permissions or switch to a device with a back camera.");
//     // if (stopCamera) stopCamera();
//   }

//   async function adjustOverlaySize() {
//     const ctx = idOverlay.getContext("2d");

//     async function detectLoop() {
//       // 🔥 Dynamically adjust overlay size every frame
//       idOverlay.width = idVideo.clientWidth;
//       idOverlay.height = idVideo.clientHeight;

//       const overlayWidth = idOverlay.width;
//       const overlayHeight = idOverlay.height;

//       const isMobile = window.innerWidth <= 768;

//       const guideHeight = isMobile ? overlayHeight * 0.76 : overlayHeight *0.75;
//       const guideWidth = isMobile ? overlayWidth * 0.65 : overlayWidth * 0.55;
//       const guideX = (overlayWidth - guideWidth) / 2;
//       const guideY = (overlayHeight - guideHeight) / 2;

//       ctx.clearRect(0, 0, overlayWidth, overlayHeight);
//       ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
//       ctx.fillRect(0, 0, overlayWidth, overlayHeight);

//       ctx.save();
//       ctx.globalCompositeOperation = "destination-out";
//       ctx.fillRect(guideX, guideY, guideWidth, guideHeight);
//       ctx.restore();

//       // Green border
//       ctx.beginPath();
//       ctx.rect(guideX, guideY, guideWidth, guideHeight);
//       ctx.lineWidth = 4;
//       ctx.strokeStyle = "green";
//       ctx.shadowBlur = 15;
//       ctx.shadowColor = "green";
//       ctx.stroke();

//       // Grid lines
//       const thirdW = guideWidth / 3;
//       const thirdH = guideHeight / 3;
//       ctx.beginPath();
//       ctx.moveTo(guideX + thirdW, guideY);
//       ctx.lineTo(guideX + thirdW, guideY + guideHeight);
//       ctx.moveTo(guideX + 2 * thirdW, guideY);
//       ctx.lineTo(guideX + 2 * thirdW, guideY + guideHeight);
//       ctx.moveTo(guideX, guideY + thirdH);
//       ctx.lineTo(guideX + guideWidth, guideY + thirdH);
//       ctx.moveTo(guideX, guideY + 2 * thirdH);
//       ctx.lineTo(guideX + guideWidth, guideY + 2 * thirdH);
//       ctx.strokeStyle = "rgba(255,255,255,0.5)";
//       ctx.lineWidth = 1;
//       ctx.shadowBlur = 0;
//       ctx.stroke();

//       requestAnimationFrame(detectLoop);
//     }

//     await detectLoop();
//   }
// }

// adjusting quality to force
export async function startIDCamera(stream, idVideo, idOverlay, stopCamera) {
  const isMobile = window.innerWidth <= 768;

  try {
    // Request BEST POSSIBLE mobile resolution
    stream = await navigator.mediaDevices.getUserMedia({
      audio: false,
      video: {
        facingMode: { ideal: "environment" }, // works on iOS + Android
        width: { ideal: 1920 }, // request Full HD
        height: { ideal: 1080 }
      },
    });

    idVideo.srcObject = stream;
    await idVideo.play();

    // Wait until video metadata is ready
    await new Promise((res) => {
      if (idVideo.readyState >= 2) return res();
      idVideo.onloadedmetadata = res;
    });

    adjustOverlaySize(); // no await here
  } catch (error) {
    console.error("Back camera not available:", error);
    document.getElementById("cameraError")?.classList.remove("hidden");
  }

  function adjustOverlaySize() {
    const ctx = idOverlay.getContext("2d");

    function detectLoop() {
      // 🔥 Dynamically adjust overlay size every frame
      idOverlay.width = idVideo.clientWidth;
      idOverlay.height = idVideo.clientHeight;

      const overlayWidth = idOverlay.width;
      const overlayHeight = idOverlay.height;

      const isMobile = window.innerWidth <= 768;

      const guideHeight = isMobile
        ? overlayHeight * 0.76
        : overlayHeight * 0.75;
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

    detectLoop();
  }
}
