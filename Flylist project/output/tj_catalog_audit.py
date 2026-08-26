import concurrent.futures
import html
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from html.parser import HTMLParser
from pathlib import Path


PROJECT = Path(__file__).resolve().parents[1]
DATA_PATH = PROJECT / "data.js"
OUTPUT_PATH = Path(__file__).with_name("tj_catalog_candidates.json")

ARTISTS = [
    "米津玄師", "ヨルシカ", "Official髭男dism", "Ado", "King Gnu",
    "ずっと真夜中でいいのに。", "Vaundy", "Eve", "Mrs. GREEN APPLE",
    "YOASOBI", "back number", "優里", "Aimer", "RADWIMPS", "藤井風",
    "あいみょん", "Creepy Nuts", "imase", "tuki.", "SPYAIR", "Novelbright",
    "キタニタツヤ", "yama", "須田景凪", "神山羊", "Saucy Dog",
    "SEKAI NO OWARI", "BUMP OF CHICKEN", "ASIAN KUNG-FU GENERATION",
    "サカナクション", "ポルノグラフィティ", "スピッツ", "ONE OK ROCK",
    "UVERworld", "amazarashi", "MONGOL800", "ORANGE RANGE", "緑黄色社会",
    "マカロニえんぴつ", "クリープハイプ", "なとり", "冨岡愛", "松原みき",
    "eill", "こっちのけんと", "KANA-BOON", "LiSA", "椎名林檎", "星野源",
    "Hump Back", "Tani Yuuki", "『ユイカ』", "ロクデナシ", "CUTIE STREET",
]


class ResultParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ul_depth = 0
        self.in_result = False
        self.current = None
        self.current_field = None
        self.field_li_depth = 0
        self.results = []

    @staticmethod
    def attrs_dict(attrs):
        return {key: value or "" for key, value in attrs}

    def handle_starttag(self, tag, attrs):
        values = self.attrs_dict(attrs)
        classes = set(values.get("class", "").split())
        if tag == "ul":
            if self.in_result:
                self.ul_depth += 1
            elif {"grid-container", "list", "ico"}.issubset(classes):
                self.in_result = True
                self.ul_depth = 1
                self.current = {
                    "number": "", "title": "", "artist": "",
                    "lyricist": "", "composer": "",
                }
            return
        if not self.in_result or tag != "li":
            return
        if self.current_field:
            self.field_li_depth += 1
        if "pos-type" in classes:
            self.current_field = "number"
            self.field_li_depth = 1
        elif "title3" in classes:
            self.current_field = "title"
            self.field_li_depth = 1
        elif "title4" in classes:
            self.current_field = "artist"
            self.field_li_depth = 1
        elif "title5" in classes:
            self.current_field = "lyricist"
            self.field_li_depth = 1
        elif "title6" in classes:
            self.current_field = "composer"
            self.field_li_depth = 1

    def handle_endtag(self, tag):
        if not self.in_result:
            return
        if tag == "li" and self.current_field:
            self.field_li_depth -= 1
            if self.field_li_depth <= 0:
                self.current_field = None
                self.field_li_depth = 0
        elif tag == "ul":
            self.ul_depth -= 1
            if self.ul_depth == 0:
                if self.current and re.fullmatch(r"\d{4,6}", self.current["number"]):
                    for key, value in self.current.items():
                        self.current[key] = re.sub(r"\s+", " ", value).strip()
                    self.results.append(self.current)
                self.current = None
                self.in_result = False

    def handle_data(self, data):
        if self.in_result and self.current_field:
            text = data.strip()
            if not text or text in {"곡번호", "MV", "MR", "LIVE", "60이상 반주기 전용곡"}:
                return
            self.current[self.current_field] += (" " if self.current[self.current_field] else "") + text


def fetch_artist(artist):
    query = urllib.parse.urlencode({
        "pageNo": "1",
        "pageRowCnt": "100",
        "strSotrGubun": "ASC",
        "strSortType": "",
        "nationType": "JPN",
        "strType": "2",
        "searchTxt": artist.replace(" ", ""),
    })
    url = "https://www.tjmedia.com/song/accompaniment_search?" + query
    request = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 Flylist data audit",
        "Accept-Language": "ko-KR,ko;q=0.9,ja;q=0.8",
    })
    last_error = None
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=30) as response:
                body = response.read().decode("utf-8", errors="replace")
            parser = ResultParser()
            parser.feed(body)
            return artist, parser.results, None
        except Exception as exc:
            last_error = str(exc)
            time.sleep(1.5 * (attempt + 1))
    return artist, [], last_error


def main():
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    data_text = DATA_PATH.read_text(encoding="utf-8")
    existing_numbers = set(re.findall(r'"number"\s*:\s*"(\d+)"', data_text))
    by_number = {}
    artist_summary = []
    errors = []

    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as executor:
        futures = [executor.submit(fetch_artist, artist) for artist in ARTISTS]
        for future in concurrent.futures.as_completed(futures):
            artist, rows, error = future.result()
            if error:
                errors.append({"artist": artist, "error": error})
                continue
            missing = 0
            for row in rows:
                row["queryArtist"] = artist
                row["exists"] = row["number"] in existing_numbers
                if not row["exists"]:
                    missing += 1
                if row["number"] not in by_number:
                    by_number[row["number"]] = row
            artist_summary.append({
                "artist": artist,
                "tjCount": len(rows),
                "existingCount": len(rows) - missing,
                "missingCount": missing,
            })

    artist_summary.sort(key=lambda row: (-row["missingCount"], row["artist"].casefold()))
    candidates = sorted(
        (row for row in by_number.values() if not row["exists"]),
        key=lambda row: (row["queryArtist"].casefold(), row["title"].casefold(), row["number"]),
    )
    result = {
        "generatedAt": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "existingSongCount": len(existing_numbers),
        "queriedArtistCount": len(ARTISTS),
        "candidateCount": len(candidates),
        "artistSummary": artist_summary,
        "candidates": candidates,
        "errors": errors,
    }
    OUTPUT_PATH.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"existing={len(existing_numbers)} artists={len(ARTISTS)} candidates={len(candidates)} errors={len(errors)}")
    for row in artist_summary:
        print(f"{row['artist']}\tTJ {row['tjCount']}\tHAVE {row['existingCount']}\tMISS {row['missingCount']}")
    if errors:
        print("ERRORS", file=sys.stderr)
        for row in errors:
            print(f"{row['artist']}: {row['error']}", file=sys.stderr)


if __name__ == "__main__":
    main()
