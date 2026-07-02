const TIMESTAMP_THRESHOLD = 100000000000;

function getBaseTime(user) {
  const baseTime = user && user.createdAt ? new Date(user.createdAt).getTime() : Date.now();
  return Number.isFinite(baseTime) ? baseTime : Date.now();
}

function timestampFromOffset(value, baseTime) {
  if (value === undefined || value === null || String(value).trim() === "") return null;

  const offset = Number(value);
  if (!Number.isFinite(offset)) return null;

  if (offset > TIMESTAMP_THRESHOLD) {
    return offset;
  }

  return baseTime + offset;
}

function getRelativeTimestamp(item, user) {
  const baseTime = getBaseTime(user);
  const displayTime = timestampFromOffset(item && item.display_time, baseTime);
  if (Number.isFinite(displayTime)) return displayTime;

  const relativeTime = timestampFromOffset(item && item.time, baseTime);
  if (Number.isFinite(relativeTime)) return relativeTime;

  const fallbackRelativeTime = timestampFromOffset(item && item.relativeTime, baseTime);
  if (Number.isFinite(fallbackRelativeTime)) return fallbackRelativeTime;

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

  const displayTimestamp = timestampFromOffset(item.display_time, getBaseTime(user));
  const time = getDisplayTimeForRender(item, user);
  if (time !== "") {
    item.time = time;
  }
  if (Number.isFinite(displayTimestamp)) {
    item.display_time = displayTimestamp;
  }
  return item;
}

module.exports = {
  getDisplaySortTime,
  getDisplayTimeForRender,
  applyTimeForRender
};
