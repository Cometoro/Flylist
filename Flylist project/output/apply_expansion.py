import json
import re
from collections import Counter
from pathlib import Path

from expansion_metadata import ARTIST_ALIASES, TITLE_KO


PROJECT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT / "data.js"
SELECTED_PATH = Path(__file__).with_name("selected_expansion_candidates.json")
REPORT_PATH = Path(__file__).with_name("expansion_report.json")
UPDATE_DATE = "2026-08-26"

ARTIST_NORMALIZATION = {
    "Bump of Chicken": "BUMP OF CHICKEN",
    "CreepyNuts": "Creepy Nuts",
    "LISA": "LiSA",
    "Mrs. Green Apple": "Mrs. GREEN APPLE",
    "Wowaka(Feat.初音ミク)": "wowaka feat. 初音ミク",
}

ANIME_GROUP_PATTERNS = [
    ("ヴィジランテ", "나의 히어로 아카데미아"),
    ("僕のヒーローアカデミア", "나의 히어로 아카데미아"),
    ("ポケットモンスター", "포켓몬스터"),
    ("鬼滅の刃", "귀멸의 칼날"),
    ("どろろ", "도로로"),
    ("NieR:Automata", "니어:오토마타 Ver1.1a"),
    ("乱歩奇譚", "란포기담"),
    ("86-エイティシックス", "86 -에이티식스-"),
    ("東京喰種", "도쿄 구울"),
    ("血界戦線", "혈계전선"),
    ("よふかしのうた", "철야의 노래"),
    ("ダンダダン", "단다단"),
    ("東京リベンジャーズ", "도쿄 리벤저스"),
    ("夏へのトンネル", "여름을 향한 터널, 이별의 출구"),
    ("山田くんとLv999", "야마다 군과 Lv999의 사랑을 하다"),
    ("BORUTO", "NARUTO 시리즈"),
    ("NARUTO", "NARUTO 시리즈"),
    ("ソードアート・オンライン", "소드 아트 온라인"),
    ("コードギアス", "코드 기아스"),
    ("BLEACH", "블리치"),
    ("すずめの戸締まり", "스즈메의 문단속"),
    ("クレヨンしんちゃん", "짱구는 못말려"),
    ("銀魂", "은혼"),
    ("SAKAMOTO DAYS", "사카모토 데이즈"),
    ("ドラえもん", "도라에몽"),
    ("葬送のフリーレン", "장송의 프리렌"),
    ("機動戦士ガンダム 水星の魔女", "기동전사 건담 수성의 마녀"),
    ("好きでも嫌いなあまのじゃく", "좋아해도 싫어하는"),
    ("戦隊大失格", "전대대실격"),
    ("チ。", "지. -지구의 운동에 대하여-"),
    ("サマータイムレンダ", "서머타임 렌더"),
    ("とんがり帽子のアトリエ", "뾰족모자 아틀리에"),
    ("終末トレイン", "종말 트레인은 어디로 향하나?"),
    ("かがみの孤城", "거울 속 외딴 성"),
    ("地獄楽", "지옥락"),
    ("ダンジョン飯", "던전밥"),
    ("半妖の夜叉姫", "반요 야샤히메"),
    ("薬屋のひとりごと", "약사의 혼잣말"),
    ("パリに咲くエトワール", "파리에 피어난 에투알"),
    ("青の祓魔師", "청의 엑소시스트"),
    ("ONE PIECE", "원피스"),
]

VOCALOID = {
    "52678": ("ピノキオピー", "피노키오피", ["하츠네 미쿠"]),
    "52679": ("Orangestar", "오렌지스타", ["IA"]),
    "52683": ("wowaka", "현실도피P", ["하츠네 미쿠"]),
}

SPECIAL_GROUPS = {
    "25017": "milet & Aimer & 幾田りら",
    "68499": "imase & なとり",
    "52519": "Eve",
}

SPECIAL_ALIASES = {
    "25017": "밀레·에메·이쿠타 리라",
    "68499": "이마세·나토리",
    "52519": "이브·요루시카",
}

CONTEXT_RE = re.compile(
    r"(?:OST|\bOP\b|\bED\b|主題歌|テーマソング|挿入歌|\bCM\b|TVCM|映画|ドラマ|"
    r"アニメ|テレビ|TVアニメ|劇場版|劇場アニメ|ゲーム|NHK|Netflix|ABEMA|番組|広告)",
    re.IGNORECASE,
)
JAPANESE_RE = re.compile(r"[ぁ-んァ-ヶ一-龯]")


def read_songs():
    text = DATA_PATH.read_text(encoding="utf-8")
    start = text.index("[")
    end = text.rindex("]") + 1
    return json.loads(text[start:end])


def clean_title(value):
    value = re.sub(r"\s+", " ", value).strip()
    pattern = re.compile(r"\(([^()]*)\)|（([^（）]*)）")
    changed = True
    while changed:
        changed = False

        def replace(match):
            nonlocal changed
            inside = match.group(1) if match.group(1) is not None else match.group(2)
            if CONTEXT_RE.search(inside):
                changed = True
                return ""
            return match.group(0)

        value = pattern.sub(replace, value)
    return re.sub(r"\s+", " ", value).strip(" -")


def anime_group(raw_title):
    for pattern, group in ANIME_GROUP_PATTERNS:
        if pattern in raw_title:
            return group
    return ""


def normalized_artist(value):
    value = re.sub(r"\s+", " ", value).strip()
    for source, target in ARTIST_NORMALIZATION.items():
        value = value.replace(source, target)
    return value


def build_record(row):
    number = row["number"]
    original = clean_title(row["title"])
    title_ko = TITLE_KO.get(number, original)
    if JAPANESE_RE.search(original) and number not in TITLE_KO:
        raise ValueError(f"Missing Korean title: {number} {original}")

    artist = normalized_artist(row["artist"])
    query_artist = row["queryArtist"]
    if number in VOCALOID:
        producer, alias, tags = VOCALOID[number]
        record = {
            "number": number,
            "titleKo": title_ko,
            "titleOriginal": original,
            "artist": artist,
            "tag": producer,
            "category": "보카로",
            "group": producer,
            "tagKo": alias,
            "tags": tags,
        }
    else:
        work = anime_group(row["title"])
        group = SPECIAL_GROUPS.get(number, query_artist)
        alias = SPECIAL_ALIASES.get(number, ARTIST_ALIASES.get(group, ARTIST_ALIASES.get(query_artist, "")))
        record = {
            "number": number,
            "titleKo": title_ko,
            "titleOriginal": original,
            "artist": artist,
            "tag": group,
            "category": "애니메이션" if work else "J-POP",
            "group": work or group,
        }
        if alias:
            record["tagKo"] = alias
        if work:
            record["tags"] = ["애니메이션"]
            record["jpopGroup"] = group

    record["updateType"] = "new"
    record["updatedAt"] = UPDATE_DATE
    return record


def main():
    songs = read_songs()
    selected = json.loads(SELECTED_PATH.read_text(encoding="utf-8"))
    existing_numbers = {song["number"] for song in songs}
    duplicates = [row["number"] for row in selected if row["number"] in existing_numbers]
    if duplicates:
        raise SystemExit(f"Selected numbers already exist: {duplicates}")

    for song in songs:
        song.pop("updateType", None)
        song.pop("updatedAt", None)
        song.pop("updateNote", None)

    additions = [build_record(row) for row in selected]
    songs.extend(additions)
    DATA_PATH.write_text(
        "// Generated by Flylist Data Editor.\n"
        "// Edit with editor.html or keep this JSON-style structure intact.\n"
        "window.FLYLIST_SONGS = "
        + json.dumps(songs, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    report = {
        "updateDate": UPDATE_DATE,
        "before": len(songs) - len(additions),
        "added": len(additions),
        "after": len(songs),
        "categories": dict(Counter(song["category"] for song in additions)),
        "artists": dict(Counter(song["tag"] for song in additions)),
        "numbers": [song["number"] for song in additions],
    }
    REPORT_PATH.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
