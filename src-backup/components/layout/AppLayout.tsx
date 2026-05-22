import { ReactNode } from 'react';
import { AppShell, Burger, Group, NavLink } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import {
  IconDashboard,
  IconBuildingBank,
  IconReceipt,
  IconChartBar,
} from '@tabler/icons-react';
import { Link, useLocation } from 'react-router-dom';
import { RightSidebar } from './RightSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [opened, { toggle }] = useDisclosure();
  const location = useLocation();

  const navItems = [
    { label: '总览', path: '/', icon: IconDashboard },
    { label: '账户', path: '/accounts', icon: IconBuildingBank },
    { label: '交易', path: '/transactions', icon: IconReceipt },
    { label: '统计', path: '/statistics', icon: IconChartBar },
  ];

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 250,
        breakpoint: 'sm',
        collapsed: { mobile: !opened, desktop: !opened },
      }}
      aside={{
        width: 350,
        breakpoint: 'md',
        collapsed: { mobile: true, desktop: false },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md">
          <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />
          <div style={{ fontWeight: 700, fontSize: 20 }}>
            投资账户管理
          </div>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            component={Link}
            to={item.path}
            label={item.label}
            leftSection={<item.icon size={16} />}
            active={location.pathname === item.path}
            onClick={() => {
              if (window.innerWidth < 768) {
                toggle();
              }
            }}
            mb="xs"
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Aside p="md">
        <RightSidebar />
      </AppShell.Aside>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
};
