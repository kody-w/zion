#!/usr/bin/env python3
"""
Generate high-quality tileable terrain textures for ZION MMO
Creates seamless 512x512 PNG textures for the unified world map
"""

from PIL import Image, ImageDraw, ImageFilter
import random
import math
import os

# Output directory
OUTPUT_DIR = "/Users/kodyw/Projects/Zion/docs/assets/textures/"

# Ensure output directory exists
os.makedirs(OUTPUT_DIR, exist_ok=True)

SIZE = 512


def add_noise(img, intensity=0.3):
    """Add random noise to image for texture variation"""
    pixels = img.load()
    w, h = img.size
    for x in range(w):
        for y in range(h):
            r, g, b = pixels[x, y]
            noise = random.randint(-int(30 * intensity), int(30 * intensity))
            pixels[x, y] = (
                max(0, min(255, r + noise)),
                max(0, min(255, g + noise)),
                max(0, min(255, b + noise))
            )
    return img


def make_tileable(img):
    """Make image seamlessly tileable using edge blending"""
    w, h = img.size
    result = img.copy()
    pixels = result.load()
    img_pixels = img.load()

    blend_width = int(w * 0.15)  # 15% blend zone
    blend_height = int(h * 0.15)

    # Blend horizontal edges
    for x in range(w):
        for y in range(blend_height):
            # Top edge
            blend = y / blend_height
            p1 = img_pixels[x, y]
            p2 = img_pixels[x, h - blend_height + y]
            pixels[x, y] = tuple(int(a * blend + b * (1 - blend)) for a, b in zip(p1, p2))

            # Bottom edge
            p1 = img_pixels[x, h - 1 - y]
            p2 = img_pixels[x, blend_height - 1 - y]
            pixels[x, h - 1 - y] = tuple(int(a * blend + b * (1 - blend)) for a, b in zip(p1, p2))

    # Blend vertical edges
    for y in range(h):
        for x in range(blend_width):
            # Left edge
            blend = x / blend_width
            p1 = pixels[x, y]
            p2 = img_pixels[w - blend_width + x, y]
            pixels[x, y] = tuple(int(a * blend + b * (1 - blend)) for a, b in zip(p1, p2))

            # Right edge
            p1 = pixels[w - 1 - x, y]
            p2 = img_pixels[blend_width - 1 - x, y]
            pixels[w - 1 - x, y] = tuple(int(a * blend + b * (1 - blend)) for a, b in zip(p1, p2))

    return result


def generate_grass():
    """Generate rich green grass texture"""
    print("Generating grass.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Base green color with variation
    for x in range(SIZE):
        for y in range(SIZE):
            r = random.randint(60, 120)
            g = random.randint(140, 200)
            b = random.randint(30, 80)
            pixels[x, y] = (r, g, b)

    # Add noise for grass blade texture
    img = add_noise(img, 0.4)

    # Add darker patches for depth
    draw = ImageDraw.Draw(img, 'RGBA')
    for _ in range(20):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        size = random.randint(20, 60)
        draw.ellipse([x, y, x + size, y + size], fill=(40, 100, 30, 80))

    # Blur slightly for organic feel
    img = img.filter(ImageFilter.GaussianBlur(1))

    # Make tileable
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "grass.png"))


def generate_grass_dark():
    """Generate darker forest floor grass"""
    print("Generating grass_dark.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Darker green-brown base
    for x in range(SIZE):
        for y in range(SIZE):
            r = random.randint(40, 80)
            g = random.randint(100, 150)
            b = random.randint(20, 60)
            pixels[x, y] = (r, g, b)

    # Add noise
    img = add_noise(img, 0.3)

    # Add dark spots (leaf debris)
    draw = ImageDraw.Draw(img, 'RGBA')
    for _ in range(40):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        size = random.randint(3, 10)
        draw.ellipse([x, y, x + size, y + size], fill=(20, 30, 10, 120))

    img = img.filter(ImageFilter.GaussianBlur(1))
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "grass_dark.png"))


def generate_dirt_path():
    """Generate packed dirt path texture"""
    print("Generating dirt_path.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Brown/tan base
    for x in range(SIZE):
        for y in range(SIZE):
            r = random.randint(140, 170)
            g = random.randint(110, 140)
            b = random.randint(70, 100)
            pixels[x, y] = (r, g, b)

    # Add noise
    img = add_noise(img, 0.25)

    # Add lighter streaks for worn areas
    draw = ImageDraw.Draw(img, 'RGBA')
    for _ in range(15):
        x1 = random.randint(0, SIZE)
        y1 = random.randint(0, SIZE)
        x2 = x1 + random.randint(-100, 100)
        y2 = y1 + random.randint(-100, 100)
        draw.line([x1, y1, x2, y2], fill=(180, 150, 110, 100), width=random.randint(2, 5))

    # Add small pebbles
    for _ in range(60):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        size = random.randint(1, 3)
        color = random.randint(100, 140)
        draw.ellipse([x, y, x + size, y + size], fill=(color, color - 20, color - 40))

    img = img.filter(ImageFilter.GaussianBlur(0.5))
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "dirt_path.png"))


def generate_stone():
    """Generate stone/marble texture for nexus"""
    print("Generating stone.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Light gray base
    for x in range(SIZE):
        for y in range(SIZE):
            base = random.randint(180, 220)
            pixels[x, y] = (base, base, base + random.randint(-5, 5))

    # Add subtle veining
    draw = ImageDraw.Draw(img, 'RGBA')
    for _ in range(25):
        x1 = random.randint(0, SIZE)
        y1 = random.randint(0, SIZE)
        x2 = x1 + random.randint(-200, 200)
        y2 = y1 + random.randint(-200, 200)
        darkness = random.randint(130, 160)
        draw.line([x1, y1, x2, y2], fill=(darkness, darkness, darkness, 80), width=random.randint(1, 2))

    img = img.filter(ImageFilter.GaussianBlur(1.5))
    img = add_noise(img, 0.1)
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "stone.png"))


def generate_sand():
    """Generate arena sand texture"""
    print("Generating sand.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Warm sand color
    for x in range(SIZE):
        for y in range(SIZE):
            r = random.randint(210, 230)
            g = random.randint(190, 210)
            b = random.randint(140, 170)
            pixels[x, y] = (r, g, b)

    # Fine grain noise
    img = add_noise(img, 0.2)

    # Subtle wind-blown patterns
    draw = ImageDraw.Draw(img, 'RGBA')
    for _ in range(10):
        y_pos = random.randint(0, SIZE)
        for x in range(SIZE):
            wave_y = y_pos + int(10 * math.sin(x * 0.05))
            if 0 <= wave_y < SIZE:
                draw.point([x, wave_y], fill=(200, 180, 130, 50))

    img = img.filter(ImageFilter.GaussianBlur(0.5))
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "sand.png"))


def generate_cobblestone():
    """Generate cobblestone pavement texture"""
    print("Generating cobblestone.png...")
    img = Image.new('RGB', (SIZE, SIZE), (100, 90, 80))
    draw = ImageDraw.Draw(img)

    # Draw irregular stones
    stones_x = 4
    stones_y = 4
    stone_size = SIZE // stones_x

    for row in range(stones_y):
        for col in range(stones_x):
            # Base position with random offset
            x = col * stone_size + random.randint(-10, 10)
            y = row * stone_size + random.randint(-10, 10)

            # Stone dimensions with variation
            w = stone_size + random.randint(-15, 15)
            h = stone_size + random.randint(-15, 15)

            # Stone color (gray-brown)
            r = random.randint(130, 160)
            g = random.randint(120, 150)
            b = random.randint(100, 130)

            # Draw stone
            draw.rectangle([x, y, x + w, y + h], fill=(r, g, b))

            # Add darker border
            draw.rectangle([x, y, x + w, y + h], outline=(r - 40, g - 40, b - 40), width=2)

    # Add texture to stones
    img = add_noise(img, 0.15)
    img = img.filter(ImageFilter.GaussianBlur(0.5))
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "cobblestone.png"))


def generate_water():
    """Generate water surface texture"""
    print("Generating water.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Blue-green base
    for x in range(SIZE):
        for y in range(SIZE):
            r = random.randint(40, 80)
            g = random.randint(120, 180)
            b = random.randint(180, 220)
            pixels[x, y] = (r, g, b)

    # Add wave patterns using sine curves
    draw = ImageDraw.Draw(img, 'RGBA')
    for wave in range(15):
        y_offset = random.randint(0, SIZE)
        phase = random.uniform(0, 2 * math.pi)
        amplitude = random.randint(10, 30)

        for x in range(SIZE):
            y = y_offset + int(amplitude * math.sin(x * 0.02 + phase))
            if 0 <= y < SIZE:
                # Lighter ripple highlights
                draw.ellipse([x - 2, y - 2, x + 2, y + 2], fill=(150, 200, 240, 100))

    img = img.filter(ImageFilter.GaussianBlur(2))
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "water.png"))


def generate_wood():
    """Generate wood texture"""
    print("Generating wood.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Warm brown base with grain lines
    for x in range(SIZE):
        for y in range(SIZE):
            # Base color
            r = random.randint(140, 170)
            g = random.randint(90, 120)
            b = random.randint(50, 80)

            # Add horizontal grain
            grain = int(15 * math.sin(y * 0.1))
            pixels[x, y] = (r + grain, g + grain, b + grain)

    # Add knot patterns
    draw = ImageDraw.Draw(img, 'RGBA')
    for _ in range(2):
        x = random.randint(SIZE // 4, 3 * SIZE // 4)
        y = random.randint(SIZE // 4, 3 * SIZE // 4)

        # Draw concentric ovals for knot
        for radius in range(30, 5, -5):
            darkness = 100 - (30 - radius) * 2
            draw.ellipse([x - radius, y - radius // 2, x + radius, y + radius // 2],
                        outline=(darkness, darkness - 40, darkness - 60), width=1)

    img = add_noise(img, 0.15)
    img = img.filter(ImageFilter.GaussianBlur(0.5))
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "wood.png"))


def generate_snow_grass():
    """Generate frost-touched grass texture"""
    print("Generating snow_grass.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Mix of white and pale green
    for x in range(SIZE):
        for y in range(SIZE):
            # Random between white snow and pale grass
            if random.random() < 0.6:  # 60% snow coverage
                r = random.randint(230, 250)
                g = random.randint(240, 255)
                b = random.randint(240, 255)
            else:  # Pale grass showing through
                r = random.randint(160, 190)
                g = random.randint(200, 230)
                b = random.randint(160, 190)
            pixels[x, y] = (r, g, b)

    img = add_noise(img, 0.2)
    img = img.filter(ImageFilter.GaussianBlur(1))
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "snow_grass.png"))


def generate_flowers():
    """Generate flower meadow texture"""
    print("Generating flowers.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    # Green grass base
    for x in range(SIZE):
        for y in range(SIZE):
            r = random.randint(60, 120)
            g = random.randint(140, 200)
            b = random.randint(30, 80)
            pixels[x, y] = (r, g, b)

    img = add_noise(img, 0.3)

    # Add colorful flowers
    draw = ImageDraw.Draw(img)
    flower_colors = [
        (220, 50, 50),    # Red
        (255, 220, 50),   # Yellow
        (180, 80, 200),   # Purple
        (255, 255, 255),  # White
        (255, 150, 50),   # Orange
    ]

    for _ in range(45):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        size = random.randint(3, 6)
        color = random.choice(flower_colors)
        draw.ellipse([x, y, x + size, y + size], fill=color)

    img = img.filter(ImageFilter.GaussianBlur(0.3))
    img = make_tileable(img)

    img.save(os.path.join(OUTPUT_DIR, "flowers.png"))


def main():
    """Generate all terrain textures"""
    print(f"Generating terrain textures in {OUTPUT_DIR}")
    print(f"Size: {SIZE}x{SIZE} pixels\n")

    # Generate all textures
    generate_grass()
    generate_grass_dark()
    generate_dirt_path()
    generate_stone()
    generate_sand()
    generate_cobblestone()
    generate_water()
    generate_wood()
    generate_snow_grass()
    generate_flowers()

    print("\n" + "="*60)
    print("Texture generation complete!")
    print("="*60 + "\n")

    # Print file information
    print("Generated textures:")
    textures = [
        "grass.png", "grass_dark.png", "dirt_path.png", "stone.png",
        "sand.png", "cobblestone.png", "water.png", "wood.png",
        "snow_grass.png", "flowers.png"
    ]

    for texture in textures:
        filepath = os.path.join(OUTPUT_DIR, texture)
        if os.path.exists(filepath):
            size = os.path.getsize(filepath)
            print(f"  {texture:20s} - {size:,} bytes ({size/1024:.1f} KB)")
        else:
            print(f"  {texture:20s} - ERROR: File not created")

    print(f"\nAll textures saved to: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
