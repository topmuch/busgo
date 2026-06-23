import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

const monthNames = [
  "Jan", "Fév", "Mar", "Avr", "Mai", "Jun",
  "Jul", "Aoû", "Sep", "Oct", "Nov", "Déc",
];

// GET /api/superadmin/stats/mrr
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== "superadmin") {
    return NextResponse.json({ error: "Non autorisé" }, { status: 403 });
  }

  const now = new Date();
  const mrrHistory: { month: string; mrr: number }[] = [];

  for (let i = 11; i >= 0; i--) {
    const year = now.getFullYear() - (now.getMonth() - i < 0 ? 1 : 0);
    const month = ((now.getMonth() - i + 12) % 12);
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 1);

    // Sum of subscription totalAmount for subscriptions active during this month
    const subs = await db.subscription.findMany({
      where: {
        startDate: { lte: endDate },
        endDate: { gte: startDate },
        status: { in: ["active", "trial"] },
      },
    });

    const mrr = subs.reduce((sum, s) => sum + s.totalAmount, 0);
    mrrHistory.push({
      month: `${monthNames[month]} ${year}`,
      mrr,
    });
  }

  return NextResponse.json(mrrHistory);
}