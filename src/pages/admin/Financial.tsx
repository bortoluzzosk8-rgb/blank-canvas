import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialSummary } from "@/components/financial/FinancialSummary";
import { RevenueList } from "@/components/financial/RevenueList";
import { ExpenseList } from "@/components/financial/ExpenseList";
import { LoanList } from "@/components/financial/LoanList";
import { ExpenseCategoryManager } from "@/components/financial/ExpenseCategoryManager";
import { CreditCardManager } from "@/components/financial/CreditCardManager";
import { ExpenseCategorySummary } from "@/components/financial/ExpenseCategorySummary";

export default function Financial() {
  const [activeTab, setActiveTab] = useState("summary");

  return (
    <div className="p-4 md:p-6 space-y-6">
      <h1 className="text-2xl font-bold">💰 Financeiro</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="flex w-full overflow-x-auto h-auto p-1 gap-1">
          <TabsTrigger value="summary" className="shrink-0 px-3 py-2 text-xs sm:text-sm">
            📊 Resumo
          </TabsTrigger>
          <TabsTrigger value="revenue" className="shrink-0 px-3 py-2 text-xs sm:text-sm">
            📈 Receitas
          </TabsTrigger>
          <TabsTrigger value="expenses" className="shrink-0 px-3 py-2 text-xs sm:text-sm">
            📉 Despesas
          </TabsTrigger>
          <TabsTrigger value="loans" className="shrink-0 px-3 py-2 text-xs sm:text-sm">
            🏦 Empréstimos
          </TabsTrigger>
          <TabsTrigger value="cards" className="shrink-0 px-3 py-2 text-xs sm:text-sm">
            💳 Cartões
          </TabsTrigger>
          <TabsTrigger value="categories" className="shrink-0 px-3 py-2 text-xs sm:text-sm">
            📂 Categorias
          </TabsTrigger>
          <TabsTrigger value="category-summary" className="shrink-0 px-3 py-2 text-xs sm:text-sm">
            📊 Por Categoria
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <FinancialSummary />
        </TabsContent>

        <TabsContent value="revenue" className="mt-6">
          <RevenueList />
        </TabsContent>

        <TabsContent value="expenses" className="mt-6">
          <ExpenseList />
        </TabsContent>

        <TabsContent value="loans" className="mt-6">
          <LoanList />
        </TabsContent>

        <TabsContent value="cards" className="mt-6">
          <CreditCardManager />
        </TabsContent>

        <TabsContent value="categories" className="mt-6">
          <ExpenseCategoryManager />
        </TabsContent>

        <TabsContent value="category-summary" className="mt-6">
          <ExpenseCategorySummary />
        </TabsContent>
      </Tabs>
    </div>
  );
}
