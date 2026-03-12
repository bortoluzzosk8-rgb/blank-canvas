import { Equipment, Franchise } from "@/types/inventory";
import { Card } from "@/components/ui/card";
import { BarChart3, Package, WrenchIcon, DollarSign } from "lucide-react";

type DashboardProps = {
  franchises: Franchise[];
  equipment: Equipment[];
  franchiseNameById: (id: string) => string;
};

export const Dashboard = ({ franchises, equipment, franchiseNameById }: DashboardProps) => {
  const formatCurrency = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalEquipment = equipment.length;
  const availableCount = equipment.filter((e) => e.status === "disponivel").length;
  const maintenanceCount = equipment.filter((e) => e.status === "manutencao").length;
  const totalValue = equipment.reduce((sum, e) => sum + e.value, 0);

  const statsByFranchise = franchises.map((f) => {
    const franchiseEquip = equipment.filter((e) => e.franchiseId === f.id);
    const available = franchiseEquip.filter((e) => e.status === "disponivel").length;
    const maintenance = franchiseEquip.filter((e) => e.status === "manutencao").length;
    const value = franchiseEquip.reduce((sum, e) => sum + e.value, 0);

    return {
      franchise: f,
      total: franchiseEquip.length,
      available,
      maintenance,
      value,
    };
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total de Equipamentos</p>
              <p className="text-2xl font-bold text-foreground">{totalEquipment}</p>
            </div>
            <Package className="w-8 h-8 text-blue-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Disponíveis</p>
              <p className="text-2xl font-bold text-green-600">{availableCount}</p>
            </div>
            <BarChart3 className="w-8 h-8 text-green-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Em Manutenção</p>
              <p className="text-2xl font-bold text-yellow-600">{maintenanceCount}</p>
            </div>
            <WrenchIcon className="w-8 h-8 text-yellow-500" />
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Valor Total</p>
              <p className="text-xl font-bold text-primary">{formatCurrency(totalValue)}</p>
            </div>
            <DollarSign className="w-8 h-8 text-primary" />
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Estatísticas por Franquia</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left p-2">Franquia</th>
                <th className="text-right p-2">Total</th>
                <th className="text-right p-2">Disponível</th>
                <th className="text-right p-2">Manutenção</th>
                <th className="text-right p-2">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              {statsByFranchise.map((stat) => (
                <tr key={stat.franchise.id} className="border-b hover:bg-muted/50">
                  <td className="p-2">
                    <div>
                      <p className="font-medium">{stat.franchise.name}</p>
                      <p className="text-sm text-muted-foreground">{stat.franchise.city}</p>
                    </div>
                  </td>
                  <td className="text-right p-2 font-semibold">{stat.total}</td>
                  <td className="text-right p-2 text-green-600">{stat.available}</td>
                  <td className="text-right p-2 text-yellow-600">{stat.maintenance}</td>
                  <td className="text-right p-2 font-semibold">
                    {formatCurrency(stat.value)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
