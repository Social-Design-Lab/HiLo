const TIMESTAMP_THRESHOLD = 100000000000;

function getBaseTime(user) {
  const baseTime = user && user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
  return Number.isFinite(baseTime) ? baseTime : Date.now();
}

function getRelativeTimestamp(item, user) {
  const baseTime = getBaseTime(user);
  const relativeTime = Number(item && item.time);

  if (Number.isFinite(relativeTime)) {
    if (relativeTime > TIMESTAMP_THRESHOLD) {
      return relativeTime;
    }

    return baseTime + relativeTime;
  }

  const fallbackRelativeTime = Number(item && item.relativeTime);
  if (Number.isFinite(fallbackRelativeTime)) {
    return baseTime + fallbackRelativeTime;
  }

  return null;
}

function getDisplaySortTime(item, user) {
  if (!item) return 0;

  if (item.absTime) {
    const absTime = new Date(item.absTime).getTime();
    if (Number.isFinite(absTime)) return absTime;
  }

  const relativeTimestamp = getRelativeTimestamp(item, user);
  if (Number.isFinite(relativeTimestamp)) return relativeTimestamp;

  return 0;
}

function getDisplayTimeForRender(item, user) {
  if (!item) return "";

  const relativeTimestamp = getRelativeTimestamp(item, user);
  if (Number.isFinite(relativeTimestamp)) return relativeTimestamp;

  return "";
}

function applyTimeForRender(item, user) {
  if (!item) return item;

  const time = getDisplayTimeForRender(item, user);
  if (time !== "") {
    item.time = time;
  }
  return item;
}

module.exports = {
  getDisplaySortTime,
  getDisplayTimeForRender,
  applyTimeForRender
};
