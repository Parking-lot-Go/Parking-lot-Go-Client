import type { TabId } from './NavBar';

interface Props {
  tab: TabId;
  open: boolean;
  onClose: () => void;
}

const TAB_TITLES: Record<TabId, string> = {
  nearby: '내 주변',
  home: '홈',
  saved: '저장',
};

export default function TabPage({ tab, open, onClose }: Props) {
  const translateY = open ? '0' : '100%';
  const transition = 'transform 0.28s cubic-bezier(0.32,0.72,0,1)';

  return (
    <div
      className="tab-page"
      style={{ transform: `translateY(${translateY})`, transition, pointerEvents: open ? 'auto' : 'none' }}
    >
      <div className="tab-page-header">
        <span className="tab-page-title">{TAB_TITLES[tab]}</span>
        <button className="tab-page-close" onClick={onClose} aria-label="닫기">✕</button>
      </div>
      <div className="tab-page-body">
        <p className="tab-page-empty">준비 중입니다.</p>
      </div>
    </div>
  );
}
