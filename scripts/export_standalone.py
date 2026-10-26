"""Create a single, directly openable HTML file. WebR is fetched from a pinned CDN."""
from pathlib import Path
import base64
import re
import sys

root = Path(__file__).resolve().parent.parent
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / 'R-Lernstudio.html'
html = (root / 'index.template.html').read_text()
css = (root / 'style.css').read_text()
for name in ('dm-sans-latin', 'manrope-latin', 'jetbrains-mono-latin'):
    font = base64.b64encode((root / f'assets/fonts/{name}.woff2').read_bytes()).decode()
    css = css.replace(f"assets/fonts/{name}.woff2", f'data:font/woff2;base64,{font}')
curriculum = (root / 'curriculum.js').read_text().replace('export const ', 'const ')
app = (root / 'app.js').read_text()
app = re.sub(r"^import .*?from './curriculum.js';\s*", '', app, count=1)
cdn = 'https://cdn.jsdelivr.net/npm/webr@0.4.2/dist/'
app = app.replace("import('./node_modules/webr/dist/webr.mjs')", "import(WEBR_BASE + 'webr.mjs')")
app = app.replace("new URL('./node_modules/webr/dist/',import.meta.url).href", 'WEBR_BASE')
app = app.replace('Stelle sicher, dass npm ci ausgeführt wurde und starte die Seite über den lokalen Server.', 'Für die R-Laufzeit brauchst du eine Internetverbindung. Öffne diese Datei in einem aktuellen Chrome, Edge oder Firefox und klicke auf „Erneut laden“.')
runtime_config = f"const WEBR_BASE = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname) ? new URL('./node_modules/webr/dist/', location.href).href : {cdn!r};\n"
# The filename is a download, so keep all course assets self-contained except WebR.
html = html.replace('<link rel="stylesheet" href="style.css">', '<style>' + css + '</style>')
svg = base64.b64encode((root / 'assets/favicon.svg').read_bytes()).decode()
html = html.replace('assets/favicon.svg', 'data:image/svg+xml;base64,' + svg)
script = (runtime_config + curriculum + '\n' + app).replace('</script', '<\\/script')
html = html.replace('<script type="module" src="app.js"></script>', '<script type="module">\n' + script + '\n</script>')
# Font licenses remain available inside the file.
licenses = '\n\n'.join(p.read_text() for p in sorted((root/'assets/fonts').glob('LICENSE*')))
html = html.replace('</body>', '<!-- Font licenses:\n' + licenses.replace('--', '—') + '\n-->\n</body>')
output.write_text(html)
print(f'{output} ({output.stat().st_size:,} bytes)')
