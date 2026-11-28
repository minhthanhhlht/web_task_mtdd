// Trang Checklist: tab "Mẫu checklist" (chỉ admin) và tab "Tổng hợp theo task".
import { useState } from 'react';
import { Card } from '@astryxdesign/core/Card';
import { Heading } from '@astryxdesign/core/Heading';
import { Tab, TabList } from '@astryxdesign/core/TabList';
import ApplyTemplatePanel from '../components/ApplyTemplatePanel.jsx';
import { useAuth } from '../components/AuthContext.jsx';
import ChecklistOverview from '../components/ChecklistOverview.jsx';
import ChecklistTemplateEditor from '../components/ChecklistTemplateEditor.jsx';

export default function Checklist() {
  const { user } = useAuth();
  const isAdmin = user.vai_tro === 'admin';
  const [tab, setTab] = useState(isAdmin ? 'template' : 'overview');
  const [dirty, setDirty] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <Heading level={1}>Checklist</Heading>
      <TabList value={tab} onChange={setTab} hasDivider>
        {isAdmin && <Tab value="template" label="Mẫu checklist" />}
        <Tab value="overview" label="Tổng hợp theo task" />
      </TabList>
      {tab === 'template' && isAdmin && (
        <div className="flex flex-col gap-4">
          <Card>
            <div className="flex flex-col gap-2">
              <Heading level={2}>Mẫu checklist cho task mới</Heading>
              <ChecklistTemplateEditor onDirtyChange={setDirty} />
            </div>
          </Card>
          <Card>
            <div className="flex flex-col gap-2">
              <Heading level={2}>Áp dụng mẫu cho task đã có</Heading>
              <ApplyTemplatePanel disabled={dirty} />
            </div>
          </Card>
        </div>
      )}
      {tab === 'overview' && <ChecklistOverview />}
    </div>
  );
}
