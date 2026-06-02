// camera stream video element where live video will be displayed
let on_stream_video = document.querySelector('#camera-stream');

// button element used to flip (switch) between front and back cameras
let flipBtn = document.querySelector('#flip-btn');

// default media constraints: no audio, only video
let constraints = { audio: false, video: true }

// flag to track which camera is currently active
// true = front camera (selfie), false = back camera
let shouldFaceUser = true;

// check if browser supports facingMode (used for selecting front/back camera)
let supports = navigator.mediaDevices.getSupportedConstraints();
if (supports['facingMode'] === true) {
  // enable the flip button only if facingMode is supported
  flipBtn.disabled = false;
}

// variable to store the active media stream
let stream = null;

// function to start capturing from the camera
function capture() {
  // update video constraints based on which camera should be used
  constraints.video = {
    width: {
      min: 192,    // minimum width of video
      ideal: 192,  // preferred width
      max: 192     // maximum width
    },
    height: {
      min: 192,    // minimum height of video
      ideal: 192,  // preferred height
      max: 192     // maximum height
    },
    // select camera: 'user' = front, 'environment' = back
    facingMode: shouldFaceUser ? 'user' : 'environment'
  }

  // request access to camera with the specified constraints
  navigator.mediaDevices.getUserMedia(constraints)
    .then(function(mediaStream) {
      // store the media stream
      stream = mediaStream;
      // set the video element's source to the camera stream
      on_stream_video.srcObject = stream;
      // start playing the live video
      on_stream_video.play();
    })
    .catch(function(err) {
      // handle errors (e.g., permission denied, no camera)
      console.log(err);
    });
}

// event listener for the flip camera button
flipBtn.addEventListener('click', function() {
  if (stream == null) return; // no active stream, do nothing

  // stop all tracks (turn off current camera before switching)
  stream.getTracks().forEach(t => {
    t.stop();
  });

  // toggle camera mode (front ↔ back)
  shouldFaceUser = !shouldFaceUser;

  // re-capture with the new camera
  capture();
})

// start camera automatically on page load
capture();

// button click to take a snapshot from the video
document.getElementById("capture-camera").addEventListener("click", function() {
  // reference to the video element
  const video = document.querySelector('video');
  // set canvas size to match video frame
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  // draw current video frame onto the canvas (this is the captured image)
  canvas.getContext('2d').drawImage(video, 0, 0);
});
