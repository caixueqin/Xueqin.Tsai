#!/usr/bin/env python3
"""Build the 64 MathCraft mineral card artworks and metadata manifest."""

from __future__ import annotations

import argparse
import json
import re
import shutil
import unicodedata
from collections import deque
from dataclasses import asdict, dataclass
from pathlib import Path

from PIL import Image, ImageChops


@dataclass(frozen=True)
class SuitConfig:
    key: str
    id_prefix: str
    source_name: str
    columns: int
    rows: int
    color: str
    frame_name: str | None


@dataclass(frozen=True)
class Card:
    id: str
    name_zh: str
    name_en: str
    suit_zh: str
    prize_tier: str
    rarity: str
    value: int
    elements: str
    fun_fact: str
    safety: str | None


SUITS = [
    SuitConfig("gemstone", "GEM", "list_gems.png", 3, 5, "#F04F52", "gemstone.png"),
    SuitConfig("metal", "MET", "list_metals.png", 3, 5, "#377EC0", "metal.png"),
    SuitConfig("industry", "IND", "list_industry.png", 3, 5, "#F7891F", "industry.png"),
    SuitConfig("geology", "GEO", "list_geo.png", 3, 5, "#12BAAA", "geology.png"),
    SuitConfig("joker", "JOKER", "list_epic.png", 2, 2, "#FBDF54", None),
]


def slugify(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", "-", normalized.lower()).strip("-")


def clean_markdown_cell(value: str) -> str:
    value = value.strip().replace("`", "")
    return value.replace("—", "").strip()


def parse_card_database(path: Path) -> list[Card]:
    cards: list[Card] = []
    id_pattern = re.compile(r"^(?:GEM|MET|IND|GEO)-\d{2}$|^JOKER-\d{2}$")

    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.startswith("|"):
            continue

        cells = [clean_markdown_cell(cell) for cell in line.strip().strip("|").split("|")]
        if len(cells) < 10 or not id_pattern.match(cells[0]):
            continue

        cards.append(
            Card(
                id=cells[0],
                name_zh=cells[1],
                name_en=cells[2],
                suit_zh=cells[3],
                prize_tier=cells[4],
                rarity=cells[5],
                value=int(cells[6]),
                elements=cells[7],
                fun_fact=cells[8],
                safety=cells[9] or None,
            )
        )

    if len(cards) != 64:
        raise ValueError(f"Expected 64 cards in {path}, found {len(cards)}.")

    return cards


def foreground_mask(image: Image.Image, threshold: int) -> Image.Image:
    rgb = image.convert("RGB")
    white = Image.new("RGB", rgb.size, (255, 255, 255))
    diff = ImageChops.difference(rgb, white).convert("L")
    return diff.point(lambda value: 255 if value > threshold else 0)


def subject_bbox(cell: Image.Image, threshold: int) -> tuple[int, int, int, int]:
    mask = foreground_mask(cell, threshold)
    pixels = mask.load()
    visited: set[tuple[int, int]] = set()
    components: list[tuple[float, int, tuple[int, int, int, int], float, float]] = []

    for start_y in range(mask.height):
        for start_x in range(mask.width):
            if pixels[start_x, start_y] == 0 or (start_x, start_y) in visited:
                continue

            queue = deque([(start_x, start_y)])
            visited.add((start_x, start_y))
            left = right = start_x
            top = bottom = start_y
            area = 0

            while queue:
                x, y = queue.popleft()
                area += 1
                left = min(left, x)
                right = max(right, x)
                top = min(top, y)
                bottom = max(bottom, y)

                for next_x, next_y in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
                    if (
                        0 <= next_x < mask.width
                        and 0 <= next_y < mask.height
                        and pixels[next_x, next_y] != 0
                        and (next_x, next_y) not in visited
                    ):
                        visited.add((next_x, next_y))
                        queue.append((next_x, next_y))

            if area < 30:
                continue

            center_x = (left + right) / 2
            center_y = (top + bottom) / 2
            distance = abs(center_x - cell.width / 2) * 0.5 + abs(center_y - cell.height * 0.43)
            score = area - distance * 5
            components.append((score, area, (left, top, right + 1, bottom + 1), center_x, center_y))

    if not components:
        return mask.getbbox() or (0, 0, cell.width, cell.height)

    components.sort(reverse=True)
    _, main_area, main_bbox, _, main_center_y = components[0]
    left, top, right, bottom = main_bbox

    for _, area, bbox, center_x, center_y in components[1:]:
        if area < main_area * 0.05:
            continue
        if abs(center_x - cell.width / 2) > cell.width * 0.46:
            continue
        if abs(center_y - main_center_y) > cell.height * 0.3:
            continue

        left = min(left, bbox[0])
        top = min(top, bbox[1])
        right = max(right, bbox[2])
        bottom = max(bottom, bbox[3])

    return left, top, right, bottom


def normalize_white_background(image: Image.Image, threshold: int = 218) -> Image.Image:
    rgb = image.convert("RGB")
    pixels = rgb.load()

    for y in range(rgb.height):
        for x in range(rgb.width):
            red, green, blue = pixels[x, y]
            low_saturation = max(red, green, blue) - min(red, green, blue) <= 24
            if red >= threshold and green >= threshold and blue >= threshold and low_saturation:
                pixels[x, y] = (255, 255, 255)

    return rgb


def extract_card_art(
    atlas: Image.Image,
    index: int,
    config: SuitConfig,
    output_size: int,
    padding: int,
    threshold: int,
) -> Image.Image:
    row = index // config.columns
    column = index % config.columns
    left = round(column * atlas.width / config.columns)
    right = round((column + 1) * atlas.width / config.columns)
    top = round(row * atlas.height / config.rows)
    bottom = round((row + 1) * atlas.height / config.rows)
    cell = atlas.crop((left, top, right, bottom))

    bbox = subject_bbox(cell, threshold)
    bbox = (
        max(0, bbox[0] - 4),
        max(0, bbox[1] - 4),
        min(cell.width, bbox[2] + 4),
        min(cell.height, bbox[3] + 4),
    )
    artwork = normalize_white_background(cell.crop(bbox))

    available_size = output_size - padding * 2
    scale = min(available_size / artwork.width, available_size / artwork.height)
    resized_size = (
        max(1, round(artwork.width * scale)),
        max(1, round(artwork.height * scale)),
    )
    artwork = artwork.resize(resized_size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGB", (output_size, output_size), (255, 255, 255))
    x = (output_size - artwork.width) // 2
    y = (output_size - artwork.height) // 2
    canvas.paste(artwork, (x, y))
    return canvas


def build_cards(
    database_path: Path,
    source_dir: Path,
    frames_dir: Path,
    output_dir: Path,
    public_output_dir: Path,
    output_size: int,
    padding: int,
    threshold: int,
) -> None:
    cards = parse_card_database(database_path)
    cards_by_prefix = {
        config.id_prefix: sorted(
            (card for card in cards if card.id.startswith(f"{config.id_prefix}-")),
            key=lambda card: card.id,
        )
        for config in SUITS
    }

    lock_image_bytes = (output_dir / "lock.png").read_bytes() if (output_dir / "lock.png").exists() else None

    if output_dir.exists():
        shutil.rmtree(output_dir)
    output_dir.mkdir(parents=True)

    manifest_cards: list[dict[str, object]] = []

    for config in SUITS:
        suit_cards = cards_by_prefix[config.id_prefix]
        expected_count = config.columns * config.rows
        if len(suit_cards) != expected_count:
            raise ValueError(
                f"{config.id_prefix} expects {expected_count} cards, found {len(suit_cards)}."
            )

        source_path = source_dir / config.source_name
        atlas = Image.open(source_path).convert("RGB")
        suit_output_dir = output_dir / config.key
        suit_output_dir.mkdir(parents=True)

        if config.frame_name and not (frames_dir / config.frame_name).exists():
            raise FileNotFoundError(frames_dir / config.frame_name)

        for index, card in enumerate(suit_cards):
            filename = f"{card.id.lower()}-{slugify(card.name_en)}.png"
            output_path = suit_output_dir / filename
            artwork = extract_card_art(
                atlas=atlas,
                index=index,
                config=config,
                output_size=output_size,
                padding=padding,
                threshold=threshold,
            )
            artwork.save(output_path)

            metadata = asdict(card)
            metadata.update(
                {
                    "suit": config.key,
                    "color": config.color,
                    "image": f"{config.key}/{filename}",
                    "frame": f"../frames/{config.frame_name}" if config.frame_name else None,
                }
            )
            manifest_cards.append(metadata)

    manifest = {
        "version": "2026-06-19-final-64",
        "count": len(manifest_cards),
        "cards": manifest_cards,
    }
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )

    if public_output_dir.exists():
        shutil.rmtree(public_output_dir)
    shutil.copytree(output_dir, public_output_dir)

    if lock_image_bytes:
        (output_dir / "lock.png").write_bytes(lock_image_bytes)
        (public_output_dir / "lock.png").write_bytes(lock_image_bytes)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--database", type=Path, default=Path("data/#Mineral List"))
    parser.add_argument("--source-dir", type=Path, default=Path("image/source-atlases"))
    parser.add_argument("--frames-dir", type=Path, default=Path("image/frames"))
    parser.add_argument("--output-dir", type=Path, default=Path("image/cards"))
    parser.add_argument("--public-output-dir", type=Path, default=Path("public/image/cards"))
    parser.add_argument("--output-size", type=int, default=512)
    parser.add_argument("--padding", type=int, default=36)
    parser.add_argument("--white-threshold", type=int, default=18)
    args = parser.parse_args()

    build_cards(
        database_path=args.database,
        source_dir=args.source_dir,
        frames_dir=args.frames_dir,
        output_dir=args.output_dir,
        public_output_dir=args.public_output_dir,
        output_size=args.output_size,
        padding=args.padding,
        threshold=args.white_threshold,
    )


if __name__ == "__main__":
    main()
