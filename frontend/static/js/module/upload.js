// Handle file selection
export async function file_selection(
  fileInput,
  imagePreview,
  fileName,
  fileSize,
  previewContainer,
  uploadBtn
) {
  fileInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];

    if (!file) {
      //   await resetUploader();
      return;
    }

    // Validate file type
    if (!file.type.match("image/jpeg") && !file.type.match("image/png")) {
      alert("Please select a JPEG or PNG image file.");
      //   await resetUploader();
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      alert("File size exceeds 5MB limit.");
      //   await resetUploader();
      return;
    }

    // Display preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      imagePreview.src = e.target.result;
      fileName.textContent = file.name;
      fileSize.textContent = await formatFileSize(file.size);
      previewContainer.classList.remove("hidden");
      uploadBtn.disabled = false;
    };
    reader.readAsDataURL(file);
  });
}

export async function preventDefaults(e) {
  e.preventDefault();
  e.stopPropagation();
}

export async function highlight(dropArea) {
  dropArea.classList.add("border-emerald-500");
  dropArea.classList.remove("border-gray-300");
}

export async function unhighlight(dropArea) {
  dropArea.classList.remove("border-emerald-500");
  dropArea.classList.add("border-gray-300");
}

export async function handleDrop(e) {
  const dt = e.dataTransfer;
  const files = dt.files;

  if (files.length > 1) {
    alert("Please upload only one image at a time.");
    return;
  }

  fileInput.files = files;
  const event = new Event("change");
  fileInput.dispatchEvent(event);
}

export function uploadToServer(
  uploadBtn,
  fileInput,
  progressContainer,
  progressBar,
  progressPercent,
  imagePreview,
  fileName,
  fileSize,
  previewContainer,
  showFinalReview
  //   currentStep
) {
  return new Promise((resolve, reject) => {
    uploadBtn.addEventListener("click", () => {
      if (!fileInput.files[0]) return reject("No file selected");
      document.querySelector("#captureLoader").classList.remove("hidden");
      const file = fileInput.files[0];
      const formData = new FormData();
      formData.append("image", file);

      let endpoint = "/upload-image"; // Default face endpoint
      let currentStep = localStorage.getItem("step");
      if (currentStep === "idFront" || currentStep === "idBack") {
        endpoint = "/verify-id";
        formData.append("side", currentStep);
      } else {
        formData.append("message", "My secret message");
      }

      //   progressContainer.classList.remove("hidden");

      const xhr = new XMLHttpRequest();
      xhr.open("POST", endpoint, true);

      xhr.upload.addEventListener("progress", (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          //   progressBar.style.width = `${percentComplete}%`;
          //   progressPercent.textContent = `${Math.round(percentComplete)}%`;
        }
      });

      xhr.onload = async () => {
        // progressContainer.classList.add("hidden");
        document.querySelector("#captureLoader").classList.add("hidden");
        const loader = document.getElementById("successLoader");
        const errorloader = document.getElementById("faceErrorLoader");
        loader.classList.remove("hidden");
        // Hide automatically after 1.5s
        setTimeout(() => loader.classList.add("hidden"), 2000);

        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          console.log(`Upload success (${currentStep}):`, response);
          // ✅ Update step in localStorage
          let nextStep = currentStep;

          if (currentStep === "face") {
            if (!response.face_validated) {
              errorloader.classList.remove("hidden");
              setTimeout(() => errorloader.classList.add("hidden"), 5000);
            } else {
              nextStep = "idFront";
              localStorage.setItem("capturedFace", response.image_url);
              document.querySelector("#upload-type").textContent =
                "Upload your Front-ID";
            }
          } else if (currentStep === "idFront") {
            nextStep = "idBack";
            localStorage.setItem("capturedFront", response.image_url);
            document.querySelector("#upload-type").textContent =
              "Upload your Back-ID";
          } else if (currentStep === "idBack") {
            nextStep = "completed";
            localStorage.setItem("capturedBack", response.image_url);
            await showFinalReview();
          }

          localStorage.setItem("step", nextStep);
          await resetUploader(
            fileInput,
            imagePreview,
            fileName,
            fileSize,
            previewContainer,
            uploadBtn,
            progressContainer,
            progressBar,
            progressPercent
          );
          resolve({ ...response, nextStep });
        } else {
          const error = xhr.responseText || "Upload failed";
          reject(error);
        }
      };

      xhr.onerror = () => {
        progressContainer.classList.add("hidden");
        reject("Network error");
      };

      xhr.send(formData);
    });
  });
}

export async function resetUploader(
  fileInput,
  imagePreview,
  fileName,
  fileSize,
  previewContainer,
  uploadBtn,
  progressContainer,
  progressBar,
  progressPercent
) {
  console.log(
    fileInput,
    imagePreview,
    fileName,
    fileSize,
    previewContainer,
    uploadBtn,
    progressContainer,
    progressBar,
    progressPercent
  );
  fileInput.value = "";
  imagePreview.src = "";
  fileName.textContent = "";
  fileSize.textContent = "";
  previewContainer.classList.add("hidden");
  uploadBtn.disabled = true;
  progressContainer.classList.add("hidden");
  progressBar.style.width = "0%";
  progressPercent.textContent = "0%";
}
// HELPER FUNCTION
// Reset uploader

// Format file size
async function formatFileSize(bytes) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
