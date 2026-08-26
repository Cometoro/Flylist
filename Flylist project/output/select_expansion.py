import json
from pathlib import Path


ROOT = Path(__file__).resolve().parent
catalog = json.loads((ROOT / "tj_catalog_candidates.json").read_text(encoding="utf-8"))

BASE_ARTISTS = {
    "back number", "星野源", "Vaundy", "椎名林檎", "amazarashi", "緑黄色社会",
    "ONE OK ROCK", "imase", "ORANGE RANGE", "ずっと真夜中でいいのに。",
    "キタニタツヤ", "優里", "藤井風", "Novelbright", "Creepy Nuts", "なとり",
    "tuki.", "Ado", "CUTIE STREET", "eill", "KANA-BOON", "Saucy Dog",
    "サカナクション", "マカロニえんぴつ", "ロクデナシ", "冨岡愛", "MONGOL800",
    "こっちのけんと", "クリープハイプ", "Official髭男dism", "ヨルシカ",
    "松原みき", "神山羊",
}

# Remixes and a K-pop Japanese production credit are intentionally omitted.
EXCLUDED_NUMBERS = {"52814", "68771", "68789"}

# High-demand catalog gaps from larger artists, plus the August Vocaloid releases.
EXTRA_NUMBERS = {
    "28948", "68252", "68002",              # あいみょん
    "25138", "26402", "27738",              # BUMP OF CHICKEN
    "68312", "27541",                         # LiSA
    "68390", "68398", "68860", "68684",     # YOASOBI
    "28886", "68552",                         # Aimer
    "68835", "68736", "68141",              # Mrs. GREEN APPLE
    "27434",                                    # SEKAI NO OWARI
    "25010",                                    # ポルノグラフィティ
    "27198",                                    # UVERworld
    "68759", "27957",                         # RADWIMPS
    "52678", "52679", "52683",              # August Vocaloid releases
}

rows = {
    row["number"]: row
    for row in catalog["candidates"]
    if row["queryArtist"] in BASE_ARTISTS and row["number"] not in EXCLUDED_NUMBERS
}

# The monthly Vocaloid releases are outside the artist catalog query set.
monthly_extras = {
    "52678": {
        "number": "52678", "title": "神っぽいな", "artist": "ピノキオピー(Feat.初音ミク)",
        "lyricist": "ピノキオピー", "composer": "ピノキオピー", "queryArtist": "ピノキオピー",
    },
    "52679": {
        "number": "52679", "title": "Henceforth", "artist": "Orangestar(Feat.IA)",
        "lyricist": "Orangestar", "composer": "Orangestar", "queryArtist": "Orangestar",
    },
    "52683": {
        "number": "52683", "title": "アンノウン・マザーグース", "artist": "Wowaka(Feat.初音ミク)",
        "lyricist": "Wowaka", "composer": "Wowaka", "queryArtist": "wowaka",
    },
}

by_number = {row["number"]: row for row in catalog["candidates"]}
for number in EXTRA_NUMBERS:
    if number in by_number:
        rows[number] = by_number[number]
    elif number in monthly_extras:
        rows[number] = monthly_extras[number]
    else:
        raise SystemExit(f"Missing selected TJ candidate: {number}")

selected = sorted(rows.values(), key=lambda row: (row["queryArtist"].casefold(), row["title"].casefold(), row["number"]))
(ROOT / "selected_expansion_candidates.json").write_text(
    json.dumps(selected, ensure_ascii=False, indent=2) + "\n",
    encoding="utf-8",
)

print(f"selected={len(selected)}")
for row in selected:
    print(f"{row['number']}\t{row['queryArtist']}\t{row['title']}\t{row['artist']}")
