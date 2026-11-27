from pathlib import Path
import struct
import zlib


def png_chunk(kind, value):
    return struct.pack(">I", len(value)) + kind + value + struct.pack(">I", zlib.crc32(kind + value))


def create_icon(size, destination):
    scale = 2
    width = size * scale
    green = (36, 75, 60)
    cream = (255, 241, 208)
    gold = (215, 181, 111)
    pixels = bytearray(bytes(green) * (width * width))

    def polygon(points, color):
        for row in range(width):
            y = (row + .5) * 100 / width
            crossings = []
            for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]):
                if min(y1, y2) <= y < max(y1, y2):
                    crossings.append(x1 + (y - y1) * (x2 - x1) / (y2 - y1))
            crossings.sort()
            for left, right in zip(crossings[::2], crossings[1::2]):
                start = int(left * width / 100)
                end = int(right * width / 100)
                offset = (row * width + start) * 3
                pixels[offset:offset + (end - start) * 3] = bytes(color) * (end - start)

    polygon([(21, 33), (43, 32), (50, 36), (57, 32), (79, 33), (79, 69),
             (57, 70), (50, 74), (43, 70), (21, 69)], gold)
    polygon([(25, 28), (42, 29), (48, 34), (48, 69), (41, 65), (25, 64)], cream)
    polygon([(75, 28), (58, 29), (52, 34), (52, 69), (59, 65), (75, 64)], cream)
    polygon([(31, 39), (40, 40), (44, 43), (44, 46), (40, 43), (31, 42)], gold)
    polygon([(31, 47), (40, 48), (44, 51), (44, 54), (40, 51), (31, 50)], gold)
    polygon([(69, 39), (60, 40), (56, 43), (56, 46), (60, 43), (69, 42)], gold)
    polygon([(69, 47), (60, 48), (56, 51), (56, 54), (60, 51), (69, 50)], gold)

    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            top = (y * 2 * width + x * 2) * 3
            lower = top + width * 3
            for channel in range(3):
                raw.append((pixels[top + channel] + pixels[top + channel + 3] +
                            pixels[lower + channel] + pixels[lower + channel + 3]) // 4)

    header = struct.pack(">2I5B", size, size, 8, 2, 0, 0, 0)
    destination.write_bytes(b"\x89PNG\r\n\x1a\n" + png_chunk(b"IHDR", header)
                            + png_chunk(b"IDAT", zlib.compress(raw)) + png_chunk(b"IEND", b""))


if __name__ == "__main__":
    public = Path(__file__).resolve().parent.parent / "public"
    for dimension in (192, 512):
        create_icon(dimension, public / f"icon-{dimension}.png")
