from pathlib import Path
from PIL import Image

IMAGE_DIRS = [
    Path('static/images/characters'),
    Path('static/images/items'),
    Path('static/images/ui'),
    Path('static/images/enemies'),
]

def optimize(p):
    try:
        img = Image.open(p)
    except Exception:
        return
    if img.format != 'PNG':
        return
    img.save(p, optimize=True)


def main():
    for d in IMAGE_DIRS:
        for path in d.glob('*'):
            if path.is_file():
                optimize(path)

if __name__ == '__main__':
    main()
