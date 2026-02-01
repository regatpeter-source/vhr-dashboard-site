from pathlib import Path
root = Path('dist-client')
replaced = []
for path in sorted(root.rglob('*')):
    if not path.is_file():
        continue
    try:
        text = path.read_text(errors='ignore')
    except UnicodeDecodeError:
        continue
    if 'vhr-dashboard-site.onrender.com' in text:
        new_text = text.replace('https://vhr-dashboard-site.onrender.com', 'https://vhr-dashboard-site.com')
        new_text = new_text.replace('vhr-dashboard-site.onrender.com', 'vhr-dashboard-site.com')
        if new_text != text:
            path.write_text(new_text)
            replaced.append(str(path.relative_to(root)))
print('updated', len(replaced), 'files')
for p in replaced:
    print(p)
