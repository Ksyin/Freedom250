#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import urllib.parse

class Freedom250Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        print(f"📱 Request: {path}")

        if path == '/' or path == '':
            self.path = '/index.html'
            return super().do_GET()

        # Normalize trailing slash for dashboard route matching
        if path != '/' and path.endswith('/'):
            path = path[:-1]

        # Check for static files
        file_path = self.translate_path(path)
        if Path(file_path).exists() and '.' in path:
            return super().do_GET()

        # Dashboard routes
        dashboard_routes = {
            '/participant': '/dashboard-participant.html',
            '/volunteer': '/dashboard-volunteer.html',
            '/booth-admin': '/dashboard-booth-admin.html',
            '/organizer': '/dashboard-organizer.html',
            '/admin': '/dashboard-admin.html',
            '/super-admin': '/dashboard-admin.html',
        }

        if path in dashboard_routes:
            self.path = dashboard_routes[path]
            target_path = self.translate_path(self.path)
            if Path(target_path).exists():
                print(f"   ✅ Serving: {self.path}")
                return super().do_GET()
            else:
                print(f"   ❌ File not found: {target_path}")

        # SPA fallback
        self.path = '/index.html'
        return super().do_GET()

    def log_message(self, format, *args):
        if args[0] != '200':
            print(f"⚠️ {format % args}")

if __name__ == "__main__":
    port = 8000
    server = ThreadingHTTPServer(("0.0.0.0", port), Freedom250Handler)
    print("\n" + "="*60)
    print("🎉 FREEDOM 250 - EVENT ENGAGEMENT PLATFORM 🎉")
    print("="*60)
    print(f"\n📍 Server: http://localhost:{port}")
    print("\n📱 DASHBOARDS (Mobile-First):")
    print(f"   🎟️  Participant:  http://localhost:{port}/participant")
    print(f"   🤝 Volunteer:    http://localhost:{port}/volunteer")
    print(f"   🏪 Booth Admin:  http://localhost:{port}/booth-admin")
    print(f"   👑 Super Admin:  http://localhost:{port}/admin")
    print("\n✨ Press Ctrl+C to stop\n")
    print("="*60 + "\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        server.shutdown()