"""Build the offline HTML and ZIP from the same sources as the published app."""
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
import json
import re

root = Path(__file__).resolve().parent.parent
version = json.loads((root / 'package.json').read_text())['version']
html = (root / 'index.html').read_text()
css = (root / 'style.css').read_text()
parts = []
for name in ('arithmetic.js', 'sound.js', 'app.js'):
    source = (root / name).read_text()
    source = re.sub(r'^import .*?;\n', '', source, flags=re.M)
    source = re.sub(r'^export ', '', source, flags=re.M)
    parts.append(source)
code = '(function(){\n"use strict";\n' + '\n'.join(parts) + '\n})();'
html = html.replace(f'<link rel="stylesheet" href="style.css?v={version}">', '<style>\n' + css + '\n</style>')
html = html.replace(f'<script type="module" src="app.js?v={version}"></script>', '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>')
assert not re.search(r'<(?:script|link)\b[^>]*(?:src|href)=', html), 'External dependency remains'
output = root / 'downloads'
output.mkdir(exist_ok=True)
(output / 'hissankun.html').write_text(html)
with ZipFile(output / 'hissankun.zip', 'w', ZIP_DEFLATED) as archive:
    archive.writestr('hissankun.html', html)
print(f'Standalone HTML and ZIP generated: version {version}')
