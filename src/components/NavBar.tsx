export type TabId = 'community' | 'nearby' | 'saved' | 'mypage';

interface Props {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
}

const TABS: { id: TabId; label: string; icon: (active: boolean) => React.ReactNode }[] = [
  {
    id: 'community',
    label: '커뮤니티',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <path
          d="M20 2H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4l4 4 4-4h4a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2Z"
          fill={active ? 'white' : 'none'}
          stroke={active ? 'white' : '#666'}
          strokeWidth="1.7"
          strokeLinejoin="round"
        />
        <path d="M7 8h10M7 12h6" stroke={active ? '#141414' : '#555'} strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
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
  {
    id: 'mypage',
    label: '마이페이지',
    icon: (active) => (
      <svg viewBox="0 0 24 24" fill="none" width="22" height="22">
        <circle
          cx="12" cy="7" r="4"
          fill={active ? 'white' : 'none'}
          stroke={active ? 'white' : '#666'}
          strokeWidth="1.7"
        />
        <path
          d="M4 20c0-4 3.58-7 8-7s8 3 8 7"
          stroke={active ? 'white' : '#666'}
          strokeWidth="1.7"
          strokeLinecap="round"
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
