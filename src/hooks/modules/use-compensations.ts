"use client";

/**
 * useCompensations — fetches compensations for the connected client.
 */

import { useEffect, useState, useCallback } from "react";

export interface CompensationItem {
  id: string;
  amountFcfa: number;
  reason: string;
  status: string;
  voucherCode: string;
  hadGpsTracking: boolean;
  lastDistanceMeters: number | null;
  lastEtaMinutes: number | null;
  wasMovingTowardsQuay: boolean;
  redeemedAt: string | null;
  expiresAt: string;
  createdAt: string;
  billet: {
    trajet: {
      origin: string;
      destination: string;
      date: string;
    };
  };
}

interface UseCompensationsResult {
  compensations: CompensationItem[];
  loading: boolean;
  error: string;
  total: number;
  active: number;
  redeemed: number;
  totalValueFcfa: number;
  refetch: () => Promise<void>;
}

export function useCompensations(): UseCompensationsResult {
  const [compensations, setCompensations] = useState<CompensationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    redeemed: 0,
    totalValueFcfa: 0,
  });

  const refetch = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/compensations?XTransformPort=3000");
      if (!res.ok) throw new Error("Erreur serveur");
      const data = await res.json();
      setCompensations(data.compensations ?? []);
      setStats({
        total: data.total ?? 0,
        active: data.active ?? 0,
        redeemed: data.redeemed ?? 0,
        totalValueFcfa: data.totalValueFcfa ?? 0,
      });
      setError("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    compensations,
    loading,
    error,
    ...stats,
    refetch,
  };
}
