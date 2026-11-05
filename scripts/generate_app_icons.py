import os
import shutil
from PIL import Image, ImageDraw, ImageFilter

def make_rounded(img, radius_ratio=0.22):
    """Aplica esquinas redondeadas suaves con antialiasing"""
    w, h = img.size
    radius = int(min(w, h) * radius_ratio)
    
    # Máscara supersampleada x4 para bordes súper suaves
    scale = 4
    mask = Image.new('L', (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, w * scale, h * scale), radius=radius * scale, fill=255)
    mask = mask.resize((w, h), Image.Resampling.LANCZOS)
    
    out = img.convert('RGBA').copy()
    out.putalpha(mask)
    return out

def make_circle(img):
    """Aplica máscara circular perfecta con antialiasing"""
    w, h = img.size
    scale = 4
    mask = Image.new('L', (w * scale, h * scale), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, w * scale, h * scale), fill=255)
    mask = mask.resize((w, h), Image.Resampling.LANCZOS)
    
    out = img.convert('RGBA').copy()
    out.putalpha(mask)
    return out

def make_foreground(base_img, size):
    """Crea el icono adaptativo foreground centrado en la zona segura (inner ~70%)"""
    fg = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    # Tamaño seguro dentro de 108dp (área segura es ~72dp -> 66.6%)
    content_size = int(size * 0.72)
    # Redondear un poco el icono de contenido
    scaled = base_img.resize((content_size, content_size), Image.Resampling.LANCZOS)
    scaled_rounded = make_rounded(scaled, radius_ratio=0.22)
    
    offset = (size - content_size) // 2
    fg.paste(scaled_rounded, (offset, offset), scaled_rounded)
    return fg

def make_splash(base_icon, width, height, is_dark=False):
    """Crea una pantalla de bienvenida splash con el logo centrado y fondo elegante"""
    bg_color = (15, 23, 42) if is_dark else (255, 255, 255)
    splash = Image.new('RGB', (width, height), bg_color)
    
    # Calcular tamaño del logo: proporcional a la menor dimensión
    logo_size = int(min(width, height) * 0.38)
    if logo_size < 120:
        logo_size = 120
        
    icon_resized = base_icon.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    icon_rounded = make_rounded(icon_resized, radius_ratio=0.22)
    
    pos_x = (width - logo_size) // 2
    pos_y = (height - logo_size) // 2
    
    splash.paste(icon_rounded, (pos_x, pos_y), icon_rounded)
    return splash

def main():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    source_img_path = os.path.join(root_dir, 'public', 'assets', 'icon_cart_option.jpg')
    
    if not os.path.exists(source_img_path):
        raise FileNotFoundError(f"No existe {source_img_path}")
        
    print(f"Cargando imagen base: {source_img_path}")
    raw_img = Image.open(source_img_path)
    
    # Recorte centrado óptimo del squircle
    # Bounds: left=118, top=118, right=906, bottom=906 (788x788)
    cropped = raw_img.crop((118, 118, 906, 906))
    master_icon = cropped.resize((1024, 1024), Image.Resampling.LANCZOS)
    
    # 1. Guardar recursos web
    public_assets = os.path.join(root_dir, 'public', 'assets')
    os.makedirs(public_assets, exist_ok=True)
    
    # Master web icons
    master_icon_512 = master_icon.resize((512, 512), Image.Resampling.LANCZOS)
    master_icon_512.save(os.path.join(public_assets, 'icon-512.png'))
    
    master_icon_192 = master_icon.resize((192, 192), Image.Resampling.LANCZOS)
    master_icon_192.save(os.path.join(public_assets, 'icon-192.png'))
    
    # Favicon y logo principal
    fav32 = master_icon.resize((32, 32), Image.Resampling.LANCZOS)
    fav64 = master_icon.resize((64, 64), Image.Resampling.LANCZOS)
    fav64.save(os.path.join(root_dir, 'public', 'favicon.png'))
    
    # Guardar como .ico multicapa
    fav32.save(os.path.join(root_dir, 'public', 'favicon.ico'), format='ICO', sizes=[(16, 16), (32, 32), (48, 48), (64, 64)])
    master_icon_512.save(os.path.join(public_assets, 'logo.png'))
    print("[OK] Recursos web (favicon, icon-192, icon-512, logo) generados.")

    # 2. Generar iconos de Android Mipmap
    android_res = os.path.join(root_dir, 'android', 'app', 'src', 'main', 'res')
    
    densities = {
        'mipmap-mdpi': {'launcher': 48, 'fg': 108},
        'mipmap-hdpi': {'launcher': 72, 'fg': 162},
        'mipmap-xhdpi': {'launcher': 96, 'fg': 216},
        'mipmap-xxhdpi': {'launcher': 144, 'fg': 324},
        'mipmap-xxxhdpi': {'launcher': 192, 'fg': 432},
    }
    
    for folder, dims in densities.items():
        folder_path = os.path.join(android_res, folder)
        os.makedirs(folder_path, exist_ok=True)
        
        l_size = dims['launcher']
        fg_size = dims['fg']
        
        # ic_launcher.png (cuadrado redondeado)
        scaled_launcher = master_icon.resize((l_size, l_size), Image.Resampling.LANCZOS)
        rounded_launcher = make_rounded(scaled_launcher, radius_ratio=0.22)
        rounded_launcher.save(os.path.join(folder_path, 'ic_launcher.png'))
        
        # ic_launcher_round.png (circular)
        circle_launcher = make_circle(scaled_launcher)
        circle_launcher.save(os.path.join(folder_path, 'ic_launcher_round.png'))
        
        # ic_launcher_foreground.png (adaptativo con safe margin)
        fg_launcher = make_foreground(master_icon, fg_size)
        fg_launcher.save(os.path.join(folder_path, 'ic_launcher_foreground.png'))
        
        print(f"[OK] {folder}: launcher ({l_size}px), round ({l_size}px), foreground ({fg_size}px)")

    # 3. Generar Splash Screens para Android
    splash_targets = [
        ('drawable', 480, 320),
        ('drawable-land-mdpi', 480, 320),
        ('drawable-land-hdpi', 800, 480),
        ('drawable-land-xhdpi', 1280, 720),
        ('drawable-land-xxhdpi', 1600, 960),
        ('drawable-land-xxxhdpi', 1920, 1280),
        ('drawable-port-mdpi', 320, 480),
        ('drawable-port-hdpi', 480, 800),
        ('drawable-port-xhdpi', 720, 1280),
        ('drawable-port-xxhdpi', 960, 1600),
        ('drawable-port-xxxhdpi', 1280, 1920),
    ]
    
    for folder, w, h in splash_targets:
        folder_path = os.path.join(android_res, folder)
        os.makedirs(folder_path, exist_ok=True)
        splash_img = make_splash(master_icon, w, h, is_dark=False)
        splash_img.save(os.path.join(folder_path, 'splash.png'))
        print(f"[OK] Splash {folder}: ({w}x{h})")

    # 4. Actualizar color de fondo del launcher adaptativo a blanco limpio
    bg_xml_path = os.path.join(android_res, 'values', 'ic_launcher_background.xml')
    with open(bg_xml_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#F8FAFC</color>\n</resources>\n')
    print("[OK] ic_launcher_background.xml actualizado a #F8FAFC.")

    print("\nTodos los iconos y splash screens generados exitosamente!")

if __name__ == '__main__':
    main()
