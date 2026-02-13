#!/usr/bin/env python3
"""
Generate tileable game textures for the Zion project.
Each texture is 256x256 pixels with seamless edges.
"""

from PIL import Image, ImageDraw
import random
import math

SIZE = 256
OUTPUT_DIR = "/Users/kodyw/Projects/Zion/docs/assets/textures/"


def smooth_noise(width, height, octaves=4, persistence=0.5):
    """Generate smooth Perlin-like noise for organic textures."""
    # Create base noise
    noise = [[random.random() for _ in range(width)] for _ in range(height)]

    # Smooth it with multiple passes
    for _ in range(2):
        new_noise = [[0] * width for _ in range(height)]
        for y in range(height):
            for x in range(width):
                # Average with neighbors (wrapping for tiling)
                total = 0
                count = 0
                for dy in [-1, 0, 1]:
                    for dx in [-1, 0, 1]:
                        ny = (y + dy) % height
                        nx = (x + dx) % width
                        total += noise[ny][nx]
                        count += 1
                new_noise[y][x] = total / count
        noise = new_noise

    return noise


def interpolate_color(c1, c2, t):
    """Interpolate between two RGB colors."""
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def generate_grass():
    """Generate lush green grass texture."""
    print("Generating grass.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    base_color = (34, 139, 34)  # Forest green

    # Generate noise layers
    noise1 = smooth_noise(SIZE, SIZE)
    noise2 = smooth_noise(SIZE, SIZE)

    for y in range(SIZE):
        for x in range(SIZE):
            # Combine noise for variation
            n = noise1[y][x] * 0.7 + noise2[y][x] * 0.3

            # Create color variation
            r = int(base_color[0] * (0.5 + n * 0.5))
            g = int(base_color[1] * (0.6 + n * 0.6))
            b = int(base_color[2] * (0.4 + n * 0.3))

            # Add yellowish highlights
            if noise2[y][x] > 0.75:
                r = min(255, r + 30)
                g = min(255, g + 20)

            # Add darker blade-like patterns
            if (x + y * 7) % 11 < 2 and noise1[y][x] > 0.6:
                r = int(r * 0.7)
                g = int(g * 0.7)
                b = int(b * 0.7)

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

    img.save(OUTPUT_DIR + "grass.png")


def generate_stone():
    """Generate polished gray stone plaza texture."""
    print("Generating stone.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    base_color = (128, 128, 128)

    noise = smooth_noise(SIZE, SIZE)

    for y in range(SIZE):
        for x in range(SIZE):
            n = noise[y][x]

            # Subtle variation
            variation = int(n * 30 - 15)
            r = g = b = base_color[0] + variation

            # Add weathering spots
            if noise[y][x] < 0.15:
                r = g = b = int((r + g + b) / 3 * 0.7)

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

    # Add crack lines
    draw = ImageDraw.Draw(img)
    for _ in range(8):
        x1 = random.randint(0, SIZE)
        y1 = random.randint(0, SIZE)
        x2 = x1 + random.randint(-50, 50)
        y2 = y1 + random.randint(-50, 50)

        # Make cracks wrap around for tiling
        segments = []
        if x2 < 0:
            segments.append(((x1, y1), (0, y1 + (y2-y1) * (-x1)/(x2-x1) if x2!=x1 else 0)))
            segments.append(((SIZE, y1 + (y2-y1) * (SIZE-x1)/(x2-x1) if x2!=x1 else 0), (SIZE + x2, y2)))
        elif x2 > SIZE:
            segments.append(((x1, y1), (SIZE, y1 + (y2-y1) * (SIZE-x1)/(x2-x1) if x2!=x1 else 0)))
            segments.append(((0, y1 + (y2-y1) * (-x1)/(x2-x1) if x2!=x1 else 0), (x2 - SIZE, y2)))
        else:
            segments.append(((x1, y1), (x2, y2)))

        for seg in segments:
            draw.line(seg, fill=(90, 90, 90), width=1)

    img.save(OUTPUT_DIR + "stone.png")


def generate_marble():
    """Generate white marble with gray veining."""
    print("Generating marble.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    base_color = (240, 235, 225)

    noise = smooth_noise(SIZE, SIZE)

    for y in range(SIZE):
        for x in range(SIZE):
            n = noise[y][x]

            # Subtle cream variation
            r = int(base_color[0] + (n - 0.5) * 10)
            g = int(base_color[1] + (n - 0.5) * 10)
            b = int(base_color[2] + (n - 0.5) * 15)

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

    # Add veining
    draw = ImageDraw.Draw(img)
    for _ in range(12):
        # Create wavy vein lines
        points = []
        start_x = random.randint(-SIZE//4, SIZE + SIZE//4)
        start_y = random.randint(-SIZE//4, SIZE + SIZE//4)

        for i in range(20):
            x = (start_x + i * 20 + random.randint(-10, 10)) % SIZE
            y = (start_y + int(math.sin(i * 0.5) * 30) + random.randint(-5, 5)) % SIZE
            points.append((x, y))

        if len(points) > 1:
            draw.line(points, fill=(180, 180, 180), width=1)

    img.save(OUTPUT_DIR + "marble.png")


def generate_sand():
    """Generate beach/arena sand texture."""
    print("Generating sand.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    base_color = (194, 178, 128)

    noise = smooth_noise(SIZE, SIZE)

    for y in range(SIZE):
        for x in range(SIZE):
            n = noise[y][x]

            # Granular variation
            grain = random.random() * 0.1 - 0.05
            r = int(base_color[0] * (0.9 + n * 0.2 + grain))
            g = int(base_color[1] * (0.9 + n * 0.2 + grain))
            b = int(base_color[2] * (0.9 + n * 0.2 + grain))

            # Darker grains scattered
            if random.random() > 0.97:
                r = int(r * 0.8)
                g = int(g * 0.8)
                b = int(b * 0.8)

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

    img.save(OUTPUT_DIR + "sand.png")


def generate_dirt():
    """Generate forest floor dirt texture."""
    print("Generating dirt.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    base_color = (74, 55, 40)

    noise1 = smooth_noise(SIZE, SIZE)
    noise2 = smooth_noise(SIZE, SIZE)

    for y in range(SIZE):
        for x in range(SIZE):
            n = noise1[y][x] * 0.6 + noise2[y][x] * 0.4

            # Organic variation
            r = int(base_color[0] * (0.5 + n))
            g = int(base_color[1] * (0.5 + n))
            b = int(base_color[2] * (0.5 + n))

            # Lighter patches
            if noise2[y][x] > 0.8:
                r = min(255, r + 20)
                g = min(255, g + 15)
                b = min(255, b + 10)

            # Small rocks
            if noise1[y][x] > 0.85 and noise2[y][x] > 0.7:
                r = g = b = 60

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

    # Add root-like lines
    draw = ImageDraw.Draw(img)
    for _ in range(6):
        points = []
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        for i in range(15):
            x = (x + random.randint(-5, 5)) % SIZE
            y = (y + random.randint(-3, 8)) % SIZE
            points.append((x, y))
        if len(points) > 1:
            draw.line(points, fill=(30, 20, 15), width=2)

    img.save(OUTPUT_DIR + "dirt.png")


def generate_cobblestone():
    """Generate market cobblestone texture."""
    print("Generating cobblestone.png...")
    img = Image.new('RGB', (SIZE, SIZE), color=(40, 35, 30))  # Dark gaps
    draw = ImageDraw.Draw(img)

    # Draw cobblestones in a rough grid
    stone_size = 32
    gap = 4

    for row in range(SIZE // stone_size + 1):
        for col in range(SIZE // stone_size + 1):
            # Offset for natural look
            offset_x = random.randint(-3, 3)
            offset_y = random.randint(-3, 3)

            x = col * stone_size + offset_x
            y = row * stone_size + offset_y

            # Random stone color (gray-brown)
            base = random.randint(80, 120)
            color = (base, base - 10, base - 20)

            # Draw rounded rectangle (ellipse approximation)
            w = stone_size - gap + random.randint(-2, 2)
            h = stone_size - gap + random.randint(-2, 2)

            # Draw stone with slight rounding
            draw.ellipse([x, y, x + w, y + h], fill=color)

            # Add highlight
            highlight = tuple(min(255, c + 15) for c in color)
            draw.arc([x + 2, y + 2, x + w - 2, y + h - 2], 180, 270, fill=highlight, width=2)

    img.save(OUTPUT_DIR + "cobblestone.png")


def generate_water():
    """Generate semi-transparent blue water texture."""
    print("Generating water.png...")
    img = Image.new('RGBA', (SIZE, SIZE))
    pixels = img.load()

    base_color = (68, 136, 204)

    noise1 = smooth_noise(SIZE, SIZE)
    noise2 = smooth_noise(SIZE, SIZE)

    for y in range(SIZE):
        for x in range(SIZE):
            n1 = noise1[y][x]
            n2 = noise2[y][x]

            # Create wave patterns
            wave = math.sin(x * 0.05 + n1 * 3) * 0.5 + 0.5

            r = int(base_color[0] * (0.7 + wave * 0.3))
            g = int(base_color[1] * (0.7 + wave * 0.3))
            b = int(base_color[2] * (0.8 + n2 * 0.2))

            # Add lighter streaks
            if wave > 0.7 and n1 > 0.6:
                r = min(255, r + 40)
                g = min(255, g + 40)
                b = min(255, b + 40)

            # Foam spots
            alpha = 180
            if n2 > 0.9:
                r = g = b = 220
                alpha = 200

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)), alpha)

    img.save(OUTPUT_DIR + "water.png")


def generate_wood():
    """Generate wood planks texture."""
    print("Generating wood.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    base_color = (139, 105, 20)

    noise = smooth_noise(SIZE, SIZE)

    for y in range(SIZE):
        for x in range(SIZE):
            # Horizontal grain
            grain = math.sin(y * 0.3 + noise[y][x] * 2) * 0.15

            r = int(base_color[0] * (0.8 + noise[y][x] * 0.3 + grain))
            g = int(base_color[1] * (0.8 + noise[y][x] * 0.3 + grain))
            b = int(base_color[2] * (0.8 + noise[y][x] * 0.3 + grain))

            # Darker grain lines
            if abs(math.sin(y * 0.3)) < 0.1:
                r = int(r * 0.85)
                g = int(g * 0.85)
                b = int(b * 0.85)

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

    # Add plank separations
    draw = ImageDraw.Draw(img)
    plank_height = 64
    for i in range(SIZE // plank_height):
        y = i * plank_height
        draw.line([(0, y), (SIZE, y)], fill=(80, 60, 15), width=2)

    img.save(OUTPUT_DIR + "wood.png")


def generate_bark():
    """Generate tree bark texture."""
    print("Generating bark.png...")
    img = Image.new('RGB', (SIZE, SIZE))
    pixels = img.load()

    base_color = (60, 45, 30)

    noise = smooth_noise(SIZE, SIZE)

    for y in range(SIZE):
        for x in range(SIZE):
            # Vertical ridges
            ridge = abs(math.sin(x * 0.2 + noise[y][x])) * 0.4

            r = int(base_color[0] * (0.6 + noise[y][x] * 0.4 + ridge))
            g = int(base_color[1] * (0.6 + noise[y][x] * 0.4 + ridge))
            b = int(base_color[2] * (0.6 + noise[y][x] * 0.4 + ridge))

            # Deep grooves
            if abs(math.sin(x * 0.2)) < 0.15:
                r = int(r * 0.5)
                g = int(g * 0.5)
                b = int(b * 0.5)

            pixels[x, y] = (max(0, min(255, r)), max(0, min(255, g)), max(0, min(255, b)))

    # Add horizontal cracks
    draw = ImageDraw.Draw(img)
    for _ in range(5):
        y = random.randint(0, SIZE)
        points = []
        for x in range(0, SIZE, 10):
            points.append((x, y + random.randint(-3, 3)))
        if len(points) > 1:
            draw.line(points, fill=(30, 20, 15), width=2)

    img.save(OUTPUT_DIR + "bark.png")


def generate_leaves():
    """Generate foliage canopy texture."""
    print("Generating leaves.png...")
    img = Image.new('RGBA', (SIZE, SIZE), color=(0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Draw overlapping leaf-like shapes
    for _ in range(150):
        x = random.randint(-20, SIZE + 20)
        y = random.randint(-20, SIZE + 20)

        # Random green shade
        g = random.randint(80, 180)
        color = (random.randint(20, 60), g, random.randint(20, 50), random.randint(180, 230))

        # Leaf size
        size = random.randint(8, 20)

        # Draw ellipse for leaf
        draw.ellipse([x - size, y - size//2, x + size, y + size//2], fill=color)

    # Add some gaps for light
    for _ in range(30):
        x = random.randint(0, SIZE)
        y = random.randint(0, SIZE)
        size = random.randint(3, 8)
        draw.ellipse([x - size, y - size, x + size, y + size], fill=(0, 0, 0, 0))

    img.save(OUTPUT_DIR + "leaves.png")


def main():
    """Generate all textures."""
    print(f"Generating tileable textures in {OUTPUT_DIR}")
    print(f"Size: {SIZE}x{SIZE} pixels\n")

    generate_grass()
    generate_stone()
    generate_marble()
    generate_sand()
    generate_dirt()
    generate_cobblestone()
    generate_water()
    generate_wood()
    generate_bark()
    generate_leaves()

    print("\nAll textures generated successfully!")


if __name__ == "__main__":
    main()
