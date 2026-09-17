"use client";

import { useEffect, useState, useCallback } from "react";
import { Building, Expense } from "@/lib/types";
import { useEntriesByExpenseAndBuilding } from "@/lib/queries/useExpenseEntry";
import Collapse from "@/components/Collapse";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import PaymentOrderItem from "@/components/PaymentOrderItem";

interface BuildingExpenseSectionProps {
  building: Building;
  expense: Expense;
  search?: string;
  defaultOpen?: boolean;
  isCancelled: boolean;
  onValidate: (entryId: string, note: string) => void;
  isValidating: boolean;
  onCountChange?: (buildingId: string, count: number) => void;
}

export function BuildingExpenseSection({
  building,
  expense,
  search,
  defaultOpen = false,
  isCancelled,
  onValidate,
  isValidating,
  onCountChange,
}: BuildingExpenseSectionProps) {
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useEntriesByExpenseAndBuilding(
    expense.id,
    building.id,
    page,
    pageSize,
    search
  );

  const totalCount = data?.totalCount ?? 0;
  const totalPages = data?.totalPages ?? 0;
  const entries = data?.entries ?? [];

  useEffect(() => {
    if (onCountChange && !isLoading && data !== undefined) {
      onCountChange(building.id, totalCount);
    }
  }, [building.id, data, isLoading, onCountChange, totalCount]);

  const isSearching = Boolean(search && search.trim().length > 0);
  const isOpen = isSearching ? (!isLoading ? totalCount > 0 : undefined) : undefined;

  const badgeContent = isLoading ? (
    "..."
  ) : isSearching ? (
    totalCount === 0 ? (
      "0 coincidencias"
    ) : (
      `${totalCount} ${totalCount === 1 ? "coincidencia" : "coincidencias"}`
    )
  ) : (
    `${totalCount} ${totalCount === 1 ? "unidad" : "unidades"}`
  );

  const badgeColor = isSearching ? (totalCount > 0 ? "blue" : "zinc") : "zinc";

  return (
    <Collapse
      title={building.name}
      subtitle={building.symbol ? `Símbolo: ${building.symbol}` : undefined}
      badge={<Badge color={badgeColor}>{badgeContent}</Badge>}
      defaultOpen={defaultOpen}
      isOpen={isOpen}
    >
      <div className="flex flex-col gap-3">
        {isLoading ? (
          <p className="text-xs text-zinc-400 py-2">Cargando cuotas...</p>
        ) : entries.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            {isSearching
              ? "No hay coincidencias en este edificio."
              : "No hay cuotas asignadas para este edificio."}
          </p>
        ) : (
          entries.map((entry) => (
            <PaymentOrderItem
              key={entry.id}
              entry={entry}
              expense={expense}
              unit={entry.units}
              owner={entry.units?.owner_user}
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
  search?: string;
  onClearSearch?: () => void;
  isCancelled: boolean;
  onValidate: (entryId: string, note: string) => void;
  isValidating: boolean;
}

export function BuildingExpenseEntriesList({
  buildings,
  expense,
  search,
  onClearSearch,
  isCancelled,
  onValidate,
  isValidating,
}: BuildingExpenseEntriesListProps) {
  const [searchCounts, setSearchCounts] = useState<{
    search?: string;
    counts: Record<string, number>;
  }>({
    search,
    counts: {},
  });

  const handleCountChange = useCallback(
    (buildingId: string, count: number) => {
      setSearchCounts((prev) => {
        const isSameSearch = prev.search === search;
        const currentCounts = isSameSearch ? prev.counts : {};
        if (currentCounts[buildingId] === count) return prev;
        return {
          search,
          counts: { ...currentCounts, [buildingId]: count },
        };
      });
    },
    [search]
  );

  if (buildings.length === 0) {
    return (
      <p className="text-sm text-zinc-500 dark:text-zinc-400">
        No hay edificios registrados en este condominio.
      </p>
    );
  }

  const isSearching = Boolean(search && search.trim().length > 0);
  const buildingCounts =
    searchCounts.search === search ? searchCounts.counts : {};
  const allLoaded =
    buildings.length > 0 &&
    buildings.every((b) => buildingCounts[b.id] !== undefined);
  const totalMatchesAcrossBuildings = Object.values(buildingCounts).reduce(
    (acc, c) => acc + c,
    0
  );
  const allZero = isSearching && allLoaded && totalMatchesAcrossBuildings === 0;

  if (allZero) {
    return (
      <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 p-8 text-center dark:border-zinc-800">
        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
          No se encontraron cuotas para &ldquo;{search}&rdquo;
        </p>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          Prueba buscando con otro término, número de unidad o referencia.
        </p>
        {onClearSearch && (
          <Button
            variant="secondary"
            size="sm"
            onClick={onClearSearch}
            className="mt-4"
          >
            Limpiar búsqueda
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {buildings.map((building, index) => (
        <BuildingExpenseSection
          key={`${building.id}-${search ?? ""}`}
          building={building}
          expense={expense}
          search={search}
          defaultOpen={index === 0}
          isCancelled={isCancelled}
          onValidate={onValidate}
          isValidating={isValidating}
          onCountChange={handleCountChange}
        />
      ))}
    </div>
  );
}

export default BuildingExpenseEntriesList;
