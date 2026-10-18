const PATHS = {
  home: '<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
  tasks: '<rect x="3" y="4" width="18" height="16" rx="3"/><path d="m7 9 1.5 1.5L11 8M13 9h4M7 15h10"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18"/>',
  people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M16 3.1a4 4 0 0 1 0 7.8M22 21v-2a4 4 0 0 0-3-3.87"/><circle cx="9" cy="7" r="4"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.9 4.9l1.4 1.4m11.4 11.4 1.4 1.4M2 12h2m16 0h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  meals: '<path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18M19 3v18M19 3c-4 1-5 5-5 9h5"/>',
  insights: '<path d="M4 20V12M9.5 20V6M15 20v-9M20 20V3M2 21h20"/>',
  settings: '<path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/><path d="M20 13.5v-3l-2.1-.7-.9-1.7 1-2L16 4l-2 1-.9-.3L12 2l-2.1 2.7L9 5l-2-1-2 2.1 1 2-.9 1.7L3 10.5v3l2.1.7.9 1.7-1 2L7 20l2-1 .9.3L12 22l1.1-2.7.9-.3 2 1 2-2.1-1-2 .9-1.7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/>',
  search: '<circle cx="10.8" cy="10.8" r="7"/><path d="m16.2 16.2 5.1 5.1"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronRight: '<path d="m9 18 6-6-6-6"/>',
  arrowRight: '<path d="M5 12h14m-6-6 6 6-6 6"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  close: '<path d="M18 6 6 18M6 6l12 12"/>',
  edit: '<path d="m15 5 4 4M4 20l4.5-.9L20 7.5 16.5 4 4.9 15.5 4 20z"/>',
  trash: '<path d="M3 6h18M8 6V4h8v2m3 0-1 15H6L5 6M10 10v7m4-7v7"/>',
  heart: '<path d="M20.8 7.5c0 5-8.8 11.5-8.8 11.5S3.2 12.5 3.2 7.5C3.2 3 9 2.3 12 6c3-3.7 8.8-3 8.8 1.5z"/>',
  sparkle: '<path d="m12 2 1.8 7.2L21 11l-7.2 1.8L12 20l-1.8-7.2L3 11l7.2-1.8L12 2M19 19l1 3M20 20l3-1"/>',
  logout: '<path d="M9 3H4v18h5m5-4 5-5-5-5M7 12h12"/>',
  calendarPlus: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M12 13v6M9 16h6"/>',
  coffee: '<path d="M4 8h13v6a6 6 0 0 1-6 6h-1a6 6 0 0 1-6-6V8M17 9h2a3 3 0 1 1 0 6h-2M8 2v3m5-3v3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  play: '<path d="m8 5 11 7-11 7z"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 17v4h16v-4"/>',
  upload: '<path d="M12 16V4m-5 5 5-5 5 5M4 17v4h16v-4"/>'
};

export function Icon({ name = 'info', size = 19 }) {
  return (
    <svg className="icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" dangerouslySetInnerHTML={{ __html: PATHS[name] || PATHS.info }} />
  );
}
