"""
เซิร์ฟเวอร์ static สำหรับพรีวิวตอนพัฒนา (ใช้โดย .claude/launch.json)
ต่างจาก `python -m http.server` ตรงที่ส่งหัว no-cache ทุก response
เพื่อให้เบราว์เซอร์โหลด CSS/JS/ฟอนต์ล่าสุดเสมอ ไม่ติด cache เก่า
(เฉพาะตอน dev เท่านั้น — ไม่เกี่ยวกับไฟล์ที่ deploy จริง)

รันเอง: python .claude/devserver.py [port]   (ค่าเริ่มต้นพอร์ต 5501)
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5501


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        # ฟอนต์ให้ cache ได้ (ไม่ค่อยเปลี่ยน) — ถ้า no-store ด้วย ทุกการเปลี่ยนหน้า
        # จะโหลดฟอนต์ใหม่และกระพริบเป็นฟอนต์สำรองชั่วขณะ
        if self.path.split("?")[0].startswith(("/assets/fonts/", "/dist/assets/fonts/")):
            self.send_header("Cache-Control", "public, max-age=86400")
        else:
            self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
            self.send_header("Pragma", "no-cache")
            self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        # ลด noise ใน log
        pass


class Server(socketserver.ThreadingTCPServer):
    allow_reuse_address = True


with Server(("", PORT), NoCacheHandler) as httpd:
    print(f"ORST dev server (no-cache) running at http://localhost:{PORT}")
    httpd.serve_forever()
