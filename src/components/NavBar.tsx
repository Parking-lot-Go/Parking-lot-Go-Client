export type TabId = 'nearby' | 'home' | 'saved';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'nearby',
    label: '내 주변',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <circle cx="12" cy="12" r="3" fill={active ? 'white' : '#666'} />
        <circle cx="12" cy="12" r="6" stroke={active ? 'white' : '#666'} strokeWidth="1.6" strokeDasharray="3 2" />
        <circle cx="12" cy="12" r="9.5" stroke={active ? 'white' : '#555'} strokeWidth="1.3" strokeDasharray="2 3" opacity="0.55" />
      </svg>
    ),
  },
  {
    id: 'home',
    label: '홈',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path
          d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z"
          fill={active ? 'white' : 'none'}
          stroke={active ? 'white' : '#666'}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path
          d="M9 21V12h6v9"
          stroke={active ? '#141414' : '#666'}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    id: 'saved',
    label: '저장',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path
          d="M12 3.5l2.09 4.26 4.71.68-3.4 3.32.8 4.69L12 14.27l-4.2 2.18.8-4.69-3.4-3.32 4.71-.68L12 3.5Z"
          fill={active ? 'white' : 'none'}
          stroke={active ? 'white' : '#666'}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
];

export default function NavBar({ activeTab, onTabChange }: Props) {
  return (
    <nav className="app-nav">
      {TABS.map((tab) => {
        const active = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-tab ${active ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="nav-icon">{tab.icon(active)}</span>
            <span className="nav-label">{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
