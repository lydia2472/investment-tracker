from __future__ import annotations

import math
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter


PROJECT_ROOT = Path(__file__).resolve().parents[1]
ASSETS_DIR = PROJECT_ROOT / "assets"
ICON_PNG = ASSETS_DIR / "icon.png"
ICON_ICNS = ASSETS_DIR / "icon.icns"
ICON_SIZE = 1024


def add(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return (a[0] + b[0], a[1] + b[1])


def sub(a: tuple[float, float], b: tuple[float, float]) -> tuple[float, float]:
    return (a[0] - b[0], a[1] - b[1])


def scale(v: tuple[float, float], factor: float) -> tuple[float, float]:
    return (v[0] * factor, v[1] * factor)


def normalize(v: tuple[float, float]) -> tuple[float, float]:
    length = math.hypot(v[0], v[1]) or 1
    return (v[0] / length, v[1] / length)


def perpendicular(v: tuple[float, float]) -> tuple[float, float]:
    return (-v[1], v[0])


def draw_glow(base: Image.Image, shape_points: list[tuple[int, int]], color: tuple[int, int, int, int], blur: int) -> None:
    overlay = Image.new("RGBA", base.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.polygon(shape_points, fill=color)
    overlay = overlay.filter(ImageFilter.GaussianBlur(blur))
    base.alpha_composite(overlay)


def build_arrow_head(
    tip: tuple[float, float],
    tail_anchor: tuple[float, float],
    head_length: float,
    head_width: float,
) -> list[tuple[int, int]]:
    direction = normalize(sub(tip, tail_anchor))
    normal = perpendicular(direction)
    head_base = add(tip, scale(direction, -head_length))

    left = add(head_base, scale(normal, head_width / 2))
    right = add(head_base, scale(normal, -head_width / 2))
    inner = add(head_base, scale(direction, -head_length * 0.48))

    return [
        (round(left[0]), round(left[1])),
        (round(tip[0]), round(tip[1])),
        (round(right[0]), round(right[1])),
        (round(inner[0]), round(inner[1])),
    ]


def generate_icon_image() -> Image.Image:
    image = Image.new("RGBA", (ICON_SIZE, ICON_SIZE), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)

    outline = "#68193D"
    arrow_fill = "#FF6A45"
    arrow_highlight = "#FF845A"
    bar_colors = ["#B6E53D", "#66D7E8", "#4FC7AE", "#6E8EF6"]

    bar_left = 140
    bar_bottom = 820
    bar_width = 145
    bar_gap = 0
    bar_tops = [660, 565, 485, 400]

    for index, color in enumerate(bar_colors):
        x0 = bar_left + index * (bar_width + bar_gap)
        x1 = x0 + bar_width
        y0 = bar_tops[index]
        draw.rectangle((x0, y0, x1, bar_bottom), fill=color)

    # Outline around the full chart silhouette.
    chart_outline = [
        (120, 820),
        (120, 665),
        (285, 540),
        (285, 820),
        (430, 820),
        (430, 460),
        (575, 820),
        (800, 820),
        (800, 380),
        (800, 380),
    ]
    # Replace with a more faithful bar silhouette.
    chart_outline = [
        (120, 820),
        (120, 665),
        (140, 650),
        (285, 650),
        (285, 555),
        (430, 555),
        (430, 475),
        (575, 475),
        (575, 390),
        (720, 390),
        (720, 820),
    ]
    draw.line(chart_outline + [(120, 820)], fill=outline, width=20, joint="curve")

    arrow_points = [(130, 640), (405, 390), (525, 500), (780, 235)]

    # Arrow shadow.
    arrow_shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    arrow_shadow_draw = ImageDraw.Draw(arrow_shadow)
    shadow_points = [(x + 8, y + 10) for x, y in arrow_points]
    arrow_shadow_draw.line(shadow_points, fill=(88, 20, 49, 48), width=146, joint="curve")
    head_shadow = build_arrow_head(
        (arrow_points[-1][0] + 8, arrow_points[-1][1] + 10),
        (arrow_points[-2][0] + 8, arrow_points[-2][1] + 10),
        150,
        188,
    )
    arrow_shadow_draw.polygon(head_shadow, fill=(88, 20, 49, 48))
    arrow_shadow = arrow_shadow.filter(ImageFilter.GaussianBlur(8))
    image.alpha_composite(arrow_shadow)

    draw.line(arrow_points, fill=outline, width=146, joint="curve")
    draw.line(arrow_points, fill=arrow_fill, width=108, joint="curve")

    arrow_head = build_arrow_head(arrow_points[-1], arrow_points[-2], 150, 188)
    draw.polygon(arrow_head, fill=outline)
    inset_arrow_head = build_arrow_head(arrow_points[-1], arrow_points[-2], 128, 146)
    draw.polygon(inset_arrow_head, fill=arrow_fill)

    # Inner highlight on the arrow.
    highlight_points = [(158, 606), (405, 384), (528, 490), (752, 260)]
    draw.line(highlight_points, fill=arrow_highlight, width=28, joint="curve")

    # Small vertical separators between bars.
    for separator_x in (285, 430, 575):
        draw.line((separator_x, 820, separator_x, 430), fill=(255, 255, 255, 65), width=6)

    return image


def create_icns(png_path: Path, icns_path: Path) -> None:
    source = Image.open(png_path).convert("RGBA")
    source.save(icns_path, format="ICNS")


def main() -> None:
    ASSETS_DIR.mkdir(parents=True, exist_ok=True)

    image = generate_icon_image()
    image.save(ICON_PNG)

    if ICON_ICNS.exists():
        ICON_ICNS.unlink()

    create_icns(ICON_PNG, ICON_ICNS)

    print(f"Generated {ICON_PNG}")
    print(f"Generated {ICON_ICNS}")


if __name__ == "__main__":
    main()
