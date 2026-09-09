import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

export const metadata: Metadata = { title: "Question Bank" };

export default function QuestionBankPage() {
  return (
    <>
      <PageHeader
        title="Question Bank"
        description="Semua soal yang pernah dibuat — cari, filter, edit, dan kelola versi."
      />
      <Card>
        <CardHeader>
          <CardTitle>Belum ada soal</CardTitle>
          <CardDescription>
            Soal yang dihasilkan dari dokumen akan muncul di sini.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Fitur generate soal via AI dibangun di Tahap 2.
          </p>
        </CardContent>
      </Card>
    </>
  );
}
