export async function delete_uploaded_face(uploadedFilename) {
    if (!uploadedFilename) return; // ✅ only skip if empty

    try {
        const response = await fetch("/delete-image", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: uploadedFilename })
        });

        const result = await response.json();
        console.log(result.message);

        // Clear stored face
        localStorage.setItem("capturedFace", "");
    } catch (error) {
        console.error("Error deleting image:", error);
    }
}

export async function delete_uploaded_id(uploadedFilename, capturedStorage) {
    if (!uploadedFilename) return; // ✅ only skip if empty

    try {
        const response = await fetch("/delete-image-id", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ filename: uploadedFilename })
        });

        const result = await response.json();
        console.log(result.message);

        // Clear stored face
        localStorage.setItem(capturedStorage, "");
    } catch (error) {
        console.error("Error deleting image:", error);
    }
}

