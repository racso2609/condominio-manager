"use client";

import { useState } from "react";
import { Building, Expense } from "@/lib/types";
import { useEntriesByExpenseAndBuilding } from "@/lib/queries/useExpenseEntry";
import Collapse from "@/components/Collapse";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import PaymentOrderItem from "@/components/PaymentOrderItem";

interface BuildingExpenseSectionProps {
  building: Building;
  expense: Expense;
  defaultOpen?: boolean;
  isCancelled: boolean;
  onValidate: (entryId: string, note: string) => void;
  isValidating: boolean;
}

export function BuildingExpenseSection({
  building,
  expense,
  defaultOpen = false,
  isCancelled,
  onValidate,
  isValidating,
}: BuildingExpenseSectionProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useEntriesByExpenseAndBuilding(
    expense.id,
    building.id,
    page,
    pageSize
  );

  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const entries = data?.entries ?? [];

  return (
    <Collapse
      title={building.name}
      subtitle={building.symbol ? `Símbolo: ${building.symbol}` : undefined}
      badge={
        <Badge color="zinc">
          {isLoading
            ? "..."
            : `${totalCount} ${totalCount === 1 ? "unidad" : "unidades"}`}
        </Badge>
      }
      defaultOpen={defaultOpen}
    >
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-xs text-zinc-400 py-2">Cargando cuotas...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            No hay cuotas asignadas para este edificio.
          </p>
        ) : (
          entries.map((entry) => (
            <PaymentOrderItem
              key={entry.id}
              entry={entry}
              expense={expense}
              unit={entry.units}
              building={building}
              showValidateForm={
                !isCancelled || entry.status === "pending_validation"
              }
              onValidate={(note) => onValidate(entry.id, note)}
              isValidating={isValidating}
            />
          ))
        )}

        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 pt-4 mt-2 dark:border-zinc-800">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1 || isLoading}
            >
              Anterior
            </Button>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages || isLoading}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>
    </Collapse>
  );
}

interface BuildingExpenseEntriesListProps {
  buildings: Building[];
  expense: Expense;
  isCancelled: boolean;
  onValidate: (entryId: string, note: string) => void;
  isValidating: boolean;
}

export function BuildingExpenseEntriesList({
  buildings,
  expense,
  isCancelled,
  onValidate,
  isValidating,
}: BuildingExpenseEntriesListProps) {
  if (buildings.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No hay edificios registrados en este condominio.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {buildings.map((building, index) => (
        <BuildingExpenseSection
          key={building.id}
          building={building}
          expense={expense}
          defaultOpen={index === 0}
          isCancelled={isCancelled}
          onValidate={onValidate}
          isValidating={isValidating}
        />
      ))}
    </div>
  );
}

export default BuildingExpenseEntriesList;
