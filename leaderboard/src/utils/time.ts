export function intervalStringToMs(interval: string): number {
  if (interval === "alltime" || interval === "Infinity") {
    return -1;
  }
  if (interval === "daily") {
    return 24 * 60 * 60 * 1000;
  }
  if (interval === "weekly") {
    return 7 * 24 * 60 * 60 * 1000;
  }
  const [num, unit] = interval.split(" ");
  const numInt = parseInt(num, 10);
  const unitInt = unitToMs(unit.toLowerCase());
  return numInt * unitInt;
}

export function unitToMs(unit: string): number {
  switch (unit) {
    case "s":
    case "sec":
    case "second":
    case "seconds":
      return 1000;
    case "m":
    case "min":
    case "minute":
    case "minutes":
      return 1000 * 60;
    case "h":
    case "hour":
    case "hours":
      return 1000 * 60 * 60;
    case "d":
    case "day":
    case "days":
      return 1000 * 60 * 60 * 24;
    default:
      throw new Error(`Unknown unit ${unit}`);
  }
}
