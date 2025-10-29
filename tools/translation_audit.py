#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Dict, Iterable, List, Set

ROOT = Path(__file__).resolve().parents[1]
DB_PATH = ROOT / "database.sql"

SHARE_LANG_TAGS_RE = re.compile(r"INSERT INTO `share_lang_tags` VALUES\s*(.*?)\s*;", re.S)
SHARE_LANG_TAGS_TRANSLATION_RE = re.compile(r"INSERT INTO `share_lang_tags_translation` VALUES\s*(.*?)\s*;", re.S)
SHARE_LANGUAGES_RE = re.compile(r"INSERT INTO `share_languages` VALUES\s*(.*?)\s*;", re.S)

UPPER_TOKEN_RE = re.compile(r"[A-Z][A-Z0-9_]{2,}")

EXCLUDE_DIRS = {
    '.git',
    'node_modules',
    'vendor',
    'var',
    '__pycache__',
    '.idea',
}

INCLUDE_ROOTS = {
    'app',
    'engine',
    'site',
    'setup',
    'resizer',
}

BINARY_SUFFIXES = {
    '.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tif', '.tiff', '.ico',
    '.mp3', '.mp4', '.avi', '.mov', '.zip', '.gz', '.tar', '.rar', '.7z', '.bz2',
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.woff', '.woff2', '.ttf', '.eot', '.otf', '.svg', '.psd', '.ai',
    '.bin', '.dat', '.db', '.sqlite', '.so', '.dll', '.exe', '.class', '.jar',
}

EXCLUDE_FILES = {
    'package-lock.json',
    'composer.lock',
}


def load_db_text() -> str:
    try:
        return DB_PATH.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        return DB_PATH.read_text(encoding='utf-8', errors='ignore')


def parse_share_lang_tags(db_text: str) -> Dict[int, str]:
    match = SHARE_LANG_TAGS_RE.search(db_text)
    if not match:
        raise RuntimeError('Unable to locate share_lang_tags data block')
    block = match.group(1)
    result: Dict[int, str] = {}
    for row_id, name in re.findall(r"\((\d+),'([^']+)'\)", block):
        result[int(row_id)] = name
    return result


def parse_share_lang_tags_translation(db_text: str) -> Dict[int, Set[int]]:
    match = SHARE_LANG_TAGS_TRANSLATION_RE.search(db_text)
    if not match:
        raise RuntimeError('Unable to locate share_lang_tags_translation data block')
    block = match.group(1)
    result: Dict[int, Set[int]] = {}
    for row_id, lang_id in re.findall(r"\((\d+),(\d+),'", block):
        result.setdefault(int(row_id), set()).add(int(lang_id))
    return result


def parse_share_languages(db_text: str) -> Dict[int, Dict[str, str]]:
    match = SHARE_LANGUAGES_RE.search(db_text)
    if not match:
        raise RuntimeError('Unable to locate share_languages data block')
    block = match.group(1)
    languages: Dict[int, Dict[str, str]] = {}
    pattern = re.compile(r"\((\d+),'[^']*','([^']*)','([^']*)'", re.S)
    for lang_id, code, name in pattern.findall(block):
        languages[int(lang_id)] = {'code': code, 'name': name}
    return languages


def iter_source_files() -> Iterable[Path]:
    for path in ROOT.rglob('*'):
        if not path.is_file():
            continue
        if path.name == 'database.sql':
            continue
        if path.name in EXCLUDE_FILES:
            continue
        relative = path.relative_to(ROOT)
        if any(part in EXCLUDE_DIRS for part in relative.parts):
            continue
        if path.suffix.lower() in BINARY_SUFFIXES:
            continue
        if len(relative.parts) == 1:
            # root-level file (e.g., index.php)
            yield path
            continue
        if relative.parts[0] in INCLUDE_ROOTS:
            yield path


def collect_upper_tokens(files: Iterable[Path]) -> Set[str]:
    tokens: Set[str] = set()
    for file_path in files:
        try:
            text = file_path.read_text(encoding='utf-8')
        except UnicodeDecodeError:
            text = file_path.read_text(encoding='utf-8', errors='ignore')
        tokens.update(UPPER_TOKEN_RE.findall(text))
    return tokens


def main() -> None:
    db_text = load_db_text()
    share_lang_tags = parse_share_lang_tags(db_text)
    translations = parse_share_lang_tags_translation(db_text)
    languages = parse_share_languages(db_text)

    constants = set(share_lang_tags.values())
    tokens_in_code = collect_upper_tokens(iter_source_files())
    used_constants = sorted(constants & tokens_in_code)
    unused_constants = sorted(constants - tokens_in_code)

    language_ids = sorted(languages.keys())
    constants_missing_translations: Dict[str, List[str]] = {}
    for ltag_id, const_name in share_lang_tags.items():
        existing_langs = translations.get(ltag_id, set())
        missing = [languages[lang_id]['code'] or str(lang_id) for lang_id in language_ids if lang_id not in existing_langs]
        if missing:
            constants_missing_translations[const_name] = missing

    report = {
        'summary': {
            'total_constants': len(constants),
            'used_constants': len(used_constants),
            'unused_constants': len(unused_constants),
            'constants_missing_translations': len(constants_missing_translations),
        },
        'unused_constants': unused_constants,
        'constants_missing_translations': constants_missing_translations,
    }

    output_dir = ROOT / 'reports'
    output_dir.mkdir(exist_ok=True)
    (output_dir / 'translation_audit.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')

    # Also create a markdown summary for easier consumption
    lines: List[str] = []
    lines.append('# Translation audit report')
    lines.append('')
    lines.append('## Summary')
    lines.append('')
    lines.append('| Metric | Value |')
    lines.append('| --- | ---: |')
    for key, value in report['summary'].items():
        lines.append(f"| {key.replace('_', ' ').title()} | {value} |")
    lines.append('')

    lines.append('## Notes')
    lines.append('')
    lines.append('* Only literal uppercase constants are considered when checking code usage; dynamically generated identifiers may be missed.')
    lines.append('* Missing translations are calculated against every language defined in `share_languages`.')
    lines.append('')

    lines.append('## Unused translation constants')
    lines.append('')
    if unused_constants:
        lines.append('```')
        lines.extend(unused_constants)
        lines.append('```')
    else:
        lines.append('No unused constants found.')
    lines.append('')

    lines.append('## Constants missing translations')
    lines.append('')
    if constants_missing_translations:
        lines.append('| Constant | Missing languages |')
        lines.append('| --- | --- |')
        for const_name in sorted(constants_missing_translations):
            langs = ', '.join(constants_missing_translations[const_name])
            lines.append(f"| {const_name} | {langs} |")
    else:
        lines.append('All constants have translations for all languages.')
    lines.append('')

    (output_dir / 'translation_audit.md').write_text('\n'.join(lines), encoding='utf-8')


if __name__ == '__main__':
    main()
