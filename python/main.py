import cv2
import base64
import threading
import time

from arduino.app_utils import App
from arduino.app_bricks.web_ui import WebUI

ui = WebUI()

# --------------------------------------------------------------------------- #
# Background thread: stream webcam frames to the browser
# --------------------------------------------------------------------------- #

def camera_loop():
    """Continuously read frames from the webcam and stream them to the UI."""
    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        ui.send_message("webcam_error", {"message": "Webcam nicht gefunden (Index 0)"})
        return

    while True:
        ret, frame = cap.read()
        if not ret:
            time.sleep(0.1)
            continue

        ret2, buf = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 85])
        if ret2:
            jpg_b64 = base64.b64encode(buf).decode('utf-8')
            ui.send_message("frame", {"image": jpg_b64})

        time.sleep(1 / 30)

    cap.release()


threading.Thread(target=camera_loop, daemon=True).start()

App.run()
