// utils/title.js - 番剧名称标准化

const TITLE_ALIASES = {
  '呪術廻戦': '咒术回战',
  'ハイキュー!!': '排球少年!!'
};

function cleanTitle(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeAnimeTitle(anime) {
  const legacyName = cleanTitle(anime.name);
  const titleCn = cleanTitle(anime.titleCn || anime.nameCn);
  const titleJp = cleanTitle(anime.titleJp || anime.nameJp);
  const titleEn = cleanTitle(anime.titleEn || anime.nameEn);
  const aliasTitle = TITLE_ALIASES[titleJp] || TITLE_ALIASES[titleCn] || '';
  const displayTitle = aliasTitle || titleCn || titleJp || titleEn || legacyName || '未知番剧';

  return {
    ...anime,
    titleCn: aliasTitle || titleCn,
    titleJp,
    titleEn,
    displayTitle,
    name: displayTitle,
    nameJp: titleJp,
    nameEn: titleEn
  };
}

module.exports = {
  normalizeAnimeTitle
};
