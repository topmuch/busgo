import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id || !["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Non autorise" }, { status: 401 });
    }

    const tenantId = session.user.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant manquant" }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get("audio") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Fichier manquant" }, { status: 400 });
    }

    // Validate file type
    if (!file.type.startsWith("audio/")) {
      return NextResponse.json({ error: "Fichier audio requis (MP3, WAV, OGG)" }, { status: 400 });
    }

    // Validate size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "Fichier trop volumineux (max 10 Mo)" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const ext = path.extname(file.name) || ".webm";
    const filename = `voice-${tenantId}-${Date.now()}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "voice");
    await mkdir(uploadDir, { recursive: true });

    const filePath = path.join(uploadDir, filename);
    await writeFile(filePath, Buffer.from(bytes));

    const audioUrl = `/uploads/voice/${filename}`;

    return NextResponse.json({ audioUrl });
  } catch (error) {
    console.error("[VOICE_UPLOAD]", error);
    return NextResponse.json({ error: "Erreur lors de l'upload" }, { status: 500 });
  }
}