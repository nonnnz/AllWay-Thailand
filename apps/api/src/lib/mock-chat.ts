import { getMockDataset, getMockPlaceById } from "./mock-data";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function mockChatReply(
  messages: ChatMessage[],
  context?: { destination?: string; currentPlaceId?: string; pagePath?: string },
) {
  const last = messages[messages.length - 1]?.content?.toLowerCase() || "";
  const dataset = getMockDataset();
  const currentPlace = context?.currentPlaceId ? getMockPlaceById(context.currentPlaceId) : null;

  const candidates = dataset.places
    .filter((place) => {
      const name = (place.nameEn || place.name).toLowerCase();
      if (currentPlace && place.id === currentPlace.id) return true;
      if (last.includes(name)) return true;
      if (place.province && last.includes(place.province.toLowerCase())) return true;
      return false;
    })
    .slice(0, 3);

  const top = candidates[0] || dataset.places[0];
  const trust = top.destination?.trustScore ?? 0.65;
  const crowd = top.destination?.crowdScore ?? 0.5;

  if (/(scam|unsafe|fraud|overcharg|report|risk)/.test(last)) {
    return [
      `For ${(top.nameEn || top.name)} trust is ${(trust * 100).toFixed(0)} and crowd is ${(crowd * 100).toFixed(0)}.`,
      "If this feels suspicious, submit a report and avoid cash transfer before verification.",
      "Safety guidance is supportive only and not guaranteed.",
    ].join(" ");
  }

  if (/(price|cost|expensive|cheap|budget|thb|baht)/.test(last)) {
    return [
      `${top.nameEn || top.name} has trust ${(trust * 100).toFixed(0)} and crowd ${(crowd * 100).toFixed(0)}.`,
      "Open fair-price card to compare local baseline before deciding.",
      "Use trusted vendors and confirm menu pricing first.",
    ].join(" ");
  }

  if (/(culture|etiquette|temple|custom|dos|donts)/.test(last)) {
    return [
      `${top.nameEn || top.name} trust is ${(trust * 100).toFixed(0)} with crowd ${(crowd * 100).toFixed(0)}.`,
      "Check cultural context card for local do and don't reminders.",
      "Be respectful with dress code and ask before taking photos.",
    ].join(" ");
  }

  return [
    `Top nearby option is ${top.nameEn || top.name} in ${top.province || "Thailand"}.`,
    `Trust ${(trust * 100).toFixed(0)} and crowd ${(crowd * 100).toFixed(0)}.`,
    "Open place detail for trust source, fair price, and cultural context cards.",
  ].join(" ");
}

