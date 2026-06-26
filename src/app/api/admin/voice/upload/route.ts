import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/get-session";
import { writeFile, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

/**
 * POST /api/admin/voice/upload
 *
 * Accepts multipart/form-data with an "audio" file field.
 * Saves to /public/uploads/voice-{tenantId}-{timestamp}.{ext}
 * Returns { audioUrl: "/uploads/voice-..." }
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.tenantId) {
      return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
    }

    if (!["admin", "superadmin"].includes(session.user.role)) {
      return NextResponse.json({ error: "Accès refusé" }, { status: 403 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;

    if (!audioFile) {
      return NextResponse.json(
        { error: "Fichier audio manquant (champ 'audio' requis)" },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = [
      "audio/webm",
      "audio/mp3",
      "audio/wav",
      "audio/mpeg",
      "audio/ogg",
      "audio/mp4",
    ];
    if (!validTypes.includes(audioFile.type)) {
      return NextResponse.json(
        { error: `Type de fichier non supporté: ${audioFile.type}. Acceptés: ${validTypes.join(", ")}` },
        { status: 400 }
      );
    }

    // Validate file size (max 10 MB)
    const maxSize = 10 * 1024 * 1024;
    if (audioFile.size > maxSize) {
      return NextResponse.json(
        { error: "Fichier trop volumineux (max 10 MB)" },
        { status: 400 }
      );
    }

    // Determine extension
    const extMap: Record<string, string> = {
      "audio/webm": "webm",
      "audio/mp3": "mp3",
      "audio/mpeg": "mp3",
      "audio/wav": "wav",
      "audio/ogg": "ogg",
      "audio/mp4": "m4a",
    };
    const ext = extMap[audioFile.type] ?? "webm";

    // Ensure /public/uploads exists
    const uploadsDir = path.join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const fileName = `voice-${session.user.tenantId}-${Date.now()}.${ext}`;
    const filePath = path.join(uploadsDir, fileName);
    const arrayBuffer = await audioFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await writeFile(filePath, buffer);

    const audioUrl = `/uploads/${fileName}`;

    return NextResponse.json({
      ok: true,
      audioUrl,
      fileName,
      size: audioFile.size,
      type: audioFile.type,
    });
  } catch (error) {
    console.error("[VOICE_UPLOAD_ERROR]", error);
    return NextResponse.json(
      { error: "Erreur lors de l'upload du fichier audio" },
      { status: 500 }
    );
  }
}
