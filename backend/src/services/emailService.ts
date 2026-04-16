import nodemailer from "nodemailer";
import { config } from "../config/env";

// ── Transporter ──
const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

function isConfigured(): boolean {
  return !!(config.email.user && config.email.pass);
}

// ── HTML Template ──
function baseTemplate(title: string, body: string, studentName: string): string {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;margin-top:24px;margin-bottom:24px;box-shadow:0 2px 8px rgba(0,0,0,0.06);">
    <!-- Header -->
    <tr>
      <td style="background:linear-gradient(135deg,#284ce3,#5b7cf7);padding:32px 40px;">
        <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;">Learnify</h1>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.7);font-size:13px;">Parent Progress Report</p>
      </td>
    </tr>
    <!-- Body -->
    <tr>
      <td style="padding:32px 40px;">
        <p style="color:#666;font-size:14px;margin:0 0 8px;">Dear Parent,</p>
        <p style="color:#333;font-size:14px;margin:0 0 24px;">Here's an update about <strong>${studentName}</strong>'s learning journey:</p>

        <div style="background:#f8fafc;border-radius:12px;padding:24px;margin-bottom:24px;border:1px solid #e2e8f0;">
          <h2 style="margin:0 0 16px;color:#284ce3;font-size:18px;font-weight:700;">${title}</h2>
          ${body}
        </div>

        <a href="${config.frontendUrl}/dashboard" style="display:inline-block;background:#284ce3;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:10px;font-size:14px;font-weight:600;">View Dashboard</a>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="padding:24px 40px;border-top:1px solid #f0f0f0;">
        <p style="margin:0;color:#999;font-size:12px;">This email was sent by Learnify — AI-Powered Education Platform.</p>
        <p style="margin:4px 0 0;color:#bbb;font-size:11px;">You received this because you're registered as a parent/guardian.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ── Send Email ──
async function sendEmail(to: string, subject: string, html: string): Promise<boolean> {
  if (!isConfigured()) {
    console.log(`[Email] Not configured — skipping: "${subject}" to ${to}`);
    return false;
  }

  try {
    await transporter.sendMail({
      from: config.email.from,
      to,
      subject,
      html,
    });
    console.log(`[Email] Sent: "${subject}" to ${to}`);
    return true;
  } catch (err: any) {
    console.error(`[Email] Failed: ${err.message}`);
    return false;
  }
}

// ══════════════════════════════════════════════════════════════
// PUBLIC METHODS — called from routes
// ══════════════════════════════════════════════════════════════

/** Welcome email when student signs up */
export async function sendWelcomeEmail(
  parentEmail: string,
  studentName: string,
  studentEmail: string,
  classLevel: string
): Promise<boolean> {
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Student:</strong></td><td style="color:#333;font-size:14px;">${studentName}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Email:</strong></td><td style="color:#333;font-size:14px;">${studentEmail}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Class:</strong></td><td style="color:#333;font-size:14px;">${classLevel}</td></tr>
    </table>
    <p style="color:#666;font-size:13px;margin:16px 0 0;">Your child has registered on Learnify. You'll receive progress updates as they learn.</p>
  `;

  return sendEmail(
    parentEmail,
    `Welcome to Learnify — ${studentName} has joined!`,
    baseTemplate("New Account Created", body, studentName)
  );
}

/** Notify when student generates a new course */
export async function sendCourseCreatedEmail(
  parentEmail: string,
  studentName: string,
  courseTitle: string,
  subject: string,
  duration: number
): Promise<boolean> {
  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Course:</strong></td><td style="color:#333;font-size:14px;">${courseTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Subject:</strong></td><td style="color:#333;font-size:14px;">${subject}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Duration:</strong></td><td style="color:#333;font-size:14px;">${duration} days</td></tr>
    </table>
    <p style="color:#666;font-size:13px;margin:16px 0 0;">${studentName} started a new AI-generated course. They're actively learning!</p>
  `;

  return sendEmail(
    parentEmail,
    `${studentName} started a new course: ${courseTitle}`,
    baseTemplate("New Course Started", body, studentName)
  );
}

/** Notify when student completes a module */
export async function sendModuleCompletedEmail(
  parentEmail: string,
  studentName: string,
  courseTitle: string,
  moduleName: string,
  progress: number
): Promise<boolean> {
  const progressBar = `
    <div style="background:#e2e8f0;border-radius:8px;height:12px;margin:12px 0;overflow:hidden;">
      <div style="background:linear-gradient(90deg,#284ce3,#5b7cf7);height:100%;width:${progress}%;border-radius:8px;"></div>
    </div>
  `;

  const body = `
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Course:</strong></td><td style="color:#333;font-size:14px;">${courseTitle}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Module Completed:</strong></td><td style="color:#333;font-size:14px;">${moduleName}</td></tr>
      <tr><td style="padding:8px 0;color:#555;font-size:14px;"><strong>Overall Progress:</strong></td><td style="color:#333;font-size:14px;">${progress}%</td></tr>
    </table>
    ${progressBar}
    <p style="color:#666;font-size:13px;margin:8px 0 0;">Great progress! ${studentName} is making steady advancement.</p>
  `;

  return sendEmail(
    parentEmail,
    `${studentName} completed: ${moduleName} (${progress}% done)`,
    baseTemplate("Module Completed", body, studentName)
  );
}

/** Weekly/periodic analytics summary */
export async function sendAnalyticsEmail(
  parentEmail: string,
  studentName: string,
  analytics: {
    totalCourses: number;
    completedCourses: number;
    topicsCompleted: number;
    avgProgress: number;
    quizzesTaken: number;
    avgQuizScore: number;
    homeworkSubmitted: number;
    studyHours: number;
    strengths: string[];
    weaknesses: string[];
  }
): Promise<boolean> {
  const a = analytics;

  const body = `
    <!-- Stats Grid -->
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
      <tr>
        <td style="padding:8px;text-align:center;background:#284ce3;border-radius:8px;color:white;width:25%;">
          <div style="font-size:24px;font-weight:800;">${a.totalCourses}</div>
          <div style="font-size:11px;opacity:0.8;">Courses</div>
        </td>
        <td style="padding:8px;text-align:center;background:#059669;border-radius:8px;color:white;width:25%;margin-left:8px;">
          <div style="font-size:24px;font-weight:800;">${a.topicsCompleted}</div>
          <div style="font-size:11px;opacity:0.8;">Topics Done</div>
        </td>
        <td style="padding:8px;text-align:center;background:#d97706;border-radius:8px;color:white;width:25%;">
          <div style="font-size:24px;font-weight:800;">${a.quizzesTaken}</div>
          <div style="font-size:11px;opacity:0.8;">Quizzes</div>
        </td>
        <td style="padding:8px;text-align:center;background:#7c3aed;border-radius:8px;color:white;width:25%;">
          <div style="font-size:24px;font-weight:800;">${a.avgProgress}%</div>
          <div style="font-size:11px;opacity:0.8;">Avg Progress</div>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding:6px 0;color:#555;font-size:14px;"><strong>Avg Quiz Score:</strong></td><td style="color:#333;font-size:14px;">${a.avgQuizScore}%</td></tr>
      <tr><td style="padding:6px 0;color:#555;font-size:14px;"><strong>Homework Submitted:</strong></td><td style="color:#333;font-size:14px;">${a.homeworkSubmitted}</td></tr>
      <tr><td style="padding:6px 0;color:#555;font-size:14px;"><strong>Courses Completed:</strong></td><td style="color:#333;font-size:14px;">${a.completedCourses}</td></tr>
    </table>

    ${a.strengths.length > 0 ? `
      <div style="margin-top:16px;">
        <p style="color:#059669;font-size:13px;font-weight:600;margin:0 0 4px;">Strengths:</p>
        <p style="color:#555;font-size:13px;margin:0;">${a.strengths.join(", ")}</p>
      </div>
    ` : ""}

    ${a.weaknesses.length > 0 ? `
      <div style="margin-top:8px;">
        <p style="color:#d97706;font-size:13px;font-weight:600;margin:0 0 4px;">Needs Improvement:</p>
        <p style="color:#555;font-size:13px;margin:0;">${a.weaknesses.join(", ")}</p>
      </div>
    ` : ""}
  `;

  return sendEmail(
    parentEmail,
    `${studentName}'s Learning Report — ${a.avgProgress}% Progress`,
    baseTemplate("Performance Analytics", body, studentName)
  );
}

export default {
  sendWelcomeEmail,
  sendCourseCreatedEmail,
  sendModuleCompletedEmail,
  sendAnalyticsEmail,
  isConfigured,
};
