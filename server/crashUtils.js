function toNumber(value) {
  if (value === null || typeof value === "undefined") {
    return null;
  }
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function parseTimeValueToMilliseconds(value) {
  if (value === null || typeof value === "undefined") {
    return null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    if (value <= 0) {
      return null;
    }
    return value >= 1000 ? Math.round(value) : Math.round(value * 1000);
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const lower = trimmed.toLowerCase();

    if (lower.includes(":")) {
      const segments = trimmed.split(":");
      let multiplier = 1;
      let totalSeconds = 0;

      for (let i = segments.length - 1; i >= 0; i -= 1) {
        const segment = segments[i].trim();
        if (!segment) {
          return null;
        }

        const numeric = Number(segment);
        if (!Number.isFinite(numeric)) {
          return null;
        }

        totalSeconds += numeric * multiplier;
        multiplier *= 60;
      }

      if (totalSeconds <= 0) {
        return null;
      }

      return Math.round(totalSeconds * 1000);
    }

    const millisecondsMatch = lower.match(
      /^(-?\d+(?:\.\d+)?)\s*(milliseconds|millisecond|msecs|msec|ms)$/
    );
    if (millisecondsMatch) {
      const numeric = Number(millisecondsMatch[1]);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
      }
      return Math.round(numeric);
    }

    const secondsMatch = lower.match(
      /^(-?\d+(?:\.\d+)?)\s*(seconds|second|secs|sec|s)?$/
    );
    if (secondsMatch) {
      const numeric = Number(secondsMatch[1]);
      if (!Number.isFinite(numeric) || numeric <= 0) {
        return null;
      }
      return Math.round(numeric * 1000);
    }

    const numericValue = toNumber(trimmed);
    if (numericValue && numericValue > 0) {
      return numericValue >= 1000
        ? Math.round(numericValue)
        : Math.round(numericValue * 1000);
    }

    return null;
  }

  return null;
}

function detectCrashIndexFromKey(rawKey) {
  if (!rawKey) return null;
  const normalized = String(rawKey).toLowerCase();
  if (!normalized.includes("crash")) return null;

  if (/(1st|first|one|uno|1)/.test(normalized)) return 1;
  if (/(2nd|second|two|dos|2)/.test(normalized)) return 2;
  if (/(3rd|third|three|tres|3)/.test(normalized)) return 3;
  return null;
}

function extractCrashMetadata(...sources) {
  const result = {
    crash1Ms: null,
    crash2Ms: null,
    crash3Ms: null,
  };

  const assignCrashMs = (index, milliseconds) => {
    if (!Number.isFinite(milliseconds) || milliseconds <= 0) {
      return;
    }
    const key = `crash${index}Ms`;
    if (
      result[key] === null ||
      typeof result[key] === "undefined" ||
      milliseconds < result[key]
    ) {
      result[key] = milliseconds;
    }
  };

  const visited = new WeakSet();
  const processSource = (candidate) => {
    if (!candidate || typeof candidate !== "object") {
      return;
    }

    if (visited.has(candidate)) {
      return;
    }

    visited.add(candidate);

    if (Array.isArray(candidate)) {
      candidate.forEach((value, index) => {
        if (value && typeof value === "object") {
          processSource(value);
          return;
        }

        const milliseconds = parseTimeValueToMilliseconds(value);
        if (milliseconds !== null) {
          assignCrashMs(index + 1, milliseconds);
        }
      });
      return;
    }

    const entries =
      candidate instanceof Map ? candidate.entries() : Object.entries(candidate);

    for (const [key, value] of entries) {
      if (value && typeof value === "object") {
        processSource(value);
      }

      const crashIndex = detectCrashIndexFromKey(key);
      if (!crashIndex) {
        continue;
      }

      if (value === null || typeof value === "undefined" || value === "") {
        continue;
      }

      const milliseconds = parseTimeValueToMilliseconds(value);
      if (milliseconds === null) {
        continue;
      }

      assignCrashMs(crashIndex, milliseconds);
    }
  };

  sources.forEach(processSource);

  return result;
}

function buildCrashUpdateFromPayload(payload) {
  if (!payload || typeof payload !== "object") {
    return { hasUpdate: false, crashData: {}, error: null };
  }

  const lowerCaseKeyMap = new Map();
  Object.keys(payload).forEach((key) => {
    lowerCaseKeyMap.set(key.toLowerCase(), key);
  });

  const descriptors = [
    {
      index: 1,
      keys: [
        "crash1ms",
        "crash1",
        "crash1seconds",
        "firstcrash",
        "firstcrashms",
        "firstcrashseconds",
        "1stcrash",
        "1stcrashms",
        "1stcrashseconds",
        "crashone",
      ],
    },
    {
      index: 2,
      keys: [
        "crash2ms",
        "crash2",
        "crash2seconds",
        "secondcrash",
        "secondcrashms",
        "secondcrashseconds",
        "2ndcrash",
        "2ndcrashms",
        "2ndcrashseconds",
        "crashtwo",
      ],
    },
    {
      index: 3,
      keys: [
        "crash3ms",
        "crash3",
        "crash3seconds",
        "thirdcrash",
        "thirdcrashms",
        "thirdcrashseconds",
        "3rdcrash",
        "3rdcrashms",
        "3rdcrashseconds",
        "crashthree",
      ],
    },
  ];

  const crashData = {};
  let hasUpdate = false;
  let error = null;

  descriptors.forEach((descriptor) => {
    if (error) {
      return;
    }

    let selectedKey = null;
    for (const candidate of descriptor.keys) {
      const resolved = lowerCaseKeyMap.get(candidate);
      if (resolved) {
        selectedKey = resolved;
        break;
      }
    }

    if (!selectedKey) {
      return;
    }

    hasUpdate = true;
    const rawValue = payload[selectedKey];
    const targetKey = `crash${descriptor.index}Ms`;

    if (
      rawValue === null ||
      typeof rawValue === "undefined" ||
      (typeof rawValue === "string" && rawValue.trim() === "")
    ) {
      crashData[targetKey] = null;
      return;
    }

    const milliseconds = parseTimeValueToMilliseconds(rawValue);
    if (milliseconds === null) {
      error = `Invalid value for ${selectedKey}`;
      return;
    }

    crashData[targetKey] = milliseconds;
  });

  const nestedSources = [];
  ["crashes", "crash", "pasocrashes", "metadata", "customMetadata"].forEach((key) => {
    const value = payload[key];
    if (value && typeof value === "object") {
      nestedSources.push(value);
    }
  });

  if (nestedSources.length > 0) {
    const nestedCrashData = extractCrashMetadata(...nestedSources);
    [1, 2, 3].forEach((index) => {
      const key = `crash${index}Ms`;
      if (
        (nestedCrashData[key] || nestedCrashData[key] === 0) &&
        typeof crashData[key] === "undefined"
      ) {
        if (Number.isFinite(nestedCrashData[key]) && nestedCrashData[key] > 0) {
          crashData[key] = nestedCrashData[key];
          hasUpdate = true;
        }
      }
    });
  }

  return { hasUpdate, crashData, error };
}

module.exports = {
  parseTimeValueToMilliseconds,
  extractCrashMetadata,
  buildCrashUpdateFromPayload,
};
