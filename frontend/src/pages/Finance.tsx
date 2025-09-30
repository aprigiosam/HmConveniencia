import { Card } from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { SessionManager } from "../components/finance/SessionManager";
import { ContasReceberTable } from "../components/finance/ContasReceberTable";
import { ContasPagarTable } from "../components/finance/ContasPagarTable";
import { ClosedSessionsList } from "../components/finance/ClosedSessionsList";

export const FinancePage = () => (
  <div className="space-y-6">
    <SessionManager />

    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card title="Contas a receber" action={<Button variant="ghost">Exportar</Button>}>
        <ContasReceberTable />
      </Card>

      <Card title="Contas a pagar" action={<Button variant="ghost">Exportar</Button>}>
        <ContasPagarTable />
      </Card>
    </div>

    <Card title="Sessões Fechadas (para recuperação)">
      <ClosedSessionsList />
    </Card>
  </div>
);
