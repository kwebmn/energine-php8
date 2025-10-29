#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

from translation_audit import (
    collect_upper_tokens,
    extract_insert_block,
    iter_source_files,
    load_db_text,
    parse_share_lang_tags,
)

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "database.sql"


def format_insert_lines(lines: list[str]) -> str:
    if not lines:
        return "\n"
    formatted: list[str] = []
    for index, line in enumerate(lines):
        clean = line.rstrip(',;')
        suffix = ',' if index < len(lines) - 1 else ';'
        formatted.append(f"{clean}{suffix}")
    return "\n" + "\n".join(formatted) + "\n"


def rebuild_block(db_text: str, table: str, keep_ids: set[int]) -> str:
    block = extract_insert_block(db_text, table)
    lines = [line.strip() for line in block.strip().splitlines() if line.strip()]
    kept_lines: list[str] = []
    for line in lines:
        match = re.match(r"\((\d+)", line)
        if not match:
            continue
        if int(match.group(1)) in keep_ids:
            kept_lines.append(line)
    return format_insert_lines(kept_lines)


def replace_block(db_text: str, table: str, new_block: str) -> str:
    marker = f"INSERT INTO `{table}` VALUES"
    start = db_text.find(marker)
    if start == -1:
        raise RuntimeError(f"Unable to locate {marker}")
    start += len(marker)
    end_marker = f"/*!40000 ALTER TABLE `{table}` ENABLE KEYS */;"
    end = db_text.find(end_marker, start)
    if end == -1:
        raise RuntimeError(f"Unable to locate end marker for {table}")
    return db_text[:start] + new_block + db_text[end:]


def main() -> None:
    db_text = load_db_text()
    tag_map = parse_share_lang_tags(db_text)
    tokens_in_code = collect_upper_tokens(iter_source_files())
    used_ids = {ltag_id for ltag_id, name in tag_map.items() if name in tokens_in_code}

    new_tags_block = rebuild_block(db_text, 'share_lang_tags', used_ids)
    new_translations_block = rebuild_block(db_text, 'share_lang_tags_translation', used_ids)

    updated_db = replace_block(db_text, 'share_lang_tags', new_tags_block)
    updated_db = replace_block(updated_db, 'share_lang_tags_translation', new_translations_block)

    DB_PATH.write_text(updated_db, encoding='utf-8')


if __name__ == '__main__':
    main()
