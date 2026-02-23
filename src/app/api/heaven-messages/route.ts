import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// ⚙️ ініціалізація Supabase через env
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // service_role для запису
);

export async function POST(req: Request) {
  try {
    const formData = await req.formData();

    const type = formData.get("type") as string;
    const recipientEmail = formData.get("recipientEmail") as string;
    const recipientName = formData.get("recipientName") as string;
    const deliveryDate = formData.get("deliveryDate") as string;
    const message = (formData.get("message") as string) || "";
    const file = formData.get("file") as File | null;

    // ❌ базова валідація
    if (!type || !recipientEmail || !recipientName || !deliveryDate) {
      return NextResponse.json(
        { error: "Brakuje wymaganych pól" },
        { status: 400 }
      );
    }

    let fileUrl: string | null = null;

    // 📂 Якщо є файл → завантажуємо в bucket "heaven-videos"
    if (file) {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const ext = file.name.split(".").pop();
      const path = `${crypto.randomUUID()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("heaven-videos")
        .upload(path, buffer, {
          contentType: file.type,
        });

      if (uploadError) {
        console.error("❌ Błąd uploadu:", uploadError.message);
        return NextResponse.json(
          { error: "Nie udało się zapisać pliku" },
          { status: 500 }
        );
      }

      const { data } = supabase.storage.from("heaven-videos").getPublicUrl(path);
      fileUrl = data.publicUrl;
    }

    // 👤 user_id (для MVP можемо null, але в проді краще brać z sesji JWT)
    const userId = null;

    // 🗄️ zapis w tabeli heaven_messages
    const { data: insertData, error } = await supabase
      .from("heaven_messages")
      .insert([
        {
          user_id: userId,
          type,
          recipient_email: recipientEmail,
          recipient_name: recipientName,
          delivery_date: deliveryDate,
          message,
          file_url: fileUrl,
          status: "scheduled",
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("❌ Błąd Supabase insert:", error.message);
      return NextResponse.json(
        { error: "Nie udało się zapisać wiadomości" },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, message: insertData });
  } catch (err) {
    console.error("❌ Błąd w API heaven-messages:", err);
    return NextResponse.json(
      { error: "Wystąpił błąd po stronie serwera" },
      { status: 500 }
    );
  }
}
