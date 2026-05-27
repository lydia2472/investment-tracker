import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Account } from '@/types';
import { RiskLevel } from '@/types';
import { getDefaultRiskLevel } from '@/lib/utils/risk-level-helpers';
import { v4 as uuidv4 } from 'uuid';

interface AccountState {
  accounts: Account[];
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
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id
              ? { ...acc, ...updates, updatedAt: new Date() }
              : acc
          ),
        }));
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
    }
  )
);
