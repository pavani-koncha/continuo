import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Navbar } from './components/Navbar';
import { Dashboard } from './components/Dashboard';
import { Customers } from './components/Customers';
import { CustomerDetail } from './components/CustomerDetail';
import { ConversationView } from './components/ConversationView';
import { MemoryExplorer } from './components/MemoryExplorer';
import { InsightsView } from './components/InsightsView';
import { SettingsView } from './components/SettingsView';
import { AddCustomerModal } from './components/AddCustomerModal';
import { AskContinuoModal } from './components/AskContinuoModal';
import { Customer, DashboardStats } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [detailCustomer, setDetailCustomer] = useState<Customer | null>(null);
  const [initialConversationId, setInitialConversationId] = useState<string | undefined>(undefined);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [statusInfo, setStatusInfo] = useState<any>(null);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAskContinuoOpen, setIsAskContinuoOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [custList, statsData, statusData] = await Promise.all([
        api.getCustomers().catch(() => []),
        api.getStats().catch(() => null),
        api.getSystemStatus().catch(() => null)
      ]);

      setCustomers(custList);
      setStats(statsData);
      setStatusInfo(statusData);

      if (custList.length > 0 && !selectedCustomer) {
        setSelectedCustomer(custList[0]);
      }
    } catch (err) {
      console.error('Error loading initial app data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshCustomersAndStats = async () => {
    try {
      const [custList, statsData] = await Promise.all([
        api.getCustomers(),
        api.getStats()
      ]);
      setCustomers(custList);
      setStats(statsData);
      
      if (selectedCustomer) {
        const found = custList.find(c => c.id === selectedCustomer.id);
        if (found) setSelectedCustomer(found);
      }
    } catch (err) {
      console.error('Failed to refresh data:', err);
    }
  };

  const handleCustomerCreated = (newCust: Customer) => {
    setCustomers(prev => [newCust, ...prev]);
    setSelectedCustomer(newCust);
    refreshCustomersAndStats();
  };

  const handleDeleteCustomer = async (id: string) => {
    if (!confirm('Are you sure you want to delete this customer record and their memory layer?')) return;
    try {
      await api.deleteCustomer(id);
      setCustomers(prev => prev.filter(c => c.id !== id));
      if (selectedCustomer?.id === id) {
        setSelectedCustomer(customers.find(c => c.id !== id) || null);
      }
      refreshCustomersAndStats();
    } catch (err) {
      console.error('Failed to delete customer:', err);
    }
  };

  const handleOpenConversation = (customerId: string, conversationId?: string) => {
    const cust = customers.find(c => c.id === customerId);
    if (cust) setSelectedCustomer(cust);
    setInitialConversationId(conversationId);
    setCurrentTab('conversations');
  };

  const handleOpenCustomerDetail = (cust: Customer) => {
    setDetailCustomer(cust);
    setSelectedCustomer(cust);
    setCurrentTab('customerDetail');
  };

  return (
    <div className="flex h-screen bg-[#090d16] text-slate-100 font-sans overflow-hidden">
      {/* Sidebar Navigation */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={(tab) => {
          setCurrentTab(tab);
          if (tab !== 'customerDetail') setDetailCustomer(null);
        }}
        onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
        customers={customers}
        selectedCustomer={selectedCustomer}
        onSelectCustomer={(cust) => setSelectedCustomer(cust)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          currentTab={currentTab}
          customers={customers}
          selectedCustomer={selectedCustomer}
          onSelectCustomer={(cust) => setSelectedCustomer(cust)}
          onOpenAskContinuo={() => setIsAskContinuoOpen(true)}
          onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
          statusInfo={statusInfo}
        />

        {/* View Switcher */}
        <main className="flex-1 overflow-y-auto">
          {currentTab === 'dashboard' && (
            <Dashboard
              stats={stats}
              customers={customers}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenConversation={handleOpenConversation}
              onOpenAskContinuo={() => setIsAskContinuoOpen(true)}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'customers' && (
            <Customers
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
              onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
              onOpenCustomerDetail={handleOpenCustomerDetail}
              onOpenConversation={handleOpenConversation}
              onOpenAskContinuo={(cust) => {
                if (cust) setSelectedCustomer(cust);
                setIsAskContinuoOpen(true);
              }}
              onDeleteCustomer={handleDeleteCustomer}
            />
          )}

          {currentTab === 'customerDetail' && detailCustomer && (
            <CustomerDetail
              customer={detailCustomer}
              onBack={() => setCurrentTab('customers')}
              onOpenConversation={handleOpenConversation}
              onOpenAskContinuo={(cust) => {
                setSelectedCustomer(cust);
                setIsAskContinuoOpen(true);
              }}
            />
          )}

          {currentTab === 'conversations' && (
            <ConversationView
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
              initialConversationId={initialConversationId}
            />
          )}

          {currentTab === 'memories' && (
            <MemoryExplorer
              customers={customers}
              selectedCustomer={selectedCustomer}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
            />
          )}

          {currentTab === 'insights' && (
            <InsightsView
              customers={customers}
              onSelectCustomer={(cust) => setSelectedCustomer(cust)}
              onNavigateTab={(tab) => setCurrentTab(tab)}
            />
          )}

          {currentTab === 'settings' && (
            <SettingsView />
          )}
        </main>
      </div>

      {/* Modals */}
      <AddCustomerModal
        isOpen={isAddCustomerOpen}
        onClose={() => setIsAddCustomerOpen(false)}
        onCustomerCreated={handleCustomerCreated}
      />

      <AskContinuoModal
        isOpen={isAskContinuoOpen}
        onClose={() => setIsAskContinuoOpen(false)}
        customer={selectedCustomer}
      />
    </div>
  );
};

export default App;
