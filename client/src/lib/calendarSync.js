export function applyProviderEvents(next, provider, result) {
  const previous = next.connections[provider].calendars || [];
  next.connections[provider].calendars = result.calendars.map(calendar => ({
    ...calendar,
    visible: previous.find(item => item.id === calendar.id)?.visible !== false
  }));
  const known = new Set(result.calendars.map(calendar => calendar.id));
  next.events = next.events.filter(event => event.source !== provider || !known.has(event.calendarId));
  const seen = new Set();
  for (const event of result.events) {
    const key = `${event.calendarId}|${event.externalId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    next.events.push({ id: `external_${provider}_${event.calendarId}_${event.externalId}`, ...event });
  }
  next.connections[provider].lastSync = new Date().toISOString();
  next.connections[provider].error = (result.failures || []).map(item => item.message).join(' · ').slice(0, 500);
}
