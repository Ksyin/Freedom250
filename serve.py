#!/usr/bin/env python3
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import urllib.parse
import os

class Freedom250Handler(SimpleHTTPRequestHandler):
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        # Normalize trailing slash - Redirect to clean URL to fix relative asset paths
        if path != '/' and path.endswith('/'):
            self.send_response(301)
            self.send_header('Location', path[:-1])
            self.end_headers()
            return

        print(f"📱 Request: {path}")

        # Serve static files directly if they exist
        local_path = self.translate_path(path)
        
        if os.path.isfile(local_path):
            return super().do_GET()

        # Route Mappings (Match with _redirects and vercel.json)
        routes = {
            '/participant': 'dashboard-participant.html',
            '/volunteer': 'dashboard-volunteer.html',
            '/booth-admin': 'dashboard-booth-admin.html',
            '/admin': 'dashboard-admin.html',
            '/organizer': 'dashboard-organizer.html',
            '/login': 'login.html',
            '/register': 'register.html'
        }

        if path in routes:
            target_file = routes[path]
            # Verify the file actually exists on disk
            if os.path.exists(os.path.join(os.getcwd(), target_file)):
                self.path = '/' + target_file
                print(f"   ✅ Routing {path} -> {target_file}")
                return super().do_GET()
            else:
                print(f"   ❌ Target file NOT FOUND: {target_file}")

        # If path doesn't have an extension, try adding .html
        if '.' not in path:
            html_path = local_path + '.html'
            if os.path.exists(html_path):
                self.path = path + '.html'
                return super().do_GET()

        # SPA fallback: Serve index.html for unknown routes
        print(f"   🔄 Fallback to index.html for: {path}")
        self.path = '/index.html'
        return super().do_GET()

    def log_message(self, format, *args):
        # Quiet down the logs a bit
        pass

if __name__ == "__main__":
    port = 8000
    server = ThreadingHTTPServer(("0.0.0.0", port), Freedom250Handler)
    print("\n" + "="*60)
    print("🎉 FREEDOM 250 - EVENT PLATFORM SERVER 🎉")
    print("="*60)
    print(f"\n📍 URL: http://localhost:{port}")
    print("\n🚀 AVAILABLE ROUTES:")
    print(f"   🏠 Home:         http://localhost:{port}/")
    print(f"   🎟️ Participant:  http://localhost:{port}/participant")
    print(f"   🤝 Volunteer:    http://localhost:{port}/volunteer")
    print(f"   🏪 Booth Admin:  http://localhost:{port}/booth-admin")
    print(f"   👑 Admin:        http://localhost:{port}/admin")
    print(f"   👑 Organizer:    http://localhost:{port}/organizer")
    print(f"   🔑 Login:        http://localhost:{port}/login")
    print("\n✨ Press Ctrl+C to stop\n")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n👋 Shutting down...")
        server.shutdown()