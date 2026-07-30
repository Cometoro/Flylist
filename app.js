(function () {
  const songs = Array.isArray(window.FLYLIST_SONGS) ? window.FLYLIST_SONGS : [];
  const songsByNumber = new Map(songs.map(song => [song.number, song]));
  const categories = ["보카로", "버츄얼 아티스트", "애니메이션", "J-POP"];
  const categoryLabels = ["전체", "업데이트", "아티스트별", ...categories, "즐겨찾기"];
  const favoriteCategoryLabels = ["전체", ...categories];
  const sortValues = ["count-desc", "count-asc", "group-name"];
  const savedBrowseState = loadBrowseState();
  const state = {
    query: "",
    category: categoryLabels.includes(savedBrowseState.category)
      && savedBrowseState.category !== "즐겨찾기" ? savedBrowseState.category : "전체",
    favoriteCategory: favoriteCategoryLabels.includes(savedBrowseState.favoriteCategory)
      ? savedBrowseState.favoriteCategory : "전체",
    sort: sortValues.includes(savedBrowseState.sort) ? savedBrowseState.sort : "count-desc",
    view: location.hash === "#favorites" ? "favorites" : "main",
    favorites: loadSet("flylist:favorites"),
    artistFavorites: loadSet("flylist:favorite-artists"),
    favoriteExclusions: loadSet("flylist:favorite-exclusions"),
    expandedGroups: new Set(
      Array.isArray(savedBrowseState.expandedGroups)
        ? savedBrowseState.expandedGroups.slice(-16)
        : []
    ),
    activeIndexEntries: [],
    scrollPositions: savedBrowseState.scrollPositions
      && typeof savedBrowseState.scrollPositions === "object"
      ? savedBrowseState.scrollPositions
      : {}
  };

  const els = {
    mainApp: document.querySelector("#mainApp"),
    mainView: document.querySelector("#mainView"),
    favoritesView: document.querySelector("#favoritesView"),
    searchInput: document.querySelector("#searchInput"),
    clearSearch: document.querySelector("#clearSearch"),
    stats: document.querySelector("#stats"),
    categoryTabs: document.querySelector("#categoryTabs"),
    sortSelect: document.querySelector("#sortSelect"),
    resultSummary: document.querySelector("#resultSummary"),
    songList: document.querySelector("#songList"),
    emptyState: document.querySelector("#emptyState"),
    updateSummary: document.querySelector("#updateSummary"),
    sectionIndex: document.querySelector("#sectionIndex"),
    favoritesBack: document.querySelector("#favoritesBack"),
    favoriteCategoryTabs: document.querySelector("#favoriteCategoryTabs"),
    favoriteResultSummary: document.querySelector("#favoriteResultSummary"),
    favoriteSongList: document.querySelector("#favoriteSongList"),
    favoriteEmptyState: document.querySelector("#favoriteEmptyState"),
    favoriteSectionIndex: document.querySelector("#favoriteSectionIndex"),
    exportFavorites: document.querySelector("#exportFavorites"),
    importFavoritesButton: document.querySelector("#importFavoritesButton"),
    importFavoritesFile: document.querySelector("#importFavoritesFile"),
    indexDrawer: document.querySelector("#indexDrawer"),
    indexDrawerFilter: document.querySelector("#indexDrawerFilter"),
    indexDrawerEmpty: document.querySelector("#indexDrawerEmpty"),
    indexDrawerNav: document.querySelector("#indexDrawerNav"),
    toast: document.querySelector("#toast")
  };

  const collator = new Intl.Collator(["ko", "ja", "en"], {
    numeric: true,
    sensitivity: "base"
  });

  const aliasMap = {
    "164": "이치로쿠욘",
    "40mP": "40미터P",
    "BUMP OF CHICKEN": "범프 오브 치킨",
    "DECO*27": "데코니나",
    "EasyPop": "이지팝",
    "Giga": "기가",
    "Kanaria": "카나리아",
    "Orangestar": "오렌지스타",
    "TAK": "탁",
    "doriko": "도리코",
    "kemu": "케무",
    "wowaka": "현실도피P",
    "じん(自然の敵P)": "진",
    "黒うさP": "흑토끼P",
    "かにみそP": "카니미소P",
    "ゆうゆP": "유우유P",
    "Junky": "정키",
    "HarryP": "하리P",
    "R Sound Design": "R 사운드 디자인",
    "ryo": "료",
    "KEI": "케이",
    "いよわ": "이요와",
    "すりぃ": "스리",
    "てにをは": "테니오하",
    "とあ": "토아",
    "まらしぃ": "마라시",
    "みきとP": "미키토P",
    "まふまふ": "마후마후",
    "花たん": "하나땅",
    "上北健": "카미키타 켄",
    "KK(上北健)": "카미키타 켄",
    "Reol": "레오루",
    "REOL": "레오루",
    "れをる": "레오루",
    "ウォルピスカーター": "월피스 카터",
    "GARNiDELiA": "가르니데리아",
    "ナユタン星人": "나유탄 성인",
    "バルーン": "벌룬",
    "巡音ルカ": "메구리네 루카",
    "椎名もた": "시이나 모타",
    "ツミキ": "츠미키",
    "可不": "카후",
    "HoneyWorks": "허니웍스",
    "YASUHIRO(康寛)": "야스히로",
    "灯油": "등유",
    "かぴ": "카피",
    "jon-YAKITORY": "존 야키토리",
    "手嶌葵": "테시마 아오이",
    "しぐれうい": "시구레 우이",
    "サツキ": "사츠키",
    "かいりきベア": "카이리키 베어",
    "蝶々P": "쵸쵸P",
    "初音ミク": "하츠네 미쿠",
    "鏡音リン": "카가미네 린",
    "鏡音レン": "카가미네 렌",
    "重音テト": "카사네 테토",
    "Kobo Kanaeru": "코보 카나에루",
    "星街すいせい": "호시마치 스이세이",
    "아이리 칸나": "아이리칸나",
    "トゲナシトゲアリ": "토게나시 토게아리",
    "Ado": "아도",
    "KANA-BOON": "카나분",
    "LiSA": "리사",
    "Mrs. GREEN APPLE": "미세스 그린 애플",
    "MyGO!!!!!": "MyGO!",
    "RADWIMPS": "래드윔프스",
    "SPYAIR": "스파이에어",
    "TK from 凛として時雨": "TK from 린토시테시구레",
    "凛として時雨": "린토시테시구레",
    "YOASOBI": "요아소비",
    "supercell": "슈퍼셀",
    "いきものがかり": "이키모노가카리",
    "なとり": "나토리",
    "アイナ・ジ・エンド": "아이나 디 엔드",
    "キタニタツヤ": "키타니 타츠야",
    "ヒグチアイ": "히구치 아이",
    "優里": "유우리",
    "和田光司": "와다 코지",
    "小野正利": "오노 마사토시",
    "高橋洋子": "타카하시 요코",
    "Official髭男dism": "오피셜히게단디즘",
    "King Gnu": "킹누",
    "米津玄師": "요네즈 켄시",
    "ヨルシカ": "요루시카",
    "ASIAN KUNG-FU GENERATION": "아시안 쿵푸 제너레이션",
    "サカナクション": "사카낙션",
    "Eve": "이브",
    "女王蜂": "여왕벌",
    "Vaundy": "바운디",
    "back number": "백 넘버",
    "あいみょん": "아이묭",
    "Creepy Nuts": "크리피 넛츠",
    "Saucy Dog": "사우시 도그",
    "UNISON SQUARE GARDEN": "유니즌 스퀘어 가든",
    "ナナヲアカリ": "나나오 아카리",
    "マカロニえんぴつ": "마카로니 엔피츠",
    "松田聖子": "마츠다 세이코",
    "amazarashi": "아마자라시",
    "tuki.": "츠키",
    "SEKAI NO OWARI": "세카이노오와리",
    "涼宮ハルヒ / 平野綾": "스즈미야 하루히 / 히라노 아야",
    "チョーキューメイ": "초큐메이",
    "X-JAPAN": "엑스재팬",
    "Leina": "레이나",
    "椎名林檎": "시이나 링고",
    "Novelbright": "노벨브라이트",
    "星野源": "호시노 겐",
    "緑黄色社会": "녹황색사회",
    "DISH//": "디쉬",
    "yama": "야마",
    "ロクデナシ": "로쿠데나시",
    "尾崎豊": "오자키 유타카",
    "『ユイカ』": "유이카",
    "Tani Yuuki": "타니 유우키",
    "シド": "시드",
    "Hump Back": "험프 백",
    "藤井風": "후지이 카제",
    "imase": "이마세",
    "CUTIE STREET": "큐티 스트리트",
    "CANDY TUNE": "캔디 튠",
    "楽音": "사사네",
    "ずっと真夜中でいいのに。": "즛토마요"
  };
  const searchAliasMap = {
    "BUMP OF CHICKEN": ["범프"],
    "DECO*27": ["데코27", "데코 니나"],
    "wowaka": ["와우아카"],
    "じん(自然の敵P)": ["진P", "자연의 적P"],
    "初音ミク": ["미쿠"],
    "鏡音リン": ["린"],
    "鏡音レン": ["렌"],
    "巡音ルカ": ["루카"],
    "重音テト": ["테토"],
    "星街すいせい": ["스이세이"],
    "아이리 칸나": ["칸나"],
    "Official髭男dism": ["히게단"],
    "米津玄師": ["켄시"],
    "ASIAN KUNG-FU GENERATION": ["아지캉"],
    "Mrs. GREEN APPLE": ["미세스"],
    "RADWIMPS": ["래드"],
    "ずっと真夜中でいいのに。": ["즈토마요"]
  };
  const normalizedAliasMap = new Map(
    Object.entries(aliasMap).map(([name, alias]) => [normalizeIdentity(name), alias])
  );
  const normalizedSearchAliasMap = new Map(
    Object.entries(searchAliasMap).map(([name, aliases]) => [normalizeIdentity(name), aliases])
  );
  const searchTextCache = new WeakMap();
  let sectionSequence = 0;
  let sectionPrefix = "main";
  let indexObserver = null;
  let activeIndexId = "";
  let searchTimer = 0;
  let scrollSaveTimer = 0;
  let indexDrawerTrigger = null;

  init();

  function init() {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    migrateGroupFavoriteIds();
    pruneFavoriteState();
    els.sortSelect.value = state.sort;
    renderStats();
    renderTabs();
    renderFavoriteTabs();
    bindEvents();
    syncViewFromLocation();
  }

  function bindEvents() {
    els.searchInput.addEventListener("input", () => {
      state.query = normalize(els.searchInput.value);
      window.clearTimeout(searchTimer);
      searchTimer = window.setTimeout(renderMain, 100);
    });

    els.clearSearch.addEventListener("click", () => {
      els.searchInput.value = "";
      state.query = "";
      window.clearTimeout(searchTimer);
      els.searchInput.focus();
      renderMain();
    });

    els.sortSelect.addEventListener("change", () => {
      state.sort = els.sortSelect.value;
      setCurrentScrollPosition(0);
      persistBrowseState();
      renderMain();
      restoreCurrentScrollPosition();
    });

    els.categoryTabs.addEventListener("click", event => {
      const tab = event.target.closest(".tab");
      if (!tab) return;
      const category = tab.dataset.category;
      if (category === "즐겨찾기") {
        openFavorites(true);
        return;
      }
      saveCurrentScrollPosition();
      state.category = category;
      persistBrowseState();
      renderTabs();
      renderMain();
      restoreCurrentScrollPosition();
    });

    els.favoriteCategoryTabs.addEventListener("click", event => {
      const tab = event.target.closest(".favorite-tab");
      if (!tab) return;
      saveCurrentScrollPosition();
      state.favoriteCategory = tab.dataset.category;
      persistBrowseState();
      renderFavoriteTabs();
      renderFavorites();
      restoreCurrentScrollPosition();
    });

    els.favoritesBack.addEventListener("click", () => {
      if (location.hash === "#favorites" && history.length > 1) {
        history.back();
      } else {
        if (location.hash === "#favorites") {
          history.replaceState({ view: "main" }, "", `${location.pathname}${location.search}`);
        }
        showMainView();
      }
    });

    [els.songList, els.favoriteSongList].forEach(list => {
      list.addEventListener("click", handleListClick);
    });

    document.querySelectorAll("[data-open-index]").forEach(button => {
      button.addEventListener("click", openIndexDrawer);
    });
    document.querySelectorAll("[data-close-index]").forEach(button => {
      button.addEventListener("click", closeIndexDrawer);
    });
    [els.sectionIndex, els.favoriteSectionIndex, els.indexDrawerNav].forEach(index => {
      index.addEventListener("click", event => {
        const button = event.target.closest("[data-target]");
        if (!button) return;
        jumpToSection(button.dataset.target);
        if (index === els.indexDrawerNav) closeIndexDrawer();
      });
    });
    [els.sectionIndex, els.favoriteSectionIndex].forEach(index => {
      index.addEventListener("input", event => {
        if (!event.target.matches(".index-filter")) return;
        filterIndexItems(index, event.target.value);
      });
    });
    els.indexDrawerFilter.addEventListener("input", () => {
      filterIndexItems(els.indexDrawerNav, els.indexDrawerFilter.value, els.indexDrawerEmpty);
    });

    els.exportFavorites.addEventListener("click", exportFavorites);
    els.importFavoritesButton.addEventListener("click", () => els.importFavoritesFile.click());
    els.importFavoritesFile.addEventListener("change", importFavorites);

    window.addEventListener("popstate", syncViewFromLocation);
    window.addEventListener("pagehide", saveCurrentScrollPosition);
    window.addEventListener("scroll", () => {
      window.clearTimeout(scrollSaveTimer);
      scrollSaveTimer = window.setTimeout(saveCurrentScrollPosition, 180);
    }, { passive: true });
    document.addEventListener("keydown", event => {
      if (event.key === "Escape" && !els.indexDrawer.hidden) closeIndexDrawer();
    });
  }

  function handleListClick(event) {
    const favoriteButton = event.target.closest(".favorite");
    if (favoriteButton) {
      toggleSongFavorite(favoriteButton.dataset.number);
      renderCurrentView();
      bumpFavorite(`[data-number="${favoriteButton.dataset.number}"]`);
      return;
    }

    const groupFavorite = event.target.closest(".group-favorite");
    if (groupFavorite) {
      toggleGroupFavorite(groupFavorite.dataset.groupId);
      renderCurrentView();
      bumpFavorite(`[data-group-id="${cssEscape(groupFavorite.dataset.groupId)}"]`);
      return;
    }

    const expandButton = event.target.closest(".group-toggle, .group-expand");
    if (expandButton) {
      const id = expandButton.dataset.groupId;
      state.expandedGroups.has(id) ? state.expandedGroups.delete(id) : state.expandedGroups.add(id);
      persistBrowseState();
      state.view === "favorites" ? renderFavorites() : renderMain();
      return;
    }

    const numberButton = event.target.closest(".song-number");
    if (numberButton) copyNumber(numberButton.dataset.number);
  }

  function renderCurrentView() {
    if (state.view === "favorites") renderFavorites();
    else refreshFavoriteButtons(els.songList);
  }

  function refreshFavoriteButtons(root) {
    root.querySelectorAll(".favorite").forEach(button => {
      const song = songsByNumber.get(button.dataset.number);
      const pressed = song ? isSongFavorite(song) : false;
      button.setAttribute("aria-pressed", String(pressed));
      button.textContent = pressed ? "♥" : "♡";
    });
    root.querySelectorAll(".group-favorite").forEach(button => {
      const pressed = state.artistFavorites.has(button.dataset.groupId);
      button.setAttribute("aria-pressed", String(pressed));
      button.textContent = pressed ? "♥" : "♡";
    });
  }

  function renderStats() {
    els.stats.innerHTML = `현재 <strong>${songs.length}곡</strong> 수록`;
  }

  function renderTabs() {
    els.categoryTabs.replaceChildren(...categoryLabels.map(label => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `tab${label === "업데이트" ? " update-tab" : ""}${label === "즐겨찾기" ? " favorites-tab" : ""}`;
      button.dataset.category = label;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(
        label === "즐겨찾기" ? state.view === "favorites" : state.view === "main" && state.category === label
      ));

      if (label === "업데이트") {
        const dot = document.createElement("span");
        dot.className = "update-dot";
        dot.setAttribute("aria-hidden", "true");
        button.append(dot, document.createTextNode(label));
      } else if (label === "즐겨찾기") {
        button.append(document.createTextNode(`${label} `));
        const heart = document.createElement("span");
        heart.className = "tab-heart";
        heart.setAttribute("aria-hidden", "true");
        heart.textContent = "♥";
        button.append(heart);
      } else {
        button.textContent = label;
      }
      return button;
    }));
  }

  function renderFavoriteTabs() {
    els.favoriteCategoryTabs.replaceChildren(...favoriteCategoryLabels.map(label => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "favorite-tab";
      button.dataset.category = label;
      button.setAttribute("role", "tab");
      button.setAttribute("aria-selected", String(state.favoriteCategory === label));
      button.textContent = label === "버츄얼 아티스트" ? "버츄얼" : label;
      return button;
    }));
  }

  function renderMain() {
    sectionSequence = 0;
    sectionPrefix = "main";
    const filtered = getMainSongs();
    const entries = [];
    const label = state.category === "아티스트별" ? "아티스트와 프로듀서" : state.category;
    els.resultSummary.textContent = `${label} · ${filtered.length}곡`;
    els.emptyState.textContent = state.category === "업데이트" ? "업데이트 목록이 없습니다." : "검색 결과가 없습니다.";
    els.emptyState.hidden = filtered.length > 0;
    els.songList.hidden = filtered.length === 0;

    els.updateSummary.hidden = state.category !== "업데이트";
    if (state.category === "업데이트") renderUpdateSummary(filtered);

    const content = state.category === "아티스트별"
      ? buildArtistDirectory(filtered, entries)
      : buildCategorySections(
          filtered,
          entries,
          categories.includes(state.category) ? state.category : ""
        );
    els.songList.replaceChildren(...content);
    renderIndex(els.sectionIndex, entries);
    if (state.view === "main") activateIndex(entries);
  }

  function renderFavorites() {
    sectionSequence = 0;
    sectionPrefix = "favorites";
    const favoriteSongs = songs.filter(song => {
      const categoryMatched = state.favoriteCategory === "전체" || hasCategory(song, state.favoriteCategory);
      return categoryMatched && isSongFavorite(song);
    });
    const entries = [];
    const artistCount = new Set(favoriteSongs.map(song => getGroupInfo(song).id)).size;
    els.favoriteResultSummary.textContent = `${favoriteSongs.length}곡 · ${artistCount}개 그룹`;
    els.favoriteEmptyState.hidden = favoriteSongs.length > 0;
    els.favoriteSongList.hidden = favoriteSongs.length === 0;
    els.favoriteSongList.replaceChildren(...buildCategorySections(favoriteSongs, entries, state.favoriteCategory));
    renderIndex(els.favoriteSectionIndex, entries);
    if (state.view === "favorites") activateIndex(entries);
  }

  function renderUpdateSummary(updatedSongs) {
    const counts = countByCategory(updatedSongs);
    const latestDate = updatedSongs
      .map(song => song.updatedAt || "")
      .sort()
      .at(-1) || "";
    const dateLabel = latestDate ? latestDate.replace(/-/g, ".") : "UPDATE";

    els.updateSummary.innerHTML = `
      <div class="update-kicker"><span class="update-dot" aria-hidden="true"></span>${escapeHtml(dateLabel)} UPDATE</div>
      <div class="update-total-row">
        <strong>총 ${updatedSongs.length}곡</strong>
        <div class="update-breakdown">
          ${categories.map(category => `<span data-category="${escapeHtml(category)}">${escapeHtml(category === "버츄얼 아티스트" ? "버츄얼" : category)} ${counts[category] || 0}곡</span>`).join("")}
        </div>
      </div>
    `;
  }

  function getMainSongs() {
    return songs.filter(song => {
      const categoryMatched = ["전체", "업데이트", "아티스트별"].includes(state.category) || hasCategory(song, state.category);
      const updateMatched = state.category !== "업데이트" || isUpdated(song);
      if (!categoryMatched || !updateMatched) return false;
      return !state.query || getSearchText(song).includes(state.query);
    });
  }

  function buildCategorySections(items, indexEntries, forcedCategory = "") {
    const sections = [];
    const sectionCategories = forcedCategory && forcedCategory !== "전체"
      ? [forcedCategory]
      : categories;

    sectionCategories.forEach(category => {
      const categorySongs = items.filter(song => hasCategory(song, category));
      if (!categorySongs.length) return;

      const section = document.createElement("section");
      section.className = "song-section";
      section.dataset.accent = category;

      const title = document.createElement("h2");
      title.className = "section-title";
      title.id = nextSectionId("category");
      title.innerHTML = `${escapeHtml(category)} <small>${categorySongs.length}곡</small>`;
      section.append(title);
      indexEntries.push({ id: title.id, label: category, level: "category", category });

      groupSongs(categorySongs, false, category).forEach(group => {
        section.append(makeCollapsibleGroup(group, indexEntries, category));
      });
      sections.push(section);
    });
    return sections;
  }

  function buildArtistDirectory(items, indexEntries) {
    return groupSongs(items, true).map(group => makeCollapsibleGroup(group, indexEntries));
  }

  function makeCollapsibleGroup(group, indexEntries, categoryOverride = "") {
    const wrap = document.createElement("section");
    wrap.className = "artist-directory-group song-group is-collapsible";
    wrap.dataset.accent = categoryOverride || group.info.category;

    const expanded = Boolean(
      (state.view === "main" && state.query)
      || state.expandedGroups.has(group.info.id)
    );
    wrap.append(makeGroupHeader(group, true, indexEntries, expanded));

    if (expanded) {
      const cards = document.createElement("div");
      cards.className = "cards collapsible-group-cards";
      cards.append(...sortSongs(group.items).map(song => makeSongCard(song, categoryOverride)));
      wrap.append(cards);
    }
    return wrap;
  }

  function groupSongs(items, combineCategories = false, categoryOverride = "") {
    const byId = new Map();
    items.forEach(song => {
      const info = getGroupInfo(song, categoryOverride);
      const id = combineCategories ? info.id : `${categoryOverride || song.category}:${info.id}`;
      if (!byId.has(id)) byId.set(id, { info, items: [] });
      const group = byId.get(id);
      group.items.push(song);
      if (!group.info.alias && shouldAppendAlias(group.info.name, info.alias)) {
        group.info.alias = info.alias;
      }
    });

    return [...byId.values()].sort((a, b) => {
      const left = a.info.name;
      const right = b.info.name;
      if (state.sort === "count-desc" && a.items.length !== b.items.length) {
        return b.items.length - a.items.length;
      }
      if (state.sort === "count-asc" && a.items.length !== b.items.length) {
        return a.items.length - b.items.length;
      }
      return collator.compare(left, right) || collator.compare(a.info.alias, b.info.alias);
    });
  }

  function getGroupInfo(song, categoryOverride = "") {
    let name = "";
    let alias = "";
    let type = "아티스트";
    const manualGroup = getManualGroup(song);
    const category = categoryOverride || song.category;
    const categoryGroup = category === "J-POP"
      ? String(song.jpopGroup || manualGroup).trim()
      : manualGroup;

    if (category === "보카로") {
      name = manualGroup || song.tag || song.artist || "기타 프로듀서";
      alias = manualGroup
        ? getKnownAlias(name)
        : shouldAppendAlias(name, song.tagKo) ? song.tagKo : getKnownAlias(name);
      type = "프로듀서";
    } else if (category === "애니메이션" && categoryGroup) {
      name = categoryGroup;
      alias = getKnownAlias(name);
      type = "작품";
    } else if (categoryGroup) {
      name = categoryGroup;
      alias = getKnownAlias(name);
    } else {
      name = song.artist || "아티스트 미상";
      alias = getKnownAlias(name);
    }

    const canonicalName = alias || name;
    return {
      id: `${type}:${normalizeIdentity(canonicalName)}`,
      name,
      alias: shouldAppendAlias(name, alias) ? alias : "",
      type,
      category
    };
  }

  function getAlsoCategories(song) {
    const values = Array.isArray(song.alsoCategories) ? song.alsoCategories : [];
    return values.filter(category => categories.includes(category) && category !== song.category);
  }

  function hasCategory(song, category) {
    return song.category === category || getAlsoCategories(song).includes(category);
  }

  function getGroupIds(song) {
    return [...new Set([song.category, ...getAlsoCategories(song)].map(category => getGroupInfo(song, category).id))];
  }

  function getManualGroup(song) {
    const value = String(song.group || "").trim();
    return value && value !== song.category ? value : "";
  }

  function makeGroupHeader(group, collapsible, indexEntries, expanded = false) {
    const header = document.createElement("div");
    header.className = "group-title-wrap";
    header.id = nextSectionId("group");

    const heading = document.createElement("h3");
    heading.className = "group-title";
    if (collapsible) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "group-toggle";
      toggle.dataset.groupId = group.info.id;
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute("aria-label", `${formatGroupName(group.info)} ${expanded ? "접기" : "펼치기"}`);
      toggle.innerHTML = `
        <span class="group-heading-text">${escapeHtml(formatGroupName(group.info))}<small>${group.items.length}곡 수록</small></span>
        <span class="group-chevron" aria-hidden="true">⌄</span>
      `;
      heading.append(toggle);
    } else {
      heading.innerHTML = `${escapeHtml(formatGroupName(group.info))}<small>${group.items.length}곡 수록</small>`;
    }

    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "group-favorite";
    favorite.dataset.groupId = group.info.id;
    favorite.setAttribute("aria-label", `${formatGroupName(group.info)} 전곡 즐겨찾기`);
    favorite.setAttribute("aria-pressed", String(state.artistFavorites.has(group.info.id)));
    favorite.textContent = state.artistFavorites.has(group.info.id) ? "♥" : "♡";
    if (collapsible) favorite.classList.add("is-directory");

    header.append(heading, favorite);
    indexEntries.push({
      id: header.id,
      label: group.info.name,
      search: [
        formatGroupName(group.info),
        ...getSearchAliases(group.info.name)
      ].join(" "),
      level: "group",
      category: group.info.category
    });
    return header;
  }

  function formatGroupName(info) {
    return info.alias ? `${info.name} · ${info.alias}` : info.name;
  }

  function makeSongCard(song, categoryOverride = "") {
    const card = document.createElement("article");
    card.className = "song-card";
    card.dataset.accent = categoryOverride || song.category;

    const number = document.createElement("button");
    number.type = "button";
    number.className = "song-number";
    number.dataset.number = song.number;
    number.setAttribute("aria-label", `${song.number} 복사`);
    number.textContent = song.number;

    const body = document.createElement("div");
    body.className = "song-body";
    body.innerHTML = `
      <div class="song-title">${escapeHtml(song.titleKo)}</div>
      <div class="song-original">${escapeHtml(song.titleOriginal)}</div>
      <div class="song-artist">${escapeHtml(song.artist)}</div>
    `;
    const chipRow = document.createElement("div");
    chipRow.className = "song-tags";
    getVisibleChips(song).forEach(label => {
      const chipEl = document.createElement("span");
      chipEl.className = "song-tag";
      chipEl.textContent = label;
      chipRow.append(chipEl);
    });
    if (chipRow.childElementCount) body.append(chipRow);

    const favorite = document.createElement("button");
    favorite.type = "button";
    favorite.className = "favorite";
    favorite.dataset.number = song.number;
    const pressed = isSongFavorite(song);
    favorite.setAttribute("aria-label", `${song.titleKo} 즐겨찾기`);
    favorite.setAttribute("aria-pressed", String(pressed));
    favorite.textContent = pressed ? "♥" : "♡";

    card.append(number, body, favorite);
    return card;
  }

  function sortSongs(items) {
    return [...items].sort((a, b) => {
      return collator.compare(a.titleKo, b.titleKo) || Number(a.number) - Number(b.number);
    });
  }

  function countByCategory(items) {
    return items.reduce((acc, song) => {
      [song.category, ...getAlsoCategories(song)].forEach(category => {
        acc[category] = (acc[category] || 0) + 1;
      });
      return acc;
    }, {});
  }

  function toggleSongFavorite(number) {
    const song = songsByNumber.get(number);
    if (!song) return;
    const groupFavorite = getGroupIds(song).some(groupId => state.artistFavorites.has(groupId));
    const currentlyFavorite = isSongFavorite(song);

    if (groupFavorite) {
      if (currentlyFavorite) {
        state.favoriteExclusions.add(number);
        state.favorites.delete(number);
        showToast("즐겨찾기에서 제외되었습니다.");
      } else {
        state.favoriteExclusions.delete(number);
        showToast("즐겨찾기에 추가되었습니다.");
      }
    } else if (state.favorites.has(number)) {
      state.favorites.delete(number);
      showToast("즐겨찾기에서 제외되었습니다.");
    } else {
      state.favorites.add(number);
      state.favoriteExclusions.delete(number);
      showToast("즐겨찾기에 추가되었습니다.");
    }

    saveSet("flylist:favorites", state.favorites);
    saveSet("flylist:favorite-exclusions", state.favoriteExclusions);
  }

  function toggleGroupFavorite(groupId) {
    const groupSongs = songs.filter(song => getGroupIds(song).includes(groupId));
    if (state.artistFavorites.has(groupId)) {
      state.artistFavorites.delete(groupId);
      groupSongs.forEach(song => state.favoriteExclusions.delete(song.number));
      showToast("아티스트 즐겨찾기에서 제외되었습니다.");
    } else {
      state.artistFavorites.add(groupId);
      groupSongs.forEach(song => state.favoriteExclusions.delete(song.number));
      showToast("아티스트의 모든 곡을 즐겨찾기에 추가했습니다.");
    }
    saveSet("flylist:favorite-artists", state.artistFavorites);
    saveSet("flylist:favorite-exclusions", state.favoriteExclusions);
  }

  function isSongFavorite(song) {
    const groupFavorite = getGroupIds(song).some(groupId => state.artistFavorites.has(groupId));
    return state.favorites.has(song.number) || (groupFavorite && !state.favoriteExclusions.has(song.number));
  }

  function bumpFavorite(selector) {
    requestAnimationFrame(() => {
      const visibleRoot = state.view === "favorites" ? els.favoritesView : els.mainApp;
      const button = visibleRoot.querySelector(`.favorite${selector}, .group-favorite${selector}`);
      if (!button) return;
      button.classList.add("is-bumped");
      setTimeout(() => button.classList.remove("is-bumped"), 420);
    });
  }

  async function copyNumber(number) {
    try {
      await navigator.clipboard.writeText(number);
      showToast(`${number} 복사됨`);
    } catch {
      showToast(number);
    }
  }

  function exportFavorites() {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      favorites: [...state.favorites].sort(collator.compare),
      artistFavorites: [...state.artistFavorites].sort(collator.compare),
      favoriteExclusions: [...state.favoriteExclusions].sort(collator.compare)
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8"
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = payload.exportedAt.slice(0, 10).replace(/-/g, "");
    link.href = url;
    link.download = `flylist-favorites-${date}.json`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    showToast("즐겨찾기 백업을 저장했어요.");
  }

  async function importFavorites(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > 1024 * 1024) {
      showToast("1MB 이하의 백업 파일만 불러올 수 있어요.");
      return;
    }

    try {
      const payload = JSON.parse(await readFileText(file));
      const importedFavorites = getStringArray(payload?.favorites);
      const importedArtists = getStringArray(payload?.artistFavorites);
      const importedExclusions = getStringArray(payload?.favoriteExclusions);
      if (!importedFavorites.length && !importedArtists.length) {
        throw new Error("Empty favorites backup");
      }

      const previousCount = state.favorites.size + state.artistFavorites.size;
      importedFavorites.forEach(number => state.favorites.add(number));
      importedArtists.forEach(groupId => state.artistFavorites.add(groupId));
      importedExclusions.forEach(number => state.favoriteExclusions.add(number));
      pruneFavoriteState();
      renderTabs();
      state.view === "favorites" ? renderFavorites() : refreshFavoriteButtons(els.songList);
      const addedCount = state.favorites.size + state.artistFavorites.size - previousCount;
      showToast(addedCount > 0
        ? `즐겨찾기 ${addedCount}개를 불러왔어요.`
        : "이미 저장된 즐겨찾기예요.");
    } catch {
      showToast("Flylist 즐겨찾기 백업 파일을 확인해 주세요.");
    }
  }

  function getStringArray(value) {
    return Array.isArray(value)
      ? value.filter(item => typeof item === "string" && item.trim())
      : [];
  }

  function readFileText(file) {
    if (typeof file.text === "function") return file.text();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.addEventListener("load", () => resolve(String(reader.result || "")), { once: true });
      reader.addEventListener("error", () => reject(reader.error), { once: true });
      reader.readAsText(file);
    });
  }

  function loadSet(key) {
    try {
      return new Set(JSON.parse(localStorage.getItem(key) || "[]"));
    } catch {
      return new Set();
    }
  }

  function saveSet(key, values) {
    try {
      localStorage.setItem(key, JSON.stringify([...values]));
    } catch {
      // Storage can be unavailable in some private browsing modes.
    }
  }

  function loadBrowseState() {
    try {
      const value = JSON.parse(sessionStorage.getItem("flylist:browse-state") || "{}");
      return value && typeof value === "object" ? value : {};
    } catch {
      return {};
    }
  }

  function persistBrowseState() {
    try {
      sessionStorage.setItem("flylist:browse-state", JSON.stringify({
        category: state.category,
        favoriteCategory: state.favoriteCategory,
        sort: state.sort,
        expandedGroups: [...state.expandedGroups].slice(-16),
        scrollPositions: state.scrollPositions
      }));
    } catch {
      // Session storage is optional; browsing must keep working without it.
    }
  }

  function pruneFavoriteState() {
    const validNumbers = new Set(songs.map(song => song.number));
    const validGroupIds = new Set(songs.flatMap(getGroupIds));
    state.favorites = new Set([...state.favorites].filter(number => validNumbers.has(number)));
    state.favoriteExclusions = new Set([...state.favoriteExclusions].filter(number => validNumbers.has(number)));
    state.artistFavorites = new Set([...state.artistFavorites].filter(groupId => validGroupIds.has(groupId)));
    state.expandedGroups = new Set(
      [...state.expandedGroups].filter(groupId => validGroupIds.has(groupId)).slice(-16)
    );
    saveSet("flylist:favorites", state.favorites);
    saveSet("flylist:favorite-exclusions", state.favoriteExclusions);
    saveSet("flylist:favorite-artists", state.artistFavorites);
    persistBrowseState();
  }

  function migrateGroupFavoriteIds() {
    const migrations = new Map([
      ["프로듀서:honeyworks", "프로듀서:허니웍스"]
    ]);
    let changed = false;
    migrations.forEach((nextId, previousId) => {
      if (!state.artistFavorites.delete(previousId)) return;
      state.artistFavorites.add(nextId);
      changed = true;
    });
    if (changed) saveSet("flylist:favorite-artists", state.artistFavorites);
  }

  function isUpdated(song) {
    return Boolean(song.updateType || song.updatedAt || song.updateNote);
  }

  function getVisibleChips(song) {
    const seen = new Set();
    const categoryTags = hasCategory(song, "애니메이션") ? ["애니메이션"] : [];
    return [...categoryTags, ...getCustomTags(song), ...getAliases(song)]
      .filter(label => {
        const key = normalize(label);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }

  function getCustomTags(song) {
    const values = Array.isArray(song.tags)
      ? song.tags
      : String(song.tags || "").split(",");
    return values.map(tag => String(tag).trim()).filter(Boolean);
  }

  function getAliases(song) {
    const seen = new Set();
    return getAliasCandidates(song)
      .filter(alias => shouldShowAlias(song, alias))
      .filter(alias => {
        const key = normalize(alias);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 4);
  }

  function getAliasCandidates(song) {
    const artistParts = String(song.artist || "")
      .split(/\s*(?:feat\.?|from|×|\+|&|,|，|\/|／|\(|\)|（|）)\s*/i)
      .map(part => part.trim())
      .filter(Boolean);
    const tagAlias = shouldAppendAlias(song.tag, song.tagKo) ? song.tagKo : getKnownAlias(song.tag);

    return [
      getKnownAlias(song.artist),
      tagAlias,
      getKnownAlias(song.group),
      ...artistParts.map(getKnownAlias)
    ].filter(Boolean);
  }

  function shouldShowAlias(song, alias) {
    const normalizedAlias = normalize(alias);
    const group = getGroupInfo(song);
    return normalizedAlias
      && normalizedAlias !== normalize(song.artist)
      && normalizedAlias !== normalize(group.name)
      && normalizedAlias !== normalize(group.alias);
  }

  function shouldAppendAlias(name, alias) {
    return alias && normalizeIdentity(name) !== normalizeIdentity(alias);
  }

  function getKnownAlias(value) {
    return normalizedAliasMap.get(normalizeIdentity(value)) || "";
  }

  function getSearchAliases(value) {
    const identity = normalizeIdentity(value);
    return [...new Set([
      getKnownAlias(value),
      ...(normalizedSearchAliasMap.get(identity) || [])
    ].filter(Boolean))];
  }

  function getSearchAliasCandidates(song) {
    const values = [song.artist, song.tag, song.group, song.jpopGroup];
    const artistParts = String(song.artist || "")
      .split(/\s*(?:feat\.?|from|×|\+|&|,|，|\/|／|\(|\)|（|）)\s*/i)
      .map(part => part.trim())
      .filter(Boolean);
    return [...new Set(
      [...values, ...artistParts].flatMap(getSearchAliases).filter(Boolean)
    )];
  }

  function normalizeIdentity(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("ko-KR")
      .replace(/[^\p{L}\p{N}]+/gu, "");
  }

  function getSearchText(song) {
    if (searchTextCache.has(song)) return searchTextCache.get(song);
    const value = normalize([
      song.number,
      song.titleKo,
      song.titleOriginal,
      song.artist,
      song.tag,
      song.tagKo,
      ...getCustomTags(song),
      ...getAliasCandidates(song),
      ...getSearchAliasCandidates(song),
      song.category,
      ...getAlsoCategories(song),
      song.group,
      song.jpopGroup
    ].join(" "));
    searchTextCache.set(song, value);
    return value;
  }

  function renderIndex(container, entries) {
    container.replaceChildren();
    if (entries.length < 2) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    const tools = document.createElement("div");
    tools.className = "section-index-tools";
    const label = document.createElement("div");
    label.className = "section-index-label";
    label.textContent = "빠른 이동";
    tools.append(label);

    if (entries.length >= 8) {
      const filter = document.createElement("input");
      filter.type = "search";
      filter.className = "index-filter";
      filter.placeholder = "아티스트·작품 검색";
      filter.autocomplete = "off";
      filter.setAttribute("aria-label", "빠른 이동 검색");
      tools.append(filter);
    }

    const empty = document.createElement("p");
    empty.className = "index-filter-empty";
    empty.textContent = "일치하는 항목이 없습니다.";
    empty.hidden = true;
    container.append(tools, empty, ...entries.map(makeIndexButton));
  }

  function makeIndexButton(entry) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `section-index-item is-${entry.level}`;
    button.dataset.target = entry.id;
    button.dataset.search = entry.search || entry.label;
    if (entry.category) button.dataset.accent = entry.category;
    button.setAttribute("aria-current", String(entry.id === activeIndexId));
    button.textContent = entry.label;
    return button;
  }

  function activateIndex(entries) {
    state.activeIndexEntries = entries;
    if (indexObserver) indexObserver.disconnect();
    indexObserver = null;
    activeIndexId = "";
    if (!entries.length) return;

    setActiveIndex(entries[0].id);
    if (!("IntersectionObserver" in window)) return;

    indexObserver = new IntersectionObserver(records => {
      const visible = records
        .filter(record => record.isIntersecting)
        .sort((a, b) => Math.abs(a.boundingClientRect.top - window.innerHeight / 2)
          - Math.abs(b.boundingClientRect.top - window.innerHeight / 2));
      if (visible[0]) setActiveIndex(visible[0].target.id);
    }, {
      rootMargin: "-45% 0px -45% 0px",
      threshold: 0
    });

    entries.forEach(entry => {
      const target = document.getElementById(entry.id);
      if (target) indexObserver.observe(target);
    });
  }

  function setActiveIndex(id) {
    if (!id || activeIndexId === id) return;
    activeIndexId = id;
    document.querySelectorAll('.section-index-item[aria-current="true"]').forEach(button => {
      button.setAttribute("aria-current", "false");
    });
    document.querySelectorAll(`.section-index-item[data-target="${cssEscape(id)}"]`).forEach(button => {
      button.setAttribute("aria-current", "true");
    });
  }

  function filterIndexItems(container, value, emptyElement = container.querySelector(".index-filter-empty")) {
    const query = normalize(value);
    let visibleCount = 0;
    container.querySelectorAll(".section-index-item").forEach(button => {
      const visible = !query || normalize(button.dataset.search).includes(query);
      button.hidden = !visible;
      if (visible) visibleCount += 1;
    });
    if (emptyElement) emptyElement.hidden = visibleCount > 0;
  }

  function openIndexDrawer(event) {
    indexDrawerTrigger = event?.currentTarget instanceof HTMLElement ? event.currentTarget : null;
    els.indexDrawerNav.replaceChildren(...state.activeIndexEntries.map(makeIndexButton));
    els.indexDrawerFilter.value = "";
    els.indexDrawerEmpty.hidden = true;
    els.indexDrawer.hidden = false;
    document.body.classList.add("drawer-open");
    requestAnimationFrame(() => els.indexDrawerFilter.focus());
  }

  function closeIndexDrawer() {
    if (els.indexDrawer.hidden) return;
    els.indexDrawer.hidden = true;
    document.body.classList.remove("drawer-open");
    indexDrawerTrigger?.focus({ preventScroll: true });
    indexDrawerTrigger = null;
  }

  function jumpToSection(id) {
    const target = document.getElementById(id);
    if (!target) return;
    setActiveIndex(id);
    target.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  function nextSectionId(prefix) {
    sectionSequence += 1;
    return `${sectionPrefix}-${prefix}-${sectionSequence}`;
  }

  function openFavorites(pushHistory) {
    if (state.view !== "favorites") saveCurrentScrollPosition();
    if (pushHistory && location.hash !== "#favorites") history.pushState({ view: "favorites" }, "", "#favorites");
    state.view = "favorites";
    renderTabs();
    els.mainApp.hidden = true;
    els.favoritesView.hidden = false;
    document.body.classList.add("is-favorites-view");
    renderFavorites();
    persistBrowseState();
    restoreCurrentScrollPosition();
  }

  function showMainView() {
    if (state.view !== "main") saveCurrentScrollPosition();
    state.view = "main";
    renderTabs();
    els.mainApp.hidden = false;
    els.favoritesView.hidden = true;
    document.body.classList.remove("is-favorites-view");
    renderMain();
    persistBrowseState();
    restoreCurrentScrollPosition();
  }

  function syncViewFromLocation() {
    if (location.hash === "#favorites") openFavorites(false);
    else showMainView();
  }

  function getCurrentScrollKey() {
    return state.view === "favorites"
      ? `favorites:${state.favoriteCategory}`
      : `main:${state.category}`;
  }

  function setCurrentScrollPosition(value) {
    const top = Number(value);
    state.scrollPositions[getCurrentScrollKey()] = Number.isFinite(top)
      ? Math.max(0, Math.round(top))
      : 0;
  }

  function saveCurrentScrollPosition() {
    setCurrentScrollPosition(window.scrollY);
    persistBrowseState();
  }

  function restoreCurrentScrollPosition() {
    const top = Number(state.scrollPositions[getCurrentScrollKey()]) || 0;
    requestAnimationFrame(() => {
      const previousBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      window.scrollTo(0, top);
      document.documentElement.style.scrollBehavior = previousBehavior;
    });
  }

  function normalize(value) {
    return String(value || "")
      .normalize("NFKC")
      .toLocaleLowerCase("ko-KR")
      .replace(/[\s\u3000·・.\-_/／]+/g, "");
  }

  function cssEscape(value) {
    return window.CSS?.escape ? window.CSS.escape(value) : String(value).replace(/["\\]/g, "\\$&");
  }

  function escapeHtml(value) {
    return String(value || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add("is-visible");
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => els.toast.classList.remove("is-visible"), 1500);
  }
})();
