import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Ujian" };

export default function ExamsPage() {
  return (
    <>
      <PageHeader
        title="Ujian"
        description="Buat sesi ujian dari soal di bank, kerjakan dengan timer, dan lihat riwayat."
      />
      <Card>
        <CardHeader>
          <CardTitle>Belum ada sesi ujian</CardTitle>
          <CardDescription>
            Sesi ujian yang dibuat akan muncul di sini beserta riwayatnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fitur ujian interaktif dibangun di Tahap 2.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
