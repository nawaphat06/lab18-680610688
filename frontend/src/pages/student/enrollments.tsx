import { useState } from "react";
// 4.2 ArrowRightLeft
import { PlusCircle, ArrowRightLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
// 4.3 ConfirmDeleteButton
import { ConfirmDeleteButton } from "@/components/confirm-button";
import { useAuthStore } from "@/lib/auth-store";
import { useEnrollmentStore } from "@/lib/enrollment-store";

export default function StudentEnrollmentsPage() {
  const studentId = useAuthStore((s) => s.studentId);
  // 4.1 ดึง updateEnrollment และ dropEnrollment
  const {
    students,
    courses,
    enrollments,
    enroll,
    updateEnrollment,
    dropEnrollment,
  } = useEnrollmentStore();

  const [open, setOpen] = useState(false);
  const [formCourse, setFormCourse] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // 4.2 State สำหรับ Dialog เปลี่ยนวิชา
  const [changeDialogOpen, setChangeDialogOpen] = useState(false);
  const [targetCourseId, setTargetCourseId] = useState<string | null>(null);
  const [newCourseId, setNewCourseId] = useState<string | null>(null);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changing, setChanging] = useState(false);

  // 4.3 State สำหรับแสดงข้อผิดพลาดเมื่อลบไม่สำเร็จ
  const [dropError, setDropError] = useState<string | null>(null);

  const me = students.find((s) => s.studentId === studentId);
  const myEnrollments = enrollments.filter((e) => e.studentId === studentId);

  // รายการวิชาสำหรับ Dialog ลงทะเบียนใหม่ (แสดงเฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
  const courseOptions = courses
    .filter((c) => !myEnrollments.some((e) => e.courseId === c.courseId))
    .map((c) => ({
      value: c.courseId,
      label: `${c.courseId} — ${c.courseTitle}`,
    }));

  // 4.2 รายการวิชาใหม่สำหรับ Dialog เปลี่ยนวิชา (แสดงเฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
  const availableCoursesForChange = courses
    .filter((c) => !myEnrollments.some((e) => e.courseId === c.courseId))
    .map((c) => ({
      value: c.courseId,
      label: `${c.courseId} — ${c.courseTitle}`,
    }));

  const courseOf = (courseId: string) =>
    courses.find((c) => c.courseId === courseId);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (!next) {
      setFormCourse(null);
      setServerError(null);
    }
  };

  const handleEnroll = async () => {
    if (!studentId || !formCourse) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await enroll(studentId, formCourse);
      handleOpenChange(false);
    } catch (err) {
      setServerError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  // 4.2 ฟังก์ชันเปิด Dialog เปลี่ยนวิชา
  const handleOpenChangeDialog = (courseId: string) => {
    setTargetCourseId(courseId);
    setNewCourseId(null);
    setChangeError(null);
    setChangeDialogOpen(true);
  };

  // 4.2 ฟังก์ชันบันทึกการเปลี่ยนวิชา (PUT /api/v3/enrollments)
  const handleSaveChangeCourse = async () => {
    if (!studentId || !targetCourseId || !newCourseId) return;
    setChanging(true);
    setChangeError(null);
    try {
      await updateEnrollment(studentId, targetCourseId, newCourseId);
      setChangeDialogOpen(false);
      setTargetCourseId(null);
      setNewCourseId(null);
    } catch (err) {
      // ถ้า Backend ปฏิเสธ ใแสดงข้อความใน Dialog และไม่ปิดฟอร์ม
      setChangeError((err as Error).message);
    } finally {
      setChanging(false);
    }
  };

  // 4.3 ฟังก์ชันยกเลิกการลงทะเบียน (DELETE /api/v3/enrollments)
  const handleDrop = async (courseId: string) => {
    if (!studentId) return;
    setDropError(null);
    try {
      await dropEnrollment(studentId, courseId);
    } catch (err) {
      // หากลบไม่สำเร็จให้แสดงข้อความ
      setDropError((err as Error).message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold">จัดการการลงทะเบียน</h1>
          <p className="text-sm text-muted-foreground">
            {me
              ? `${me.studentId} — ${me.firstName} ${me.lastName} (${me.program})`
              : (studentId ?? "-")}{" "}
            · ลงทะเบียนแล้ว {myEnrollments.length} วิชา
          </p>
        </div>

        <Dialog open={open} onOpenChange={handleOpenChange}>
          <DialogTrigger render={<Button disabled={!studentId} />}>
            <PlusCircle className="h-4 w-4" />
            ลงทะเบียนเรียน
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>ลงทะเบียนเรียน</DialogTitle>
              <DialogDescription>
                เลือกวิชาที่ยังไม่ได้ลงทะเบียน
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-1.5">
              <Label htmlFor="formCourse">วิชา</Label>
              <Select
                items={courseOptions}
                value={formCourse}
                onValueChange={(v) => setFormCourse(v as string)}
              >
                <SelectTrigger id="formCourse" className="w-full">
                  <SelectValue
                    placeholder={
                      courseOptions.length === 0
                        ? "ลงทะเบียนครบทุกวิชาแล้ว"
                        : "เลือกวิชา"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {courseOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {serverError && (
              <p className="text-sm text-destructive">{serverError}</p>
            )}
            <DialogFooter>
              <Button
                disabled={!formCourse || submitting}
                onClick={handleEnroll}
              >
                <PlusCircle className="h-4 w-4" />
                {submitting ? "กำลังลงทะเบียน..." : "ลงทะเบียน"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* 4.3 แสดงข้อความแจ้งเตือนสีแดงหากการลบไม่สำเร็จ */}
      {dropError && (
        <p className="text-sm font-medium text-destructive">{dropError}</p>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>รหัสวิชา</TableHead>
              <TableHead>ชื่อวิชา</TableHead>
              <TableHead>ผู้สอน</TableHead>
              <TableHead>วันที่ลงทะเบียน</TableHead>
              {/* 4.2 เพิ่มคอลัมน์ Action */}
              <TableHead className="w-24 text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {myEnrollments.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-20 text-center text-muted-foreground"
                >
                  ยังไม่ได้ลงทะเบียนวิชาใด
                </TableCell>
              </TableRow>
            )}
            {myEnrollments.map((e) => {
              const course = courseOf(e.courseId);
              return (
                <TableRow key={e.courseId}>
                  <TableCell>{e.courseId}</TableCell>
                  <TableCell>{course?.courseTitle ?? "-"}</TableCell>
                  <TableCell>{course?.instructors.join(", ") || "-"}</TableCell>
                  <TableCell>
                    {e.enrolledAt
                      ? new Date(e.enrolledAt).toLocaleString("th-TH")
                      : "-"}
                  </TableCell>
                  {/* 4.2 4.3 Action ปุ่มเปลี่ยนวิชา และปุ่มยกเลิกการลงทะเบียน */}
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {/* 4.2 ปุ่มเปลี่ยนวิชา */}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleOpenChangeDialog(e.courseId)}
                        title="เปลี่ยนวิชา"
                      >
                        <ArrowRightLeft className="h-4 w-4" />
                      </Button>

                      {/* 4.3 ปุ่มยกเลิกการลงทะเบียน ConfirmDeleteButton */}
                      <ConfirmDeleteButton
                        label={`ยกเลิกการลงทะเบียน ${e.courseId}`}
                        title={`ยกเลิกการลงทะเบียนวิชา ${e.courseId}?`}
                        description={`คุณต้องการยกเลิกการลงทะเบียนวิชา ${e.courseId} — ${course?.courseTitle ?? ""} ใช่หรือไม่?`}
                        onConfirm={() => handleDrop(e.courseId)}
                      />
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* 4.2 Dialog สำหรับเปลี่ยนวิชา (PUT /api/v3/enrollments) */}
      <Dialog
        open={changeDialogOpen}
        onOpenChange={(openState) => {
          setChangeDialogOpen(openState);
          if (!openState) {
            setTargetCourseId(null);
            setNewCourseId(null);
            setChangeError(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>เปลี่ยนวิชา {targetCourseId}</DialogTitle>
            <DialogDescription>
              เลือกวิชาใหม่แทนวิชา {targetCourseId} (เลือกได้เฉพาะวิชาที่ยังไม่ได้ลงทะเบียน)
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-1.5 py-2">
            <Label htmlFor="newCourse">วิชาใหม่</Label>
            <Select
              items={availableCoursesForChange}
              value={newCourseId}
              onValueChange={(val) => setNewCourseId(val as string)}
            >
              <SelectTrigger id="newCourse" className="w-full">
                <SelectValue
                  placeholder={
                    availableCoursesForChange.length === 0
                      ? "ไม่มีวิชาใหม่ให้เปลี่ยน"
                      : "เลือกวิชา"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {availableCoursesForChange.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 4.2 ถ้า Backend ตอบ error ให้แสดงข้อความใน Dialog */}
          {changeError && (
            <p className="text-sm text-destructive">{changeError}</p>
          )}

          <DialogFooter>
            {/* 4.2 ปุ่มบันทึก เป็นสถานะ disabled จนกว่าจะเลือกวิชา */}
            <Button
              disabled={!newCourseId || changing}
              onClick={handleSaveChangeCourse}
            >
              <ArrowRightLeft className="h-4 w-4 mr-1.5" />
              {changing ? "กำลังบันทึก..." : "บันทึก"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}