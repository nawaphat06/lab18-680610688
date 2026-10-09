import { Router, type Request, type Response } from "express";
// ข้อ 1.1 import zStudentPutBody
// hew wa
import {
  zStudentPostBody,
  zStudentPutBody,
  zStudentId,
} from "../libs/zodValidators.js";

import type { Student, CustomRequest } from "../libs/types.js";

// import authentication middleware
import { authenticateToken } from "../middlewares/authenMiddleware.ts";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminDBMiddleware.ts";
import { checkRoles } from "../middlewares/checkRolesDBMiddleware.ts";

// import database
import { PrismaClient } from "../../generated/prisma/client.ts";
const prisma = new PrismaClient();

const router = Router();

// GET /api/v3/students
// get students (by program) with files
router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: Request, res: Response) => {
    try {
      const students = await prisma.student.findMany({
        include: { files: true },
      });

      const program = req.query.program;
      if (program) {
        let filtered_students = students.filter(
          (student: any) => student.program === program,
        );
        return res.json({
          success: true,
          data: filtered_students,
        });
      } else {
        return res.json({
          success: true,
          data: students,
        });
      }
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// GET /api/v3/students/{studentId}
router.get(
  "/:studentId",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;
      const studentId = req.params.studentId as string;

      const result = zStudentId.safeParse(studentId);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const found_student = await prisma.student.findUnique({
        where: { studentId: studentId },
      });

      if (!found_student) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      if (
        user?.role === "STUDENT" &&
        found_student.studentId !== user.studentId
      ) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      res.json({
        success: true,
        data: found_student,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// POST /api/v3/students
router.post(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const body = (await req.body) as Student;

      const result = zStudentPostBody.safeParse(body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const student = await prisma.student.findUnique({
        where: { studentId: result.data.studentId },
      });
      if (student) {
        return res.status(400).json({
          success: false,
          message: "The StudentID is already taken.",
        });
      }

      const { studentId, firstName, lastName, program, interests, emails } =
        result.data;
      const created = await prisma.student.create({
        data: {
          studentId,
          firstName,
          lastName,
          program,
          interests,
          emails,
        },
      });

      res.set("Link", `/api/v3/students/${created.studentId}`);

      return res.status(201).json({
        success: true,
        data: created,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// ข้อ 1.1 endpoint PUT /api/v3/students
router.put(
  "/",
  authenticateToken,
  checkRoles,
  async (req: CustomRequest, res: Response) => {
    try {
      const user = req.user;

      // ตรวจสอบข้อมูลด้วย zStudentPutBody
      const result = zStudentPutBody.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const { studentId, firstName, lastName, program, interests, emails } =
        result.data;

      // Role ADMIN แก้ไขได้ทุกคน,, Role STUDENT แก้ไขได้แค่ตัวเอง
      if (user?.role === "STUDENT" && user.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden access",
        });
      }

      // ค้นหาใน DB
      const existingStudent = await prisma.student.findUnique({
        where: { studentId },
      });
      if (!existingStudent) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      // 
      const updated = await prisma.student.update({
        where: { studentId },
        data: {
          ...(firstName ? { firstName } : {}),
          ...(lastName ? { lastName } : {}),
          ...(program ? { program } : {}),
          ...(interests ? { interests } : {}),
          ...(emails ? { emails } : {}),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Student updated successfully",
        data: updated,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

// ข้อ 1.2 endpoint DELETE /api/v3/students 
router.delete(
  "/",
  authenticateToken,
  checkRoleAdmin,
  async (req: CustomRequest, res: Response) => {
    try {
      const { studentId } = req.body;

      // ใช้ zod ตรวจสอบความถูกต้องของ studentId
      const result = zStudentId.safeParse(studentId);
      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      // ค้นหาใน DB
      const existingStudent = await prisma.student.findUnique({
        where: { studentId },
      });
      if (!existingStudent) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      // ลบ Enrollment ที่อ้างอิง studentId ก่อน แล้วค่อยลบนักศึกษา
      const [, deletedStudent] = await prisma.$transaction([
        prisma.enrollment.deleteMany({
          where: { studentId },
        }),
        prisma.student.delete({
          where: { studentId },
        }),
      ]);

      return res.status(200).json({
        success: true,
        message: "Student deleted successfully",
        data: deletedStudent,
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  },
);

export default router;