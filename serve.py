from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


class SpaHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.translate_path(self.path)
        if not Path(path).exists() and "." not in Path(self.path).name:
            self.path = "/index.html"
        return super().do_GET()


if __name__ == "__main__":
    port = 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), SpaHandler)
    print(f"Serving Freedom 250 at http://127.0.0.1:{port}")
    server.serve_forever()
