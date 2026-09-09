import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Ringkasan aktivitas QuizForge kamu."
      />
      <Card>
        <CardHeader>
          <CardTitle>Selamat datang di QuizForge</CardTitle>
          <CardDescription>
            Mulai dengan mengupload dokumen di halaman Documents, lalu generate
            soal dari sana.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Placeholder — statistik ringkasan (jumlah dokumen, soal, sesi ujian)
            akan ditampilkan di sini.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
