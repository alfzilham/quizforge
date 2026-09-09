import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dokumen" };

export default function DocumentsPage() {
  return (
    <>
      <PageHeader
        title="Dokumen"
        description="Upload dokumen sumber (PDF, DOCX, PPTX, XLSX) dan kelola dalam collection."
      />
      <Card>
        <CardHeader>
          <CardTitle>Belum ada dokumen</CardTitle>
          <CardDescription>
            Dokumen yang diupload akan muncul di sini beserta status
            parsing-nya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fitur upload &amp; parsing dokumen dibangun di Tahap 2.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
