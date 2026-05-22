import { ScrollArea } from '@mantine/core';
import { AccountOverview } from '../sidebar/AccountOverview';
import { TransactionDetails } from '../sidebar/TransactionDetails';

export const RightSidebar = () => {
  return (
    <ScrollArea.Autosize mah="calc(100vh - 100px)" type="auto" offsetScrollbars>
      <div style={{ padding: '8px' }}>
        <AccountOverview />

        <div style={{ height: '24px' }} />

        <TransactionDetails />
      </div>
    </ScrollArea.Autosize>
  );
};
