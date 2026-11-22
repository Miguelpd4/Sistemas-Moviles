# Uso: python3 scripts/logo.py (desde la raíz del repositorio; necesita Pillow).
"""Genera el logo de COPI: una «C» mayúscula naranja (#FF6A1A) sobre negro."""
from PIL import Image, ImageDraw, ImageFont

FONT = 'assets/fonts/InterDisplay-Black.otf'
ORANGE = (0xFF, 0x6A, 0x1A, 255)
BLACK = (0, 0, 0, 255)
OUT = 'assets/images/'


def draw_c(size, glyph_ratio, color, background):
    """Lienzo `size`×`size` con la C centrada ocupando `glyph_ratio` del alto."""
    scale = 4  # se dibuja grande y se reduce: bordes suaves
    big = size * scale
    img = Image.new('RGBA', (big, big), background)
    target = big * glyph_ratio
    font_size = int(target)
    for _ in range(30):
        font = ImageFont.truetype(FONT, font_size)
        box = font.getbbox('C')
        height = box[3] - box[1]
        if abs(height - target) < 2:
            break
        font_size = int(font_size * target / height)
    box = font.getbbox('C')
    w, h = box[2] - box[0], box[3] - box[1]
    x = (big - w) / 2 - box[0]
    y = (big - h) / 2 - box[1]
    ImageDraw.Draw(img).text((x, y), 'C', font=font, fill=color)
    return img.resize((size, size), Image.LANCZOS)


# Icono de la app (iOS, web y tiendas): negro a sangre con la C grande.
draw_c(1024, 0.62, ORANGE, BLACK).save(OUT + 'icon.png')
# Android adaptativo: fondo negro y C dentro de la zona segura (66 % central del lienzo).
Image.new('RGBA', (512, 512), BLACK).save(OUT + 'android-icon-background.png')
draw_c(512, 0.44, ORANGE, (0, 0, 0, 0)).save(OUT + 'android-icon-foreground.png')
# Icono monocromo (Android 13+ lo tiñe con el color del tema): solo la forma, en blanco.
draw_c(432, 0.44, (255, 255, 255, 255), (0, 0, 0, 0)).save(OUT + 'android-icon-monochrome.png')
# Favicon de la web.
draw_c(48, 0.66, ORANGE, BLACK).save(OUT + 'favicon.png')
# Pantalla de carga: la C sola sobre el fondo negro de la pantalla.
draw_c(512, 0.9, ORANGE, (0, 0, 0, 0)).save(OUT + 'splash-icon.png')
print('ok')
