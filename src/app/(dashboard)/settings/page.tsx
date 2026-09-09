import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Pengaturan" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader
        title="Pengaturan"
        description="Konfigurasi API key & model AI (via .env), rate limit, dan backup/restore."
      />
      <Card>
        <CardHeader>
          <CardTitle>Pengaturan</CardTitle>
          <CardDescription>
            Konfigurasi API key dan model AI dilakukan melalui file .env di root
            project.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fitur backup/restore akan ditambahkan di Tahap berikutnya.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
