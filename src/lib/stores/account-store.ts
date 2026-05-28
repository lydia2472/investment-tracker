import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account } from '@/types';
import { RiskLevel } from '@/types';
import { getDefaultRiskLevel } from '@/lib/utils/risk-level-helpers';
import { v4 as uuidv4 } from 'uuid';

interface AccountState {
  accounts: Account[];
  version: number;
  addAccount: (account: Omit<Account, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  getAccount: (id: string) => Account | undefined;
  updateBalance: (id: string, newBalance: number) => void;
}

export const useAccountStore = create<AccountState>()(
  persist(
    (set, get) => ({
      accounts: [],
      version: 0,

      addAccount: (accountData) => {
        const newAccount: Account = {
          ...accountData,
          riskLevel: accountData.riskLevel ?? getDefaultRiskLevel(),
          id: uuidv4(),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        set((state) => ({ accounts: [...state.accounts, newAccount] }));
      },

      updateAccount: (id, updates) => {
        set((state) => {
          const updatedAccounts = state.accounts.map((acc) =>
            acc.id === id
              ? { ...acc, ...updates, updatedAt: new Date() }
              : acc
          );
          return {
            accounts: updatedAccounts,
            version: state.version + 1,
          };
        });
      },

      deleteAccount: (id) => {
        set((state) => ({
          accounts: state.accounts.filter((acc) => acc.id !== id),
        }));
      },

      getAccount: (id) => {
        return get().accounts.find((acc) => acc.id === id);
      },

      updateBalance: (id, newBalance) => {
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id
              ? { ...acc, balance: newBalance, updatedAt: new Date() }
              : acc
          ),
        }));
      },
    }),
    {
      name: 'account-storage',
      version: 1,
      // 添加版本迁移函数
      migrate: (persistedState: any, version: number) => {
        const oldState = persistedState as AccountState

        // 从版本0迁移到版本1
        if (version === 0) {
          console.log('[AccountStore] 迁移旧数据从版本0到版本1')
          return {
            ...oldState,
            version: 1,
          }
        }

        // 其他版本直接返回
        return oldState
      },
      // 添加合并策略，确保新数据优先
      merge: (persistedState: any, currentState: AccountState) => {
        return {
          ...currentState,
          ...persistedState,
          // 确保使用当前内存中的最新数据
          accounts: persistedState.accounts || currentState.accounts,
          version: persistedState.version || currentState.version,
        }
      },
    }
  )
);
