// Trang Checklist: tab "Mẫu checklist" (chỉ admin) và tab "Tổng hợp theo task".
import { useState } from 'react';
import ApplyTemplatePanel from '../components/ApplyTemplatePanel.jsx';
import { useAuth } from '../components/AuthContext.jsx';
import ChecklistOverview from '../components/ChecklistOverview.jsx';
import ChecklistTemplateEditor from '../components/ChecklistTemplateEditor.jsx';
import { CARD_CLASS } from '../constants.js';

export default function Checklist() {
  const { user } = useAuth();
  const isAdmin = user.vai_tro === 'admin';
  const [tab, setTab] = useState(isAdmin ? 'template' : 'overview');
  const [dirty, setDirty] = useState(false);
  const tabClass = (name) => `rounded-t-xl border border-b-0 border-border-strong px-4 py-1.5 text-sm ${tab === name ? 'bg-surface font-semibold text-primary' : 'bg-surface-hover text-muted'}`;

  return (
    <div>
      <h1 className="mb-4 text-xl font-semibold">Checklist</h1>
      <div className="mb-3 flex gap-1">
        {isAdmin && <button type="button" className={tabClass('template')} onClick={() => setTab('template')}>Mẫu checklist</button>}
        <button type="button" className={tabClass('overview')} onClick={() => setTab('overview')}>Tổng hợp theo task</button>
      </div>
      {tab === 'template' && isAdmin && (
        <div className="space-y-6">
          <div className={CARD_CLASS}>
            <h2 className="mb-2 text-lg font-semibold">Mẫu checklist cho task mới</h2>
            <ChecklistTemplateEditor onDirtyChange={setDirty} />
          </div>
          <div className={CARD_CLASS}>
            <h2 className="mb-2 text-lg font-semibold">Áp dụng mẫu cho task đã có</h2>
            <ApplyTemplatePanel disabled={dirty} />
          </div>
        </div>
      )}
      {tab === 'overview' && <ChecklistOverview />}
    </div>
  );
}
